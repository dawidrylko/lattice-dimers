# The dimer entropy of the king's graph

Scripts, data, outputs, proofs and papers behind the estimate and the rigorous bounds of the entropy per site $s = \lim \log Z / N$ of the perfect matchings of the king's graph. The results are summarised in the [root README](../../README.md#results) and on the [research page](https://dawidrylko.github.io/lattice-dimers/notes/research.html).

- Paper: [`paper/king-entropy.pdf`](paper/king-entropy.pdf), source [`paper/king-entropy.tex`](paper/king-entropy.tex); companion note [`paper/king-entropy-log-convexity.pdf`](paper/king-entropy-log-convexity.pdf).
- [`paper/NUMBERS.md`](paper/NUMBERS.md) maps every number of both papers to the output file and the script that wrote it.
- Proofs of the bounds: [`proofs/lower-bound.md`](proofs/lower-bound.md) and [`proofs/upper-bound.md`](proofs/upper-bound.md).
- Release on Zenodo: [`release/ZENODO.md`](release/ZENODO.md).

All commands below run from this directory with Python 3.13, and paths in the notes and in `paper/NUMBERS.md` are relative to it. The license of each part is in the [root README](../../README.md#license).

## Layout

| directory | contents |
| --- | --- |
| [`src/`](src) | the scripts and `src/requirements.txt`; `src/paths.py` maps every file name to its directory |
| [`data/`](data) | JSON results: `data/eig/`, `data/sec/`, `data/zex/` and `data/lean/` by file prefix, the rest at the top |
| [`out/`](out) | `out/out_*.txt`, the printed output of each script |
| [`logs/`](logs) | `logs/log_*.txt` progress logs and `logs/time_*.txt` wall time and peak RSS |
| [`proofs/`](proofs) | the proofs of the rigorous bounds |
| [`notes/`](notes) | laboratory notes on the Calkin-Wilf question ([`calkin-wilf.md`](notes/calkin-wilf.md)), on hypothesis (L) ([`log-convexity.md`](notes/log-convexity.md)) and on CTMRG ([`ctmrg.md`](notes/ctmrg.md)) |
| [`log-convexity/`](log-convexity) | the experiments on (L), scripts with their outputs |
| [`paper/`](paper) | both papers, sources and PDFs, the bibliography and `paper/NUMBERS.md` |
| [`release/`](release) | the Zenodo runbook and the OEIS draft as it stood before submission; the submitted text is [`oeis/A401669`](../../oeis/A401669/README.md) |
| [`replication/`](replication) | an independent recomputation written from scratch, with its own outputs; verdicts and commands in [`replication/REPORT.md`](replication/REPORT.md) |
| [`rerun/`](rerun) | the outputs of the step 0 rerun before the release, compared with the originals in [`rerun/2026-10/COMPARISON.md`](rerun/2026-10/COMPARISON.md) |

The tag `king-entropy-v0.1.0` predates this layout: there everything except `L/` and `paper/` sits directly in this directory. The commit SHAs in the outputs of that version point at code under the old names, and two outputs still print one: `log-convexity/time_modes.txt` (`L/modes.py`) and `log-convexity/out_involution.txt` (`L-NOTE §3`, now `notes/log-convexity.md` §3).

```sh
python3 -m pip install -r src/requirements.txt
```

## Files

| file | what it does |
| --- | --- |
| `src/tm.py` | cell-by-cell row transfer; lattices `king`, `tri`, `sq`; boundary `free` (free strip) or `cyl` (periodic across the width); exact counts with `count(h, w, lattice, bc)` |
| `src/tmfast.py` | the same transfer with reshaped views (bit-identical to `src/tm.py`, ~17x faster); open-side weight `z` for `src/bounds.py`; counts mod p |
| `src/tm2.py` | float64 power iteration on `T^2` separately in each parity sector; writes `data/sec/sec_<lat>_<bc>_<w0>_<w1>.json` |
| `src/cylw.py` | one width and one sector per run with `src/tmfast.py`, convergence check, Collatz-Wielandt bracket, time and peak RSS; writes `data/eig/eig_<lat>_<bc>_w<w>_p<p>.json` |
| `src/summary.py` | reads the four `data/sec/sec_*.json`, prints estimators and bounds (first pass) |
| `src/fitsq.py` | fits on the exact L x L counts in `../../spec/cases/domicule-rectangle-bigint.json` |
| `src/validate.py` | brute force, repo data, square-lattice closed forms, triangular Kasteleyn, free-strip ratios |
| `src/crosscheck.py` | exact-integer ratios (w = 9, 11, 12, 13) and ARPACK on the full w = 20 transfer vs the power iteration |
| `src/bounds.py` | certified Fekete lower bounds, open-strip upper bounds, Kahn-Lovasz, Calkin-Wilf hypothesis checks |
| `src/cw.py` | Calkin-Wilf hypothesis: RP obstruction, spectral measure, exact log-convexity tests, limit form, conditional bounds (see `notes/calkin-wilf.md`) |
| `src/estimate.py` | first-pass estimate of s from all cylinders, the final value read from `data/errbar.json`, Z2 splitting table and decay length; writes `data/z2.json` |
| `src/timed.py` | runs a command and appends wall time and peak RSS (MiB on Linux and macOS) to stderr; `src/test_timed.py` checks the unit |
| `src/paths.py` | the directory of each file by its name, so the scripts read and write the right place from any working directory |
| `src/test_paths.py` | smoke test: `src/tm2.py`, `src/cylw.py`, `src/lean.py`, `src/zexact.py` on tiny inputs from another directory write where `src/paths.py` says and record the commit |
| `src/test_regressions.py` | checks for fixed defects that no rerun of an output covers: 12-decimal bound strings of `src/bounds.py`, the x87 guard of `src/lean.py` and `src/lcert.py`, and `replication/bfile_check.py` on the b-file in `oeis/A239264/` |
| `src/zexact.py` | exact Z(k, m), k <= K, by CRT over 60-bit primes; writes `data/zex/zex_*.json` |
| `src/lean.py` | power iteration with two buffers, float64 or x87 extended precision; writes `data/lean/lean_*.json` |
| `src/audit_bounds.py` | exact audit of both strip bounds and of the float certificates (`proofs/*-bound.md`) |
| `src/errbar.py` | error budget of s on the extended-precision cylinders: Luscher main model, other models, predictive backtests, hidden-mode, gap and rounding terms; writes `data/errbar.json` |
| `src/hidden_oos.py` | out-of-sample check of the hidden mode against w = 27 from the independent code in `replication/` (not part of the budget) |
| `src/runweight.py` | run-weighted open-strip upper bound (schemes `3state`, `1bit`, `phi`); `--disk DIR` keeps the third vector in a memory-mapped file |
| `src/corner.py` | corner free energy kappa from the exact square counts, asymptotics of A239273, s from exact counts alone |
| `src/pfaff_rigor.py` | GF(2) certificate that king boards with both sides >= 3 and an even number of cells have no Pfaffian orientation, with planar controls |
| `src/surface.py` | surface free energy sigma from free strips |
| `src/lcert.py` | certified log-convexity tests of (L) at m = 25, 26 in extended precision with a rigorous error bound |
| `log-convexity/` | why (L) is not structural: J-symmetry and Krein signature (`log-convexity/symmetry.py`), partial sign-reversing involution (`log-convexity/involution.py`), (L_inf) tests at other weights (`log-convexity/linf.py`), the two modes and their crossing along equal diagonal weights (`log-convexity/modes.py`), with their outputs |
| `log-convexity/levels.py` | the two finite-size modes and the parity splitting as levels of the cylinder transfer, plain and with a sign on the seam edges: rates, amplitudes, the gap m_v and xi = 1/m_v, the crossing x*; controls against `src/tm.py` counts, brute force and dense eigendecompositions |
| `src/ctmrg.py` | independent float64 CTMRG check of s with triangular and square controls; sigma and kappa only to about 2e-8 and 3e-6 (`python3 src/timed.py python3 src/ctmrg.py > out/out_ctmrg.txt 2> logs/time_ctmrg.txt`, about 2 to 5 min; see `notes/ctmrg.md`) |
| `src/ltest.py` | exact (L) tests and Hankel (moment) tests on all `data/zex/zex_*.json` |
| `src/lparity.py`, `src/lspec.py`, `src/lweight.py` | path-parity form of (L), spectral obstructions, (L) under diagonal weights |
| `src/repro.py` | re-runs `src/estimate.py`, `src/cw.py`, `src/bounds.py 16` and `src/cylw.py king cyl 20 0` from a clean export of HEAD and compares outputs |
| `src/derived.py` | numbers of the paper that are simple functions of committed outputs; writes `out/out_derived.txt` |
| `paper/king-entropy-log-convexity.tex` | companion note on the log-convexity (L), shares `paper/refs.bib` |

## Reproduce

Sector eigenvalues up to w = 19 (the four runs are independent, run them in parallel):

```sh
python3 src/timed.py python3 src/tm2.py king cyl 3 13  > logs/log_king_cyl_3_13.txt  2> logs/time_king_cyl_3_13.txt
python3 src/timed.py python3 src/tm2.py king cyl 14 19 > logs/log_king_cyl_14_19.txt 2> logs/time_king_cyl_14_19.txt
python3 src/timed.py python3 src/tm2.py king free 1 18 > logs/log_king_free_1_18.txt 2> logs/time_king_free_1_18.txt
python3 src/timed.py python3 src/tm2.py tri cyl 3 18   > logs/log_tri_cyl_3_18.txt   2> logs/time_tri_cyl_3_18.txt
python3 src/summary.py > out/out_summary.txt
python3 src/fitsq.py   > out/out_fitsq.txt
```

Wide cylinders, one process per width and sector (odd w: one sector is enough):

```sh
for a in "20 0" "20 1" "21 1" "22 0" "22 1" "23 1" "24 0" "24 1" "25 1"; do
  set -- $a; python3 src/cylw.py king cyl $1 $2 > logs/log_eig_king_cyl_w$1_p$2.txt
done
```

Checks, bounds, estimate:

```sh
python3 src/timed.py python3 src/validate.py   > out/out_validate.txt   2> logs/time_validate.txt
python3 src/timed.py python3 src/crosscheck.py > out/out_crosscheck.txt 2> logs/time_crosscheck.txt
python3 src/timed.py python3 src/bounds.py 24  > out/out_bounds.txt     2> logs/time_bounds.txt
python3 src/timed.py python3 src/runweight.py 3state $(seq 2 23) > out/out_runweight_3state.txt 2> logs/time_runweight_3state.txt
python3 src/timed.py python3 src/runweight.py 3state 24 --disk /tmp 2> logs/time_runweight_3state_w24.txt | tail -1 >> out/out_runweight_3state.txt
python3 src/errbar.py > out/out_errbar.txt       # needs data/lean/lean_king_cyl_w*_p*_longdouble.json
python3 src/hidden_oos.py > out/out_hidden_oos.txt   # needs the same and replication/out/eig_summary.json
python3 src/estimate.py > out/out_estimate.txt   # needs data/errbar.json
python3 src/timed.py python3 src/cw.py > out/out_cw.txt 2> logs/time_cw.txt   # needs data/bounds.json and data/z2.json
```

Peak memory: about 1.1 GiB at w = 22, 2.2 GiB at w = 23, 4.3 GiB at w = 24
and 8.4 GiB at w = 25 per `src/cylw.py` process (`out/out_estimate.txt`, cost table).

Audit, error bar and (L) (each writes `out/out_<name>.txt`; `src/zexact.py`/`src/lean.py` runs as listed in `paper/NUMBERS.md`):

```sh
python3 src/audit_bounds.py > out/out_audit_bounds.txt
python3 src/pfaff_rigor.py > out/out_pfaff.txt
python3 src/surface.py > out/out_surface.txt
python3 src/corner.py > out/out_corner.txt       # needs data/errbar.json, data/surface.json and the zex counts to 24 x 24
python3 log-convexity/modes.py > log-convexity/out_modes.txt
python3 src/timed.py python3 log-convexity/levels.py > log-convexity/out_levels.txt 2> log-convexity/time_levels.txt
python3 src/ltest.py > out/out_ltest.txt
python3 src/lparity.py > out/out_lparity.txt
python3 src/lspec.py > out/out_lspec.txt
python3 src/lweight.py > out/out_lweight.txt; python3 src/lweight.py big > out/out_lweight_big.txt
python3 src/repro.py > out/out_repro.txt
python3 src/test_paths.py
python3 src/test_timed.py
python3 src/test_regressions.py
```

Paper (needs a TeX distribution with `latexmk`, e.g. TeX Live with
`texlive-latex-extra`):

```sh
python3 src/derived.py > out/out_derived.txt
cd paper && latexmk -pdf king-entropy.tex && latexmk -pdf king-entropy-log-convexity.tex
```

