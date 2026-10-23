"""Error budget of the cylinder estimate of s: extrapolation models, predictive backtests,
a hidden slow mode, the gap parameter and float64 rounding.

usage: python3 src/errbar.py > out/out_errbar.txt      (writes errbar.json)

Inputs: sector values of log(lambda) from tm2.py (sec_king_cyl_*.json, w <= 19) and cylw.py
(eig_king_cyl_w*_p*.json, w = 20..25), all float64, and the x87 extended-precision reruns
lean_king_cyl_w*_p*_longdouble.json (lean.py) of every cylinder w = 4..25 that the models use.
The budget is computed on the extended-precision values; float64 enters only as the rounding term.

Odd widths: f_w = log(lambda_w)/w increases to s; d_w = f_w - f_(w-2), r_w = d_(w-2)/d_w.
Even widths: the sector midpoints m_w, a second sequence with its own corrections (the leading
term of the parity splitting cancels in the midpoint). Models for the tail s - f_W, each fitted on
the last few widths:
  L1   d_w = C e^(-m w) w^(-3/2) (1 + c1/w), m = 1.082727 the in-sector gap (Luscher form of a
       massive correction), through d_(W-2), d_W        <- main model
  L2   the same with (1 + c1/w + c2/w^2), through d_(W-4), d_(W-2), d_W
  G    geometric, r constant = r_W
  PE   d_w = A exp(-w/xi) w^b, exact through d_(W-4), d_(W-2), d_W
  PE6  the same, least squares over the last 6 differences
  R1   r_w = r_inf + c/w through r_(W-2), r_W
  R2   r_w = r_inf + c/w + e/w^2 through r_(W-4), r_(W-2), r_W
  2E   d_w = A rho1^w + B rho2^w through the last 4 differences (Prony)
  WY, WY-  Wynn epsilon table on f_w (last full diagonal entry, and the one before)
Each model is rerun with the data cut at W - 2, W - 4, W - 6 (backtest).

BUDGET (all terms added):
 1. model form: a model is kept if its backtest change |s(W) - s(W-2)| is below 1% of the last
    correction |d_W| on its sequence; the term is the half-spread of the kept estimates of both
    sequences plus the largest predicted remaining error |s(W) - s(W-2)| |d_W / d_(W-2)|;
 2. hidden slow mode: d_w - B x^((w-25)/2), x = exp(-2/1.2351) (the decay of the parity splitting,
    the slowest rate in the data), fitted together with L1's form (C, c1, B free) by relative least
    squares on w = 13..25; every B within 3 standard errors of the fitted value is allowed, the range
    widened to include B = 0, and the term is the largest shift of s over the allowed B (s is linear
    in B, so the endpoints suffice). The scan over forced B is printed for context;
 3. gap: the change of L1 when m runs over the gaps measured at w = 20..25 (estimate.py);
 4. rounding: the largest change of a kept model between float64 and longdouble inputs.
"""
import json, os
from paths import P, G, ROOT
import numpy as np
from mpmath import mp, mpf, exp, log, findroot, nsum, inf, sqrt

mp.dps = 40

def load():
    """Cylinder sector log(lambda) (float64) and longdouble reruns, keyed by (w, parity)."""
    lam = {}
    for fn in ('sec_king_cyl_3_13.json', 'sec_king_cyl_14_19.json'):
        for w, d in json.load(open(P(fn))).items():
            for p, x in d.items():
                lam[int(w), int(p)] = mpf(x)
    for fn in G('eig_king_cyl_w*_p*.json'):
        d = json.load(open(P(fn)))
        lam[d['w'], d['parity']] = mpf(d['log_lambda'])
    for w in sorted({w for w, _ in lam}):
        if w % 2:
            x = lam.get((w, 1), lam.get((w, 0)))
            lam[w, 0] = lam[w, 1] = x
    ld = {}
    for fn in G('lean_king_cyl_w*_p*_longdouble.json'):
        d = json.load(open(P(fn)))
        if d['converged']:
            ld[d['w'], d['parity']] = mpf(d['log_lambda'])
    return lam, ld


def diffs(f, W):
    ws = [w for w in sorted(f) if w <= W]
    return ws, {w: f[w] - f[ws[i - 1]] for i, w in enumerate(ws) if i}


def tail_from_r(dW, W, rfun, n=400):
    """sum_{j>=1} d_(W+2j) with d_(w+2) = d_w / r(w+2)."""
    t, d = mpf(0), dW
    for j in range(1, n):
        d = d / rfun(W + 2 * j)
        t += d
        if abs(d) < abs(t) * mpf(10) ** -30:
            break
    return t


def models(f, W):
    ws, d = diffs(f, W)
    ws = [w for w in ws if w in d]
    w1, w2, w3 = ws[-3:]
    fW = f[W]
    r = {w: d[ws[i - 1]] / d[w] for i, w in enumerate(ws) if i}
    out = {}
    out['G'] = fW + d[W] / (r[W] - 1)
    # PE: log d = a - w/xi + b log w (signs of d are constant)
    sg = 1 if d[W] > 0 else -1
    M = mp.matrix([[1, -w, log(w)] for w in (w1, w2, w3)])
    y = mp.matrix([log(sg * d[w]) for w in (w1, w2, w3)])
    a, ixi, b = mp.lu_solve(M, y)
    out['PE'] = fW + sg * nsum(lambda j: exp(a - (W + 2 * j) * ixi + b * log(W + 2 * j)), [1, inf])
    six = ws[-6:]
    A = np.array([[1, -w, np.log(w)] for w in six], float)
    yy = np.array([float(log(sg * d[w])) for w in six])
    c6 = np.linalg.lstsq(A, yy, rcond=None)[0]
    out['PE6'] = fW + sg * nsum(lambda j: exp(c6[0] - (W + 2 * j) * c6[1] + c6[2] * log(W + 2 * j)), [1, inf])
    out['_PE6_rms'] = float(np.sqrt(np.mean((A @ c6 - yy) ** 2)))
    out['_PE_xi_b'] = (float(1 / ixi), float(b))
    # R1, R2
    c = (r[w2] - r[W]) / (1 / mpf(w2) - 1 / mpf(W))
    rinf = r[W] - c / W
    out['R1'] = fW + tail_from_r(d[W], W, lambda w: rinf + c / w)
    out['_R1_rinf'] = float(rinf)
    if w1 in r:
        M = mp.matrix([[1, 1 / mpf(w), 1 / mpf(w) ** 2] for w in (w1, w2, W)])
        r0, r1, r2 = mp.lu_solve(M, mp.matrix([r[w] for w in (w1, w2, W)]))
        out['R2'] = fW + tail_from_r(d[W], W, lambda w: r0 + r1 / w + r2 / w ** 2)
        out['_R2_rinf'] = float(r0)
    # 2E: d_(w+4) = al d_(w+2) + be d_w through the last 4 differences
    w0 = ws[-4]
    M = mp.matrix([[d[w1], d[w0]], [d[w2], d[w1]]])
    al, be = mp.lu_solve(M, mp.matrix([d[w2], d[W]]))
    disc = al ** 2 + 4 * be
    if disc > 0:
        x1, x2 = (al + sqrt(disc)) / 2, (al - sqrt(disc)) / 2      # roots of x^2 = al x + be (ratios per 2 widths)
        if abs(x1) < 1 and abs(x2) < 1:
            # d_(W+2j) = P x1^j + Q x2^j, fitted to d_(W-2), d_W
            P, Q = mp.lu_solve(mp.matrix([[1 / x1, 1 / x2], [1, 1]]), mp.matrix([d[w2], d[W]]))
            out['2E'] = fW + P * x1 / (1 - x1) + Q * x2 / (1 - x2)
            out['_2E_ratios'] = (float(1 / x1), float(1 / x2))
    # Wynn epsilon on the sequence f_w, w <= W
    S = [f[w] for w in sorted(f) if w <= W]
    eps = [[mpf(0)] * (len(S) + 1), list(S)]
    for k in range(1, len(S)):
        prev, cur = eps[-2], eps[-1]
        nxt = []
        for i in range(len(cur) - 1):
            dd = cur[i + 1] - cur[i]
            nxt.append(prev[i + 1] + (1 / dd if dd != 0 else mpf(10) ** 30))
        eps.append(nxt)
    even_cols = [col for k, col in enumerate(eps[1:]) if k % 2 == 0 and col]
    out['WY'] = even_cols[-1][-1] if len(even_cols[-1]) else even_cols[-2][-1]
    out['WY-'] = even_cols[-2][-1]
    return out


KEYS = ['G', 'PE', 'PE6', 'R1', 'R2', '2E', 'WY', 'WY-']


M_GAP = mpf('1.082727')                      # in-sector gap per row, ARPACK at w = 20 (crosscheck.py)
X_HIDDEN = exp(-2 / mpf('1.2351'))            # decay per two widths of the parity splitting (estimate.py)
ALL = ['L1', 'L2'] + KEYS


def luscher(f, W, m=M_GAP, order=1):
    """L1 (order 1) / L2 (order 2): d_w = C e^(-m w) w^(-3/2) (1 + c1/w [+ c2/w^2]) through the last
    order + 1 differences; returns the estimate of s."""
    ws, d = diffs(f, W)
    ws = [w for w in ws if w in d][-(order + 1):]
    sg = 1 if d[W] > 0 else -1
    y = [sg * d[w] * exp(m * w) * mpf(w) ** mpf(1.5) for w in ws]   # = C (1 + c1/w + ...)
    M = mp.matrix([[1 / mpf(w) ** i for i in range(order + 1)] for w in ws])
    c = mp.lu_solve(M, mp.matrix(y))
    term = lambda w: exp(-m * w) * mpf(w) ** mpf(-1.5) * sum(c[i] / mpf(w) ** i for i in range(order + 1))
    return f[W] + sg * nsum(lambda j: term(W + 2 * j), [1, inf])


def gaps_from_histories(floor=mpf('1e-10')):
    """Gap per row from cylw.py's histories of the estimate of log(lambda) (one T^2 step per entry): the
    changes shrink by exp(-2 gap) per step; median ratio over the changes above `floor` (below it,
    float64 noise takes over)."""
    out = {}
    for fn in G('eig_king_cyl_w*_p*.json'):
        d = json.load(open(P(fn)))
        h = [mpf(x) for x in d['history']]
        dd = [h[i] - h[i - 1] for i in range(1, len(h))]
        rr = [dd[i + 1] / dd[i] for i in range(len(dd) - 1) if abs(dd[i + 1]) > floor and dd[i] != 0]
        if rr:
            rr.sort()
            out[d['w'], d['parity']] = -log(rr[len(rr) // 2]) / 2
    return out


def allmodels(f, W):
    out = models(f, W)
    out['L1'] = luscher(f, W, order=1)
    out['L2'] = luscher(f, W, order=2)
    return out


def table(name, f, Ws):
    print(f'\n== {name}: estimates of s by model and by last width used (W)')
    print('   W   ' + ''.join(f'{k:>21}' for k in ALL))
    res = {}
    for W in Ws:
        m = allmodels(f, W)
        res[W] = m
        print(f'  {W:2d}   ' + ''.join(f'{mp.nstr(m[k], 17) if k in m else "-":>21}' for k in ALL))
    W = Ws[-1]
    m = res[W]
    print(f'  extras at W={W}: PE xi, b = {m["_PE_xi_b"][0]:.4f}, {m["_PE_xi_b"][1]:.3f}; PE6 rms(log d) = {m["_PE6_rms"]:.1e};'
          f' R1 r_inf = {m["_R1_rinf"]:.3f}; R2 r_inf = {m.get("_R2_rinf", float("nan")):.3f};'
          f' 2E ratios = {m.get("_2E_ratios", "-")}')
    return res


def hidden_mode(f, B_fracs, wlo=13, m=M_GAP, x=X_HIDDEN):
    """Stress test: d_w - B x^((w-W)/2) fitted with L1's form (C, c1; m fixed) by relative least squares
    over w = wlo..W, for forced amplitudes B = frac * d_W. Returns {frac: (s, rel rms)}."""
    ws, d = diffs(f, max(f))
    W = max(f)
    fitw = [w for w in ws if w in d and w >= wlo]
    out = {}
    for frac in B_fracs:
        B = frac * d[W]
        rows, y, wt = [], [], []
        for w in fitw:
            g = exp(-m * w) * mpf(w) ** mpf(-1.5)
            rows.append([g, g / w])
            y.append(d[w] - B * x ** (mpf(w - W) / 2))
            wt.append(1 / d[w])
        A = mp.matrix([[r[0] * q, r[1] * q] for r, q in zip(rows, wt)])
        Y = mp.matrix([v * q for v, q in zip(y, wt)])
        C, D = mp.lu_solve(A.T * A, A.T * Y)
        rms = sqrt(sum(((C * r[0] + D * r[1] - v) * q) ** 2 for r, v, q in zip(rows, y, wt)) / len(fitw))
        tail = nsum(lambda j: exp(-m * (W + 2 * j)) * mpf(W + 2 * j) ** mpf(-1.5) * (C + D / (W + 2 * j)), [1, inf])
        out[frac] = (f[W] + tail + B * x / (1 - x), rms)
    return out


def hidden_free(f, wlo=13, m=M_GAP, x=X_HIDDEN):
    """B as a free parameter: d_w = C e^(-m w) w^(-3/2) (1 + c1/w) + B x^((w-W)/2), all three fitted by
    relative least squares over w = wlo..W. Returns (B / d_W, its standard error / |d_W|, n, rel rms),
    the standard error from the residual variance with n - 3 degrees of freedom."""
    ws, d = diffs(f, max(f))
    W = max(f)
    fitw = [w for w in ws if w in d and w >= wlo]
    rows = []
    for w in fitw:
        g = exp(-m * w) * mpf(w) ** mpf(-1.5)
        rows.append([g / d[w], g / w / d[w], x ** (mpf(w - W) / 2) / d[w]])
    A = mp.matrix(rows)
    Y = mp.matrix([1] * len(fitw))
    N = A.T * A
    c = mp.lu_solve(N, A.T * Y)
    res = A * c - Y
    rss = sum(r ** 2 for r in res)
    n = len(fitw)
    cov = mp.inverse(N) * (rss / (n - 3))
    return c[2] / d[W], sqrt(cov[2, 2]) / abs(d[W]), n, sqrt(rss / n)


def out_of_sample(f, W, m=M_GAP, x=X_HIDDEN):
    """Width W + 2 from the independent code in xcheck/ (long double), if present: its difference
    d_(W+2) against the L1 prediction through d_(W-2), d_W, and the response of that prediction
    error to a hidden mode B x^((w-W)/2). Returns None without the file."""
    fn = os.path.join(ROOT, 'xcheck', 'out', 'eig_summary.json')
    if not os.path.exists(fn):
        return None
    xe = json.load(open(fn))
    wn = W + 2
    fx = {w: mpf(xe[f'cyl_w{w}_0_ld']['loglam']) / w for w in (W, wn)}
    meas = fx[wn] - fx[W]
    _, d = diffs(f, W)
    g = lambda w: exp(-m * w) * mpf(w) ** mpf(-1.5)
    M = mp.matrix([[g(W - 2), g(W - 2) / (W - 2)], [g(W), g(W) / W]])

    def l1_at(y):
        C, D = mp.lu_solve(M, mp.matrix(y))
        return g(wn) * (C + D / wn)
    pred = l1_at([d[W - 2], d[W]])
    mode = lambda w: d[W] * x ** (mpf(w - W) / 2)
    resp = (mode(wn) - l1_at([mode(W - 2), mode(W)])) / meas
    rel = (meas - pred) / meas
    bmax = abs(rel / resp)
    return dict(measured=meas, predicted=pred, rel=rel, rel_per_B=resp, bmax=bmax,
                shift=bmax * abs(d[W]) * x / (1 - x))


def main():
    lam, ld = load()
    widths = sorted({w for w, _ in lam})
    seq = {}
    for name, src in (('f64', lam), ('ld', None)):
        def val(w, p):
            if src is not None:
                return src[w, p]
            if (w, p) in ld:
                return ld[w, p]
            if w % 2 and (w, 1 - p) in ld:
                return ld[w, 1 - p]
            return None
        odd = {w: val(w, 1) / w for w in widths if w % 2 and w >= 5 and val(w, 1) is not None}
        mid = {w: (val(w, 0) + val(w, 1)) / (2 * w) for w in widths if w % 2 == 0 and w >= 4
               and val(w, 0) is not None and val(w, 1) is not None}
        seq[name] = (odd, mid)
    odd, mid = seq['ld']
    missing = [w for w in widths if w >= 5 and ((w % 2 and w not in odd) or (w % 2 == 0 and w not in mid))]
    print(f'extended-precision inputs: odd w = {min(odd)}..{max(odd)}, even w = {min(mid)}..{max(mid)}'
          f' (both sectors); widths without them: {missing or "none"}')
    Wo, We = max(odd), max(mid)
    res = {'odd': table('odd widths f_w (extended precision)', odd, [Wo - 6, Wo - 4, Wo - 2, Wo]),
           'mid': table('even-width sector midpoints m_w (extended precision)', mid, [We - 6, We - 4, We - 2, We])}
    res64 = {'odd': {Wo: allmodels(seq['f64'][0], Wo)}, 'mid': {We: allmodels(seq['f64'][1], We)}}

    # ------------------------------------------------------------- predictive backtest
    print('\n== predictive backtest: |s(W) - s(W_last)| / |d_W| per model (the share of the last correction'
          ' that the model gets wrong)')
    dl = {}
    for nm, f, Wl in (('odd', odd, Wo), ('mid', mid, We)):
        _, d = diffs(f, Wl)
        dl[nm] = d
        print(f'  {nm}: |d_W| = ' + ', '.join(f'W={W} {mp.nstr(abs(d[W]), 3)}' for W in sorted(res[nm])))
        for k in ALL:
            if all(k in res[nm][W] for W in res[nm]):
                print(f'    {k:4s}: ' + ', '.join(f'W={W} {mp.nstr(abs(res[nm][W][k] - res[nm][Wl][k]) / abs(d[W]), 2)}'
                                              for W in sorted(res[nm]) if W < Wl))
    keep, pred = [], []
    for nm, Wl in (('odd', Wo), ('mid', We)):
        d = dl[nm]
        for k in ALL:
            r = res[nm]
            if k in r[Wl] and k in r[Wl - 2]:
                ch = abs(r[Wl][k] - r[Wl - 2][k])
                if ch < mpf('0.01') * abs(d[Wl]):
                    keep.append((nm, k, r[Wl][k]))
                    pred.append(ch * abs(d[Wl] / d[Wl - 2]))
    kv = [v for *_, v in keep]
    lo, hi = min(kv), max(kv)
    half = (hi - lo) / 2
    pmax = max(pred)
    print(f'  kept (|s(W) - s(W-2)| < 1% of |d_W|): {", ".join(f"{n} {k}" for n, k, _ in keep)}')
    print(f'  kept range [{mp.nstr(lo, 18)}, {mp.nstr(hi, 18)}], half-spread {mp.nstr(half, 2)};'
          f' largest predicted remaining error {mp.nstr(pmax, 2)}')
    dropped = [(n, k) for n in ('odd', 'mid') for k in ALL if (n, k) not in [(a, b) for a, b, _ in keep]]
    print(f'  dropped: {", ".join(f"{n} {k}" for n, k in dropped)}')

    # ------------------------------------------------------------- hidden slow mode
    fr = [-0.1, -0.03, -0.01, -0.005, -0.003, -0.002, -0.001, 0, 0.001, 0.002, 0.003, 0.005, 0.01, 0.03, 0.1]
    hm = hidden_mode(odd, fr)
    best = min(hm.values(), key=lambda t: t[1])[1]
    s0 = hm[0][0]
    print(f'\n== hidden slow mode in the odd widths: B x^((w-25)/2), x = {mp.nstr(X_HIDDEN, 4)} per two widths,'
          f' fitted with the L1 form on w = 13..{Wo}')
    for k in fr:
        sv, rms = hm[k]
        print(f'  B/d_{Wo} = {k:+.3f}: relative rms {mp.nstr(rms, 3)} ({mp.nstr(rms / best, 3)} x best),'
              f' s - s(B=0) = {mp.nstr(sv - s0, 3)}')
    bh, sb, nfit, rmsf = hidden_free(odd)
    blo, bhi = min(mpf(0), bh - 3 * sb), max(mpf(0), bh + 3 * sb)
    ends = hidden_mode(odd, [blo, bhi])
    hid = max(abs(sv - s0) for sv, _ in ends.values())
    print(f'  B free (C, c1, B fitted on {nfit} widths, rel rms {mp.nstr(rmsf, 3)}): B/d_{Wo} = {mp.nstr(bh, 3)}'
          f' +- {mp.nstr(sb, 2)} (standard error, {nfit - 3} degrees of freedom)')
    print(f'  allowed: B/d_{Wo} in [{mp.nstr(blo, 3)}, {mp.nstr(bhi, 3)}] (3 standard errors, widened to include B = 0);'
          f' largest shift {mp.nstr(hid, 2)}')
    scan = []
    for wlo in (11, 13, 15, 17):
        b, e, n, _ = hidden_free(odd, wlo=wlo)
        scan.append(f'w >= {wlo}: {mp.nstr(b, 3)} +- {mp.nstr(e, 2)}')
    print(f'  fitted B/d_{Wo} by the lower end of the fit: {"; ".join(scan)}')
    oos = out_of_sample(odd, Wo)
    if oos:
        print(f'  out of sample (w = {Wo + 2}, long double, xcheck/out/eig_summary.json; not in the budget):'
              f' d_{Wo + 2} = {mp.nstr(oos["measured"], 6)} against the L1 prediction {mp.nstr(oos["predicted"], 6)}'
              f' from W = {Wo}, relative {mp.nstr(oos["rel"], 2)}')
        print(f'  a mode with the fitted B = {mp.nstr(bh, 3)} d_{Wo} would move it by {mp.nstr(oos["rel_per_B"] * bh, 2)};'
              f' read as a mode, the deviation gives |B| <= {mp.nstr(oos["bmax"], 2)} d_{Wo}, a shift of s'
              f' <= {mp.nstr(oos["shift"], 2)}')

    # ------------------------------------------------------------- gap parameter
    gaps = gaps_from_histories()
    print('\n== in-sector gap per row from the power-iteration histories (eig_*.json):'
          ' successive changes of the estimate shrink by exp(-2 gap)')
    print('  ' + ', '.join(f'w={w} p={p}: {mp.nstr(g, 7)}' for (w, p), g in sorted(gaps.items())))
    gvals = list(gaps.values()) + [M_GAP]
    gl, gh = min(gvals), max(gvals)
    sg = [luscher(odd, Wo, m=g) for g in (gl, gh)]
    gapterm = max(abs(x - res['odd'][Wo]['L1']) for x in sg)
    print(f'\n== gap parameter: m in [{mp.nstr(gl, 6)}, {mp.nstr(gh, 6)}] (power-iteration gaps at w = 20..25, estimate.py,'
          f' and ARPACK {mp.nstr(M_GAP, 7)}): L1 moves by {mp.nstr(gapterm, 2)}')

    # ------------------------------------------------------------- rounding
    print('\n== float64 rounding: kept models on float64 inputs minus the same models on extended precision')
    rnd = []
    for nm, k, v in keep:
        Wl = Wo if nm == 'odd' else We
        if k in res64[nm][Wl]:
            dv = res64[nm][Wl][k] - v
            rnd.append(abs(dv))
            print(f'  {nm} {k:4s}: {mp.nstr(dv, 3)}')
    rterm = max(rnd)
    fl = {(w, p): lam[w, p] - ld[w, p] for (w, p) in ld if (w, p) in lam}
    print(f'  largest change {mp.nstr(rterm, 2)}; float64 - longdouble in log lambda per site: max'
          f' {mp.nstr(max(abs(x) / w for (w, p), x in fl.items()), 3)} over {len(fl)} cylinders')

    centre = res['odd'][Wo]['L1']
    total = half + pmax + hid + gapterm + rterm
    quoted = mpf('6e-16')
    print(f'\n== BUDGET: model form {mp.nstr(half + pmax, 2)} (half-spread {mp.nstr(half, 2)} + predicted {mp.nstr(pmax, 2)}),'
          f' hidden mode {mp.nstr(hid, 2)}, gap {mp.nstr(gapterm, 2)}, rounding {mp.nstr(rterm, 2)}: total {mp.nstr(total, 2)}')
    verdict = 'supports' if total <= quoted else 'does NOT support'
    print(f'  main model L1 on the odd widths, W = {Wo}: s = {mp.nstr(centre, 18)}; the budget {verdict} +- 6e-16')
    print(f'== RECOMMENDATION: s = {mp.nstr(centre, 16)} +- {mp.nstr(quoted if total <= quoted else total, 1)}'
          f'  (budget {mp.nstr(total, 2)}; the earlier geometric estimate of estimate.py is superseded)')
    json.dump(dict(recommended=dict(s=str(centre), err=str(quoted if total <= quoted else total), budget=str(total),
                                    model_form=str(half + pmax), half_spread=str(half), predicted=str(pmax),
                                    hidden_mode=str(hid), gap=str(gapterm), rounding=str(rterm),
                                    kept=[f'{n} {k}' for n, k, _ in keep]),
                   odd={W: {k: str(v) for k, v in m.items()} for W, m in res['odd'].items()},
                   mid={W: {k: str(v) for k, v in m.items()} for W, m in res['mid'].items()},
                   odd_float64={k: str(v) for k, v in res64['odd'][Wo].items()},
                   mid_float64={k: str(v) for k, v in res64['mid'][We].items()},
                   hidden={str(k): [str(a), str(b)] for k, (a, b) in hm.items()},
                   hidden_free=dict(B_over_dW=str(bh), stderr=str(sb), widths=nfit, rel_rms=str(rmsf),
                                    allowed=[str(blo), str(bhi)], shift=str(hid)),
                   out_of_sample={k: str(v) for k, v in oos.items()} if oos else None),
              open(P('errbar.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
