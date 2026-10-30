# Numbers in the paper: number → file → script

Every number printed in `paper/king-entropy.tex` is listed below with the committed file it is read from and
the script (and arguments) that wrote that file. Paths are relative to `research/king-entropy/`.
The numbers of the companion note `paper/king-entropy-log-convexity.tex` are listed at the end.

## Scripts and the files they write

All commands run from `research/king-entropy/`. Code commit = last change of the script before the
output was committed (see `git log -- <script>`). Outputs of the first version record commit SHAs
of the history under the tag `king-entropy-v0.1.0`; outputs added or regenerated in this version record
SHAs of the tag `king-entropy-v1.0.0`.

| file | command |
| --- | --- |
| `data/sec/sec_king_cyl_3_13.json`, `data/sec/sec_king_cyl_14_19.json`, `data/sec/sec_king_free_1_18.json`, `data/sec/sec_tri_cyl_3_18.json` | `python3 src/tm2.py <lat> <bc> <w0> <w1>` |
| `data/eig/eig_king_cyl_w<w>_p<p>.json`, `logs/log_eig_*.txt` | `python3 src/cylw.py king cyl <w> <p>` |
| `data/lean/lean_*.json`, `logs/log_lean_*.txt` | `python3 src/lean.py <lat> <bc> <w> <p\|-> <float64\|longdouble> [cw]` |
| `out/out_errbar.txt`, `data/errbar.json` | `python3 src/errbar.py` (run before `estimate.py`, which reads `errbar.json`) |
| `out/out_estimate.txt`, `data/z2.json` | `python3 src/estimate.py` |
| `out/out_bounds.txt`, `data/bounds.json` | `python3 src/bounds.py 24` |
| `out/out_runweight_3state.txt`, `data/runweight_3state.json` | `python3 src/runweight.py 3state 2 3 ... 23`, then `python3 src/runweight.py 3state 24 --disk <dir>` (its line appended) |
| `out/out_audit_bounds.txt` | `python3 src/audit_bounds.py` |
| `out/out_pfaff.txt` | `python3 src/pfaff_rigor.py` |
| `out/out_corner.txt`, `data/corner.json` | `python3 src/corner.py` (after `errbar.py` and `surface.py`) |
| `log-convexity/out_modes.txt` | `python3 log-convexity/modes.py` |
| `log-convexity/out_levels.txt`, `log-convexity/time_levels.txt` | `python3 src/timed.py python3 log-convexity/levels.py > log-convexity/out_levels.txt 2> log-convexity/time_levels.txt` |
| `out/out_surface.txt`, `data/surface.json` | `python3 src/surface.py` |
| `out/out_ctmrg.txt`, `logs/time_ctmrg.txt` | `python3 src/timed.py python3 src/ctmrg.py > out/out_ctmrg.txt 2> logs/time_ctmrg.txt` |
| `out/out_cw.txt`, `data/cw.json` | `python3 src/cw.py` |
| `out/out_validate.txt` | `python3 src/validate.py` |
| `out/out_crosscheck.txt` | `python3 src/crosscheck.py` |
| `out/out_fitsq.txt` | `python3 src/fitsq.py` |
| `data/zex/zex_<lat>_<bc>_m<m>_K<K>.json` | `python3 src/zexact.py <lat> <bc> <m> <K>` |
| `out/out_ltest.txt`, `data/ltest.json` | `python3 src/ltest.py` |
| `out/out_lcert_m25.txt`, `out/out_lcert_m26.txt` | `python3 src/lcert.py 25 30`, `python3 src/lcert.py 26 30` |
| `out/out_lweight.txt`, `out/out_lweight_big.txt` | `python3 src/lweight.py`, `python3 src/lweight.py big` |
| `out/out_lparity.txt` | `python3 src/lparity.py` |
| `out/out_lspec.txt` | `python3 src/lspec.py` |
| `out/out_repro.txt` | `python3 src/repro.py` |
| `logs/time_<name>.txt` | `python3 src/timed.py <command>` (wall time and peak RSS) |
| `out/out_derived.txt` | `python3 src/derived.py` |

## Numbers, in the order of `paper/king-entropy.tex`

"rounded" = the paper prints the file value to fewer digits. "arithmetic" = a one-line
computation from the listed values, done in `src/derived.py` unless stated otherwise.

### Abstract and introduction

| number | meaning | file | script |
| --- | --- | --- | --- |
| 0.5655119110413253 ± 6·10⁻¹⁶ | s, error bar | `out/out_errbar.txt` (RECOMMENDATION line) | `src/errbar.py` |
| 0.545343749727, 0.586216605404 | certified bounds, w = 24 (lower; upper with weight √φ) | `out/out_bounds.txt` (BEST CERTIFIED) | `src/bounds.py 24` |
| 0.582767477484 | run-weighted upper bound, w = 24 | `out/out_runweight_3state.txt` | `src/runweight.py 3state 24 --disk <dir>` |
| 0.242017935766251 ± 9·10⁻¹⁵ | σ | `out/out_surface.txt` (RESULT; 9.2e-15 rounded) | `src/surface.py` |
| ξ = 1.236091 ± 10⁻⁶ | splitting length, 1/m_v | `log-convexity/out_levels.txt` (section B: RESULT line, ξ = 1.2360912 at w = 22; changes 1.8·10⁻⁷ and 8.9·10⁻⁹ over the last two widths; the error is the larger change times five, rounded up) | `log-convexity/levels.py` |
| 0.565511911035, 0.565511911049 | conditional bounds given (L∞), (O) | `out/out_cw.txt` (section E, CONDITIONAL INTERVAL) | `src/cw.py` |
| κ = 0.36319625605 ± 3·10⁻¹⁰ | corner free energy | `out/out_corner.txt` (RESULT) | `src/corner.py` |
| 1453 | (L) cases checked on the king's graph | 875 + 550 (`out/out_ltest.txt` totals) + 14 + 14 (`out/out_lcert_m25.txt`, `out/out_lcert_m26.txt`, 2q = 2...28) | `src/ltest.py`, `src/lcert.py` |
| A239264, A239273, A239265, A239268, A243510 | OEIS ids | literature (`paper/refs.bib`) | - |
| 72 > 3·25 − 6 | edges of the 5×5 king graph | `out/out_derived.txt` | `src/derived.py` |
| 1.34254...1.34265 | constant listed by Finch | Finch, arXiv:2001.00578, first volume, §5.12 (literature) | - |
| 1.342643951124... | non-attacking kings, A247413 | literature (`paper/refs.bib`, `oeisA247413`) | - |
| e⁻⁶ ... e⁻³ | diagonal fugacities of Sandvik and Moessner | literature (`sandvikmoessner2006`) | - |
| 2s = 1.13102382208265, eˢ = 1.76034869404198 | per dimer, per site | `out/out_derived.txt` (rounded to 14 decimals; both ends of s ± 6·10⁻¹⁶ round to the same) | `src/derived.py` |
| 3 | tilings of the 2×2 board | `out/out_validate.txt` (`2x2 = 3`) | `src/validate.py` |
| 2 × 2 sites | CTMRG block | `src/ctmrg.py` (`site`); exactness on the 4×4 ... 6×6 boards in `out/out_ctmrg.txt` section 1 | `src/ctmrg.py` |

### Section 2 (model)

| number | meaning | file | script |
| --- | --- | --- | --- |
| 2.909568954808860 vs 2.909403518708946 | free strip w = 6: max over sectors vs e₀ sector | `out/out_cw.txt` (section C, `log rho`, m = 6) vs `data/bounds.json` (`log_lambda_free` 6) | `src/cw.py`, `src/bounds.py 24` |
| w = 6, 10, 14, 18 | widths where the two differ | `out/out_cw.txt` section C vs `data/bounds.json` | same |
| 4·10⁻¹⁵, 3 iterations, 19 iterations | stopping rule | `src/cylw.py` (`tol`), `data/eig/eig_king_cyl_w2*_p*.json` (`iterations`) | `src/cylw.py` |
| 2²⁸ doubles | state vector at w = 25 | `tmfast.nbits` (w + 3 = 28) | - |
| 8.4 GiB, 22.5 min | w = 25 run | `data/eig/eig_king_cyl_w25_p1.json` (`maxrss_mib` 8641.5, `wall` 1351.3 s) | `src/cylw.py king cyl 25 1` |
| f⁽⁰⁾ > s > f⁽¹⁾ | even sectors bracket s | `out/out_estimate.txt` (even widths table) | `src/estimate.py` |
| period 4, factor 13.84 per two columns, k ≤ 18 | free-strip sector difference | `out/out_derived.txt` (ratios D(k)/D(k+2), −13.838 ... −13.851) | `src/derived.py` |
| 0.115 per iteration | convergence of the power iteration | arithmetic: e^(−2·1.0827) = 0.1147 | - |
| 29 edges, 43 perfect matchings, 23 equations | Theorem 2.1, B(3, 4) | `out/out_pfaff.txt` | `src/pfaff_rigor.py` |
| B(2, L), L ≤ 12; B(3, 6), B(4, 4), B(4, 5), B(4, 6); eleven boards up to B(11, 12) | Pfaffian checks | `out/out_pfaff.txt` | `src/pfaff_rigor.py` |
| E = 4KL − 3K − 3L + 2, g ≥ 74 at 24 × 24 | genus bound | `out/out_pfaff.txt` (edge count and Euler genus bound) | `src/pfaff_rigor.py` |
| B(3, 4) 3-connected and bicritical (a brick), 12 vertices | remark on complex weights; Lemma 3.5 of Norine-Thomas (`paper/refs.bib`, `norinethomas2008`) | `out/out_pfaff.txt` (brick check; Petersen and cube controls) | `src/pfaff_rigor.py` |

### Section 3 (value of s)

| number | file | script |
| --- | --- | --- |
| r_w 13.4 at w = 9 → 10.0 at w = 25 | `out/out_estimate.txt` (odd widths, float64, r = 13.382 at w = 9 ... 9.992 at w = 25); the end value 10.0 from extended precision, next rows | `src/estimate.py` |
| even-w sector brackets w = 18...24, midpoint 0.5655119110413465 | `out/out_estimate.txt` | `src/estimate.py` |
| Table 1 (all entries) | `out/out_estimate.txt` (odd widths; s₁₉ is printed there by Python's shortest repr as 0.56551191104116, which is 0.5655119110411600 to the 16 decimals of the other rows) | `src/estimate.py` |
| Table 1 caption: 5.991·10⁻¹⁴, 9.998, 0.56551191104132523 (w = 25, extended precision); r_w drifts to 10.0 | `replication/out/analyze_eig.txt` (section 2), from `data/lean/*longdouble*` | `replication/analyze_eig.py` |
| extended-precision inputs: odd w = 5...25, even w = 4...24 | `out/out_errbar.txt` (first line); `data/lean/lean_king_cyl_w*_p*_longdouble.json` | `src/errbar.py`, `src/lean.py` |
| m = 1.082727; same gap at w = 20...25 | `out/out_crosscheck.txt` (in-sector gap); `out/out_errbar.txt` (gap block, 1.0827 ... 1.082701) | `src/crosscheck.py`, `src/errbar.py` |
| Table 2 (all entries) | `out/out_errbar.txt` (rows W = 25 odd, W = 24 midpoints; backtest change = difference from the row W − 2); also `data/errbar.json` | `src/errbar.py` |
| 1 % of \|d_W\|: 6.0·10⁻¹⁶, 1.9·10⁻¹⁵; G dropped | `out/out_errbar.txt` (predictive backtest: \|d_W\| = 5.99e-14, 1.89e-13; kept/dropped) | `src/errbar.py` |
| ξ_odd = 0.929, b = −1.80 | `out/out_errbar.txt` (extras at W = 25: 0.9294, −1.803) | `src/errbar.py` |
| L1 backtests 2-4·10⁻⁵, L2 and R2 1-2·10⁻⁶ at W = 23 | `out/out_errbar.txt` (predictive backtest, odd) | `src/errbar.py` |
| 18 kept, [0.56551191104132527, 0.56551191104132534] | `out/out_errbar.txt` (kept range 0.565511911041325278 ... 0.565511911041325337; rounded outward to the 17 decimals of Table 2) | `src/errbar.py` |
| 9.0·10⁻¹⁷ = 3.0·10⁻¹⁷ + 6.0·10⁻¹⁷; 3.4·10⁻¹⁷; 6·10⁻²⁰; 1.5·10⁻¹⁶; total 2.7·10⁻¹⁶ (2.72·10⁻¹⁶ before rounding, `data/errbar.json` `budget`) | `out/out_errbar.txt` (BUDGET line; gap 5.6e-20) | `src/errbar.py` |
| x = e^(−2/1.2351), w₀ = 11, 13, 15, 17; fitted B between 0.9·10⁻³ d₂₅ (w₀ = 11) and 1.95·10⁻³ d₂₅ (w₀ = 13); −1.6·10⁻³ d₂₅ ≤ B ≤ 3.4·10⁻³ d₂₅ | `out/out_errbar.txt` (hidden slow mode block: B free per window, allowed) | `src/errbar.py` |
| d₂₇ within 1.5·10⁻⁴ of the L1 prediction, 1.0·10⁻³ for B = 1.95·10⁻³ d₂₅, \|B\| ≤ 2.8·10⁻⁴ d₂₅, 1.4·10⁻¹⁸ | `out/out_hidden_oos.txt` (sections 1-3); w = 25, 27 from `replication/out/eig_summary.json` | `src/hidden_oos.py` |
| 6.2·10⁻¹⁷ per site over 33 cylinders | `out/out_errbar.txt` (rounding block) | `src/errbar.py` |
| 0.5655119110413253 ± 6·10⁻¹⁶, centre 0.5655119110413253176 | `out/out_errbar.txt` (RECOMMENDATION; `data/errbar.json` `recommended.s`) | `src/errbar.py` |
| further digits: 2.13 widths, 4.4 times the memory per digit | `out/out_derived.txt` (widths per decimal digit 2.127, memory factor 4.37; rounded), with m = 1.082727 | `src/derived.py` |
| rounding term 1.5·10⁻¹⁶ of 2.7·10⁻¹⁶; 7.8·10⁻²⁰ per site, about 19 digits | as in the error budget above; `replication/out/compare_eig.txt` (lean longdouble); `out/out_derived.txt` (19.1 digits) | `src/errbar.py`, `replication/compare_eig.py`, `src/derived.py` |
| 4.3 GiB at w = 24, 8.4 GiB at w = 25; time about the same factor | `out/out_estimate.txt` (cost table: peak RSS 4353 and 8642 MiB, wall 660.2 and 1351.3 s) | `src/cylw.py king cyl <w> <p>` |
| 4.1·10⁻¹⁶ | `out/out_crosscheck.txt` section A (max diff 4.06e-16; rounded) | `src/crosscheck.py` |
| 1.8·10⁻¹⁵ | `out/out_crosscheck.txt` section B (−1.78e-15; rounded) | `src/crosscheck.py` |
| independent code: 7.8·10⁻²⁰ (extended), 6.2·10⁻¹⁷ (float64) per site | `replication/out/compare_eig.txt` (max \|diff\| per site by source: lean longdouble 7.8e-20; sec float64 6.2e-17, eig float64 3.9e-17, lean float64 3.1e-17) | `replication/compare_eig.py` |
| w = 26 (both sectors) and 27 extended, w = 28 (both sectors) float64; 1.9·10⁻⁴, 1.5·10⁻⁴, 5.4·10⁻⁴ | `replication/out/analyze_eig.txt` (section 6: ratios 1.00019, 1.00015, 1.00054 of measured to predicted d_w) | `replication/analyze_eig.py` |
| d₂₈ resolved to about 6·10⁻³ | `out/out_derived.txt` (resolution of d_28: 0.0057), from `replication/out/analyze_eig.txt` (section 8: float64 vs long double ≤ 1.11e-17 per site) and \|d₂₈\| = 1.93518e-15 | `src/derived.py` |
| CTMRG: χ = 32, 6·10⁻¹⁷ | `out/out_ctmrg.txt` section 2 (king chi = 32: s − ref = −6.3e-17; rounded) | `src/ctmrg.py` |
| CTMRG: χ = 64, 30 cycles, 6.2·10⁻¹⁶ | `out/out_ctmrg.txt` section 4 (cycles 11..40, largest \|s − ref\| = 6.2e-16) | `src/ctmrg.py` |
| CTMRG: triangular entropy to its 15 digits | `out/out_ctmrg.txt` section 2 (tri chi = 32: s − ref = +1.8e-16 against the 15-digit Kasteleyn value of `out/out_validate.txt` section 4) | `src/ctmrg.py` |
| 0.5655119110413253187; 1.1·10⁻¹⁸ | `replication/out/analyze_eig.txt` (section 5, odd W = 27, L1); `out/out_derived.txt` (difference from the centre) | `replication/analyze_eig.py`, `src/derived.py` |

### Section 4 (bounds)

| number | file | script |
| --- | --- | --- |
| 0.662787681422 | `out/out_bounds.txt` (Kahn-Lovasz) | `src/bounds.py 24` |
| Table 3, columns 2-3 | `out/out_bounds.txt` | `src/bounds.py 24` |
| Table 3, column 4; 0.582767477484 (Theorem 4.1) | `out/out_runweight_3state.txt` (w = 24 line) | `src/runweight.py 3state` |
| 0.484/w, 0.497/w, 0.414/w | `out/out_derived.txt` (w(s − lower_w) = 0.484, w(upper_w − s) = 0.4969, run-weighted 0.4141; rounded) | `src/derived.py` |
| M(A, B) ≤ min(F(A), F(B)), F_(l+1) ≤ 2φ^(l−2) | Lemma 4.6, proof in the paper; checked in `out/out_audit_bounds.txt` (U6) | `src/audit_bounds.py` |
| 8w + 14n − 20 ≤ 12w | rounding count, `src/runweight.py` docstring | - |
| m ≤ 8; 58 boards; 57 evaluations; w = 2...8, 1.7·10⁻¹⁶ | `out/out_audit_bounds.txt` (U6-U9; max 1.63e-16; rounded up) | `src/audit_bounds.py` |
| 3.2·10⁻¹⁴ | `out/out_derived.txt` (12wu at w = 24 = 3.197e-14) | `src/derived.py` |
| 10⁻¹², 10⁻²⁸⁰ | constants in `src/bounds.py` (`certify`) | - |
| 58 boards, K ≤ 8, kw ≤ 12; m ≤ 11; m ≤ 8; 162 evaluations; 40 boards; z = 0.5 | `out/out_audit_bounds.txt` (U1-U4, L1) | `src/audit_bounds.py` |
| 1.7·10⁻¹⁶ | `out/out_audit_bounds.txt` (U5/L2, max \|float/exact − 1\| = 1.71e-16; rounded) | `src/audit_bounds.py` |
| (5 + 2√2), constant c′ | proof of the upper bound | - |

### Section 5 (surface)

| number | file | script |
| --- | --- | --- |
| Table 4 (g(k) in the paper) | `out/out_surface.txt` (f(k) lines) | `src/surface.py` |
| 8.719 per two columns, k = 19...25 | arithmetic on Table 4: (g(21) − g(19))/(g(23) − g(21)) = 8.718, next 8.719; e^(2·1.0827) = 8.719 | - |
| 13.84 | as in Section 2 | `src/derived.py` |
| −26 δs, 13 δs | arithmetic (k = 26) | - |
| [−0.4840358715325015, −0.4840358715325006], −0.484035871532501 ± 1.8·10⁻¹⁴ | `out/out_surface.txt` | `src/surface.py` |
| odd models agree to 2·10⁻¹⁶ | `out/out_surface.txt` (odd k, row W = 25: −0.4840358715325007 ... −0.4840358715325009) | `src/surface.py` |
| κ, 0.363196256048, 1.4·10⁻¹⁰, 2.6·10⁻¹¹, 1.2·10⁻¹², 3·10⁻¹⁰; ratios 5.85 → 5.58 | `out/out_corner.txt` (section 1) | `src/corner.py` |
| 6.3·10⁻⁸ for min(K, L) ≥ 20; sign by parity | `out/out_corner.txt` (rectangles; printed 6.2e-8, the maximum is 6.249·10⁻⁸ at 20 × 20 per `replication/out/corner.txt`, so the bound is rounded up) | `src/corner.py` |
| C = 1.437918032, d = 9.60273202731337, f = 6.931966132248; −2.0·10⁻⁹ at n = 12; factor 5.6 | `out/out_corner.txt` (section 2) | `src/corner.py` |
| 5.3·10⁻⁹, 1.0·10⁻¹⁰, 1.1·10⁻¹¹, 5.9·10⁻¹³; JS counts L ≤ 20 | `out/out_corner.txt` (section 3) | `src/corner.py` |
| exact counts K, L ≤ 24 | `data/zex/zex_king_free_m*_K*.json` | `src/zexact.py king free <m> <K>` |

### Section 6 (splitting)

| number | file | script |
| --- | --- | --- |
| Table 5; ξ = 1.1931, rms 1.5·10⁻²; ξ = 1.2323, b = −0.433, rms 9.3·10⁻⁴; ξ_∞ = 1.2351, b = −0.467; ξ = 1.2387, rms 2.6·10⁻³ (b = −1/2) | `out/out_estimate.txt` (Z2 block) | `src/estimate.py` |
| m_v = 0.8090018253 (L = 22); changes of ξ_L 1.8·10⁻⁷ (L = 18 → 20), 8.9·10⁻⁹ (20 → 22); ξ = 1.236091 ± 10⁻⁶ | `log-convexity/out_levels.txt` (section B: table column m_v, line \|xi_w − xi_{w−2}\|, RESULT) | `log-convexity/levels.py` |
| b_w = −0.478, −0.481, −0.482 at w = 20, 22, 24; −0.495 | `log-convexity/out_levels.txt` (section B4: b_w −0.4780, −0.4809, −0.4821; b_inf −0.4947; Δ_w from `data/lean/lean_king_cyl_w*_p*_longdouble.json`) | `log-convexity/levels.py` |
| drift of b_w by about δw | arithmetic: an error δ in the rate changes the numerator by 2δ and log(w/(w−2)) ≈ 2/w | - |
| ξ error covers only the convergence in L; b_w confirms the rate to a few units of 10⁻⁴ | arithmetic: b_w moves by 0.004 from w = 20 to 24 (section B4), and a rate error δ moves it by about 4δ there, so δ of a few 10⁻⁴ is not excluded beyond the 1/w trend | - |
| 0.13 % (hidden mode, Section 3) | arithmetic: x = e^(−2/ξ), relative change 2(1.236091 − 1.2351)/1.2351² = 1.3·10⁻³ | - |
| 1.082727, negative λ₃ | `out/out_crosscheck.txt` (in-sector gap; eigenvalue −2.765e4) | `src/crosscheck.py` |
| same gap at w = 20...25 | `out/out_errbar.txt` (gap block) | `src/errbar.py` |
| 0.92 | arithmetic: 1/1.0827 | - |
| 1/ξ_odd ≈ 1.07 | arithmetic: 1/0.929 (`out/out_errbar.txt`) | - |
| π/6, G/π ± 6·10⁻⁸ | `out/out_validate.txt` (section 3: 5.68e-8; rounded) | `src/validate.py` |

### Section 7 (solvable lattices)

| number | file | script |
| --- | --- | --- |
| 90 boards, w = 3...6, h = 1...4; 18×18, 20×20 | `out/out_validate.txt` (sections 1, 2) | `src/validate.py` |
| 10⁻¹⁶ (square lattice) | `out/out_validate.txt` (section 3, max\|diff\| ≤ 6.0e-17) | `src/validate.py` |
| 1848358752, 1852300296658080, 57261989986381118073728 | `out/out_validate.txt` (section 4) | `src/validate.py` |
| 0.428594537464959, 0.428594537464956, 2.9·10⁻¹⁵ | `out/out_validate.txt` (section 4) | `src/validate.py` |
| 0.857189074 per dimer | literature (`wu2006`); 2 × 0.428594537 | - |
| Table 6 (context); 2.7 %, 1.2 % | `out/out_derived.txt` (lattice context); the percentages are arithmetic, Bethe/s − 1 = 1/0.97391 − 1 = 2.68 % and 1/0.98803 − 1 = 1.21 % | `src/derived.py` |

### Section 8 (convexity conjectures and the conditional bound)

| number | file | script |
| --- | --- | --- |
| 1 − √2 | `out/out_cw.txt` (section A: −0.4142) | `src/cw.py` |
| odd w = 3...25 below the estimate, 2.5·10⁻³ at w = 3, 6.7·10⁻¹⁵ at w = 25; even w: sector 0 above it | `out/out_derived.txt` (odd cylinders, s − f_w: 0.00249 ... 6.71e-15, all positive; even cylinders w = 4...24, sector 0 above and sector 1 below at every w); w = 26, 28 from `replication/out/analyze_eig.txt` (section 3) | `src/derived.py`, `replication/analyze_eig.py` |
| 0.565511911035, 0.565511911049, width 1.32·10⁻¹¹ | `out/out_cw.txt` (section E, CONDITIONAL INTERVAL) | `src/cw.py` |
| 13.08824999346029, 12.52273808241305, 11.95722617139012, 13.08824999346131; 10⁻¹⁴ | `out/out_cw.txt` (section E); the lower bounds are 24 and 23 times `data/bounds.json` `lower` 24, 23 minus 10⁻¹⁴ (`src/cw.py`, `low`) | `src/cw.py` |
| 0.5655119110; 6.3·10⁻¹², 7.7·10⁻¹² | arithmetic from the interval and s | - |
| second differences positive 2q = 2...24, odd negative k = 3...23, alternation k = 0...25, 5.9·10⁻¹² | `out/out_derived.txt` (sign-pattern block) | `src/derived.py` |
| −0.338 | `out/out_derived.txt` (step-1 ratios, −0.3327 ... −0.3425) | `src/derived.py` |
| −13.84 | `out/out_derived.txt` (ratios D(k)/D(k+2)) | `src/derived.py` |
| 0.1147, −0.072, 0.007, 0.63 | `log-convexity/out_linf.txt` | `log-convexity/linf.py 16` |
| 1453 | as in the introduction | `src/ltest.py`, `src/lcert.py` |
| θ = −0.3386706 λ₁, C = 0.28823, ±0.2687942 i λ₁, C̃ = 0.11466, L = 22 | `log-convexity/out_levels.txt` (section B, w = 22 row: −0.3386706092, 0.288230, 0.268794172, 0.114661) | `log-convexity/levels.py` |
| −13.841 | `log-convexity/out_levels.txt` (section B, w = 22: 1/r_-^2 = 13.84077) | `log-convexity/levels.py` |
| 2·10⁻⁴ for k = 16...20; within 1.8·10⁻¹⁴ for k = 21...26; 8·10⁻⁵ at 2q = 20, 22, 24; 6·10⁻⁴ for D(k), k = 12...18 | `log-convexity/out_levels.txt` (section B3: ratios 1.00017 ... 0.99996 for k = 16...20, largest deviation 1.7·10⁻⁴; for k = 21...26 the absolute differences of the printed pairs are at most 8.4·10⁻¹⁶ (k = 21), below the error 1.8·10⁻¹⁴ of −2σ in `data/surface.json`; d_q 7.3·10⁻⁵, 2.5·10⁻⁵, 6.4·10⁻⁵ by arithmetic on the printed pairs; D(k) ratios 0.99758 ... 1.00058 for k = 10...18, 5.8·10⁻⁴ for k ≥ 12) | `log-convexity/levels.py` |
| 0.28822 ± 1.6·10⁻⁵ | `log-convexity/out_levels.txt` (section B2: k = 19, C_k = 0.288220 +- 1.6e-05) | `log-convexity/levels.py` |
| r_- < ρ, L ≤ 22 | `log-convexity/out_levels.txt` (section B: ν₁/θ₁ about 0.2688 i against θ_neg/θ₁ about −0.3387 at every w = 8...22) | `log-convexity/levels.py` |
| x* ∈ (1.9823, 1.9830), bracketing by L mod 4; x = 3/2 convex from width 22 (prediction); sign changes at x = 2, 3; gaps open | `log-convexity/out_levels.txt` (section D: RESULT (1.9824, 1.9830) from x*_20 = 1.98237, x*_22 = 1.98297, the lower end rounded down; sections C, E, F) | `log-convexity/levels.py` |
| 5.06·10⁻¹¹ at w = 24 | `out/out_derived.txt` (king cylinders w = 24: p0 − p1) | `src/derived.py` |

### Section 9 (reproducibility)

| number | file | script |
| --- | --- | --- |
| Python 3.13, numpy 2.5.3, mpmath 1.4.1, scipy 1.18.1 | `README.md`, `src/requirements.txt` | - |
| four cores, about 16 GiB, two machines | see the note below | - |
| 8.4 GiB, 22.5 min | `data/eig/eig_king_cyl_w25_p1.json` | `src/cylw.py king cyl 25 1` |
| 17 min | `logs/time_bounds.txt` (wall 1042.1 s) | `src/timed.py python3 -u src/bounds.py 24` |
| 13.3 GiB, 63 min | `logs/time_runweight_3state_w24.txt` (maxrss 13581 MiB incl. the memory-mapped vector, wall 3787.2 s) | `src/timed.py python3 src/runweight.py 3state 24 --disk <dir>` |
| 1.5 GiB, 52 min | `logs/time_zex_king_free_m24_K24.txt` (maxrss 1562 MiB, wall 3116.4 s) | `src/timed.py python3 src/zexact.py king free 24 24` |
| 8.0 GiB, 43 min | `logs/time_lcert_m26.txt` (maxrss 8223 MiB, wall 2557.3 s) | `src/timed.py python3 src/lcert.py 26 30` |
| 2.4 GiB, 13 min (arm64) | `log-convexity/time_levels.txt` (maxrss 2408 MiB, wall 772.9 s) | `src/timed.py python3 log-convexity/levels.py` |
| 0.9 GiB, 2.4 min (arm64) | `logs/time_ctmrg.txt` (maxrss 936 MiB, wall 144.1 s) | `src/timed.py python3 src/ctmrg.py` |

Note on the machines. The runs of the first version used one machine with four cores and 15.7 GiB of
memory. The runs added in this version (`data/lean/*longdouble*` of the cylinders, `runweight.py`,
`zexact.py` 24 × 24, `pfaff_rigor.py`, `corner.py`, `log-convexity/modes.py`, the re-runs of `bounds.py`,
`audit_bounds.py`, `errbar.py`, `estimate.py` and `cw.py`) used a second x86-64 machine with four
cores and 15.7 GiB; the `lean.py` outputs record `machine` and `nmant` = 63. From the
measured memory of `src/cylw.py` (`out/out_estimate.txt`, cost table: 8.4 GiB at w = 25, about doubling
per width), the cylinder w = 26 needs about 17 GiB, more than the machine has, so `src/` stops at
w = 25. `log-convexity/levels.py`, `src/ctmrg.py` (both float64 only) and the brick check appended to `out/out_pfaff.txt` ran in October 2026 on an
arm64 Mac (Python 3.14, the pinned numpy, scipy and mpmath); the earlier lines of `out/out_pfaff.txt` are unchanged. The independent code of `replication/` needs less memory and ran w = 26, 27 and 28 (12.0 GiB at
w = 27 and 28, `replication/REPORT.md`); those widths enter only the check of Section 3, not the estimate. `/usr/bin/time` was not available; `src/timed.py` records wall time and peak RSS instead.

## Companion note `paper/king-entropy-log-convexity.tex`

The note shares `refs.bib` and the outputs above; numbers that also appear in Section 8 of the paper
have the same sources.

| number | file | script |
| --- | --- | --- |
| 0.5655119110413253 ± 6·10⁻¹⁶; 0.545343749727, 0.582767477484 | as in the paper (Theorem 4.1) | - |
| 1453 cases, m ≤ 26, cylinders m ≤ 22; Table 1 | `out/out_ltest.txt`, `out/out_lcert_m25.txt`, `out/out_lcert_m26.txt` | `src/ltest.py`, `src/lcert.py` |
| triangular, weights, onsets, Krein signature, J-orbits | `out/out_lweight*.txt`, `log-convexity/out_symmetry.txt`, `log-convexity/out_linf.txt` | as in Section 8 above |
| Z(8, m)² > Z(6, m)Z(10, m): 35 ≤ m (x = 3/2), 21 ≤ m (x = 2), 19 ≤ m (x = 3), m ≤ 60 | `log-convexity/out_linf.txt` (last block) | `log-convexity/linf.py 16` |
| Table 2 (two modes): ρ₊, ρ₋, first and last ratios, negative 2q | `log-convexity/out_modes.txt` | `log-convexity/modes.py` |
| −3.6·10⁻⁹ at 2q = 20 (x = 3/2) | `log-convexity/out_modes.txt` (x = 1.5; its lines "convex from about 2q = ..." are the point value of the last window's model, not a conclusion of the note) | `log-convexity/modes.py` |
| drift 0.03-0.08 | `log-convexity/out_modes.txt` (first and last window ratios) | `log-convexity/modes.py` |
| (7/4, 2), 1.96 (the interval and estimate of the fits) | `log-convexity/out_modes.txt` (crossing) | `log-convexity/modes.py` |
| Table 3: ρ₊, ρ₋, \|ρ₋\|/ρ₊, C, C̃ (L = 20); in-sector gap, m_v (L = 16) | `log-convexity/out_levels.txt` (section C: the per-x summary lines "w = 20 rho_+ ..." and the w = 20 rows for C, C~; the gap lines at w = 16) | `log-convexity/levels.py` |
| rates change by at most 4·10⁻⁴ and C by at most 0.8 % from L = 18 to 20 | `log-convexity/out_levels.txt` (section C rows w = 18, 20; largest at x = 3) | `log-convexity/levels.py` |
| 2·10⁻⁴, 6·10⁻⁴, 8·10⁻⁵ at x = 1 | as in Section 8 of the paper | `log-convexity/levels.py` |
| cylinder rates within 0.5 % of Table 2 (ρ₋ at x = 1: 0.6 %) | `log-convexity/out_levels.txt` (section C: relative differences, largest +0.0048 at x = 3, +0.0063 for ρ₋ at x = 1) | `log-convexity/levels.py` |
| x = 3/2: 0.9419, C = 0.344; 6·10⁻⁴ and 7·10⁻⁵ at 2q = 18, 20 (5.8e-04, 6.2e-05); 6.2·10⁻⁵ and 1.0·10⁻⁴ at L = 20, 22; −0.9960, 3.5·10⁻¹², 0.4 %, same at L = 20, 22 | `log-convexity/out_levels.txt` (section E: w = 20 and 22 blocks, margin line 0.0040, 0.0040) | `log-convexity/levels.py` |
| x = 2, 3: 1.0009, 1.0132; r₋/r₊ > 1 at L = 16, 18, 20; 0.99896 at L = 14, x = 2 | `log-convexity/out_levels.txt` (section F) | `log-convexity/levels.py` |
| x*_L = 2.0542, 1.9880, 1.9830 (L = 14, 18, 22), 1.9819, 1.9824 (L = 16, 20); x* ∈ (1.9823, 1.9830), lower end rounded down from 1.98237 | `log-convexity/out_levels.txt` (section D) | `log-convexity/levels.py` |
| in-sector gap 0.7532, m_v 0.6612 at x = 2 (lab note) | `log-convexity/out_levels.txt` (section C, gap lines) | `log-convexity/levels.py` |
| C = 0.2882, r₋² = 0.0723 (Open problem 5.1) | `log-convexity/out_levels.txt` (section B, w = 22: 0.288230, 0.268794172² = 0.07225) | `log-convexity/levels.py` |
| 7.6·10⁻¹⁰ (smallest d_q at x = 1) | `log-convexity/out_modes.txt` (x = 1, 2q = 20) | `log-convexity/modes.py` |
| 1 − √2, (1, −√2, 1) | `out/out_cw.txt` (section A) | `src/cw.py` |
| 0.047; 3.4·10⁶ pairs; 1847660, 912656, 32616 | `out/out_lspec.txt`, `out/out_lparity.txt` | `src/lspec.py`, `src/lparity.py` |
