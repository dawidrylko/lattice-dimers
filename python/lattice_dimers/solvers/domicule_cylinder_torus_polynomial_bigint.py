import sys
from collections import Counter

from lattice_dimers.core import parse_args, start_timer

MAX_CIRCUMFERENCE = 20
SHIFTS = (-1, 0, 1)
USAGE = (
    "Usage: python3 -m lattice_dimers.solvers.domicule_cylinder_torus_polynomial_bigint -r <rowCount> -c <circumference> "
    "[--torus]\n"
    "The circumference is at least 2, and a torus has at least 2 rows, unless the board has no cells."
)
CIRCUMFERENCE_TOO_LONG = (
    f"The circumference can be at most {MAX_CIRCUMFERENCE}; use domicule-cylinder-torus-polynomial-modular.js for larger boards."
)


def list_row_transitions(cols):
    """Lists the (next, diagonals) transitions of every row state, like listRowTransitions of
    js/solvers/domicule-cylinder-torus-polynomial-bigint.js: a covered cell is skipped, two free cells take a horizontal
    piece, the first and the last column take one across the seam, and a free cell sends a piece to the next row for
    every shift. A piece sent from column c to column c + d of the next row is diagonal when d is -1 or 1. Equal
    transitions are merged into (next, diagonals, multiplicity)."""
    all_transitions = []

    for covered in range(1 << cols):
        transitions = Counter()

        def fill(c, filled, next_state, diagonals):
            if c == cols:
                transitions[(next_state, diagonals)] += 1
                return

            if filled & (1 << c):
                fill(c + 1, filled, next_state, diagonals)
                return

            if c + 1 < cols and not filled & (1 << (c + 1)):
                fill(c + 2, filled | (1 << c) | (1 << (c + 1)), next_state, diagonals)

            if c == 0 and not filled & (1 << (cols - 1)):
                fill(1, filled | 1 | (1 << (cols - 1)), next_state, diagonals)

            for shift in SHIFTS:
                target = (c + shift + cols) % cols

                if not next_state & (1 << target):
                    fill(c + 1, filled | (1 << c), next_state | (1 << target), diagonals + (0 if shift == 0 else 1))

        fill(0, covered, 0, 0)
        all_transitions.append([(target, diagonals, count) for (target, diagonals), count in transitions.items()])

    return all_transitions


def calculate_diagonal_polynomial(row_count, col_count, torus=False):
    """Counts the domicule tilings of a cylinder or a torus by the number of diagonal pieces, row by row, with a
    polynomial in every state, like calculateDiagonalPolynomial of js/solvers/domicule-cylinder-torus-polynomial-bigint.js:
    the coefficient of x^k counts the partial tilings with k diagonal pieces. The torus count is the trace of the h-th
    power of the row transfer matrix. Only the smallest rotation of each start set is run, weighted by the number of its
    rotations, and a torus is counted with its shorter side as the circumference."""
    if not is_valid_board(row_count, col_count, torus):
        raise ValueError("The circumference must be at least 2, and a torus needs at least 2 rows unless the board has no cells.")

    if row_count * col_count == 0:
        return [1]

    transpose = torus and row_count < col_count
    rows = col_count if transpose else row_count
    cols = row_count if transpose else col_count
    degree = rows * cols // 2

    if (rows * cols) % 2 == 1:
        return [0] * (degree + 1)

    transitions = list_row_transitions(cols)

    def advance(vector):
        following = {}

        for state, polynomial in vector.items():
            for target, diagonals, count in transitions[state]:
                total = following.get(target)

                if total is None:
                    total = following[target] = [0] * (degree + 1)

                for k in range(degree + 1 - diagonals):
                    if polynomial[k]:
                        total[k + diagonals] += count * polynomial[k]

        return following

    def run(start):
        vector = {start: [1] + [0] * degree}

        for _ in range(rows):
            vector = advance(vector)

        return vector.get(start, [0] * (degree + 1))

    if not torus:
        return run(0)

    def rotate(subset):
        return ((subset << 1) | (subset >> (cols - 1))) & ((1 << cols) - 1)

    total = [0] * (degree + 1)

    for start in range(1 << cols):
        weight = 1
        rotation = rotate(start)

        while rotation != start and rotation > start:
            weight += 1
            rotation = rotate(rotation)

        if rotation != start:
            continue

        for k, count in enumerate(run(start)):
            total[k] += weight * count

    return total


def is_valid_board(row_count, col_count, torus):
    if not isinstance(row_count, int) or not isinstance(col_count, int) or row_count < 0 or col_count < 0:
        return False

    return row_count * col_count == 0 or (col_count >= 2 and (not torus or row_count >= 2))


def main(argv):
    sys.set_int_max_str_digits(0)
    options = parse_args(argv, {"-r": "rowCount", "-c": "colCount"})
    torus = "--torus" in argv
    row_count = options.get("rowCount")
    col_count = options.get("colCount")

    if not is_valid_board(row_count, col_count, torus):
        print(USAGE, file=sys.stderr)
        return 1

    if min(col_count, row_count if torus else float("inf")) > MAX_CIRCUMFERENCE:
        print(CIRCUMFERENCE_TOO_LONG, file=sys.stderr)
        return 1

    stop_timer = start_timer(argv)
    try:
        coefficients = calculate_diagonal_polynomial(row_count, col_count, torus)
    except MemoryError:
        print("Invalid array length", file=sys.stderr)
        return 1
    stop_timer()
    print(",".join(map(str, coefficients)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
