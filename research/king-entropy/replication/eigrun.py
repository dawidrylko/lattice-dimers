"""Power iterations with kd.c, one raw output file per run in out/eig/.

  python3 eigrun.py base     cylinders w = 3..25 and free strips w = 1..26 (long double),
                             float64 repeats of the cylinders w = 3..25
  python3 eigrun.py wide     cylinders w = 26 (both sectors) and w = 27 (long double),
                             w = 28 (both sectors, float64: long double does not fit in 15 GiB)

  python3 eigrun.py <group> <regex> ...   only the runs whose file name matches one of the regexes

A run file is kept only when complete; existing complete files are skipped.
Each file ends with "# wall=<s> maxrss_mib=<MiB>".
"""
import os
import re
import subprocess
import sys
import time

import kdrun

SEED = 20261022
EIG = os.path.join(kdrun.HERE, "out", "eig")


def jobs(group):
    J = []
    if group == "base":
        for w in range(3, 26):
            for p in ((0, 1) if w % 2 == 0 or w <= 15 else (0,)):
                J.append(("kd_ld", "king", "cyl", w, str(p), 60, "1e-19"))
        for w in range(1, 27):
            J.append(("kd_ld", "king", "free", w, "e0", 60, "1e-19"))
        for w in range(2, 19, 2):
            J.append(("kd_ld", "king", "free", w, "1", 60, "1e-19"))
        for w in range(3, 26):
            for p in ((0, 1) if w % 2 == 0 else (0,)):
                J.append(("kd_d", "king", "cyl", w, str(p), 60, "1e-16"))
    elif group == "wide":
        J += [("kd_ld", "king", "cyl", 26, "0", 40, "1e-19"), ("kd_ld", "king", "cyl", 26, "1", 40, "1e-19"),
              ("kd_ld", "king", "cyl", 27, "0", 40, "1e-19"),
              ("kd_d", "king", "cyl", 28, "0", 40, "1e-16"), ("kd_d", "king", "cyl", 28, "1", 40, "1e-16")]
    return J


def fname(binary, lat, bc, w, start):
    real = "ld" if binary == "kd_ld" else "d"
    return os.path.join(EIG, f"{lat}_{bc}_w{w:02d}_{start}_{real}.txt")


def main():
    os.makedirs(EIG, exist_ok=True)
    for binary, lat, bc, w, start, maxit, tol in jobs(sys.argv[1]):
        fn = fname(binary, lat, bc, w, start)
        if sys.argv[2:] and not any(re.search(p, os.path.basename(fn)) for p in sys.argv[2:]):
            continue
        if os.path.exists(fn):
            continue
        t = time.time()
        tmp = fn + ".tmp"
        with open(tmp, "w") as f:
            proc = subprocess.Popen([os.path.join(kdrun.HERE, binary), "power", lat, bc, str(w), start, str(maxit),
                                     str(SEED), tol], stdout=f)
            _, status, ru = os.wait4(proc.pid, 0)
            wall = time.time() - t
            if status:
                raise RuntimeError(f"kd failed: {fn}")
            f.flush()
        with open(tmp, "a") as f:
            f.write(f"# wall={wall:.1f} maxrss_mib={ru.ru_maxrss / 1024:.0f}\n")
        os.replace(tmp, fn)
        print(f"{os.path.basename(fn)} wall={wall:.1f}s", flush=True)


if __name__ == "__main__":
    main()
