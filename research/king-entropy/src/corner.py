"""Corner free energy kappa, the asymptotics of A239273, and s from exact counts alone.

usage: python3 src/corner.py > out/out_corner.txt      (writes corner.json)

Inputs: exact counts Z(k, m) of free king boards (zex_king_free_m<m>_K<K>.json, zexact.py), s from
errbar.json (RECOMMENDATION), sigma from surface.json; for a check from a separate code base, the
square counts of the JavaScript solvers (../../data/domiculeTilingTests.json, L <= 20) and their
20 x 20 count (README, also checked in validate.py).

1. rho(K, L) = log Z(K, L) - s K L + 2 sigma (K + L) tends to the corner free energy kappa, so that
   log Z(K, L) = s K L - 2 sigma (K + L) + kappa + o(1). Squares L = 8..24 with a geometric (Aitken)
   extrapolation, its backtest and a drift-of-the-ratio variant; rectangles K, L >= 14 as a check.
2. A239273: a(n) = Z(2n, 2n) ~ C d^(n^2) / f^n with C = e^kappa, d = e^(4 s), f = e^(8 sigma).
3. s without eigenvalues: (a) second differences [log Z(L+2, L+2) - 2 log Z(L, L) + log Z(L-2, L-2)] / 8
   along the squares, (b) mixed second differences [log Z(K+2, L+2) - log Z(K+2, L) - log Z(K, L+2)
   + log Z(K, L)] / 4 on the diagonal K = L, both with a geometric extrapolation; (a) also from the
   JavaScript counts alone.
"""
import json, os
from paths import P, G, ROOT
from mpmath import mp, mpf, log, exp

mp.dps = 50
eb = json.load(open(P('errbar.json')))['recommended']
S, DS = mpf(eb['s']), mpf(eb['err'])
sf = json.load(open(P('surface.json')))
SIG, DSIG = mpf(sf['sigma']), mpf(sf['sigma_err'])

Z = {}                                                     # (K, m) -> exact count, K rows, m columns
for fn in G('zex_king_free_m*_K*.json'):
    d = json.load(open(P(fn)))
    for k, z in enumerate(d['Z']):
        z = int(z)
        if z:
            Z[k, d['m']] = Z[k, d['m']] = z
for (k, m), z in list(Z.items()):
    Z.setdefault((m, k), z)
    assert Z[m, k] == z, (k, m)                            # the counts are symmetric
LZ = {km: log(mpf(z)) for km, z in Z.items()}


def sd(x):
    """x with an explicit sign, two digits."""
    t = mp.nstr(x, 2)
    return t if t.startswith('-') else '+' + t


def rho(K, L):
    return LZ[K, L] - S * K * L + 2 * SIG * (K + L)


def aitken(seq):
    """{L: value} on a regular grid -> {L: geometric extrapolation from L - 4, L - 2, L} and the ratios."""
    ks = sorted(seq)
    out, rat = {}, {}
    for i in range(2, len(ks)):
        a, b, c = seq[ks[i - 2]], seq[ks[i - 1]], seq[ks[i]]
        r = (b - a) / (c - b)
        rat[ks[i]] = r
        out[ks[i]] = c + (c - b) / (r - 1)
    return out, rat


print(f's = {mp.nstr(S, 17)} +- {mp.nstr(DS, 1)} (errbar.json), sigma = {mp.nstr(SIG, 16)} +- {mp.nstr(DSIG, 2)}'
      ' (surface.json)')
sq = {L: rho(L, L) for L in range(2, 40, 2) if (L, L) in LZ}
Lmax = max(sq)
print(f'\n== 1. squares: rho(L) = log Z(L, L) - s L^2 + 4 sigma L, exact counts for L <= {Lmax}')
kap, rat = aitken(sq)
for L in sorted(sq):
    if L >= 8:
        line = f'  L={L:2d}  rho = {mp.nstr(sq[L], 13)}'
        if L in kap:
            line += f'  ratio of differences {mp.nstr(rat[L], 5)}  Aitken {mp.nstr(kap[L], 13)}'
        print(line)
K0 = kap[Lmax]
back = abs(kap[Lmax] - kap[Lmax - 2])
# the ratio drifts; extrapolate it linearly in 1/L (as R1 in errbar.py) and sum the tail
r1, r2 = rat[Lmax - 2], rat[Lmax]
c = (r1 - r2) / (mpf(1) / (Lmax - 2) - mpf(1) / Lmax)
rinf = r2 - c / Lmax
tail, dd, L = mpf(0), sq[Lmax] - sq[Lmax - 2], Lmax
for _ in range(400):
    L += 2
    dd = dd / (rinf + c / L)
    tail += dd
K1 = sq[Lmax] + tail
drift = abs(K1 - K0)
# s and sigma enter rho with weights L^2 and 4L; their errors are correlated (d sigma ~ 13 d s), so
# add them linearly: an upper bound on their effect
sterr = Lmax ** 2 * DS + 4 * Lmax * DSIG
err = 2 * max(back, drift) + sterr
print(f'  kappa = {mp.nstr(K0, 12)} (Aitken at L = {Lmax}); backtest |kappa_{Lmax} - kappa_{Lmax - 2}| = {mp.nstr(back, 2)};'
      f' with the ratio drifting linearly in 1/L (r_inf = {mp.nstr(rinf, 4)}): {mp.nstr(K1, 12)}, difference {mp.nstr(drift, 2)};'
      f' from the errors of s and sigma: {mp.nstr(sterr, 2)}')
print(f'  RESULT: kappa = {mp.nstr(K0, 11)} +- {mp.nstr(err, 1)}  (twice the larger extrapolation difference, plus the'
      ' s and sigma term)')

print('\n  rectangles K x L, K, L >= 14, KL even: rho(K, L) - kappa')
rows = []
for K in range(14, 25):
    line = []
    for L in range(K, 25):
        if (K * L) % 2 == 0 and (K, L) in LZ:
            line.append(f'{K}x{L}: {mp.nstr(rho(K, L) - K0, 2)}')
            rows.append((K, L, rho(K, L) - K0))
    if line:
        print('   ' + '  '.join(line))
worst = max(abs(x) for K, L, x in rows if min(K, L) >= 20)
print(f'  largest |rho(K, L) - kappa| with min(K, L) >= 20: {mp.nstr(worst, 2)}')

print('\n== 2. A239273: a(n) = Z(2n, 2n) ~ C d^(n^2) / f^n')
C, dconst, fconst = exp(K0), exp(4 * S), exp(8 * SIG)
print(f'  C = e^kappa = {mp.nstr(C, 10)}, d = e^(4s) = {mp.nstr(dconst, 15)}, f = e^(8 sigma) = {mp.nstr(fconst, 13)}')
for n in range(4, Lmax // 2 + 1):
    approx = C * dconst ** (n * n) / fconst ** n
    print(f'  n={n:2d}: approx / a(n) - 1 = {mp.nstr(approx / Z[2 * n, 2 * n] - 1, 3)}')

print('\n== 3. s from exact counts alone (no eigenvalues)')
s2 = {L: (LZ[L + 2, L + 2] - 2 * LZ[L, L] + LZ[L - 2, L - 2]) / 8 for L in range(4, 40, 2)
      if (L + 2, L + 2) in LZ and (L - 2, L - 2) in LZ}
a2, _ = aitken(s2)
print('  (a) squares, [log Z(L+2) - 2 log Z(L) + log Z(L-2)] / 8: ' +
      ', '.join(f'L={L}: s{sd(s2[L] - S)}' for L in sorted(s2) if L >= 12))
La = max(a2)
print(f'      geometric extrapolation at L = {La}: s{sd(a2[La] - S)}'
      f' (at L = {La - 2}: s{sd(a2[La - 2] - S)})')
mx = {L: (LZ[L + 2, L + 2] - LZ[L + 2, L] - LZ[L, L + 2] + LZ[L, L]) / 4 for L in range(2, 40, 2)
      if (L + 2, L + 2) in LZ}
am, _ = aitken(mx)
print('  (b) mixed second differences on the diagonal, / 4: ' +
      ', '.join(f'L={L}: s{sd(mx[L] - S)}' for L in sorted(mx) if L >= 12))
Lm = max(am)
print(f'      geometric extrapolation at L = {Lm}: s{sd(am[Lm] - S)}'
      f' (at L = {Lm - 2}: s{sd(am[Lm - 2] - S)})')
js = json.load(open(os.path.join(ROOT, '..', '..', 'data', 'domiculeTilingTests.json')))
J = {t['rowCount']: int(t['expectedResult']) for t in js['testCases'] if t['rowCount'] == t.get('colCount', t['rowCount'])}
J[20] = int('974206002957112698855240779762528002509423239819130603938953917534367085458193363176670427')
assert all(J[L] == Z[L, L] for L in J if (L, L) in Z and L > 0), 'JS counts differ from the CRT counts'
LJ = {L: log(mpf(z)) for L, z in J.items() if z > 0 and L > 0}
sj = {L: (LJ[L + 2] - 2 * LJ[L] + LJ[L - 2]) / 8 for L in range(4, 40, 2) if L + 2 in LJ and L - 2 in LJ}
aj, _ = aitken(sj)
Lj = max(aj)
print(f'  (a) from the JavaScript counts alone (L <= {max(LJ)}): geometric extrapolation at L = {Lj}:'
      f' s{sd(aj[Lj] - S)}; these counts agree with the CRT counts where both exist')

json.dump(dict(kappa=str(K0), kappa_err=str(err), backtest=str(back), drift=str(drift), C=str(C), d=str(dconst),
               f=str(fconst), Lmax=Lmax, rho_squares={L: str(v) for L, v in sq.items()},
               s_squares_extrapolated=str(a2[La]), s_mixed_extrapolated=str(am[Lm]), s_js_extrapolated=str(aj[Lj])),
          open(P('corner.json'), 'w'), indent=1)
