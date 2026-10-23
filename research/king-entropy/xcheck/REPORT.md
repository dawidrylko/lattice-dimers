# Independent recomputation of `paper/main.tex` (king-graph dimer entropy)

**Verdict.** Claims 1-5 CONFIRMED, claim 6 found no failure mode; no contradiction of substance. Three
minor last-digit issues are listed under Contradictions. One check is NOT REACHED: the A239264 b-file
(oeis.org is blocked from this machine). The widths w = 26 and 27, beyond the paper, agree with its
extrapolation to 1e-18 in s, and so do both sectors of w = 28 (float64).

| claim | verdict | own value | paper |
| --- | --- | --- | --- |
| 1. exact counts | CONFIRMED (A239264 b-file NOT REACHED) | 0 mismatches: 5562 `data/zex` values, 88 OEIS data terms, A239273 b-file by SHA-256 | - |
| 2. s | CONFIRMED | 0.5655119110413253176 (L1, W = 25); 0.5655119110413253187 (odd W = 27 and midpoints W = 28) | 0.5655119110413253 +- 6e-16 |
| 3. Theorem 2.1 | CONFIRMED | B(3, 4): no Pfaffian orientation, 6-equation certificate | 43 matchings, 29 edges |
| 4. Theorem 4.1 | CONFIRMED | 0.545343749727 <= s <= 0.582767477484 | same, all 18 entries of Table 3 |
| 5. kappa | CONFIRMED | 0.3631962560475 | 0.36319625605 +- 3e-10 |
| 6. failure modes | none found | see the table in Claim 6 | - |

The paper checked is `paper/main.tex` at b4b2c79. The later master 872d605 (merged into this branch)
fixes the "2.6 %" below to 2.7 %, proves the existence of the limit s in Section 2.1 (checked: the
bound Z(2j, L) <= lambda_L^(2j) from (2.1) gives bar s <= s*, which with the lower bound closes the
argument) and rewords the rounding count of Section 4.4; the other two minor items below are
unchanged there.

All code in this directory was written from scratch for this check; nothing is imported from or
adapted from `src/` or `L/`. The committed outputs of the repository (`data/`, `out/`) were read only
after the own result existed, by the `compare_*` scripts. Commands are run from
`research/king-entropy/xcheck/`; Python 3.13 with `requirements.txt`, gcc with OpenMP (`sh build.sh`).

## Contradictions

None of substance. Minor, last digits only:

- **Table 1, row w = 25 (and r_23)** is computed from float64 eigenvalues and carries their rounding
  noise: the paper prints d_25 = 5.994e-14, r_25 = 9.992, s_25 = 0.5655119110413253; the long double
  values (own, and the repository's own `data/lean/*longdouble*`, which agree with the own ones to
  7.8e-20 per site) give d_25 = 5.991e-14, r_25 = 9.9976, s_25 = 0.56551191104132523 (the paper's own
  Table 2 has G = 0.56551191104132523), and r_23 = 10.1354 (printed 10.136). The text's "r_w drifts
  from 13.4 to 9.99" should end at 10.0. In the same way the 16th decimal of f_13, f_15, f_19 in Table 1
  and of both sector values at w = 20 in Section 3.1 is one unit off the long double value (differences
  <= 8e-17, within the paper's float64 error of 6.2e-17 per site plus rounding to 16 decimals). No
  effect on the result. `out/analyze_eig.txt` sections 2, 3.
- **Section 5.1, "|rho(K, L) - kappa| <= 6.2e-8 for min(K, L) >= 20"**: the maximum is 6.249e-8
  (at 20 x 20, with either kappa), so the bound holds only as 6.25e-8. `out/corner.txt`.
- **Section 7, "overestimates s by 2.6 % and 1.2 %"**: (Bethe - s)/s is 2.68 % for the triangular
  lattice; 2.6 % is (Bethe - s)/Bethe. `out/misc.txt`. Fixed on master (872d605: 2.7 %).

## Claim 1 - exact counts Z(K, L): CONFIRMED (one b-file NOT REACHED)

| check | result | file, command |
| --- | --- | --- |
| brute force vs row transfer vs C cell transfer (king, square, triangular; free and cylinder; w <= 7) | 306 values, 0 mismatches | `out/validate.txt`, `python3 validate.py` |
| own counts, free L = 1..24 (K <= max(24, 36 - L)), cylinders m = 3..22 | 16 primes < 2^62, 15 reconstruct, 1 checks | `out/counts_*.json`, `python3 counts.py` |
| OEIS data sections A239264 (78 terms), A239273 (n = 0..9) | 0 mismatches | `out/oeis_check.txt` |
| A239273 b-file, n = 0..12 | rebuilt text has the SHA-256 of the OEIS file (Git LFS pointer `0d398db8...`, 624 bytes): byte-identical | `sh fetch_oeis.sh DIR; python3 oeis_check.py DIR` |
| all 86 `data/zex/*.json` (5562 values, up to 24 x 24, K <= 120) and the JS solver test data (15 boards) | 0 mismatches | `out/compare_counts.txt`, `python3 compare_counts.py` |

NOT REACHED: the A239264 b-file (antidiagonals 0..36). oeis.org is blocked here and the GitHub mirror
`oeis/oeisdata` has only its LFS pointer (SHA-256 `21ecae3e...`, 14988 bytes); a plain `n a(n)` rebuild
from the own counts has 14930 bytes, so the file differs from it in format or content (undecided).

## Claim 2 - cylinder eigenvalues and s: CONFIRMED (w <= 25 as in the paper; w = 26, 27, 28 beyond it)

`out/analyze_eig.txt` (`python3 eigrun.py base; python3 analyze_eig.py`), `out/compare_eig.txt`.

| quantity | own (x87 long double) | paper | difference |
| --- | --- | --- | --- |
| s, L1 on odd w, W = 25 | 0.5655119110413253176 | 0.5655119110413253176 (centre) | < 1e-19 |
| s, L1 on even-w midpoints, W = 24 | 0.5655119110413253237 | 0.56551191104132532 | 4e-18 |
| span of L1, L2, PE, R1, Wynn: odd W = 25; midpoints W = 24 | [...3253176, ...3253222]; [...3253051, ...3253237] | +- 6e-16 | inside |
| in-sector gap m per row (median over the power-iteration convergence ratios, w = 16..27) | 1.082724 | 1.082727 | 3e-6 |
| even-w brackets w = 18..24, midpoint w = 24 | as printed, except the last digit of both w = 20 values (float64 noise, see Contradictions) | Section 3.1 | <= 8e-17 |
| f^(1)_w < s < f^(0)_w, all even w = 4..28 | holds | holds (w <= 24) | - |
| own log lambda vs `data/lean` (extended; cylinders and free strips), per site | max 7.8e-20 | - | - |
| own log lambda vs `data/sec`, `data/eig` (float64, exact binary values), per site | max 6.2e-17, 3.9e-17 | 6.2e-17 quoted | 0 |

Beyond the paper, w = 26 (both sectors, long double, 6.1 GiB, 13 min each): bracket
[0.5655119110368705, 0.5655119110457844] contains s; the midpoint difference d_26 = -1.90309e-14
against the L1 prediction -1.90272e-14 from the fit at W = 24 (ratio 1.00019); L1 on the midpoints
at W = 26 gives 0.5655119110413253192 (1.6e-18 from the paper's centre, change -4.5e-18 from W = 24),
and L1, L2, PE, R1, Wynn span [...3253178, ...3253192].

w = 27 (long double, 12.0 GiB, 23 min): f_27 = 0.5655119110413246284, d_27 = 6.06113e-15 against the
L1 prediction 6.06022e-15 from the fit at W = 25 (ratio 1.00015); L1 at W = 27 gives
0.5655119110413253187 (change 1.1e-18 from W = 25), all models in [...3253187, ...3253190].

w = 28 (float64, both sectors, 12.0 GiB, 28 min each; long double does not fit): bracket
[0.5655119110405338, 0.5655119110421172] contains s; d_28 = -1.93518e-15 against the prediction
-1.93413e-15 from W = 24 (ratio 1.00054, inside the float64 noise of about 3e-17 per site); L1 on the
midpoints at W = 28 gives 0.5655119110413253187 (change -4.3e-19 from W = 26), all models in
[...3253186, ...3253187]. The odd sequence (W = 27) and the midpoints (W = 28) now agree to 1e-19.

Parity splitting (Section 6, Table 5): Delta_w and xi_w for w = 10..24 agree with every printed digit;
the fits on w = 10..24 give xi = 1.1931 (rms 0.015), 1.2323 with b = -0.4327 (rms 9.3e-4) and 1.2387
with b = -1/2 (rms 0.0026), as in the paper; the own two-point extrapolation of 1/xi_w linear in 1/w
gives 1.2367 (paper's version 1.2351), inside xi = 1.235 +- 0.004. Beyond the paper: Delta_26 =
2.317624e-10 (xi_26 = 1.20721), Delta_28 = 4.433564e-11 (xi_28 = 1.20925, float64).

Table 2 (model estimates and backtests), own implementations of the models G, L1, L2, PE, R1 and
Wynn: all 12 estimates agree with the paper to its 17 printed digits (odd W = 25: G ...32523, the
others ...32532; midpoints W = 24: G ...32564, PE and R1 ...32531, the others ...32532); backtest changes L1 1.42e-17 / 6.44e-17 and L2 1.35e-18 / 3.54e-18 (paper 1.4e-17 / 6.5e-17 and
1.5e-18 / 3.5e-18).

Convergence claim: the estimate changes shrink by 0.1147 per iteration of T^2 at every w = 16..28
(paper: 0.115); the own runs stop after 22-25 iterations at a change below 1e-19.

## Claim 3 - Theorem 2.1 (Pfaffian orientation iff min(K, L) <= 2): CONFIRMED

`out/pfaff.txt` (`python3 pfaff.py`). GF(2) system over all perfect matchings, own enumeration.
B(1, L), L <= 12 and B(2, L), L <= 12: solvable; the orientation is re-checked from scratch (all
matchings one sign) and det(A) = Z^2 by exact Bareiss elimination. B(3, 4) (29 edges, 43 matchings),
B(4, 3), B(3, 6), B(3, 8), B(4, 4), B(4, 5), B(4, 6), B(4, 7), B(5, 6), B(6, 5): inconsistent, each
with an independently verified certificate of 5 or 6 equations. For B(3, 4) the inconsistency appears
after 23 equations in the own enumeration order (paper: 23). The conformal-corner reduction and the
genus bound (g >= 74 at 24 x 24) were checked by hand.

## Claim 4 - Theorem 4.1 (0.545343749727 <= s <= 0.582767477484): CONFIRMED

All 18 entries of Table 3 reproduced to the last printed digit, by two independent methods:

| w | method | lower | upper sqrt(phi) | upper, run weights |
| --- | --- | --- | --- | --- |
| 4, 8, 12 | exact integer Collatz-Wielandt (`out/bounds_exact.txt`) | same | same | same |
| 16, 20, 24 | directed rounding FE_DOWNWARD / FE_UPWARD in C (`out/cert.txt`, `out/certrun.txt`) | same | same | same |

w = 24: lower 0.545343749727 (unrounded 0.5453437497275336), upper sqrt(phi) 0.586216605404,
run weights **0.582767477484** (unrounded 0.5827674774831951). Lemmas 4.4-4.7 checked by brute force:
M(A, B) <= min(F(A), F(B)), M(S, S) = F(S) for 250952 pairs (columns m <= 10); the cut identity and
the strip inequality with both weights on 47 boards, 0 violations; with z = 0 the inequality fails on
23 of the 29 boards with k >= 2 (the other six are equalities: one row, or K k w odd with Z = 0),
so the check is sensitive. Proposition 8.2 inputs, rigorous: log lambda_24 in
[13.08824999346080, 13.08824999346081], log lambda_23 >= 12.52273808241356, log lambda_22 <=
11.95722617138962, all consistent with (and tighter than) the paper's values; with them the
conditional interval of Proposition 8.2 is [0.565511911035, 0.565511911048] (paper: [0.565511911035,
0.565511911049]); `out/misc.txt` (`python3 misc.py`, from `out/cert.txt`).

## Claim 5 - kappa and the asymptotics of A239273: CONFIRMED

`out/corner.txt` (`python3 corner.py`), from the own exact counts up to 24 x 24 and the own s and sigma
(`out/eig_summary.json`).

| quantity | own | paper |
| --- | --- | --- |
| kappa, Aitken at L = 24 | 0.3631962560475 | 0.363196256048 |
| change from L = 22; ratio linear in 1/L | -1.4e-10; -2.6e-11 | 1.4e-10; 2.6e-11 |
| kappa (quoted) | 0.3631962560475, i.e. 2.5e-12 from the paper | 0.36319625605 +- 3e-10 |
| ratios of the differences of rho(L) | 5.85 -> 5.58 | 5.85 -> 5.58 |
| C = e^kappa, d = e^(4s), f = e^(8 sigma) | 1.437918032, 9.60273202731337, 6.931966132248 | same |
| (formula - a(n))/a(n) at n = 12; ratio per step | -2.0e-9; 5.58 | -2.0e-9; 5.6 |
| second differences - s at L = 22; extrapolated | 5.26e-9; 1.03e-10 | 5.3e-9; 1.0e-10 |
| mixed differences - s at L = 22; extrapolated | -1.15e-11; 5.95e-13 | 1.1e-11 below; 5.9e-13 |
| rectangles 20 <= K, L <= 24: max abs(rho - kappa), sign | 6.249e-8; + for even min, - for odd | <= 6.2e-8; by parity |

Surface free energy (Section 5): -2 sigma = -0.4840358715325006 (odd k, Aitken and Wynn; even k Wynn
-0.4840358715325006), paper -0.484035871532501 +- 1.8e-14; ratio of odd differences 8.718 (paper
8.719). Table 4 reproduced to <= 4e-17 for k <= 24; at k = 25, 26 (float64 in the paper) the
differences are 1.4e-16 and 8.3e-16, inside the paper's error bar. `out/analyze_eig.txt` section 9.

## Claim 6 - hunt for failure modes: NONE FOUND

| failure mode | test | result |
| --- | --- | --- |
| hidden slower mode beyond w = 25 | widths 26, 27 and 28, computed blind and compared with the L1 predictions made at W = 24 / 25; the paper's hidden-mode fit (L1 + B x^((w-25)/2), x = e^(-2/1.2351), least squares on w = 13..W, B admitted if the rms is within 3x of the best) | d_26, d_27 agree with the predictions to 1.9e-4 and 1.5e-4 relative, d_28 (float64) to 5.4e-4. Hidden-mode fit: W = 25 admits 0.001 <= B/d_25 <= 0.003 as in the paper (shift of s 2.0e-17, paper 3.0e-17; the paper has since changed this rule, see the note at the end); with w = 27 added it admits 0 <= B/d_25 <= 0.0025 and the shift falls to 5.2e-18. `out/analyze_eig.txt` sections 6, 6b |
| level crossing | convergence ratio of the power iteration (= (lambda_3/lambda_1)^2 in the sector) at every w and sector | 0.1147 at all w = 16..28, both sectors; for w <= 10 the full spectra show a simple leading eigenvalue and a negative subleading one (lambda_2/lambda_1 = -0.339 at w = 10) |
| sector mislabelling | parity rule checked entrywise on the row transfer; sectors of odd w | T maps sector p to p + w (mod 2); odd-w sectors equal to < 1e-15; sector 0 (with e0) is the larger one for every even cylinder, f^(1) < s < f^(0) for w = 4..28 |
| reducible sector (a component not seen from e0) | Tarjan SCCs of T^2 per sector, w <= 10, cylinders and free strips | every sector is strongly connected; for free strips the sector of e0 is all reachable |
| floating-point loss | long double vs float64 of the own code; own vs repository extended values; exact count ratios vs eigenvalues | 1.1e-17 per site; 7.8e-20 per site; <= 6.4e-19 in log lambda (m <= 12, K = 80) |
| off-by-one K vs L | Z(K, L) = Z(L, K) for K, L <= 12; OEIS array orientation; count ratios along the strip vs the strip eigenvalue | all consistent |
| lemma outside its hypotheses | Lemma 4.3 needs supp v in supp A^n e0: own v is A^n e0 (exact support, or float iteration from e0); Lemma 4.8 needs (Av)_i = 0 off supp v: checked (0 violations); Lemmas 4.4-4.7 need w >= 2 (used w >= 4); Theorem 2.1 needs KL even (stated); Proposition 8.2 uses s = lim a_k / k, which needs the existence of the double limit (called standard at b4b2c79; proved in Section 2.1 on master 872d605) | no violation found |

The sign properties of Section 8 hold on the own free-strip values (`out/analyze_eig.txt` section 10):
even second differences positive for 2q = 2..24, odd ones negative for k = 3..23, increments
alternate for k = 0..25, margin of (O) at k = 23 5.91e-12, (a_24 - a_22)/2 = 0.5655119110355933 and
a_24 - a_23 = 0.565511911047236 (the paper's conditional interval [0.565511911035, 0.565511911049]);
the free-strip sectors without e0 win at k = 6, 10, 14, 18 and their difference ratio is -13.84.
`out/spectrum.txt`, `out/analyze_eig.txt`.

A failure mode of the own code was found on the way: a running sum of 2^w terms in the eigenvalue
estimate and in the internal mass check lost more than 1e-12 relative in float64 at w = 24 (the mass
check stopped the run-weighted certificate); it is now a blocked sum in long double, and all affected
runs were redone. The paper's float64 values are not affected (they agree
with the own long double values to 6.2e-17 per site, as the paper states). A second slip of the own
code: `compare_eig.py` first read float64 values through their decimal repr, which inflated the
difference at w = 5 to 7.1e-17; it now uses the exact binary value.

## Note added after this report

The hidden-mode row of claim 6 checks the rule of the paper at the time of this report (forced B admitted
if its rms is within 3x of the best; term 3.0e-17), which `out/analyze_eig.txt` section 6b reproduces. The
paper has since replaced that rule: `src/errbar.py` fits B together with L1 on several windows and admits
3 standard errors over all of them (term 3.4e-17, budget 2.7e-16, quoted bar unchanged), and
`src/hidden_oos.py` compares the mode with the w = 27 value of this directory. The findings above are
unchanged.

## Commands

From `research/king-entropy/xcheck/`, after `python3 -m pip install -r requirements.txt` and
`sh build.sh` (gcc 13, `-O2 -fopenmp -frounding-math -ffp-contract=off`). All outputs are independent of
the number of OpenMP threads (fixed summation order, fixed seeds) except the timing lines.
Machine: x86-64, 4 cores, 15 GiB.

| output | command | wall time here |
| --- | --- | --- |
| `out/validate.txt` | `python3 validate.py` | minutes |
| `out/counts_free.json`, `out/counts_cyl.json`, `out/counts_log.txt` | `python3 counts.py` | 7 min |
| `out/oeis_fetch.txt`, `out/oeis_check.txt` | `sh fetch_oeis.sh DIR > out/oeis_fetch.txt; python3 oeis_check.py DIR` | seconds |
| `out/compare_counts.txt` | `python3 compare_counts.py` | minutes |
| `out/pfaff.txt` | `python3 pfaff.py` | 10 s |
| `out/bounds_exact.txt` | `python3 bounds_exact.py 4 8 12` | minutes |
| `out/cert.txt` | `python3 cert.py 16 20 22 23 24` | about 30 min |
| `out/certrun.txt` | `python3 certrun.py 4 8 12 16 20 24` | 35 min (w = 24: 5 GiB) |
| `out/eig/*.txt`, `out/eig_base_log.txt`, `out/eig_wide_log.txt` | `python3 eigrun.py base; python3 eigrun.py wide` | 2 h; 3 h (w = 27, 28: 12 GiB) |
| `out/analyze_eig.txt`, `out/eig_summary.json` | `python3 analyze_eig.py` | 1 min |
| `out/compare_eig.txt` | `python3 compare_eig.py` | seconds |
| `out/spectrum.txt` | `python3 spectrum.py` | minutes |
| `out/corner.txt` | `python3 corner.py` (after `analyze_eig.py`) | seconds |
| `out/misc.txt` | `python3 misc.py` | seconds |

`run_bg.sh` runs `counts.py` and both `eigrun.py` groups in sequence. The cylinder runs w <= 24 in long
double were recomputed after a change of the summation of the eigenvalue estimate (blocked long double
sums instead of a running sum, which lost more than 1e-12 in float64 at w = 24);
`out/eig_redo_log.txt` is the log of that recomputation (`python3 eigrun.py base 'king_cyl_w(0[3-9]|1[0-9]|2[0-4])_[01]_ld'`).
