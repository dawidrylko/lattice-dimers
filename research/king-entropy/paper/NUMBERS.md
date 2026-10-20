# Numbers in the paper: number → file → script

Every number printed in `paper/main.tex` is listed below with the committed file it is read from and
the script (and arguments) that wrote that file. Paths are relative to `research/king-entropy/`.

## Scripts and the files they write

All commands run from `research/king-entropy/`. Code commit = last change of the script before the
output was committed (see `git log -- <script>`). The commit SHAs recorded in the outputs refer to
the history under the tag `v1.0-king-entropy`.

| file | command |
| --- | --- |
| `data/sec/sec_king_cyl_3_13.json`, `data/sec/sec_king_cyl_14_19.json`, `data/sec/sec_king_free_1_18.json`, `data/sec/sec_tri_cyl_3_18.json` | `python3 src/tm2.py <lat> <bc> <w0> <w1>` |
| `data/eig/eig_king_cyl_w<w>_p<p>.json`, `logs/log_eig_*.txt` | `python3 src/cylw.py king cyl <w> <p>` |
| `data/lean/lean_*.json`, `logs/log_lean_*.txt` | `python3 src/lean.py <lat> <bc> <w> <p\|-> <float64\|longdouble> [cw]` |
| `out/out_estimate.txt`, `data/z2.json` | `python3 src/estimate.py` |
| `out/out_errbar.txt`, `data/errbar.json` | `python3 src/errbar.py` |
| `out/out_bounds.txt`, `data/bounds.json` | `python3 src/bounds.py 24` |
| `out/out_audit_bounds.txt` | `python3 src/audit_bounds.py` |
| `out/out_surface.txt`, `data/surface.json` | `python3 src/surface.py` |
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
| `paper/out_derived.txt` | `python3 paper/derived.py` |

## Numbers, in the order of `paper/main.tex`

"rounded" = the paper prints the file value to fewer digits. "arithmetic" = a one-line
computation from the listed values, done in `paper/derived.py` unless stated otherwise.

### Abstract and introduction

| number | meaning | file | script |
| --- | --- | --- | --- |
| 0.5655119110413253 ± 6·10⁻¹⁶ | s, error bar | `out/out_errbar.txt` (RECOMMENDATION line) | `src/errbar.py` |
| 0.545343749727, 0.586216605404 | certified bounds, w = 24 | `out/out_bounds.txt` (BEST CERTIFIED) | `src/bounds.py 24` |
| 0.242017935766251 ± 9·10⁻¹⁵ | σ | `out/out_surface.txt` (RESULT; 9.2e-15 rounded) | `src/surface.py` |
| ξ ≈ 1.23 | splitting length | `out/out_estimate.txt` (fits 1.2323, 1.2351; rounded) | `src/estimate.py` |
| 0.565511911035 | bound given (L∞) | `out/out_cw.txt` (section E) | `src/cw.py` |
| 1451 | (L) cases checked on the king's graph | 873 + 550 (`out/out_ltest.txt` totals) + 14 + 14 (`out/out_lcert_m25.txt`, `out/out_lcert_m26.txt`, 2q = 2...28) | `src/ltest.py`, `src/lcert.py` |
| A239264, A239273, A239265, A239268, A243510 | OEIS ids | literature (`paper/refs.bib`) | - |
| 72 > 3·25 − 6 | edges of the 5×5 king graph | `paper/out_derived.txt` | `paper/derived.py` |
| 1.34254...1.34265 | hard-square constant | Finch, arXiv:2001.00578, §5.12 (literature) | - |
| 2s = 1.13102382208265, eˢ = 1.76034869404198 | per dimer, per site | `paper/out_derived.txt` (rounded to 14 decimals; both ends of s ± 6·10⁻¹⁶ round to the same) | `paper/derived.py` |
| 3 | tilings of the 2×2 board | `out/out_validate.txt` (`2x2 = 3`) | `src/validate.py` |

### Section 2 (model)

| number | meaning | file | script |
| --- | --- | --- | --- |
| 2.909568954808860 vs 2.909403518708946 | free strip w = 6: max over sectors vs e₀ sector | `out/out_cw.txt` (section C, `log rho`, m = 6) vs `data/bounds.json` (`log_lambda_free` 6) | `src/cw.py`, `src/bounds.py 24` |
| w = 6, 10, 14, 18 | widths where the two differ | `out/out_cw.txt` section C vs `data/bounds.json` | same |
| 4·10⁻¹⁵, 3 iterations, 19 iterations | stopping rule | `src/cylw.py` (`tol`), `data/eig/eig_king_cyl_w2*_p*.json` (`iterations`) | `src/cylw.py` |
| 2²⁸ doubles | state vector at w = 25 | `tmfast.nbits` (w + 3 = 28) | - |
| 8.4 GiB, 22.5 min | w = 25 run | `data/eig/eig_king_cyl_w25_p1.json` (`maxrss_mib` 8641.5, `wall` 1351.3 s) | `src/cylw.py king cyl 25 1` |
| f⁽⁰⁾ > s > f⁽¹⁾ | even sectors bracket s | `out/out_estimate.txt` (even widths table) | `src/estimate.py` |

### Section 3 (value of s)

| number | file | script |
| --- | --- | --- |
| r_w 13.4 → 9.99 | `out/out_estimate.txt` (odd widths, r = 13.382 ... 9.992; rounded) | `src/estimate.py` |
| even-w sector brackets w = 18...24, midpoint 0.5655119110413465 | `out/out_estimate.txt` | `src/estimate.py` |
| Table 1 (all entries) | `out/out_estimate.txt` (odd widths) | `src/estimate.py` |
| Table 2 (all entries) | `out/out_errbar.txt` (rows W = 25 odd, W = 24 midpoints; backtest block) | `src/errbar.py` |
| ξ_odd = 0.9324, b = −1.880 | `out/out_errbar.txt` (extras at W = 25) | `src/errbar.py` |
| [0.5655119110413252, 0.56551191104132547], centre 0.56551191104132534, half-width 1.3·10⁻¹⁶ | `out/out_errbar.txt` | `src/errbar.py` |
| 4.1·10⁻¹⁷ per site, 1.49 | `out/out_errbar.txt` (rounding block: 4.09e-17, sum 1.494; rounded) | `src/errbar.py` (inputs `data/lean/lean_king_cyl_w*_p1_longdouble.json`) |
| 0.56551191104132531-2 | `out/out_errbar.txt` (PE/R1/R2/2E on longdouble values) | `src/errbar.py` |
| 4.1·10⁻¹⁶ | `out/out_crosscheck.txt` section A (max diff 4.06e-16; rounded) | `src/crosscheck.py` |
| 1.8·10⁻¹⁵ | `out/out_crosscheck.txt` section B (−1.78e-15; rounded) | `src/crosscheck.py` |
| 0.565512081672 | `out/out_fitsq.txt` (fit on [16, 18, 20]) | `src/fitsq.py` |

### Section 4 (bounds)

| number | file | script |
| --- | --- | --- |
| 0.662787681422 | `out/out_bounds.txt` (Kahn-Lovasz) | `src/bounds.py 24` |
| Table 3 (all entries) | `out/out_bounds.txt` | `src/bounds.py 24` |
| 0.484/w, 0.497/w | `paper/out_derived.txt` (w(s − lower_w) = 0.484, w(upper_w − s) = 0.4969; rounded) | `paper/derived.py` |
| 3.2·10⁻¹⁴ | `paper/out_derived.txt` (12wu at w = 24 = 3.197e-14) | `paper/derived.py` |
| 10⁻¹², 10⁻²⁸⁰ | constants in `src/bounds.py` (`certify`) | - |
| 58 boards, K ≤ 8, kw ≤ 12; m ≤ 11; m ≤ 8; 162 evaluations; 40 boards; z = 0.5 | `out/out_audit_bounds.txt` (U1-U4, L1) | `src/audit_bounds.py` |
| 1.7·10⁻¹⁶ | `out/out_audit_bounds.txt` (U5/L2, max \|float/exact − 1\| = 1.71e-16; rounded) | `src/audit_bounds.py` |
| 11.95722617139012 | `out/out_cw.txt` (section E, `log lambda_22 <=`) | `src/cw.py` |

### Section 5 (surface)

| number | file | script |
| --- | --- | --- |
| Table 4 | `out/out_surface.txt` (f(k) lines) | `src/surface.py` |
| [−0.4840358715325015, −0.4840358715325006], −0.484035871532501 ± 1.8·10⁻¹⁴ | `out/out_surface.txt` | `src/surface.py` |
| a = −0.96808 | `out/out_fitsq.txt` ([16, 18, 20]: a = −0.9680783717; rounded) | `src/fitsq.py` |
| −4σ = −0.9680717 | `paper/out_derived.txt` (−0.9680717431; rounded) | `paper/derived.py` |

### Section 6 (splitting)

| number | file | script |
| --- | --- | --- |
| Table 5; ξ = 1.1931, rms 1.5·10⁻²; ξ = 1.2323, b = −0.433, rms 9.3·10⁻⁴; ξ_∞ = 1.2351 | `out/out_estimate.txt` (Z2 block) | `src/estimate.py` |
| 1.082727 | `out/out_crosscheck.txt` (in-sector gap) | `src/crosscheck.py` |
| 1/ξ_odd ≈ 1.07 | arithmetic: 1/0.9324 (`out/out_errbar.txt`) | - |
| π/6, G/π ± 6·10⁻⁸ | `out/out_validate.txt` (section 3: 5.68e-8; rounded) | `src/validate.py` |

### Section 7 (solvable lattices)

| number | file | script |
| --- | --- | --- |
| 90 boards, w = 3...6, h = 1...4; 18×18, 20×20 | `out/out_validate.txt` (sections 1, 2) | `src/validate.py` |
| 10⁻¹⁶ (square lattice) | `out/out_validate.txt` (section 3, max\|diff\| ≤ 6.0e-17) | `src/validate.py` |
| 1848358752, 1852300296658080, 57261989986381118073728 | `out/out_validate.txt` (section 4) | `src/validate.py` |
| 0.428594537464959, 0.428594537464956, 2.9·10⁻¹⁵ | `out/out_validate.txt` (section 4) | `src/validate.py` |

### Section 8 (conjecture (L∞); (L) observed, not structural)

| number | file | script |
| --- | --- | --- |
| 0.565511911035, 5.7·10⁻¹², 132 candidates, 0.5655119110355926 | `out/out_cw.txt` (sections D, E; 5.73e-12 rounded) | `src/cw.py` |
| 4.69e-5 ... 1.01e-11 (second differences) | `paper/out_derived.txt` | `paper/derived.py` (from `data/surface.json`) |
| float error about 10⁻¹⁵ of those inputs | `notes/L-NOTE.md` §0; Collatz-Wielandt spreads ≤ 1.6e-15 in `out/out_bounds.txt` | `src/bounds.py 24` |
| 1.237·10⁻¹⁰ | `out/out_lcert_m25.txt` (2q = 28) | `src/lcert.py 25 30` |
| ratio 0.16-0.20 | `out/out_ltest.txt` (`last ratio`, king free m ≥ 13: 0.1631 ... 0.1945) | `src/ltest.py` |
| Table 6 | `out/out_ltest.txt` (totals and K per m), `out/out_lcert_m25.txt`, `out/out_lcert_m26.txt` | `src/ltest.py`, `src/lcert.py` |
| 6475, 210560, 6842465, 30552725 | `paper/out_derived.txt` (from `data/zex/zex_tri_free_m5_K60.json`) | `paper/derived.py` |
| weights: equal x ∈ {0, ¼, ½, 1, 2, 4, 10, 100}, m ≤ 9; (1, ½) fails at m = 5, 8, 9 only (14/19 at m = 5); (1, ¾) 5/19 at m = 9, first 2q = 30 | `out/out_lweight.txt` | `src/lweight.py` |
| (1, 9/10), (1, 19/20) to m = 16, 2q ≤ 78 | `out/out_lweight_big.txt` ((10, 10, 9), (20, 20, 19)) | `src/lweight.py big` |
| 217 of 220 | `out/out_cw.txt` (I3) | `src/cw.py` |
| 1 − √2, (1, −√2, 1), 10, 4, 10 | `out/out_cw.txt` (section A: −0.4142, g(A) = 10, 4, 10) | `src/cw.py` |
| T[∅→{1}] = 2, T[{1}→∅] = 0 | `out/out_bounds.txt` (Calkin-Wilf block (a)) | `src/bounds.py 24` |
| 0.047 | `out/out_lspec.txt` (m = 10, 0.0468; rounded) | `src/lspec.py` |
| 3.4·10⁶ pairs | `out/out_lparity.txt` (m = 5, q = 2: 3410589 pairs) | `src/lparity.py` |
| 1847660, 912656, 32616 | `out/out_lparity.txt` | `src/lparity.py` |
| Prony modes 0.1147, −0.072, ratio 0.007 at 2q = 24, factor 0.63 per step, four windows | `L/out_linf.txt` (king (1, 1) from data/surface.json; 0.0718...0.0730; 0.0722/0.1147) | `L/linf.py` |
| (L∞) positive to 2q = 14 for (1, 0.95), (1, 0.9), (1, 0.75), (1, 0.5), triangular (1, 0) | `L/out_linf.txt` | `L/linf.py` |
| x = 3/2: −6.2·10⁻⁴; x = 2: −2.8·10⁻³ (2q = 8); negatives at 2q = 8, 12; x = 5/4 ratios 2.0, 376, 0.16, 48 | `L/out_linf.txt` | `L/linf.py` |
| Z(8, m)² > Z(6, m)Z(10, m) for 35 ≤ m ≤ 60 (x = 3/2), 21 ≤ m ≤ 60 (x = 2), 19 ≤ m ≤ 60 (x = 3); none for x = 1, 5/4, m ≤ 60 | `L/out_linf.txt` (last block) | `L/linf.py` |
| T = HM, M^T = JMJ, G = JM, m ≤ 7, five weight sets; 7·10⁻¹³ (m ≤ 9) | `L/out_symmetry.txt` (A, B; 7.1e-13) | `L/symmetry.py` |
| K = 0.70, 1.31, 1.63 (m = 4, 5, 8), ε = 10⁻³ ... 3·10⁻² | `L/out_symmetry.txt` (C; −0.695 ... −0.713, −1.306 ... −1.351, −1.628 ... −1.664) | `L/symmetry.py` |
| J-odd level above at m = 4, 8 among m ≤ 11 | `L/out_symmetry.txt` (B) | `L/symmetry.py` |
| (1, 9/10): m = 4, 8, 12 from 2q = 56, 86, 112; (1, 19/20): m = 8 from 2q = 118; predicted onsets equal at m = 4, 8; no prediction for m > 10 | `L/out_symmetry.txt` (D1; (10, 10, 9), (20, 20, 19)) | `L/symmetry.py` |
| symmetrised H(M + M^T)/2: no violation for m ≤ 9, 2q ≤ 38 and (1, 9/10) at m = 8 to 2q = 198 | `L/out_symmetry.txt` (D2; (2, 2, 1), (4, 4, 3), (1, 1, 0), (10, 10, 9)) | `L/symmetry.py` |
| negative index of M on the J-even sector 1, 1, 3, 8, 20, 34, 93, 186 (m = 3...10) | `L/out_symmetry.txt` (E) | `L/symmetry.py` |
| cut-and-swap remainder does not shrink with q | `L/out_involution.txt` | `L/involution.py` |
| relative accuracy about 0.6 for a certified tail | `notes/L-NOTE.md` §5 (paragraph (L-infinity), ((1-r)/(1+r))² ≈ 0.63) | - |

### Section 9 (reproducibility)

| number | file | script |
| --- | --- | --- |
| Python 3.13, numpy 2.5.3, mpmath 1.4.1, scipy 1.18.1 | `README.md`, `src/requirements.txt` | - |
| four cores, 15.7 GiB | 4 cores: `out/out_estimate.txt` (cost header); 15.7 GiB: machine specification, stated in the note below | - |
| 8.4 GiB, 22.5 min | `data/eig/eig_king_cyl_w25_p1.json` | `src/cylw.py king cyl 25 1` |
| 22 min | `logs/time_bounds.txt` (wall 1326.3 s) | `src/timed.py python3 -u src/bounds.py 24` |
| 8.0 GiB, 43 min | `logs/time_lcert_m26.txt` (maxrss 8223 MiB, wall 2557.3 s) | `src/timed.py python3 src/lcert.py 26 30` |

Note on the machine. All runs used one machine with four cores and 15.7 GiB of memory. From the
measured memory of `src/cylw.py` (`out/out_estimate.txt`, cost table: 8.4 GiB at w = 25, about doubling
per width), the cylinder w = 26 needs about 17 GiB, more than the machine has, so w >= 26 was not
run. `/usr/bin/time` was not available; `src/timed.py` records wall time and peak RSS instead.
