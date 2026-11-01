# OEIS

The b-files and the entry texts this repository has contributed to the [OEIS](https://oeis.org/), with their status on 1 November 2026. The OEIS is the authoritative copy, and its editors may still change a proposed draft before they approve it.

| entry | contribution | status on 1 November 2026 | files |
| --- | --- | --- | --- |
| [A004003](https://oeis.org/A004003) | the formula as a resultant and its PARI program | approved 21 October 2026 (revision #168) | `A004003.txt` |
| [A239273](https://oeis.org/A239273) | b-file for n = 0..12 and a one-line PARI program | approved 15 October 2026 (#45) | `A239273.txt`, `b239273.txt` |
| [A239264](https://oeis.org/A239264) | the PARI program and the b-file to antidiagonal 44, approved 31 October 2026 (#34); the extension to antidiagonal 46 | extension proposed 1 November 2026 ([draft #37](https://oeis.org/draft/A239264)) | `A239264.txt`, `b239264.txt` |
| [A401669](https://oeis.org/draft/A401669) | new entry: the decimal expansion of the entropy per site $s$ of the king's graph | proposed 1 November 2026 (#4) | `A401669.txt` |
| [A401670](https://oeis.org/draft/A401670) | new entry: domicule tilings of the $2n \times 2n$ torus | proposed 1 November 2026 (#3) | `A401670.txt` |

## b-files

`node oeis/buildBFiles.js` rebuilds `b239264.txt` (antidiagonals 0..46, 1128 terms) and `b239273.txt` (n = 0..12) in seconds from the exact strip counts in [`research/king-entropy/data/zex`](../research/king-entropy/data/zex), and `pnpm test:oeis` fails in CI when a committed file differs from the rebuild. The independent program of the replication, `kd.c`, recomputes every one of those strip files with 0 mismatches ([`compare_counts.txt`](../research/king-entropy/replication/out/compare_counts.txt)).

On 1 November 2026 both files were byte-identical to the OEIS: `b239273.txt` to the published b-file, `b239264.txt` to the file uploaded with draft #37, and its first 1035 lines to the published b-file of antidiagonals 0..44. Antidiagonal 47 is out of reach for now: it needs the strip of width 21 up to length 26, and the data reach length 24. In A239273, $a(13)$ needs the $26 \times 26$ board.

## Entry texts

The `A*.txt` files are in the OEIS internal format, copied from oeis.org on 1 November 2026, and the proposed drafts from their draft pages. New entries are given in full, with the data on one `%S` line. Existing entries hold only the lines this repository contributed.

The comment of A401670 that its terms up to $a(6)$ agree between two programs rests for $a(6)$, the $12 \times 12$ torus, on one run of the row transfer in exact integers (5249 s on 31 October 2026). The test run compares both solvers up to $10 \times 10$.
