# OEIS

The b-files and the entry texts this repository has contributed to the [OEIS](https://oeis.org/), with their status on 1 November 2026. The OEIS is the authoritative copy, and its editors may still change a proposed draft before they approve it.

| entry | contribution | status on 1 November 2026 | files |
| --- | --- | --- | --- |
| [A004003](https://oeis.org/A004003) | the formula as a resultant and its PARI program | approved 21 October 2026 (revision #168) | `A004003.txt` |
| [A239273](https://oeis.org/A239273) | b-file for n = 0..12 and a one-line PARI program | approved 15 October 2026 (#45) | `A239273.txt`, `b239273.txt` |
| [A239264](https://oeis.org/A239264) | the PARI program and the b-file to antidiagonal 44, submitted 15 October and approved 31 October 2026 (#34); the extension to antidiagonal 46 | extension approved 1 November 2026 (#40) | `A239264.txt`, `b239264.txt` |
| [A401669](https://oeis.org/draft/A401669) | new entry: the decimal expansion of the entropy per site $s$ of the king's graph | proposed 1 November 2026 (#4) | `A401669.txt` |
| [A401670](https://oeis.org/draft/A401670) | new entry: domicule tilings of the $2n \times 2n$ torus | proposed 1 November 2026 (#3) | `A401670.txt` |
| [A401673](https://oeis.org/draft/A401673) | new entry: the triangle of domicule tilings of the $2n \times 2n$ square by the number of diagonal domicules, with the b-file of rows 0..10 | proposed 1 November 2026 (#4) | `A401673.txt`, `b401673.txt` |

## b-files

`node oeis/buildBFiles.js` rebuilds `b239264.txt` (antidiagonals 0..46, 1128 terms) and `b239273.txt` (n = 0..12) in seconds from the exact strip counts in [`research/king-entropy/data/zex`](../research/king-entropy/data/zex), and `b401673.txt` (rows 0..10 of the triangle, 396 terms) from the diagonal counts in [`data/domiculeDiagonalTests.json`](../data/domiculeDiagonalTests.json) and [`data/domiculeDiagonalTests-Modular.json`](../data/domiculeDiagonalTests-Modular.json). `pnpm test:oeis` fails in CI when a committed file differs from the rebuild, when the two diagonal files disagree on a board, or when a board has tilings with an odd number of diagonal pieces. The independent program of the replication, `kd.c`, recomputes every one of those strip files with 0 mismatches ([`compare_counts.txt`](../research/king-entropy/replication/out/compare_counts.txt)).

On 1 November 2026 the three files were byte-identical to the OEIS: `b401673.txt` to the file uploaded with the A401673 draft, `b239273.txt` to the published b-file, `b239264.txt` to the published b-file of antidiagonals 0..46, and its first 1035 lines to the former file of antidiagonals 0..44, which oeis.org keeps as `b239264_3.txt`. Antidiagonal 47 is out of reach for now: it needs the strips of widths 21, 22 and 23 up to lengths 26, 25 and 24, and the data reach lengths 24, 24 and 20. In A239273, $a(13)$ needs the $26 \times 26$ board.

## Entry texts

The `A*.txt` files are in the OEIS internal format as of 1 November 2026. Published lines come from `https://oeis.org/search?q=id:<A-number>&fmt=text`; a proposed draft exists only as the HTML of its draft page, so its text is reconstructed from that page. New entries are given in full, with the data on one `%S` line. Existing entries hold only the lines this repository contributed.

The comment of A401670 that its terms up to $a(6)$ agree between two programs rests for $a(6)$, the $12 \times 12$ torus, on one run of the row transfer in exact integers on 31 October 2026, which took 5249 s and printed 464778919849879305868191391185324176. `node src/solvers/periodicTilingSolver-BigInt.js -r 12 -c 12 --torus` repeats it. The full test run, `node tests/testRunner.js` (hours, outside CI), compares both solvers up to $10 \times 10$.

## After approval

When an editor approves a draft, the links to `https://oeis.org/draft/...` in this file, in `README.md`, in `notes/00-research.md`, `notes/04-torus.md` and `notes/05-diagonals.md` become links to the entry, and the status column changes. The A401673 b-file was uploaded as `b401673_1.txt`; the OEIS is expected to install it as `b401673.txt`, as it did with the A239264 upload, and the `%H` line of `A401673.txt` then changes with it.
