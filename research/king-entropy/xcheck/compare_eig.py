"""Claim 2, part 2: own eigenvalues against the committed ones of the repository
(data/lean/*longdouble*.json and *float64*.json, data/eig/*.json, data/sec/*.json).
float64 values are compared through their exact binary value, not their decimal repr.

Run (after analyze_eig.py): python3 compare_eig.py > out/compare_eig.txt
"""
import ast
import glob
import json
import os
import re

import mpmath

from analyze_eig import load

mpmath.mp.dps = 40
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")


def main():
    runs = load()
    rows = []
    for fn in sorted(glob.glob(os.path.join(DATA, "lean", "lean_king_*.json"))):
        d = json.load(open(fn))
        bc, w, p, dtype = d["bc"], int(d["w"]), str(d["parity"]), d["dtype"]
        start = "e0" if bc == "free" else (p if (bc, w, p, "ld") in runs else "0")
        mine = runs.get((bc, w, start, "ld"))
        if mine is None:
            continue
        rows.append((f"lean {dtype}", bc, w, start, mpmath.mpf(d["log_lambda"]), mine["loglam"]))
    for fn in sorted(glob.glob(os.path.join(DATA, "eig", "eig_king_cyl_*.json"))):
        d = json.load(open(fn))
        w, p = int(d["w"]), str(d["parity"])
        p0 = p if (("cyl", w, p, "ld") in runs) else "0"
        mine = runs.get(("cyl", w, p0, "ld"))
        if mine is not None:
            rows.append(("eig float64", "cyl", w, p, mpmath.mpf(float(d["log_lambda"])), mine["loglam"]))
    for fn in sorted(glob.glob(os.path.join(DATA, "sec", "sec_king_*.json"))):
        bc = "cyl" if "_cyl_" in fn else "free"
        d = json.load(open(fn))
        for w, sec in d.items():
            sec = ast.literal_eval(sec) if isinstance(sec, str) else sec
            for p, val in sec.items():
                w_ = int(w)
                if bc == "free":
                    key = ("free", w_, "e0" if p == "0" else "1", "ld")
                    if w_ % 2 and p == "1":
                        continue
                else:
                    key = ("cyl", w_, p if ("cyl", w_, p, "ld") in runs else "0", "ld")
                mine = runs.get(key)
                if mine is not None:
                    rows.append(("sec float64", bc, w_, str(p), mpmath.mpf(val), mine["loglam"]))
    print("source         bc     w  p   theirs log lambda          mine (long double)         diff per site")
    worst = {}
    for src, bc, w, p, theirs, mine in rows:
        d = (mine - theirs) / w
        worst[src] = max(worst.get(src, 0), abs(d))
        print(f"{src:13s}  {bc:4s} {w:3d}  {str(p):2s}  {mpmath.nstr(theirs, 21):25s}  {mpmath.nstr(mine, 21):25s}  {mpmath.nstr(d, 2)}")
    print("\nmax |diff| per site by source:", {k: mpmath.nstr(v, 2) for k, v in worst.items()})
    bj = json.load(open(os.path.join(DATA, "bounds.json")))
    mx = 0
    n = 0
    for k, val in bj["log_lambda_free"].items():
        mine = runs.get(("free", int(k), "e0", "ld"))
        if mine is not None:
            mx = max(mx, abs(mine["loglam"] - mpmath.mpf(val)) / int(k))
            n += 1
    print(f"data/bounds.json log_lambda_free (float64): {n} widths, max |diff| per site {mpmath.nstr(mx, 2)}")


if __name__ == "__main__":
    main()
