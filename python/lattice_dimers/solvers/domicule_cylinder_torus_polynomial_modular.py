import math
import os
import sys

import numpy as np

from lattice_dimers.core import combine_checked_residues, list_primes, parse_args, run_workers, start_timer

MAX_CIRCUMFERENCE = 20
BATCH_COUNTS = 1 << 20
SCRATCH_COUNTS = 1 << 19
USAGE = (
    "Usage: python3 -m lattice_dimers.solvers.domicule_cylinder_torus_polynomial_modular -r <rowCount> -c <circumference> "
    "[--torus] [-j <jobs>]\n"
    "The circumference is at least 2, and a torus has at least 2 rows."
)


def list_moves(cols, c, has_below, wrap_bit):
    """Lists the moves of a free cell in column c as (bit, diagonal) pairs, like listMoves of
    js/solvers/domicule-cylinder-torus-polynomial-modular.js: bit i of a state is the cell i places ahead in row-major
    order, and a piece from column 0 to the last column of the next row is kept in the extra bit wrap_bit when
    cols >= 3."""
    moves = []

    if c + 1 < cols:
        moves.append((1 << 1, 0))

    if c == 0:
        moves.append((1 << (cols - 1), 0))

    if not has_below:
        return moves

    if c > 0:
        moves.append((1 << (cols - 1), 1))
    elif cols == 2:
        moves.append((1 << (cols + 1), 1))
    else:
        moves.append((wrap_bit, 1))

    moves.append((1 << cols, 0))
    moves.append((1 << (cols + 1 if c + 1 < cols else 1), 1))

    return moves


def count_modulo(board):
    """Counts the domicule tilings of a cylinder or a torus by the number of diagonal pieces modulo a prime, cell by
    cell, like countModulo of js/solvers/domicule-cylinder-torus-polynomial-modular.js, with tables of 32-bit counts
    reduced modulo the prime as there.

    A state is the window of cols + 2 bits and, with cols >= 3, the extra bit above it, and holds a block of
    coefficients: entry k is the coefficient of x^k. As in any_lattice_cylinder_torus_modular, shifting a state by one
    bit maps a contiguous range of states onto another, so a cell step needs no index arrays: the table is reshaped
    into views where one axis is the bit a move covers, and every move adds one view of the current table onto one view
    of the next, a diagonal move one entry higher. The column where the extra bit joins the window only swaps which axis
    of the next table it lands on. Before cell p at most p pieces are placed, so only the entries up to p are visited.
    The sums are reduced a slice at a time through a scratch array of SCRATCH_COUNTS counts.

    A torus runs one start per rotation class, as in JavaScript, but a batch of starts at once, each with its own
    blocks. A batch takes as many starts as fit in BATCH_COUNTS counts, and at least one."""
    rows, cols, prime, torus = board["rows"], board["cols"], board["prime"], board["torus"]
    degree = rows * cols // 2
    width = degree + 1
    window_bits = cols + 2
    wrap_bit = 1 << window_bits
    uses_wrap_bit = cols >= 3
    wraps = 2 if uses_wrap_bit else 1
    half = 1 << (window_bits - 1)
    state_count = wraps << window_bits
    moves_below = [list_moves(cols, c, True, wrap_bit) for c in range(cols)]
    moves_last = [list_moves(cols, c, torus, wrap_bit) for c in range(cols)]
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

    def step(current, following, c, last, starts, placed):
        moves = moves_last[c] if last else moves_below[c]
        joins = uses_wrap_bit and c == cols - 3
        visited = min(width, placed + 1)
        following.reshape(state_count, starts, width)[:, :, : min(width, visited + 1)] = 0
        shifted = following.reshape(wraps, 2, half, starts, width)
        landing = shifted[0] if joins else shifted[:, 0]
        accumulate(landing[..., :visited], current.reshape(wraps, half, 2, starts, width)[:, :, 1, :, :visited])

        for bit, diagonal in moves:
            length = min(visited, width - diagonal)
            high = slice(diagonal, diagonal + length)

            if bit == wrap_bit:
                accumulate(landing[1][..., high], current.reshape(wraps, half, 2, starts, width)[0, :, 0, :, :length])
                continue

            block = bit >> 1
            groups = half // (2 * block)
            free = current.reshape(wraps, groups, 2, block, 2, starts, width)[:, :, 0, :, 0, :, :length]
            target = following.reshape(wraps, 2, groups, 2, block, starts, width)
            accumulate((target[0] if joins else target[:, 0])[:, :, 1][..., high], free)

    def run(first_states):
        starts = len(first_states)
        columns = np.arange(starts)
        current = np.zeros(state_count * starts * width, dtype=np.uint32)
        following = np.zeros_like(current)
        current.reshape(state_count, starts, width)[first_states, columns, 0] = 1 % prime

        for cell in range(rows * cols):
            step(current, following, cell % cols, cell >= (rows - 1) * cols, starts, min(degree, cell))
            current, following = following, current

        return current.reshape(state_count, starts, width)[first_states, columns]

    if not torus:
        return [int(count) for count in run(np.array([0]))[0]]

    def rotate(subset):
        return ((subset << 1) | (subset >> (cols - 1))) & ((1 << cols) - 1)

    starts = []
    weights = []

    for start in range(1 << cols):
        weight = 1
        rotation = rotate(start)

        while rotation != start and rotation > start:
            weight += 1
            rotation = rotate(rotation)

        if rotation != start:
            continue

        starts.append(start)
        weights.append(weight)

    batch = max(1, BATCH_COUNTS // (state_count * width))
    total = [0] * width

    for first in range(0, len(starts), batch):
        blocks = run(np.array(starts[first : first + batch]))

        for weight, block in zip(weights[first : first + batch], blocks):
            total = [(count + weight * int(entry)) % prime for count, entry in zip(total, block)]

    return total


def calculate_log2_bound(rows, cols, torus):
    """Bounds log2 of the number of tilings, like calculateLog2Bound of
    js/solvers/domicule-cylinder-torus-polynomial-modular.js: every piece is one of the at most m moves of its cell, so a
    cylinder has at most m^(N/2) tilings and a torus, with its 2^cols start sets, at most 2^cols m^(N/2)."""
    wrap_bit = 1 << (cols + 2)
    most = max(len(list_moves(cols, c, rows > 1 or torus, wrap_bit)) for c in range(cols))

    return ((rows * cols) / 2) * math.log2(most) + (cols if torus else 0)


def physical_memory():
    """Reads the memory of the machine in bytes, or 0 when it is not known, which leaves one worker thread."""
    try:
        return os.sysconf("SC_PHYS_PAGES") * os.sysconf("SC_PAGE_SIZE")
    except (OSError, ValueError):
        return 0


def cap_threads(jobs, cols, degree, memory):
    """Caps the number of worker threads like capThreads of js/solvers/domicule-cylinder-torus-polynomial-modular.js, with
    its table sizes, so that every language runs the same number of threads."""
    bytes_per_worker = 2 ** (cols + (3 if cols >= 3 else 2)) * (2 * 4 * (degree + 1) + 2)

    return max(1, min(jobs, memory // 2 // bytes_per_worker))


def calculate_diagonal_polynomial(row_count, col_count, torus=False, jobs=None):
    """Counts the tilings by the number of diagonal pieces exactly: every coefficient is at most the number of tilings,
    so the bound sets the number of primes, and one more prime checks every coefficient. A torus is counted with its
    shorter side as the circumference."""
    if not is_valid_board(row_count, col_count, torus):
        raise ValueError("The circumference must be at least 2, and a torus needs at least 2 rows.")

    transpose = torus and row_count < col_count
    rows = col_count if transpose else row_count
    cols = row_count if transpose else col_count
    degree = rows * cols // 2

    if (rows * cols) % 2 == 1:
        return [0] * (degree + 1)

    prime_count = math.ceil((calculate_log2_bound(rows, cols, torus) + 1) / 30) + 1
    primes = list_primes(prime_count)
    tasks = [{"rows": rows, "cols": cols, "torus": torus, "prime": prime} for prime in primes]
    threads = cap_threads(jobs or os.process_cpu_count() or 1, cols, degree, physical_memory())
    residues = run_workers(count_modulo, tasks, threads)

    return [combine_checked_residues([coefficients[k] for coefficients in residues], primes) for k in range(degree + 1)]


def is_valid_board(row_count, col_count, torus):
    return (
        isinstance(row_count, int)
        and row_count >= (2 if torus else 0)
        and isinstance(col_count, int)
        and col_count >= 2
    )


def main(argv):
    sys.set_int_max_str_digits(0)
    options = parse_args(argv, {"-r": "rowCount", "-c": "colCount", "-j": "jobs"})
    torus = "--torus" in argv
    jobs = options.get("jobs", os.process_cpu_count() or 1)
    row_count = options.get("rowCount")
    col_count = options.get("colCount")

    if not is_valid_board(row_count, col_count, torus) or not jobs > 0:
        print(USAGE, file=sys.stderr)
        return 1

    circumference = min(col_count, row_count if torus else math.inf)

    if circumference > MAX_CIRCUMFERENCE:
        print(
            f"The circumference can be at most {MAX_CIRCUMFERENCE}, because every worker thread keeps the polynomial of "
            "every one of 2^(circumference + 3) states in memory (-j sets the number of threads).",
            file=sys.stderr,
        )
        return 1

    threads = cap_threads(jobs, circumference, row_count * col_count // 2, physical_memory())

    if threads < jobs:
        print(f"Running {threads} worker threads instead of {jobs}, so that their tables fit in half the memory.", file=sys.stderr)

    stop_timer = start_timer(argv)

    try:
        coefficients = calculate_diagonal_polynomial(row_count, col_count, torus, jobs)
    except MemoryError:
        print("Invalid array length", file=sys.stderr)
        return 1
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1

    stop_timer()
    print(",".join(map(str, coefficients)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
