import math
import os
import sys

import numpy as np

from lattice_dimers.core import calculate_log2_bound, combine_checked_residues, list_primes, run_workers

USAGE = "Usage: b239264.py <first n> <last n>"


def count_strips(task):
    cols, rows, prime = task
    half = 1 << cols
    current = np.zeros(2 * half, dtype=np.uint64)
    following = np.zeros(2 * half, dtype=np.uint64)
    current[0] = 1
    counts = []

    for _ in range(rows):
        for c in range(cols):
            shifts = [cols - 1]

            if c + 1 < cols:
                shifts += [0, cols]

            if c > 0:
                shifts.append(cols - 2)

            following[:half] = current[1::2]
            following[half:] = 0
            even = current[0::2]

            for j in shifts:
                if j == cols:
                    following[half:] += even
                else:
                    following[:half].reshape(-1, 2, 1 << j)[:, 1, :] += even.reshape(-1, 2, 1 << j)[:, 0, :]

            np.remainder(following, prime, out=following)
            current, following = following, current

        counts.append(int(current[0]))

    return counts


def board(n):
    d = 0

    while (d + 1) * (d + 2) // 2 <= n:
        d += 1

    h = n - d * (d + 1) // 2

    return min(h, d - h), max(h, d - h)


def main(argv):
    if len(argv) != 2 or not all(arg.isascii() and arg.isdigit() for arg in argv) or int(argv[0]) > int(argv[1]):
        print(USAGE, file=sys.stderr)
        return 2

    first, last = int(argv[0]), int(argv[1])
    boards = [board(n) for n in range(first, last + 1)]
    longest = {}

    for cols, rows in boards:
        if cols > 0 and cols * rows % 2 == 0:
            longest[cols] = max(rows, longest.get(cols, 0))

    primes = {cols: list_primes(math.ceil((calculate_log2_bound(rows, cols) + 1) / 30) + 1) for cols, rows in longest.items()}
    tasks = [(cols, rows, prime) for cols, rows in longest.items() for prime in primes[cols]]
    results = run_workers(count_strips, tasks, os.process_cpu_count() or 1)
    residues = {}

    for (cols, _, _), counts in zip(tasks, results):
        residues.setdefault(cols, []).append(counts)

    for n, (cols, rows) in enumerate(boards, first):
        if cols == 0:
            count = 1
        elif cols * rows % 2:
            count = 0
        else:
            count = combine_checked_residues([counts[rows - 1] for counts in residues[cols]], primes[cols])

        print(n, count)

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
