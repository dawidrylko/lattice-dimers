# Cylinders

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/cylinders.html) has the results. It counts the tilings of cylinders, boards of circumference $w$ and height $h$ whose left and right edges are glued and which are open at the top and the bottom. There are three lattices: the square lattice (dominoes), the triangular lattice (the square lattice with one diagonal) and the king's graph (domicules). The method is described in the [method note](01-method.md).

## How the counts are made

Two solvers count the same boards by different methods. [`periodicTilingSolver-BigInt.js`](../src/solvers/periodicTilingSolver-BigInt.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row, and the cylinder count is the entry of the $h$-th power of this row transfer matrix from the empty row to the empty row. [`periodicTilingSolver-Modular.js`](../src/solvers/periodicTilingSolver-Modular.js) goes cell by cell, from the empty state to the empty state; the [tori notebook](05-torus.md) describes its state.

Circumference 2 has multiple edges, because on a ring of two cells a cell meets its right and its left neighbour in the same cell. Each edge counts as a separate piece, so one row of two cells has 2 tilings. A row of odd circumference has an odd number of cells, so the counts vanish at odd heights.

## The king's graph

For fixed $w$ the counts grow like $\lambda_w^h$, with $\lambda_w$ the leading eigenvalue of the cylinder transfer matrix that [the paper](https://dawidrylko.github.io/lattice-dimers/papers/king-entropy.pdf) extrapolates in $w$.

```js run
const { calculateTotalTilingCombinations } = require('./src/solvers/periodicTilingSolver-BigInt.js');
const heights = [0, 1, 2, 3, 4, 5, 6, 7, 8];

nb.count = (lattice, w, h) => calculateTotalTilingCombinations({ rowCount: h, colCount: w, lattice });
nb.heights = heights;

table(
  ['w \\ h', ...heights.map(String)],
  [2, 3, 4, 5, 6, 7, 8].map(w => [String(w), ...heights.map(h => String(nb.count('king', w, h)))]),
);
```

## The square lattice

Domino tilings, with the same circumferences and heights.

```js run
table(
  ['w \\ h', ...nb.heights.map(String)],
  [2, 3, 4, 5, 6, 7, 8].map(w => [String(w), ...nb.heights.map(h => String(nb.count('square', w, h)))]),
);
```

## The triangular lattice

The square lattice with one diagonal.

```js run
table(
  ['w \\ h', ...nb.heights.map(String)],
  [2, 3, 4, 5, 6, 7, 8].map(w => [String(w), ...nb.heights.map(h => String(nb.count('triangular', w, h)))]),
);
```

## What the OEIS has

The cylinders of circumference 2 are linear recurrences the OEIS already lists: the Pell numbers [OEIS A000129](https://oeis.org/A000129) on the square lattice, [OEIS A002605](https://oeis.org/A002605) on the triangular lattice and [OEIS A002532](https://oeis.org/A002532) on the king's graph, each shifted by one. The cell checks the three recurrences on the heights of the tables. The square lattice of circumference 4 is [OEIS A006253](https://oeis.org/A006253), which the tests check, and the king's graph cylinders of height 2 are [OEIS A062510](https://oeis.org/A062510). The OEIS was searched by terms and by name on 30 October 2026 and by terms again on 1 November 2026. It has no entry for the king's graph cylinders of circumference 3 to 6 or for the triangular ones of circumference 3 and 4.

```js run
const recurrences = [
  ['square', 'A000129', 2n, 1n],
  ['triangular', 'A002605', 2n, 2n],
  ['king', 'A002532', 2n, 5n],
];
const rows = [];

for (const [lattice, entry, p, q] of recurrences) {
  const terms = [0n, 1n];

  while (terms.length < nb.heights.length + 1) {
    terms.push(p * terms.at(-1) + q * terms.at(-2));
  }

  const counts = nb.heights.map(h => nb.count(lattice, 2, h));

  if (counts.some((count, h) => count !== terms[h + 1])) {
    throw new Error(`the ${lattice} cylinders of circumference 2 are not ${entry}: ${counts.join(', ')}`);
  }

  rows.push([lattice, entry, `a(n) = ${p}a(n-1) + ${q}a(n-2)`.replace(/\b1a/g, 'a'), counts.join(', ')]);
}

table(['lattice', 'OEIS', 'recurrence', 'w = 2, h = 0..8'], rows);
```

## Running time

Average wall-clock time of a full solver process on the king's graph, from the newest complete benchmark run in [`benchmarks/results`](../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['board', 'BigInt', 'modular'],
  nb.context.periodicBenchmark.filter(r => r.surface === 'cylinder').map(r => [`${r.rowCount}×${r.colCount}`, formatTime(r.bigint), formatTime(r.modular)]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```
