"""Claims 2 and 6: sector eigenvalues of the cylinders, the estimate of s, the
parity splitting, the free strips, and the widths beyond the paper (w = 26..28).

Reads the raw runs out/eig/*.txt of eigrun.py (exact hex values) and prints all
tables with the paper's values beside them. Arithmetic in mpmath (40 digits).

Run: python3 analyze_eig.py > out/analyze_eig.txt   (also writes out/eig_summary.json)
"""
import glob
import json
import os
import re

import mpmath

from cert import parse_hex

mpmath.mp.dps = 40
HERE = os.path.dirname(os.path.abspath(__file__))
EIG = os.path.join(HERE, "out", "eig")
S_PAPER = mpmath.mpf("0.5655119110413253")
ERR_PAPER = mpmath.mpf("6e-16")

# Table 1 of the paper (odd cylinders): w: (f_w, d_w, r_w, s_w)
TABLE1 = {13: ("0.5655119032044848", "7.943e-8", "11.68", "0.5655119106414456"),
          15: ("0.5655119103137916", "7.109e-9", "11.172", "0.5655119110126792"),
          17: ("0.5655119109720268", "6.582e-10", "10.801", "0.5655119110391899"),
          19: ("0.5655119110345892", "6.256e-11", "10.521", "0.56551191104116"),
          21: ("0.5655119110406597", "6.071e-12", "10.306", "0.5655119110413121"),
          23: ("0.5655119110412587", "5.989e-13", "10.136", "0.5655119110413242"),
          25: ("0.5655119110413186", "5.994e-14", "9.992", "0.5655119110413253")}
BRACKETS = {18: ("0.5655119060934878", "0.5655119160322841"), 20: ("0.5655119102001319", "0.5655119118867463"),
            22: ("0.5655119108963251", "0.5655119111867462"), 24: ("0.5655119110160359", "0.5655119110666571")}
TABLE5 = {10: ("1.521094e-4", "1.15438"), 12: ("2.782917e-5", "1.17750"), 14: ("5.124578e-6", "1.18201"),
          16: ("9.544544e-7", "1.19001"), 18: ("1.788983e-7", "1.19451"), 20: ("3.373229e-8", "1.19878"),
          22: ("6.389264e-9", "1.20204"), 24: ("1.214909e-9", "1.20486")}
TABLE4 = {19: "-0.4840358718678495", 20: "-0.4840358714180326", 21: "-0.4840358715709653",
          22: "-0.4840358715195378", 23: "-0.4840358715369125", 24: "-0.4840358715310018",
          25: "-0.4840358715330068", 26: "-0.4840358715323304"}
TABLE2_L1 = {"odd": "0.56551191104132532", "mid": "0.56551191104132532"}


def load():
    runs = {}
    for fn in sorted(glob.glob(os.path.join(EIG, "*.txt"))):
        m = re.match(r"(\w+)_(free|cyl)_w(\d+)_(\w+)_(ld|d)\.txt", os.path.basename(fn))
        lat, bc, w, start, real = m.group(1), m.group(2), int(m.group(3)), m.group(4), m.group(5)
        its, wall, rss = [], None, None
        for line in open(fn):
            if line.startswith("# wall="):
                wall, rss = re.findall(r"[\d.]+", line)
            elif not line.startswith("#"):
                p = line.split()
                its.append((int(p[0]), parse_hex(p[1]), parse_hex(p[2]), parse_hex(p[3]), int(p[7]), int(p[8])))
        est = its[-1][1]
        ests = [x[1] for x in its]
        deltas = [ests[i] - ests[i - 1] for i in range(1, len(ests))]
        ratios = [deltas[i] / deltas[i - 1] for i in range(1, len(deltas))
                  if abs(deltas[i]) > est * mpmath.mpf("1e-16") and deltas[i - 1] != 0]
        ratios = ratios[2:] if len(ratios) > 4 else ratios
        rmed = sorted(ratios)[len(ratios) // 2] if ratios else None
        runs[(bc, w, start, real)] = dict(
            loglam=mpmath.log(est) / 2, cw=(mpmath.log(its[-1][2]) / 2, mpmath.log(its[-1][3]) / 2),
            iters=len(its), last_change=abs(mpmath.log(ests[-1]) - mpmath.log(ests[-2])) / 2 if len(ests) > 1 else None,
            ratio=rmed, viol=its[-1][5], wall=float(wall), rss=float(rss))
    return runs


def lam(runs, bc, w, start, real="ld"):
    r = runs.get((bc, w, str(start), real))
    return None if r is None else r["loglam"]


# ---------------------------------------------------------------- extrapolation models
def tail(model, W, upto=400):
    return mpmath.fsum(model(W + 2 * j) for j in range(1, upto))


def est_G(f, W):
    d1, d0 = f[W] - f[W - 2], f[W - 2] - f[W - 4]
    return f[W] + d1 / (d0 / d1 - 1)


def est_L(f, W, m, nterms=1):
    """Luescher form d_w = C exp(-m w) w^(-3/2) (1 + c1/w [+ c2/w^2]) through the last nterms+1 differences."""
    ws = [W - 2 * i for i in range(nterms + 1)]
    A = [[mpmath.e ** (-m * w) * w ** mpmath.mpf(-1.5) * w ** (-k) for k in range(nterms + 1)] for w in ws]
    b = [f[w] - f[w - 2] for w in ws]
    coef = mpmath.lu_solve(mpmath.matrix(A), mpmath.matrix(b))

    def model(w):
        return mpmath.e ** (-m * w) * w ** mpmath.mpf(-1.5) * sum(coef[k] * w ** (-k) for k in range(nterms + 1))

    return f[W] + tail(model, W), model


def est_PE(f, W):
    ws = [W, W - 2, W - 4]
    sg = mpmath.sign(f[W] - f[W - 2])  # the midpoints decrease, the odd widths increase
    A = [[1, -w, mpmath.log(w)] for w in ws]
    b = [mpmath.log(sg * (f[w] - f[w - 2])) for w in ws]
    la, ix, bb = mpmath.lu_solve(mpmath.matrix(A), mpmath.matrix(b))
    return f[W] + sg * tail(lambda w: mpmath.e ** (la - ix * w) * w ** bb, W)


def est_R1(f, W):
    r = {w: (f[w - 2] - f[w - 4]) / (f[w] - f[w - 2]) for w in (W, W - 2)}
    c = (r[W] - r[W - 2]) / (mpmath.mpf(1) / W - mpmath.mpf(1) / (W - 2))
    rinf = r[W] - c / W
    d, tot = f[W] - f[W - 2], mpmath.mpf(0)
    for j in range(1, 400):
        d = d / (rinf + c / (W + 2 * j))
        tot += d
    return f[W] + tot


def est_wynn(seq):
    """Wynn epsilon; returns the entry of highest even order built from the whole sequence."""
    eps_prev = [mpmath.mpf(0)] * (len(seq) + 1)
    eps = list(seq)
    best, k = eps[-1], 0
    while len(eps) > 1:
        new = []
        for n in range(len(eps) - 1):
            diff = eps[n + 1] - eps[n]
            new.append(eps_prev[n + 1] + (1 / diff if diff != 0 else mpmath.inf))
        eps_prev, eps = eps, new
        k += 1
        if k % 2 == 0 and eps:
            best = eps[-1]
    return best


def models(f, W, m):
    out = {"G": est_G(f, W), "L1": est_L(f, W, m, 1)[0], "L2": est_L(f, W, m, 2)[0], "PE": est_PE(f, W),
           "R1": est_R1(f, W)}
    ws = sorted(w for w in f if w <= W and w >= W - 12)
    out["WY"] = est_wynn([f[w] for w in ws])
    return out


def fmt(x, n=17):
    return mpmath.nstr(x, n, min_fixed=-30, max_fixed=30)


def main():
    runs = load()
    summary = {}
    print("== 0. runs ==")
    print("bc    w  start real  iters  last change      CW width (log)   conv. ratio  wall s   RSS MiB")
    for (bc, w, start, real), r in sorted(runs.items(), key=lambda kv: (kv[0][0], kv[0][1], kv[0][2], kv[0][3])):
        cww = r["cw"][1] - r["cw"][0]
        print(f"{bc:4s} {w:3d}  {start:4s} {real:3s}  {r['iters']:5d}  {mpmath.nstr(r['last_change'], 2):14s}  "
              f"{mpmath.nstr(cww, 2):14s}  {mpmath.nstr(r['ratio'], 5) if r['ratio'] else '-':10s}  {r['wall']:7.1f}  {r['rss']:7.0f}")
        summary[f"{bc}_w{w}_{start}_{real}"] = dict(loglam=fmt(r["loglam"], 22), cw_lo=fmt(r["cw"][0], 22),
                                                    cw_hi=fmt(r["cw"][1], 22), iters=r["iters"])
        assert r["viol"] == 0
        tol = mpmath.mpf("1e-17" if real == "ld" else "1e-15")  # rounding of the elementwise ratios
        assert r["loglam"] >= r["cw"][0] - tol and r["loglam"] <= r["cw"][1] + tol, (bc, w, start, real)

    # gap from the convergence of the power iteration on T^2: ratio = (lambda_3/lambda_1)^2
    print("\n== 1. in-sector gap m = -log(ratio)/2 per row, from the convergence of the power iteration ==")
    gaps = {}
    for (bc, w, start, real), r in sorted(runs.items()):
        if bc == "cyl" and real == "ld" and w >= 16 and r["ratio"]:
            gaps[(w, start)] = -mpmath.log(abs(r["ratio"])) / 2
            print(f"w={w:2d} p={start}: ratio {mpmath.nstr(r['ratio'], 6):>10s}  m = {mpmath.nstr(gaps[(w, start)], 6)}")
    m_gap = mpmath.mpf(sorted(gaps.values())[len(gaps) // 2])
    print(f"median m = {mpmath.nstr(m_gap, 7)}   (paper: 1.082727 from ARPACK at w = 20)")

    # cylinder values
    f, f0, f1 = {}, {}, {}
    for w in range(3, 40):
        if (lam(runs, "cyl", w, 0)) is None and lam(runs, "cyl", w, 0, "d") is None:
            continue
        real = "ld" if lam(runs, "cyl", w, 0) is not None else "d"
        if w % 2:
            f[w] = lam(runs, "cyl", w, 0, real) / w
            if lam(runs, "cyl", w, 1, real) is not None:
                assert abs(lam(runs, "cyl", w, 1, real) - lam(runs, "cyl", w, 0, real)) < mpmath.mpf("1e-15"), w
        else:
            if lam(runs, "cyl", w, 1, real) is None:
                continue
            f0[w], f1[w] = lam(runs, "cyl", w, 0, real) / w, lam(runs, "cyl", w, 1, real) / w
    oddmax = max(f)
    evenmax = max(f0)
    print(f"\nodd w: 3..{oddmax}, even w: 4..{evenmax} (w = 28: float64; all others x87 long double)")

    print("\n== 2. Table 1: odd cylinders ==")
    print(" w  f_w (mine)            paper f_w            diff      d_w          r_w      s_w (Aitken)          paper s_w")
    for w in sorted(f):
        if w < 13:
            continue
        d = f[w] - f[w - 2]
        r = (f[w - 2] - f[w - 4]) / d
        sw = f[w] + d / (r - 1)
        p = TABLE1.get(w)
        print(f"{w:2d}  {fmt(f[w], 19):21s} {p[0] if p else '':20s} "
              f"{mpmath.nstr(f[w] - mpmath.mpf(p[0]), 2) if p else '':9s} {mpmath.nstr(d, 4):11s} {mpmath.nstr(r, 6):8s} "
              f"{fmt(sw, 19):21s} {p[3] if p else ''}")

    print("\n== 3. even cylinders: sector bracket f1 < s < f0 ==")
    print(" w  f^(1)                 f^(0)                 midpoint              s inside?")
    mid = {}
    for w in sorted(f0):
        mid[w] = (f0[w] + f1[w]) / 2
        inside = f1[w] < S_PAPER < f0[w]
        p = BRACKETS.get(w)
        print(f"{w:2d}  {fmt(f1[w], 19):21s} {fmt(f0[w], 19):21s} {fmt(mid[w], 19):21s} {inside}"
              + (f"   paper [{p[0]}, {p[1]}]" if p else ""))
    print("paper midpoint w = 24: 0.5655119110413465")

    print("\n== 4. extrapolation of s (models of the paper, own implementation; m = own gap) ==")
    res = {}
    for name, seq, Ws in (("odd", f, [w for w in (21, 23, 25, 27) if w in f]),
                          ("mid", mid, [w for w in (20, 22, 24, 26, 28) if w in mid])):
        for W in Ws:
            res[(name, W)] = models(seq, W, m_gap)
            row = "  ".join(f"{k}={fmt(v, 19)}" for k, v in res[(name, W)].items())
            print(f"{name:3s} W={W}: {row}")
    print("\nbacktest change (estimate at W minus estimate at W-2), L1:")
    for (name, W), v in sorted(res.items()):
        if (name, W - 2) in res:
            print(f"  {name} W={W}: L1 change {mpmath.nstr(v['L1'] - res[(name, W - 2)]['L1'], 3)}, "
                  f"L2 change {mpmath.nstr(v['L2'] - res[(name, W - 2)]['L2'], 3)}")

    print("\n== 5. claim: s = 0.5655119110413253 +- 6e-16 ==")
    for key in [("odd", 25), ("mid", 24), ("odd", 27), ("mid", 26), ("mid", 28)]:
        if key in res:
            vals = res[key]
            kept = [vals[k] for k in ("L1", "L2", "PE", "R1", "WY")]
            lo, hi = min(kept), max(kept)
            print(f"{key[0]} W={key[1]}: L1 = {fmt(vals['L1'], 19)}  L1 - paper = {mpmath.nstr(vals['L1'] - S_PAPER, 3)}; "
                  f"models L1,L2,PE,R1,WY span [{fmt(lo, 19)}, {fmt(hi, 19)}]  "
                  f"inside +-6e-16: {abs(lo - S_PAPER) <= ERR_PAPER and abs(hi - S_PAPER) <= ERR_PAPER}")
    s_mine = res[("odd", 25)]["L1"]
    summary["s_L1_odd25"] = fmt(s_mine, 22)

    # prediction test for the widths beyond the paper
    print("\n== 6. widths beyond the paper: measured vs predicted from the fit at W = 25 (odd) / 24 (midpoints) ==")
    _, model_odd = est_L(f, 25, m_gap, 1)
    _, model_mid = est_L(mid, 24, m_gap, 1)
    for w in (27, 29):
        if w in f:
            dm = f[w] - f[w - 2]
            print(f"odd w={w}: d_w measured {mpmath.nstr(dm, 6)}, L1 prediction {mpmath.nstr(model_odd(w), 6)}, "
                  f"ratio {mpmath.nstr(dm / model_odd(w), 6)}; f_w - s_paper = {mpmath.nstr(f[w] - S_PAPER, 4)}")
    for w in (26, 28):
        if w in mid:
            dm = mid[w] - mid[w - 2]
            print(f"midpoint w={w}: d_w measured {mpmath.nstr(dm, 6)}, L1 prediction {mpmath.nstr(model_mid(w), 6)}, "
                  f"ratio {mpmath.nstr(dm / model_mid(w), 6)}; bracket [{fmt(f1[w], 19)}, {fmt(f0[w], 19)}] "
                  f"contains s_paper: {f1[w] < S_PAPER < f0[w]}")

    print("\n== 6b. hidden slow mode: d_w = L1 form + B x^((w-25)/2), x = e^(-2/1.2351), least squares on w = 13..W ==")
    x = mpmath.e ** (-2 / mpmath.mpf("1.2351"))
    for W in [w for w in (25, 27) if w in f]:
        ws = list(range(13, W + 1, 2))
        d = {w: f[w] - f[w - 2] for w in ws}
        d25 = d[25]

        def fit(B):
            A = mpmath.matrix([[mpmath.e ** (-m_gap * w) * w ** mpmath.mpf(-1.5) * w ** (-k) / d[w] for k in (0, 1)] for w in ws])
            y = mpmath.matrix([(d[w] - B * x ** ((w - 25) / mpmath.mpf(2))) / d[w] for w in ws])
            sol = mpmath.qr_solve(A, y)[0]
            rms = mpmath.sqrt(mpmath.fsum((A * sol - y)[i] ** 2 for i in range(len(ws))) / len(ws))

            def model(w):
                return mpmath.e ** (-m_gap * w) * w ** mpmath.mpf(-1.5) * (sol[0] + sol[1] / w) + B * x ** ((w - 25) / mpmath.mpf(2))

            return rms, f[W] + tail(model, W)

        grid = [d25 * mpmath.mpf(k) / 2000 for k in range(-40, 41)]
        res6 = [(B, *fit(B)) for B in grid]
        best = min(res6, key=lambda t: t[1])
        adm = [t for t in res6 if t[1] <= 3 * best[1]]
        print(f"W={W}: best B = {mpmath.nstr(best[0] / d25, 3)} d_25 (rel. rms {mpmath.nstr(best[1], 3)}); "
              f"admitted (rms within 3x): B/d_25 in [{mpmath.nstr(min(t[0] for t in adm) / d25, 3)}, "
              f"{mpmath.nstr(max(t[0] for t in adm) / d25, 3)}]; shift of s over admitted B: "
              f"{mpmath.nstr(max(t[2] for t in adm) - min(t[2] for t in adm), 3)}")
    print("paper (W = 25): admits 0.001 d_25 <= B <= 0.003 d_25, term 3.0e-17")

    print("\n== 7. parity splitting (Table 5) ==")
    print(" w  Delta_w (mine)   paper          xi_w (mine)  paper")
    Dl = {w: (f0[w] - f1[w]) * w for w in f0}
    for w in sorted(Dl):
        if w < 10:
            continue
        xi = 2 / mpmath.log(Dl[w - 2] / Dl[w])
        p = TABLE5.get(w, ("", ""))
        print(f"{w:2d}  {mpmath.nstr(Dl[w], 7):15s}  {p[0]:13s}  {mpmath.nstr(xi, 6):11s}  {p[1]}")
    ws = [w for w in sorted(Dl) if 10 <= w <= 24]
    # pure exponential and power-prefactor least squares
    A1 = mpmath.matrix([[1, -w] for w in ws])
    A2 = mpmath.matrix([[1, -w, mpmath.log(w)] for w in ws])
    y = mpmath.matrix([mpmath.log(Dl[w]) for w in ws])
    for name, A in (("a - w/xi", A1), ("a - w/xi + b log w", A2)):
        sol = mpmath.qr_solve(A, y)[0]
        resid = A * sol - y
        rms = mpmath.sqrt(mpmath.fsum(x**2 for x in resid) / len(ws))
        extra = f", b = {mpmath.nstr(sol[2], 4)}" if A.cols == 3 else ""
        print(f"fit {name}, w = 10..24: xi = {mpmath.nstr(1 / sol[1], 5)}{extra}, rms {mpmath.nstr(rms, 2)}")
    yb = mpmath.matrix([mpmath.log(Dl[w]) + mpmath.log(w) / 2 for w in ws])
    sol = mpmath.qr_solve(A1, yb)[0]
    resid = A1 * sol - yb
    print(f"fit with b = -1/2: xi = {mpmath.nstr(1 / sol[1], 5)}, rms {mpmath.nstr(mpmath.sqrt(mpmath.fsum(x**2 for x in resid) / len(ws)), 2)}")
    ixs = {w: mpmath.log(Dl[w - 2] / Dl[w]) / 2 for w in ws if w >= 12}
    w1, w2 = max(ixs) - 2, max(ixs)
    slope = (ixs[w2] - ixs[w1]) / (mpmath.mpf(1) / w2 - mpmath.mpf(1) / w1)
    print(f"1/xi_w linear in 1/w through w = {w1}, {w2}: xi_inf = {mpmath.nstr(1 / (ixs[w2] - slope / w2), 5)}"
          "   (paper: 1.1931 rms 1.5e-2; 1.2323, b = -0.433, rms 9.3e-4; 1.2387 rms 2.6e-3; xi_inf = 1.2351)")

    print("\n== 8. float64 vs long double, cylinders ==")
    worst = (0, None)
    for (bc, w, start, real), r in runs.items():
        if real == "d" and (bc, w, start, "ld") in runs:
            d = abs(r["loglam"] - runs[(bc, w, start, "ld")]["loglam"]) / w
            worst = max(worst, (d, (w, start)))
    print(f"max |log lambda_d - log lambda_ld| / w = {mpmath.nstr(worst[0], 3)} at w, p = {worst[1]} "
          "(paper: float64 vs extended at most 6.2e-17 per site)")

    print("\n== 9. free strips: a_k = log lambda_k (sector of e0) and g(k) = a_k - s k, s = paper value ==")
    a = {k: lam(runs, "free", k, "e0") for k in range(1, 40) if lam(runs, "free", k, "e0") is not None}
    print(" k  a_k                       g(k) (mine)            paper g(k)            diff")
    for k in sorted(a):
        if k < 19:
            continue
        g = a[k] - S_PAPER * k
        p = TABLE4.get(k)
        print(f"{k:2d}  {fmt(a[k], 22):25s} {fmt(g, 19):22s} {p or '':22s} {mpmath.nstr(g - mpmath.mpf(p), 2) if p else ''}")
    other = {k: lam(runs, "free", k, 1) for k in range(2, 19, 2) if lam(runs, "free", k, 1) is not None}
    bigger = [k for k in sorted(other) if other[k] > a[k]]
    print(f"even k <= 18 where the sector without e0 has the larger eigenvalue: {bigger} (paper: 6, 10, 14, 18)")
    print(f"k = 6: other sector {fmt(other[6], 16)}, e0 sector {fmt(a[6], 16)} (paper 2.909568954808860, 2.909403518708946)")
    Dfree = {k: other[k] - a[k] for k in other}
    print("free-strip sector difference D(k)/D(k+2):",
          ", ".join(f"{k}: {mpmath.nstr(Dfree[k] / Dfree[k + 2], 5)}" for k in sorted(Dfree) if k + 2 in Dfree and k >= 6),
          "(paper: alternating, factor 13.84)")

    # sigma: odd k Aitken and Wynn, even k Wynn
    g = {k: a[k] - S_PAPER * k for k in a}
    godd = {k: g[k] for k in g if k % 2}
    geven = {k: g[k] for k in g if k % 2 == 0}
    K = max(godd)
    ait = est_G(godd, K)
    wy_odd = est_wynn([godd[k] for k in sorted(godd) if k >= K - 10])
    wy_even = est_wynn([geven[k] for k in sorted(geven) if k >= max(geven) - 10])
    print(f"\n-2 sigma: odd k Aitken at k={K}: {fmt(ait, 19)}, odd Wynn: {fmt(wy_odd, 19)}, even Wynn: {fmt(wy_even, 19)}")
    print(f"ratio of odd differences: " + ", ".join(
        f"{k}: {mpmath.nstr((godd[k - 2] - godd[k - 4]) / (godd[k] - godd[k - 2]), 5)}" for k in sorted(godd) if k >= 23))
    print("paper: -2 sigma = -0.484035871532501 +- 1.8e-14, sigma = 0.242017935766251 +- 9e-15; ratio 8.719")
    summary["minus2sigma_odd_aitken"] = fmt(ait, 22)
    summary["minus2sigma_even_wynn"] = fmt(wy_even, 22)

    print("\n== 10. sign properties of Section 8 (free strips; a_0 = a_1 = 0) ==")
    a[0] = mpmath.mpf(0)
    a[1] = mpmath.mpf(0)
    kmax = max(a)
    sd_even = {q: a[2 * q + 2] - 2 * a[2 * q] + a[2 * q - 2] for q in range(1, kmax // 2) if 2 * q + 2 <= kmax}
    print("even second differences positive for 2q =", [2 * q for q in sorted(sd_even) if sd_even[q] > 0] == [2 * q for q in sorted(sd_even)],
          f"(2q = 2..{2 * max(sd_even)})")
    sd_odd = {k: a[k + 2] - 2 * a[k] + a[k - 2] for k in range(3, kmax - 1, 2)}
    print("odd second differences negative for k =", all(v < 0 for v in sd_odd.values()), f"(k = 3..{max(sd_odd)})")
    inc = {k: a[k + 1] - a[k] - S_PAPER for k in range(0, kmax)}
    alt = all((inc[k] > 0) == (k % 2 == 1) for k in inc)
    print(f"increments a_(k+1) - a_k - s alternate in sign (positive at odd k), k = 0..{kmax - 1}: {alt}")
    print(f"margin of (O) at k = 23: {mpmath.nstr(inc[23], 3)} (paper 5.9e-12)")
    print(f"(a_24 - a_22)/2 = {fmt((a[24] - a[22]) / 2, 16)}, a_24 - a_23 = {fmt(a[24] - a[23], 16)} "
          "(paper: conditional interval [0.565511911035, 0.565511911049])")
    ratios = [inc[k + 1] / inc[k] for k in range(18, kmax - 1)]
    print("step-1 ratios of the increments, k = 18..:", ", ".join(mpmath.nstr(x, 4) for x in ratios), "(paper: -> -0.338)")
    json.dump(summary, open(os.path.join(HERE, "out", "eig_summary.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
