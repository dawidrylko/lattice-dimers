"""Smaller numbers of the paper recomputed: Kahn-Lovasz bound, Table 6 (Bethe
values, s/Bethe), 2s and e^s, G/pi, the triangular-lattice entropy from the own
transfer code (cylinders w = 17, 18 and the tri sector bracket).

Run: python3 misc.py > out/misc.txt
"""
import mpmath

import kdrun
from cert import parse_hex

mpmath.mp.dps = 30
S = mpmath.mpf("0.5655119110413253")


def loglam(lat, bc, w, start):
    out = kdrun.run(["power", lat, bc, w, start, 80, 7, "1e-19"])
    last = [l for l in out.splitlines() if not l.startswith("#")][-1].split()
    return mpmath.log(parse_hex(last[1])) / 2


def main():
    print("Kahn-Lovasz log(8!)/16 =", mpmath.nstr(mpmath.log(40320) / 16, 12), "(paper 0.662787681422)")
    print("2s =", mpmath.nstr(2 * S, 15), " e^s =", mpmath.nstr(mpmath.e ** S, 15),
          "(paper 1.13102382208265, 1.76034869404198)")
    G = mpmath.catalan
    print("G/pi =", mpmath.nstr(G / mpmath.pi, 12), "(paper 0.291560904031)")
    for d, s, name in ((4, G / mpmath.pi, "square"), (6, mpmath.mpf("0.428594537465"), "triangular"), (8, S, "king")):
        bethe = mpmath.log(mpmath.mpf(d - 1) ** (d - 1) / mpmath.mpf(d) ** (d - 2)) / 2
        kl = mpmath.log(mpmath.factorial(d)) / (2 * d)
        print(f"{name:10s} d={d}: Bethe {mpmath.nstr(bethe, 9)}, s/Bethe {mpmath.nstr(s / bethe, 5)}, "
              f"Kahn-Lovasz {mpmath.nstr(kl, 9)}, (Bethe - s)/s = {mpmath.nstr(100 * (bethe / s - 1), 3)} %, "
              f"(Bethe - s)/Bethe = {mpmath.nstr(100 * (1 - s / bethe), 3)} %")
    print("(paper Table 6: 0.261624072, 1.1144, 0.397256729; 0.440075843, 0.97391, 0.548270934;"
          " 0.572360897, 0.98803, 0.662787681; overestimates 2.6 %, 1.2 %)")
    t17 = loglam("tri", "cyl", 17, "0") / 17
    t18a, t18b = loglam("tri", "cyl", 18, "0") / 18, loglam("tri", "cyl", 18, "1") / 18
    print(f"triangular cylinder w = 17: {mpmath.nstr(t17, 16)} (paper 0.428594537464956; Kasteleyn value 0.428594537464959)")
    print(f"triangular cylinder w = 18 sectors: {mpmath.nstr(t18b, 16)}, {mpmath.nstr(t18a, 16)}")


if __name__ == "__main__":
    main()
