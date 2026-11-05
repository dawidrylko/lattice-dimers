import math
import os
import sys

import numpy as np

from lattice_dimers.core import combine_checked_residues, list_primes, parse_args, run_workers

MAX_CIRCUMFERENCE = 24
BLOCK_SIZE = 1 << 16
CACHED_STATES = 1 << 20
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
    js/solvers/periodicTilingSolver-Modular.js, with the same two tables of 32-bit counts. A cell step moves
    the states block by block, one move at a time: within one move no two states share a target, so the
    counts are added to their targets at once and reduced modulo the prime as in the JavaScript solver. The
    sources and targets of each block and move are kept between cells only while 2 * cols * state_count
    stays within CACHED_STATES."""
    rows, cols, prime = board["rows"], board["cols"], board["prime"]
    torus, twisted = board["torus"], board["twisted"]
    lattice = LATTICES[board["lattice"]]
    window_bits = cols + 2
    window_mask = (1 << window_bits) - 1
    wrap_bit = 1 << window_bits
    uses_wrap_bit = lattice["down_left"] and cols >= 3
    state_count = 1 << (window_bits + (1 if uses_wrap_bit else 0))
    top_bit = 1 << (window_bits - 1)
    moves_below = [list_moves(cols, c, True, lattice, wrap_bit) for c in range(cols)]
    moves_last = [list_moves(cols, c, torus, lattice, wrap_bit) for c in range(cols)]
    current = np.zeros(state_count, dtype=np.uint32)
    following = np.zeros(state_count, dtype=np.uint32)

    def shift(values, c):
        window = (values & window_mask) >> 1

        if not uses_wrap_bit:
            return window

        if c == cols - 3:
            return window | np.where(values & wrap_bit, top_bit, 0)

        return window | (values & wrap_bit)

    def add(targets, counts):
        sums = following[targets] + counts
        following[targets] = np.where(sums >= prime, sums - prime, sums)

    def classes(low, c, moves):
        states = np.arange(low, min(low + BLOCK_SIZE, state_count), dtype=np.int64)
        occupied = states[(states & 1) == 1]
        free = states[(states & 1) == 0]
        found = [(occupied, shift(occupied, c), False)]

        for bit, crossing in moves:
            moved = free[(free & bit) == 0]
            found.append((moved, shift(moved + bit, c), twisted and crossing))

        return found

    cache = {} if 2 * cols * state_count <= CACHED_STATES else None

    def step(c, last):
        moves = moves_last[c] if last else moves_below[c]
        following.fill(0)

        for low in range(0, state_count, BLOCK_SIZE):
            if cache is None:
                found = classes(low, c, moves)
            else:
                if (low, c, last) not in cache:
                    cache[(low, c, last)] = classes(low, c, moves)

                found = cache[(low, c, last)]

            for sources, targets, negative in found:
                counts = current[sources]
                add(targets, prime - counts if negative else counts)

    def run(start):
        nonlocal current, following
        current.fill(0)
        current[start] = 1 % prime

        for cell in range(rows * cols):
            c = cell % cols
            step(c, cell >= (rows - 1) * cols)
            current, following = following, current

        return int(current[start])

    if not torus:
        return 1 % prime if rows == 0 else run(0)

    def rotate(subset):
        return ((subset << 1) | (subset >> (cols - 1))) & ((1 << cols) - 1)

    reduce = not twisted or rows % 2 == 0
    total = 0

    for start in range(1 << cols):
        weight = 1

        if reduce:
            rotation = rotate(start)

            while rotation != start and rotation > start:
                weight += 1
                rotation = rotate(rotation)

            if rotation != start:
                continue

        total = (total + weight * run(start)) % prime

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
    residues = run_workers(count_modulo, tasks, jobs or os.process_cpu_count() or 1)

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
    jobs = options.get("jobs", os.process_cpu_count() or 1)
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
