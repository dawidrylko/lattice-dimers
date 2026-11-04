# A401670

[OEIS A401670](https://oeis.org/draft/A401670): number of domicule tilings of the $2n \times 2n$ torus.

## Contribution

- The new entry, submitted 1 November 2026.

## Status

Proposed 1 November 2026, revision #3 of the draft.

## Files

| file | content |
| --- | --- |
| [A401670.txt](A401670.txt) | the full entry text, reconstructed from the draft page |
| [b401670.txt](b401670.txt) | $n = 0, \dots, 8$, the terms of the data line, from [`spec/cases/periodicTilingTests.json`](../../spec/cases/periodicTilingTests.json) and [`spec/cases/periodicTilingTests-Modular.json`](../../spec/cases/periodicTilingTests-Modular.json); not submitted |
| [A401670.gp](A401670.gp) | the program of the `%o` lines, with `T(h, w)` for the $h \times w$ torus |

## Notes

The comment that $a(0), \dots, a(6)$ agree between two programs rests for $a(6)$, the $12 \times 12$ torus, on one run of the row transfer in exact integers on 31 October 2026, which took 5249 s and printed 464778919849879305868191391185324176. `node js/solvers/periodicTilingSolver-BigInt.js -r 12 -c 12 --torus` repeats it. The full test run, `node harness/testRunner.js` (hours, outside CI), compares both programs up to the $10 \times 10$ torus.
