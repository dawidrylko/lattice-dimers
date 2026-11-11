import sys

from lattice_dimers.core import parse_args, start_timer

MAX_SHORTER_SIDE = 29
USAGE = (
    "Usage: python3 -m lattice_dimers.solvers.any_lattice_rectangle_bigint -r <rowCount> -c <colCount> "
    "[--lattice king|triangular|square]"
)
SHORTER_SIDE_TOO_LONG = (
    f"The shorter side of the board can be at most {MAX_SHORTER_SIDE}, because a JavaScript array holds fewer than 2^32 states."
)


LATTICES = {
    "square": (False, False),
    "triangular": (False, True),
    "king": (True, True),
}


def list_offsets(cols, c, has_below, lattice):
    """Lists the bits a free cell in column c can cover with its partner, like listOffsets of
    js/solvers/any-lattice-rectangle-bigint.js: right and down, down-left on the king's graph, down-right on the
    triangular lattice and the king's graph."""
    down_left, down_right = LATTICES[lattice]
    has_right = c + 1 < cols
    offsets = []

    if has_right:
        offsets.append(1)

    if down_left and has_below and c > 0:
        offsets.append(cols - 1)

    if has_below:
        offsets.append(cols)

    if down_right and has_below and has_right:
        offsets.append(cols + 1)

    return [1 << offset for offset in offsets]


def read_lattice(argv):
    if "--lattice" not in argv:
        return "king"

    index = argv.index("--lattice") + 1

    return argv[index] if index < len(argv) else None


def calculate_total_tiling_combinations(row_count, col_count, lattice="king"):
    """Counts the tilings of a rectangle on a lattice with the broken-profile method of
    js/solvers/any-lattice-rectangle-bigint.js. Bit i
    of a state tells whether the cell i places ahead of the current one is already covered, and a state has
    cols + 2 bits."""
    rows = max(row_count, col_count)
    cols = min(row_count, col_count)
    state_count = 1 << (cols + 2)
    current = [0] * state_count
    current[0] = 1

    for cell in range(rows * cols):
        offsets = list_offsets(cols, cell % cols, cell // cols + 1 < rows, lattice)
        following = [0] * state_count

        for state, count in enumerate(current):
            if not count:
                continue

            if state & 1:
                following[state >> 1] += count
                continue

            for offset in offsets:
                if not state & offset:
                    following[(state + offset) >> 1] += count

        current = following

    return current[0]


def is_valid_size(size):
    return isinstance(size, int) and size >= 0


def main(argv):
    sys.set_int_max_str_digits(0)
    options = parse_args(argv, {"-r": "rowCount", "-c": "colCount"})
    row_count = options.get("rowCount")
    col_count = options.get("colCount")
    lattice = read_lattice(argv)

    if not is_valid_size(row_count) or not is_valid_size(col_count) or lattice not in LATTICES:
        print(USAGE, file=sys.stderr)
        return 1

    if min(row_count, col_count) > MAX_SHORTER_SIDE:
        print(SHORTER_SIDE_TOO_LONG, file=sys.stderr)
        return 1

    stop_timer = start_timer(argv)
    result = calculate_total_tiling_combinations(row_count, col_count, lattice)
    stop_timer()
    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
