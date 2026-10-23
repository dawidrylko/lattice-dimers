"""Out-of-sample check of the hidden slow mode of errbar.py against the next odd width.

usage: python3 src/hidden_oos.py > out/out_hidden_oos.txt

Inputs: the odd cylinders of errbar.py (extended precision, w <= 25) and w = 25, 27 in long double from
the independent code in xcheck/ (xcheck/out/eig_summary.json, keys cyl_w<w>_0_ld). Not part of the
error budget.

1. d_27 = f_27 - f_25 (both from xcheck) against the L1 prediction through d_23, d_25, the main model.
2. A hidden mode B x^((w-25)/2), x = exp(-2/1.2351), added to the data moves that prediction error by
   B times a fixed response; reading the whole observed deviation as a mode bounds |B|.
3. The error of the main estimate caused by such a mode: its own tail B x / (1 - x) minus the part of
   it that L1, calibrated on d_23 and d_25, already extrapolates.
"""
import json
from paths import ROOT
from errbar import load, diffs, M_GAP, X_HIDDEN
from mpmath import mp, mpf, exp, nsum, inf
import os

mp.dps = 40
lam, ld = load()
odd = {}
for (w, p), v in ld.items():
    if w % 2 and w >= 5:
        odd[w] = v / w
W, WN = 25, 27
xe = json.load(open(os.path.join(ROOT, 'xcheck', 'out', 'eig_summary.json')))
fx = {w: mpf(xe[f'cyl_w{w}_0_ld']['loglam']) / w for w in (W, WN)}
m, x = M_GAP, X_HIDDEN
g = lambda w: exp(-m * w) * mpf(w) ** mpf(-1.5)
M = mp.matrix([[g(W - 2), g(W - 2) / (W - 2)], [g(W), g(W) / W]])


def l1(y):
    """C, c1 of L1 through the differences y at W - 2, W."""
    return mp.lu_solve(M, mp.matrix(y))


def l1_at(c, w):
    return g(w) * (c[0] + c[1] / w)


def l1_tail(c):
    return nsum(lambda j: l1_at(c, W + 2 * j), [1, inf])


_, d = diffs(odd, W)
meas = fx[WN] - fx[W]
pred = l1_at(l1([d[W - 2], d[W]]), WN)
rel = (meas - pred) / meas
print(f'== 1. d_{WN} from xcheck (long double) against the L1 prediction from W = {W}')
print(f'  f_{W}: here {mp.nstr(odd[W], 20)}, xcheck {mp.nstr(fx[W], 20)}, difference {mp.nstr(odd[W] - fx[W], 2)}')
print(f'  d_{WN} measured {mp.nstr(meas, 8)}, predicted {mp.nstr(pred, 8)}, relative deviation {mp.nstr(rel, 3)}')

unit = lambda w: d[W] * x ** (mpf(w - W) / 2)
cu = l1([unit(W - 2), unit(W)])
resp = (unit(WN) - l1_at(cu, WN)) / meas
err_per_B = d[W] * x / (1 - x) - l1_tail(cu)
bmax = abs(rel / resp)
print(f'\n== 2. response to a hidden mode B x^((w-{W})/2), x = {mp.nstr(x, 4)}, B in units of d_{W}')
print(f'  relative change of the prediction error of d_{WN}: {mp.nstr(resp, 4)} per unit B')
for b in (mpf('0.00195'), mpf('0.0034')):
    print(f'  B = {mp.nstr(b, 3)} d_{W}: {mp.nstr(resp * b, 3)}, {mp.nstr(abs(resp * b / rel), 3)} x the observed deviation')
print(f'  the whole observed deviation read as a mode: |B| <= {mp.nstr(bmax, 3)} d_{W}')

print(f'\n== 3. error of the main estimate (L1, W = {W}) caused by the mode')
print(f'  mode tail B x/(1-x) minus the part L1 extrapolates: {mp.nstr(err_per_B, 4)} per unit B (B x/(1-x) alone'
      f' {mp.nstr(d[W] * x / (1 - x), 4)})')
print(f'  RESULT: |B| <= {mp.nstr(bmax, 2)} d_{W}, shift of the main estimate <= {mp.nstr(abs(err_per_B) * bmax, 2)};'
      f' a mode at the upper end 0.0034 d_{W} of errbar.py would shift it by {mp.nstr(abs(err_per_B) * mpf("0.0034"), 2)}')
