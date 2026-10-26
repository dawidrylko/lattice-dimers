#!/usr/bin/env bash
# Step 0 rerun of research/king-entropy (release/ZENODO.md, step 0, round 1 and its readers).
# One job at a time; after every job the outputs are committed and pushed, so an interrupted
# run keeps everything that finished. A rerun skips the jobs logs/step0-progress.txt marks "ok".
# usage, from the repository root: BR=<branch> [DEADLINE=<seconds>] bash research/king-entropy/release/step0-rerun.sh
# DRY=1 prints the jobs without running anything. With DEADLINE set, no job starts after that many
# seconds and the script exits with status 3: run it again to continue. Status 0: every job ran.
set -u
cd "$(git rev-parse --show-toplevel)/research/king-entropy" || exit 1
: "${BR:?set BR to the branch to push to}"
DRY=${DRY:-0}
DEADLINE=${DEADLINE:-0}
START=$(date +%s)
PROG=logs/step0-progress.txt
T="python3 src/timed.py"

if [ "$DRY" != 1 ]; then
  python3 - <<'EOF' || { echo "preflight failed: needs x86-64 with x87 long double" >&2; exit 1; }
import platform, sys
import numpy as np
nm = int(np.finfo(np.longdouble).nmant)
print(platform.machine(), "nmant", nm, "python", sys.version.split()[0], "numpy", np.__version__)
sys.exit(0 if platform.machine() == "x86_64" and nm == 63 else 1)
EOF
  touch "$PROG"
fi

push() {
  local i
  for i in 1 2 3 4 5; do
    git push -q origin "HEAD:refs/heads/$BR" && return 0
    sleep $((i * 20))
  done
  echo "PUSH FAILED after 5 tries" >&2
  return 1
}

job() {
  local name=$1 cmd=$2 rc
  if [ "$DRY" = 1 ]; then printf '%-28s %s\n' "$name" "$cmd"; return; fi
  if grep -qxF "ok $name" "$PROG"; then echo "skip $name"; return; fi
  if [ "$DEADLINE" -gt 0 ] && [ $(( $(date +%s) - START )) -ge "$DEADLINE" ]; then
    echo "== time budget reached before $name; run again to continue"
    exit 3
  fi
  echo "== $name  $(date -u +%FT%TZ)"
  bash -c "$cmd"
  rc=$?
  if [ $rc -eq 0 ]; then echo "ok $name" >> "$PROG"; else echo "FAILED rc=$rc $name" >> "$PROG"; fi
  git add -A data out logs log-convexity replication/out
  git commit -q -m "data(research): step 0 rerun, $name (rc=$rc)"
  push
}

zex_group() {
  local grp=$1; shift
  if [ "$DRY" != 1 ] && ! grep -q "^ok zex_${grp}_" "$PROG"; then : > "logs/log_zex_${grp}.txt"; fi
  local spec lat bc m k
  for spec in "$@"; do
    read -r lat bc m k <<< "$spec"
    job "zex_${grp}_${lat}_${bc}_m${m}" "python3 src/zexact.py $lat $bc $m $k >> logs/log_zex_${grp}.txt 2>&1"
  done
}

# sector eigenvalues
for a in "king cyl 3 13" "king cyl 14 19" "king free 1 18" "tri cyl 3 18"; do
  set -- $a
  job "sec_$1_$2_$3_$4" "$T python3 src/tm2.py $1 $2 $3 $4 > logs/log_$1_$2_$3_$4.txt 2> logs/time_$1_$2_$3_$4.txt"
done

# wide cylinders, float64
for a in "20 0" "20 1" "21 0" "21 1" "22 0" "22 1" "23 1" "24 0" "24 1" "25 1"; do
  set -- $a
  job "eig_w$1_p$2" "python3 src/cylw.py king cyl $1 $2 > logs/log_eig_king_cyl_w$1_p$2.txt"
done

# x87 extended precision, written before 6ef3190
for w in 15 17 19 21; do
  job "lean_cyl_w${w}_p1" "$T python3 src/lean.py king cyl $w 1 longdouble cw > logs/log_lean_king_cyl_w${w}_p1_longdouble.txt 2> logs/time_lean_king_cyl_w${w}_p1_longdouble.txt"
done
for w in 23 25; do
  job "lean_cyl_w${w}_p1" "$T python3 src/lean.py king cyl $w 1 longdouble > logs/log_lean_king_cyl_w${w}_p1_longdouble.txt 2> logs/time_lean_king_cyl_w${w}_p1_longdouble.txt"
done
for w in 14 15 16 17 18 19 20 21 22 23 24; do
  job "lean_free_w${w}" "$T python3 src/lean.py king free $w - longdouble > logs/log_lean_king_free_w${w}_longdouble.txt 2> logs/time_lean_king_free_w${w}_longdouble.txt"
done
for w in 25 26; do
  job "lean_free_w${w}" "$T python3 src/lean.py king free $w - float64 cw > logs/log_lean_king_free_w${w}_float64.txt 2> logs/time_lean_king_free_w${w}_float64.txt"
done

# exact counts by CRT (every file but zex_king_free_m24_K24.json, which is current)
zex_group cyl "king cyl 3 80" "king cyl 4 80" "king cyl 5 80" "king cyl 6 80" "king cyl 7 80" "king cyl 8 80" \
  "king cyl 9 80" "king cyl 10 80" "king cyl 11 80" "king cyl 12 80" "king cyl 13 40" "king cyl 14 40" \
  "king cyl 15 40" "king cyl 16 40" "king cyl 17 40" "king cyl 18 40" "king cyl 19 28" "king cyl 20 28" \
  "king cyl 21 22" "king cyl 22 22"
zex_group free "king free 2 120" "king free 3 120" "king free 4 120" "king free 5 120" "king free 6 120" \
  "king free 7 120" "king free 8 120" "king free 9 120" "king free 10 120" "king free 11 120" "king free 12 120" \
  "king free 13 60" "king free 14 60" "king free 15 60" "king free 16 60" "king free 17 36" "king free 18 36" \
  "king free 19 36" "king free 20 36" "king free 21 24" "king free 22 24" "king free 23 20" "king free 24 20"
ctrl=()
for lat in sq tri; do
  for m in 3 4 5 6 7 8 9 10 11 12; do ctrl+=("$lat cyl $m 60"); done
  for m in 2 3 4 5 6 7 8 9 10 11 12; do ctrl+=("$lat free $m 60"); done
done
zex_group ctrl "${ctrl[@]}"

# certified (L) tests, (L) under weights, checks
job lcert_m25 "$T python3 src/lcert.py 25 30 > out/out_lcert_m25.txt 2> logs/time_lcert_m25.txt"
job lcert_m26 "$T python3 src/lcert.py 26 30 > out/out_lcert_m26.txt 2> logs/time_lcert_m26.txt"
job lweight "$T python3 src/lweight.py > out/out_lweight.txt 2> logs/time_lweight.txt"
job lweight_big "$T python3 src/lweight.py big > out/out_lweight_big.txt 2> logs/time_lweight_big.txt"
job validate "$T python3 src/validate.py > out/out_validate.txt 2> logs/time_validate.txt"
job crosscheck "$T python3 src/crosscheck.py > out/out_crosscheck.txt 2> logs/time_crosscheck.txt"
job linf "$T python3 log-convexity/linf.py 16 > log-convexity/out_linf.txt 2> log-convexity/time_linf.txt"

# bounds
job bounds "$T python3 src/bounds.py 24 > out/out_bounds.txt 2> logs/time_bounds.txt"
job runweight_2_23 "$T python3 src/runweight.py 3state \$(seq 2 23) > out/out_runweight_3state.txt 2> logs/time_runweight_3state.txt"
job runweight_24 "grep -qxF 'ok runweight_2_23' $PROG && $T python3 src/runweight.py 3state 24 --disk ${RW_DISK:-/tmp} > /tmp/runweight_w24.txt 2> logs/time_runweight_3state_w24.txt && tail -1 /tmp/runweight_w24.txt >> out/out_runweight_3state.txt"

# readers of the files rerun above
job summary "python3 src/summary.py > out/out_summary.txt"
job fitsq "python3 src/fitsq.py > out/out_fitsq.txt"
job errbar "python3 src/errbar.py > out/out_errbar.txt"
job hidden_oos "python3 src/hidden_oos.py > out/out_hidden_oos.txt"
job estimate "python3 src/estimate.py > out/out_estimate.txt"
job cw "$T python3 src/cw.py > out/out_cw.txt 2> logs/time_cw.txt"
job audit_bounds "$T python3 src/audit_bounds.py > out/out_audit_bounds.txt 2> logs/time_audit_bounds.txt"
job surface "python3 src/surface.py > out/out_surface.txt"
job corner "python3 src/corner.py > out/out_corner.txt"
job ltest "python3 src/ltest.py > out/out_ltest.txt"
job lparity "python3 src/lparity.py > out/out_lparity.txt"
job lspec "python3 src/lspec.py > out/out_lspec.txt"
job derived "python3 src/derived.py > out/out_derived.txt"
job replication_corner "cd replication && python3 corner.py > out/corner.txt"

# last: the smoke test and the reproduction record, from the committed tree
job test_paths "python3 src/test_paths.py"
job repro "$T python3 src/repro.py > out/out_repro.txt 2> logs/time_repro.txt"

[ "$DRY" = 1 ] || { echo "== done $(date -u +%FT%TZ)"; grep -c '^ok ' "$PROG"; grep '^FAILED' "$PROG"; true; }
