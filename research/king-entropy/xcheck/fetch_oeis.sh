#!/bin/sh
# Fetches the OEIS entries A239264, A239273 and the LFS pointers of their b-files
# from the GitHub mirror of the OEIS database into the directory $1 (oeis.org
# itself was not reachable). The files are inputs only and are not committed.
set -e
DIR=${1:?usage: fetch_oeis.sh DIR}
mkdir -p "$DIR"
BASE=https://raw.githubusercontent.com/oeis/oeisdata/main
for f in seq/A239/A239264.seq seq/A239/A239273.seq files/A239/b239264.txt files/A239/b239273.txt; do
  curl -sSf -o "$DIR/$(basename $f)" "$BASE/$f"
done
cd "$DIR" && sha256sum *
