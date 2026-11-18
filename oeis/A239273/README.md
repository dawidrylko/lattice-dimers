# A239273

[OEIS A239273](https://oeis.org/A239273): number of domicule tilings of the $2n \times 2n$ square.

## Contribution

- The b-file of $n = 0, \dots, 12$ and a one-line PARI program, submitted 15 October 2026.

## Status

Approved 11 November 2026, revision #51.

## Files

| file | content |
| --- | --- |
| [A239273.txt](A239273.txt) | the `%H` and `%o` lines contributed |
| [b239273.txt](b239273.txt) | $n = 0, \dots, 12$, printed alike by the generators [`b239273.rs`](b239273.rs), [`b239273.py`](b239273.py) and [`b239273.js`](b239273.js); identical to the published b-file on 1 November 2026; its terms up to $n = 12$ are checked against the strip counts in [`research/king-entropy/data/zex`](../../research/king-entropy/data/zex) |
| [A239273.gp](A239273.gp) | the program of the `%o` line, which reads `T(h, w)` from [A239264.gp](../A239264/A239264.gp) |
| [b239273.rs](b239273.rs) | the generator of the b-file in Rust |
| [b239273.py](b239273.py) | the generator of the b-file in Python |
| [b239273.js](b239273.js) | the generator of the b-file in JavaScript |

## Notes

The three generators run the same method in Rust, Python and JavaScript, each in its own code: the dynamic programming of the generators of [A239264](../A239264/README.md), modulo primes, on the $2n \times 2n$ board.

`rust/target/release/b239273 0 12` (after `cargo build --release` in `rust/`) prints the whole b-file in 95 s, `python3 -I oeis/A239273/b239273.py 0 12` (after `python3 -m pip install -e python`) in 462 s and `node oeis/A239273/b239273.js 0 12` in 596 s, all three on the 10 cores of an Apple M4 on 17 November 2026. So CI runs the Rust generator up to $n = 10$ and the Python and JavaScript ones up to $n = 9$. These last terms are in [`spec/limits.json`](../../spec/limits.json), and `FULL_CASES=1` runs every term in all three.

The b-file stops at $n = 12$ because $a(13)$ needs the $26 \times 26$ board.
