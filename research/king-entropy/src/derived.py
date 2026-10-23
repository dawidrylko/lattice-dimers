"""Numbers in king-entropy.tex that are simple functions of committed outputs.

usage (from research/king-entropy/): python3 src/derived.py > out/out_derived.txt

Reads only committed files (surface.json, bounds.json, z2.json, eig_*.json); computes nothing
new about the transfer matrices.
"""
import json
from mpmath import mp, mpf, exp, log, catalan, pi, factorial

mp.dps = 40
surf = json.load(open('data/surface.json'))
bnd = json.load(open('data/bounds.json'))
s = mpf('0.5655119110413253')            # out_errbar.txt, RECOMMENDATION
print(f's = {mp.nstr(s, 16)}  (out_errbar.txt)')
print(f'2s (per dimer) = {mp.nstr(2 * s, 16)}')
print(f'exp(s) = {mp.nstr(exp(s), 16)},  exp(2s) = {mp.nstr(exp(2 * s), 16)}')
ds = mpf('6e-16')                        # its error bar
print(f's - ds, s + ds = {mp.nstr(s - ds, 16)}, {mp.nstr(s + ds, 16)} '
      f'(digits shared by both ends are the ones quoted in paper/oeis-draft.txt)')
print(f'exp(s - ds), exp(s + ds) = {mp.nstr(exp(s - ds), 17)}, {mp.nstr(exp(s + ds), 17)}')

# second differences of a_k = log lambda_k (free strips); the s k part cancels
f = {int(k): mpf(v) for k, v in surf['f'].items()}
print('\n(L-infinity): second differences a(2q+2) - 2 a(2q) + a(2q-2) of a_k = log lambda_k, free strips')
for q2 in range(4, 26, 2):
    if q2 - 2 in f and q2 + 2 in f:
        d2 = f[q2 + 2] - 2 * f[q2] + f[q2 - 2]
        print(f'  2q={q2:2d}: {mp.nstr(d2, 3)}   sources {surf["sources"][str(q2 - 2)]} | {surf["sources"][str(q2 + 2)]}')
# Section 8: the sign pattern of g(k) = a_k - s k (a_0 = a_1 = 0) and its two modes
g = dict(f)
g[0], g[1] = mpf(0), -s
ks = sorted(g)
print('\n(L-infinity) for all q, with a_0 = 0: even second differences at 2q = 2..24 all positive:',
      all(g[k + 2] - 2 * g[k] + g[k - 2] > 0 for k in range(2, 25, 2) if k + 2 in g))
odd = {k: g[k + 2] - 2 * g[k] + g[k - 2] for k in range(3, 25, 2) if k + 2 in g}
print('odd second differences a(k+2) - 2 a(k) + a(k-2), k = 3..' + str(max(odd)) + ': all negative:',
      all(v < 0 for v in odd.values()), '; ' + ', '.join(f'k={k}: {mp.nstr(v, 3)}' for k, v in sorted(odd.items())))
inc = {k: g[k + 1] - g[k] for k in range(0, max(ks)) if k + 1 in g}
print('increments a(k+1) - a(k) - s alternate in sign for k = 0..' + str(max(inc)) + ':',
      all(inc[k] * inc[k + 1] < 0 for k in inc if k + 1 in inc),
      '; (O) at k = 23: a(24) - a(23) - s =', mp.nstr(inc[23], 4))
print('step-1 ratios (a(k+2) - a(k+1) - s) / (a(k+1) - a(k) - s), k = 16..24: '
      + ', '.join(f'{mp.nstr(inc[k + 1] / inc[k], 4)}' for k in range(16, 25) if k + 1 in inc))
sec = json.load(open('data/sec/sec_king_free_1_18.json'))
D = {int(k): mpf(v['0']) - mpf(v['1']) for k, v in sec.items() if int(k) % 2 == 0 and int(k) >= 4}
print('free-strip parity splitting D(k) = log lambda^(0)_k - log lambda^(1)_k (sec_king_free_1_18.json): '
      + ', '.join(f'k={k}: {mp.nstr(v, 4)}' for k, v in sorted(D.items())))
print('  ratios D(k) / D(k+2): ' + ', '.join(f'{mp.nstr(D[k] / D[k + 2], 5)}' for k in sorted(D) if k + 2 in D))

print('\nf(k) = log lambda_k - s k, free strips (surface.json)')
for k in range(18, 27):
    print(f'  k={k}: {mp.nstr(f[k], 16)}')

# certified per-site bounds and their gaps to s
lo, up = mpf(bnd['lower']['24']), mpf(bnd['upper']['24'])
print(f'\ncertified w=24: lower {mp.nstr(lo, 13)}, upper {mp.nstr(up, 13)}')
print(f'  s - lower = {mp.nstr(s - lo, 4)},  upper - s = {mp.nstr(up - s, 4)}')
for w in (12, 16, 20, 24):
    print(f'  w={w}: w*(s - lower_w) = {mp.nstr(w * (s - mpf(bnd["lower"][str(w)])), 4)}, '
          f'w*(upper_w - s) = {mp.nstr(w * (mpf(bnd["upper"][str(w)]) - s), 4)}')
print(f'Kahn-Lovasz log(8!)/16 = {mp.nstr(log(40320) / 16, 13)}')
rw = json.load(open('data/runweight_3state.json'))
print('run-weighted upper bounds (runweight_3state.json): ' + ', '.join(
    f'w={w}: w*(upper_w - s) = {mp.nstr(int(w) * (mpf(rw[w]["upper"]) - s), 4)}'
    for w in sorted(rw, key=int) if int(w) in (12, 16, 20, 22, 23, 24)))

# rounding budget of the certificates: 12 w u, u = 2^-53, at w = 24
print(f'12 w u at w=24: {mp.nstr(12 * 24 * mpf(2) ** -53, 4)}')

# four free edges of an L x L board: -4 sigma (compare the linear coefficient in out_fitsq.txt)
print(f'-4 sigma = {mp.nstr(-4 * mpf(surf["sigma"]), 10)}')

# triangular free strip m = 5: (L) violation from the exact counts
zt = [int(x) for x in json.load(open('data/zex/zex_tri_free_m5_K60.json'))['Z']]
print(f'tri free m=5: Z(6), Z(8), Z(10) = {zt[6]}, {zt[8]}, {zt[10]}; '
      f'Z(8)^2 - Z(6) Z(10) = {zt[8] ** 2 - zt[6] * zt[10]}')

# non-planarity: edges of the n x n king graph vs 3V - 6
for n in (3, 4, 5):
    E = 2 * n * (n - 1) + 2 * (n - 1) ** 2
    print(f'king {n}x{n}: V = {n * n}, E = {E}, 3V - 6 = {3 * n * n - 6}')

# context: Bethe (random-regular) value and Kahn-Lovasz bound for the three lattices of the code
# s_Bethe(d) = (1/2) log((d-1)^(d-1) / d^(d-2)) per vertex (Bollobas-McKay); KL(d) = log(d!) / (2d)
print('\nlattice context: degree d, s, Bethe value, ratio s / Bethe, Kahn-Lovasz bound log(d!)/(2d)')
tri = mpf('0.428594537464959')          # out_validate.txt, section 4 (Bloch average)
for name, d, sv in (('square', 4, catalan / pi), ('triangular', 6, tri), ('king', 8, s)):
    sb = ((d - 1) * log(d - 1) - (d - 2) * log(d)) / 2
    print(f'  {name:10s} d={d}: s = {mp.nstr(sv, 15)}, Bethe {mp.nstr(sb, 10)}, s/Bethe {mp.nstr(sv / sb, 5)},'
          f' KL {mp.nstr(log(factorial(d)) / (2 * d), 10)}')

# odd-width cylinders used for the estimate
print('\nking cylinders, log(lambda_w)/w (eig_*.json, float64; sector 1 for odd w)')
for w in range(20, 26):
    row = []
    for p in (0, 1):
        try:
            e = json.load(open(f'data/eig/eig_king_cyl_w{w}_p{p}.json'))
            row.append(f'p{p} {e["per_site"]:.16f}')
        except FileNotFoundError:
            pass
    print(f'  w={w}: ' + '  '.join(row))

# Section 3, further digits: widths and memory per decimal digit at the in-sector gap m
m = mpf('1.082727')                      # out_crosscheck.txt, in-sector gap at w = 20
wpd = log(10) / m
print(f'\nwidths per decimal digit log(10)/m = {mp.nstr(wpd, 4)}, memory factor 2^(log(10)/m) = {mp.nstr(mpf(2) ** wpd, 3)}')

# Section 3, independent recomputation: L1 on the odd widths up to W = 27 (replication/out/analyze_eig.txt)
l1_27 = mpf('0.5655119110413253187')
l1_25 = mpf('0.5655119110413253176')     # out_errbar.txt, L1 at W = 25, the centre
print(f'L1 at W = 27 minus L1 at W = 25 = {mp.nstr(l1_27 - l1_25, 2)}')

# Section 8: every odd cylinder lies below the estimate of s (sec_*.json for w <= 19, eig_*.json beyond)
sec = {**json.load(open('data/sec/sec_king_cyl_3_13.json')), **json.load(open('data/sec/sec_king_cyl_14_19.json'))}
odd_gap = {w: s - mpf(sec[str(w)]['0']) / w for w in range(3, 20, 2)}
odd_gap.update({w: s - mpf(json.load(open(f'data/eig/eig_king_cyl_w{w}_p1.json'))['per_site']) for w in range(21, 26, 2)})
print('odd cylinders, s - f_w: ' + ', '.join(f'w={w}: {mp.nstr(v, 3)}' for w, v in sorted(odd_gap.items()))
      + f'; all positive: {all(v > 0 for v in odd_gap.values())}')
even = {w: [mpf(sec[str(w)][p]) / w for p in ('0', '1')] for w in range(4, 20, 2)}
even.update({w: [mpf(json.load(open(f'data/eig/eig_king_cyl_w{w}_p{p}.json'))['per_site']) for p in (0, 1)]
             for w in range(20, 25, 2)})
print(f'even cylinders w = 4..24: sector 0 above s at every w: {all(v[0] > s for v in even.values())}, '
      f'sector 1 below s at every w: {all(v[1] < s for v in even.values())}')

# Section 3: float64 resolution of d_28 (replication/out/analyze_eig.txt: float64 vs long double <= 1.11e-17 per site)
print(f'resolution of d_28: 1.11e-17 / 1.93518e-15 = {mp.nstr(mpf("1.11e-17") / mpf("1.93518e-15"), 2)}; '
      f'digits of a 7.8e-20 agreement per site: {mp.nstr(-log(mpf("7.8e-20"), 10), 3)}')

# L-note, x = 3/2: last two-mode window 2q = 14..20 (log-convexity/out_modes.txt), |Q/P| at 2q = 14 and its decay
P, Q, r = mpf('5.95e-6'), mpf('7.98e-6'), mpf('0.942')
print(f'x = 3/2: |Q/P| = {mp.nstr(Q / P, 3)} at 2q = 14, '
      + ', '.join(f'{mp.nstr(Q / P * r ** j, 3)} at 2q = {14 + 2 * j}' for j in range(1, 7)))
print(f'x = 3/2: ratio below which d_q > 0 at 2q = 24, (P/Q)^(1/5) = {mp.nstr((P / Q) ** (mpf(1) / 5), 4)}; |Q/P| at 2q = 24 '
      + 'with the ratios of the earlier windows: '
      + ', '.join(f'{rr}: {mp.nstr(Q / P * mpf(rr) ** 5, 3)}' for rr in ('0.945', '0.946', '0.971')))
