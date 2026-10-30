"""Levels of the cylinder transfer behind the finite-size modes of the free strips and the parity splitting.

usage: python3 src/timed.py python3 log-convexity/levels.py > log-convexity/out_levels.txt 2> log-convexity/time_levels.txt

T_w(x) is the row transfer of the king cylinder of circumference w (state layout of src/tmfast.py),
orthogonal edges weight 1, both diagonals weight x. The twisted transfer T~_w(x) multiplies by -1 the
three edge types that cross the seam between column w-1 and column 0: (r, w-1)-(r, 0),
(r, 0)-(r+1, w-1) and (r, w-1)-(r+1, 0).

Closing the free strip of width k periodically along its length L and turning it by 90 degrees gives
the cylinder of circumference L with k rows whose first and last rows are free, so e0^T T_L^k e0 = sum_j c_j theta_j^k sees only the
e0-visible levels theta_j of T_L, and e0^T T~_L^k e0 = sum_j c~_j nu_j^k is the difference of the two
parity sectors of the strip. Read per unit length (L -> infinity, while L times the sector difference
is small, the first is the mean of the two sectors):
  r_+ = |theta_neg / theta_1|  leading subleading e0-visible level of T (negative at x = 1): the bulk
                               mode C (-r_+)^k of a_k - s k, with C = c_neg / (c_1 L);
  r_- = |nu_1 / theta_1|       leading e0-visible level of T~ (purely imaginary at x = 1): the mode of
                               period 4 in the free strips, factor -1/r_-^2 per two columns;
  m_v = log(theta_1 / |nu_max|) over all levels of T~ (e0-invisible at x = 1): the decay rate of the
                               splitting Delta_w of the parity sectors of the cylinder of circumference w,
                               xi = 1 / m_v.
In the second differences d_q of a_{2q} the rates are rho_+ = r_+^2 and rho_- = -r_-^2, so the
crossing x* of the companion note is where r_- = r_+. These identifications are numerical, not proved.

Sections: A controls with known answers; B unit weights; C the scan in x against Table 2 of the note,
with the gaps; D the crossing x*; E x = 3/2 with the rates fixed; F x = 2 and 3.
e0-visible levels come from Arnoldi started at e0 (the Krylov space of e0 lies in the e0-visible
subspace). Rounding leaks larger e0-invisible levels into it (the twisted +-0.445 theta_1 at x = 1), so Ritz
values whose e0-weight is below 1e-6 of the largest are dropped. Finite-w values oscillate with w mod 4.
"""
import json, os, re, sys, time
from fractions import Fraction
import numpy as np
from scipy.optimize import brentq
from scipy.sparse.linalg import LinearOperator, eigs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'src'))
import tm, tmfast
from paths import P, G
from tm import offsets

t0 = time.time()
VIS = 1e-6


def weight(d, c, w, x, twist):
    diag = d == 'E' or (d == w - 1 and c > 0) or d == w + 1 or (d == 1 and c == w - 1)
    seam = (c == 0 and d in ('E', w - 1)) or (c == w - 1 and d == 1)
    return (x if diag else 1.0) * (-1.0 if seam and twist else 1.0)


def step(v, w, c, x, twist):
    """One cell of the weighted cylinder transfer on a batch v of shape (n, 2^(w+3))."""
    n = v.shape[0]
    H = 1 << (w + 1)
    u = np.zeros_like(v)
    merge = w >= 3 and c == w - 3
    src = v.reshape(n, 2, H, 2)
    dst = u.reshape(n, 2, 2, H)
    tgt = dst[:, 0] if merge else dst[:, :, 0, :]
    tgt += src[:, :, :, 1]
    for d in offsets('king', 'cyl', w, c):
        wt = weight(d, c, w, x, twist)
        if d == 'E':
            if merge:
                dst[:, 0, 1, :] += wt * src[:, 0, :, 0]
            else:
                dst[:, 1, 0, :] += wt * src[:, 0, :, 0]
            continue
        B = 1 << (d - 1)
        s5 = v.reshape(n, 2, H // (2 * B), 2, B, 2)[:, :, :, 0, :, 0]
        d5 = u.reshape(n, 2, 2, H // (2 * B), 2, B)
        t5 = d5[:, 0, :, :, 1, :] if merge else d5[:, :, 0, :, 1, :]
        t5 += wt * s5
    return u


def row(V, w, x=1.0, twist=False):
    """Row states V of shape (n, 2^w) -> the row states after one row."""
    v = np.zeros((V.shape[0], 1 << (w + 3)))
    v[:, : 1 << w] = V
    for c in range(w):
        v = step(v, w, c, x, twist)
    assert not np.any(v[:, 1 << w:]), 'state leaked beyond the next row'
    return v[:, : 1 << w]


def dense(w, x=1.0, twist=False, chunk=512):
    """T[new, old], so that Z = e0^T T^K e0."""
    N = 1 << w
    T = np.zeros((N, N))
    for a in range(0, N, chunk):
        b = min(N, a + chunk)
        V = np.zeros((b - a, N))
        V[np.arange(b - a), np.arange(a, b)] = 1.0
        T[:, a:b] = row(V, w, x, twist).T
    return T


def arnoldi(w, x, twist, m=36):
    """Ritz values theta of T (or T~) on the Krylov space of e0 and their weights c in
    e0^T T^k e0 = sum c theta^k, sorted by modulus, Ritz values of e0-weight below VIS dropped."""
    N = 1 << w
    Q = np.zeros((m + 1, N))
    H = np.zeros((m + 1, m))
    Q[0, 0] = 1.0
    for j in range(m):
        v = row(Q[j][None, :], w, x, twist)[0]
        for _ in range(2):
            h = Q[: j + 1] @ v
            v -= h @ Q[: j + 1]
            H[: j + 1, j] += h
        H[j + 1, j] = np.linalg.norm(v)
        Q[j + 1] = v / H[j + 1, j]
    th, Y = np.linalg.eig(H[:m, :m])
    c = Y[0, :] * np.linalg.inv(Y)[:, 0]
    keep = np.abs(c) > VIS * np.max(np.abs(c))
    th, c = th[keep], c[keep]
    o = np.argsort(-np.abs(th))
    return th[o], c[o]


def visible_dense(T):
    lam, c = tmfast.e0_spectrum(T)
    keep = np.abs(c) > VIS * np.max(np.abs(c))
    lam, c = lam[keep], c[keep]
    o = np.argsort(-np.abs(lam))
    return lam[o], c[o]


def levels(w, x, m=36):
    """theta_1, theta_neg / theta_1, C, nu_1 / theta_1, C~ (weight of nu_1 per unit length)."""
    th, c = arnoldi(w, x, False, m)
    l1 = th[0].real
    rp, C = th[1] / l1, (c[1] / c[0]).real / w
    nu, cn = arnoldi(w, x, True, m)
    return l1, rp, C, nu[0] / l1, (cn[0] / c[0]).real / w


def top_modulus(w, x, twist, sector=None, k=6):
    """Largest-modulus eigenvalues of T (or T~), optionally restricted to the parity sector of |A|."""
    N = 1 << w
    mask = None
    if sector is not None:
        mask = np.array([bin(t).count('1') & 1 == sector for t in range(N)])

    def mv(v):
        v = np.asarray(v, float).reshape(1, -1)
        if mask is not None:
            v = v * mask
        u = row(v, w, x, twist)[0]
        return u * mask if mask is not None else u
    ev = eigs(LinearOperator((N, N), matvec=mv), k=k, which='LM', return_eigenvectors=False, tol=1e-13)
    return ev[np.argsort(-np.abs(ev))]


def brute(K, w, x):
    """Sum over the perfect matchings of the K x w king cylinder of x^(#diagonals), without and with the
    sign (-1)^(#seam crossings); exact, x a Fraction."""
    V = [(r, c) for r in range(K) for c in range(w)]
    idx = {v: i for i, v in enumerate(V)}
    adj = [[] for _ in V]
    for r, c in V:
        for dr, dc in ((0, 1), (1, -1), (1, 0), (1, 1)):
            rr, cc = r + dr, (c + dc) % w
            if rr < K:
                a, b = idx[(r, c)], idx[(rr, cc)]
                e = (x if dr and dc else Fraction(1), c + dc not in range(w))
                adj[a].append((b, e))
                adj[b].append((a, e))
    tot = [Fraction(0), Fraction(0)]

    def rec(used, wt, par):
        i = next((j for j in range(len(V)) if not used >> j & 1), None)
        if i is None:
            tot[0] += wt
            tot[1] += -wt if par else wt
            return
        for j, (ew, s) in adj[i]:
            if not used >> j & 1:
                rec(used | 1 << i | 1 << j, wt * ew, par ^ s)
    rec(0, Fraction(1), 0)
    return tot


def zk(T, K):
    v = np.zeros(T.shape[0])
    v[0] = 1.0
    for _ in range(K):
        v = T @ v
    return v[0]


def match(a, b):
    """Largest relative distance from each of a to the nearest of b."""
    return max(np.min(np.abs(b - z)) / abs(z) for z in a)


def ratio_log(w, x, m):
    l1, rp, C, rm, Ct = levels(w, x, m)
    return np.log(abs(rm) / abs(rp))


def modes_dq(x):
    """d_q at 2q = 2..20 for diagonal weight x, as printed in out_modes.txt."""
    txt = open(os.path.join(ROOT, 'log-convexity', 'out_modes.txt')).read()
    blk = re.search(rf'\nx = {x:g}  \(.*?\): second differences d_q at 2q = (.*)\n', txt).group(1)
    return {int(a): float(b) for a, b in re.findall(r'(\d+): ([-+0-9.e]+)', blk)}


def two_level(C, Ct, rp, rm):
    """Amplitudes P, Q of d_q = P rho_+^q + Q rho_-^q from g(2q) = C r_+^(2q) + 2 C~ (-r_-^2)^q."""
    Rp, Rm = abs(rp) ** 2, -abs(rm) ** 2
    return Rp, Rm, C * (1 - Rp) ** 2 / Rp, 2 * Ct * (1 - Rm) ** 2 / Rm


print('Levels of the king-cylinder transfer T_w(x) and of the twisted transfer T~_w(x); float64.')
print('r_+ = |theta_neg/theta_1|, C = c_neg/(c_1 w); r_- = |nu_1/theta_1|, C~ = c(nu_1)/(c_1 w), e0-visible;')
print('m_v = log(theta_1/|nu_max|) over all levels of T~; rho_+ = r_+^2, rho_- = -r_-^2.')

print('\n== A. controls with known answers')
print('A1. e0^T T^K e0 against exact counts (x = 1: tm.count) and brute force over perfect matchings,')
print('    twisted transfer against the brute-force sum of x^(#diagonals) (-1)^(#seam crossings)')
worst = 0.0
for K, w in ((4, 4), (5, 4), (6, 4), (4, 5), (3, 6), (4, 6)):
    for x in (Fraction(1), Fraction(3, 2)):
        tot, tw = brute(K, w, x)
        z, zt = zk(dense(w, float(x)), K), zk(dense(w, float(x), True), K)
        ref = tm.count(K, w, 'king', 'cyl') if x == 1 else None
        if ref is not None:
            assert ref == tot
        err = max(abs(z - float(tot)), abs(zt - float(tw))) / float(tot)
        worst = max(worst, err)
        print(f'  K={K} w={w} x={str(x):3s}: Z = {z:.6f} (brute {float(tot):.6f}'
              f'{", tm.count " + str(ref) if ref is not None else ""}), twisted {zt:.6f} (brute {float(tw):.6f})')
print(f'  largest relative deviation {worst:.1e}')
assert worst < 1e-13

print('A2. Arnoldi from e0 against the dense e0-spectrum (tmfast.e0_spectrum), leading three levels and weights')
for w in (8, 12):
    for x in (1.0, 2.0):
        for tw in (False, True):
            a, ca = arnoldi(w, x, tw)
            d, cd = visible_dense(dense(w, x, tw))
            dl, dc = match(a[:3], d), max(abs(ca[i] - cd[np.argmin(np.abs(d - a[i]))]) / abs(ca[i]) for i in range(3))
            print(f'  w={w:2d} x={x:g} {"twisted  " if tw else "untwisted"}: levels {dl:.1e}, weights {dc:.1e}')
            assert dl < 1e-10 and dc < 1e-7

print('A3. x = 1, w = 20 against the committed ARPACK run (out/out_crosscheck.txt) and power iteration')
l1, rp, C, rm, Ct = levels(20, 1.0)
eig = json.load(open(P('eig_king_cyl_w20_p0.json')))
print(f'  log theta_1 = {np.log(l1):.15f}  (data/eig/eig_king_cyl_w20_p0.json {eig["log_lambda"]:.15f})')
print(f'  theta_neg/theta_1 = {rp.real:+.10f}, in-sector gap -log r_+ = {-np.log(abs(rp)):.6f}  (committed 1.082727)')
assert abs(np.log(l1) - eig['log_lambda']) < 1e-13 and round(-np.log(abs(rp)), 6) == 1.082727

print(f'\n== B. unit weights x = 1 (w = 22 with a Krylov space of 30, else 36)')
print(f'{"w":>3} {"theta_neg/theta_1":>18} {"-log r_+":>10} {"C":>9} {"nu_1/theta_1":>16} {"1/r_-^2":>9} {"C~":>9} '
      f'{"m_v":>12} {"xi = 1/m_v":>12}')
B = {}
for w in range(8, 23, 2):
    l1, rp, C, rm, Ct = levels(w, 1.0, 30 if w > 20 else 36)
    nv = top_modulus(w, 1.0, True)
    mv = -np.log(abs(nv[0]) / l1)
    B[w] = (abs(rp), C, abs(rm), Ct, mv)
    print(f'{w:3d} {rp.real:+18.10f} {-np.log(abs(rp)):10.7f} {C:9.6f} {rm.real:+.0e}{rm.imag:+.9f}i '
          f'{1 / abs(rm) ** 2:9.5f} {Ct:9.6f} {mv:12.10f} {1 / mv:12.10f}', flush=True)
r, C, q, Ct, mv = B[22]
print(f'  largest twisted levels at w = 22 (/theta_1): ' + ', '.join(f'{z.real / l1:+.6f}' for z in nv[:4]))
dxi = [abs(1 / B[w][4] - 1 / B[w - 2][4]) for w in range(12, 23, 2)]
print('  |xi_w - xi_{w-2}|, w = 12..22: ' + ', '.join(f'{v:.1e}' for v in dxi))
print(f'  RESULT xi = 1/m_v = {1 / mv:.7f} (w = 22; change from w = 20: {dxi[-1]:.1e})')

print('B2. amplitude C against the free strips: C_k = (g(k) + 2 sigma)/(-r_+)^k for odd k (Table 4, surface.json),')
print('    with the error of -2 sigma (+-1.8e-14) divided by r_+^k; r_+, C from w = 22')
su = json.load(open(P('surface.json')))
m2s, m2e = float(su['minus_2sigma']), float(su['minus_2sigma_err'])
g = {int(k): float(v) - m2s for k, v in su['f'].items()}
for k in (17, 19, 21, 23):
    print(f'  k={k}: C_k = {g[k] / (-r) ** k:.6f} +- {m2e / r ** k:.1e}')
print(f'  C (cylinder, w = 18, 20, 22) = {B[18][1]:.6f}, {B[20][1]:.6f}, {B[22][1]:.6f}')

print('B3. two-level formula g(k) + 2 sigma = C (-r_+)^k + 2 C~ cos(pi k/2) r_-^k, all four numbers from w = 22,')
print('    against Table 4 (surface.json; its error +-1.8e-14 from -2 sigma), and the sector difference of the')
print('    free strip D(k) = log lambda^(0)_k - log lambda^(1)_k = 4 C~ cos(pi k/2) r_-^k (sec_king_free_1_18.json)')
for k in range(16, 27):
    pr = C * (-r) ** k + 2 * Ct * np.cos(np.pi * k / 2) * q ** k
    print(f'  k={k}: g + 2 sigma = {g[k]:+.6e}, formula {pr:+.6e}, ratio {g[k] / pr:.5f}')
dq1 = {k: g[k + 2] - 2 * g[k] + g[k - 2] for k in range(4, 25, 2)}
Rp, Rm, Pq, Qq = two_level(C, Ct, r, q)
for k in (20, 22, 24):
    print(f'  d_q at 2q={k}: {dq1[k]:.6e} (Table 4), formula P rho_+^q + Q rho_-^q = {Pq * Rp ** (k // 2) + Qq * Rm ** (k // 2):.6e}')
sec = json.load(open(P('sec_king_free_1_18.json')))
for k in range(10, 19, 2):
    D = sec[str(k)]['0'] - sec[str(k)]['1']
    pr = 4 * Ct * np.cos(np.pi * k / 2) * q ** k
    print(f'  D({k}) = {D:+.6e}, 4 C~ cos(pi k/2) r_-^k = {pr:+.6e}, ratio {D / pr:.5f}')

print('B4. parity splitting Delta_w of the even cylinders (data/lean/*longdouble*) against m_v of w = 22:')
print('    local prefactor exponent b_w = [log(Delta_w/Delta_{w-2}) + 2 m_v] / log(w/(w-2))')
lam = {}
for f in G('lean_king_cyl_w*_p*_longdouble.json'):
    w, p = map(int, re.search(r'_w(\d+)_p(\d)_', f).groups())
    lam[w, p] = float(json.load(open(P(f)))['log_lambda'])
Dw = {w: lam[w, 0] - lam[w, 1] for w in range(4, 26, 2) if (w, 1) in lam}
bw = {}
for w in sorted(Dw):
    if w - 2 in Dw and w >= 12:
        bw[w] = (np.log(Dw[w] / Dw[w - 2]) + 2 * mv) / np.log(w / (w - 2))
        print(f'  w={w}: Delta = {Dw[w]:.6e}, b_w = {bw[w]:+.4f}')
ws = sorted(bw)[-4:]
fit = np.polyfit([1 / w for w in ws], [bw[w] for w in ws], 1)
print(f'  b_w linear in 1/w through w = {ws[0]}..{ws[-1]}: b_inf = {fit[1]:+.4f}')

print('\n== C. equal diagonal weights x: the two rates against Table 2 of the companion note (Prony fits of')
print('   strips 2q <= 22, last window), and the gaps that a phase transition would have to close')
TABLE2 = {1.0: (0.1147, -0.0718), 1.25: (0.1433, -0.1217), 1.5: (0.1710, -0.1611), 1.75: (0.1971, -0.1938),
          2.0: (0.2214, -0.2219), 3.0: (0.3027, -0.3082)}
CX = {}
for x in TABLE2:
    for w in (14, 16, 18, 20):
        l1, rp, C, rm, Ct = levels(w, x)
        CX[x, w] = (abs(rp), C, abs(rm), Ct)
        print(f'  x={x:4.2f} w={w}: theta_neg/theta_1 = {rp.real:+.7f}, nu_1/theta_1 = {rm.real:+.0e}{rm.imag:+.7f}i, '
              f'r_-/r_+ = {abs(rm) / abs(rp):.5f}, C = {C:.5f}, C~ = {Ct:.5f}', flush=True)
    r, C, q, Ct = CX[x, 20]
    print(f'  x={x:4.2f}: w = 20 rho_+ = {r * r:.5f}, rho_- = {-q * q:.5f}, |rho_-|/rho_+ = {(q / r) ** 2:.4f}; Table 2 {TABLE2[x][0]}, {TABLE2[x][1]} '
          f'(relative difference {r * r / TABLE2[x][0] - 1:+.4f}, {q * q / -TABLE2[x][1] - 1:+.4f})')
print('  gaps at w = 16 (ARPACK): in-sector gap log(theta_1/|theta_2|) of sector 0 of T over all levels, and m_v')
for x in (1.0, 1.25, 1.5, 1.75, 1.9, 2.0, 2.1, 2.25, 2.5, 3.0):
    e0 = top_modulus(16, x, False, sector=0)
    et = top_modulus(16, x, True)
    print(f'  x={x:4.2f}: in-sector gap {np.log(abs(e0[0]) / abs(e0[1])):.4f}, m_v {np.log(abs(e0[0]) / abs(et[0])):.4f}', flush=True)

print('\n== D. the crossing x*: r_-(x) = r_+(x) at each width (brentq on log(r_-/r_+), xtol 1e-5)')
xs = {}
for w in (14, 16, 18, 20):
    xs[w] = brentq(lambda x: ratio_log(w, x, 36), 1.9, 2.2, xtol=1e-5)
    print(f'  w={w} (w mod 4 = {w % 4}): x*_w = {xs[w]:.5f}', flush=True)
xs[22] = brentq(lambda x: ratio_log(22, x, 30), 1.98, 1.99, xtol=1e-5)
print(f'  w=22 (w mod 4 = 2, Krylov space 30): x*_w = {xs[22]:.5f}', flush=True)
for m4 in (2, 0):
    seq = [xs[w] for w in sorted(xs) if w % 4 == m4]
    print(f'  w = {m4} (mod 4): ' + ', '.join(f'{v:.5f}' for v in seq) +
          (' (decreasing)' if all(a > b for a, b in zip(seq, seq[1:])) else ' (increasing)' if all(a < b for a, b in zip(seq, seq[1:])) else ''))
lo, hi = sorted((xs[20], xs[22]))
print(f'  RESULT x* in ({lo:.4f}, {hi:.4f}) if the two subsequences keep bracketing the limit')

print('\n== E. x = 3/2: d_q = P rho_+^q + Q rho_-^q with rates and amplitudes from the cylinder (no fit),')
print('   P = C (1 - rho_+)^2 / rho_+, Q = 2 C~ (1 - rho_-)^2 / rho_-, against d_q of out_modes.txt (2q <= 20)')
dm = modes_dq(1.5)
pred = {}
for w in (18, 20, 22):
    if w == 22:
        l1, rp, C, rm, Ct = levels(22, 1.5, 30)
        CX[1.5, 22] = (abs(rp), C, abs(rm), Ct)
    r, C, q, Ct = CX[1.5, w]
    Rp, Rm, Pq, Qq = two_level(C, Ct, r, q)
    pred[w] = {k: (Pq * Rp ** (k // 2), Qq * Rm ** (k // 2)) for k in range(8, 34, 2)}
    print(f'  w={w}: rho_+ = {Rp:.6f}, rho_- = {Rm:.6f}, |rho_-|/rho_+ = {-Rm / Rp:.5f}, C = {C:.5f}, C~ = {Ct:.5f}, '
          f'P = {Pq:.4f}, Q = {Qq:.4f}')
    print('    model error / size of the larger term, 2q = 12..20: ' +
          ', '.join(f'{k}: {(dm[k] - sum(pred[w][k])) / max(map(abs, pred[w][k])):+.1e}' for k in range(12, 21, 2)))
    print('    predicted 2q = 22..32: ' +
          ', '.join(f'{k}: {sum(pred[w][k]):+.3e} (Q/P term {pred[w][k][1] / pred[w][k][0]:+.4f})' for k in range(22, 33, 2)))
m24 = [sum(pred[w][24]) / pred[w][24][0] for w in (18, 20, 22)]
print(f'  margin at 2q = 24, d_q / P-term (w = 18, 20, 22): ' + ', '.join(f'{v:.4f}' for v in m24))

print('\n== F. x = 2 and 3: r_-/r_+ by width (both w mod 4 subsequences)')
for x in (2.0, 3.0):
    print(f'  x={x:g}: ' + ', '.join(f'w={w}: {CX[x, w][2] / CX[x, w][0]:.5f}' for w in (14, 16, 18, 20)) +
          f'; |rho_-|/rho_+ at w = 20: {(CX[x, 20][2] / CX[x, 20][0]) ** 2:.4f}')
print(f'\ntotal time {time.time() - t0:.0f} s')
