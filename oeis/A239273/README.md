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

The b-file stops at $n = 12$ because $a(13)$ needs the $26 \times 26$ board.
