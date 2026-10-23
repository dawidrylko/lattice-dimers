#!/bin/sh
# Builds the two binaries of kd.c: kd_ld (x87 long double) and kd_d (double).
# -frounding-math and -ffp-contract=off keep the directed rounding of the
# certificates and forbid fused multiply-add contraction.
set -e
cd "$(dirname "$0")"
FLAGS="-O2 -march=x86-64 -fopenmp -frounding-math -ffp-contract=off -fno-fast-math -Wall"
# build under temporary names and rename, so that running processes keep their binary
gcc $FLAGS -o kd_ld.new kd.c -lm && mv kd_ld.new kd_ld
gcc $FLAGS -DUSE_DOUBLE -o kd_d.new kd.c -lm && mv kd_d.new kd_d
