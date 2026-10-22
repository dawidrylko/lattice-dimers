#!/bin/sh
# Builds the two binaries of kd.c: kd_ld (x87 long double) and kd_d (double).
# -frounding-math and -ffp-contract=off keep the directed rounding of the
# certificates and forbid fused multiply-add contraction.
set -e
cd "$(dirname "$0")"
FLAGS="-O2 -march=x86-64 -fopenmp -frounding-math -ffp-contract=off -fno-fast-math -Wall"
gcc $FLAGS -o kd_ld kd.c -lm
gcc $FLAGS -DUSE_DOUBLE -o kd_d kd.c -lm
