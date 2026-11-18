import math
import os
import sys

import numpy as np

from lattice_dimers.core import combine_checked_residues, list_primes, parse_args, pfaffian_modulo, run_workers, start_timer

MAX_CELLS = 1600
LATTICES = {"square": ((1, 0), (0, 1)), "triangular": ((1, 0), (0, 1), (1, 1))}
USAGE = (
    "Usage: python3 -m lattice_dimers.solvers.any_lattice_cylinder_torus_pfaffian -r <rowCount> -c <circumference> "
    "--lattice square|triangular [--torus] [-j <jobs>]\n"
    "The circumference is at least 2, and a torus has at least 2 rows, unless the board has no cells."
)
NOT_PLANAR = "The king's graph is not planar, so a Pfaffian does not count its tilings. Pass --lattice square or --lattice triangular."


def number_cells(rows, cols, torus):
    """Numbers the cells, like numberCells of js/solvers/any-lattice-cylinder-torus-pfaffian.js: the cells of one line
    along the shorter side together, and where the lines go around a seam, taken from both ends in turn, so the last
    line is next to the first."""

    def fold(line, count):
        return 2 * line if 2 * line < count else 2 * (count - 1 - line) + 1

    if cols > rows:
        return lambda x, y: fold(y, cols) * rows + x

    return (lambda x, y: fold(x, rows) * cols + y) if torus else (lambda x, y: x * cols + y)


def list_edges(rows, cols, lattice, torus):
    """Lists the edges of the board for fill_matrix, as arrays with one entry per edge: the smaller and the larger
    number of its two cells, whether its entry above the diagonal is negative before the signs of the seams, and
    whether it crosses the row seam and the column seam. The signs are those of fillMatrix of
    js/solvers/any-lattice-cylinder-torus-pfaffian.js."""
    number_of = number_cells(rows, cols, torus)
    alternates_by_row = rows % 2 == 0
    edges = []

    for x in range(rows):
        for y in range(cols):
            even = (x if alternates_by_row else y) % 2 == 0

            for dx, dy in LATTICES[lattice]:
                if x + dx >= rows and not torus:
                    continue

                start, end = number_of(x, y), number_of((x + dx) % rows, (y + dy) % cols)
                edges.append((min(start, end), max(start, end), (even and dx + dy == 1) != (start > end), x + dx >= rows, y + dy >= cols))

    low, high, negative, crosses_rows, crosses_columns = (np.array(column) for column in zip(*edges))

    return low, high, negative.astype(bool), crosses_rows.astype(bool), crosses_columns.astype(bool)


def fill_matrix(size, edges, flip_rows, flip_columns, prime):
    """Builds the entries above the diagonal of the Kasteleyn matrix of the board modulo a prime, like fillMatrix of
    js/solvers/any-lattice-cylinder-torus-pfaffian.js. Two edges between the same cells add."""
    low, high, negative, crosses_rows, crosses_columns = edges
    matrix = np.zeros((size, size), dtype=np.uint64)

    if flip_rows:
        negative = negative ^ crosses_rows

    if flip_columns:
        negative = negative ^ crosses_columns

    np.add.at(matrix, (low, high), np.where(negative, prime - 1, 1).astype(np.uint64))
    matrix[low, high] %= np.uint64(prime)

    return matrix


def count_modulo(board):
    """Counts modulo a prime, like countModulo of js/solvers/any-lattice-cylinder-torus-pfaffian.js: the two Pfaffians
    of a cylinder, or for a torus the four values (S - 2 p) / 2, where p runs over its four Pfaffians and S is their
    sum."""
    size, edges, torus, prime = board["size"], board["edges"], board["torus"], board["prime"]

    def pfaffian(flip_rows, flip_columns):
        return pfaffian_modulo(fill_matrix(size, edges, flip_rows, flip_columns, prime), prime)

    if not torus:
        return [pfaffian(False, False), pfaffian(False, True)]

    pfaffians = [pfaffian(False, False), pfaffian(True, False), pfaffian(False, True), pfaffian(True, True)]
    half = (prime + 1) // 2

    return [(sum(pfaffians) - 2 * value) * half % prime for value in pfaffians]


def calculate_log2_bound(rows, cols, lattice, torus):
    """Bounds log2 of the number of tilings, like calculateLog2Bound of
    js/solvers/any-lattice-cylinder-torus-pfaffian.js."""
    below = 0 if rows == 1 and not torus else len(LATTICES[lattice]) - 1

    return ((rows * cols) / 2) * math.log2(2 + below) + (min(rows, cols) if torus else 0)


def calculate_total_tiling_combinations(row_count, col_count, lattice, torus=False, jobs=None):
    """Counts the tilings exactly, like calculateTotalTilingCombinations of
    js/solvers/any-lattice-cylinder-torus-pfaffian.js."""
    if not is_valid_board(row_count, col_count, torus) or lattice not in LATTICES:
        raise ValueError(
            "The circumference must be at least 2, a torus needs at least 2 rows unless the board has no cells, and the lattice is square or triangular."
        )

    if row_count * col_count > MAX_CELLS:
        raise ValueError(limit_message())

    if row_count * col_count == 0:
        return 1

    if (row_count * col_count) % 2 == 1:
        return 0

    prime_count = math.ceil((calculate_log2_bound(row_count, col_count, lattice, torus) + 2) / 30) + 1
    primes = list_primes(prime_count)
    edges = list_edges(row_count, col_count, lattice, torus)
    tasks = [{"size": row_count * col_count, "edges": edges, "torus": torus, "prime": prime} for prime in primes]
    residues = run_workers(count_modulo, tasks, jobs or os.process_cpu_count() or 1)

    return max(abs(combine_checked_residues(list(column), primes, True)) for column in zip(*residues))


def limit_message():
    return f"The board can have at most {MAX_CELLS} cells, because every worker thread keeps a matrix of cells x cells entries."


def is_valid_board(row_count, col_count, torus):
    if not isinstance(row_count, int) or not isinstance(col_count, int) or row_count < 0 or col_count < 0:
        return False

    return row_count * col_count == 0 or (col_count >= 2 and (not torus or row_count >= 2))


def read_lattice(argv):
    if "--lattice" not in argv:
        return "king"

    index = argv.index("--lattice") + 1

    return argv[index] if index < len(argv) else None


def main(argv):
    options = parse_args(argv, {"-r": "rowCount", "-c": "colCount", "-j": "jobs"})
    lattice = read_lattice(argv)
    torus = "--torus" in argv
    jobs = options.get("jobs", os.process_cpu_count() or 1)
    row_count = options.get("rowCount")
    col_count = options.get("colCount")

    if not is_valid_board(row_count, col_count, torus) or lattice not in (*LATTICES, "king") or not jobs > 0 or "--twisted" in argv:
        print(USAGE, file=sys.stderr)
        return 1

    if lattice == "king":
        print(NOT_PLANAR, file=sys.stderr)
        return 1

    if row_count * col_count > MAX_CELLS:
        print(limit_message(), file=sys.stderr)
        return 1

    stop_timer = start_timer(argv)

    try:
        result = calculate_total_tiling_combinations(row_count, col_count, lattice, torus, jobs)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1

    stop_timer()
    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
