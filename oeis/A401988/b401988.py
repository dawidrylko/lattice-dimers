import math
import os
import sys

import numpy as np
from numpy.lib.stride_tricks import as_strided

from lattice_dimers.core import combine_checked_residues, list_primes, run_workers

USAGE = "Usage: b401988.py <first n> <last n>"


def list_edges(side):
    edges = []

    for x in range(side):
        for y in range(side):
            for step, (dx, dy) in enumerate(((1, 0), (0, 1), (1, 1))):
                x2, y2 = x + dx, y + dy

                if x2 < side and y2 < side:
                    sign = -1 if step < 2 and x % 2 == 0 else 1
                    edges.append((x * side + y, x2 * side + y2, sign))

    return edges


def log2_determinant_bound(vertices, edges):
    degrees = [0] * vertices

    for u, v, _ in edges:
        degrees[u] += 1
        degrees[v] += 1

    return sum(math.lgamma(degree + 1) / math.log(2) / degree for degree in degrees if degree)


def determinant(side, edges, prime):
    size = side * side
    lower = side + 1
    width = 3 * lower + 2
    flat = np.zeros(size * width, dtype=np.int64)
    item = flat.itemsize
    band = as_strided(flat, shape=(size, size + lower), strides=((width - 1) * item, item), writeable=True)

    for u, v, sign in edges:
        band[u, v + lower] = sign % prime
        band[v, u + lower] = -sign % prime

    result = 1

    for i in range(size):
        last = min(size - 1, i + lower)
        end = min(size - 1, i + 2 * lower + 1) + lower + 1
        start = i + lower
        candidates = np.flatnonzero(band[i:last + 1, start])

        if not candidates.size:
            return 0

        pivot = i + int(candidates[0])

        if pivot != i:
            row = band[i, start:end].copy()
            band[i, start:end] = band[pivot, start:end]
            band[pivot, start:end] = row
            result = prime - result

        pivot_value = int(band[i, start])
        result = result * pivot_value % prime

        if last > i:
            row = band[i, start:end]
            block = band[i + 1:last + 1, start:end]
            factors = block[:, 0] * pow(pivot_value, -1, prime) % prime
            block -= np.outer(factors, row) % prime
            block %= prime

    return result


def count(n, jobs):
    if n == 0:
        return 1

    side = 2 * n
    edges = list_edges(side)
    primes = list_primes(int(log2_determinant_bound(side * side, edges) / 30) + 2)
    residues = run_workers(lambda prime: determinant(side, edges, prime), primes, jobs)
    square = combine_checked_residues(residues, primes)
    root = math.isqrt(square)

    if root * root != square:
        raise ValueError(f"The determinant of n = {n} is not a square.")

    return root


def main(argv):
    if len(argv) != 2 or not all(arg.isascii() and arg.isdigit() for arg in argv) or int(argv[0]) > int(argv[1]):
        print(USAGE, file=sys.stderr)
        return 2

    jobs = os.process_cpu_count() or 1

    for n in range(int(argv[0]), int(argv[1]) + 1):
        print(n, count(n, jobs), flush=True)

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
