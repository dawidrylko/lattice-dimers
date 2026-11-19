import sys

from lattice_dimers.core import has_unusable_argument, parse_args, start_timer
from lattice_dimers.solvers.any_lattice_rectangle_bigint import LATTICES, read_lattice

MAX_SHORTER_SIDE = 20
USAGE = (
    "Usage: python3 -m lattice_dimers.solvers.any_lattice_rectangle_polynomial_bigint -r <rowCount> -c <colCount> "
    "[--lattice king|triangular|square]"
)
SHORTER_SIDE_TOO_LONG = (
    f"The shorter side of the board can be at most {MAX_SHORTER_SIDE}; use any-lattice-rectangle-polynomial-modular.js for larger boards."
)


def list_moves(cols, c, has_below, lattice):
    """Lists the moves of a free cell in column c, like listMoves of
    js/solvers/any-lattice-rectangle-polynomial-bigint.js: the bit its partner covers and the power of x the piece adds.
    Right and down add none, down-right is diagonal on the triangular lattice and the king's graph, down-left on the
    king's graph only. On two columns the down-left neighbour is the next cell, as the right neighbour is, so the
    power is kept with the move rather than read from the offset."""
    down_left, down_right = LATTICES[lattice]
    has_right = c + 1 < cols
    moves = []

    if has_right:
        moves.append((1, 0))

    if down_left and has_below and c > 0:
        moves.append((cols - 1, 1))

    if has_below:
        moves.append((cols, 0))

    if down_right and has_below and has_right:
        moves.append((cols + 1, 1))

    return [(1 << offset, diagonal) for offset, diagonal in moves]


def add(following, target, polynomial, diagonal):
    """Adds a polynomial times x^diagonal to the polynomial of the target state, which starts at zero."""
    degree = len(polynomial) - 1
    current = following[target] or [0] * (degree + 1)

    for k in range(degree + 1 - diagonal):
        current[k + diagonal] += polynomial[k]

    following[target] = current


def calculate_diagonal_polynomial(row_count, col_count, lattice="king"):
    """Counts the tilings of a rectangle on the square lattice, the triangular lattice or the king's graph by the number
    of diagonal pieces with the transfer of js/solvers/any-lattice-rectangle-polynomial-bigint.js: bit i of a state
    tells whether the cell i places ahead of the current one is already covered, and a state holds a polynomial whose
    coefficient of x^k counts the partial tilings with k diagonal pieces. On the king's graph this is the polynomial of
    domicule_rectangle_polynomial_bigint.py."""
    if lattice not in LATTICES:
        raise ValueError(f"The lattice is square, triangular or king, not {lattice}.")

    rows = max(row_count, col_count)
    cols = min(row_count, col_count)
    degree = rows * cols // 2
    state_count = 1 << (cols + 1)
    current = [None] * state_count
    current[0] = [1] + [0] * degree

    for cell in range(rows * cols):
        moves = list_moves(cols, cell % cols, cell // cols + 1 < rows, lattice)
        following = [None] * state_count

        for state, polynomial in enumerate(current):
            if polynomial is None:
                continue

            if state & 1:
                add(following, state >> 1, polynomial, 0)
                continue

            for offset, diagonal in moves:
                if not state & offset:
                    add(following, (state + offset) >> 1, polynomial, diagonal)

        current = following

    return current[0] or [0] * (degree + 1)


def is_valid_size(size):
    return isinstance(size, int) and size >= 0


def main(argv):
    sys.set_int_max_str_digits(0)
    options = parse_args(argv, {"-r": "rowCount", "-c": "colCount"})
    row_count = options.get("rowCount")
    col_count = options.get("colCount")
    lattice = read_lattice(argv)

    if (
        not is_valid_size(row_count)
        or not is_valid_size(col_count)
        or lattice not in LATTICES
        or has_unusable_argument(argv, ("-r", "-c", "--lattice"))
    ):
        print(USAGE, file=sys.stderr)
        return 1

    if min(row_count, col_count) > MAX_SHORTER_SIDE:
        print(SHORTER_SIDE_TOO_LONG, file=sys.stderr)
        return 1

    stop_timer = start_timer(argv)
    coefficients = calculate_diagonal_polynomial(row_count, col_count, lattice)
    stop_timer()
    print(",".join(map(str, coefficients)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
