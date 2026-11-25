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

The status above is written ahead: revision #2 is the saved draft before its b-file and links, and the copy is rebuilt from the draft page with the revision it is submitted at.

The three generators are those of [A401988](../A401988/README.md) on the cylinder. They compute $\det K$ of the Kasteleyn matrix of the [PARI program](A402693.gp) modulo primes by banded elimination, once with the edges across the seam as they are and once with their signs flipped, rebuild both with the Chinese remainder theorem and take the square root of the larger one, which must be exact. The cylinder is planar: one of the two Pfaffians is the number of tilings up to sign, and the other is the difference between the tilings with an even and with an odd number of pieces across the seam. With the cells numbered row by row the edges across the seam join cells at most $2n - 1$ apart, so the band of A401988 holds them, and the two edges between the same cells on the cylinder of circumference 2 add.

The primes are those of A401988: below $2^{26}$ in `b402693.js` for a product above Hadamard's bound, and the primes of `rust/core` and `python/lattice_dimers/core` below $2^{31}$ under the Kahn-Lovasz bound, plus one that checks the result, in `b402693.rs` and `b402693.py`. On the cylinder of circumference 2 that bound is below $a(1)^2 = 36$, but the first prime alone exceeds it.

`buildBFiles.js` checks the terms up to $n = 10$ against `spec/cases/`, which also holds the $40 \times 40$ board, $a(20)$. The terms up to $n = 20$ also agree with the Pfaffian solver of the site, [`any-lattice-cylinder-torus-pfaffian.js`](../../js/solvers/any-lattice-cylinder-torus-pfaffian.js), and the terms from $n = 6$ to $n = 19$ with a dense determinant in 64-bit floats to $10^{-12}$ in the logarithm. CI runs the Rust generator over the whole b-file and the Python and JavaScript ones up to the last terms of [`spec/limits.json`](../../spec/limits.json). `rust/target/release/b402693 0 36` (after `cargo build --release` in `rust/`) printed the whole b-file in 29 s on two cores on 25 November 2026, and `b402693.js` agreed with it up to $n = 30$. $a(36)$, the last term, has 953 digits; $a(37)$ has 1007, more than the 1000 digits a b-file line may hold.
