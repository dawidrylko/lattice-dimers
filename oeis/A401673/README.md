# A401673

[OEIS A401673](https://oeis.org/A401673): triangle of the domicule tilings of the $2n \times 2n$ square by the number of diagonal pieces.

## Contribution

- The new entry with the b-file of rows 0..10, submitted 1 November 2026.

## Status

Approved 9 November 2026, revision #9.

## Files

| file | content |
| --- | --- |
| [A401673.txt](A401673.txt) | the full entry text as published, with the data on one `%S` line and without the keyword `new` |
| [b401673.txt](b401673.txt) | rows 0..10, 396 terms, printed alike by the generators [`b401673.rs`](b401673.rs), [`b401673.py`](b401673.py) and [`b401673.js`](b401673.js); identical to the published b-file on 11 November 2026; its terms up to row 10 are checked against [`spec/cases/domicule-rectangle-polynomial-modular.json`](../../spec/cases/domicule-rectangle-polynomial-modular.json) |
| [A401673.gp](A401673.gp) | the program of the `%o` lines |
| [b401673.rs](b401673.rs) | the generator of the b-file in Rust |
| [b401673.py](b401673.py) | the generator of the b-file in Python |
| [b401673.js](b401673.js) | the generator of the b-file in JavaScript |

## Notes

The three generators run the same method in Rust, Python and JavaScript, each in its own code. Row $n$ is a polynomial of degree $n^2$ in $x^2$. They count the tilings of the $2n \times 2n$ board modulo primes by the dynamic programming of [`A401673.gp`](A401673.gp) with $x = j$ for $j = 0, \dots, n^2$, and interpolate the polynomial through these values of $x^2 = j^2$. A coefficient is at most the row sum $A239273(n)$. The Kahn-Lovasz bound on that sum sets the number of primes, plus one that checks each term.

`rust/target/release/b401673 0 395` (after `cargo build --release` in `rust/`) prints the whole b-file in 316 s, `python3 -I oeis/A401673/b401673.py 0 395` (after `python3 -m pip install -e python`) in 1307 s and `node oeis/A401673/b401673.js 0 395` in 1564 s, all three on the 10 cores of an Apple M4 on 17 November 2026. So CI runs the Rust generator up to $n = 212$, the end of row 8, and the Python and JavaScript ones up to $n = 147$, the end of row 7. These last terms are in [`spec/limits.json`](../../spec/limits.json), and `FULL_CASES=1` runs every term in all three.

The b-file was uploaded as `b401673_1.txt` and installed as `b401673.txt` on approval.
