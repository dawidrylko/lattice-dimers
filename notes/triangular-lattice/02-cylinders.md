# Triangular lattice: tilings of cylinders and of the 2n × 2n cylinder

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/triangular-lattice/cylinders.html) has the results. It counts the perfect matchings of the triangular lattice on cylinders, boards of circumference $w$ and height $h$ whose left and right edges are glued and which are open at the top and the bottom. The project counts this lattice for comparison with [dominoes](../dominoes/02-cylinders.md) and [domicules](../domicules/02-cylinders.md) on the same boards. The [rectangles notebook](01-rectangles.md) counts it on boards with no glued edge, and the [tori notebook](03-tori.md) glues both pairs of edges.

## The problem

The triangular lattice [1] is the square lattice with one diagonal in every square face, here the one that runs down to the right. A tiling uses dominoes and diagonal pieces in that one direction, so it lies between a domino tiling, which has no diagonal piece, and a domicule tiling, which may use both diagonals. On a cylinder a piece may cross the seam between the last and the first column. The drawings mark the glued edges and draw a piece that crosses the seam cut, with one half on each side. They show 4 tilings of the cylinder of circumference 8 and height 8, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 8, colCount: 8, lattice: 'triangular', surface: 'cylinder', spread: 4 });

figure(svgs, `4 of the ${total} tilings of the triangular lattice on the cylinder of circumference 8 and height 8.`);
```

## The Pfaffian solver

[`any-lattice-cylinder-torus-pfaffian.js`](../../js/solvers/any-lattice-cylinder-torus-pfaffian.js) counts in polynomial time: it eliminates a matrix of $wh \times wh$ entries. The cylinder is a planar graph, so by Kasteleyn's theorem [2] a sign on every edge makes the number of tilings the absolute value of the Pfaffian of a skew-symmetric matrix. The solver computes two Pfaffians, one with the edges across the seam as they are and one with their signs flipped. One of the two is the count up to sign. The other is the difference between the tilings with an even and with an odd number of pieces across the seam, so the solver returns the larger absolute value. Inside the board it uses the signs of [`A401988.gp`](../../oeis/A401988/A401988.gp), alternating by rows or, when the number of rows is odd, by columns.

```math
a = \max\bigl( \lvert \mathrm{Pf}\, K_0 \rvert,\ \lvert \mathrm{Pf}\, K_1 \rvert \bigr)
```

Here $K_0$ is the skew-symmetric matrix of the edge signs of the board, $wh \times wh$ entries with $K_{uv} = -K_{vu} = \pm 1$ on every edge $uv$, and $K_1$ is $K_0$ with the signs of the edges across the seam flipped. $\mathrm{Pf}$ is the Pfaffian, and $a$ is the number of tilings.

The solver counts modulo primes. They are below $2^{31}$ in Rust and Python and below $2^{26}$ in JavaScript, where a sum of two products of residues has to stay exact in a double. The Chinese remainder theorem rebuilds the count, and one more prime checks it.

A board has at most 1600 cells. That is a limit of memory, because every thread keeps a whole matrix. The same algorithm is in Rust, [`any-lattice-cylinder-torus-pfaffian.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-pfaffian.rs), and in Python, [`any_lattice_cylinder_torus_pfaffian.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_pfaffian.py).

## The Modular solver

[`any-lattice-cylinder-torus-modular.js`](../../js/solvers/any-lattice-cylinder-torus-modular.js) goes cell by cell, from the empty state to the empty state, with a state of the next $w + 2$ cells. It counts modulo primes below $2^{31}$, the Chinese remainder theorem rebuilds the count, and one more prime checks it. The same algorithm is in Rust, [`any-lattice-cylinder-torus-modular.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-modular.rs), and in Python, [`any_lattice_cylinder_torus_modular.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_modular.py). The Rust implementation also counts modulo [wide primes](../domicules/01-rectangles.md#wide-primes), the primes below $2^{61}$.

```math
r_i \equiv \bigl(T_{hw-1} \cdots T_1 T_0\bigr)_{\emptyset,\emptyset} \pmod{p_i}, \qquad a = \sum_{i=1}^{m} r_i\, M_i \bigl(M_i^{-1} \bmod p_i\bigr) \bmod M, \qquad M_i = \frac{M}{p_i}, \quad M = p_1 \cdots p_m
```

The matrix $T_c$ is the step over the cell $c$ of the [rectangles notebook](01-rectangles.md#the-bigint-solver), with a state $s$ of the next $w + 2$ cells and the moves $M_c$ of a free cell $c$ in column $j$: the next cell of the row when $j < w - 1$, the last cell of the row when $j = 0$, and, in every row but the last, the cell below and the cell below and to the right, which in the last column is the first cell of the next row. The entries are taken modulo the prime $p_i$, and one more prime checks the result.

## The BigInt solver

[`any-lattice-cylinder-torus-bigint.js`](../../js/solvers/any-lattice-cylinder-torus-bigint.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row, and the cylinder count is the entry of the $h$-th power of this row transfer matrix from the empty row to the empty row. The same algorithm is in Rust, [`any-lattice-cylinder-torus-bigint.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-bigint.rs), and in Python, [`any_lattice_cylinder_torus_bigint.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_bigint.py).

```math
a = \bigl(R^{h}\bigr)_{\emptyset,\emptyset}, \qquad R_{S,S'} = \#\bigl\{\text{coverings of the cells } \{0, \dots, w - 1\} \setminus S \text{ by pairs } \{c, c + 1\} \text{ and by sends } c \to c + \delta,\ \delta \in \{0, 1\},\ \text{whose targets are } S' \bigr\}
```

The sets $S$ and $S'$ are sets of columns, and the cells are numbered modulo $w$, so the pair $\{w - 1, 0\}$ crosses the seam. A send $c \to c + \delta$ puts the cell $c$ on the cell of the next row in the column $c + \delta$, straight down for $\delta = 0$ and down to the right for $\delta = 1$, and the targets of all sends are distinct. $R_{S,S'}$ counts the ways to finish a row whose cells in $S$ are already covered from the row below, and $S'$ is the set of the cells of the next row they cover.

## Numbering

The gallery numbers the tilings of the cylinders up to $10 \times 10$ with the cell-by-cell scan of the modular solver, as it numbers the [domino tilings of cylinders](../dominoes/02-cylinders.md#numbering). The Random button draws a uniformly random number, so the sample is exact.

## The counts

Three solvers count the same boards by different methods. The table comes from the `BigInt` solver, and the cell below compares its last column, $h = 8$, with the counts of the modular and the Pfaffian solver. It also compares the row $w = 2$ with the recurrence of [OEIS A002605](https://oeis.org/A002605), and the square boards $w = h$ with the b-file [`oeis/A402693/b402693.txt`](../../oeis/A402693/b402693.txt) of the draft [OEIS A402693](https://oeis.org/draft/A402693). The last column names, row by row, what the counts of the row were compared with.

The chart draws the entropy per cell, $\ln a / (2n)^2$, of the $2n \times 2n$ cylinder against its side, from $2 \times 2$ to $20 \times 20$ with the Pfaffian solver, each count compared with the b-file. The dashed line is the entropy per site $s$ of the triangular lattice [1], read from `research/king-entropy/out/out_validate.txt`. The $2 \times 2$ cylinder lies above $s$, and from $4 \times 4$ on the ratio rises towards $s$ from below on these boards.

Circumference 2 has multiple edges, because on a ring of two cells a cell meets its right and its left neighbour in the same cell. Each edge counts as a separate piece, so one row of two cells has 2 tilings. A row of odd circumference has an odd number of cells, so the counts vanish at odd heights.

```js run
const { calculateTotalTilingCombinations } = require('./js/solvers/any-lattice-cylinder-torus-bigint.js');
const modular = require('./js/solvers/any-lattice-cylinder-torus-modular.js');
const pfaffian = require('./js/solvers/any-lattice-cylinder-torus-pfaffian.js');

nb.heights = [0, 1, 2, 3, 4, 5, 6, 7, 8];
nb.widths = [2, 3, 4, 5, 6, 7, 8];
nb.count = (w, h) => calculateTotalTilingCombinations({ rowCount: h, colCount: w, lattice: 'triangular' });

const { root } = nb.context;
const bFile = require('fs')
  .readFileSync(require('path').join(root, 'oeis/A402693/b402693.txt'), 'utf-8')
  .trim()
  .split('\n')
  .map(line => BigInt(line.split(' ')[1]));
const checked = Object.fromEntries(nb.widths.map(w => [w, ['Modular and Pfaffian solver (h = 8)']]));
const terms = [0n, 1n];

while (terms.length <= nb.heights.length) {
  terms.push(2n * terms.at(-1) + 2n * terms.at(-2));
}

for (const w of nb.widths) {
  const board = { rowCount: 8, colCount: w, lattice: 'triangular' };
  const checks = [await modular.calculateTotalTilingCombinations(board), await pfaffian.calculateTotalTilingCombinations(board)];

  if (checks.some(check => check !== nb.count(w, 8))) {
    throw new Error(`the three solvers differ on the cylinder of circumference ${w} and height 8`);
  }

  if (w % 2 === 0 && nb.count(w, w) !== bFile[w / 2]) {
    throw new Error(`the ${w}×${w} cylinder differs from the b-file of A402693`);
  }

  if (w % 2 === 0) {
    checked[w].push(`A402693 (h = ${w})`);
  }
}

if (terms.slice(1).some((term, h) => nb.count(2, h) !== term)) {
  throw new Error('the cylinders of circumference 2 differ from A002605');
}

checked[2].unshift('A002605');

table(
  ['w \\ h', ...nb.heights.map(String), 'checked against'],
  nb.widths.map(w => [String(w), ...nb.heights.map(h => String(nb.count(w, h))), checked[w].join(', ')]),
);

const validate = require('fs').readFileSync(require('path').join(root, 'research/king-entropy/out/out_validate.txt'), 'utf-8');
const s = Number(validate.match(/Kasteleyn Bloch average, 64x64 grid: s_tri = ([0-9.]+)/)[1]);
const squares = [];

for (let side = 2; side <= 20; side += 2) {
  const count = await pfaffian.calculateTotalTilingCombinations({ rowCount: side, colCount: side, lattice: 'triangular' });

  if (count !== bFile[side / 2]) {
    throw new Error(`the ${side}×${side} cylinder of the Pfaffian solver differs from the b-file of A402693`);
  }

  squares.push([side, nb.context.logCount(count) / side ** 2]);
}

chart({
  title: 'The entropy per cell of the 2n × 2n cylinder against its side',
  x: { label: 'side 2n of the cylinder', min: 0, max: 22, ticks: [0, 4, 8, 12, 16, 20] },
  y: { label: 'ln a / (2n)²', min: 0.35, max: 0.5, ticks: [0.35, 0.4, 0.45, 0.5] },
  reference: { y: s },
  series: [{ name: 'ln a / (2n)²', color: 'var(--ordinal-1)', points: squares }],
  describe: ([side, ratio]) => `${side}×${side} cylinder, ln a / (2n)² = ${ratio.toFixed(6)}`,
});
```

## PARI/GP

[`oeis/A402693/A402693.gp`](../../oeis/A402693/A402693.gp) counts the $2n \times 2n$ cylinder as the larger of the two Kasteleyn determinants, with and without the sign on the seam. CI checks it against the square triangular cylinders of the test data up to $16 \times 16$.

```js run
print(require('fs').readFileSync(require('path').join(nb.context.root, 'oeis/A402693/A402693.gp'), 'utf-8').trim());
```

## Verification

The `BigInt` solver agrees with A002605, and the modular and the Pfaffian solver with the `BigInt` one at $h = 8$. The Pfaffian solver also agrees with A402693 up to $20 \times 20$ and at $40 \times 40$, the largest board it takes. `FULL_CASES=1 node --test js/test/conformance.test.js` runs the triangular cylinders of [`spec/cases/any-lattice-cylinder-torus-bigint.json`](../../spec/cases/any-lattice-cylinder-torus-bigint.json) through all three of them.

## The OEIS entries

- [OEIS A002605](https://oeis.org/A002605): the cylinders of circumference 2, shifted by one.
- [OEIS A402693](https://oeis.org/draft/A402693): the $2n \times 2n$ cylinders, a draft.

The first is in the OEIS [3] as a row of the table. The cell of The counts checks the row $w = 2$ against it, with the terms of the entry as they stood on 1 November 2026. The OEIS was searched by terms and by name on 30 October 2026 and by terms again on 1 November 2026. It has no entry for the cylinders of circumference 3 and 4, and a search by the terms 6, 412, 905608, 65144171024 on 25 November 2026 found none for the $2n \times 2n$ cylinders, the square boards of the table. They became the draft A402693 the same day.

The b-file for the draft A402693, $n = 0, \dots, 36$, is [`oeis/A402693/b402693.txt`](../../oeis/A402693/b402693.txt). Its term $a(n)$ is the term $h = 2n$ of the row $w = 2n$, so the table holds $a(1)$ to $a(4)$. The cell checks the square boards against that b-file, $2 \times 2$ to $8 \times 8$ with the `BigInt` solver and $2 \times 2$ to $20 \times 20$ and $40 \times 40$ with the Pfaffian one.

```js run
const bFile = require('fs')
  .readFileSync(require('path').join(nb.context.root, 'oeis/A402693/b402693.txt'), 'utf-8')
  .trim()
  .split('\n')
  .map(line => BigInt(line.split(' ')[1]));
const { calculateTotalTilingCombinations } = require('./js/solvers/any-lattice-cylinder-torus-pfaffian.js');
const sides = [2, 4, 6, 8];
const pfaffianSides = [...sides, 10, 12, 14, 16, 18, 20, 40];
const differs = sides.filter(w => nb.count(w, w) !== bFile[w / 2]);

for (const w of pfaffianSides) {
  if ((await calculateTotalTilingCombinations({ rowCount: w, colCount: w, lattice: 'triangular' })) !== bFile[w / 2]) {
    differs.push(w);
  }
}

if (differs.length) {
  throw new Error(`the 2n × 2n cylinders differ from A402693 at 2n = ${differs.join(', ')}`);
}

table(
  ['board', 'OEIS', 'solver', 'checked at'],
  [
    ['w = h = 2n', 'A402693', 'BigInt', `2n = ${sides.join(', ')}`],
    ['w = h = 2n', 'A402693', 'Pfaffian', `2n = ${pfaffianSides.join(', ')}`],
  ],
);
```

## References
1. P. Fendley, R. Moessner and S. L. Sondhi. Classical dimers on the triangular lattice. *Physical Review B* 66(21):214513, 2002. [doi:10.1103/PhysRevB.66.214513](https://doi.org/10.1103/PhysRevB.66.214513)
2. L. Lovász and M. D. Plummer. Determinants and matchings. Chapter 8 of *Matching Theory*, North-Holland Mathematics Studies 121 and Annals of Discrete Mathematics 29, North-Holland, Amsterdam, pp. 307-355, 1986. Lemma 8.3.3 and Theorem 8.3.4, pp. 321-322. [doi:10.1016/S0304-0208(08)73644-2](https://doi.org/10.1016/S0304-0208%2808%2973644-2)
3. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entry [OEIS A002605](https://oeis.org/A002605). [oeis.org](https://oeis.org)
