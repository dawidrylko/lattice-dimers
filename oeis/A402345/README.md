# A402345

[OEIS A402345](https://oeis.org/draft/A402345): number of domino tilings of the $2n \times 2n$ cylinder.

## Contribution

- The new entry with the b-file of $n = 0, \dots, 44$, submitted 17 November 2026.

## Status

Proposed 17 November 2026, revision #2 of the draft.

## Files

| file | content |
| --- | --- |
| [A402345.txt](A402345.txt) | the full entry text, reconstructed from the draft page |
| [b402345.txt](b402345.txt) | $n = 0, \dots, 44$, from [`b402345.js`](b402345.js); its terms up to $n = 10$ are checked against [`spec/cases/any-lattice-cylinder-torus-modular.json`](../../spec/cases/any-lattice-cylinder-torus-modular.json) |
| [A402345.gp](A402345.gp) | the program of the `%o` lines |
| [b402345.js](b402345.js) | the generator of the b-file |

## Notes

The cylinder $P_{2n} \times C_{2n}$ is planar, so Kasteleyn's method gives the count as a Pfaffian. With the opposite sign on the edges across the seam the Kasteleyn matrix splits over the circumference into one tridiagonal matrix per momentum $(2k-1)\pi/(2n)$, and $|\operatorname{Pf} K| = |\det K|^{1/2}$, after pairing the equal factors, is

$$a(n) = \prod_{j=1}^{n} \prod_{k=1}^{n} \left(4\cos^2\frac{j\pi}{2n+1} + 4\sin^2\frac{(2k-1)\pi}{2n}\right).$$

The factors are the values at the roots of $P$, the polynomial of [A004003](../A004003/A004003.gp) with $P(x^2) = U_{2n}(x/2)$, of $Q(x) = 2 T_n((x+2)/2) + 2$, so $a(n)$ is their resultant. `b402345.js` evaluates it in exact integers as the determinant of the Sylvester matrix by fraction-free elimination, $n = 0, \dots, 44$ in about 1 s. For even $n = 2m$, $T_{2m} + 1 = 2 T_m^2$ makes $Q$ a square and $a(n) = \operatorname{Res}(P, 2 T_m((x+2)/2))^2$.

$a(1), \dots, a(7)$ agree with the row transfer in exact integers, `node js/solvers/any-lattice-cylinder-torus-bigint.js -r 14 -c 14 --lattice square`, and $a(8), \dots, a(12)$ with the modular solver of the site, `node js/solvers/any-lattice-cylinder-torus-modular.js -r 24 -c 24 --lattice square -j 4`, which took 626 s for $a(12)$ on 17 November 2026. $a(2), \dots, a(8)$ are also terms of the published entries of $C_{2m} \times P_n$, [OEIS A006253](https://oeis.org/A006253) and [OEIS A028477](https://oeis.org/A028477) to [OEIS A028487](https://oeis.org/A028487), at $n = 2m$. $a(44)$, the last term, has 976 digits; $a(45)$ has 1021, more than the 1000 digits a b-file line may hold.
