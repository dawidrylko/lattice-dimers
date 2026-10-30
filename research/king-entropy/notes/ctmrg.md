# CTMRG check of s, sigma and kappa

Question: does a corner transfer matrix renormalization group (CTMRG), which shares no code and no
extrapolation with the row transfer matrices of the paper, reproduce
`s = 0.5655119110413253 +- 6e-16` (`data/errbar.json`), `sigma = 0.242017935766251 +- 9e-15`
(`data/surface.json`) and `kappa = 0.36319625605 +- 3e-10` (`data/corner.json`)?
Everything below comes from `python3 src/ctmrg.py > out/out_ctmrg.txt` (float64 on an arm64 Mac,
277 s on a loaded machine, peak RSS 647 MiB; `logs/time_ctmrg.txt`).

**Verdict: s is reproduced at the float64 floor, with no extrapolation.** sigma and kappa agree
with the paper within the CTMRG's chi dependence (`|bias| <= 2e-8` for sigma and `<= 3e-6` for
kappa from `chi = 64` on, one sign change), far above the paper's error bars: this CTMRG does not
test sigma or kappa at the paper's precision, and s is the real check.

## 1. Encoding

The paper leaves the encoding open (`paper/king-entropy.tex`, the paragraph on corner transfer
matrices): the two diagonals of a unit square cross, so the king graph is not planar and its dimer
model is not a plain vertex model on the square lattice. Here each diagonal is routed through one
corner of its square:

- a horizontal bond `(v, v+x)` carries three bits `(e, D1, D2)`: the edge `v-(v+x)` and the two
  diagonals of the square above it, `D1 = v-(v+x+y)` and `D2 = (v+x)-(v+y)`;
- a vertical bond `(v, v+y)` carries `(e, D1 of the square to its left, D2 of the square to its right)`;
- the vertex tensor `a[l, u, r, d]` is 1 when exactly one of the eight edges at `v` is occupied
  and the two routed bits pass straight through (`D1` from the left bond to the up bond, `D2` from
  the right bond to the up bond).

`D1` leaves `v` along the bottom side and climbs the right side to `v+x+y`; `D2` leaves `v+x` along
the bottom side and climbs the left side to `v+y`. Both diagonals of one square can be occupied at
once. Dropping the bond states that one endpoint forbids leaves 5 horizontal and 4 vertical states.
The triangular lattice keeps `D1` only and the square lattice neither, so both controls run through
the same code. Outside the board every bond is empty, which is the free boundary of `src/zexact.py`.

With one vertex per tensor, a `(2n+1) x (2n+1)` board has an odd number of sites and `Z = 0`, which
breaks the free-energy formula of section 2, so the network is contracted in `2 x 2` blocks (bond
dimensions 25 and 16). The routing picks a corner, so the encoding has no `D4` symmetry and the
algorithm is the directional CTMRG of Orus and Vidal (Phys. Rev. B 80, 094403, 2009) rather than the
symmetric one of Nishino and Okunishi (J. Phys. Soc. Jpn. 65, 891, 1996): four corners `C1..C4`,
four edges `T1..T4`, a left move that inserts a column of blocks, and a 90 degree rotation of the
whole network for each of the other three moves. The new bonds are truncated to `chi` states with
the oblique projectors of Corboz, Rice and Troyer (Phys. Rev. Lett. 113, 046402, 2014) built from the
two left quadrants; singular values below `1e-14` of the largest are dropped.

The growth starts from the empty boundary, so after `c` cycles (four moves) the closed network is a
free board of `(4c+2) x (4c+2)` sites, and dropping the centre block, row or column gives the
`4c x 4c`, `(4c+2) x 4c` and `4c x (4c+2)` boards. Output section 1: one cycle without truncation
reproduces the exact counts of `src/tm.py` on all four boards of each lattice (`|d log Z| < 1e-15`).

## 2. s

With `Z1` (all tensors), `Zc` (corners only), `Zh` (no middle row) and `Zv` (no middle column),

    s = log(Z1 Zc / (Zh Zv)) / 4

because `log Z(W, H) = s W H - 2 sigma (W + H) + kappa + o(1)` and the surface and corner terms
cancel exactly. The log scales of the normalized tensors cancel too, so `s` comes from four O(1)
contractions; summing the scales instead would add rounding of the size of `s L^2` times `1e-16`.

| chi | king `s - ref` | discarded | tri `s - ref` | sq `s - G/pi` (200 cycles) |
| --- | --- | --- | --- | --- |
| 8 | -1.2e-8 | 2.0e-3 | +1.6e-8 | -1.0e-4 |
| 16 | -5.5e-12 | 5.5e-5 | +6.3e-13 | -1.3e-5 |
| 24 | -8.2e-15 | 4.4e-6 | -4.1e-15 | |
| 32 | -6.3e-17 | 5.9e-7 | +1.8e-16 | -2.3e-6 |
| 48 | +4.8e-17 | 2.1e-8 | | |
| 64 | +4.8e-17 | 2.5e-9 | | -6.1e-7 |

"discarded" is the relative weight of the dropped singular values of `Q1^T Q4` in the last cycle.
The triangular reference has 15 digits, so its `chi = 32` row only shows agreement to that many;
the `chi = 24` row, `-4.1e-15`, is a real truncation error.

Convergence in cycles (section 3) is geometric for the gapped lattices: at `chi = 32` the king error
falls by a factor of about 60 to 80 per cycle from the third cycle on (`-2e-4, -4e-5, -6e-7, -8e-9, -1e-10, -1.3e-12,
-1.8e-14`, then the floor from cycle 8, a 34-site board). The triangular error reaches the `1e-16`
level by cycle 10, but not monotonically (its sign changes). The critical square lattice converges
slowly in both chi and the number of cycles (`-2.3e-4` after 10 cycles, `-8.9e-6` after 50, `-2.3e-6`
after 200 at `chi = 32`), as a lattice with long correlations should.

The float64 floor (section 4): 30 further cycles at `chi = 64` scatter with spread `1.2e-15` around
a mean `s - ref = -9.6e-17`; the largest deviation is `6.2e-16`. So CTMRG gives
`s = 0.5655119110413253` with an uncertainty of about `6e-16`, the same digits as the paper's
`0.5655119110413253 +- 6e-16`, from an independent method.

## 3. sigma and kappa

On the squares, `sigma_L = (s (4L + 4) - log Z(L+2, L+2) + log Z(L, L)) / 8` and
`kappa_L = log Z(L, L) - s L^2 + 4 sigma L`, with the CTMRG `s` of the same run (section 6, squares
`L = 30..56`, boards up to `58 x 58`). Both are flat in `L` (spread `1e-13` for sigma and `5e-12` for kappa at `chi = 64`),
but they move with chi:

| chi | sigma - paper | kappa - paper |
| --- | --- | --- |
| 32 | +4.7e-7 | +7.0e-5 |
| 48 | +1.0e-7 | +1.6e-5 |
| 64 | +2.0e-8 | +2.9e-6 |
| 80 | -1.2e-8 | -2.0e-6 |
| 96 | -9.0e-9 | -1.6e-6 |

From `chi = 64` on the differences are at most `2e-8` for sigma and `3e-6` for kappa, with one
sign change between `chi = 64` and `80`. They do not shrink in step with the truncation: from
`chi = 64` to `96` the discarded weight of the last cycle falls from `2.5e-9` to `9.9e-11` (section 6),
while kappa moves from `+2.9e-6` to `-2.0e-6` and `-1.6e-6`. So the run does not converge on the
paper's values, and "agree" above means no contradiction within this chi dependence, not
convergence: it neither confirms nor contradicts them below those levels, far above the
paper's error bars (`9e-15`, `3e-10`). The finite boards show the same floor (section 5): against
the exact counts of `data/zex/` (21 boards up to `24 x 24`) the CTMRG `log Z` is off by up to
`3.8e-5` at `chi = 32` and stays at `1.5e-6` from `chi = 64` to `96`.

## 4. What limits the precision

- s: float64 rounding in the four contractions, about `6e-16` (section 4). Truncation stops being
  visible at `chi >= 32`. More digits would need extended or arbitrary precision, which is not
  attempted here.
- sigma and kappa: a floor near `1e-8` and `1e-6` that more chi does not remove (section 3). The
  likely cause, not tested here, is the free boundary: the projectors are built from the two left
  quadrants as if the lattice were translation invariant, and the same pair truncates every bond of
  a new column, including the bonds next to the boundary and the outer corners, whose environment
  is not the bulk. A corner and edge treatment that keeps the boundary exact (projectors fitted to
  each bond of the finite board, or a boundary-MPS computation of the edge free energy) would be
  needed to test sigma and kappa at the paper's precision.
