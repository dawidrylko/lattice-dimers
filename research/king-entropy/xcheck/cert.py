"""Theorem 4.1 (columns 2-3 of Table 3) and the inputs of Proposition 8.2 with
directed-rounding Collatz-Wielandt certificates from kd.c (mode cert).

The vector v comes from round-to-nearest power iteration from e0 (free strip);
the certificate product y = A v is then evaluated entirely in x87 long double
with the rounding mode FE_DOWNWARD (lower bound: y <= Av, ratio rounded down) or
FE_UPWARD (upper bound: y >= Av with the weight rounded up, ratio rounded up).
All terms are nonnegative, so directed rounding gives one-sided enclosures
without an error analysis. log(c)/(2w) and log(C)/(2w) are taken from the exact
value of the printed hex float with mpmath (60 digits) and rounded outward.

  z = 0, down : lambda_w^2 >= c       -> s >= log(c)/(2w)
  z = 0, up   : lambda_w^2 <= C       -> upper bound on log lambda_w (Prop. 8.2)
  z = sqrt(phi) rounded up, up : bar s <= log(C)/(2w)

Run: python3 cert.py 16 20 22 23 24 > out/cert.txt
"""
import re
import sys

import mpmath

import kdrun

mpmath.mp.dps = 60


def parse_hex(h):
    """Exact value of a C hex float such as 0xc.6b33dc5d2891945p+29."""
    m = re.fullmatch(r"0x([0-9a-f]+)(?:\.([0-9a-f]*))?p([+-]\d+)", h.strip())
    assert m, h
    ip, fp, e = m.group(1), m.group(2) or "", int(m.group(3))
    mant = int(ip + fp, 16)
    return mpmath.mpf(mant) * mpmath.mpf(2) ** (e - 4 * len(fp))


def ld_ceil_hex(x):
    """Smallest x87 long double (64-bit mantissa) >= x, as a hex string."""
    e = int(mpmath.floor(mpmath.log(x, 2)))
    mant = int(mpmath.ceil(x * mpmath.mpf(2) ** (63 - e)))
    if mant >= 1 << 64:
        mant >>= 1
        e += 1
    return f"0x{mant:x}p{e - 63:+d}"


def run_cert(w, direction, zhex, iters=40):
    out = kdrun.run(["cert", "king", w, direction, zhex, iters, 1])
    d = dict(line.split(None, 1) for line in out.splitlines() if not line.startswith("#"))
    assert int(d["zero_viol"]) == 0, "support check failed"
    assert parse_hex(d["v0_hex"]) > 0
    return parse_hex(d["ratio_hex"]), d


PAPER = {  # Table 3, columns 2 and 3
    16: ("0.535259669620", "0.596568952598"),
    20: ("0.541310117470", "0.590357544276"),
    24: ("0.545343749727", "0.586216605404"),
}
PAPER_LOG = {"24 lower": "13.08824999346029", "23 lower": "12.52273808241305",
             "22 upper": "11.95722617139012", "24 upper": "13.08824999346131"}


def main():
    widths = [int(a) for a in sys.argv[1:]] or [16, 20, 24]
    phi = (1 + mpmath.sqrt(5)) / 2
    zhex = ld_ceil_hex(mpmath.sqrt(phi))
    assert parse_hex(zhex) >= mpmath.sqrt(phi)
    print(f"z = sqrt(phi) rounded up to long double: {zhex} (excess {mpmath.nstr(parse_hex(zhex) - mpmath.sqrt(phi), 3)})")
    print(" w  quantity                  mine                      paper")
    for w in widths:
        c, dl = run_cert(w, "down", "0")
        C0, du = run_cert(w, "up", "0")
        Cz, dz = run_cert(w, "up", zhex)
        lo = mpmath.log(c) / (2 * w)
        hi = mpmath.log(Cz) / (2 * w)
        lo12 = mpmath.floor(lo * 10**12) / 10**12
        hi12 = mpmath.ceil(hi * 10**12) / 10**12
        p = PAPER.get(w, ("", ""))
        print(f"{w:2d}  lower bound on s          {mpmath.nstr(lo12, 12):24s}  {p[0]}   (unrounded {mpmath.nstr(lo, 18)})")
        print(f"{w:2d}  upper bound, sqrt(phi)    {mpmath.nstr(hi12, 12):24s}  {p[1]}   (unrounded {mpmath.nstr(hi, 18)})")
        # Proposition 8.2 inputs: log lambda_w enclosed by the plain-strip certificates
        llo = mpmath.floor(mpmath.log(c) / 2 * 10**14) / 10**14
        lhi = mpmath.ceil(mpmath.log(C0) / 2 * 10**14) / 10**14
        print(f"{w:2d}  log lambda_w in           [{mpmath.nstr(llo, 16)}, {mpmath.nstr(lhi, 16)}]"
              f"  paper: >= {PAPER_LOG.get(f'{w} lower', '-')}, <= {PAPER_LOG.get(f'{w} upper', '-')}")
        print(f"    support {dl['nsupp']} states, min v on support {dl['vmin_supp']}", flush=True)


if __name__ == "__main__":
    main()
