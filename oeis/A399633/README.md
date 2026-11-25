# A399633

[OEIS A399633](https://oeis.org/draft/A399633): number of tilings of the $2n \times 2n$ torus on the triangular lattice.

## Contribution

- The new entry with the b-file of $n = 0, \dots, 36$, drafted 25 November 2026.

## Status

Proposed 25 November 2026, revision #120 of the draft.

## Files

| file | content |
| --- | --- |
| [A399633.txt](A399633.txt) | the full entry text, reconstructed from the draft page, with the link planned for the upload of the b-file as `b399633_1.txt` |
| [b399633.txt](b399633.txt) | $n = 0, \dots, 36$, printed alike by the generators [`b399633.rs`](b399633.rs), [`b399633.py`](b399633.py) and [`b399633.js`](b399633.js); its terms up to $n = 8$ are checked against [`spec/cases/any-lattice-cylinder-torus-modular.json`](../../spec/cases/any-lattice-cylinder-torus-modular.json), and the [triangular tori notebook](../../notes/triangular-lattice/03-tori.md) checks those up to $n = 10$ and at $n = 20$ against the Pfaffian solver |
| [A399633.gp](A399633.gp) | the program of the `%o` lines |
| [b399633.rs](b399633.rs) | the generator of the b-file in Rust |
| [b399633.py](b399633.py) | the generator of the b-file in Python |
| [b399633.js](b399633.js) | the generator of the b-file in JavaScript |

## Notes

The Kasteleyn matrix is that of [A402693](../A402693/README.md), closed into a torus. Its four Pfaffians $\mathrm{Pf}_{ab}$ keep or negate the edges across each of the two seams. By Kasteleyn's theorem for the torus, $a(n)$ is half of a sum of the four with exactly one of them negated. With this orientation the negated one is $\mathrm{Pf}_{00}$ for even $n$ and $\mathrm{Pf}_{10}$ for odd $n$, and it is the only one with the other sign, so $a(n) = (|\mathrm{Pf}_{00}| + |\mathrm{Pf}_{01}| + |\mathrm{Pf}_{10}| + |\mathrm{Pf}_{11}|)/2$. This was observed for every $n \le 40$, not proved. The orientation repeats every two rows, which fits a pattern set by $n$ modulo 2. The terms up to $n = 8$ agree with the transfer-matrix solver, and those up to $n = 10$ and at $n = 20$ with the Pfaffian solver of [`js/solvers/any-lattice-cylinder-torus-pfaffian.js`](../../js/solvers/any-lattice-cylinder-torus-pfaffian.js), which is a separate program.

The generators take the Fourier transform along the second seam modulo primes $p \equiv 1 \pmod{4n}$. It splits the matrix into $2n \times 2n$ blocks, one for each root $z$ of $z^{2n} = \pm 1$. A block pairs with the block of $1/z$ and gives a determinant; a block with $z = \pm 1$ pairs with itself and gives a Pfaffian. Dividing by the determinant of the transform, a power of a Vandermonde determinant, gives each $\mathrm{Pf}_{ab}$ modulo $p$, and the Chinese remainder theorem rebuilds it with a sign, checked against one more prime. The number of primes comes from the bound of Kahn and Lovász on the perfect matchings of a 6-regular graph, with 8 bits to spare for $n = 1$, where parallel edges count twice.

The PARI program builds the four matrices densely and takes $|\mathrm{Pf}_{ab}|$ as the square root of $|\det|$.

Each term $|\mathrm{Pf}_{ab}|$ is at most $a(n)$, and $a(n)$ is at most twice the largest of them. With the bulk free energy of A247548 this gives the limit in the FORMULA line. The asymptotic $a(n) \sim 2 \cdot \mathrm{A247548}^{2n^2}$ is a conjecture checked on the b-file: the relative error falls from $8 \cdot 10^{-2}$ at $n = 1$ to $4 \cdot 10^{-8}$ at $n = 6$, and from about $n = 10$ on it stays at the precision of the floating-point check.
