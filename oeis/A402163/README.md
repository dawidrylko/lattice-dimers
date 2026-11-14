# A402163

[OEIS A402163](https://oeis.org/draft/A402163): number of domicule tilings of the $2n \times 2n$ cylinder.

## Contribution

- The new entry with the b-file of $n = 0, \dots, 11$, submitted 14 November 2026.

## Status

Proposed 14 November 2026, revision #7 of the draft.

## Files

| file | content |
| --- | --- |
| [A402163.txt](A402163.txt) | the full entry text, reconstructed from the draft page |
| [b402163.txt](b402163.txt) | $n = 0, \dots, 11$, from [`spec/cases/any-lattice-cylinder-torus-modular.json`](../../spec/cases/any-lattice-cylinder-torus-modular.json) up to $n = 10$ and from [`zex_king_cyl_m22_K22.json`](../../research/king-entropy/data/zex/zex_king_cyl_m22_K22.json) for $n = 11$; identical to the file uploaded with the draft |
| [A402163.gp](A402163.gp) | the program of the `%o` lines, with `T(h, w)` for the $h \times w$ cylinder |

## Notes

The program is the one of [A401670](../A401670/A401670.gp) with one change: the cylinder count is the entry of the power of the row transfer matrix from the empty row to the empty row, where the torus count is its trace.

$a(0), \dots, a(7)$ come also from the row transfer in exact integers, `node js/solvers/any-lattice-cylinder-torus-bigint.js -r 14 -c 14 --lattice king` for $a(7)$ in 20 s on 14 November 2026; the $16 \times 16$ cylinder ran out of the 4 GB heap of Node.js. $a(2), \dots, a(11)$ agree between the modular solver of the site and `research/king-entropy/src/zexact.py`, two programs that go cell by cell modulo primes. For $a(11)$, `node js/solvers/any-lattice-cylinder-torus-modular.js -r 22 -c 22 --lattice king -j 4` took 290 s and printed the count of `zex_king_cyl_m22_K22.json`.

The b-file was uploaded as `b402163_1.txt`. An editor then added $a(9)$ to the data, for which there was room, and dropped the keyword `more`, which an entry with a b-file does not take (revisions #5 to #7).
