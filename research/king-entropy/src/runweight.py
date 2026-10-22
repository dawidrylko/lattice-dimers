"""Run-weighted open-strip upper bound on the king-graph dimer entropy s.

usage: python3 src/runweight.py <scheme> <w> [<w> ...] [--disk DIR] > out/out_runweight_<scheme>.txt
       (--disk: vectors above 3 GiB keep the previous iterate in a memory-mapped file in DIR)
       scheme = 3state | 1bit | phi (phi = the bounds.py weight); writes data/runweight_<scheme>.json (merged with earlier runs)

The upper bound of bounds.py replaces every crossing count M(A, B) by phi^(n/2) phi^(n/2). The
branching of Lemma fib gives more: M(A, B) <= min(F(A), F(B)), where F(S) is the product of
F_(l+1) over the maximal runs (blocks of consecutive rows) of S, l the run length. Hence
M(A, B) <= h(A) h(B) for every weight h with h(S)^2 >= F(S), and Z(K, k w) <= W_h(K, w)^k with
W_h = sum_(A, B) N(B, A) h(B) h(A). Both schemes are products over runs of per-cell weights:

  3state  1, sqrt 2, sqrt phi, sqrt phi, ...  (run weight^2 = 1, 2, 2 phi, 2 phi^2, ...)
  1bit    sqrt(2/phi), sqrt phi, sqrt phi, ...  (run weight^2 = 2 phi^(l-2) for every l >= 1)

and F_(l+1) <= 2 phi^(l-2) for l >= 2 (induction: F_(l+1) = F_l + F_(l-1)), F_2 = 1, so both are
valid. The transfer is that of bounds.py with z = 0, plus a run state per side: for the left
column (cell c = 0) and the right column (c = w - 1) the position of the previous row's cell in
a run of outside covers (3state: 0 = not covered from outside, 1 = first of a run, 2 = later;
1bit: 0 / 1). A side cell covered from outside gets the weight of its position and moves the
state on; any other move resets it to 0.

Certificate as in bounds.certify(upper=True): v >= 0 with v_0 > 0 and A v <= C v componentwise,
A = T^2, gives W_h(2j, w) <= C^j, so s <= log(C) / (2 w). The weights are rounded up to floats
(T only grows). ROUNDING: an entry after an interior cell step is a sum of at most 5 terms (4
roundings); after a side step at most 4n terms (left) or 3n terms (right) for n run states,
plus at most 2 products by a weight and 1 addition for the states reached by an outside cover.
Over the 2w steps of A that is at most 2 (4 (w - 2) + (4n - 1) + (3n - 1)) = 8w + 14n - 20
roundings, at most 12 w for w >= 6, the budget of bounds.py: relative error < 12 w u, far below
the margin 1e-12. Entries below 1e-280 are checked to be absent.
"""
import json, os, resource, sys, time
from paths import P
import numpy as np
from mpmath import mp, mpf, log, sqrt, ceil
from tmfast import nbits, step

mp.dps = 30
U_SAFE = 1e-12
PHI = (1 + sqrt(5)) / 2


def up_float(x):
    """The smallest float >= x (x an mpf)."""
    f = float(x)
    if mpf(f) < x:
        f = float(np.nextafter(f, np.inf))
    assert mpf(f) >= x
    return f


SCHEMES = {
    # per-cell weight by position in the run (0 = first cell), and the next state
    '3state': ([mpf(1), sqrt(2), sqrt(PHI)], [1, 2, 2]),
    '1bit': ([sqrt(2 / PHI), sqrt(PHI)], [1, 1]),
    # sqrt(phi) per cell, no run state: the weight of bounds.py (a check of this code against it)
    'phi': ([sqrt(PHI)], [0]),
}


def weights(scheme):
    wt, nxt = SCHEMES[scheme]
    return [up_float(x) for x in wt], nxt


def fixed(n, d):
    sign, n = ('-' if n < 0 else ''), abs(n)
    return f'{sign}{n // 10**d}.{n % 10**d:0{d}d}'


def up12(x, d=12):
    return fixed(int(ceil(x * 10**d)), d)


def step_run(V, w, c, wt, nxt, out):
    """One cell step. V, out: shape (n, n, 2^(w+2)); axes 0, 1 = run state of the left, right side.
    Works for float arrays and for object arrays of Fractions (exact audit)."""
    n = V.shape[0]
    out[...] = 0
    H = 1 << (w + 1)
    side = 0 if c == 0 else 1 if c == w - 1 else None
    for l in range(n):
        for r in range(n):
            u = step(V[l, r], 'king', 'free', w, c)      # already covered, or paired inside the strip
            if side is None:
                out[l, r] += u
                continue
            if side == 0:
                out[0, r] += u                           # the side cell is not covered from outside
                t, dst = l, out[nxt[l], r]
            else:
                out[l, 0] += u
                t, dst = r, out[l, nxt[r]]
            dst.reshape(2, H)[0, :] += wt[t] * V[l, r].reshape(H, 2)[:, 0]   # covered from outside


def apply_A(v, w, wt, nxt, buf):
    """v <- A v = T^2 v using buf (2w cell steps, an even number, so the result lands in v)."""
    a, b = v, buf
    for c in list(range(w)) * 2:
        step_run(a, w, c, wt, nxt, b)
        a, b = b, a
    assert a is v


def ratio_stats(new, old, chunk=1 << 24):
    """Over the support of old: min and max of new / old; also both support sizes, whether new
    vanishes off the support, and the smallest positive entry of new. Chunked, so that no
    temporary as large as the vectors is formed."""
    a, b = new.reshape(-1), old.reshape(-1)
    rmin, rmax, smallest = np.inf, 0.0, np.inf
    nsup = npos = 0
    closed = True
    for i in range(0, a.size, chunk):
        x, y = a[i:i + chunk], b[i:i + chunk]
        sup = y > 0
        pos = x > 0
        nsup += int(sup.sum())
        npos += int(pos.sum())
        closed &= not pos[~sup].any()
        if pos.any():
            smallest = min(smallest, float(x[pos].min()))
        if sup.any():
            r = x[sup] / y[sup]
            rmin, rmax = min(rmin, float(r.min())), max(rmax, float(r.max()))
    return rmin, rmax, nsup, npos, closed, smallest


def certify(w, scheme, tol=4e-15, maxit=80, disk=None):
    """Power iteration of A = T^2 from e0 and the Collatz-Wielandt certificate, as in
    bounds.certify(upper=True). With disk = a directory, the copy of the previous iterate lives in
    a memory-mapped file there (the third vector of the largest widths does not fit in memory)."""
    wt, nxt = weights(scheme)
    n = len(wt)
    shape = (n, n, 1 << nbits(w, 'free'))
    v = np.zeros(shape)
    v[0, 0, 0] = 1.0
    buf = np.empty_like(v)
    if disk:
        keep = np.lib.format.open_memmap(os.path.join(disk, f'runweight_{scheme}_w{w}_keep.npy'), mode='w+',
                                         dtype=np.float64, shape=shape)
    else:
        keep = np.empty_like(v)
    hist, nsup = [], 0
    for it in range(maxit):
        keep[...] = v
        apply_A(v, w, wt, nxt, buf)                      # v <- A keep
        s = v.sum()
        hist.append(np.log(s) / 2)
        rmin, rmax, ns, npos, _, _ = ratio_stats(v, keep)
        stable = npos == ns == nsup                      # support no longer growing
        nsup = ns
        gap = (rmax - rmin) / rmax if stable else np.inf
        v /= s
        if gap < tol:
            break
    assert v[0, 0, 0] > 0 and ratio_stats(v, v)[5] > 1e-280, 'tiny entries'
    keep[...] = v
    apply_A(v, w, wt, nxt, buf)                          # v <- A keep: the certificate pass
    rmin, rmax, _, _, closed, _ = ratio_stats(v, keep)
    assert closed, 'support not closed'
    bound = (log(mpf(rmax)) + log(1 + mpf(U_SAFE))) / (2 * w)
    if disk:
        del keep
        os.remove(os.path.join(disk, f'runweight_{scheme}_w{w}_keep.npy'))
    return bound, float(hist[-1]) / w, it + 1, (rmax - rmin) / rmax


def main():
    args = sys.argv[1:]
    disk = None
    if '--disk' in args:
        i = args.index('--disk')
        disk = args[i + 1]
        del args[i:i + 2]
    scheme, ws = args[0], [int(x) for x in args[1:]]
    wt, nxt = weights(scheme)
    print(f'== run-weighted open-strip upper bound, scheme {scheme}: per-cell weights {wt!r}, next state {nxt}')
    print(' w   upper bound      float growth/w        iters  CW spread  wall s  peak RSS MiB')
    fn = P(f'runweight_{scheme}.json')
    res = json.load(open(fn)) if os.path.exists(fn) else {}
    for w in ws:
        t = time.time()
        nbytes = 8 * len(weights(scheme)[0]) ** 2 << nbits(w, 'free')
        b, est, it, spread = certify(w, scheme, disk=disk if nbytes > 3 << 30 else None)
        rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
        print(f'{w:2d}  {up12(b)}  {est:.15f}  {it:4d}  {spread:.1e}  {time.time() - t:7.1f}  {rss:12.0f}', flush=True)
        res[str(w)] = dict(upper=up12(b), upper_float=float(b), growth_per_site=est, iterations=it, cw_spread=spread,
                           wall=time.time() - t, maxrss_mib=rss)
        json.dump(dict(sorted(res.items(), key=lambda kv: int(kv[0]))), open(fn, 'w'), indent=1)


if __name__ == '__main__':
    main()
