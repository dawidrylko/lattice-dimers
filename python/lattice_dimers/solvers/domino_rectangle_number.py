import math
import sys
from decimal import Decimal

from lattice_dimers.core import parse_args, start_timer

MAX_SHORTER_SIDE = 30
MAX_EXACT_COUNT = 2**53 - 1
FIRST_EXPONENT_COUNT = 1e21
USAGE = "Usage: python3 -m lattice_dimers.solvers.domino_rectangle_number -r <rowCount> -c <colCount>"
SHORTER_SIDE_TOO_LONG = (
    f"The shorter side of the board can be at most {MAX_SHORTER_SIDE}, because the rows are indexed with 32-bit integers."
)
NOT_EXACT = (
    "Warning: the result is above 2^53, so it is not exact. Use lattice_dimers.solvers.domino_rectangle_bigint for this board."
)


def search_tile_arrangements(current_row, next_row, col_count, current_mask, col_index, next_mask):
    """Fills the free cells of one row from col_index on, like searchTileArrangements of
    js/solvers/domino-rectangle-number.js. The counts are doubles added in the order of the JavaScript solver, so a
    count above 2^53 rounds to the same value."""
    if col_index >= col_count:
        next_row[next_mask] += current_row[current_mask]
        return

    current_bit = 1 << col_index
    next_bit = 1 << (col_index + 1)

    if current_mask & current_bit:
        search_tile_arrangements(current_row, next_row, col_count, current_mask, col_index + 1, next_mask)
    else:
        search_tile_arrangements(current_row, next_row, col_count, current_mask, col_index + 1, next_mask | current_bit)

    if col_index + 1 < col_count and not current_mask & current_bit and not current_mask & next_bit:
        search_tile_arrangements(current_row, next_row, col_count, current_mask, col_index + 2, next_mask)


def calculate_total_tiling_combinations(row_count, col_count):
    row_count, col_count = max(row_count, col_count), min(row_count, col_count)
    current_row = [0.0] * (1 << col_count)
    current_row[0] = 1.0

    for _ in range(row_count):
        next_row = [0.0] * (1 << col_count)

        for current_mask in range(1 << col_count):
            search_tile_arrangements(current_row, next_row, col_count, current_mask, 0, 0)

        current_row = next_row

    return current_row[0]


def format_count(count):
    """Writes a count the way JavaScript writes a Number, the shortest digits that identify the double."""
    if math.isinf(count):
        return "Infinity"

    if count >= FIRST_EXPONENT_COUNT:
        return repr(count)

    return str(int(Decimal(repr(count))))


def is_valid_size(size):
    return isinstance(size, int) and size >= 0


def main(argv):
    options = parse_args(argv, {"-r": "rowCount", "-c": "colCount"})
    row_count = options.get("rowCount")
    col_count = options.get("colCount")

    if not is_valid_size(row_count) or not is_valid_size(col_count):
        print(USAGE, file=sys.stderr)
        return 1

    if min(row_count, col_count) > MAX_SHORTER_SIDE:
        print(SHORTER_SIDE_TOO_LONG, file=sys.stderr)
        return 1

    stop_timer = start_timer(argv)
    result = calculate_total_tiling_combinations(row_count, col_count)
    stop_timer()
    print(format_count(result))

    if result > MAX_EXACT_COUNT:
        print(NOT_EXACT, file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
