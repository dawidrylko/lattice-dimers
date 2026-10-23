# Upper bound s ≤ 0.586216605404: full proof and audit

The sharper run-weighted bound s ≤ 0.582767477484 of the paper (Theorem 4.1) reuses §1-§7 and is
proved in §9.

Claim under audit (`src/bounds.py 24` → `out/out_bounds.txt`):

> **s ≤ log(μ₂₄)/24 ≤ 0.586216605404**, where μ_w is the growth rate of a free strip of
> width w whose side cells may be "covered from outside" with weight z = √φ.

**Verdict: CONFIRMED.** Every step below was checked; the two inequalities
the proof rests on were tested exactly on small boards and the float certificate was
recomputed in exact rational arithmetic (`src/audit_bounds.py` → `out/out_audit_bounds.txt`,
commit `0c53f27`, 0 failures). Caveats at the end (§8).

## 0. Notation

- King graph: vertices (r, c) ∈ ℤ², edges between distinct vertices with
  max(|Δr|, |Δc|) = 1. Board B(K, L) = {0..K−1} × {0..L−1}, induced subgraph;
  Z(K, L) = number of its perfect matchings (Z = 0 if KL is odd).
- s̄ = limsup and s̲ = liminf of (KL)⁻¹ log Z(K, L) over K, L → ∞ with KL even. The
  entropy s is their common value (existence: standard, see §8); the theorem below bounds s̄,
  so it holds whether or not one assumes existence.
- φ = (1+√5)/2, F₁ = F₂ = 1, F_{n+1} = F_n + F_{n−1}.
- Strip S_w = B(K, w), w ≥ 2. Left column 0, right column w−1.

## 1. The cut identity (exact)

Cut B(K, kw) into k strips S⁽¹⁾...S⁽ᵏ⁾ of width w (columns jw ... jw+w−1). King edges change
the column by at most 1, so every edge of a perfect matching X is either inside one strip
or joins column jw−1 to column jw for some j (a *crossing edge* at cut j). Let

- A_j ⊆ {0..K−1}: rows of the cells of column jw−1 matched across cut j (right side of S⁽ʲ⁾),
- B_{j+1}: rows of the cells of column jw matched across cut j (left side of S⁽ʲ⁺¹⁾),
- B₁ = A_k = ∅ (outer boundary).

Since w ≥ 2, a cell lies in at most one of the left/right columns of its strip, so these
sets are well defined. X restricted to strip j is a perfect matching of S⁽ʲ⁾ ∖ (B_j ∪ A_j)
using internal edges only; X restricted to cut j is a perfect matching between A_j and
B_{j+1} using edges with |row difference| ≤ 1. Conversely any such tuple of pieces is a
perfect matching of B(K, kw). Hence, with

- N(B, A) = number of perfect matchings of B(K, w) minus {(b, 0): b ∈ B} ∪ {(a, w−1): a ∈ A},
- M(A, B) = number of perfect matchings of the bipartite graph A ⊔ B, a ~ b iff |a − b| ≤ 1,

**Z(K, kw) = Σ ∏_{j=1}^{k} N(B_j, A_j) ∏_{j=1}^{k−1} M(A_j, B_{j+1})**, the sum over all
A₁, B₂, A₂, ..., B_k with B₁ = A_k = ∅. (Checked as an exact integer identity on 58 boards,
K ≤ 8, kw ≤ 12: `U2`.)

## 2. Lemma (crossing matchings). M(A, B) ≤ F_{n+1} ≤ φⁿ for |A| = |B| = n; M = 0 otherwise.

Let a₁ < ... < a_n, b₁ < ... < b_n and M(n) = max over such A, B.
*a₁ can only be matched to b₁ or b₂.* If a₁ ~ b_j with j ≥ 3 then b₃ ≤ a₁ + 1, so
b₁ ≤ a₁ − 1. Every a ≠ a₁ satisfies a ≥ a₁ + 1 ≥ b₁ + 2, so b₁ has no partner: contradiction.
*If a₁ ~ b₂*, b₁ ≤ b₂ − 1 ≤ a₁ needs a partner a_i ≥ a₁ + 1 with a_i ≤ b₁ + 1 ≤ a₁ + 1, so
a_i = a₁ + 1 = b₁ + 1: then b₁ = a₁, b₂ = a₂ = a₁ + 1, and a₂ ~ b₁ is forced.
So every matching either pairs a₁b₁ (rest: a matching of n−1 vs n−1 cells) or pairs
a₁b₂, a₂b₁ (rest: n−2 vs n−2): M(n) ≤ M(n−1) + M(n−2), M(0) = M(1) = 1, hence
M(n) ≤ F_{n+1}. Finally F_{n+1} ≤ φⁿ by induction (F₁ = 1, F₂ = 1 ≤ φ,
F_{n+2} ≤ φⁿ + φⁿ⁻¹ = φⁿ⁺¹). ∎
Checked: max M = F_{n+1} exactly (attained by A = B = a block) for all A, B in columns of
length m ≤ 11, and the branching statement itself for all A, B with m ≤ 8 (`U1`).

## 3. Lemma (strip inequality). Z(K, kw) ≤ W(K, w)ᵏ, W(K, w) := Σ_{A,B} N(B, A) z^{|A|+|B|}, z = √φ.

In §1 replace M(A_j, B_{j+1}) by its bound φⁿ = z^{|A_j|} z^{|B_{j+1}|} (n = |A_j| = |B_{j+1}|;
when the sizes differ M = 0 ≤ anything). Every factor z^{|A_j|} is attached to strip j and
every z^{|B_j|} to strip j, so the summand becomes ∏_j N(B_j, A_j) z^{|B_j|+|A_j|}. Dropping
the constraints |A_j| = |B_{j+1}|, B₁ = A_k = ∅ only adds nonnegative terms, and the sum
then factorises over strips: Z(K, kw) ≤ W(K, w)ᵏ. ∎
Checked exactly (interval arithmetic for √φ) on the same 58 boards (`U3`). Power of the
test: with z = 0 (W = Z(K, w), no crossing allowed) it fails on all 40 boards with k ≥ 2.
Remark: on these small boards z = 0.5 already suffices, so the Fibonacci weight is needed by
the proof, not by the data (see §8, "room for improvement").

**Remainder columns.** For L = kw + r, 0 < r < w, cut off a last strip of width r; the same
argument gives Z(K, L) ≤ W(K, w)ᵏ W_r(K) where W_r counts configurations of a width-r strip
with weighted outside covers (for r = 1 a cell may be covered from the left or the right).
Crudely W_r(K) ≤ (5 + 2z)^{Kr} (per cell: already covered, one of ≤ 4 later partners, or one of ≤ 2 outside covers of weight z), so log W_r(K) ≤ C w K with C independent of K, L.

## 4. Transfer matrix for W

`tmfast.row(v, 'king', 'free', w, z)` processes the strip cell by cell in row-major order.
State: occupancy bits of the next w+2 cells (row-major) after the current one. At each cell:
if its bit is set it is already covered (shift); else it is paired with one of the later
cells right, down-left, down, down-right that exist and are free (set that bit, shift), or,
if it lies in column 0 or w−1, it is covered from outside with weight z (shift). Every
configuration counted by W(K, w) corresponds to exactly one path of states from the empty
state e₀ back to e₀ after K rows, so **W(K, w) = e₀ᵀ T_zᴷ e₀** and Z(K, w) = e₀ᵀ T₀ᴷ e₀.
Checked: transfer = brute-force W(K, w; z) as a polynomial in z (agreement at 2K+2 integer
points, K ≤ 6, w ≤ 6: 162 evaluations, `U4`); transfer = brute force for Z on 90 boards
(`src/validate.py`).

## 5. Lemma (Collatz-Wielandt certificate, upper). If A = T_z² ≥ 0, v ≥ 0, v₀ > 0 and Av ≤ Cv
componentwise (including Av = 0 where v = 0), then W(2j, w) ≤ Cʲ for all j.

e₀ ≤ v / v₀ componentwise, A ≥ 0, so Aʲ e₀ ≤ Aʲ v / v₀ ≤ Cʲ v / v₀, and the e₀ entry gives
W(2j, w) = (Aʲ e₀)₀ ≤ Cʲ. ∎

## 6. Floating point (what `bounds.certify(upper=True)` actually proves)

The code computes y = fl(A v) for a float vector v (any v: how it was obtained is irrelevant
for validity), asserts y = 0 off supp v and v_i > 10⁻²⁸⁰ on supp v, and sets
C = max_{i ∈ supp v} fl(y_i / v_i) · (1 + 10⁻¹²).

- Each cell step writes every entry as a sum of ≤ 6 nonnegative terms (already covered;
  z·(outside); right; down-left; down; down-right), computed by sequential IEEE additions
  and one multiplication: per step a factor in [(1−u)⁶, (1+u)⁶], u = 2⁻⁵³. Over the 2w
  steps of A: fl(Av)_i ∈ (Av)_i · [(1−u)^{12w}, (1+u)^{12w}], i.e. relative error
  ≤ 12wu (1 + o(1)) = 3.2·10⁻¹⁴ at w = 24. The division adds one more u.
- No underflow: all weights are ≥ 1 (z = 1.272... rounded *up*, `Z_OPEN ≥ √φ` asserted),
  inputs on the support are > 10⁻²⁸⁰ ≫ 2.2·10⁻³⁰⁸, so a float entry is 0 iff the exact one is.
  Hence "y = 0 off supp v" is the exact statement Av = 0 there. No overflow (v sums to 1).
- z rounded up: T_{z_float} ≥ T_{√φ} entrywise, so the certificate for z_float bounds W(√φ).
- Margin 10⁻¹² ≫ 3.2·10⁻¹⁴ + u, so (Av)_i ≤ C v_i holds exactly. The mpmath log (30 digits)
  and the final rounding *up* to 12 decimals are conservative.

Checked: for w = 2...12 the float ratio max was recomputed in exact rationals for the same
float v (Fractions): |float/exact − 1| ≤ 1.3·10⁻¹⁶ (budget 12wu ≈ 10⁻¹⁴, margin used
10⁻¹²), support closed in every case (`U5`). For w ≤ 9 the certified bound lies above the
true growth rate from dense eigenvalues by 5-25·10⁻¹⁴ (`L3`). Not re-run at w = 24 (the
same code path; the argument above is width-independent).

## 7. Passage to the limit

Let K, L → ∞ with KL even. If K is odd then L is even and Z(K, L) ≤ Z(K+1, L) (add a row
of horizontal dominoes), so it suffices to take K = 2j even. With L = kw + r:

  (KL)⁻¹ log Z(K, L) ≤ (k/L) (2j)⁻¹ log W(2j, w) + C w K/(KL) ≤ (k/L) · (log C_w)/2 + Cw/L,

and k/L → 1/w. So **s̄ ≤ log C_w / (2w)**. With C_24 from `src/bounds.py 24`:
s ≤ 0.586216605404. ∎

## 8. Caveats and remarks (skeptic's list)

1. *Existence of s.* Not proven here; the bound is on limsup, which is all that is needed.
   (Existence for rectangles with both sides → ∞ is classical for dimer models on ℤ²-periodic
   graphs: Hammersley-type super/sub-additivity.)
2. *Transfer correctness* is argued (§4) and tested exhaustively on small boards, not
   formally verified line by line for all w. The certificate's validity does not depend on
   how v was produced, only on A being the right matrix.
3. *Platform.* Relies on IEEE-754 binary64 with round-to-nearest in numpy ufuncs (no FMA
   contraction, no flush-to-zero); `out/out_audit_bounds.txt` shows float/exact agreement to
   ~10⁻¹⁶ on this machine.
4. *Room for improvement, not an error.* The bound converges like 0.497/w
   (log μ_w − s·w → 0.497); even z = 1 would give 0.315/w and stays above s, so a sharper
   crossing bound than Fibonacci/√φ per cell could be valid, but the O(1/w) rate is
   structural (two open sides). Better upper bounds need another idea (open question).
5. *Provenance.* `out/out_bounds.txt` was written by `src/bounds.py 24` at `102b7e5`; the code is
   unchanged since apart from file paths, and its output for w ≤ 16 was re-run from the current tree (`src/repro.py` →
   `out/out_repro.txt`).

## 9. The run-weighted bound s ≤ 0.582767477484 (Theorem 4.1 of the paper)

Claim (`src/runweight.py 3state 24 --disk <dir>` → last line of `out/out_runweight_3state.txt`):
**s̄ ≤ 0.582767477484**. Same cut identity (§1), passage to the limit (§7) and float argument (§6);
only the crossing bound, the transfer and the rounding count change. Paper: Lemma 4.6 and §4.3.

- *Run form of the crossing lemma.* For a set S of rows let F(S) = ∏ over the maximal runs R of S of
  F_{|R|+1}. Then M(A, B) ≤ min(F(A), F(B)), with M(S, S) = F(S). Proof: induction on n = |A| = |B|
  with the branching of §2. Let a₁ be the smallest row of A and l the length of its run; every
  matching contains a₁b₁, or a₁b₂ and a₂b₁ with a₂ = a₁ + 1 (so l ≥ 2). Removing a₁ (resp. a₁, a₂)
  shortens that run to l − 1 (resp. l − 2) and leaves the other runs, so M(A, B) ≤ F_l R + F_{l−1} R
  = F(A) (l ≥ 2) or ≤ F(A ∖ {a₁}) = F(A) (l = 1), R the product over the other runs. By symmetry of
  a ~ b also M ≤ F(B). Checked exactly for all A, B in columns of length m ≤ 8 (`U6`).
- *Weights.* F₂ = 1 and F_{l+1} ≤ 2φ^{l−2} for l ≥ 2 (F₃ = 2, F₄ = 3 ≤ 2φ, then induction). The
  per-cell factors 1, √2, √φ, √φ, ... by position in a run give a run of length l the weight
  h² = 1, 2, 2φ, 2φ², ... ≥ F_{l+1}, so M(A, B) ≤ √(F(A)F(B)) ≤ h(A)h(B), and the proof of §3 gives
  Z(K, kw) ≤ W_h(K, w)ᵏ with W_h = Σ_{A,B} N(B, A) h(A) h(B) (checked in interval arithmetic on the
  58 boards, `U7`). Remainder strip: every factor is ≤ √2, so W_r(K) ≤ (5 + 2√2)^{Kr}.
- *Transfer.* The z = 0 transfer of §4 plus, for each side column, the run position of the previous
  row's side cell (0: not covered from outside, 1: first of a run, 2: later). A side cell covered
  from outside gets the factor of its position and moves the state on (0 → 1 → 2 → 2); any other
  move resets it to 0. W_h(K, w) = Σ_{l,r} (T_h^K e₀)_{(l,r,0)} (checked against brute force at
  rational factors, 57 evaluations, `U8`).
- *Certificate.* §5 applied to each of the nine final entries: W_h(2j, w) ≤ c′ Cʲ with
  c′ = Σ_{l,r} v_{(l,r,0)} / v₀ ≥ 1, a constant independent of j, which disappears in the limit of §7.
- *Rounding.* Interior cell step: ≤ 5 terms (4 roundings). Left side step: ≤ 4n terms per entry,
  right side step ≤ 3n (n = 3 run states); the entries reached by an outside cover need ≤ 2 products
  by a factor and 1 addition, fewer than that. Over the 2w steps of A:
  2(4(w − 2) + (4n − 1) + (3n − 1)) = 8w + 14n − 20 ≤ 12w roundings for w ≥ 6, the budget of §6. The
  factors are rounded up (T only grows), the factor 1 is exact. Float ratios recomputed exactly for
  w = 2...8: |float/exact − 1| ≤ 1.7·10⁻¹⁶ (`U9`).

**Verdict: CONFIRMED** (the steps above; `out/out_audit_bounds.txt` U6-U9, 0 failures). The w = 24 run
itself (13.3 GiB, 63 min) was not repeated in the independent review of October 2026; the widths
w ≤ 22 of `out/out_runweight_3state.txt` were.
