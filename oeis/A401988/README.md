# A401988

[OEIS A401988](https://oeis.org/draft/A401988): number of tilings of the $2n \times 2n$ board on the triangular lattice.

## Contribution

- The new entry with the b-file of $n = 0, \dots, 36$, submitted 11 November 2026.

## Status

Proposed 11 November 2026, revision #4 of the draft.

## Files

| file | content |
| --- | --- |
| [A401988.txt](A401988.txt) | the full entry text, reconstructed from the draft page |
| [b401988.txt](b401988.txt) | $n = 0, \dots, 36$, from [`b401988.js`](b401988.js); identical to the file uploaded with the draft; its terms up to $n = 11$ are checked against [`spec/cases/all-lattices-rectangle-modular.json`](../../spec/cases/all-lattices-rectangle-modular.json) |
| [A401988.gp](A401988.gp) | the program of the `%o` lines |
| [b401988.js](b401988.js) | the generator of the b-file |

## Notes

`b401988.js` computes $\det K$ of the Kasteleyn matrix of the [PARI program](A401988.gp) modulo primes below $2^{26}$ by banded elimination, rebuilds it with the Chinese remainder theorem and takes its square root, which must be exact. `node oeis/A401988/b401988.js 0 36 > oeis/A401988/b401988.txt` rebuilds the b-file; $a(36)$ alone took 434 s on one core of an Apple M4 on 11 November 2026, so CI checks only the terms that `spec/cases/` holds, up to the $22 \times 22$ board. The terms up to $n = 11$ also agree with a dense determinant and with a transfer matrix in exact integers. $a(36)$ has 940 digits; $a(37)$ would pass the 1000 digits a b-file line may hold.

The b-file was uploaded as `b401988_1.txt`.
