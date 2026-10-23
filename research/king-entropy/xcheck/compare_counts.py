"""Claim 1, part 2: own exact counts against the committed counts of the
repository (data/zex/*.json of research/king-entropy and the test data of the
JavaScript solvers in data/domiculeTiling*.json at the repository root).

For each zex file the same (lattice, bc, m, K) is recomputed with kd.c + CRT
(the number of primes chosen from the size of the counts; one extra prime
checks), except the free king boards m >= 21, which are read from
out/counts_free.json (computed by counts.py).

Run: python3 compare_counts.py > out/compare_counts.txt
"""
import glob
import json
import math
import os
import re

import kdrun

HERE = kdrun.HERE
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
ZEX = os.path.join(HERE, "..", "data", "zex")
GROWTH = {"king": 0.60, "tri": 0.45, "sq": 0.32}  # bounds on log Z / cells, used only to size the CRT


def main():
    own_free = {int(L): [int(x) for x in col] for L, col in json.load(open(os.path.join(HERE, "out", "counts_free.json")))["Z"].items()}
    nfiles = nvals = nbad = 0
    for fn in sorted(glob.glob(os.path.join(ZEX, "zex_*.json"))):
        lat, bc, m, K = re.match(r"zex_(\w+?)_(free|cyl)_m(\d+)_K(\d+)\.json", os.path.basename(fn)).groups()
        m, K = int(m), int(K)
        theirs = [int(x) for x in json.load(open(fn))["Z"]]
        if lat == "king" and bc == "free" and m >= 21:
            mine = own_free[m][: K + 1]
        else:
            bits = GROWTH[lat] * K * m / math.log(2) + 80
            npr = int(bits // 61) + 2
            mine = kdrun.count_mod(lat, bc, m, K, npr)
        n = min(len(mine), len(theirs))
        bad = sum(mine[k] != theirs[k] for k in range(n))
        nfiles += 1
        nvals += n
        nbad += bad
        print(f"{os.path.basename(fn):28s} K = 0..{n - 1:3d}  mismatches {bad}", flush=True)
    print(f"\nzex files {nfiles}, values compared {nvals}, mismatches {nbad}")

    js = 0
    jbad = 0
    for name in ("domiculeTilingTests.json", "domiculeTilingTests-Rectangles.json"):
        for tc in json.load(open(os.path.join(REPO, "data", name)))["testCases"]:
            K, L, z = tc["rowCount"], tc["colCount"], int(tc["expectedResult"])
            if K == 0 or L == 0:
                mine = 1
            elif K <= 36 and L <= 24 and K < len(own_free.get(L, [])):
                mine = own_free[L][K]
            elif L <= 36 and K <= 24 and L < len(own_free.get(K, [])):
                mine = own_free[K][L]
            else:
                continue
            js += 1
            jbad += mine != z
    print(f"JavaScript solver test data (repository root data/): {js} boards compared, mismatches {jbad}")
    print("TOTAL MISMATCHES:", nbad + jbad)


if __name__ == "__main__":
    main()
