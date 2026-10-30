"""No Pfaffian orientation for king boards with both sides >= 3 (Theorem 2.1 of the paper).

usage: python3 src/pfaff_rigor.py > out/out_pfaff.txt

A graph G has a Pfaffian orientation iff there is x in GF(2)^E with
  sum_{e in M + M0} x_e = sgn0(M) + sgn0(M0)   for every perfect matching M,
where sgn0 is the sign of the Pfaffian term of M under the reference orientation (low -> high
vertex index) and x_e = 1 reverses e. Inconsistency of any subset of these equations proves
that G is not Pfaffian.

Inheritance check: fix a perfect matching R of B(K, L) minus a corner copy of B(3, 4) (or
B(4, 3)), enumerate only the perfect matchings of B(K, L) that contain R, and test the
resulting subsystem. Inconsistent subsystem => B(K, L) not Pfaffian (directly, without
quoting the conformal-subgraph theorem).

Brick check: B(3, 4) is 3-connected and bicritical, i.e. a brick in the sense of Norine and Thomas
(Combinatorica 28 (2008), Lemma 3.5), with the Petersen graph (a brick) and the cube (bipartite, not
bicritical) as controls.
"""
import itertools, sys, time


STEPS = {'king': ((0, 1), (1, -1), (1, 0), (1, 1)), 'tri': ((0, 1), (1, 0), (1, 1)), 'sq': ((0, 1), (1, 0))}


def king(K, L, cells=None, lattice='king'):
    V = [(r, c) for r in range(K) for c in range(L)] if cells is None else sorted(cells)
    S = set(V)
    idx = {v: i for i, v in enumerate(V)}
    E = []
    for (r, c) in V:
        for dr, dc in STEPS[lattice]:
            u = (r + dr, c + dc)
            if u in S:
                a, b = idx[(r, c)], idx[u]
                E.append((min(a, b), max(a, b)))
    return V, idx, E


def perfect_matchings(n, E, forced=()):
    """All perfect matchings (as edge-index lists) containing the edge indices in `forced`."""
    adj = [[] for _ in range(n)]
    for ei, (a, b) in enumerate(E):
        adj[a].append((b, ei))
        adj[b].append((a, ei))
    used = [False] * n
    cur = list(forced)
    for ei in forced:
        a, b = E[ei]
        used[a] = used[b] = True

    def rec(i):
        while i < n and used[i]:
            i += 1
        if i == n:
            yield list(cur)
            return
        used[i] = True
        for j, ei in adj[i]:
            if not used[j]:
                used[j] = True
                cur.append(ei)
                yield from rec(i + 1)
                cur.pop()
                used[j] = False
        used[i] = False
    yield from rec(0)


def term_sign(M, E, n):
    """Parity (0/1) of the permutation (a1 b1 a2 b2 ...) -> (0 1 2 ...), computed by inversions."""
    seq = []
    for ei in sorted(M, key=lambda e: E[e][0]):
        seq += [E[ei][0], E[ei][1]]
    inv = 0
    for i in range(len(seq)):
        for j in range(i + 1, len(seq)):
            inv += seq[i] > seq[j]
    return inv & 1


def consistent(matchings, E, n):
    it = iter(matchings)
    M0 = next(it)
    m0 = 0
    for e in M0:
        m0 |= 1 << e
    p0 = term_sign(M0, E, n)
    piv = {}
    cnt = 1
    for M in it:
        cnt += 1
        m, b = m0, p0
        for e in M:
            m ^= 1 << e
        b ^= term_sign(M, E, n)
        while m:
            h = m.bit_length() - 1
            if h in piv:
                pm, pb = piv[h]
                m ^= pm
                b ^= pb
            else:
                piv[h] = (m, b)
                break
        if m == 0 and b == 1:
            return False, cnt, len(piv)
    return True, cnt, len(piv)


def full(K, L, lattice='king'):
    V, idx, E = king(K, L, lattice=lattice)
    return consistent(perfect_matchings(len(V), E), E, len(V))


def inherit(K, L):
    """Subsystem: matchings of B(K, L) that agree with a fixed domino tiling outside a corner
    B(3, 4) (L even) or B(4, 3) (L odd, K even)."""
    V, idx, E = king(K, L)
    eid = {e: i for i, e in enumerate(E)}
    if L % 2 == 0:
        kr, kc = 3, 4
    else:
        assert K % 2 == 0
        kr, kc = 4, 3
    forced = []
    for r in range(K):
        for c in range(L):
            if r < kr and c < kc:
                continue
            if r < kr:                       # right of the corner: horizontal dominoes
                if (c - kc) % 2 == 0:
                    forced.append((idx[(r, c)], idx[(r, c + 1)]))
            elif L % 2 == 0:                 # below the corner, L even: horizontal
                if c % 2 == 0:
                    forced.append((idx[(r, c)], idx[(r, c + 1)]))
            else:                            # below the corner, L odd, K - 4 even: vertical
                if (r - kr) % 2 == 0:
                    forced.append((idx[(r, c)], idx[(r + 1, c)]))
    fe = [eid[(min(a, b), max(a, b))] for a, b in forced]
    assert 2 * len(fe) + kr * kc == K * L
    return consistent(perfect_matchings(len(V), E, fe), E, len(V))


def is_brick(n, E):
    """(3-connected, bicritical): G - S connected for |S| <= 2, and G - u - v has a perfect matching."""
    def sub(drop):
        new = {v: j for j, v in enumerate(i for i in range(n) if i not in drop)}
        return len(new), [(new[a], new[b]) for a, b in E if a in new and b in new]

    def connected(m, F):
        adj = [[] for _ in range(m)]
        for a, b in F:
            adj[a].append(b)
            adj[b].append(a)
        seen, todo = {0}, [0]
        while todo:
            for j in adj[todo.pop()]:
                if j not in seen:
                    seen.add(j)
                    todo.append(j)
        return len(seen) == m
    con = n >= 4 and all(connected(*sub(set(S))) for k in range(3) for S in itertools.combinations(range(n), k))
    bic = all(next(perfect_matchings(*sub({u, v})), None) is not None for u, v in itertools.combinations(range(n), 2))
    return con, bic


if __name__ == '__main__':
    V, idx, E = king(3, 4)
    print(f'B(3,4): {len(E)} edges, {sum(1 for _ in perfect_matchings(len(V), E))} perfect matchings')
    print('== full system (all perfect matchings; Z is printed only when the system is consistent)')
    for K, L in [(2, L) for L in range(2, 13)] + [(3, 4), (4, 3), (3, 6), (4, 4), (4, 5), (4, 6)]:
        t = time.time()
        ok, cnt, rank = full(K, L)
        print(f'B({K},{L}): Z = {cnt if ok else ">=" + str(cnt)} rank {rank}  Pfaffian: {ok}  ({time.time() - t:.1f}s)', flush=True)
    print('== controls: planar square and triangular boards must be Pfaffian')
    for lat, K, L in [('sq', 4, 4), ('sq', 4, 6), ('sq', 5, 6), ('tri', 3, 4), ('tri', 4, 4), ('tri', 4, 6), ('tri', 5, 6)]:
        ok, cnt, rank = full(K, L, lat)
        print(f'{lat} B({K},{L}): Z = {cnt} rank {rank}  Pfaffian: {ok}', flush=True)
        assert ok
    print('== conformal corner subsystem (43 matchings each)')
    for K, L in [(3, 4), (5, 6), (6, 5), (6, 7), (7, 8), (8, 9), (10, 11), (11, 12), (3, 10), (10, 3), (4, 9)]:
        t = time.time()
        ok, cnt, rank = inherit(K, L)
        print(f'B({K},{L}) via corner: matchings used {cnt}, rank {rank}, consistent: {ok}  ({time.time() - t:.1f}s)', flush=True)
    # genus lower bound from Euler: E <= 3(V - 2 + 2g)
    print('== edge count and Euler genus bound')
    for K, L in [(3, 4), (4, 4), (8, 8), (24, 24), (24, 100)]:
        V, idx, E = king(K, L)
        assert len(E) == 4 * K * L - 3 * K - 3 * L + 2
        g = (len(E) - 3 * len(V) + 6) / 6
        print(f'B({K},{L}): V={len(V)} E={len(E)} = 4KL-3K-3L+2; g >= {g:.3f} -> ceil {max(0, -(-(len(E) - 3 * len(V) + 6) // 6))}')
    print('== brick check (Norine-Thomas, Lemma 3.5): 3-connected and bicritical')
    petersen = [(i, (i + 1) % 5) for i in range(5)] + [(i, i + 5) for i in range(5)] + [(5 + i, 5 + (i + 2) % 5) for i in range(5)]
    cube = [(a, a ^ 1 << k) for a in range(8) for k in range(3) if a < a ^ 1 << k]
    for name, n, E in [('Petersen', 10, petersen), ('cube Q3', 8, cube)] + [(f'B({K},{L})', K * L, king(K, L)[2]) for K, L in ((3, 4), (4, 4))]:
        con, bic = is_brick(n, E)
        print(f'{name}: V={n} E={len(E)} 3-connected: {con}  bicritical: {bic}  brick: {con and bic}')
