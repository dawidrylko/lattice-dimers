# A402693

[OEIS A402693](https://oeis.org/draft/A402693): number of tilings of the $2n \times 2n$ cylinder on the triangular lattice.

## Contribution

- The new entry with the b-file of $n = 0, \dots, 36$, drafted 25 November 2026.

## Status

Proposed 25 November 2026, revision #2 of the draft.

## Files

| file | content |
| --- | --- |
| [A402693.txt](A402693.txt) | the full entry text, reconstructed from the draft page, with the links planned for the upload of the b-file as `b402693_1.txt` |
| [b402693.txt](b402693.txt) | $n = 0, \dots, 36$, printed alike by the generators [`b402693.rs`](b402693.rs), [`b402693.py`](b402693.py) and [`b402693.js`](b402693.js); its terms up to $n = 10$ are checked against [`spec/cases/any-lattice-cylinder-torus-modular.json`](../../spec/cases/any-lattice-cylinder-torus-modular.json) and [`spec/cases/any-lattice-cylinder-torus-polynomial-modular.json`](../../spec/cases/any-lattice-cylinder-torus-polynomial-modular.json) |
| [A402693.gp](A402693.gp) | the program of the `%o` lines |
| [b402693.rs](b402693.rs) | the generator of the b-file in Rust |
| [b402693.py](b402693.py) | the generator of the b-file in Python |
| [b402693.js](b402693.js) | the generator of the b-file in JavaScript |

## Notes

The status above is written ahead. Revision #2 is the saved draft before its b-file and links. On submission the copy is rebuilt from the draft page with the revision it goes in at.

The three generators are those of [A401988](../A401988/README.md), moved to the cylinder. They compute $\det K$ of the Kasteleyn matrix of the [PARI program](A402693.gp) modulo primes by banded elimination. They do it twice: once with the edges across the seam as they are, once with their signs flipped. The Chinese remainder theorem rebuilds both, and the larger one must be an exact square. The cylinder is planar, so one of the two Pfaffians is the number of tilings up to sign. The other is the difference between the tilings with an even and with an odd number of pieces across the seam.

The cells are numbered row by row. An edge across the seam then joins cells at most $2n - 1$ apart, so the band of A401988 holds it. On the cylinder of circumference 2 the two edges between the same cells add.

The primes are those of A401988: below $2^{26}$ in `b402693.js` for a product above Hadamard's bound, and the primes of `rust/core` and `python/lattice_dimers/core` below $2^{31}$ under the Kahn-Lovasz bound, plus one that checks the result, in `b402693.rs` and `b402693.py`. The Kahn-Lovasz bound does not hold for the doubled edges of the cylinder of circumference 2: it gives 24, while $a(1)^2 = 36$. The list still has two primes, both above 36, so $a(1)$ comes out exact.

`buildBFiles.js` checks the terms up to $n = 10$ against `spec/cases/`. That folder also holds the $40 \times 40$ board, $a(20)$. The terms up to $n = 20$ agree with the Pfaffian solver of the site, [`any-lattice-cylinder-torus-pfaffian.js`](../../js/solvers/any-lattice-cylinder-torus-pfaffian.js). From $n = 6$ to $n = 19$ they also agree with a dense determinant in 64-bit floats, to $10^{-12}$ in the logarithm. CI runs the Rust generator over the whole b-file and the Python and JavaScript ones up to the last terms of [`spec/limits.json`](../../spec/limits.json). `rust/target/release/b402693 0 36` (after `cargo build --release` in `rust/`) printed the whole b-file in 29 s on 25 November 2026, in a Docker container limited to two cores of an Apple M4, and `b402693.js` printed the same file. $a(36)$, the last term, has 953 digits; $a(37)$ has 1007, more than the 1000 digits a b-file line may hold.
