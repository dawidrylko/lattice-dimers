# A004003

[A004003](https://oeis.org/A004003): number of domino tilings of the $2n \times 2n$ square.

## Contribution

- The formula $a(n) = (-1)^n \mathrm{Res}(P(x), P(-x))$, where $P(x^2) = U_{2n}(x/2)$, and its PARI program, submitted 15 October 2026.

## Status

Approved 21 October 2026, revision #168.

## Files

| file | content |
| --- | --- |
| [A004003.txt](A004003.txt) | the `%F` and `%o` lines contributed |
| [b004003.txt](b004003.txt) | $n = 0, \dots, 44$, rebuilt from the resultant by [`dominoTilingSolver-Formula.js`](../../src/solvers/dominoTilingSolver-Formula.js); identical to the published b-file of Alois P. Heinz on 1 November 2026 |
| [A004003.gp](A004003.gp) | the program of the `%o` line |

## Notes

The b-file is not a contribution: it reproduces the published one from the formula. $a(45)$ has 1015 digits, more than a b-file line may hold.
