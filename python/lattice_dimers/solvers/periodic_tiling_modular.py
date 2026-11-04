import math
import os
import sys

import numpy as np

from lattice_dimers.core import combine_checked_residues, list_primes, parse_args, run_workers

MAX_CIRCUMFERENCE = 24
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
    js/solvers/periodicTilingSolver-Modular.js. A cell step moves every state at once: each source state
    sends its count to its target, and the counts that meet in a target are summed."""
    rows, cols, prime = board["rows"], board["cols"], board["prime"]
    torus, twisted = board["torus"], board["twisted"]
    lattice = LATTICES[board["lattice"]]
    window_bits = cols + 2
    window_mask = (1 << window_bits) - 1
    wrap_bit = 1 << window_bits
    uses_wrap_bit = lattice["down_left"] and cols >= 3
    state_count = 1 << (window_bits + (1 if uses_wrap_bit else 0))
    top_bit = 1 << (window_bits - 1)
    states = np.arange(state_count, dtype=np.int64)

    def shift(values, c):
        window = (values & window_mask) >> 1

        if not uses_wrap_bit:
            return window

        if c == cols - 3:
            return window | np.where(values & wrap_bit, top_bit, 0)

        return window | (values & wrap_bit)

    def transitions(c, has_below):
        occupied = states[(states & 1) == 1]
        free = states[(states & 1) == 0]
        sources = [occupied]
        targets = [shift(occupied, c)]
        negative = [np.zeros(len(occupied), dtype=bool)]

        for bit, crossing in list_moves(cols, c, has_below, lattice, wrap_bit):
            moved = free[(free & bit) == 0]
            sources.append(moved)
            targets.append(shift(moved + bit, c))
            negative.append(np.full(len(moved), twisted and crossing))

        return np.concatenate(sources), np.concatenate(targets), np.concatenate(negative)

    below = [transitions(c, True) for c in range(cols)]
    last = [transitions(c, torus) for c in range(cols)]

    def run(start):
        current = np.zeros(state_count, dtype=np.int64)
        current[start] = 1 % prime

        for cell in range(rows * cols):
            c = cell % cols
            sources, targets, negative = below[c] if cell < (rows - 1) * cols else last[c]
            counts = current[sources]
            counts = np.where(negative & (counts != 0), prime - counts, counts)
            current = np.bincount(targets, weights=counts, minlength=state_count).astype(np.int64) % prime

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
