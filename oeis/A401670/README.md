# A401670

[OEIS A401670](https://oeis.org/A401670): number of domicule tilings of the $2n \times 2n$ torus.

## Contribution

- The new entry, submitted 1 November 2026.

## Status

Approved 9 November 2026, revision #6.

## Files

| file | content |
| --- | --- |
| [A401670.txt](A401670.txt) | the full entry text as published, with the data on one `%S` line and without the keyword `new` |
| [b401670.txt](b401670.txt) | $n = 0, \dots, 8$, the terms of the data line, printed alike by the generators [`b401670.rs`](b401670.rs), [`b401670.py`](b401670.py) and [`b401670.js`](b401670.js); not submitted; its terms up to $n = 8$ are checked against [`spec/cases/any-lattice-cylinder-torus-modular.json`](../../spec/cases/any-lattice-cylinder-torus-modular.json) |
| [A401670.gp](A401670.gp) | the program of the `%o` lines, with `T(h, w)` for the $h \times w$ torus |
| [b401670.rs](b401670.rs) | the generator of the b-file in Rust |
| [b401670.py](b401670.py) | the generator of the b-file in Python |
| [b401670.js](b401670.js) | the generator of the b-file in JavaScript |

## Notes

The comment that $a(0), \dots, a(6)$ agree between two programs rests for $a(6)$, the $12 \times 12$ torus, on one run of the row transfer in exact integers on 31 October 2026, which took 5249 s and printed 464778919849879305868191391185324176. `node js/solvers/any-lattice-cylinder-torus-bigint.js -r 12 -c 12 --torus` repeats it. The full test run, `FULL_CASES=1 node --test js/test/conformance.test.js` (hours, outside CI), compares both programs up to the $10 \times 10$ torus.
