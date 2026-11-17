import math
import os
import sys

import numpy as np

from lattice_dimers.core import combine_checked_residues, list_primes, run_workers

USAGE = "Usage: b402163.py <first n> <last n>"


def count_rows(cols, rows, start, prime):
    flags = 2 if cols >= 3 else 1
    half = 1 << (cols + 1)
    current = np.zeros((flags, 2 * half), dtype=np.uint64)
    following = np.zeros((flags, 2 * half), dtype=np.uint64)
    current[0, start] = 1

    for cell in range(rows * cols):
        c = cell % cols
        shifts = [cols - 1, 0]

        if c + 1 < cols:
            shifts.append(cols)

        if c > 0:
            shifts.append(cols - 2)

        if c == 0:
            shifts.append(cols - 2)

            if flags == 1:
                shifts.append(2 * cols - 2)

        following[:, :half] = current[:, 1::2]
        following[:, half:] = 0
        even = current[:, 0::2]

        for j in shifts:
            following[:, :half].reshape(flags, -1, 2, 1 << j)[:, :, 1, :] += even.reshape(flags, -1, 2, 1 << j)[:, :, 0, :]

        if c == 0 and flags == 2:
            following[1, :half] += even[0]

        np.remainder(following, prime, out=following)

        if flags == 2 and c == cols - 3:
            following[0, half:] = following[1, :half]
            following[1, :half] = 0

        current, following = following, current

    return int(current[0, start])


def count_cylinder(task):
    cols, prime = task

    return count_rows(cols, cols, 0, prime)


def log2_bound(cols):
    if cols < 3:
        return cols * cols / 2 * math.log2(5)

    def share(degree):
        return sum(math.log2(k) for k in range(2, degree + 1)) / (2 * degree)

    return cols * (2 * share(5) + (cols - 2) * share(8))


def main(argv):
    if len(argv) != 2 or not all(arg.isascii() and arg.isdigit() for arg in argv) or int(argv[0]) > int(argv[1]):
        print(USAGE, file=sys.stderr)
        return 2

    first, last = int(argv[0]), int(argv[1])
    sides = [2 * n for n in range(max(first, 1), last + 1)]
    primes = {cols: list_primes(math.ceil((log2_bound(cols) + 1) / 30) + 1) for cols in sides}
    tasks = [(cols, prime) for cols in sides for prime in primes[cols]]
    results = run_workers(count_cylinder, tasks, os.process_cpu_count() or 1)
    residues = {}

    for (cols, _), residue in zip(tasks, results):
        residues.setdefault(cols, []).append(residue)

    for n in range(first, last + 1):
        cols = 2 * n
        print(n, 1 if n == 0 else combine_checked_residues(residues[cols], primes[cols]))

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
