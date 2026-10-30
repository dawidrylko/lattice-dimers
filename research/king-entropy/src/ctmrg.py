"""Corner transfer matrix renormalization group (CTMRG) for perfect matchings, float64.

usage: python3 src/ctmrg.py > out/out_ctmrg.txt

Encoding: one tensor a[l, u, r, d] per vertex of the square lattice. A horizontal bond (v, v+x) carries
three bits (e, D1, D2): the edge v-(v+x) itself and the two diagonals of the unit square above it,
D1 = v-(v+x+y) and D2 = (v+x)-(v+y). A vertical bond (v, v+y) carries (e, D1 of the square to its left,
D2 of the square to its right). So each diagonal is routed through one corner of its square: D1 from v
along the bottom side and up the right side, D2 from v+x along the bottom side and up the left side.
a = 1 when exactly one of the eight edges at v is occupied and the two routed bits pass straight
through (D1 from the left bond to the up bond, D2 from the right bond to the up bond); bond states that
one of the two endpoints forbids are dropped (5 horizontal, 4 vertical states for the king lattice).
The lattices are the king lattice (both diagonals), the triangular lattice (D1 only, s exact from
Kasteleyn, out_validate.txt section 4) and the square lattice (no diagonal, s = G/pi, critical).
The network is contracted in 2 x 2 blocks A of four vertices, so every block holds an even number of
sites and every rectangle of blocks has perfect matchings.

Algorithm: directional CTMRG (Orus and Vidal 2009), four corners C1..C4 and four edges T1..T4 grown
from the empty boundary, so the closed networks are real free boards. A left move inserts a column of
blocks and truncates the new vertical bonds to chi states with oblique projectors from the two left
quadrants (Corboz et al. 2014; singular values below CUT * the largest dropped); rotating the network
turns it into the other three moves, one cycle is all four. s = log(Z1 Zc / (Zh Zv)) / 4 from the four
closed networks (with the centre block, corners only, without the middle row, without the middle
column), which cancels the surface and corner terms. sigma and kappa from log Z of the squares.

Output: 1. encoding check against src/tm.py counts, 2. s by chi for king, tri, sq, 3. convergence in
cycles, 4. float64 floor at chi = 64, 5. finite king boards against the exact counts of
zex_king_free_*.json, 6. sigma and kappa by chi against surface.json and corner.json. About 2 to 4 minutes,
peak RSS under 1 GiB.
"""
import itertools, json, time
import numpy as np
from mpmath import catalan, pi, mp, mpf, log
from paths import P, G

mp.dps = 30                                   # the log scales of the tensors are summed in 30 digits
CUT = 1e-14


def site(lat):
    """2 x 2 block A[L, U, R, D] of the vertex tensors of lattice lat ('king', 'tri', 'sq')."""
    n1, n2 = lat in ('king', 'tri'), lat == 'king'
    a = np.zeros((8,) * 4)
    for l, u, r, d in itertools.product(range(8), repeat=4):
        L, U, R, D = [(s & 1, s >> 1 & 1, s >> 2 & 1) for s in (l, u, r, d)]
        if not n1 and L[1] + U[1] + R[1] + D[1] or not n2 and L[2] + U[2] + R[2] + D[2]:
            continue
        if U[1] == L[1] and U[2] == R[2] and L[0] + L[2] + R[0] + R[1] + U[0] + D[0] + D[1] + D[2] == 1:
            a[l, u, r, d] = 1
    nz = np.nonzero(a)
    h, v = sorted(set(nz[0]) & set(nz[2])), sorted(set(nz[1]) & set(nz[3]))
    a = a[np.ix_(h, v, h, v)]
    A = np.einsum('abcd,cefg,hijb,jkle->ahikfldg', a, a, a, a)
    return A.reshape(len(h) ** 2, len(v) ** 2, len(h) ** 2, len(v) ** 2)


class CTM:
    """C[k][a, b], T[k][a, p, b], k = 0..3 clockwise from the top left; a and b run clockwise.
    Each tensor is stored normalized to max |entry| = 1 with its log scale in lc, lt."""

    def __init__(self, A):
        self.A = A
        self.C = [np.ones((1, 1)) for _ in range(4)]
        self.T = []
        for p in (A.shape[1], A.shape[2], A.shape[3], A.shape[0]):
            t = np.zeros((1, p, 1)); t[0, 0, 0] = 1; self.T.append(t)
        self.lc, self.lt, self.depth = [mpf(0)] * 4, [mpf(0)] * 4, [0] * 4

    def rotate(self):
        r = lambda x: [x[3], x[0], x[1], x[2]]
        self.C, self.T, self.lc, self.lt, self.depth = map(r, (self.C, self.T, self.lc, self.lt, self.depth))
        self.A = self.A.transpose(3, 0, 1, 2)

    def left(self, chi):
        C1, C2, C3, C4 = self.C; T1, T2, T3, T4 = self.T; A = self.A
        C1T1 = np.tensordot(C1, T1, (1, 0))                                   # x u b
        C4T3 = np.tensordot(T3, C4, (2, 0))                                   # e d y
        nv = T4.shape[0] * A.shape[3]
        if nv <= chi:
            Pd = Pu = np.eye(nv); err = 0.0
        else:
            Q1 = np.tensordot(np.tensordot(C1T1, T4, (0, 2)), A, ([3, 0], [0, 1]))      # b c r d
            Q1 = Q1.transpose(1, 3, 0, 2).reshape(nv, -1)
            Q4 = np.tensordot(np.tensordot(C4T3, T4, (2, 0)), A, ([2, 1], [0, 3]))      # e f u r
            Q4 = Q4.transpose(1, 2, 0, 3).reshape(nv, -1)
            U, S, Vt = np.linalg.svd(Q1.T @ Q4, full_matrices=False)
            k = min(chi, int(np.sum(S > CUT * S[0])))
            w = 1 / np.sqrt(S[:k])
            Pd, Pu = Q4 @ Vt[:k].T * w, ((U[:, :k] * w).T @ Q1.T).T          # Pd under the upper part, Pu over the lower
            err = S[k:].sum() / S.sum()
        nC1 = Pd.T @ C1T1.reshape(nv, -1)
        w = np.tensordot(Pd.reshape(T4.shape[0], A.shape[3], -1), T4, (0, 0))          # d k q x
        w = np.tensordot(w, A, ([2, 0], [0, 3]))                                         # k x u r
        nT4 = np.tensordot(w, Pu.reshape(T4.shape[2], A.shape[1], -1), ([1, 2], [0, 1]))
        nC4 = C4T3.transpose(0, 2, 1).reshape(-1, nv) @ Pu
        for X, ell, (lst, i) in ((nC1, self.lc[0] + self.lt[0], ('C', 0)), (nT4, self.lt[3], ('T', 3)),
                                 (nC4, self.lc[3] + self.lt[2], ('C', 3))):
            m = np.abs(X).max()
            getattr(self, lst)[i] = X / m
            (self.lc if lst == "C" else self.lt)[i] = ell + log(mpf(m))
        self.depth[3] += 1
        return err

    def cycle(self, chi):
        err = 0.0
        for _ in range(4):
            err = max(err, self.left(chi)); self.rotate()
        return err

    def zs(self):
        """The four closed networks of the normalized tensors: Z1 (with the centre block), Zc (corners
        only), Zh (without the middle row), Zv (without the middle column)."""
        C1, C2, C3, C4 = self.C; T1, T2, T3, T4 = self.T; A = self.A
        up = np.tensordot(np.tensordot(C1, T1, (1, 0)), C2, (2, 0))           # a p d
        dn = np.tensordot(np.tensordot(C3, T3, (1, 0)), C4, (2, 0))           # e r h
        w = np.tensordot(up, T4, (0, 2))                                      # p d h s
        w = np.tensordot(w, A, ([0, 3], [1, 0]))                              # d h q r
        w = np.tensordot(w, T2, ([0, 2], [0, 1]))                             # h r e
        z1 = np.tensordot(w, dn, ([0, 1, 2], [2, 1, 0]))
        zc = np.trace(C1 @ C2 @ C3 @ C4)
        zh = np.tensordot(up, dn, ([0, 1, 2], [2, 1, 0]))
        zv = np.tensordot(np.tensordot(C1 @ C2, T2, (1, 0)), np.tensordot(C3 @ C4, T4, (1, 0)), ([0, 1, 2], [2, 1, 0]))
        return z1, zc, zh, zv

    def logs(self):
        """log Z of the four closed networks Z1, Zc, Zh, Zv, and their sizes in sites (columns, rows)."""
        z1, zc, zh, zv = self.zs()
        lc, (l1, l2, l3, l4) = sum(self.lc), self.lt
        dT, dR, dB, dL = self.depth
        W, H = 2 * (1 + dL + dR), 2 * (1 + dT + dB)
        return [(lc + l1 + l2 + l3 + l4 + np.log(z1), (W, H)), (lc + np.log(zc), (W - 2, H - 2)),
                (lc + l1 + l3 + np.log(zh), (W, H - 2)), (lc + l2 + l4 + np.log(zv), (W - 2, H))]

    def s(self):
        """s per site; the log scales cancel, so only the normalized tensors enter."""
        z1, zc, zh, zv = self.zs()
        return np.log(z1 * zc / (zh * zv)) / 4


def run(lat, chi, ncyc, stop=False):
    """ncyc cycles at bond dimension chi (fewer with stop: once s changes by less than 1e-15 in two
    cycles in a row, from cycle 8 on). Returns s after each cycle, log Z of every closed board, the
    largest discarded weight of the last cycle and the wall time."""
    t = time.time()
    E, hist, F = CTM(site(lat)), [], {}
    for c in range(ncyc):
        err = E.cycle(chi)
        hist.append(mpf(E.s()))
        for l, wh in E.logs():
            F[wh] = l
        if stop and c >= 7 and abs(hist[-1] - hist[-2]) < 1e-15 and abs(hist[-2] - hist[-3]) < 1e-15:
            break
    return hist, F, err, time.time() - t


def exact_king():
    """Exact counts Z[(columns, rows)] of free king boards (zex_king_free_*.json, zexact.py)."""
    Z = {}
    for fn in G('zex_king_free_m*_K*.json'):
        d = json.load(open(P(fn)))
        for k, z in enumerate(d['Z']):
            if int(z):
                Z[k, d['m']] = Z[d['m'], k] = int(z)
    return Z


def surface(F, s):
    """sigma_L = (s (4L + 4) - log Z(L+2, L+2) + log Z(L, L)) / 8 and kappa_L = log Z(L, L) - s L^2
    + 4 sigma L (sigma from the largest L) on the squares; log Z = s L^2 - 4 sigma L + kappa + o(1)."""
    Ls = sorted(w for (w, h) in F if w == h and (w + 2, w + 2) in F)
    sig = {L: (s * (4 * L + 4) - F[L + 2, L + 2] + F[L, L]) / 8 for L in Ls}
    kap = {L: F[L, L] - s * L * L + 4 * sig[Ls[-1]] * L for L in Ls}
    return sig, kap


if __name__ == '__main__':
    REF = {'king': mpf(json.load(open(P('errbar.json')))['recommended']['s']),
           'tri': mpf('0.428594537464959'), 'sq': catalan / pi}
    sf, cn = json.load(open(P('surface.json'))), json.load(open(P('corner.json')))
    SIG, DSIG, KAP, DKAP = (mpf(x) for x in (sf['sigma'], sf['sigma_err'], cn['kappa'], cn['kappa_err']))
    print(f'references: s_king = {mp.nstr(REF["king"], 17)} +- 6e-16 (errbar.json), s_tri = {mp.nstr(REF["tri"], 15)} '
          f'(Kasteleyn, out_validate.txt), s_sq = G/pi = {mp.nstr(REF["sq"], 17)}')
    print(f'            sigma = {mp.nstr(SIG, 16)} +- {mp.nstr(DSIG, 2)} (surface.json), '
          f'kappa = {mp.nstr(KAP, 12)} +- {mp.nstr(DKAP, 2)} (corner.json)')
    print(f'float64 (numpy {np.__version__}), CUT = {CUT:g}; sizes in sites, columns x rows')

    print('\n== 1. encoding: one cycle without truncation against exact counts (tm.count)')
    import tm
    for lat in ('king', 'tri', 'sq'):
        E = CTM(site(lat))
        E.cycle(10 ** 6)
        for l, (w, h) in E.logs():
            d = float(l - log(tm.count(h, w, lat, 'free')))
            print(f'[{"PASS" if abs(d) < 1e-13 else "FAIL"}] {lat:4s} {w}x{h}: log Z - log(exact) = {d:+.1e}')

    print('\n== 2. s per site by chi (cycles until s changes by < 1e-15 twice in a row, at most 40; sq: 200 cycles)')
    runs = {}
    for lat, chis in (('king', (8, 16, 24, 32, 48, 64)), ('tri', (8, 16, 24, 32)), ('sq', (8, 16, 32, 64))):
        for chi in chis:
            hist, F, err, t = runs[lat, chi] = run(lat, chi, 200 if lat == 'sq' else 40, stop=lat != 'sq')
            print(f'  {lat:4s} chi={chi:3d}: s = {mp.nstr(hist[-1], 17):19s} s - ref = {float(hist[-1] - REF[lat]):+.1e}'
                  f'  cycles {len(hist):3d}  last change {float(hist[-1] - hist[-2]):+.1e}'
                  f'  discarded {err:.1e}  {t:.1f}s', flush=True)

    print('\n== 3. convergence in iterations: s - ref after each cycle (board 4c+2 sites wide after c cycles)')
    for lat, chi, cs in (('king', 32, range(1, 13)), ('tri', 32, range(1, 13)), ('sq', 32, (1, 2, 5, 10, 20, 50, 100, 200))):
        hist = runs[lat, chi][0]
        print(f'  {lat:4s} chi={chi}: ' + '  '.join(f'{c}:{float(hist[c - 1] - REF[lat]):+.1e}' for c in cs if c <= len(hist)))

    print('\n== 4. float64 floor: king chi=64, 30 more cycles at the fixed point')
    hist = run('king', 64, 40)[0][10:]
    m = sum(hist) / len(hist)
    print(f'  cycles 11..40: mean s - ref = {float(m - REF["king"]):+.1e}, spread (max - min) = {float(max(hist) - min(hist)):.1e},'
          f' largest |s - ref| = {float(max(abs(h - REF["king"]) for h in hist)):.1e}')

    print('\n== 5. finite king boards: log Z of the closed networks against the exact counts (L <= 24)')
    Z = exact_king()
    big = {}
    for chi in (32, 48, 64, 80, 96):
        hist, F, err, t = big[chi] = run('king', chi, 14)
        d = [(float(F[w, h] - log(Z[h, w])), w, h) for (w, h) in F if (h, w) in Z]
        worst = max(d, key=lambda x: abs(x[0]))
        print(f'  chi={chi:3d}: {len(d)} boards, max |log Z - log(exact)| = {abs(worst[0]):.1e} ({worst[1]}x{worst[2]}), {t:.0f}s', flush=True)

    print('\n== 6. sigma and kappa from the squares L = 30..56 (boards up to 58, 14 cycles), CTMRG s of the same run')
    for chi, (hist, F, err, t) in big.items():
        sig, kap = surface(F, hist[-1])
        Ls = [L for L in sig if L >= 30]
        sv, kv = [sig[L] for L in Ls], [kap[L] for L in Ls]
        print(f'  chi={chi:3d}: sigma = {mp.nstr(sv[-1], 16)} (spread over L {float(max(sv) - min(sv)):.0e}),'
              f' sigma - paper = {float(sv[-1] - SIG):+.1e};  kappa = {mp.nstr(kv[-1], 12)} (spread {float(max(kv) - min(kv)):.0e}),'
              f' kappa - paper = {float(kv[-1] - KAP):+.1e}')
