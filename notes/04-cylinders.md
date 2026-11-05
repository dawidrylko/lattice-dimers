# Cylinders: tilings on three lattices

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/cylinders.html) has the results. It counts the tilings of cylinders, boards of circumference $w$ and height $h$ whose left and right edges are glued and which are open at the top and the bottom. There are three lattices: the square lattice (dominoes), the triangular lattice (the square lattice with one diagonal) and the king's graph (domicules). The method is described in the [method note](01-method.md).

## The problem

On a cylinder the left and right edges of the board are glued, so a piece may cross the seam between the last and the first column. The drawings mark the glued edges and draw a piece that crosses the seam cut, with one half on each side. They show tilings of the cylinder of circumference 4 and height 4, first with dominoes and then with domicules, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');

for (const pieces of ['domino', 'domicule']) {
  const { total } = drawTilings({ rowCount: 4, colCount: 4, pieces, surface: 'cylinder', ranks: [0] });
  const ranks = [0, 1, 2, 3].map(i => Math.floor((Number(total) * i) / 4));
  const { svgs } = drawTilings({ rowCount: 4, colCount: 4, pieces, surface: 'cylinder', ranks });

  figure(svgs, `4 of the ${total} ${pieces} tilings of the cylinder of circumference 4 and height 4.`);
}
```

## How the counts are made

Two solvers count the same boards by different methods. [`periodicTilingSolver-BigInt.js`](../js/solvers/periodicTilingSolver-BigInt.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row, and the cylinder count is the entry of the $h$-th power of this row transfer matrix from the empty row to the empty row. [`periodicTilingSolver-Modular.js`](../js/solvers/periodicTilingSolver-Modular.js) goes cell by cell, from the empty state to the empty state; the [tori notebook](05-tori.md) describes its state. Every table below checks its last column, $h = 8$, against the modular solver.

Circumference 2 has multiple edges, because on a ring of two cells a cell meets its right and its left neighbour in the same cell. Each edge counts as a separate piece, so one row of two cells has 2 tilings. A row of odd circumference has an odd number of cells, so the counts vanish at odd heights.

## The king's graph

For fixed $w$ the counts grow like $\lambda_w^h$, with $\lambda_w$ the leading eigenvalue of the cylinder transfer matrix that [the paper](https://dawidrylko.github.io/lattice-dimers/papers/king-entropy.pdf) extrapolates in $w$.

```js run
const { calculateTotalTilingCombinations } = require('./js/solvers/periodicTilingSolver-BigInt.js');
const modular = require('./js/solvers/periodicTilingSolver-Modular.js');

nb.heights = [0, 1, 2, 3, 4, 5, 6, 7, 8];
nb.widths = [2, 3, 4, 5, 6, 7, 8];
nb.count = (lattice, w, h) => calculateTotalTilingCombinations({ rowCount: h, colCount: w, lattice });
nb.table = async lattice => {
  for (const w of nb.widths) {
    const check = await modular.calculateTotalTilingCombinations({ rowCount: 8, colCount: w, lattice });

    if (check !== nb.count(lattice, w, 8)) {
      throw new Error(`the two solvers differ on the ${lattice} cylinder of circumference ${w} and height 8`);
    }
  }

  table(
    ['w \\ h', ...nb.heights.map(String)],
    nb.widths.map(w => [String(w), ...nb.heights.map(h => String(nb.count(lattice, w, h)))]),
  );
};

await nb.table('king');
```

## The square lattice

Domino tilings, with the same circumferences and heights.

```js run
await nb.table('square');
```

## The triangular lattice

The square lattice with one diagonal.

```js run
await nb.table('triangular');
```

## What the OEIS has

Every row of the square lattice table is in the OEIS: the Pell numbers [OEIS A000129](https://oeis.org/A000129), shifted by one, for circumference 2, and the domino tilings of $C_w \times P_h$ for the others, [OEIS A004253](https://oeis.org/A004253), [OEIS A006253](https://oeis.org/A006253), [OEIS A003729](https://oeis.org/A003729), [OEIS A028477](https://oeis.org/A028477), [OEIS A028478](https://oeis.org/A028478) and [OEIS A028479](https://oeis.org/A028479) for $w = 3$ to $8$; the entries of odd circumference list only the even heights. On the other two lattices the OEIS has circumference 2, [OEIS A002605](https://oeis.org/A002605) on the triangular lattice and [OEIS A002532](https://oeis.org/A002532) on the king's graph, and the king's graph cylinders of height 2, [OEIS A062510](https://oeis.org/A062510), each shifted by one. The cell checks every one of these against the tables, with the terms of the entries as they stood on 1 November 2026. The OEIS was searched by terms and by name on 30 October 2026 and by terms again on 1 November 2026. It has no entry for the king's graph cylinders of circumference 3 to 6 or for the triangular ones of circumference 3 and 4.

```js run
const recurrence = (p, q) => {
  const terms = [0n, 1n];

  while (terms.length <= nb.heights.length) {
    terms.push(p * terms.at(-1) + q * terms.at(-2));
  }

  return terms.slice(1);
};
const fromHeight = (terms, step = 1, first = 0) => new Map(terms.map((term, i) => [first + step * i, term]));
const entries = [
  ['square', 2, 'A000129', fromHeight(recurrence(2n, 1n))],
  ['square', 3, 'A004253', fromHeight([1n, 4n, 19n, 91n, 436n], 2)],
  ['square', 4, 'A006253', fromHeight([1n, 2n, 9n, 32n, 121n, 450n, 1681n, 6272n, 23409n])],
  ['square', 5, 'A003729', fromHeight([11n, 176n, 2911n, 48301n], 2, 2)],
  ['square', 6, 'A028477', fromHeight([1n, 2n, 20n, 108n, 725n, 4480n, 28561n, 179928n, 1138660n])],
  ['square', 7, 'A028478', fromHeight([1n, 29n, 1471n, 79808n, 4375897n], 2)],
  ['square', 8, 'A028479', fromHeight([1n, 2n, 49n, 392n, 5041n, 51842n, 591361n, 6422528n, 71385601n])],
  ['triangular', 2, 'A002605', fromHeight(recurrence(2n, 2n))],
  ['king', 2, 'A002532', fromHeight(recurrence(2n, 5n))],
];
const rows = [];

for (const [lattice, w, entry, terms] of entries) {
  const differs = [...terms].filter(([h, term]) => nb.count(lattice, w, h) !== term);

  if (differs.length) {
    throw new Error(`the ${lattice} cylinders of circumference ${w} differ from ${entry} at h = ${differs.map(([h]) => h).join(', ')}`);
  }

  rows.push([lattice, `w = ${w}`, entry, `h = ${[...terms.keys()].join(', ')}`]);
}

const column = nb.widths.filter(w => nb.count('king', w, 2) !== 2n ** BigInt(w + 1) + (w % 2 ? -1n : 1n));

if (column.length) {
  throw new Error(`the king's graph cylinders of height 2 differ from A062510 at w = ${column.join(', ')}`);
}

rows.push(['king', 'h = 2', 'A062510', `w = ${nb.widths.join(', ')}`]);
table(['lattice', 'board', 'OEIS', 'checked at'], rows);
```

## Running time

Average time of the count inside each solver on the king's graph, without the start of its process, from the newest complete benchmark run in [`benchmarks/results`](../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['board', 'BigInt', 'modular, Rust', 'modular, Python', 'modular, JavaScript'],
  nb.context.periodicBenchmark
    .filter(r => r.surface === 'cylinder')
    .map(r => [`${r.rowCount}×${r.colCount}`, formatTime(r.bigint), formatTime(r.languages.rs), formatTime(r.languages.py), formatTime(r.modular)]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```
