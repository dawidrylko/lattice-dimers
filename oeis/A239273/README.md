# A239273

[A239273](https://oeis.org/A239273): number of domicule tilings of the $2n \times 2n$ square.

## Contribution

- The b-file of $n = 0, \dots, 12$ and a one-line PARI program, submitted 15 October 2026.

## Status

Approved 15 October 2026, revision #45.

## Files

| file | content |
| --- | --- |
| [A239273.txt](A239273.txt) | the `%H` and `%o` lines contributed |
| [b239273.txt](b239273.txt) | $n = 0, \dots, 12$, rebuilt from the strip counts in [`research/king-entropy/data/zex`](../../research/king-entropy/data/zex); identical to the published b-file on 1 November 2026 |
| [A239273.gp](A239273.gp) | the program of the `%o` line, which reads `T(h, w)` from [A239264.gp](../A239264/A239264.gp) |

## Notes

The b-file stops at $n = 12$ because $a(13)$ needs the $26 \times 26$ board.
