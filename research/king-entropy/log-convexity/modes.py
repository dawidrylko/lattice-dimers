"""The two modes in the second differences of a_{2q} = log lambda_{2q}, along equal diagonal weights x.

usage: python3 log-convexity/modes.py [kmax] > log-convexity/out_modes.txt      (kmax default 22)

lambda_k is the growth rate of the free strip of width k (orthogonal edges weight 1, both
diagonals weight x), computed by float64 power iteration with the transfer of linf.py (same cell
step, copied here). d_q = a_{2q+2} - 2 a_{2q} + a_{2q-2}, with a_0 = 0. At x = 1 the d_q are
positive up to 2q = 24 (surface.py); at x >= 3/2 they alternate in sign at small q (linf.py).

Two-mode model: d_q = P rho_+^q + Q rho_-^q with rho_+ > 0 (bulk mode) and rho_- < 0 (alternating
mode from the parity splitting of the free strip). A Prony fit through four consecutive d_q gives
both roots; it is repeated over sliding windows, and the windows that end at the largest q are the
most reliable. (L_inf) holds for large q if rho_+ > |rho_-| and P > 0, and fails if |rho_-| > rho_+.
The crossing x* of the two rates is where rho_+(x) = |rho_-(x)|.
"""
import sys, time
import numpy as np

t0 = time.time()


def step(v, w, c, xl, xr):
    """One cell of the free-strip transfer (tmfast state layout), float64, diagonal weights xl, xr."""
    H = 1 << (w + 1)
    u = np.zeros(2 * H)
    src = v.reshape(H, 2)
    u.reshape(2, H)[0, :] += src[:, 1]
    offs = [(1, 1.0)] if c + 1 < w else []
    if c > 0:
        offs.append((w - 1, xl))
    offs.append((w, 1.0))
    if c + 1 < w:
        offs.append((w + 1, xr))
    for d, wt in offs:
        if wt == 0:
            continue
        B = 1 << (d - 1)
        u.reshape(2, H // (2 * B), 2, B)[0, :, 1, :] += wt * v.reshape(H // (2 * B), 2, B, 2)[:, 0, :, 0]
    return u


def growth(k, xl, xr, tol=1e-15, maxit=4000):
    """log of the Perron root of the width-k transfer (two rows per iteration, from e0)."""
    v = np.zeros(1 << (k + 2))
    v[0] = 1.0
    prev = None
    for it in range(maxit):
        for _ in range(2):
            for c in range(k):
                v = step(v, k, c, xl, xr)
        nrm = v.sum()
        v /= nrm
        g = np.log(nrm) / 2
        if prev is not None and abs(g - prev) < tol * abs(g) and it > 20:
            return g
        prev = g
    raise RuntimeError(f'no convergence k={k}')


def prony(d):
    """Roots of x^2 = al x + be fitted through four consecutive values d[0..3]."""
    M = np.array([[d[1], d[0]], [d[2], d[1]]])
    al, be = np.linalg.solve(M, [d[2], d[3]])
    disc = al * al + 4 * be
    if disc < 0:
        return None
    r1, r2 = (al + np.sqrt(disc)) / 2, (al - np.sqrt(disc)) / 2
    rp, rm = (r1, r2) if r1 > 0 > r2 else (r2, r1) if r2 > 0 > r1 else (r1, r2)
    # amplitudes P, Q with d[3] = P rp^3 + Q rm^3 (index relative to the window start)
    A = np.array([[rp ** 2, rm ** 2], [rp ** 3, rm ** 3]])
    P, Q = np.linalg.solve(A, [d[2], d[3]])
    return rp, rm, P, Q


KMAX = int(sys.argv[1]) if len(sys.argv) > 1 else 22
XS = [1.0, 1.25, 1.5, 1.75, 2.0, 3.0]
print(f'free strips of even width 2..{KMAX}, both diagonals weight x, float64 power iteration (tol 1e-15)')
cross = []
for x in XS:
    t = time.time()
    a = {0: 0.0}
    for k in range(2, KMAX + 1, 2):
        a[k] = growth(k, x, x)
    qs = [q for q in range(1, KMAX // 2) if 2 * q + 2 in a]
    d = {q: a[2 * q + 2] - 2 * a[2 * q] + a[2 * q - 2] for q in qs}
    print(f'\nx = {x:g}  ({time.time() - t:.0f} s): second differences d_q at 2q = ' +
          ', '.join(f'{2 * q}: {d[q]:+.3e}' for q in qs))
    neg = [2 * q for q in qs if d[q] < -1e-13]
    print(f'  negative at 2q = {neg if neg else "none"}')
    fits = []
    for q0 in range(max(1, qs[-1] - 6), qs[-1] - 2):
        r = prony([d[q0 + i] for i in range(4)])
        if r is None:
            print(f'  window 2q = {2 * q0}..{2 * q0 + 6}: complex roots')
            continue
        rp, rm, P, Q = r
        fits.append((q0, rp, rm, P, Q))
        print(f'  window 2q = {2 * q0}..{2 * q0 + 6}: rho_+ = {rp:+.4f}, rho_- = {rm:+.4f},'
              f' |rho_-| / rho_+ = {abs(rm) / rp:.3f}, P = {P:+.2e}, Q = {Q:+.2e}')
    if fits:
        q0, rp, rm, P, Q = fits[-1]
        if abs(rm) < rp and P > 0:
            # first q from which the positive mode outweighs the alternating one
            qq = q0 + 3
            while abs(Q) * abs(rm) ** (qq - q0) >= P * rp ** (qq - q0) and qq < 400:
                qq += 1
            print(f'  last window: positive mode dominates; convex from about 2q = {2 * qq} (two-mode model)')
        else:
            print('  last window: the alternating mode dominates (or P <= 0); (L_inf) fails for large q in this model')
        cross.append((x, rp, abs(rm)))
print('\ncrossing of the two rates (last windows): x, rho_+, |rho_-|')
for x, rp, rm in cross:
    print(f'  x = {x:g}: rho_+ = {rp:.4f}, |rho_-| = {rm:.4f}  -> {"positive" if rp > rm else "alternating"} mode dominates')
for (x1, p1, m1), (x2, p2, m2) in zip(cross, cross[1:]):
    if (p1 - m1) * (p2 - m2) < 0:
        xs = x1 + (x2 - x1) * (p1 - m1) / ((p1 - m1) - (p2 - m2))
        print(f'  x* in ({x1:g}, {x2:g}); linear interpolation of rho_+ - |rho_-|: x* ~ {xs:.2f}')
print(f'\ntotal time {time.time() - t0:.0f} s')
