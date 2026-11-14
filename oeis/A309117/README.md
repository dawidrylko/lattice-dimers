# A309117

[OEIS A309117](https://oeis.org/A309117): number of perfect matchings of the triangular lattice on the free strip of width 4 and length $n$.

## Contribution

- The b-file of $n = 0, \dots, 1000$, the first b-file of the entry, and the cross-reference to A401988, submitted 11 November 2026.

## Status

Approved 13 November 2026, revision #21.

## Files

| file | content |
| --- | --- |
| [A309117.txt](A309117.txt) | the `%H` and `%Y` lines contributed |
| [b309117.txt](b309117.txt) | $n = 0, \dots, 1000$, from [`b309117.js`](b309117.js); identical to the b-file the OEIS installed on 13 November 2026; its terms up to $n = 60$ are checked against [`zex_tri_free_m4_K60.json`](../../research/king-entropy/data/zex/zex_tri_free_m4_K60.json) |
| [b309117.js](b309117.js) | the generator of the b-file |

## Notes

`b309117.js` counts the strip column by column with a transfer matrix over the 16 sets of covered cells of a column of 4, in exact integers. `node oeis/A309117/b309117.js 0 1000 > oeis/A309117/b309117.txt` rebuilds the b-file in under a second. The terms also satisfy the recurrence of the generating function in the entry for $n = 8, \dots, 1000$. $a(1000)$ has 570 digits.
