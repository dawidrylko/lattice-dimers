import math
import os
import sys

import numpy as np

from lattice_dimers.core import calculate_log2_bound, combine_checked_residues, list_primes, run_workers

USAGE = "Usage: b401673.py <first n> <last n>"


def evaluate(task):
    cols, prime, weight = task
    half = 1 << cols
    current = np.zeros(2 * half, dtype=np.uint64)
    following = np.zeros(2 * half, dtype=np.uint64)
    current[0] = 1

    for cell in range(cols * cols):
        c = cell % cols
        shifts = [(cols - 1, 1)]

        if c + 1 < cols:
            shifts += [(0, 1), (cols, weight)]

        if c > 0:
            shifts.append((cols - 2, weight))

        following[:half] = current[1::2]
        following[half:] = 0
        even = current[0::2]

        for j, factor in shifts:
            source = even if factor == 1 else even * np.uint64(factor)

            if j == cols:
                following[half:] += source
            else:
                following[:half].reshape(-1, 2, 1 << j)[:, 1, :] += source.reshape(-1, 2, 1 << j)[:, 0, :]

        np.remainder(following, prime, out=following)
        current, following = following, current

    return int(current[0])


def interpolate(values, prime):
    degree = len(values) - 1
    points = [j * j % prime for j in range(degree + 1)]
    master = [1]

    for u in points:
        master = [((master[i - 1] if i else 0) - u * (master[i] if i < len(master) else 0)) % prime for i in range(len(master) + 1)]

    result = [0] * (degree + 1)

    for j, u in enumerate(points):
        quotient = [0] * (degree + 1)
        quotient[degree] = master[degree + 1]

        for i in range(degree, 0, -1):
            quotient[i - 1] = (master[i] + u * quotient[i]) % prime

        denominator = 0

        for q in reversed(quotient):
            denominator = (denominator * u + q) % prime

        factor = values[j] * pow(denominator, prime - 2, prime) % prime
        result = [(r + factor * q) % prime for r, q in zip(result, quotient)]

    return result


def row_start(n):
    return (n - 1) * n * (2 * n - 1) // 6 + n


def main(argv):
    if len(argv) != 2 or not all(arg.isascii() and arg.isdigit() for arg in argv) or int(argv[0]) > int(argv[1]):
        print(USAGE, file=sys.stderr)
        return 2

    first, last = int(argv[0]), int(argv[1])
    terms = []
    n = 0

    for i in range(first, last + 1):
        while row_start(n + 1) <= i:
            n += 1

        terms.append((n, i - row_start(n)))

    sides = sorted({n for n, _ in terms if n > 0})
    primes = {n: list_primes(math.ceil((calculate_log2_bound(2 * n, 2 * n) + 1) / 30) + 1) for n in sides}
    tasks = [(2 * n, prime, weight) for n in sides for prime in primes[n] for weight in range(n * n + 1)]
    results = run_workers(evaluate, tasks, os.process_cpu_count() or 1)
    values = {}

    for (cols, prime, _), value in zip(tasks, results):
        values.setdefault((cols // 2, prime), []).append(value)

    coefficients = {n: [interpolate(values[n, prime], prime) for prime in primes[n]] for n in sides}

    for i, (n, k) in enumerate(terms, first):
        print(i, 1 if n == 0 else combine_checked_residues([row[k] for row in coefficients[n]], primes[n]))

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
