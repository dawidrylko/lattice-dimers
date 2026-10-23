"""Validation of the three independent count algorithms against each other.

  graphs.py  brute force on the explicit graph,
  rowtm.py   row-to-row transfer built column by column,
  kd.c       in-place cell transfer (mod primes + CRT).

Also: power iteration of kd.c against the dense eigenvalues of the row
transfer, per parity sector, and the square-lattice strip product formula.

Run: python3 validate.py > out/validate.txt
"""
import math

import numpy as np

import graphs
import kdrun
import rowtm


def main():
    nbad = 0
    nchk = 0
    print("== 1. counts: brute force vs row transfer vs kd.c ==")
    for lattice in ("king", "sq", "tri"):
        for cyl in (False, True):
            bc = "cyl" if cyl else "free"
            for w in range(1, 8):
                if cyl and w < 3:
                    continue
                K = 9 if w <= 4 else 6
                kd = kdrun.count_mod(lattice, bc, w, K, 4)
                rt = rowtm.counts(w, K, lattice, cyl)
                for k in range(K + 1):
                    nchk += 1
                    ok = kd[k] == rt[k]
                    if k * w <= 30 and k <= 6:
                        bf = graphs.Z_brute(k, w, lattice, cyl) if not (cyl and k == 0) else 1
                        ok = ok and bf == kd[k]
                    if not ok:
                        nbad += 1
                        print("MISMATCH", lattice, bc, w, k, kd[k], rt[k])
    print(f"checked {nchk} (lattice, bc, w, k) values, mismatches {nbad}")

    print("\n== 2. symmetry Z(K, L) = Z(L, K) of the free king board, kd.c ==")
    tab = {L: kdrun.count_mod("king", "free", L, 12, 4) for L in range(1, 13)}
    asym = sum(tab[L][K] != tab[K][L] for L in range(1, 13) for K in range(1, 13))
    print(f"asymmetric pairs among 1 <= K, L <= 12: {asym}")
    print("Z(2, 2) =", tab[2][2], " Z(3, 4) =", tab[4][3], " Z(4, 4) =", tab[4][4], " Z(6, 6) =", tab[6][6])

    print("\n== 3. edge count of the free king board: E = 4KL - 3K - 3L + 2 ==")
    bad = 0
    for K in range(1, 8):
        for L in range(1, 8):
            E = len(graphs.board_edges(K, L))
            bad += E != 4 * K * L - 3 * K - 3 * L + 2
    print("violations for K, L <= 7:", bad, "; E(5, 5) =", len(graphs.board_edges(5, 5)))

    print("\n== 4. leading sector eigenvalues: dense row transfer vs kd.c power iteration ==")
    print(" w  bc    p  log lambda (dense)       log lambda (kd_ld)       diff")
    maxd = 0
    for cyl in (False, True):
        bc = "cyl" if cyl else "free"
        for w in range(3, 9):
            T = rowtm.transfer(w, "king", cyl)
            M = rowtm.dense(T, w)
            M2 = M @ M
            for p in (0, 1):
                idx = [A for A in range(1 << w) if bin(A).count("1") % 2 == p]
                ev = np.linalg.eigvals(M2[np.ix_(idx, idx)])
                lam2 = max(abs(ev))
                out = kdrun.run(["power", "king", bc, w, p, 60, 12345, "1e-18"])
                last = [l for l in out.splitlines() if not l.startswith("#")][-1].split()
                est = float(last[4])
                d = 0.5 * math.log(est) - 0.5 * math.log(lam2)
                maxd = max(maxd, abs(d))
                print(f"{w:2d}  {bc:4s}  {p}  {0.5 * math.log(lam2):.16f}  {0.5 * math.log(est):.16f}  {d:+.1e}")
    print(f"max |diff| = {maxd:.1e} (float64 eigvals as reference)")

    print("\n== 5. square lattice, free strips: kd.c vs product formula ==")
    maxd = 0
    for w in range(2, 13):
        exact = sum(math.log(math.cos(math.pi * j / (w + 1)) + math.sqrt(1 + math.cos(math.pi * j / (w + 1)) ** 2))
                    for j in range(1, w // 2 + 1))
        out = kdrun.run(["power", "sq", "free", w, "e0", 200, 1, "1e-19"])
        est = float([l for l in out.splitlines() if not l.startswith("#")][-1].split()[4])
        maxd = max(maxd, abs(0.5 * math.log(est) - exact))
    print(f"max |log lambda_kd - log lambda_formula|, w = 2..12: {maxd:.1e}")
    print("\nTOTAL MISMATCHES:", nbad + asym + bad)


if __name__ == "__main__":
    main()
