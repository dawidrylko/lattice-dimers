"""Explicit graphs and brute-force perfect matchings (no transfer matrix).

Vertices of a K x L board are (r, c), r < K rows, c < L columns, numbered
r*L + c. The king's graph joins cells at king distance 1; 'sq' keeps only the
horizontal and vertical edges, 'tri' adds the down-right diagonal. On the
cylinder (L >= 3) column c is identified with c + L.
"""
from functools import lru_cache

STEPS = {
    "king": [(0, 1), (1, -1), (1, 0), (1, 1)],
    "sq": [(0, 1), (1, 0)],
    "tri": [(0, 1), (1, 0), (1, 1)],
}


def board_edges(K, L, lattice="king", cyl=False):
    """Sorted list of edges (u, v), u < v, of the board; asserts no multi-edges."""
    if cyl:
        assert L >= 3
    edges = set()
    for r in range(K):
        for c in range(L):
            for dr, dc in STEPS[lattice]:
                r2, c2 = r + dr, c + dc
                if cyl:
                    c2 %= L
                elif not 0 <= c2 < L:
                    continue
                if r2 >= K:
                    continue
                u, v = r * L + c, r2 * L + c2
                assert u != v
                e = (min(u, v), max(u, v))
                assert e not in edges, ("multi-edge", K, L, e)
                edges.add(e)
    return sorted(edges)


def adjacency(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    return adj


def count_matchings(n, edges):
    """Number of perfect matchings: match the lowest free vertex, memoised on the free set."""
    adj = [0] * n
    for u, v in edges:
        adj[u] |= 1 << v
        adj[v] |= 1 << u

    @lru_cache(maxsize=None)
    def f(free):
        if free == 0:
            return 1
        v = (free & -free).bit_length() - 1
        rest = free & ~(1 << v)
        cand = adj[v] & rest
        tot = 0
        while cand:
            b = cand & -cand
            tot += f(rest & ~b)
            cand ^= b
        return tot

    res = f((1 << n) - 1)
    f.cache_clear()
    return res


def all_matchings(n, edges):
    """List of all perfect matchings, each a sorted tuple of edge indices."""
    eidx = {e: i for i, e in enumerate(edges)}
    adj = adjacency(n, edges)
    out = []

    def rec(free, cur):
        if not free:
            out.append(tuple(sorted(cur)))
            return
        v = min(free)
        for u in adj[v]:
            if u in free:
                cur.append(eidx[(min(u, v), max(u, v))])
                rec(free - {u, v}, cur)
                cur.pop()

    rec(frozenset(range(n)), [])
    return out


def Z_brute(K, L, lattice="king", cyl=False):
    if K * L % 2:
        return 0
    if K == 0 or L == 0:
        return 1
    return count_matchings(K * L, board_edges(K, L, lattice, cyl))
