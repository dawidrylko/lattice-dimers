"""Theorem 4.1 for small strips in exact integer arithmetic, and the lemmas behind it.

Part A. Collatz-Wielandt certificates for the free strip of width w (A = T^2),
in exact integer arithmetic with a dict-based cell transfer written for this
check (a sliding window of w+1 cells, bit k = cell p+k):
  lower : plain strip; v = A^n e0 rescaled with ceilings (so supp v = supp A^n e0
          exactly), c = min (Av)_i / v_i as a fraction, bound log(c)/(2w);
  upper : side cells may be covered from outside, uniform weight sqrt(phi)
          (Lemma 4.7) or the run weights 1, sqrt2, sqrt(phi) (Lemma 4.6 and the
          transfer described after it); C = max (Av)_i / v_i, checked that
          (Av)_i = 0 off supp v; bound log(C)/(2w).
  Irrational weights are replaced by rationals g/D >= weight (D = 2^64); every
  side-cell step multiplies the moves without an outside cover by D, so one
  application of A carries the exact factor D^4. Logs with mpmath at 60 digits,
  rounded outward to 12 decimals.
Part B. Brute-force checks of Lemmas 4.4-4.7 on small boards:
  the cut identity, M(A, B) <= min(F(A), F(B)) with M(S, S) = F(S), and the strip
  inequality Z(K, kw) <= W_h(K, w)^k for both weights (and its failure at z = 0).

Run: python3 bounds_exact.py > out/bounds_exact.txt
"""
import itertools
import sys
from fractions import Fraction

import mpmath

import graphs

mpmath.mp.dps = 60
D = 1 << 64


def ceil_weight(x):
    return int(mpmath.ceil(x * D))


SQRT2 = ceil_weight(mpmath.sqrt(2))
SQRTPHI = ceil_weight(mpmath.sqrt((1 + mpmath.sqrt(5)) / 2))


def cell_step(states, w, c, mode):
    """One cell of the free strip. states: dict (window, lrun, rrun) -> int."""
    side_l, side_r = c == 0, c == w - 1
    side = (side_l or side_r) and mode != "none"
    scale = D if side else 1
    new = {}

    def add(key, val):
        new[key] = new.get(key, 0) + val

    for (s, lr, rr), x in states.items():
        if side_l:
            lr_reset = 0
        else:
            lr_reset = lr
        if side_r:
            rr_reset = 0
        else:
            rr_reset = rr
        base = x * scale
        if s & 1:  # covered from above or from the left
            add((s >> 1, lr_reset, rr_reset), base)
            continue
        if c + 1 < w and not s >> 1 & 1:  # right
            add(((s | 2) >> 1, lr_reset, rr_reset), base)
        if c >= 1 and not s >> (w - 1) & 1:  # down-left
            add(((s | 1 << (w - 1)) >> 1, lr_reset, rr_reset), base)
        if not s >> w & 1:  # down
            add(((s | 1 << w) >> 1, lr_reset, rr_reset), base)
        if c + 1 < w:  # down-right
            add(((s >> 1) | 1 << w, lr_reset, rr_reset), base)
        if side:  # covered from outside
            if mode == "phi":
                add((s >> 1, lr, rr), x * SQRTPHI)
            else:  # run weights, state = position of the previous side cell in a run
                if side_l:
                    f = (D, SQRT2, SQRTPHI)[lr]
                    add((s >> 1, min(lr + 1, 2), rr), x * f)
                if side_r:
                    f = (D, SQRT2, SQRTPHI)[rr]
                    add((s >> 1, lr, min(rr + 1, 2)), x * f)
    return new


def apply_A(vec, w, mode):
    states = {(A, l, r): x for (A, l, r), x in vec.items() if x}
    for _ in range(2):
        for c in range(w):
            states = cell_step(states, w, c, mode)
    for (s, l, r), x in states.items():
        assert not s >> w & 1 or x == 0
    return states


def certify(w, mode, iters):
    """Returns (bound, ratio) for mode in {'none' (lower), 'phi', 'run'} (upper)."""
    vec = {(0, 0, 0): 1}
    scale = D ** 4 if mode != "none" else 1
    for _ in range(iters):
        y = apply_A(vec, w, mode)
        M = max(y.values())
        vec = {k: -(-(x << 100) // M) for k, x in y.items() if x}
    y = apply_A(vec, w, mode)
    ratios = [Fraction(y.get(k, 0), x) for k, x in vec.items()]
    assert all(k in vec for k, x in y.items() if x), "Av has support outside supp v"
    if mode == "none":
        r = min(ratios) / scale
        b = mpmath.log(mpmath.mpf(r.numerator) / r.denominator) / (2 * w)
        bound = mpmath.floor(b * 10**12) / 10**12
    else:
        r = max(ratios) / scale
        b = mpmath.log(mpmath.mpf(r.numerator) / r.denominator) / (2 * w)
        bound = mpmath.ceil(b * 10**12) / 10**12
    spread = float(max(ratios) / min(ratios) - 1)
    return bound, b, spread, len(vec)


PAPER = {  # Table 3: lower, upper sqrt(phi), upper run weights
    4: ("0.445893077494", "0.689765394232", "0.669090528409"),
    8: ("0.505014525148", "0.627626147026", "0.617278850986"),
    12: ("0.525175645897", "0.606921301094", "0.600023045982"),
}


def part_a(widths):
    print("== A. exact Collatz-Wielandt certificates (12 decimals, rounded outward) ==")
    print(" w  bound            mine (12 dp)      paper (Table 3)   unrounded                      CW spread  states")
    for w in widths:
        for mode, col in (("none", 0), ("phi", 1), ("run", 2)):
            bound, b, spread, n = certify(w, mode, 45)
            mine = mpmath.nstr(bound, 12, min_fixed=-1, max_fixed=1)
            paper = PAPER.get(w, ("", "", ""))[col]
            name = {"none": "lower", "phi": "upper sqrt(phi)", "run": "upper runs"}[mode]
            flag = ""
            if paper:
                d = mpmath.mpf(mine) - mpmath.mpf(paper)
                flag = "same" if d == 0 else f"diff {mpmath.nstr(d, 3)}"
            print(f"{w:2d}  {name:16s} {mine:16s}  {paper:16s}  {mpmath.nstr(b, 20):28s}  {spread:.1e}  {n:6d}  {flag}",
                  flush=True)


_MCACHE = {}


def matchings_across(A, B):
    """M(A, B): perfect matchings between row sets A and B, a ~ b iff |a - b| <= 1."""
    key = (tuple(sorted(A)), tuple(sorted(B)))
    if key not in _MCACHE:
        _MCACHE[key] = _matchings_across(*key)
    return _MCACHE[key]


def _matchings_across(A, B):
    if len(A) != len(B):
        return 0
    n = len(A)

    def rec(i, used):
        if i == n:
            return 1
        return sum(rec(i + 1, used | 1 << j) for j in range(n) if not used >> j & 1 and abs(A[i] - B[j]) <= 1)

    return rec(0, 0)


def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


def Frun(S):
    out, run, prev = 1, 0, None
    for x in sorted(S):
        if prev is not None and x == prev + 1:
            run += 1
        else:
            if run:
                out *= fib(run + 1)
            run = 1
        prev = x
    if run:
        out *= fib(run + 1)
    return out


def N_count(K, w, B, A):
    """N(B, A): matchings of B(K, w) minus cells (b, 0), b in B, and (a, w-1), a in A."""
    removed = {b * w for b in B} | {a * w + w - 1 for a in A}
    if len(removed) != len(B) + len(A):
        return 0  # w = 1 with a cell in both sets
    keep = [v for v in range(K * w) if v not in removed]
    idx = {v: i for i, v in enumerate(keep)}
    edges = [(idx[u], idx[v]) for u, v in graphs.board_edges(K, w) if u in idx and v in idx]
    if len(keep) % 2:
        return 0
    return graphs.count_matchings(len(keep), edges) if keep else 1


def part_b():
    print("\n== B. lemmas on small boards (brute force) ==")
    bad = 0
    nmax = 0
    for m in range(1, 11):
        cells = range(m)
        subsets = [frozenset(c) for k in range(m + 1) for c in itertools.combinations(cells, k)]
        bysize = {}
        for S in subsets:
            bysize.setdefault(len(S), []).append(S)
        for k, group in bysize.items():
            mx = 0
            for A in group:
                fa = Frun(A)
                if matchings_across(A, A) != fa:
                    bad += 1
                for B in group:
                    M = matchings_across(A, B)
                    mx = max(mx, M)
                    if M > min(fa, Frun(B)):
                        bad += 1
                    nmax += 1
            if mx != fib(k + 1):
                bad += 1
    print(f"M(A,B) <= min(F(A),F(B)), M(S,S) = F(S), max M = F_(n+1): {nmax} pairs, columns m <= 10, violations {bad}")

    phi = (1 + mpmath.sqrt(5)) / 2
    fac = [1, mpmath.sqrt(2), mpmath.sqrt(phi)]

    def h_run(S):
        out, prev, pos = mpmath.mpf(1), None, 0
        for x in sorted(S):
            pos = pos + 1 if prev is not None and x == prev + 1 else 1
            out *= fac[min(pos - 1, 2)]
            prev = x
        return out

    cut_bad = strip_bad = zero_fail = nboards = nk2 = 0
    for K in range(1, 7):
        for w in (2, 3, 4):
            for k in (1, 2, 3):
                if k * w > 12 or K * k * w > 36:
                    continue
                Zb = graphs.Z_brute(K, k * w)
                rows = range(K)
                subsets = [frozenset(c) for n in range(K + 1) for c in itertools.combinations(rows, n)]
                Ntab = {(B, A): N_count(K, w, B, A) for B in subsets for A in subsets}
                # cut identity, summed strip by strip
                vec = {A: Ntab[(frozenset(), A)] for A in subsets}
                for _ in range(k - 1):
                    new = {}
                    for A, x in vec.items():
                        if not x:
                            continue
                        for B in subsets:
                            mab = matchings_across(A, B)
                            if mab:
                                for A2 in subsets:
                                    new[A2] = new.get(A2, 0) + x * mab * Ntab[(B, A2)]
                    vec = new
                if vec.get(frozenset(), 0) != Zb:
                    cut_bad += 1
                z = mpmath.sqrt(phi)
                Wphi = sum(Ntab[(B, A)] * z ** (len(A) + len(B)) for B in subsets for A in subsets)
                Wrun = sum(Ntab[(B, A)] * h_run(A) * h_run(B) for B in subsets for A in subsets)
                W0 = Ntab[(frozenset(), frozenset())]
                if Zb > Wphi**k or Zb > Wrun**k:
                    strip_bad += 1
                if k >= 2:
                    nk2 += 1
                    zero_fail += Zb > W0**k
                nboards += 1
    print(f"cut identity (Lemma 4.4) and strip inequality (Lemma 4.7, both weights): {nboards} boards "
          f"(K <= 6, w = 2..4, k = 1..3), cut violations {cut_bad}, strip violations {strip_bad}")
    print(f"with z = 0 (no outside covers) the strip inequality fails on {zero_fail} of the {nk2} boards with k >= 2")
    return bad + cut_bad + strip_bad


if __name__ == "__main__":
    widths = [int(a) for a in sys.argv[1:]] or [4, 8, 12]
    part_a(widths)
    nb = part_b()
    print("\nTOTAL VIOLATIONS:", nb)
