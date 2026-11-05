import math
import os
import sys

import numpy as np

from lattice_dimers.core import calculate_log2_bound, combine_checked_residues, list_primes, parse_args, run_workers, start_timer

MAX_SHORTER_SIDE = 20
SCRATCH_COUNTS = 1 << 19
USAGE = "Usage: python3 -m lattice_dimers.solvers.domicule_diagonal_modular -r <rowCount> -c <colCount> [-j <jobs>]"


def list_moves(cols, c, has_below):
    """Lists the bit index and the diagonal flag of every partner a free cell in column c can cover, like the moves in
    countModulo of js/solvers/domiculeDiagonalSolver-Modular.js: right, down-left, down and down-right."""
    has_right = c + 1 < cols
    moves = []

    if has_right:
        moves.append((1, 0))

    if has_below and c > 0:
        moves.append((cols - 1, 1))

    if has_below:
        moves.append((cols, 0))

    if has_below and has_right:
        moves.append((cols + 1, 1))

    return moves


def count_modulo(task):
    """Counts the domicule tilings by the number of diagonal pieces modulo a prime, with the transfer of countModulo in
    js/solvers/domiculeDiagonalSolver-Modular.js and tables of 32-bit counts reduced modulo the prime as there.

    The covered cells of a state fix the difference between the diagonal pieces on black and on white cells. So instead
    of the parity of the JavaScript solver, entry j of a state's block counts the tilings with j diagonal pieces on
    white cells. A diagonal piece placed from a white cell then moves entry j to j + 1 and one from a black cell keeps
    j, whatever the state, so a cell step needs no table of parities. The empty state at the end has as many pieces on
    black cells as on white ones, so entry j is the coefficient of x^(2j). A piece is placed from a white cell at most
    once per white cell, so before cell p only the entries up to ceil(p / 2) are visited.

    A state has cols + 2 bits, but the top one is clear before every cell step, so the tables hold the 2^(cols + 1)
    states below it. As in domicule_tiling_modular, a state is 2k plus its bit 0, a covered cell moves the block of
    2k + 1 to k, and a free cell that covers bit b moves the block of 2k to k + 2^(b - 1) when bit b - 1 of k is clear:
    views of the two tables, one axis for each of these bits and the last axis for the block. The sums are reduced a
    slice at a time through a scratch array of SCRATCH_COUNTS counts."""
    rows, cols, prime = task["rows"], task["cols"], task["prime"]
    degree = rows * cols // 2
    width = degree // 2 + 1
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

    def step(current, following, cell):
        row, c = cell // cols, cell % cols
        visited = min(width, (cell + 1) // 2 + 1)
        written = min(width, visited + 1)
        following[:, :written] = 0
        accumulate(following[:evens, :visited], current.reshape(evens, 2, width)[:, 1, :visited])

        for bit, diagonal in list_moves(cols, c, row + 1 < rows):
            shift = diagonal & (row + c) & 1
            length = min(visited, width - shift)

            if bit == cols + 1:
                accumulate(following[evens:, shift : shift + length], current.reshape(evens, 2, width)[:, 0, :length])
                continue

            block = 1 << (bit - 1)
            groups = evens // (2 * block)
            free = current.reshape(groups, 2, block, 2, width)[:, 0, :, 0, :length]
            accumulate(following.reshape(2, groups, 2, block, width)[0, :, 1, :, shift : shift + length], free)

    current = np.zeros((2 * evens, width), dtype=np.uint32)
    following = np.zeros_like(current)
    current[0, 0] = 1 % prime

    for cell in range(rows * cols):
        step(current, following, cell)
        current, following = following, current

    coefficients = [0] * (degree + 1)

    for j in range(width):
        coefficients[2 * j] = int(current[0, j])

    return coefficients


def physical_memory():
    """Reads the memory of the machine in bytes, or 0 when it is not known, which leaves one worker thread."""
    try:
        return os.sysconf("SC_PHYS_PAGES") * os.sysconf("SC_PAGE_SIZE")
    except (OSError, ValueError):
        return 0


def cap_threads(jobs, cols, degree, memory):
    """Caps the number of worker threads like capThreads of js/solvers/domiculeDiagonalSolver-Modular.js, with its
    table sizes, so that every language runs the same number of threads, although the tables here take half of that."""
    bytes_per_worker = 2 ** (cols + 2) * (2 * 4 * (degree // 2 + 1) + 2)

    return max(1, min(jobs, memory // 2 // bytes_per_worker))


def calculate_diagonal_polynomial(row_count, col_count, jobs=None):
    """Counts the tilings by the number of diagonal pieces exactly: every coefficient is at most the number of tilings,
    so the Kahn-Lovasz bound sets the number of primes, and one more prime checks every coefficient."""
    if not is_valid_size(row_count) or not is_valid_size(col_count):
        raise ValueError("The sides of the board must be non-negative integers.")

    rows = max(row_count, col_count)
    cols = min(row_count, col_count)
    degree = rows * cols // 2

    if (rows * cols) % 2 == 1:
        return [0] * (degree + 1)

    prime_count = math.ceil((calculate_log2_bound(rows, cols) + 1) / 30) + 1
    primes = list_primes(prime_count)
    tasks = [{"rows": rows, "cols": cols, "prime": prime} for prime in primes]
    threads = cap_threads(jobs or os.process_cpu_count() or 1, cols, degree, physical_memory())
    residues = run_workers(count_modulo, tasks, threads)

    return [combine_checked_residues([coefficients[k] for coefficients in residues], primes) for k in range(degree + 1)]


def is_valid_size(size):
    return isinstance(size, int) and size >= 0


def main(argv):
    sys.set_int_max_str_digits(0)
    options = parse_args(argv, {"-r": "rowCount", "-c": "colCount", "-j": "jobs"})
    jobs = options.get("jobs", os.process_cpu_count() or 1)
    row_count = options.get("rowCount")
    col_count = options.get("colCount")

    if not is_valid_size(row_count) or not is_valid_size(col_count) or not jobs > 0:
        print(USAGE, file=sys.stderr)
        return 1

    if min(row_count, col_count) > MAX_SHORTER_SIDE:
        print(
            f"The shorter side of the board can be at most {MAX_SHORTER_SIDE}, because every worker thread keeps half "
            "the polynomial of every state in memory (about 3.4 GB at 20 x 20; -j sets the number of threads).",
            file=sys.stderr,
        )
        return 1

    threads = cap_threads(jobs, min(row_count, col_count), row_count * col_count // 2, physical_memory())

    if threads < jobs:
        print(f"Running {threads} worker threads instead of {jobs}, so that their tables fit in half the memory.", file=sys.stderr)

    stop_timer = start_timer(argv)

    try:
        coefficients = calculate_diagonal_polynomial(row_count, col_count, jobs)
    except (MemoryError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1

    stop_timer()
    print(",".join(map(str, coefficients)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
