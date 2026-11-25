import math
import os
import sys

import numpy as np

from lattice_dimers.core import combine_checked_residues, run_workers
from lattice_dimers.core.pfaffian import pfaffian_modulo

USAGE = "Usage: b399633.py <first n> <last n>"
STEPS = ((1, 0), (0, 1), (1, 1))


def is_prime(n):
    if n < 2 or n % 2 == 0:
        return n == 2

    d = 3

    while d * d <= n:
        if n % d == 0:
            return False

        d += 2

    return True


def list_primes_one_modulo(modulus, count):
    primes = []
    q = (2**31 - 2) // modulus * modulus + 1

    while len(primes) < count:
        if is_prime(q):
            primes.append(q)

        q -= modulus

    return primes


def primitive_root(prime):
    factors = []
    m = prime - 1
    q = 2

    while q * q <= m:
        if m % q == 0:
            factors.append(q)

            while m % q == 0:
                m //= q

        q += 1

    if m > 1:
        factors.append(m)

    g = 2

    while any(pow(g, (prime - 1) // q, prime) == 1 for q in factors):
        g += 1

    return g


def determinant(matrix, prime):
    a = matrix.astype(np.int64)
    size = len(a)
    result = 1

    for i in range(size):
        candidates = np.flatnonzero(a[i:, i])

        if not candidates.size:
            return 0

        pivot = i + int(candidates[0])

        if pivot != i:
            a[[i, pivot]] = a[[pivot, i]]
            result = prime - result

        pivot_value = int(a[i, i])
        result = result * pivot_value % prime

        if i + 1 < size:
            factors = a[i + 1:, i] * pow(pivot_value, -1, prime) % prime
            a[i + 1:, i:] = (a[i + 1:, i:] - np.outer(factors, a[i, i:]) % prime) % prime

    return result


def pfaffian(side, seam_x, seam_y, prime):
    root = pow(primitive_root(prime), (prime - 1) // (2 * side), prime)
    powers = [pow(root, e, prime) for e in range(2 * side)]

    def z(exponent):
        return powers[exponent % (2 * side)]

    def block(exponent):
        a = np.zeros((side, side), dtype=np.int64)

        for x in range(side):
            for step, (dx, dy) in enumerate(STEPS):
                x2 = x + dx
                sign = (-1 if step < 2 and x % 2 == 0 else 1) * (-1 if seam_x and x2 >= side else 1)
                x2 %= side
                a[x, x2] = (a[x, x2] + sign * z(-exponent * dy)) % prime
                a[x2, x] = (a[x2, x] - sign * z(exponent * dy)) % prime

        return a

    pair_sign = prime - 1 if side * (side - 1) // 2 % 2 else 1
    seen = set()
    order = []
    result = 1

    for m in range(side):
        exponent = 2 * m + seam_y

        if exponent in seen:
            continue

        partner = (2 * side - exponent) % (2 * side)
        seen.update((exponent, partner))

        if partner == exponent:
            order.append(exponent)
            value = pfaffian_modulo(block(exponent).astype(np.uint64), prime)
            result = result * pow(side, side // 2, prime) * value % prime
        else:
            order.extend((exponent, partner))
            result = result * pair_sign * pow(side, side, prime) * determinant(block(exponent), prime) % prime

    vandermonde = 1

    for i, first in enumerate(order):
        for second in order[i + 1:]:
            vandermonde = vandermonde * (z(second) - z(first)) % prime

    return result * pow(pow(vandermonde, side, prime), -1, prime) % prime


def count(n, jobs):
    if n == 0:
        return 1

    side = 2 * n
    bits = side * side * math.log2(720) / 12 + 8
    primes = list_primes_one_modulo(2 * side, int(bits / 30) + 2)
    total = 0

    for seam_x in (0, 1):
        for seam_y in (0, 1):
            residues = run_workers(lambda prime: pfaffian(side, seam_x, seam_y, prime), primes, jobs)
            total += abs(combine_checked_residues(residues, primes, signed=True))

    return total // 2


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
