"""Brute-force check of the theorem and the bijection of README.md.

Perfect matchings are enumerated by brute force, every unit square is classified
directly, and the bijection T -> (T0, S) of README.md is built and tested for every
tiling. It shares no code with the solvers of the repository.

Board model: cells (r, c), 0 <= r < R, 0 <= c < C; rows periodic when prow,
columns periodic when pcol (a cylinder of circumference W and length L has C = W,
R = L, pcol only). A square (r, c) has cells a = (r, c), b = (r, c+1), d = (r+1, c),
e = (r+1, c+1); its diagonals are a-e and b-d, its h pair a-b, d-e, its v pair a-d, b-e.

Checks, for each induced subgraph H tested:
  S  every diagonal edge of the king's graph lies in exactly one square (Lemma 1);
  D  in every crossing-free tiling the designated squares are pairwise disjoint (Lemma 2);
  B  T -> (T0, S) lands in pairs with T0 crossing-free and S within the designated
     squares of T0, the inverse map returns T, and the number of pairs
     sum_T0 2^D(T0) equals the number of tilings (so it is a bijection);
  P  Z_H(t) and A_H(1 + t) agree coefficient by coefficient (exact integers).
Odd circumference (not covered by the checkerboard, section Odd periods of README.md):
  L2 length 2: Z(t) = sum over crossing-free T0 of (1 + t)^(h squares of T0);
  P7 with the checkerboard on an odd circumference the conflict graph of designated
     squares has degree <= 1 and Z(t) = sum_T0 (1 + t)^(single) (1 + 2t)^(pairs);
  NG for odd W >= 3 every h/v assignment of two rows of squares has two stacked h
     or two side-by-side v, and the six-cell witness block breaks the identity.
Usage, from this directory, standard library only:
  python3 check.py <section> [workers, default 2] > out/check-<section>.txt
with the sections even-a, even-b, full, odd, ng. Each prints "TOTAL failures 0" when
every check holds.
"""
import random
import sys
from itertools import product
from math import comb
from multiprocessing import Pool


def is_diag(e, R, C, prow, pcol):
    (r1, c1), (r2, c2) = tuple(e)
    dr = min((r2 - r1) % R, (r1 - r2) % R) if prow else abs(r2 - r1)
    dc = min((c2 - c1) % C, (c1 - c2) % C) if pcol else abs(c2 - c1)
    return dr == 1 and dc == 1


def board(R, C, prow, pcol):
    def wrap(r, c):
        if prow:
            r %= R
        if pcol:
            c %= C
        return (r, c) if 0 <= r < R and 0 <= c < C else None

    cells = [(r, c) for r in range(R) for c in range(C)]
    edges = set()
    for r, c in cells:
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr or dc:
                    b = wrap(r + dr, c + dc)
                    if b is not None and b != (r, c):
                        edges.add(frozenset(((r, c), b)))
    squares = []
    for r in range(R if prow else R - 1):
        for c in range(C if pcol else C - 1):
            a, b, d, e = wrap(r, c), wrap(r, c + 1), wrap(r + 1, c), wrap(r + 1, c + 1)
            assert len({a, b, d, e}) == 4
            E = lambda u, v: frozenset((u, v))
            squares.append({
                "q": (r, c), "cells": frozenset((a, b, d, e)),
                "x": (E(a, e), E(b, d)), "h": (E(a, b), E(d, e)), "v": (E(a, d), E(b, e)),
                "f": "h" if (r + c) % 2 == 0 else "v",
            })
    diag = [e for s in squares for e in s["x"]]
    assert len(diag) == len(set(diag)), "a diagonal lies in two squares"
    assert sum(1 for e in edges if is_diag(e, R, C, prow, pcol)) == len(diag), "diagonal edges and square diagonals differ"
    return edges, squares


def matchings(live, edges):
    adj = {v: [] for v in live}
    for e in edges:
        a, b = tuple(e)
        if a in adj and b in adj:
            adj[a].append(b)
            adj[b].append(a)

    def rec(free, chosen):
        if not free:
            yield frozenset(chosen)
            return
        a = min(free)
        for b in adj[a]:
            if b in free:
                chosen.append(frozenset((a, b)))
                yield from rec(free - {a, b}, chosen)
                chosen.pop()

    yield from rec(frozenset(live), [])


def analyse(R, C, prow, pcol, live):
    edges, squares = board(R, C, prow, pcol)
    sq = [s for s in squares if s["cells"] <= live]
    Z = {}
    crossing_free = []
    for T in matchings(live, edges):
        xs = [s for s in sq if s["x"][0] in T and s["x"][1] in T]
        Z[len(xs)] = Z.get(len(xs), 0) + 1
        if not xs:
            crossing_free.append(T)
    return sq, Z, crossing_free


def check_even(args):
    R, C, prow, pcol, live = args
    edges, squares = board(R, C, prow, pcol)
    sq = [s for s in squares if s["cells"] <= live]
    Z = {}
    A = {}
    des = {}
    for T in matchings(live, edges):
        xs = [s for s in sq if s["x"][0] in T and s["x"][1] in T]
        Z[len(xs)] = Z.get(len(xs), 0) + 1
        if xs:
            continue
        d = [s for s in sq if s[s["f"]][0] in T and s[s["f"]][1] in T]
        for i in range(len(d)):
            for j in range(i + 1, len(d)):
                if d[i]["cells"] & d[j]["cells"]:
                    return ("D", R, C, prow, pcol, sorted(live))
        des[T] = frozenset(s["q"] for s in d)
        A[len(d)] = A.get(len(d), 0) + 1
    sqmap = {s["q"]: s for s in sq}
    n_tilings = 0
    for T in matchings(live, edges):
        n_tilings += 1
        xs = [s for s in sq if s["x"][0] in T and s["x"][1] in T]
        T0 = set(T)
        for s in xs:
            T0 -= set(s["x"])
            T0 |= set(s[s["f"]])
        T0 = frozenset(T0)
        if T0 not in des:
            return ("B-T0", R, C, prow, pcol, sorted(live))
        Aset = frozenset(s["q"] for s in xs)
        if not Aset <= des[T0]:
            return ("B-A", R, C, prow, pcol, sorted(live))
        back = set(T0)
        for q in Aset:
            back -= set(sqmap[q][sqmap[q]["f"]])
            back |= set(sqmap[q]["x"])
        if frozenset(back) != T:
            return ("B-inj", R, C, prow, pcol, sorted(live))
    if n_tilings != sum(2 ** len(d) for d in des.values()):
        return ("B-count", R, C, prow, pcol, sorted(live))
    deg = max(list(Z) + list(A) + [0])
    zt = [Z.get(k, 0) for k in range(deg + 1)]
    at = [sum(A.get(j, 0) * comb(j, k) for j in range(k, deg + 1)) for k in range(deg + 1)]
    if zt != at:
        return ("P", R, C, prow, pcol, sorted(live), zt, at)
    return ("ok", sum(zt), sum((-1) ** k * z for k, z in enumerate(zt)))


def check_odd(args):
    R, C, prow, pcol, live, kind = args
    sq, Z, cf = analyse(R, C, prow, pcol, live)
    deg = max(list(Z) + [0])
    zt = [Z.get(k, 0) for k in range(deg + 1)]
    poly = [0] * (len(sq) + 1)
    for T0 in cf:
        if kind == "L2":
            d = [s for s in sq if s["h"][0] in T0 and s["h"][1] in T0]
            for i in range(len(d)):
                for j in range(i + 1, len(d)):
                    if d[i]["cells"] & d[j]["cells"]:
                        return ("L2-overlap", R, C, sorted(live))
            term = [comb(len(d), k) for k in range(len(d) + 1)]
        else:
            d = [s for s in sq if s[s["f"]][0] in T0 and s[s["f"]][1] in T0]
            nb = {i: [j for j in range(len(d)) if j != i and d[i]["cells"] & d[j]["cells"]] for i in range(len(d))}
            if any(len(v) > 1 for v in nb.values()):
                return ("P7-degree", R, C, sorted(live))
            npair = sum(1 for v in nb.values() if v) // 2
            nsing = len(d) - 2 * npair
            term = [1]
            for factor in [[1, 1]] * nsing + [[1, 2]] * npair:
                term = [sum(term[i] * factor[k - i] for i in range(len(term)) if 0 <= k - i < 2) for k in range(len(term) + 1)]
        for k, cnt in enumerate(term):
            poly[k] += cnt
    while len(poly) > 1 and poly[-1] == 0:
        poly.pop()
    zt = zt + [0] * (len(poly) - len(zt))
    poly = poly + [0] * (len(zt) - len(poly))
    if zt != poly:
        return (kind + "-P", R, C, sorted(live), zt, poly)
    return ("ok", sum((-1) ** k * z for k, z in enumerate(zt)))


def subsets(R, C, rng, k, probs=(0.1, 0.25, 0.4)):
    cells = [(r, c) for r in range(R) for c in range(C)]
    n = len(cells)
    if k is None:
        for m in range(1 << n):
            if (n - bin(m).count("1")) % 2 == 0:
                yield frozenset(cells[i] for i in range(n) if not m >> i & 1)
    else:
        for i in range(k):
            p = probs[i % len(probs)]
            rem = [v for v in cells if rng.random() < p]
            if (n - len(rem)) % 2:
                rem.append(rng.choice([v for v in cells if v not in rem]))
            yield frozenset(cells) - frozenset(rem)


def run(pool, label, fn, jobs):
    n = bad = 0
    zm1 = []
    first = None
    for res in pool.imap_unordered(fn, jobs, chunksize=64):
        n += 1
        if res[0] != "ok":
            bad += 1
            first = first or res
        else:
            zm1.append(res[-1])
    neg = sum(1 for z in zm1 if z < 0)
    print(f"{label}: {n} subgraphs, failures {bad}, negative Z(-1) {neg}" + (f", first failure {first}" if first else ""))
    sys.stdout.flush()
    return bad


def lemma_odd():
    out = []
    for W in (3, 5, 7):
        squares = [(r, c) for r in range(2) for c in range(W)]
        hit = 0
        for assign in product("hv", repeat=2 * W):
            f = dict(zip(squares, assign))
            stacked = any(f[(0, c)] == "h" and f[(1, c)] == "h" for c in range(W))
            side = any(f[(r, c)] == "v" and f[(r, (c + 1) % W)] == "v" for r in range(2) for c in range(W))
            hit += stacked or side
        out.append((W, 4 ** W, hit))
    return out


def witness(W):
    edges, squares = board(3, W, False, True)
    res = {}
    for kind, live, chosen in (
        ("stacked h", frozenset((r, c) for r in range(3) for c in (0, 1)), {(0, 0): "h", (1, 0): "h"}),
        ("side-by-side v", frozenset((r, c) for r in range(2) for c in (0, 1, 2)), {(0, 0): "v", (0, 1): "v"}),
    ):
        sq = [s for s in squares if s["cells"] <= live]
        Z = {}
        A = {}
        for T in matchings(live, edges):
            xs = [s for s in sq if s["x"][0] in T and s["x"][1] in T]
            Z[len(xs)] = Z.get(len(xs), 0) + 1
            if not xs:
                d = sum(1 for s in sq if s["q"] in chosen and s[chosen[s["q"]]][0] in T and s[chosen[s["q"]]][1] in T)
                A[d] = A.get(d, 0) + 1
        deg = max(list(Z) + list(A))
        zt = [Z.get(k, 0) for k in range(deg + 1)]
        at = [sum(A.get(j, 0) * comb(j, k) for j in range(k, deg + 1)) for k in range(deg + 1)]
        res[kind] = (zt, at)
    return res


SECTIONS = ("even-a", "even-b", "full", "odd", "ng")


if __name__ == "__main__":
    section = sys.argv[1] if len(sys.argv) > 1 else ""
    if section not in SECTIONS:
        sys.exit(f"usage: python3 check.py {{{'|'.join(SECTIONS)}}} [workers, default 2]")
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    rng = random.Random({"even-a": 20261123, "even-b": 20261124, "odd": 20261125}.get(section, 0))
    fails = 0
    with Pool(workers) as pool:
        if section == "even-a":
            print("Even periods and open boards: checks S, D, B, P")
            classes = [
                ("open 3x4 all", 3, 4, False, False, None),
                ("open 4x4 all", 4, 4, False, False, None),
                ("open 4x5 random", 4, 5, False, False, 3000),
                ("open 5x6 random", 5, 6, False, False, 600),
                ("cylinder W4xL3 all", 3, 4, False, True, None),
                ("cylinder W4xL4 all", 4, 4, False, True, None),
                ("cylinder W6xL3 random", 3, 6, False, True, 3000),
                ("cylinder W6xL4 random", 4, 6, False, True, 600),
                ("torus 4x4 all", 4, 4, True, True, None),
            ]
        elif section == "even-b":
            print("Even periods, tori with more cells, 40 to 50% of cells removed: checks S, D, B, P")
            classes = [
                ("torus W4xL6 random", 6, 4, True, True, 200),
                ("torus W6xL4 random", 4, 6, True, True, 200),
                ("torus 6x6 random", 6, 6, True, True, 100),
            ]
        else:
            classes = []
        for label, R, C, prow, pcol, k in classes:
            probs = (0.4, 0.5) if section == "even-b" else (0.1, 0.25, 0.4)
            jobs = [(R, C, prow, pcol, live) for live in subsets(R, C, rng, k, probs)]
            fails += run(pool, label, check_even, jobs)
        if section == "full":
            print("Full boards: checks S, D, B, P")
            full = [(R, C, False, False) for R, C in [(2, 2), (2, 4), (2, 8), (3, 4), (3, 6), (4, 4), (4, 6), (2, 16)]]
            full += [(L, W, False, True) for W, L in [(4, 2), (4, 6), (6, 2), (6, 4), (8, 2), (8, 3)]]
            full += [(L, W, True, True) for W, L in [(4, 4)]]
            for R, C, prow, pcol in full:
                res = check_even((R, C, prow, pcol, frozenset((r, c) for r in range(R) for c in range(C))))
                fails += res[0] != "ok"
                kind = "torus" if prow else ("cylinder" if pcol else "open")
                print(f"full {kind} rows {R} cols {C}: {res[0]}, tilings {res[1] if res[0] == 'ok' else '-'}, Z(-1) {res[2] if res[0] == 'ok' else '-'}")
                sys.stdout.flush()
        if section == "odd":
            print("Odd circumference, length 2 (always h): check L2")
            for W in (3, 5, 7):
                res = check_odd((2, W, False, True, frozenset((r, c) for r in range(2) for c in range(W)), "L2"))
                fails += res[0] != "ok"
                print(f"full cylinder W{W}xL2: {res[0]}, Z(-1) = {res[1] if res[0] == 'ok' else '-'}")
                jobs = [(2, W, False, True, live, "L2") for live in subsets(2, W, rng, None)]
                fails += run(pool, f"cylinder W{W}xL2 all", check_odd, jobs)
            print("Odd circumference, checkerboard with seam conflicts: check P7")
            for label, R, C, prow, pcol, k in [
                ("cylinder W3xL4 all", 4, 3, False, True, None),
                ("cylinder W5xL3 all", 3, 5, False, True, None),
                ("cylinder W5xL4 random", 4, 5, False, True, 600),
                ("cylinder W7xL3 random", 3, 7, False, True, 600),
            ]:
                jobs = [(R, C, prow, pcol, live, "P7") for live in subsets(R, C, rng, k)]
                fails += run(pool, label, check_odd, jobs)
    if section == "ng":
        print("Odd circumference, impossibility lemma: check NG")
        for W, total, hit in lemma_odd():
            fails += hit != total
            print(f"W{W}: assignments {total}, with stacked h or side-by-side v {hit}")
        for W in (3, 5, 7):
            for kind, (zt, at) in witness(W).items():
                fails += zt == at
                print(f"W{W} witness {kind}: Z(t) coefficients {zt}, A(1+t) coefficients {at}, differ {zt != at}")
    print(f"TOTAL failures {fails}")
