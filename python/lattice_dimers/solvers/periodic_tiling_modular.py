import math
import os
import sys

import numpy as np

from lattice_dimers.core import combine_checked_residues, list_primes, parse_args, run_workers

MAX_CIRCUMFERENCE = 24
BATCH_COUNTS = 1 << 20
SCRATCH_COUNTS = BATCH_COUNTS // 2
LATTICES = {
    "square": {"down_left": False, "down_right": False},
    "triangular": {"down_left": False, "down_right": True},
    "king": {"down_left": True, "down_right": True},
}
USAGE = (
    "Usage: python3 -m lattice_dimers.solvers.periodic_tiling_modular -r <rowCount> -c <circumference> "
    "[--torus] [--twisted] [--lattice king|triangular|square] [-j <jobs>]\n"
    "The circumference is at least 2, and a torus has at least 2 rows."
)


def list_moves(cols, c, has_below, lattice, wrap_bit):
    """Lists the moves of a free cell in column c as (bit, crossing) pairs, like listMoves of
    js/solvers/periodicTilingSolver-Modular.js."""
    moves = []

    if c + 1 < cols:
        moves.append((1 << 1, False))

    if c == 0:
        moves.append((1 << (cols - 1), True))

    if not has_below:
        return moves

    if lattice["down_left"] and c > 0:
        moves.append((1 << (cols - 1), False))
    elif lattice["down_left"] and cols == 2:
        moves.append((1 << (cols + 1), True))
    elif lattice["down_left"]:
        moves.append((wrap_bit, True))

    moves.append((1 << cols, False))

    if lattice["down_right"] and c + 1 < cols:
        moves.append((1 << (cols + 1), False))
    elif lattice["down_right"]:
        moves.append((1 << 1, True))

    return moves


def count_modulo(board):
    """Counts the tilings of a cylinder or a torus modulo a prime, cell by cell, like countModulo of
    js/solvers/periodicTilingSolver-Modular.js, with tables of 32-bit counts reduced modulo the prime as there.

    A state is the window of cols + 2 bits and, on the king's graph with cols >= 3, the extra bit above it. Shifting
    a state by one bit maps a contiguous range of states onto another, so a cell step needs no index arrays: the
    table is reshaped into views where one axis is the bit a move covers, and every move adds one view of the
    current table onto one view of the next. The column where the extra bit joins the window only swaps which axis
    of the next table it lands on. The sums are reduced through a scratch array of SCRATCH_COUNTS counts, a slice of
    the view at a time, so a worker thread holds the two tables and little else, as in JavaScript.

    A torus runs one start per rotation class, as in JavaScript, but a batch of starts at once: each table has one
    column per start, with at most BATCH_COUNTS counts per table, so the interpreter's work per cell is shared by the
    whole batch."""
    rows, cols, prime = board["rows"], board["cols"], board["prime"]
    torus, twisted = board["torus"], board["twisted"]
    lattice = LATTICES[board["lattice"]]
    window_bits = cols + 2
    wrap_bit = 1 << window_bits
    uses_wrap_bit = lattice["down_left"] and cols >= 3
    wraps = 2 if uses_wrap_bit else 1
    half = 1 << (window_bits - 1)
    state_count = wraps << window_bits
    moves_below = [list_moves(cols, c, True, lattice, wrap_bit) for c in range(cols)]
    moves_last = [list_moves(cols, c, torus, lattice, wrap_bit) for c in range(cols)]
    modulus = np.uint32(prime)
    scratch = np.empty(SCRATCH_COUNTS, dtype=np.uint32)

    def accumulate(target, source, negative):
        axis = int(np.argmax(target.shape))
        span = max(1, SCRATCH_COUNTS * target.shape[axis] // target.size)

        for low in range(0, target.shape[axis], span):
            part = (slice(None),) * axis + (slice(low, low + span),)
            into, values = target[part], source[part]
            spare = scratch[: into.size].reshape(into.shape) if into.size <= SCRATCH_COUNTS else np.empty_like(into)

            if negative:
                np.subtract(modulus, values, out=spare)
                values = spare

            np.add(into, values, out=into)
            np.subtract(into, modulus, out=spare)
            np.minimum(into, spare, out=into)

    def step(current, following, c, last, width):
        moves = moves_last[c] if last else moves_below[c]
        joins = uses_wrap_bit and c == cols - 3
        following.fill(0)
        shifted = following.reshape(wraps, 2, half, width)
        landing = shifted[0] if joins else shifted[:, 0]
        accumulate(landing, current.reshape(wraps, half, 2, width)[:, :, 1], False)

        for bit, crossing in moves:
            negative = twisted and crossing

            if bit == wrap_bit:
                accumulate(landing[1], current.reshape(wraps, half, 2, width)[0, :, 0], negative)
                continue

            block = bit >> 1
            groups = half // (2 * block)
            free = current.reshape(wraps, groups, 2, block, 2, width)[:, :, 0, :, 0]
            target = following.reshape(wraps, 2, groups, 2, block, width)
            accumulate((target[0] if joins else target[:, 0])[:, :, 1], free, negative)

    def run(starts):
        width = len(starts)
        columns = np.arange(width)
        current = np.zeros(state_count * width, dtype=np.uint32)
        following = np.zeros_like(current)
        current.reshape(state_count, width)[starts, columns] = 1 % prime

        for cell in range(rows * cols):
            step(current, following, cell % cols, cell >= (rows - 1) * cols, width)
            current, following = following, current

        return current.reshape(state_count, width)[starts, columns]

    if not torus:
        return 1 % prime if rows == 0 else int(run(np.array([0]))[0])

    def rotate(subset):
        return ((subset << 1) | (subset >> (cols - 1))) & ((1 << cols) - 1)

    reduce = not twisted or rows % 2 == 0
    starts = []
    weights = []

    for start in range(1 << cols):
        weight = 1

        if reduce:
            rotation = rotate(start)

            while rotation != start and rotation > start:
                weight += 1
                rotation = rotate(rotation)

            if rotation != start:
                continue

        starts.append(start)
        weights.append(weight)

    batch = max(1, BATCH_COUNTS // state_count)
    total = 0

    for first in range(0, len(starts), batch):
        counts = run(np.array(starts[first : first + batch]))
        total = (total + sum(weight * int(count) for weight, count in zip(weights[first : first + batch], counts))) % prime

    return total


def calculate_log2_bound(rows, cols, lattice, torus):
    """Bounds log2 of the number of tilings, like calculateLog2Bound of js/solvers/periodicTilingSolver-Modular.js."""
    wrap_bit = 1 << (cols + 2)
    most = max(len(list_moves(cols, c, rows > 1 or torus, LATTICES[lattice], wrap_bit)) for c in range(cols))

    return ((rows * cols) / 2) * math.log2(most) + (cols if torus else 0)


def calculate_total_tiling_combinations(row_count, col_count, lattice="king", torus=False, twisted=False, jobs=None):
    """Counts the tilings exactly with the Chinese remainder theorem, like calculateTotalTilingCombinations of
    js/solvers/periodicTilingSolver-Modular.js."""
    if not is_valid_board(row_count, col_count, torus) or lattice not in LATTICES:
        raise ValueError(
            "The circumference must be at least 2, a torus needs at least 2 rows, and the lattice is square, triangular or king."
        )

    transpose = torus and not twisted and row_count < col_count
    rows = col_count if transpose else row_count
    cols = row_count if transpose else col_count

    if (rows * cols) % 2 == 1:
        return 0

    prime_count = math.ceil((calculate_log2_bound(rows, cols, lattice, torus) + 2) / 30) + 1
    primes = list_primes(prime_count)
    tasks = [{"rows": rows, "cols": cols, "lattice": lattice, "torus": torus, "twisted": twisted, "prime": prime} for prime in primes]
    residues = run_workers(count_modulo, tasks, jobs or os.process_cpu_count())

    return combine_checked_residues(residues, primes, twisted)


def is_valid_board(row_count, col_count, torus):
    return (
        isinstance(row_count, int)
        and row_count >= (2 if torus else 0)
        and isinstance(col_count, int)
        and col_count >= 2
    )


def read_lattice(argv):
    if "--lattice" not in argv:
        return "king"

    index = argv.index("--lattice") + 1

    return argv[index] if index < len(argv) else None


def main(argv):
    options = parse_args(argv, {"-r": "rowCount", "-c": "colCount", "-j": "jobs"})
    lattice = read_lattice(argv)
    torus = "--torus" in argv
    twisted = "--twisted" in argv
    jobs = options.get("jobs", os.process_cpu_count())
    row_count = options.get("rowCount")
    col_count = options.get("colCount")

    if not is_valid_board(row_count, col_count, torus) or lattice not in LATTICES or not jobs > 0:
        print(USAGE, file=sys.stderr)
        return 1

    if min(col_count, row_count if torus and not twisted else math.inf) > MAX_CIRCUMFERENCE:
        print(
            f"The circumference can be at most {MAX_CIRCUMFERENCE}, because every worker thread keeps two tables of "
            "2^(circumference + 3) states.",
            file=sys.stderr,
        )
        return 1

    try:
        result = calculate_total_tiling_combinations(row_count, col_count, lattice, torus, twisted, jobs)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1

    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
