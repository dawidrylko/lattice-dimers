"""Claim 5: corner free energy kappa and the asymptotics of A239273 from the own
exact counts (out/counts_free.json), with s and -2 sigma from the own
eigenvalues (out/eig_summary.json); the same with the paper's s and sigma.

  rho(L) = log Z(L, L) - s L^2 + 4 sigma L  ->  kappa   (even L)
  a(n) = Z(2n, 2n) ~ C d^(n^2) f^(-n),  C = e^kappa, d = e^(4s), f = e^(8 sigma)

Run: python3 corner.py > out/corner.txt
"""
import json
import os

import mpmath

mpmath.mp.dps = 50
HERE = os.path.dirname(os.path.abspath(__file__))


def load():
    d = json.load(open(os.path.join(HERE, "out", "counts_free.json")))["Z"]
    logZ = {}
    for L, col in d.items():
        for K, x in enumerate(col):
            if int(x) > 0:
                logZ[(K, int(L))] = mpmath.log(mpmath.mpf(int(x)))
    return logZ


def analyse(logZ, s, sig, label):
    print(f"\n######## {label}: s = {mpmath.nstr(s, 19)}, sigma = {mpmath.nstr(sig, 16)}")
    rho = {L: logZ[(L, L)] - s * L * L + 4 * sig * L for L in range(2, 25, 2)}
    print(" L   rho(L)                  diff ratio (step 2)")
    for L in sorted(rho):
        r = ""
        if L - 4 in rho:
            r = mpmath.nstr((rho[L - 2] - rho[L - 4]) / (rho[L] - rho[L - 2]), 5)
        print(f"{L:2d}  {mpmath.nstr(rho[L], 16):22s}  {r}")

    def aitken(L):
        d1, d0 = rho[L] - rho[L - 2], rho[L - 2] - rho[L - 4]
        return rho[L] + d1 / (d0 / d1 - 1)

    k24, k22 = aitken(24), aitken(22)
    r = {L: (rho[L - 2] - rho[L - 4]) / (rho[L] - rho[L - 2]) for L in (22, 24)}
    c = (r[24] - r[22]) / (mpmath.mpf(1) / 24 - mpmath.mpf(1) / 22)
    rinf = r[24] - c / 24
    d, tot = rho[24] - rho[22], mpmath.mpf(0)
    for j in range(1, 500):
        d = d / (rinf + c / (24 + 2 * j))
        tot += d
    klin = rho[24] + tot
    print(f"Aitken at L = 24: kappa = {mpmath.nstr(k24, 13)}; change from L = 22: {mpmath.nstr(k24 - k22, 2)}; "
          f"ratio linear in 1/L: {mpmath.nstr(klin, 13)} (change {mpmath.nstr(klin - k24, 2)})")
    print("paper: 0.363196256048, 1.4e-10 from L = 22, 2.6e-11 with the ratio linear in 1/L, kappa = 0.36319625605 +- 3e-10;"
          " ratios 5.85 -> 5.58")

    rect = []
    for K in range(20, 25):
        for L in range(20, 25):
            if (K * L) % 2 == 0:
                rr = logZ[(K, L)] - s * K * L + 2 * sig * (K + L) - k24
                rect.append((abs(rr), K, L, rr))
    mx = max(rect)
    signs = {(min(K, L) % 2, rr > 0) for _, K, L, rr in rect}
    print(f"rectangles 20 <= K, L <= 24: max |rho(K, L) - kappa| = {mpmath.nstr(mx[0], 4)} at {mx[1]}x{mx[2]}; "
          f"(parity of min, sign>0) pairs seen: {sorted(signs)}  (paper: <= 6.2e-8, sign by parity of min)")

    C, dd, f = mpmath.e ** k24, mpmath.e ** (4 * s), mpmath.e ** (8 * sig)
    print(f"C = e^kappa = {mpmath.nstr(C, 10)}, d = e^(4s) = {mpmath.nstr(dd, 15)}, f = e^(8 sigma) = {mpmath.nstr(f, 13)}")
    print("paper: C = 1.437918032, d = 9.60273202731337, f = 6.931966132248")
    errs = {n: mpmath.e ** ((k24 + 4 * s * n * n - 8 * sig * n) - logZ[(2 * n, 2 * n)]) - 1 for n in range(4, 13)}
    print("relative error (formula - a(n)) / a(n): " + ", ".join(f"n={n}: {mpmath.nstr(errs[n], 3)}" for n in errs))
    print("error ratio per step: " + ", ".join(f"{mpmath.nstr(errs[n - 1] / errs[n], 3)}" for n in range(9, 13)),
          "  (paper: -2.0e-9 at n = 12, factor 5.6 per step)")

    sd = {L: (logZ[(L + 2, L + 2)] - 2 * logZ[(L, L)] + logZ[(L - 2, L - 2)]) / 8 for L in range(4, 23, 2)}
    md = {L: (logZ[(L + 2, L + 2)] - logZ[(L + 2, L)] - logZ[(L, L + 2)] + logZ[(L, L)]) / 4 for L in range(2, 23, 2)}

    def geo(seq, L):
        d1, d0 = seq[L] - seq[L - 2], seq[L - 2] - seq[L - 4]
        return seq[L] + d1 / (d0 / d1 - 1)

    print(f"second differences - s at L = 22: {mpmath.nstr(sd[22] - s, 3)}; geometric extrapolation - s: "
          f"{mpmath.nstr(geo(sd, 22) - s, 3)}  (paper: 5.3e-9, 1.0e-10)")
    print(f"mixed differences - s at L = 22: {mpmath.nstr(md[22] - s, 3)}; geometric extrapolation - s: "
          f"{mpmath.nstr(geo(md, 22) - s, 3)}  (paper: -1.1e-11, 5.9e-13 in absolute value)")
    return k24


def main():
    logZ = load()
    summ = json.load(open(os.path.join(HERE, "out", "eig_summary.json")))
    s_m = mpmath.mpf(summ["s_L1_odd25"])
    sig_m = -mpmath.mpf(summ["minus2sigma_odd_aitken"]) / 2
    k_m = analyse(logZ, s_m, sig_m, "own s and sigma")
    k_p = analyse(logZ, mpmath.mpf("0.5655119110413253176"), mpmath.mpf("0.242017935766251"), "paper s and sigma")
    print(f"\nkappa (own) - kappa (paper's s, sigma) = {mpmath.nstr(k_m - k_p, 3)}; "
          f"own kappa - paper's 0.36319625605 = {mpmath.nstr(k_m - mpmath.mpf('0.36319625605'), 3)}")


if __name__ == "__main__":
    main()
