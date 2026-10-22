"""Helpers: run the kd binaries, primes, Chinese remaindering."""
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))


def is_prime(n):
    """Deterministic Miller-Rabin for n < 3.3e24."""
    if n < 2:
        return False
    small = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41]
    for p in small:
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d //= 2
        s += 1
    for a in small:
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


def primes_below(bound, m):
    out, n = [], bound - 1
    while len(out) < m:
        if is_prime(n):
            out.append(n)
        n -= 1
    return out


PRIMES = primes_below(1 << 62, 16)


def run(args, binary="kd_ld", threads=None):
    env = dict(os.environ)
    if threads:
        env["OMP_NUM_THREADS"] = str(threads)
    res = subprocess.run([os.path.join(HERE, binary)] + [str(a) for a in args], capture_output=True, text=True, env=env)
    if res.returncode:
        raise RuntimeError(f"kd failed: {args}: {res.stderr}")
    return res.stdout


def crt(residues, primes):
    x, M = 0, 1
    for r, p in zip(residues, primes):
        t = ((r - x) * pow(M, -1, p)) % p
        x += M * t
        M *= p
    return x, M


def count_mod(lattice, bc, w, K, nprimes, binary="kd_ld"):
    """Z(k, w) for k = 0..K by CRT over nprimes primes; the last prime only checks."""
    primes = PRIMES[:nprimes]
    out = run(["count", lattice, bc, w, K] + primes, binary)
    rows = [list(map(int, line.split())) for line in out.splitlines() if not line.startswith("#")]
    res = []
    for row in rows:
        k, rs = row[0], row[1:]
        x, M = crt(rs[:-1], primes[:-1])
        assert x % primes[-1] == rs[-1], ("CRT check prime disagrees", lattice, bc, w, k)
        assert x < M // (1 << 64), ("value too close to the CRT modulus", lattice, bc, w, k)
        res.append(x)
    return res
