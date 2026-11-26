# Diagonal pieces: triangular lattice tilings of the 2n × 2n torus by their count

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/triangular-lattice/tori-by-diagonal-pieces.html) has the results. It sorts the tilings of the triangular lattice on tori by the number of diagonal pieces, as the [rectangles notebook](04-rectangles-by-diagonal-pieces.md) does on the board with no glued edge. The tilings themselves are counted in the [tori notebook](03-tori.md).

## The problem

On a torus both pairs of opposite edges of the board are glued, so a diagonal piece may cross the seam between the last and the first column, the seam between the last and the first row, or both at a corner. The drawing shows the first tiling of the $8 \times 8$ torus in the gallery's numbering for $k = 0, 8, 16$ and $32$ diagonal pieces, with the straight pieces greyed out.

```js run
const { drawTilings } = require('./site/notes.js');
const counts = [0, 8, 16, 32];
const svgs = counts.flatMap(k => drawTilings({ rowCount: 8, colCount: 8, lattice: 'triangular', surface: 'torus', diagonals: k, ranks: [0] }).svgs);

figure(svgs, 'Tilings of the triangular lattice on the 8 × 8 torus with k = 0, 8, 16 and 32 diagonal pieces.', { highlight: true });
```

Give every diagonal piece the weight $x$, as in the [rectangles notebook](04-rectangles-by-diagonal-pieces.md#the-problem). The weighted count is the polynomial $P(x) = \sum_k T(k)\, x^k$, where $T(k)$ counts the tilings with $k$ diagonal pieces. At $x = 0$ it is the domino count of the same torus ([dominoes on tori](../dominoes/03-tori.md)) and at $x = 1$ its count on the triangular lattice ([triangular lattice on tori](03-tori.md)). This is the dimer model of Fendley, Moessner and Sondhi [1] with diagonal dimers of fugacity $x$, on a torus.

## The Modular solver

[`any-lattice-cylinder-torus-polynomial-modular.js`](../../js/solvers/any-lattice-cylinder-torus-polynomial-modular.js) runs the cell by cell transfer of the [tori notebook](03-tori.md#the-modular-solver) with a block of coefficients in every state, one prime per worker thread, and `--lattice triangular` chooses this lattice. A torus runs only the smallest rotation of every set of cells covered from the last row and counts it once per rotation, and its shorter side is taken as the circumference. [`any-lattice-cylinder-torus-polynomial-modular.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-polynomial-modular.rs) and [`any_lattice_cylinder_torus_polynomial_modular.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_polynomial_modular.py) count the same polynomial. The same solver counts the [cylinders](05-cylinders-by-diagonal-pieces.md).

```math
r_i^{(k)} \equiv \bigl[x^k\bigr] \sum_{S} \bigl(T_{hw-1}(x) \cdots T_1(x)\, T_0(x)\bigr)_{S,S} \pmod{p_i}, \qquad T(k) = \sum_{i=1}^{m} r_i^{(k)}\, M_i \bigl(M_i^{-1} \bmod p_i\bigr) \bmod M, \qquad M_i = \frac{M}{p_i}, \quad M = p_1 \cdots p_m
```

The sum runs over the sets $S$ of cells of the first row covered from the last row, and the solver runs one set per rotation class and counts it once per rotation. The matrix $T_c(x)$ is the step over the cell $c$ of the [tori notebook](03-tori.md#the-modular-solver) on states of the next $w + 2$ cells, with the weight $x$ on the move to the cell below and to the right, the one diagonal piece of the lattice, where the row after the last is the first. Its entries are polynomials in $x$ with coefficients modulo the prime $p_i$, $[x^k]$ takes the coefficient of $x^k$, and $T(k)$ is the number of tilings with $k$ diagonal pieces. One more prime $p_{m+1}$ checks every coefficient.

## The BigInt solver

[`any-lattice-cylinder-torus-polynomial-bigint.js`](../../js/solvers/any-lattice-cylinder-torus-polynomial-bigint.js) runs the row transfer of the [tori notebook](03-tori.md#the-bigint-solver) and counts a piece sent to the next row one column to the right as diagonal. A torus is the trace of the transfer, with the same rotations as the Modular solver. Its Rust and Python implementations are [`any-lattice-cylinder-torus-polynomial-bigint.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-polynomial-bigint.rs) and [`any_lattice_cylinder_torus_polynomial_bigint.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_polynomial_bigint.py). On the king's graph both solvers give the polynomial of the [domicule tori](../domicules/06-tori-by-diagonal-pieces.md).

```math
P(x) = \mathrm{tr}\, R(x)^{h}, \qquad R(x)_{S,S'} = \sum x^{\#\{c \,:\, \delta_c = 1\}}
```

The sum runs over the coverings of the cells $\{0, \dots, w - 1\} \setminus S$ of a row by pairs $\{c, c + 1\}$ and by sends $c \to c + \delta_c$ with $\delta_c \in \{0, 1\}$ whose targets are $S'$, with the cells numbered modulo $w$, so the pair $\{w - 1, 0\}$ crosses the seam. A send with $\delta_c = 0$ goes straight down and a send with $\delta_c = 1$ goes down to the right, which is the diagonal piece, so every diagonal piece carries the weight $x$; the row after the last is the first. The coefficient of $x^k$ in $P$ is $T(k)$, the number of tilings with $k$ diagonal pieces.

## Numbering

The gallery can also number only the tilings of a torus with $k$ diagonal pieces. The scan of the [torus numbering](03-tori.md#numbering) then carries a list of counts by the number of diagonal pieces in every entry, one per rotation class, and unranking keeps the order of the full numbering. The gallery offers this up to $10 \times 10$. The build checks the scan's count for $k = 0$ against the domino count of the same torus and checks that the counts add up to the number of tilings.

## The counts

On a torus with even sides the chessboard colouring goes on across both seams, so $k$ is even. The $n \times n$ torus has $2^n$ tilings with only diagonal pieces: the cells with $r - c \equiv d \pmod n$ form a cycle of $n$ cells joined by diagonals, and a cycle with an even number of cells has two perfect matchings. On the $2 \times 2$ torus each such cycle is a pair of cells joined by two edges, and each edge counts as a separate piece, as in the [tori notebook](03-tori.md#the-counts).

The map $(r, c) \mapsto (c, c - r)$, both coordinates taken modulo $n$, is a bijection of the cells of the $n \times n$ torus that sends every horizontal piece to a diagonal one, every diagonal piece to a vertical one and every vertical piece to a horizontal one. The torus therefore has as many tilings with $k$ diagonal pieces as with $k$ horizontal ones, and as many as with $k$ vertical ones. In a uniformly random tiling the mean numbers of horizontal, vertical and diagonal pieces are then equal, and since they add up to the $n^2/2$ pieces of a tiling, each is $n^2/6$: on average a third of the pieces are diagonal.

The cell below checks the gallery's scan against the stored counts of the solvers on every board both count. The table gives, for each $n \times n$ torus in `spec/cases/`, how many values of $k$ have a tiling, the $k$ of the largest term and the mean share of diagonal pieces among the $n^2/2$ pieces. The cell stops the build when a torus has a tiling with an odd $k$, when it does not have $2^n$ tilings with only diagonal pieces, or when the mean share is not exactly $1/3$. It also compares the sum of the counts with the count of the Pfaffian solver on the triangular lattice and the count for $k = 0$ with its count on the square lattice, and the last column names what each row was compared with. The chart draws the mean share against the side of the torus, with the dashed line at $1/3$. When the OEIS was searched by the terms of the $4 \times 4$ torus on 17 November 2026, it had no such row.

```js run
const trim = counts => counts.slice(0, counts.findLastIndex(c => c !== '0') + 1).join();
const stored = require('./js/core/cases')
  .testCasesOf('any-lattice-cylinder-torus-polynomial-modular')
  .filter(({ lattice, rowCount, colCount, torus }) => lattice === 'triangular' && torus && rowCount === colCount && rowCount >= 2 && rowCount % 2 === 0)
  .map(({ rowCount, expectedResult }) => ({ side: rowCount, diagonals: expectedResult.split(',') }))
  .sort((a, b) => a.side - b.side);
const gallery = nb.context.cylinderTorusDiagonals.filter(({ pieces, surface, side }) => pieces === 'triangular' && surface === 'torus' && side >= 2);
const both = gallery.filter(g => stored.some(s => s.side === g.side));
const differing = both.filter(g => trim(stored.find(s => s.side === g.side).diagonals) !== trim(g.diagonals));

if (differing.length) {
  throw new Error(`The gallery and the solvers differ on ${differing.map(({ side }) => `the ${side}x${side} torus`).join(', ')}.`);
}

print(`The gallery's scan agrees with the solvers on the ${both.length} tori both count.`);

const pfaffian = require('./js/solvers/any-lattice-cylinder-torus-pfaffian.js');
const rows = [];
const shares = [];

for (const { side, diagonals } of stored) {
  const counts = diagonals.map(BigInt);
  const total = counts.reduce((sum, c) => sum + c, 0n);
  const board = { rowCount: side, colCount: side, torus: true };
  const problems = [
    counts.some((c, k) => k % 2 === 1 && c !== 0n) && 'an odd number of diagonal pieces',
    counts.at(-1) !== 2n ** BigInt(side) && `${counts.at(-1)} tilings with only diagonal pieces`,
    6n * counts.reduce((sum, c, k) => sum + BigInt(k) * c, 0n) !== BigInt(side * side) * total && 'a mean share of diagonal pieces other than 1/3',
    total !== (await pfaffian.calculateTotalTilingCombinations({ ...board, lattice: 'triangular' })) && 'a sum that is not the count of the Pfaffian solver',
    counts[0] !== (await pfaffian.calculateTotalTilingCombinations({ ...board, lattice: 'square' })) && 'a count for k = 0 that is not the square lattice count of the Pfaffian solver',
  ].filter(Boolean);

  if (problems.length) {
    throw new Error(`The ${side}x${side} torus: ${problems.join(', ')}`);
  }

  const peak = counts.indexOf(counts.reduce((max, c) => (c > max ? c : max), 0n));
  const scale = 10n ** 15n;
  const mean = Number((counts.reduce((sum, c, k) => sum + BigInt(k) * c, 0n) * scale) / total) / Number(scale);
  const share = mean / ((side * side) / 2);

  shares.push([side, share]);
  rows.push([
    `${side}×${side}`,
    counts.filter(c => c > 0n).length,
    peak,
    share.toFixed(6),
    both.some(g => g.side === side) ? "the gallery's scan, Pfaffian solver" : 'Pfaffian solver',
  ]);
}

table(['board', 'k with a tiling', 'k of the largest term', 'share of diagonal pieces', 'checked against'], rows);

chart({
  title: 'The mean share of diagonal pieces in a tiling of the n × n torus against its side',
  x: { label: 'side n of the torus', min: 0, max: 14, ticks: [0, 2, 4, 6, 8, 10, 12, 14] },
  y: { label: 'share of diagonal pieces', min: 0.3, max: 0.37, ticks: [0.3, 0.32, 0.34, 0.36] },
  reference: { y: 1 / 3 },
  series: [{ name: 'mean share', color: 'var(--ordinal-1)', points: shares }],
  describe: ([side, share]) => `${side}×${side} torus, mean share of diagonal pieces ${share.toFixed(6)}`,
});

print('The first rows:');

for (const { side, diagonals } of stored.slice(0, 4)) {
  print(`${side}×${side} torus, k = 0, 1, 2, ...: ${diagonals.join(', ')}`);
}
```

## Verification

The two solvers agree with each other in Rust, Python and JavaScript, with the domino count of `any-lattice-cylinder-torus-bigint` at $k = 0$ and with its triangular count summed over $k$, on the tori of up to 20 cells with every tiling listed one by one, and on the king's graph with the domicule polynomial. The tests are in [`harness/`](../../harness), [`js/test/`](../../js/test), [`python/tests/`](../../python/tests) and [`rust/tests/`](../../rust/tests), the known values in [`spec/cases/`](../../spec/cases).

## The OEIS entries

The OEIS has no entry for these counts.

## References

1. P. Fendley, R. Moessner and S. L. Sondhi. Classical dimers on the triangular lattice. *Physical Review B* 66(21):214513, 2002. [doi:10.1103/PhysRevB.66.214513](https://doi.org/10.1103/PhysRevB.66.214513)
