# Step 0 rerun of October 2026: comparison with the original outputs

This directory holds the files that the step 0 rerun of `release/ZENODO.md` changed or added, at the same relative paths as in `research/king-entropy/`. The originals stay at those paths and remain the sources of the paper. The comparison below is mechanical (`git show origin/master:<path>` against the file here); it does not interpret the results.

## The run

- Driver `release/step0-rerun.sh`, report `release/STEP0-REPORT.md`, progress `logs/step0-progress.txt` (all here): 144 of 144 jobs `ok`, from 2026-10-25 17:46Z to 2026-10-26 18:14Z.
- Machine: x86_64, 4 cores, 15 GiB, no swap; Python 3.13.14, numpy 2.5.3, `np.finfo(np.longdouble).nmant` = 63.
- `out/out_repro.txt`: 0 of 11 recorded code commits missing, every comparison `[SAME]`, `all reproduced: True`.
- The commit SHAs these files record refer to the history merged with them. That history was rewritten once before the merge, to set the author, and every recorded SHA was replaced by the SHA of the rewritten commit; the code of each commit is byte-identical to the one that ran.

## Summary

| class | files |
| --- | --- |
| rerun byte-identical to the original (not copied here) | 22 |
| same numbers; only commit, command path, timing, memory or machine fields differ | 182 |
| numbers differ | 1 |
| new, no original | 22 |
| not rerun (fresh under the step 0 rule on 2026-10-25) | 35 |

## Numbers that differ

`data/errbar.json`: 24 fields. The recommended `s` and `err` are identical, and `out/out_errbar.txt`, which prints the error budget, is byte-identical.

| field | original | rerun | relative difference |
| --- | --- | --- | --- |
| `.mid.18.PE6` | 0.5655119110411150792850663882821978723197 | 0.5655119110411150792850664790480900395391 | 1.6e-25 |
| `.mid.18._PE6_rms` | 0.002083962533480777 | 0.0020839625334807548 | 1.1e-14 |
| `.mid.20.PE6` | 0.565511911041315581491659925574397839987 | 0.565511911041315581491659952034041019344 | 4.7e-26 |
| `.mid.20._PE6_rms` | 0.0007475456382281427 | 0.000747545638227925 | 2.9e-13 |
| `.mid.22.PE6` | 0.5655119110413246741023798933636268639189 | 0.5655119110413246741023798932738767322347 | 1.6e-28 |
| `.mid.22._PE6_rms` | 0.0005205433112077311 | 0.0005205433112087166 | 1.9e-12 |
| `.mid.24.PE6` | 0.5655119110413252777938348442002871188524 | 0.5655119110413252777938348439279434725788 | 4.8e-28 |
| `.mid.24._PE6_rms` | 0.00031506436227209437 | 0.000315064362270963 | 3.6e-12 |
| `.mid_float64.PE6` | 0.5655119110413252641115627591611598537253 | 0.5655119110413252641115627590787718793694 | 1.5e-28 |
| `.mid_float64._PE6_rms` | 0.0002930451031360459 | 0.00029304510313677876 | 2.5e-12 |
| `.odd.19.PE6` | 0.5655119110413146521886555846791686857652 | 0.5655119110413146521886555005878040948205 | 1.5e-25 |
| `.odd.19._PE6_rms` | 0.0005786163450561359 | 0.0005786163450549847 | 2.0e-12 |
| `.odd.21.PE6` | 0.5655119110413257030600564437605345455542 | 0.5655119110413257030600564388478970052887 | 8.7e-27 |
| `.odd.21._PE6_rms` | 7.754259564854282e-05 | 7.754259564801709e-05 | 6.8e-12 |
| `.odd.23.PE6` | 0.565511911041325392716549432266441824836 | 0.5655119110413253927165494320100643128798 | 4.5e-28 |
| `.odd.23._PE6_rms` | 0.0001278258609947587 | 0.00012782586099450302 | 2.0e-12 |
| `.odd.25.PE6` | 0.565511911041325325932873881611773415775 | 0.5655119110413253259328738813550345192385 | 4.5e-28 |
| `.odd.25._PE6_rms` | 0.00014378177367872896 | 0.00014378177367670373 | 1.4e-11 |
| `.odd_float64.PE6` | 0.5655119110413253616433565826438246525991 | 0.5655119110413253616433565823712468221172 | 4.8e-28 |
| `.odd_float64._PE6_rms` | 7.430993675011221e-05 | 7.430993675089621e-05 | 1.1e-11 |
| `.recommended.budget` | 2.716983765356444774848553672880832804898e-16 | 2.716983765357625051403684891421907223596e-16 | 4.3e-13 |
| `.recommended.half_spread` | 2.981774589790822279777050175696214187082e-17 | 2.981774589804439462090729019601807476359e-17 | 4.6e-12 |
| `.recommended.model_form` | 8.980607010663761064939129067633169401815e-17 | 8.980607010675563830490441253043913588797e-17 | 1.3e-12 |
| `.recommended.predicted` | 5.998832420872938785162078891936955214734e-17 | 5.998832420871124368399712233442106112438e-17 | 3.0e-13 |

## Same numbers, other fields differ

| files | fields that differ |
| --- | --- |
| `data/lcert_m25_K30.json`, `data/lcert_m26_K30.json`, `data/ltest.json` | commit |
| `data/surface.json` | commit references |
| `data/runweight_3state.json` | peak memory, wall time |
| 10 files, e.g. `data/eig/eig_king_cyl_w20_p0.json`, `data/eig/eig_king_cyl_w25_p1.json` | command path, commit, peak memory, seconds per iteration, wall time |
| 19 files, e.g. `data/lean/lean_king_cyl_w15_p1_longdouble.json`, `data/lean/lean_king_free_w26_p-_float64.json` | command path, commit, machine, peak memory, mantissa bits, seconds per iteration, wall time |
| 85 files, e.g. `data/zex/zex_king_cyl_m10_K80.json`, `data/zex/zex_tri_free_m9_K60.json` | command path, commit, wall time |
| `log-convexity/out_linf.txt` | commit, timing or memory fields |
| `log-convexity/time_linf.txt` | timing log |
| 35 files, e.g. `logs/log_eig_king_cyl_w20_p0.txt`, `logs/log_zex_free.txt` | commit, timing or memory fields |
| `logs/log_zex_ctrl.txt` | line order, commit, timing or memory fields |
| 16 files, e.g. `logs/time_audit_bounds.txt`, `logs/time_validate.txt` | timing log |
| 9 files, e.g. `out/out_bounds.txt`, `out/out_surface.txt` | commit, timing or memory fields |

In the text files, the differing fields are commit SHAs, run times in seconds, peak memory, the sha1 that `out/out_repro.txt` prints for outputs containing those SHAs and, in `logs/log_zex_ctrl.txt`, the order of the runs. The lean files gain `machine` and `nmant`, which the originals did not record.

## Rerun byte-identical to the original

`data/bounds.json`, `data/corner.json`, `data/cw.json`, `data/sec/sec_king_cyl_14_19.json`, `data/sec/sec_king_cyl_3_13.json`, `data/sec/sec_king_free_1_18.json`, `data/sec/sec_tri_cyl_3_18.json`, `data/z2.json`, `out/out_audit_bounds.txt`, `out/out_corner.txt`, `out/out_cw.txt`, `out/out_errbar.txt`, `out/out_fitsq.txt`, `out/out_hidden_oos.txt`, `out/out_lparity.txt`, `out/out_lspec.txt`, `out/out_ltest.txt`, `out/out_lweight.txt`, `out/out_lweight_big.txt`, `out/out_summary.txt`, `out/out_validate.txt`, `replication/out/corner.txt`

## New, no original

`logs/step0-progress.txt`, `logs/time_lean_king_cyl_w15_p1_longdouble.txt`, `logs/time_lean_king_cyl_w17_p1_longdouble.txt`, `logs/time_lean_king_cyl_w19_p1_longdouble.txt`, `logs/time_lean_king_cyl_w21_p1_longdouble.txt`, `logs/time_lean_king_cyl_w23_p1_longdouble.txt`, `logs/time_lean_king_cyl_w25_p1_longdouble.txt`, `logs/time_lean_king_free_w14_longdouble.txt`, `logs/time_lean_king_free_w15_longdouble.txt`, `logs/time_lean_king_free_w16_longdouble.txt`, `logs/time_lean_king_free_w17_longdouble.txt`, `logs/time_lean_king_free_w18_longdouble.txt`, `logs/time_lean_king_free_w19_longdouble.txt`, `logs/time_lean_king_free_w20_longdouble.txt`, `logs/time_lean_king_free_w21_longdouble.txt`, `logs/time_lean_king_free_w22_longdouble.txt`, `logs/time_lean_king_free_w23_longdouble.txt`, `logs/time_lean_king_free_w24_longdouble.txt`, `logs/time_lean_king_free_w25_float64.txt`, `logs/time_lean_king_free_w26_float64.txt`, `release/STEP0-REPORT.md`, `release/step0-rerun.sh`

## Not rerun

Fresh under the step 0 rule when the rerun was planned, so no job wrote them: `data/lean/lean_king_cyl_w10_p0_longdouble.json`, `data/lean/lean_king_cyl_w10_p1_longdouble.json`, `data/lean/lean_king_cyl_w11_p1_longdouble.json`, `data/lean/lean_king_cyl_w12_p0_longdouble.json`, `data/lean/lean_king_cyl_w12_p1_longdouble.json`, `data/lean/lean_king_cyl_w13_p1_longdouble.json`, `data/lean/lean_king_cyl_w14_p0_longdouble.json`, `data/lean/lean_king_cyl_w14_p1_longdouble.json`, `data/lean/lean_king_cyl_w16_p0_longdouble.json`, `data/lean/lean_king_cyl_w16_p1_longdouble.json`, `data/lean/lean_king_cyl_w18_p0_longdouble.json`, `data/lean/lean_king_cyl_w18_p1_longdouble.json`, `data/lean/lean_king_cyl_w20_p0_longdouble.json`, `data/lean/lean_king_cyl_w20_p1_longdouble.json`, `data/lean/lean_king_cyl_w22_p0_longdouble.json`, `data/lean/lean_king_cyl_w22_p1_longdouble.json`, `data/lean/lean_king_cyl_w24_p0_longdouble.json`, `data/lean/lean_king_cyl_w24_p1_longdouble.json`, `data/lean/lean_king_cyl_w4_p0_longdouble.json`, `data/lean/lean_king_cyl_w4_p1_longdouble.json`, `data/lean/lean_king_cyl_w5_p1_longdouble.json`, `data/lean/lean_king_cyl_w6_p0_longdouble.json`, `data/lean/lean_king_cyl_w6_p1_longdouble.json`, `data/lean/lean_king_cyl_w7_p1_longdouble.json`, `data/lean/lean_king_cyl_w8_p0_longdouble.json`, `data/lean/lean_king_cyl_w8_p1_longdouble.json`, `data/lean/lean_king_cyl_w9_p1_longdouble.json`, `data/zex/zex_king_free_m24_K24.json`, `log-convexity/out_involution.txt`, `log-convexity/out_modes.txt`, `log-convexity/out_symmetry.txt`, `out/out_pfaff.txt`, `replication/out/analyze_eig.txt`, `replication/out/compare_eig.txt`, `replication/out/eig_summary.json`
