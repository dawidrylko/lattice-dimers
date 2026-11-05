import math
import os
import sys

import numpy as np

from lattice_dimers.core import calculate_log2_bound, combine_checked_residues, list_primes, parse_args, run_workers, start_timer

MAX_SHORTER_SIDE = 30
SCRATCH_COUNTS = 1 << 19
USAGE = "Usage: python3 -m lattice_dimers.solvers.domicule_tiling_modular -r <rowCount> -c <colCount> [-j <jobs>]"


def list_offsets(cols, c, has_below):
    """Lists the bits a free cell in column c can cover with its partner, by their index, like the offsets in
    countModulo of js/solvers/domiculeTilingSolver-Modular.js: right, down-left, down and down-right."""
    has_right = c + 1 < cols
    offsets = []

    if has_right:
        offsets.append(1)

    if has_below and c > 0:
        offsets.append(cols - 1)

    if has_below:
        offsets.append(cols)

    if has_below and has_right:
        offsets.append(cols + 1)

    return offsets


def count_modulo(task):
    """Counts the domicule tilings modulo a prime with the broken-profile dynamic programming of countModulo in
    js/solvers/domiculeTilingSolver-Modular.js, with tables of 32-bit counts reduced modulo the prime as there.

    Bit i of a state tells whether the cell i places ahead of the current one is already covered. A state has
    cols + 2 bits, but the top one is clear before every cell step, since a step shifts the state right after
    setting at most that bit. So the tables hold the 2^(cols + 1) states below it, and a cell step needs no index
    arrays. Write a state as 2k plus its bit 0. A covered cell moves the count of 2k + 1 to k: one view of the
    current table onto the lower half of the next. A free cell that covers bit j moves the count of 2k to
    k + 2^(j - 1) when bit j - 1 of k is clear: the current table reshaped so that one axis is bit 0 and one is bit j,
    onto the next one reshaped so that one axis is bit j - 1. The sums are reduced a slice at a time through a
    scratch array of SCRATCH_COUNTS counts, so a worker thread holds the two tables and that array."""
    rows, cols, prime = task["rows"], task["cols"], task["prime"]
    evens = 1 << cols
    modulus = np.uint32(prime)
    scratch = np.empty(SCRATCH_COUNTS, dtype=np.uint32)

    def accumulate(target, source):
        axis = int(np.argmax(target.shape))
        span = max(1, SCRATCH_COUNTS * target.shape[axis] // target.size)

        for low in range(0, target.shape[axis], span):
            part = (slice(None),) * axis + (slice(low, low + span),)
            into = target[part]
            spare = scratch[: into.size].reshape(into.shape) if into.size <= SCRATCH_COUNTS else np.empty_like(into)
            np.add(into, source[part], out=into)
            np.subtract(into, modulus, out=spare)
            np.minimum(into, spare, out=into)

    def step(current, following, c, has_below):
        following.fill(0)
        accumulate(following[:evens], current.reshape(evens, 2)[:, 1])

        for bit in list_offsets(cols, c, has_below):
            if bit == cols + 1:
                accumulate(following[evens:], current.reshape(evens, 2)[:, 0])
                continue

            block = 1 << (bit - 1)
            groups = evens // (2 * block)
            free = current.reshape(groups, 2, block, 2)[:, 0, :, 0]
            accumulate(following.reshape(2, groups, 2, block)[0, :, 1], free)

    current = np.zeros(2 * evens, dtype=np.uint32)
    following = np.zeros_like(current)
    current[0] = 1 % prime

    for cell in range(rows * cols):
        step(current, following, cell % cols, cell // cols + 1 < rows)
        current, following = following, current

    return int(current[0])


def calculate_total_tiling_combinations(row_count, col_count, jobs=None):
    """Counts the tilings exactly, like calculateTotalTilingCombinations of js/solvers/domiculeTilingSolver-Modular.js:
    enough primes for the Kahn-Lovasz bound, plus one more prime that the result is checked against."""
    if not is_valid_size(row_count) or not is_valid_size(col_count):
        raise ValueError("The sides of the board must be non-negative integers.")

    rows = max(row_count, col_count)
    cols = min(row_count, col_count)

    if (rows * cols) % 2 == 1:
        return 0

    prime_count = math.ceil((calculate_log2_bound(rows, cols) + 1) / 30) + 1
    primes = list_primes(prime_count)
    tasks = [{"rows": rows, "cols": cols, "prime": prime} for prime in primes]
    residues = run_workers(count_modulo, tasks, jobs or os.process_cpu_count() or 1)

    return combine_checked_residues(residues, primes)


def is_valid_size(size):
    return isinstance(size, int) and size >= 0


def main(argv):
    options = parse_args(argv, {"-r": "rowCount", "-c": "colCount", "-j": "jobs"})
    jobs = options.get("jobs", os.process_cpu_count() or 1)
    row_count = options.get("rowCount")
    col_count = options.get("colCount")

    if not is_valid_size(row_count) or not is_valid_size(col_count) or not jobs > 0:
        print(USAGE, file=sys.stderr)
        return 1

    if min(row_count, col_count) > MAX_SHORTER_SIDE:
        print(
            f"The shorter side of the board can be at most {MAX_SHORTER_SIDE}, because the states are indexed with "
            "32-bit integers.",
            file=sys.stderr,
        )
        return 1

    stop_timer = start_timer(argv)

    try:
        result = calculate_total_tiling_combinations(row_count, col_count, jobs)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1

    stop_timer()
    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
