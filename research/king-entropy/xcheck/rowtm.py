"""Row-to-row transfer matrix, built column by column (a second algorithm).

State of a row boundary: the set A of cells of the next row already covered
from the row above (a bitmask of w bits). T[A][B] counts the ways to cover the
cells of a row that are not in A by horizontal dimers inside the row and by
dimers into the next row whose lower ends are exactly the set B.
"""
from collections import defaultdict

from graphs import STEPS


def row_transitions(w, A, lattice="king", cyl=False):
    """dict B -> number of ways, for one row with pre-covered set A."""
    downs = [dc for dr, dc in STEPS[lattice] if dr == 1]
    horiz = (0, 1) in STEPS[lattice]
    starts = [(A, 0)]  # (consumed cells of this row, down mask)
    if cyl and horiz and not (A >> 0 & 1) and not (A >> (w - 1) & 1):
        starts.append((A | 1 | (1 << (w - 1)), 0))  # wrap-around horizontal dimer
    out = defaultdict(int)
    for used0, down0 in starts:
        states = {(used0, down0): 1}
        for c in range(w):
            new = defaultdict(int)
            for (used, down), cnt in states.items():
                if used >> c & 1:
                    new[(used, down)] += cnt
                    continue
                u2 = used | (1 << c)
                if horiz and c + 1 < w and not (used >> (c + 1) & 1):
                    new[(u2 | (1 << (c + 1)), down)] += cnt
                for dc in downs:
                    d = c + dc
                    if cyl:
                        d %= w
                    elif not 0 <= d < w:
                        continue
                    if not down >> d & 1:
                        new[(u2, down | (1 << d))] += cnt
            states = new
        full = (1 << w) - 1
        for (used, down), cnt in states.items():
            assert used == full
            out[down] += cnt
    return dict(out)


def transfer(w, lattice="king", cyl=False):
    return [row_transitions(w, A, lattice, cyl) for A in range(1 << w)]


def counts(w, K, lattice="king", cyl=False, T=None):
    """[Z(0, w), ..., Z(K, w)] with Python integers."""
    T = T or transfer(w, lattice, cyl)
    vec = {0: 1}
    res = [1]
    for _ in range(K):
        nv = defaultdict(int)
        for A, x in vec.items():
            for B, t in T[A].items():
                nv[B] += x * t
        vec = nv
        res.append(vec.get(0, 0))
    return res


def dense(T, w):
    import numpy as np

    M = np.zeros((1 << w, 1 << w))
    for A, row in enumerate(T):
        for B, t in row.items():
            M[A, B] = t
    return M
