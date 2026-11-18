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

The three generators run the same method in Rust, Python and JavaScript, each in its own code. The trace of [`A401670.gp`](A401670.gp) is a sum over the sets of first-row cells covered from the last row: the run cell by cell modulo primes from such a set back to the same set. Rotating or reflecting the columns keeps the count of a set, so they run one set of each orbit and weight it by the size of the orbit, which leaves 2250 runs of the $16 \times 16$ torus instead of 65536. They take as many primes below $2^{31}$ as the Kahn-Lovasz bound $a(n) \le (8!)^{4n^2/16}$ needs, for $n = 1$ the bound $2^{2n} \cdot 5^{2n^2}$, and one more that checks each term.

`rust/target/release/b401670 0 8` (after `cargo build --release` in `rust/`) prints the whole b-file in 339 s, `python3 -I oeis/A401670/b401670.py 0 8` (after `python3 -m pip install -e python`) in 1661 s and `node oeis/A401670/b401670.js 0 8` in 1390 s, all three on the 10 cores of an Apple M4 on 17 November 2026. So CI runs the Rust and JavaScript generators up to $n = 6$ and the Python one up to $n = 5$. These last terms are in [`spec/limits.json`](../../spec/limits.json), and `FULL_CASES=1` runs every term in all three.

The comment that $a(0), \dots, a(6)$ agree between two programs rests for $a(6)$, the $12 \times 12$ torus, on one run of the row transfer in exact integers on 31 October 2026, which took 5249 s and printed 464778919849879305868191391185324176. `node js/solvers/any-lattice-cylinder-torus-bigint.js -r 12 -c 12 --torus` repeats it. The full test run, `FULL_CASES=1 node --test js/test/conformance.test.js` (hours, outside CI), compares both programs up to the $10 \times 10$ torus.
