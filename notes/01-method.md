# Method

This note describes how the project counts, numbers and samples two kinds of tilings of a board: domino tilings ([OEIS A004003](https://oeis.org/A004003)) and domicule tilings ([OEIS A239264](https://oeis.org/A239264), [A239273](https://oeis.org/A239273)) [6]. The computations behind every number are in the notebooks for [A004003](02-a004003.md), [A239273](03-a239273.md), [tori and cylinders](04-torus.md) and [diagonal pieces](05-diagonals.md).

## Problem

A domino covers two cells of the board that share a side. A tiling covers every cell exactly once, so it is a perfect matching of the grid graph whose vertices are the cells and whose edges join cells that share a side. A domicule may also cover two cells that share only a corner; its tilings are the perfect matchings of the king's graph, where every cell is joined to its eight neighbours.

The questions are the same for both pieces: how many tilings a board of $h \times w$ cells has, what the tiling with a given number looks like, and how to draw a tiling uniformly at random when there are too many to number.

## Domino tilings

### Closed form

Kasteleyn [1] and Fisher [2] found in 1961 that a $2n \times 2n$ board has

```math
a(n) = \prod_{j=1}^{n} \prod_{k=1}^{n} \left( 4\cos^2\frac{j\pi}{2n+1} + 4\cos^2\frac{k\pi}{2n+1} \right)
```

tilings. Evaluated with floating-point cosines the product loses its last digits from $12 \times 12$ on, so the formula solver evaluates it exactly. The numbers $x_j = 4\cos^2(j\pi/(2n+1))$, $j = 1, \dots, n$, are the roots of a monic integer polynomial $P$ of degree $n$, and the double product over $x_j + x_k$ is, up to sign, the resultant of $P(x)$ and $P(-x)$:

```math
a(n) = (-1)^n \mathrm{Res}\bigl(P(x), P(-x)\bigr), \qquad P(x^2) = U_{2n}(x/2)
```

where $U_{2n}$ is the Chebyshev polynomial of the second kind. The resultant is the determinant of the Sylvester matrix, an integer matrix of size $2n$, and fraction-free Bareiss elimination [3] keeps every intermediate value an integer. Neither square roots nor floating point are involved, and $20 \times 20$ takes milliseconds. The same formula is a two-line PARI/GP program in [`pari/A004003.gp`](../pari/A004003.gp).

### Transfer by rows

Two solvers count tilings directly. They scan the board row by row and keep, for every bitmask of the cells of the current row that a vertical domino from the row above already covers, the number of ways to reach it. A row is filled by a depth-first search that places horizontal dominoes in free pairs and starts vertical ones into the next row. The table has $2^{w}$ entries per row, so the cost grows with the shorter side and the solvers turn the board so that it is the row width. One solver keeps the counts as JavaScript numbers and is exact only while they stay below $2^{53}$ (up to $10 \times 10$); the other keeps them as `BigInt`.

### Numbering

To show tiling number $r$ without listing the ones before it, the gallery processes the board one cell at a time in row-major order. The state is the set of covered cells among the next $w$ cells, and a table of completion counts, `table[i][state]`, stores in how many ways the board can be finished from cell $i$ in that state. It has $(hw + 1) \cdot 2^{w}$ entries. Unranking walks the cells, tries a horizontal domino before a vertical one, and moves to the second choice after subtracting the number of tilings the first choice would cover. Every tiling of a board up to $18 \times 18$ can be shown this way in a browser.

### Sampling

The table for $20 \times 20$ would need several gigabytes, so the gallery samples instead. Domino tilings of a simply connected region form a distributive lattice under the rotation of two parallel dominoes in a $2 \times 2$ square, with a top and a bottom tiling. Monotone coupling from the past [4] runs the same random rotations from the top and the bottom tiling, starting further and further in the past, until both runs meet at time 0. The meeting point is an exactly uniform tiling. No table is needed.

## Domicule tilings

### Transfer by cells

A domicule tiling is counted with the same cell-by-cell scan. A free cell is matched with its right, down-left, down or down-right neighbour, so the farthest cell a state has to remember lies $w + 1$ places ahead and a state has $w + 2$ bits. The table is four times wider than the domino one. [`domiculeTilingSolver-BigInt.js`](../src/solvers/domiculeTilingSolver-BigInt.js) keeps the counts as `BigInt` and is the reference. The same scan is in [`pari/A239273.gp`](../pari/A239273.gp), where `T(h, w)` is A239264 and `a(n)` is A239273.

### Counting modulo primes

The scan only adds counts, so it can run modulo a prime $p < 2^{31}$: the sum of two residues stays below $2^{32}$ and fits a `Uint32Array` cell. [`domiculeTilingSolver-Modular.js`](../src/solvers/domiculeTilingSolver-Modular.js) counts modulo several primes in parallel worker threads and rebuilds the exact count with the Chinese remainder theorem. It needs enough primes for their product to exceed the count, and the Kahn-Lovász theorem, proved by Alon and Friedland [5], bounds the number of perfect matchings of a graph with degrees $d(v)$:

```math
\#\text{perfect matchings} \le \prod_{v} \bigl(d(v)!\bigr)^{1/(2d(v))}
```

Every prime contributes at least 30 bits, so $\lceil (\log_2 B + 1)/30 \rceil$ primes suffice for a bound $B$. One more prime checks the result: the rebuilt count must agree with the residue modulo that prime, and a mismatch stops the solver.

### Sampling with a Markov chain

Domicule tilings have no lattice structure like the domino rotations, so coupling from the past does not apply. Up to $16 \times 16$ the gallery numbers every tiling with a table of $(hw + 1) \cdot 2^{w+2}$ entries, which is exactly uniform when the number is drawn at random. For $18 \times 18$ and $20 \times 20$ it runs a Markov chain. A step picks a cell $a$ and one of its eight neighbours $c$; when the partner $b$ of $a$ and the partner $d$ of $c$ are neighbours too, the pairs $ab$ and $cd$ become $ac$ and $bd$. Each such move arises from four ordered choices, and so does the move back, so the proposal is symmetric and the uniform distribution is stationary. On every board small enough to check (up to $4 \times 5$) the moves connect all tilings. A chain run for finitely many steps is still only approximately uniform, and the gallery labels its samples as such.

### Numbering by diagonal pieces

The gallery can also number only the tilings with $k$ diagonal pieces. Every entry of the table then becomes a list, `table[i][state][r]`, of the completions with exactly $r \le k$ diagonal pieces, and unranking keeps the order of the full numbering. The gallery offers this up to $10 \times 10$.

A straight piece covers a black and a white cell of the chessboard, a diagonal piece two cells of one colour. So on the $2n \times 2n$ board the number of diagonal pieces is even. On a rectangle the count for every $k$ comes from [`domiculeDiagonalSolver-BigInt.js`](../src/solvers/domiculeDiagonalSolver-BigInt.js) or `data/`. On a cylinder or torus the gallery's own scan carries the same lists, one per rotation class, and its count for $k = 0$ is checked against the square lattice count of the same surface. The build checks that the counts add up to the number of tilings.

## Cylinders and tori

A cylinder has its left and right edges glued, a torus both pairs of opposite edges. The gallery numbers their tilings up to $10 \times 10$ with the cell-by-cell scan of [`periodicTilingSolver-Modular.js`](../src/solvers/periodicTilingSolver-Modular.js). A state has $w + 2$ bits. On the king's graph with $w \ge 3$ it has one more bit, for the piece from the first column to the last column of the next row. As in the solvers, each edge of a circumference 2 is a separate piece.

A torus tiling covers a set $S$ of first-row cells from the last row, and its scan starts from $S$ and must end with $S$. The tilings are ordered by $S$ and then by the scan. The tilings of $S$ and of its rotations are equally many, so one table per rotation class gives every count. The table of a single $S$ is rebuilt when a page needs it. The Random button draws a uniformly random number, so the sample is exact. A piece that crosses a glued edge is drawn cut there, half on each side of the board.

## Verification

Every count is checked in more than one independent way:

- the formula and BigInt domino solvers agree with each other and with A004003 up to $20 \times 20$, the Number solver up to $10 \times 10$, and the two domicule solvers with A239273 and the data section of A239264;
- the two periodic solvers agree with each other and with A335586, A253678, A281679 and A006253, and the two diagonal solvers with each other, with A004003 at $x = 0$ and with A239273 at $x = 1$;
- the four PARI/GP programs in `pari/` run in CI against the same data;
- unranking is checked against an enumeration of every tiling of the small boards, and every unranked tiling is checked for coverage;
- coupling from the past and the domicule chain are checked with chi-squared tests on $2 \times 2$ and $4 \times 4$;
- the modular solver checks every result against an extra prime.

The tests are in [`tests/`](../tests), the known values in [`data/`](../data).

## References

1. P. W. Kasteleyn. The statistics of dimers on a lattice. *Physica* 27(12):1209-1225, 1961. [doi:10.1016/0031-8914(61)90063-5](https://doi.org/10.1016/0031-8914%2861%2990063-5)
2. M. E. Fisher. Statistical mechanics of dimers on a plane lattice. *Physical Review* 124(6):1664-1672, 1961. [doi:10.1103/PhysRev.124.1664](https://doi.org/10.1103/PhysRev.124.1664)
3. E. H. Bareiss. Sylvester's identity and multistep integer-preserving Gaussian elimination. *Mathematics of Computation* 22(103):565-578, 1968. [doi:10.1090/S0025-5718-1968-0226829-0](https://doi.org/10.1090/S0025-5718-1968-0226829-0)
4. J. G. Propp and D. B. Wilson. Exact sampling with coupled Markov chains and applications to statistical mechanics. *Random Structures and Algorithms* 9(1-2):223-252, 1996. [doi:10.1002/(SICI)1098-2418(199608/09)9:1/2<223::AID-RSA14>3.0.CO;2-O](https://doi.org/10.1002/%28SICI%291098-2418%28199608/09%299:1/2%3C223::AID-RSA14%3E3.0.CO;2-O)
5. N. Alon and S. Friedland. The maximum number of perfect matchings in graphs with a given degree sequence. *Electronic Journal of Combinatorics* 15:N13, 2008. [doi:10.37236/888](https://doi.org/10.37236/888)
6. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [A004003](https://oeis.org/A004003), [A239264](https://oeis.org/A239264) and [A239273](https://oeis.org/A239273). [oeis.org](https://oeis.org)
