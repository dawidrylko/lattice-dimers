import math
import os
import sys

import numpy as np

from lattice_dimers.core import calculate_log2_bound, combine_checked_residues, list_primes, run_workers

USAGE = "Usage: b239273.py <first n> <last n>"


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


def main(argv):
    if len(argv) != 2 or not all(arg.isascii() and arg.isdigit() for arg in argv) or int(argv[0]) > int(argv[1]):
        print(USAGE, file=sys.stderr)
        return 2

    first, last = int(argv[0]), int(argv[1])
    sides = [2 * n for n in range(max(first, 1), last + 1)]
    primes = {side: list_primes(math.ceil((calculate_log2_bound(side, side) + 1) / 30) + 1) for side in sides}
    tasks = [(side, side, prime) for side in sides for prime in primes[side]]
    results = run_workers(count_strips, tasks, os.process_cpu_count() or 1)
    residues = {}

    for (side, _, _), counts in zip(tasks, results):
        residues.setdefault(side, []).append(counts[-1])

    for n in range(first, last + 1):
        print(n, 1 if n == 0 else combine_checked_residues(residues[2 * n], primes[2 * n]))

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
