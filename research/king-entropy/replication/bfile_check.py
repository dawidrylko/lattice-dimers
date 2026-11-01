"""Claim 1, the A239264 b-file that oeis_check.py could only compare by its Git LFS pointer.

The b-file was extended to antidiagonals 0..44 and approved on 2026-10-31. oeis.org now
serves the extension as b239264.txt and the former file (antidiagonals 0..36, whose LFS
pointer out/oeis_check.txt records) as b239264_2.txt. Both are fetched from oeis.org:
  curl -sSfO https://oeis.org/A239264/b239264.txt
  curl -sSfO https://oeis.org/A239264/b239264_2.txt
  - b239264_2.txt is rebuilt from out/counts_free.json together with its trailing empty
    lines, and the rebuild compared byte for byte with the file and with the pointer;
  - b239264.txt is compared term by term with out/counts_free.json (antidiagonals 0..36)
    and with data/zex/zex_king_free_*.json (antidiagonals 0..44), which
    compare_counts.py checks against kd.c.

Run: python3 bfile_check.py <dir> > out/bfile_check.txt
"""
import glob
import hashlib
import json
import os
import re
import sys

from oeis_check import A, HERE, load_counts

ZEX = os.path.join(HERE, "..", "data", "zex")


def read_bfile(path):
    rows = [line.split() for line in open(path, encoding="ascii") if line.strip()]
    assert [int(r[0]) for r in rows] == list(range(len(rows)))
    return [int(r[1]) for r in rows]


def load_zex():
    Z = {}
    for fn in glob.glob(os.path.join(ZEX, "zex_king_free_m*_K*.json")):
        m = int(re.search(r"_m(\d+)_K", fn).group(1))
        col = [int(x) for x in json.load(open(fn))["Z"]]
        if len(col) > len(Z.get(m, [])):
            Z[m] = col
    return Z


def A_zex(Z, n, k):
    a, b = min(n, k), max(n, k)
    if a == 0:
        return 1
    if a == 1:
        return 1 - b % 2
    return Z[a][b]


def main():
    src = sys.argv[1]
    own = load_counts()
    zex = load_zex()
    pos = [(n, d - n) for d in range(45) for n in range(d + 1)]
    n_old = 37 * 38 // 2

    print("== b239264_2.txt (antidiagonals 0..36) ==")
    raw = open(os.path.join(src, "b239264_2.txt"), "rb").read()
    old = read_bfile(os.path.join(src, "b239264_2.txt"))
    blank = len(raw) - len(raw.rstrip(b"\n")) - 1
    rebuilt = ("".join(f"{i} {A(own, n, k)}\n" for i, (n, k) in enumerate(pos[:n_old])) + "\n" * blank).encode()
    oid = hashlib.sha256(rebuilt).hexdigest()
    ptr = re.search(r"b239264\.txt: pointer sha256 ([0-9a-f]+)\.\.\. size (\d+)",
                    open(os.path.join(HERE, "out", "oeis_check.txt")).read())
    same = rebuilt == raw
    hit = oid.startswith(ptr.group(1)) and len(rebuilt) == int(ptr.group(2))
    print(f"{len(old)} terms and {blank} empty lines at the end, {len(raw)} bytes")
    print(f"own rebuild with {blank} empty lines: sha256 {oid[:16]}... size {len(rebuilt)}; "
          f"byte-identical to the file: {same}; pointer of out/oeis_check.txt "
          f"{ptr.group(1)}... size {ptr.group(2)}: {'MATCH' if hit else 'no match'}")

    print("\n== b239264.txt (antidiagonals 0..44) ==")
    new = read_bfile(os.path.join(src, "b239264.txt"))
    assert len(new) == len(pos)
    bad_own = sum(new[i] != A(own, n, k) for i, (n, k) in enumerate(pos[:n_old]))
    bad_zex = sum(new[i] != A_zex(zex, n, k) for i, (n, k) in enumerate(pos))
    print(f"{len(new)} terms, up to {max(len(str(t)) for t in new)} digits")
    print(f"antidiagonals 0..36 vs out/counts_free.json: {n_old} terms, mismatches {bad_own}")
    print(f"antidiagonals 0..44 vs data/zex: {len(new)} terms, mismatches {bad_zex}")
    print(f"first {n_old} terms equal to b239264_2.txt: {new[:n_old] == old}")
    print("\nTOTAL MISMATCHES:", (not same) + (not hit) + bad_own + bad_zex + (new[:n_old] != old))


if __name__ == "__main__":
    main()
