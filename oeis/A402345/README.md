# A402345

[OEIS A402345](https://oeis.org/A402345): number of domino tilings of the $2n \times 2n$ cylinder.

## Contribution

- The new entry with the b-file of $n = 0, \dots, 44$, submitted 17 November 2026.

## Status

Approved 17 November 2026, revision #12.

## Files

| file | content |
| --- | --- |
| [A402345.txt](A402345.txt) | the full entry text as published, with the data on one `%S` line and without the keyword `new` |
| [b402345.txt](b402345.txt) | $n = 0, \dots, 44$, printed alike by the generators [`b402345.rs`](b402345.rs), [`b402345.py`](b402345.py) and [`b402345.js`](b402345.js); identical to the b-file the OEIS installed on 17 November 2026; its terms up to $n = 10$ are checked against [`spec/cases/any-lattice-cylinder-torus-modular.json`](../../spec/cases/any-lattice-cylinder-torus-modular.json) |
| [A402345.gp](A402345.gp) | the program of the `%o` lines |
| [b402345.rs](b402345.rs) | the generator of the b-file in Rust |
| [b402345.py](b402345.py) | the generator of the b-file in Python |
| [b402345.js](b402345.js) | the generator of the b-file in JavaScript |

## Notes

The cylinder $P_{2n} \times C_{2n}$ is planar, so Kasteleyn's method gives the count as a Pfaffian. With the opposite sign on the edges across the seam the Kasteleyn matrix splits over the circumference into one tridiagonal matrix per momentum $(2k-1)\pi/(2n)$, and $|\mathrm{Pf} K| = |\det K|^{1/2}$, after pairing the equal factors, is

$$a(n) = \prod_{j=1}^{n} \prod_{k=1}^{n} \left(4\cos^2\frac{j\pi}{2n+1} + 4\sin^2\frac{(2k-1)\pi}{2n}\right).$$

The factors are the values at the roots of $P$, the polynomial of [A004003](../A004003/A004003.gp) with $P(x^2) = U_{2n}(x/2)$, of $Q(x) = 2 T_n((x+2)/2) + 2$, so $a(n)$ is their resultant. The three generators run the same method in Rust, Python and JavaScript, each in its own code: they evaluate it in exact integers as the determinant of the Sylvester matrix by fraction-free elimination. `rust/target/release/b402345 0 44` (after `cargo build --release` in `rust/`), `python3 -I oeis/A402345/b402345.py 0 44` and `node oeis/A402345/b402345.js 0 44` each print the whole b-file, in 1.4 s, 1.5 s and 0.6 s on an Apple M4 on 17 November 2026, so [`spec/limits.json`](../../spec/limits.json) gives each of the three the last term of the b-file, and CI compares their whole output with the b-file. For even $n = 2m$, $T_{2m} + 1 = 2 T_m^2$ makes $Q$ a square and $a(n) = \mathrm{Res}(P, 2 T_m((x+2)/2))^2$.

$a(1), \dots, a(7)$ agree with the row transfer in exact integers, which for $a(7)$ is `node js/solvers/any-lattice-cylinder-torus-bigint.js -r 14 -c 14 --lattice square`. $a(8), \dots, a(12)$ agree with the modular solver of the site; for $a(12)$ it is `node js/solvers/any-lattice-cylinder-torus-modular.js -r 24 -c 24 --lattice square -j 4`, which took 626 s on 17 November 2026. $a(2), \dots, a(8)$ are also the terms $n = 2m$ of the published entries of $C_{2m} \times P_n$: [OEIS A006253](https://oeis.org/A006253), [OEIS A028477](https://oeis.org/A028477), [OEIS A028479](https://oeis.org/A028479), [OEIS A028481](https://oeis.org/A028481), [OEIS A028483](https://oeis.org/A028483), [OEIS A028485](https://oeis.org/A028485) and, in its b-file, [OEIS A028487](https://oeis.org/A028487). $a(44)$, the last term, has 976 digits; $a(45)$ has 1021, more than the 1000 digits a b-file line may hold.

The b-file was uploaded as `b402345_1.txt` and installed as `b402345.txt` on approval. An editor added the asymptotic formula and the Mathematica program (revisions #7 and #8) before the entry was approved at revision #11. The formula agrees with the b-file, with a relative error of about $0.26/n$, which is $0.0059$ at $n = 44$. The Mathematica program was not run here.
