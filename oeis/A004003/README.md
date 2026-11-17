# A004003

[OEIS A004003](https://oeis.org/A004003): number of domino tilings of the $2n \times 2n$ square.

## Contribution

- The formula $a(n) = (-1)^n \mathrm{Res}(P(x), P(-x))$, where $P(x^2) = U_{2n}(x/2)$, and its PARI program, submitted 15 October 2026.
- The cross-reference to A401673, whose column $k = 0$ is this sequence, submitted 11 November 2026.

## Status

Approved 11 November 2026, revision #172.

## Files

| file | content |
| --- | --- |
| [A004003.txt](A004003.txt) | the `%F`, `%o` and `%Y` lines contributed |
| [b004003.txt](b004003.txt) | $n = 0, \dots, 44$, printed alike by the generators [`b004003.rs`](b004003.rs), [`b004003.py`](b004003.py) and [`b004003.js`](b004003.js); identical to the published b-file of Alois P. Heinz on 1 November 2026; its terms up to $n = 44$ are checked against [`domino-rectangle-formula.js`](../../js/solvers/domino-rectangle-formula.js) |
| [A004003.gp](A004003.gp) | the program of the `%o` line |
| [b004003.rs](b004003.rs) | the generator of the b-file in Rust |
| [b004003.py](b004003.py) | the generator of the b-file in Python |
| [b004003.js](b004003.js) | the generator of the b-file in JavaScript |

## Notes

The b-file is not a contribution: it reproduces the published one from the formula. $a(45)$ has 1015 digits, more than a b-file line may hold.
