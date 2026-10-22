#!/bin/sh
# The long runs, in sequence (each uses all cores): exact counts, then the power iterations.
cd "$(dirname "$0")"
python3 counts.py > out/counts_log.txt 2>&1
python3 eigrun.py base > out/eig_base_log.txt 2>&1
python3 eigrun.py wide > out/eig_wide_log.txt 2>&1
