"""Theorem 4.1, the run-weighted upper bound (Table 3, column 4), with the
directed-rounding certificate of kd.c (mode certrun, float64 binary kd_d).

Weights 1, sqrt2, sqrt(phi) on outside covers of the side cells, by position in
the run (Lemma 4.6 and the transfer after it); sqrt2 and sqrt(phi) are rounded up
to doubles. v from round-to-nearest power iteration from e0; the product Av in
FE_UPWARD; C = max (Av)_i / v_i rounded up, with (Av)_i = 0 checked off supp v;
bound log(C)/(2w) with mpmath, rounded up to 12 decimals.

Run: python3 certrun.py 4 8 12 16 20 24 > out/certrun.txt
"""
import sys
import time

import mpmath

import kdrun
from cert import fixed, parse_hex

mpmath.mp.dps = 60
PAPER = {4: "0.669090528409", 8: "0.617278850986", 12: "0.600023045982", 16: "0.591395260725",
         20: "0.586218590772", 24: "0.582767477484"}


def dbl_ceil_hex(x):
    """Smallest double >= x (x in [1, 2))."""
    mant = int(mpmath.ceil(x * mpmath.mpf(2) ** 52))
    return f"0x{mant >> 52:x}.{mant & ((1 << 52) - 1):013x}p+0"


def main():
    f2 = dbl_ceil_hex(mpmath.sqrt(2))
    f3 = dbl_ceil_hex(mpmath.sqrt((1 + mpmath.sqrt(5)) / 2))
    assert parse_hex(f2) >= mpmath.sqrt(2) and parse_hex(f3) >= mpmath.sqrt((1 + mpmath.sqrt(5)) / 2)
    print(f"factors rounded up to doubles: sqrt2 -> {f2}, sqrt(phi) -> {f3}")
    print(" w  run-weighted upper bound   paper            unrounded                 wall s")
    for w in [int(a) for a in sys.argv[1:]]:
        t = time.time()
        out = kdrun.run(["certrun", w, f2, f3, 40], "kd_d")
        d = dict(line.split(None, 1) for line in out.splitlines() if not line.startswith(("#", "it ")))
        assert int(d["zero_viol"]) == 0 and parse_hex(d["v0_hex"]) > 0
        b = mpmath.log(parse_hex(d["ratio_hex"])) / (2 * w)
        b12 = mpmath.ceil(b * 10**12) / 10**12
        p = PAPER.get(w, "")
        flag = "" if not p else ("same" if b12 == mpmath.mpf(p) else f"diff {mpmath.nstr(b12 - mpmath.mpf(p), 3)}")
        print(f"{w:2d}  {fixed(b12, 12):25s}  {p:15s}  {mpmath.nstr(b, 18):24s}  {time.time() - t:6.0f}  {flag}", flush=True)


if __name__ == "__main__":
    main()
