# A399633

[OEIS A399633](https://oeis.org/draft/A399633): number of tilings of the $2n \times 2n$ torus on the triangular lattice.

## Contribution

- The new entry with the b-file of $n = 0, \dots, 36$, drafted 25 November 2026.

## Status

Proposed 25 November 2026, revision #124 of the draft.

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

A399633 was a recycled number. Revision #119 allocated it for this entry, so the history of the draft counts on from the sequence it held before, revision #120 is the first save of this entry, and revision #124 submits it.

The Kasteleyn matrix is that of [A402693](../A402693/README.md), closed into a torus. Its four Pfaffians $\mathrm{Pf}_{ab}$ keep or negate the edges across each of the two seams. Half of a sum of the four with exactly one of them negated counts every tiling once, with a sign of $+1$ or $-1$, so each such half sum is at most $a(n)$ in absolute value, and by Kasteleyn's theorem for the torus one of the four equals $\pm a(n)$. The generators therefore return the largest of the four in absolute value, as the Pfaffian solver [`any-lattice-cylinder-torus-pfaffian.js`](../../js/solvers/any-lattice-cylinder-torus-pfaffian.js) does.

With this orientation the negated Pfaffian is $\mathrm{Pf}_{00}$ for even $n$ and $\mathrm{Pf}_{10}$ for odd $n$, and for every $n \le 40$ it is the only one whose sign differs from the other three. On these terms $a(n)$ is therefore also $(|\mathrm{Pf}_{00}| + |\mathrm{Pf}_{01}| + |\mathrm{Pf}_{10}| + |\mathrm{Pf}_{11}|)/2$. That second form is observed, not proved, and nothing here relies on it. The [PARI program](A399633.gp) takes the largest half sum in absolute value, as the generators do. PARI has no Pfaffian of its own, so the program computes it by eliminating two rows at a time, exactly over the rationals.

The generators take the Fourier transform along the second seam modulo primes $p \equiv 1 \pmod{4n}$. It splits the matrix into $2n \times 2n$ blocks, one for each root $z$ of $z^{2n} = \pm 1$. A block pairs with the block of $1/z$ and gives a determinant. A block with $z = \pm 1$ pairs with itself and gives a Pfaffian. Dividing by the determinant of the transform, a power of a Vandermonde determinant, gives each $\mathrm{Pf}_{ab}$ modulo $p$, and the Chinese remainder theorem rebuilds it with its sign. One more prime checks the result.

The number of primes comes from the Kahn-Lovasz bound on the perfect matchings of a 6-regular graph, plus 8 bits. For $n = 1$ the bound does not hold, since the parallel edges count twice: it gives 8.96, while $a(1) = 12$. The 8 added bits cover that.

The terms up to $n = 8$ agree with the transfer-matrix solver through `spec/cases/`, and those up to $n = 10$ and at $n = 20$ with the Pfaffian solver, a separate program. CI runs the Rust generator over the whole b-file and the Python and JavaScript ones up to the last terms of [`spec/limits.json`](../../spec/limits.json). On 25 November 2026, on an Apple M4, `b399633` printed the whole b-file in 0.8 s, `b399633.js` in 51 s on one core and `b399633.py` in about four minutes. $a(36)$, the last term, has 966 digits. $a(37)$ has 1020, more than the 1000 digits a b-file line may hold.

Each $|\mathrm{Pf}_{ab}|$ is at most $a(n)$, and $a(n)$ is at most twice the largest of them. With the bulk free energy of A247548 this gives the limit in the FORMULA line. The asymptotic $a(n) \sim 2 \cdot \mathrm{A247548}^{2n^2}$ is a conjecture checked on the b-file. Its relative error falls from $8 \cdot 10^{-2}$ at $n = 1$ to $4 \cdot 10^{-8}$ at $n = 6$, and from about $n = 10$ on it stays at the precision of the floating-point check.
