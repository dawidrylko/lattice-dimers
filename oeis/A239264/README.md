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

The independent program of the replication, `kd.c`, recomputes every strip file with 0 mismatches ([`compare_counts.txt`](../../research/king-entropy/replication/out/compare_counts.txt)). The first 1035 lines of the b-file are the former file of antidiagonals 0..44, which oeis.org keeps as `b239264_3.txt`. The b-file stops at antidiagonal 46 because antidiagonal 47 needs the strips of widths 21, 22 and 23 up to lengths 26, 25 and 24; the data reach lengths 24, 24 and 20.
