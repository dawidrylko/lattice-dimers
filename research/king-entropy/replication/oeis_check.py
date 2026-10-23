"""Claim 1: own exact counts against OEIS A239264 and A239273.

oeis.org is not reachable from the machine that ran this; its data are taken
from the mirror https://github.com/oeis/oeisdata (fetched by fetch_oeis.sh):
  - the %S/%T/%U data lines of seq/A239/A239264.seq and A239273.seq, compared term by term;
  - the b-files themselves are stored there as Git LFS pointers whose objects are
    served only by oeis.org; the pointer records the SHA-256 and the size of the
    b-file. The b-file text is rebuilt from the own counts and its SHA-256 compared
    with the pointer, which checks every term of the b-file without downloading it.

Run: sh fetch_oeis.sh <dir>; python3 oeis_check.py <dir> > out/oeis_check.txt
"""
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load_counts():
    d = json.load(open(os.path.join(HERE, "out", "counts_free.json")))["Z"]
    Z = {}
    for L, col in d.items():
        for K, x in enumerate(col):
            Z[(K, int(L))] = int(x)
    return Z


def A(Z, n, k):
    """A239264: A(n, k) = tilings of a k x n grid, A(n, 0) = A(0, k) = 1."""
    if n == 0 or k == 0:
        return 1
    a, b = min(n, k), max(n, k)
    return Z[(b, a)]  # width a (columns), b rows


def seq_terms(path, anum):
    terms = ""
    for line in open(path, encoding="utf-8"):
        if re.match(rf"%[STU] {anum} ", line):
            terms += line.split(None, 2)[2].strip()
    return [int(t) for t in terms.split(",") if t]


def lfs_pointer(path):
    d = dict(line.split(" ", 1) for line in open(path).read().splitlines() if " " in line)
    return d["oid"].split(":")[1].strip(), int(d["size"])


def main():
    src = sys.argv[1]
    Z = load_counts()
    flat = []
    for d in range(37):
        for n in range(d + 1):
            flat.append(A(Z, n, d - n))
    sq = [1] + [Z[(2 * n, 2 * n)] for n in range(1, 13)]

    print("== A239264, data section ==")
    data = seq_terms(os.path.join(src, "A239264.seq"), "A239264")
    bad = sum(x != y for x, y in zip(data, flat))
    print(f"{len(data)} terms (antidiagonals 0..{next(d for d in range(40) if (d + 1) * (d + 2) // 2 >= len(data))}), mismatches {bad}")
    print("== A239273, data section ==")
    data = seq_terms(os.path.join(src, "A239273.seq"), "A239273")
    bad2 = sum(x != y for x, y in zip(data, sq))
    print(f"{len(data)} terms (n = 0..{len(data) - 1}), mismatches {bad2}")

    print("\n== b-files rebuilt from the own counts vs the Git LFS pointers of the mirror ==")
    nok = 0
    for name, terms in (("b239264.txt", flat), ("b239273.txt", sq)):
        oid, size = lfs_pointer(os.path.join(src, name))
        variants = {
            "LF, final newline": "".join(f"{i} {t}\n" for i, t in enumerate(terms)),
            "LF, no final newline": "\n".join(f"{i} {t}" for i, t in enumerate(terms)),
        }
        hit = None
        for label, text in variants.items():
            b = text.encode()
            if hashlib.sha256(b).hexdigest() == oid and len(b) == size:
                hit = label
        nok += hit is not None
        print(f"{name}: pointer sha256 {oid[:16]}... size {size}; {len(terms)} terms rebuilt -> "
              + (f"SHA-256 MATCH ({hit}): every term of the b-file equals the own count" if hit else "no match"))
    print("\nZ(24, 24) =", Z[(24, 24)])
    print("TOTAL MISMATCHES:", bad + bad2 + (2 - nok))


if __name__ == "__main__":
    main()
