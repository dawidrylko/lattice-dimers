"""Theorem 2.1: Pfaffian orientations of king boards B(K, L).

For a board, all perfect matchings are enumerated. Under the reference
orientation D0 (every edge from the lower to the higher vertex number) the
Pfaffian sign of a matching {(u1, v1), ..., (un, vn)}, ui < vi, is the sign of
the permutation u1 v1 u2 v2 ... un vn. Reversing the edge set X multiplies it by
(-1)^|X cap M|, so a Pfaffian orientation exists iff the GF(2) system
    sum_{e in M} x_e + sum_{e in M0} x_e = eps(M) + eps(M0)   for all M
is solvable. Solvable: the solution is turned into an orientation, all
matchings are re-signed from scratch, and det(A) = Z^2 is checked with exact
integer (Bareiss) elimination. Unsolvable: a certificate (a set S of equations
whose left sides cancel and whose right sides sum to 1) is extracted and
verified separately.

Run: python3 pfaff.py > out/pfaff.txt
"""
import graphs


def perm_parity(seq):
    seen, par = [False] * len(seq), 0
    pos = {v: i for i, v in enumerate(sorted(seq))}
    perm = [pos[v] for v in seq]
    for i in range(len(perm)):
        if not seen[i]:
            j, cyc = i, 0
            while not seen[j]:
                seen[j] = True
                j = perm[j]
                cyc += 1
            par ^= (cyc - 1) & 1
    return par


def eps(matching, edges, flip=0):
    """Pfaffian sign exponent of a matching (tuple of edge indices) under D0 with edges in 'flip' reversed."""
    seq = []
    for i in matching:
        u, v = edges[i]
        seq += [u, v]
    return perm_parity(seq) ^ (bin(flip & sum(1 << i for i in matching)).count("1") & 1)


def solve_gf2(rows):
    """rows: list of (mask, rhs). Returns ('ok', x) or ('bad', certificate set, prefix length)."""
    pivots = {}  # pivot bit -> (mask, rhs, combo)
    for idx, (mask, rhs) in enumerate(rows):
        combo = 1 << idx
        while mask:
            b = mask.bit_length() - 1
            if b not in pivots:
                break
            pm, pr, pc = pivots[b]
            mask ^= pm
            rhs ^= pr
            combo ^= pc
        if mask:
            pivots[mask.bit_length() - 1] = (mask, rhs, combo)
        elif rhs:
            return "bad", combo, idx + 1
    x = 0
    for b in sorted(pivots):  # back substitution, lowest pivot first
        mask, rhs, _ = pivots[b]
        rest = mask & ~(1 << b)
        val = rhs ^ (bin(rest & x).count("1") & 1)
        if val:
            x |= 1 << b
    return "ok", x, len(pivots)


def det_int(M):
    """Exact determinant by Bareiss fraction-free elimination."""
    M = [row[:] for row in M]
    n, sign, prev = len(M), 1, 1
    for k in range(n - 1):
        if M[k][k] == 0:
            for i in range(k + 1, n):
                if M[i][k]:
                    M[k], M[i] = M[i], M[k]
                    sign = -sign
                    break
            else:
                return 0
        for i in range(k + 1, n):
            for j in range(k + 1, n):
                M[i][j] = (M[i][j] * M[k][k] - M[i][k] * M[k][j]) // prev
        prev = M[k][k]
    return sign * M[n - 1][n - 1]


def analyse(K, L):
    edges = graphs.board_edges(K, L)
    n = K * L
    ms = graphs.all_matchings(n, edges)
    Z = graphs.Z_brute(K, L)
    assert len(ms) == Z
    m0 = ms[0]
    e0 = eps(m0, edges)
    m0mask = sum(1 << i for i in m0)
    rows = []
    for m in ms:
        mask = sum(1 << i for i in m) ^ m0mask
        rows.append((mask, eps(m, edges) ^ e0))
    res = solve_gf2(rows)
    if res[0] == "ok":
        x = res[1]
        signs = {eps(m, edges, x) for m in ms}
        A = [[0] * n for _ in range(n)]
        for i, (u, v) in enumerate(edges):
            s = -1 if x >> i & 1 else 1
            A[u][v], A[v][u] = s, -s
        d = det_int(A)
        ok = len(signs) == 1 and d == Z * Z
        return dict(K=K, L=L, E=len(edges), Z=Z, pfaffian=True, verified=ok, rank=res[2], det=d)
    combo, prefix = res[1], res[2]
    S = [i for i in range(len(ms)) if combo >> i & 1]
    lhs = 0
    rhs = 0
    for i in S:  # independent check of the certificate
        lhs ^= sum(1 << j for j in ms[i]) ^ m0mask
        rhs ^= eps(ms[i], edges) ^ e0
    ok = lhs == 0 and rhs == 1
    return dict(K=K, L=L, E=len(edges), Z=Z, pfaffian=False, verified=ok, cert_size=len(S), prefix=prefix)


def main():
    print("board    E        Z  Pfaffian  verified  detail")
    boards = [(1, L) for L in range(2, 13, 2)] + [(2, L) for L in range(1, 13)]
    boards += [(3, 4), (3, 6), (3, 8), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (5, 6), (6, 5)]
    allok = True
    for K, L in boards:
        r = analyse(K, L)
        expect = min(K, L) <= 2
        good = r["verified"] and r["pfaffian"] == expect
        allok &= good
        if r["pfaffian"]:
            detail = f"rank {r['rank']}, det = Z^2 = {r['det']}"
        else:
            detail = f"inconsistent after {r['prefix']} equations (enumeration order), certificate of {r['cert_size']} equations"
        print(f"B({K},{L})".ljust(8), f"{r['E']:3d} {r['Z']:8d}  {str(r['pfaffian']):8s}  {str(r['verified']):8s}  {detail}"
              + ("" if good else "  <-- CONTRADICTS Theorem 2.1"))
    print("\nall boards agree with Theorem 2.1 (Pfaffian iff min(K, L) <= 2):", allok)
    E = len(graphs.board_edges(3, 4))
    print(f"B(3,4): {E} edges, {graphs.Z_brute(3, 4)} perfect matchings (paper: 29 edges, 43 matchings)")
    print("genus bound at 24 x 24: ceil(((24-3)*(24-3) - 1)/6) =", -(-((21 * 21) - 1) // 6), "(paper: 74)")


if __name__ == "__main__":
    main()
