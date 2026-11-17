# A401988

[OEIS A401988](https://oeis.org/draft/A401988): number of tilings of the $2n \times 2n$ board on the triangular lattice.

## Contribution

- The new entry with the b-file of $n = 0, \dots, 37$, submitted 11 November 2026.

## Status

Proposed 11 November 2026, revision #9 of the draft.

## Files

| file | content |
| --- | --- |
| [A401988.txt](A401988.txt) | the full entry text, reconstructed from the draft page |
| [b401988.txt](b401988.txt) | $n = 0, \dots, 37$, printed alike by the generators [`b401988.rs`](b401988.rs), [`b401988.py`](b401988.py) and [`b401988.js`](b401988.js); identical to the file uploaded with the draft; its terms up to $n = 11$ are checked against [`spec/cases/any-lattice-rectangle-modular.json`](../../spec/cases/any-lattice-rectangle-modular.json) |
| [A401988.gp](A401988.gp) | the program of the `%o` lines |
| [b401988.rs](b401988.rs) | the generator of the b-file in Rust |
| [b401988.py](b401988.py) | the generator of the b-file in Python |
| [b401988.js](b401988.js) | the generator of the b-file in JavaScript |

## Notes

The three generators run the same method in Rust, Python and JavaScript, each in its own code. They compute $\det K$ of the Kasteleyn matrix of the [PARI program](A401988.gp) modulo primes by banded elimination, rebuild it with the Chinese remainder theorem and take its square root, which must be exact.

The primes differ. `b401988.js` takes enough primes below $2^{26}$ for their product to pass $2^8 \cdot 3^{4n^2}$, above Hadamard's bound $6^{2n^2}$ on $\det K$. `b401988.rs` and `b401988.py` take the primes below $2^{31}$ of `rust/core` and `python/lattice_dimers/core`, as many as $\det K = a(n)^2$ needs under the Kahn-Lovasz bound $a(n) \le \prod_v (d_v!)^{1/(2 d_v)}$, and one more that checks the result. Each of their threads takes the next prime of the list.

`rust/target/release/b401988 0 37` (after `cargo build --release` in `rust/`) prints the whole b-file in 11 s. `python3 -I oeis/A401988/b401988.py 0 37` (after `python3 -m pip install -e python`) takes 478 s. Both ran on the 10 cores of an Apple M4 on 17 November 2026. `node oeis/A401988/b401988.js 0 37` runs on one core, and $a(36)$ alone took it 434 s on 11 November 2026. So CI runs the Rust generator over the whole b-file, the Python one up to $n = 20$ and the JavaScript one up to $n = 19$, the last terms of [`spec/limits.json`](../../spec/limits.json). `FULL_CASES=1` runs every term in all three.

`buildBFiles.js` checks the terms that `spec/cases/` holds, up to the $22 \times 22$ board. The terms up to $n = 11$ also agree with a dense determinant and with a transfer matrix in exact integers. $a(37)$, the last term, has 994 digits; $a(38)$ has 1049, more than the 1000 digits a b-file line may hold.

The b-file of $n = 0, \dots, 36$ was uploaded as `b401988_1.txt` and replaced by the one of $n = 0, \dots, 37$, uploaded as `b401988_2.txt`.
