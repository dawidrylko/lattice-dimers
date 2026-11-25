"""Writes KingEntropy/Certificate.lean: an integer Collatz-Wielandt certificate for the free king strip.

usage: python3 formal/certificate.py <w> [n] > formal/KingEntropy/Certificate.lean

The transfer is the same recursion as KingEntropy/Transfer.lean (ways, transfer). The vector is
v = T^n e0 in exact integers, so v <= 1 * T^n e0 holds with equality; c = p / q is the exact
minimum of (T v)_i / v_i over supp v, rounded down to q = 10^6. Lean checks p * v <= q * T v
entry by entry with `decide`.
"""
import sys
from fractions import Fraction
from functools import lru_cache
from math import floor, log


def transfer(w):
    @lru_cache(maxsize=None)
    def ways(target, k, cur, nxt):
        if k == 0:
            return 1 if nxt == target else 0
        j = w - k
        if cur >> j & 1:
            return ways(target, k - 1, cur, nxt)
        total = 0
        if j + 1 < w and not cur >> (j + 1) & 1:
            total += ways(target, k - 1, cur | 1 << j | 1 << (j + 1), nxt)
        for d in (j - 1, j, j + 1):
            if 0 <= d < w and not nxt >> d & 1 and target >> d & 1:
                total += ways(target, k - 1, cur | 1 << j, nxt | 1 << d)
        return total

    size = 1 << w
    return [[ways(t, w, s, 0) for t in range(size)] for s in range(size)]


def main():
    w = int(sys.argv[1])
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 4 * w
    T = transfer(w)
    size = len(T)
    v = [1 if i == 0 else 0 for i in range(size)]
    for _ in range(n):
        v = [sum(T[i][k] * v[k] for k in range(size)) for i in range(size)]
    Tv = [sum(T[i][k] * v[k] for k in range(size)) for i in range(size)]
    ratio = min(Fraction(Tv[i], v[i]) for i in range(size) if v[i] > 0)
    q = 10 ** 6
    p = floor(ratio * q)
    assert all(p * v[i] <= q * Tv[i] for i in range(size))
    print(f'w = {w}, n = {n}, c = {p}/{q}, log(c)/w = {log(p / q) / w:.12f}', file=sys.stderr)
    print('\n'.join([
        'import KingEntropy.Transfer',
        '',
        'namespace KingEntropy',
        '',
        f'abbrev certW : ℕ := {w}',
        f'def certN : ℕ := {n}',
        f'def certP : ℕ := {p}',
        f'def certQ : ℕ := {q}',
        f'def certList : List ℕ := [{", ".join(map(str, v))}]',
        'def certV (i : Fin (2 ^ certW)) : ℕ := certList.getD i 0',
        '',
        'end KingEntropy',
    ]))


if __name__ == '__main__':
    main()
