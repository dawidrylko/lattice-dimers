import sys

from lattice_dimers.core import parse_args, start_timer

MAX_CIRCUMFERENCE = 12
LATTICES = {
    "square": (0,),
    "triangular": (0, 1),
    "king": (-1, 0, 1),
}
USAGE = (
    "Usage: python3 -m lattice_dimers.solvers.all_lattices_cylinder_torus_bigint -r <rowCount> -c <circumference> "
    "[--torus] [--twisted] [--lattice king|triangular|square]\n"
    "The circumference is at least 2, and a torus has at least 2 rows."
)


def list_row_transitions(cols, lattice):
    """Lists the (next, crossings) pairs of every row state, like listRowTransitions of
    js/solvers/all-lattices-cylinder-torus-bigint.js: a covered cell is skipped, two free cells take a horizontal piece, the
    first and the last column take one across the seam, and a free cell sends a piece to the next row for every shift."""
    shifts = LATTICES[lattice]
    all_transitions = []

    for covered in range(1 << cols):
        transitions = []

        def fill(c, filled, next_state, crossings):
            if c == cols:
                transitions.append((next_state, crossings))
                return

            if filled & (1 << c):
                fill(c + 1, filled, next_state, crossings)
                return

            if c + 1 < cols and not filled & (1 << (c + 1)):
                fill(c + 2, filled | (1 << c) | (1 << (c + 1)), next_state, crossings)

            if c == 0 and not filled & (1 << (cols - 1)):
                fill(1, filled | 1 | (1 << (cols - 1)), next_state, crossings + 1)

            for shift in shifts:
                target = (c + shift + cols) % cols

                if not next_state & (1 << target):
                    fill(c + 1, filled | (1 << c), next_state | (1 << target), crossings + (0 if c + shift == target else 1))

        fill(0, covered, 0, 0)
        all_transitions.append(transitions)

    return all_transitions


def calculate_total_tiling_combinations(row_count, col_count, lattice="king", torus=False, twisted=False):
    transitions = list_row_transitions(col_count, lattice)
    signed = [[(target, -1 if twisted and crossings % 2 else 1) for target, crossings in row] for row in transitions]

    def run(start):
        vector = {start: 1}

        for _ in range(row_count):
            next_vector = {}

            for state, count in vector.items():
                for target, sign in signed[state]:
                    next_vector[target] = next_vector.get(target, 0) + sign * count

            vector = next_vector

        return vector.get(start, 0)

    if not torus:
        return run(0)

    return sum(run(start) for start in range(1 << col_count))


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
    sys.set_int_max_str_digits(0)
    options = parse_args(argv, {"-r": "rowCount", "-c": "colCount"})
    lattice = read_lattice(argv)
    torus = "--torus" in argv
    twisted = "--twisted" in argv
    row_count = options.get("rowCount")
    col_count = options.get("colCount")

    if not is_valid_board(row_count, col_count, torus) or lattice not in LATTICES:
        print(USAGE, file=sys.stderr)
        return 1

    if col_count > MAX_CIRCUMFERENCE:
        print(
            f"The circumference can be at most {MAX_CIRCUMFERENCE}; use all_lattices_cylinder_torus_modular for larger boards.",
            file=sys.stderr,
        )
        return 1

    stop_timer = start_timer(argv)
    result = calculate_total_tiling_combinations(row_count, col_count, lattice, torus, twisted)
    stop_timer()
    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
