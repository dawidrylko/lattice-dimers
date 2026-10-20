# Hypothesis (L): attack log

**(L)** For every width m: q ↦ Z(2q, m) is log-convex, Z(2q, m)² ≤ Z(2q−2, m) Z(2q+2, m)
(Z(k, m) = perfect matchings of the k × m king board). `notes/CW-NOTE.md`: (L) ⇒ Calkin-Wilf for even p
⇒ s ≥ 0.565511911035 (`notes/CW-NOTE.md`, audited in `notes/PROOF-lower.md` §6).

**Status: UNRESOLVED.** No counterexample at unit weights (exact, much larger range than `src/cw.py`), no
proof. Five proof routes closed with explicit obstructions; two exact reformulations; two
control experiments showing that (L) is *not* a generic property: it fails on the triangular
lattice and when the two diagonals of the king lattice get clearly unequal weights ((1, ½),
(1, ¾)), while equal weights x ∈ [0, 100] and near-equal (1, 0.9), (1, 0.95) survive. A proof
cannot be uniform in the diagonal weights; the left-right symmetry is the natural ingredient.
Every pair of unequal diagonal weights on which (L) was tested ((1, 9/10), (1, 19/20), (1, 3/4),
(1, 1/2), (1, 1/4), (1, 1/10), (1, 0), (2, 1/2)) violates (L) at some m, and symmetry alone does
not suffice; neither observation shows that the symmetry is necessary.

> **Erratum (2026-10-17).** The claims above that equal diagonal weights x ∈ [0, 100] and the
> near-equal weights (1, 0.9), (1, 0.95) "survive", and that the oscillating eigenvalue "never shows up
> with equal diagonal weights", are false beyond the tested range. (1, 9/10) violates (L) at m = 4, 8, 12
> from 2q = 56, 86, 112 and (1, 19/20) at m = 8 from 2q = 118; equal weights x = 3/2, 2, 3 violate (L)
> at 2q = 8 for every m ≥ 35, 21, 19 respectively (checked to m = 60), and (L∞) itself fails there.
> Every pair of unequal diagonal weights on which (L) was tested violates it at some m (the mechanism is the Krein
> signature of the J-odd sector), and the left-right symmetry alone does not suffice, since equal
> weights x = 3/2, 2, 3 violate it too.
> See §5.

## 0. What is really needed: (L∞), much weaker than (L)

The conditional bound uses only convexity of a_{2q} = log λ_{2q} (free strip of width 2q) for
2q ≥ 22 (`notes/PROOF-lower.md` §6). Call this **(L∞)**. (L) for all m implies (L∞) by m → ∞, not
conversely. (L∞) checked on the strip eigenvalues (`src/surface.py` → `data/surface.json`, f(k) column;
longdouble for k = 14...24, float64 with Collatz-Wielandt bracket for k = 25, 26): the second
differences Δ²a at 2q = 10, 12, ..., 24 are 4.7e-5, 4.0e-6, 5.5e-7, 5.6e-8, 7.0e-9, 7.6e-10,
9.0e-11, 1.0e-11: positive, decaying geometrically (ratio ≈ 8.9 per step, i.e. a single positive
exponential correction), float error ≲ 1e-15. So (L∞) holds for 2q ≤ 24; beyond is extrapolation.

## 1. Exact tests (`src/zexact.py` CRT counts → `src/ltest.py` → `out/out_ltest.txt`)

| family | widths | rows 2q | (L) cases | violations |
| --- | --- | --- | --- | --- |
| king free | m = 2...12 / 13...16 / 17...20 / 21...22 / 23...24 | ≤ 120 / 60 / 36 / 24 / 20 | 873 | **0** |
| king cylinder | m = 3...12 / 13...18 / 19...20 / 21...22 | ≤ 80 / 40 / 28 / 22 | 550 | **0** |
| king free, certified float (`src/lcert.py`, x87, rigorous rounding bound) | m = 25, 26 | ≤ 28 | 28 | **0** (smallest certified margin 1.2e-10, rounding bound ~1e-16) |
| square free / cyl (control, RP) | m ≤ 12 | ≤ 60 | 319 / 290 | 0 / 0 |
| triangular cyl (control) | m ≤ 12 | ≤ 60 | 290 | 0 |
| **triangular free (control)** | m ≤ 12 | ≤ 60 | 319 | **92** (from m = 5; brute-force confirmed: m = 5, Z(6), Z(8), Z(10) = 6475, 210560, 6842465, 210560² − 6475·6842465 = 30552725 > 0) |

Odd m and cylinders are included. Shape of the king margin
μ_q = log Z(2q−2) + log Z(2q+2) − 2 log Z(2q): strictly decreasing in q for every m tested,
≈ 0.4 m at 2q = 2, ratio μ_q/μ_{q−1} → 0.18-0.20 (= μ₂/μ₁ of A = T²), minimum always at the
largest q. No dip at intermediate q, nothing that shrinks with m: no candidate region for a
counterexample was found.

**All q at fixed m (non-rigorous).** (L) for q → ∞ holds iff the leading subdominant e₀-visible
eigenvalue μ₂ of A = T² is real positive with c₂ > 0. `src/lspec.py` (dense, float): true for
m = 2...10 (μ₂/μ₁ = 0.13-0.25, c₂/c₁ = 0.17-2.1), with the exact range q ≤ 59 for m ≤ 12 already
deep in the asymptotic regime (constant ratio).

## 2. Closed routes (dead ends, with the obstruction)

1. **Reflection positivity / Cauchy-Schwarz** (`notes/CW-NOTE.md`): crossing kernel M indefinite.
2. **Stieltjes moments (Hankel PSD of the transfer moments).** Z(2q, m) would be a moment
   sequence of a positive measure iff all Hankel matrices [Z(2(i+j))], [Z(2(i+j+1))] are PSD.
   Exact leading minors (`src/ltest.py`, Bareiss): a negative minor appears for every free width
   m ≥ 3 (m = 3: H1 at size 3; m = 4: H0 at size 4; ...) and every cylinder m ≥ 7. Spectral
   reason (`src/lspec.py`): e₀-visible eigenvalues of A = T² that are non-real (m ≥ 4) or real
   negative (λ purely imaginary; m = 3, 5, 7, 9), all small (|μ|/μ₁ ≤ 0.047 at m = 10).
   (L) is only the 2×2 consecutive-minor part of this; the full moment structure is false.
   (Square lattice and triangular cylinders: all minors ≥ 0, as expected for them.)
3. **Total nonnegativity of the transfer** (in any ordering of states): a TN matrix has real
   nonnegative spectrum (Gantmacher-Krein); A has non-real e₀-visible eigenvalues. Dead.
4. **Lindström-Gessel-Viennot**: needs a planar acyclic path model of the configurations; the
   king graph is non-planar (crossing diagonals) and non-bipartite, no height function, no
   path bijection. Dead as stated (would need a genuinely new encoding).
5. **"Generic" arguments** valid for all non-bipartite / non-RP dimer models: refuted by the
   triangular free strips (table above). **Arguments not using the left-right symmetry**:
   refuted by asymmetric diagonal weights (`src/lweight.py` → `out/out_lweight.txt`): with weight x on
   both diagonals (L) holds for every x ∈ {0, ¼, ½, 1, 2, 4, 10, 100} (m ≤ 9, 2q ≤ 38, exact);
   with weights (x_dl, x_dr) = (1, ½) it fails first at m = 5 (14 of 19 q) and, among m ≤ 9, only
   at m = 5, 8, 9; (1, ¼) fails at m = 5, 6, 8, 9, and (1, 1/10) and (1, 0) at every m = 5...9,
   (1, ¾) at m = 9 (5 of 19, first at 2q = 30). Not monotone in m: (1, ¾) has no violation
   for m = 10...13 (2q ≤ 38), and (1, 9/10), (1, 19/20) have none for m ≤ 16, 2q ≤ 78
   (`python3 src/lweight.py big` → `out/out_lweight_big.txt`); the failures sit mostly on odd m and at
   large q, i.e. they come from an oscillating (non-real or negatively weighted) subleading
   eigenvalue, which never shows up with equal diagonal weights (`src/lspec.py`: μ₂ real, c₂ > 0).

   *Erratum (2026-10-17): false for larger m or q; see the erratum under the status paragraph
   and §5.*

## 3. Exact reformulations (both verified)

**(R1) Path parity of superpositions** (`src/lparity.py` → `out/out_lparity.txt`). Put X on rows
[0, 2q) and Y on rows [2, 2q+2) (Z(2q)² pairs), or X′ on [0, 2q+2) and Y′ on [2, 2q)
(Z(2q+2)Z(2q−2) pairs). The union multigraph H has degree 1 on the top rows T = {0, 1} and
bottom rows B = {2q, 2q+1}, degree 2 between: paths and even cycles, labels alternate, end
labels forced. Type 1 ⇔ TT, BB paths odd and TB paths **even**; type 2 ⇔ all paths odd. Each
admissible H has 2^{#cycles of length ≥ 4} labelings in both cases, H without TB paths cancel:

  Z(2q−2)Z(2q+2) − Z(2q)² = Σ_{H: t(H) ≥ 1} 2^{c(H)} ([all TB paths odd] − [all TB paths even]).

Checked pair by pair on (m, q) = (2, 1...4), (3, 1...3), (4, 1...2), (5, 2), up to 3.4·10⁶ pairs.
Observed: odd ≥ even **separately for every number t of TB paths** (e.g. m = 5, q = 2:
t = 2: 1847660 vs 912656; t = 4: 32616 vs 0). So (L) ⇔ "odd top-bottom connections win",
and a sign-reversing involution would have to flip the parity of all TB paths of an even-type
H, injectively, preserving 2^{c}. Two facts any such involution must respect:
(i) the identity is graph-independent, and on the triangular lattice even-type H win for some
(m, q) (§1), so the involution must be king-specific; (ii) with a shift of one row instead of
two (X on [0, 2q), Y on [1, 2q+1); `src/lparity.py` control) the same identity computes
Z(2q+1)Z(2q−1) − Z(2q)², which is *negative* for even m (`src/cw.py`, I3); there even-type H win.
Tried and failed by hand: the K₄ switch (re-pair two H-edges on opposite sides of a unit square)
changes TB parities only when ℓ(b→bottom_P) ≢ ℓ(d→bottom_Q) (mod 2), which is not controlled;
a 3-way move, not an involution.

**(R2) Krein-space form.** Cutting the 2q-row board in the middle with the bottom half reflected
(the king lattice is invariant under r ↦ −r), Z(k₁ + k₂) = u_{k₁}ᵀ M u_{k₂}, with u_k the
boundary vector of a k-row half-board and M(A, B) the symmetric, indefinite crossing kernel
(|a − b| ≤ 1). Since Z(2q−2) = u_{q−1}ᵀMu_{q−1} > 0 and Z(2q+2) = u_{q+1}ᵀMu_{q+1} > 0:
**(L) ⇔ M is positive semidefinite on span(u_{q−1}, u_{q+1}) for every q** (the Gram determinant
of the pair is exactly Z(2q−2)Z(2q+2) − Z(2q)²; definite in every tested case). The Hankel
matrices of route 2 are the M-Gram matrices of {u₀, u₂, u₄, ...} and {u₁, u₃, ...}: route 2 failing
⇔ M is not PSD on those longer spans. So (L) is a "2-positivity along the orbit u_k = Rᵏu₀" statement for an M-self-adjoint R.

## 4. Suggested next attacks (written before §5)

- Prove (L∞) directly (only the leading eigenvalue λ_{2q} of the width-2q strip matters):
  e.g. a monotone coupling of strips of widths 2q−2, 2q, 2q+2, or interlacing of the strip
  spectra; or a rigorous enclosure of log λ_{2q} for 2q ≤ ~40 plus an asymptotic tail bound.
- Exploit the left-right symmetry J explicitly: in (R1), J maps H to H and preserves
  t(H) and all lengths; look for an involution built from J restricted to a canonical
  sub-region (the asymmetric-weight failures suggest that J must enter).
- Try (R2) with a different cut (vertex cut through a row, kernel V of `src/cw.py`) where the
  orbit vectors may lie in a cone on which the kernel is positive.

## 5. The left-right reflection J (`L/`)

Every claim below comes from `python3 L/<script>.py > L/out_<script>.txt` (code and output
committed together: `L/symmetry.py` at `f64b477`, `L/involution.py` at `78576e2`, `L/linf.py` at
`91c8bae`; `L/out_linf.txt` is `python3 L/linf.py 16`). "Exact" means integer arithmetic, "float" means float64.

Structure (lemma). T = H M, where H (horizontal tilings) is symmetric and J-invariant and M is
the crossing kernel. For any diagonal weights M^T = JMJ, so G = JM is symmetric and GT is
symmetric. The weight of a simple real eigenvalue is c_j = r_j(0)^2 / (r_j^T G r_j), i.e. its
sign is the Krein signature. With equal weights Z sees only the J-even sector, where G = M; on
the J-odd sector G = -M. Checked by `L/symmetry.py` A (exact, m <= 7, five weight sets) and B
(formula against eigendecomposition, relative error 7e-13).

Breaking J (counterexample). Under (1, 1-eps) the top J-odd level, which is M-positive, becomes
visible with weight -K eps^2 (K = 0.70, 1.31, 1.63 at m = 4, 5, 8; constant over eps = 1e-3 to
3e-2). Where it lies above the leading visible J-even level (table B: m = 4, 8 among m <= 11),
(L) must fail at large q. `L/symmetry.py` D1 (exact): (1, 9/10) fails at m = 4 from 2q = 56, at
m = 8 from 2q = 86, at m = 12 from 2q = 112; (1, 19/20) fails at m = 8 from 2q = 118. The onsets
predicted from the spectrum match exactly at m = 4 and 8; the prediction is computed only for
m <= 10, so m = 12 is found, not predicted. Control (1, 1): 0/199, 0/129, 0/69. The earlier tests
of §2.5 stopped at 2q <= 78.

Sector-wise (L). The J-symmetrised transfer H(M+M^T)/2 has no violation where tested: m <= 9,
2q <= 38 for the weights (1, 1/2), (1, 3/4), (1, 0), (1, 9/10), and (1, 9/10) at m = 8 up to
2q = 198 (`L/symmetry.py` D2). It was not run on the m = 4 and m = 12 counterexamples or on
(1, 19/20). J-orbit counts (D3): F (symmetric tilings, = Z(k, (m-1)/2) for odd m) and
Z_+ = (Z+F)/2 satisfy (L) for m <= 12; Z_- = (Z-F)/2 does not (m = 4 at every q; otherwise only
the trivial q = 1, since Z_-(0) = 0).

Reflection positivity inside the J-even sector (obstruction). M on the J-even sector is
indefinite; its negative index is 1, 1, 3, 8, 20, 34, 93, 186 for m = 3 to 10 (`L/symmetry.py` E).
Already at m = 3 the J-even vector (1, -sqrt2, 1) is negative. The visible J-even spectrum is
non-real from m = 4 on.

Cut-and-swap involution (partial proof, obstruction for (L)). Swap the parts below the first row
r with U_X(r) = U_Y(r) (plain) or U_X(r) = J U_Y(r) (twisted). `L/involution.py` checks every pair
for (m, q) up to (5, 2) and (3, 3): involution, type 1 <-> type 2, diagonal count kept,
N_2 - N_1 = D. A twisted cut allows top-bottom paths, unlike a plain one. The residual does not
shrink: N_1/N_2 -> 1 (m = 3: 0.26 -> 0.98, m = 5: 0.54 -> 0.99999 for q = 2 to 8). The unmatched
share N_1/Z^2 at q = 2 is 0.08 to 0.74 for m = 3 to 7. Combined with the t = 0 flip of (R1), the
even-type t >= 1 pairs go 194 -> 104 (m = 3) and 912656 -> 861364 (m = 5). With asymmetric
weights the twisted swap breaks the identity, as the breaking-J paragraph requires.

(L-infinity): counterexample for equal weights, obstruction for a certified argument.
(L-infinity) is robust to asymmetry: log lambda_{2q} stays convex up to 2q = 14 for (1, 0.95) to
(1, 0), triangular included. It fails for equal weights x >= 3/2: d_4 = -6.2e-4 (x = 1.5),
-2.8e-3 (x = 2). Exactly, Z(8, m)^2 > Z(6, m)Z(10, m) for every m >= 35 (x = 3/2), m >= 21
(x = 2), m >= 19 (x = 3), checked up to m = 60. So symmetry alone does not suffice, while every
pair of unequal diagonal weights on which (L) was tested violates it at some m (breaking-J
paragraph). King d_q up to
2q = 24, Prony fit (`L/linf.py`): a positive mode 0.1147^q (= e^{-2*1.083}, the transfer gap) and
an alternating mode (-0.072)^q; their ratio is 0.007 at 2q = 24 and shrinks by a factor 0.63
per step. At x = 1.25 the two modes are comparable (ratios d_q/d_{q+1} = 2.0, 376, 0.16, 48).
Interlacing needs a Hermitian or small-index Pontryagin structure, but G has exponentially many
negative directions; gap monotonicity gives the decay rate, not the sign. A certified tail would
need the leading finite-size correction to relative accuracy ((1-r)/(1+r))^2 ≈ 0.63, i.e. about
0.6, for every 2q >= 22, and no such theory exists for this non-integrable model.

Conclusion. (L) is not a structural property: every pair of unequal diagonal weights on which it
was tested breaks it at some m, which points to the exact symmetry J, but J is not enough (equal weights x >= 3/2). At
x = 1 the truth is quantitative: x = 1 sits below a transition x* <= 3/2 where an alternating
finite-size mode takes over. The proof routes tried here (RP, moments, TN, LGV, Cauchy-Schwarz,
symmetric sectors, cut-and-swap involutions) are all qualitative or uniform in the weights and
cannot see this. The paper therefore keeps s >= 0.545343749727 as a theorem and states
s >= 0.565511911035 as conditional on (L-infinity), not on (L).
