# A239264

[OEIS A239264](https://oeis.org/A239264): number of domicule tilings of the $h \times w$ rectangle, read by antidiagonals.

## Contribution

- The PARI program and the b-file of antidiagonals 0..44, submitted 15 October 2026 and approved 31 October 2026 (revision #34).
- The extension of the b-file to antidiagonal 46.

## Status

Approved 11 November 2026, revision #42.

## Files

| file | content |
| --- | --- |
| [A239264.txt](A239264.txt) | the `%H` and `%o` lines contributed |
| [b239264.txt](b239264.txt) | antidiagonals 0..46, 1128 terms, printed alike by the generators [`b239264.rs`](b239264.rs), [`b239264.py`](b239264.py) and [`b239264.js`](b239264.js); identical to the published b-file on 1 November 2026; its terms up to antidiagonal 46 are checked against the strip counts in [`research/king-entropy/data/zex`](../../research/king-entropy/data/zex) |
| [A239264.gp](A239264.gp) | the program of the `%o` lines, `T(h, w)` |
| [b239264.rs](b239264.rs) | the generator of the b-file in Rust |
| [b239264.py](b239264.py) | the generator of the b-file in Python |
| [b239264.js](b239264.js) | the generator of the b-file in JavaScript |

## Notes

The three generators run the same method in Rust, Python and JavaScript, each in its own code. For each width they run the dynamic programming of [`A239264.gp`](A239264.gp) modulo primes once, over the longest board of that width the range needs, and read the count of every shorter board on the way. They take the primes below $2^{31}$ of `rust/core`, `python/lattice_dimers/core` and `js/core`, as many as the Kahn-Lovasz bound on that longest board needs, and one more that checks each term. A board of odd area has no tiling and is not run.

`rust/target/release/b239264 0 1127` (after `cargo build --release` in `rust/`) prints the whole b-file in 32 s, `python3 -I oeis/A239264/b239264.py 0 1127` (after `python3 -m pip install -e python`) in 118 s and `node oeis/A239264/b239264.js 0 1127` in 200 s, all three on the 10 cores of an Apple M4 on 17 November 2026. So CI runs the Rust generator up to $n = 945$, the end of antidiagonal 42, and the Python and JavaScript ones up to $n = 779$, the end of antidiagonal 38. These last terms are in [`spec/limits.json`](../../spec/limits.json), and `FULL_CASES=1` runs every term in all three.

The independent program of the replication, `kd.c`, recomputes every strip file with 0 mismatches ([`compare_counts.txt`](../../research/king-entropy/replication/out/compare_counts.txt)). The first 1035 lines of the b-file are the former file of antidiagonals 0..44, which oeis.org keeps as `b239264_3.txt`. The b-file stops at antidiagonal 46 because antidiagonal 47 needs the strips of widths 21, 22 and 23 up to lengths 26, 25 and 24; the data reach lengths 24, 24 and 20.
