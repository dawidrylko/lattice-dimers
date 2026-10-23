"""Claim 6: structure of the row transfer on small cylinders and free strips.

For each width, from the explicit row transfer of rowtm.py (dense, w <= 10):
  - parity: T maps sector p to p + w (mod 2) (checked entrywise);
  - strong connectivity of each sector under T^2 (SCCs by Tarjan) and
    reachability of the sector from the empty state;
  - full spectrum of T^2 per sector: leading eigenvalue (simple?), the next
    eigenvalues by modulus with their sign, the in-sector gap
    m = log(lambda_1 / |lambda_next|) per row, and whether the leading
    eigenvalue of the other sector ever comes close (level crossing).
Also the exact-count ratios against the power iteration (orientation K vs L):
  (log Z(K, k) - log Z(K-2, k)) / 2 -> a_k for the free strips (counts_free.json),
  the same for the cylinders in the sector of the empty state (counts_cyl.json).

Run: python3 spectrum.py > out/spectrum.txt
"""
import json
import math
import os
import sys

import mpmath
import numpy as np

import rowtm
from analyze_eig import load

HERE = os.path.dirname(os.path.abspath(__file__))
sys.setrecursionlimit(100000)


def sccs(adj, nodes):
    index, low, onstack, stack, out = {}, {}, set(), [], []
    counter = [0]

    def strong(v):
        index[v] = low[v] = counter[0]
        counter[0] += 1
        stack.append(v)
        onstack.add(v)
        for u in adj[v]:
            if u not in nodes:
                continue
            if u not in index:
                strong(u)
                low[v] = min(low[v], low[u])
            elif u in onstack:
                low[v] = min(low[v], index[u])
        if low[v] == index[v]:
            comp = []
            while True:
                u = stack.pop()
                onstack.discard(u)
                comp.append(u)
                if u == v:
                    break
            out.append(comp)

    for v in nodes:
        if v not in index:
            strong(v)
    return out


def main():
    print("== 1. row transfer structure and spectra (dense, per sector of T^2) ==")
    print("bc    w  p  states  SCCs  reach  lambda1(T^2)^(1/2)     next/lam1 (T^2)  gap m")
    for cyl in (True, False):
        bc = "cyl" if cyl else "free"
        for w in range(3, 11) if cyl else range(2, 11):
            T = rowtm.transfer(w, "king", cyl)
            for A, row in enumerate(T):
                for B in row:
                    assert (bin(A).count("1") + bin(B).count("1") + w) % 2 == 0, "parity rule violated"
            M = rowtm.dense(T, w)
            M2 = M @ M
            adj2 = {A: [B for B in range(1 << w) if M2[A, B] > 0] for A in range(1 << w)}
            # reachability from the empty state under T^2
            seen, todo = {0}, [0]
            while todo:
                v = todo.pop()
                for u in adj2[v]:
                    if u not in seen:
                        seen.add(u)
                        todo.append(u)
            lead = {}
            for p in (0, 1):
                idx = [A for A in range(1 << w) if bin(A).count("1") % 2 == p]
                comps = sccs(adj2, set(idx))
                ev = np.linalg.eigvals(M2[np.ix_(idx, idx)])
                order = sorted(ev, key=lambda z: -abs(z))
                l1 = order[0]
                nxt = order[1]
                lead[p] = l1.real
                gap = 0.5 * math.log(abs(l1) / abs(nxt)) if abs(nxt) > 0 else float("inf")
                reach = sum(1 for A in idx if A in seen)
                sgn = ""
                if w % 2 == 0:  # T keeps the sector: sign of the subleading eigenvalue of T itself
                    e1 = sorted(np.linalg.eigvals(M[np.ix_(idx, idx)]), key=lambda z: -abs(z))
                    sgn = f" T: lambda_2/lambda_1 = {e1[1].real / e1[0].real:+.6f}{'(complex)' if abs(e1[1].imag) > 1e-9 * abs(e1[1]) else ''}"
                print(f"{bc:4s} {w:3d}  {p}  {len(idx):6d}  {len(comps):4d}  {reach:5d}  {math.sqrt(l1.real):.15f}  "
                      f"{abs(nxt) / abs(l1):.6f}  "
                      f"   {gap:.5f}", end="")
                print(f"  simple: {abs(order[1]) < abs(l1) * (1 - 1e-12)}{sgn}")
            print(f"     -> sector ratio lambda(1)/lambda(0) = {math.sqrt(lead[1] / lead[0]):.12f}")

    print("\n== 2. exact count ratios vs power iteration (free strips and cylinders) ==")
    runs = load()
    free = json.load(open(os.path.join(HERE, "out", "counts_free.json")))["Z"]
    worst = 0
    for k, col in free.items():
        k = int(k)
        K = len(col) - 1
        if K % 2:
            K -= 1
        if (k * K) % 2 or int(col[K]) == 0 or int(col[K - 2]) == 0:
            continue
        r = (mpmath.log(int(col[K])) - mpmath.log(int(col[K - 2]))) / 2
        mine = runs.get(("free", k, "e0", "ld"))
        if mine is None:
            continue
        d = r - mine["loglam"]
        worst = max(worst, abs(d) / k) if k >= 6 else worst
        print(f"free k={k:2d}: (log Z({K},k) - log Z({K - 2},k))/2 - log lambda_k = {mpmath.nstr(d, 3)}")
    cylc = json.load(open(os.path.join(HERE, "out", "counts_cyl.json")))["Z"]
    for m, col in cylc.items():
        m = int(m)
        K = len(col) - 1
        if K % 2:
            K -= 1
        r = (mpmath.log(int(col[K])) - mpmath.log(int(col[K - 2]))) / 2
        mine = runs.get(("cyl", m, "0", "ld"))
        if mine is not None:
            print(f"cyl  m={m:2d}: (log Z({K},m) - log Z({K - 2},m))/2 - log lambda^(0)_m = {mpmath.nstr(r - mine['loglam'], 3)}")


if __name__ == "__main__":
    main()
