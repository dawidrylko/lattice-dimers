"""Exact counts Z(K, L) of king boards (free) and cylinders with kd.c + CRT.

Free boards: width L = 1..24, K = 0..max(24, 36 - L) rows; this covers the
antidiagonals 0..36 of A239264 and Z(2n, 2n), n <= 12, of A239273.
Cylinders: circumference m = 3..22 (rows as listed in CYL below).
16 primes below 2^62; 15 reconstruct, the 16th checks (kdrun.count_mod).

Run: python3 counts.py > out/counts_log.txt   (writes out/counts_free.json, out/counts_cyl.json)
"""
import json
import os
import resource
import sys
import time

import kdrun

OUT = os.path.join(kdrun.HERE, "out")
CYL = {m: (80 if m <= 12 else 40 if m <= 18 else 28 if m <= 20 else 22) for m in range(3, 23)}


def main():
    which = sys.argv[1:] or ["free", "cyl"]
    if "free" in which:
        free = {}
        for L in range(1, 25):
            t = time.time()
            K = max(24, 36 - L)
            free[L] = [str(x) for x in kdrun.count_mod("king", "free", L, K, 16)]
            print(f"free L={L:2d} K={K:2d} wall={time.time() - t:8.1f}s", flush=True)
        json.dump({"what": "Z(K, L) of the free king board; key L (columns), list index K (rows)",
                   "Z": free}, open(os.path.join(OUT, "counts_free.json"), "w"), indent=0)
    if "cyl" in which:
        cyl = {}
        for m, K in CYL.items():
            t = time.time()
            cyl[m] = [str(x) for x in kdrun.count_mod("king", "cyl", m, K, 16)]
            print(f"cyl m={m:2d} K={K:2d} wall={time.time() - t:8.1f}s", flush=True)
        json.dump({"what": "Z_cyl(K, m) of the king cylinder of circumference m; key m, list index K (rows)",
                   "Z": cyl}, open(os.path.join(OUT, "counts_cyl.json"), "w"), indent=0)
    print("peak RSS of children (MiB):", resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss // 1024)


if __name__ == "__main__":
    main()
