# Dominoes: tilings of cylinders (A000129, A004253, A006253, A003729, A028477, A028478, A028479)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/dominoes/cylinders.html) has the results. It counts the domino tilings of cylinders, boards of circumference $w$ and height $h$ whose left and right edges are glued and which are open at the top and the bottom. The same boards are counted with [domicules](../domicules/02-cylinders.md) and on the [triangular lattice](../triangular-lattice/01-cylinders.md); the [rectangles notebook](01-rectangles.md) counts dominoes on boards with no glued edge.

## The problem

On a cylinder the left and right edges of the board are glued, so a domino may cross the seam between the last and the first column. The drawings mark the glued edges and draw a domino that crosses the seam cut, with one half on each side. They show tilings of the cylinder of circumference 4 and height 4, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');
const { total } = drawTilings({ rowCount: 4, colCount: 4, pieces: 'domino', surface: 'cylinder', ranks: [0] });
const ranks = [0, 1, 2, 3].map(i => Math.floor((Number(total) * i) / 4));
const { svgs } = drawTilings({ rowCount: 4, colCount: 4, pieces: 'domino', surface: 'cylinder', ranks });

figure(svgs, `4 of the ${total} domino tilings of the cylinder of circumference 4 and height 4.`);
```

## The Modular solver

[`periodicTilingSolver-Modular.js`](../../js/solvers/periodicTilingSolver-Modular.js) goes cell by cell, from the empty state to the empty state, with a state of the next $w + 2$ cells. It counts modulo primes below $2^{31}$, the Chinese remainder theorem rebuilds the count, and one more prime checks it. The same algorithm is in Rust, [`periodic-tiling-modular.rs`](../../rust/solvers/src/bin/periodic-tiling-modular.rs), and in Python, [`periodic_tiling_modular.py`](../../python/lattice_dimers/solvers/periodic_tiling_modular.py).

## The BigInt solver

[`periodicTilingSolver-BigInt.js`](../../js/solvers/periodicTilingSolver-BigInt.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row, and the cylinder count is the entry of the $h$-th power of this row transfer matrix from the empty row to the empty row.

## Numbering

The gallery numbers the tilings of the cylinders up to $10 \times 10$ with the cell-by-cell scan of the modular solver, as it numbers the [tilings of a rectangle](01-rectangles.md#numbering). The Random button draws a uniformly random number, so the sample is exact.

## The counts

Two solvers count the same boards by different methods, and the cell below compares the last column of the table, $h = 8$, with the count of the modular solver.

Circumference 2 has multiple edges, because on a ring of two cells a cell meets its right and its left neighbour in the same cell. Each edge counts as a separate domino, so one row of two cells has 2 tilings. A row of odd circumference has an odd number of cells, so the counts vanish at odd heights.

```js run
const { calculateTotalTilingCombinations } = require('./js/solvers/periodicTilingSolver-BigInt.js');
const modular = require('./js/solvers/periodicTilingSolver-Modular.js');

nb.heights = [0, 1, 2, 3, 4, 5, 6, 7, 8];
nb.widths = [2, 3, 4, 5, 6, 7, 8];
nb.count = (w, h) => calculateTotalTilingCombinations({ rowCount: h, colCount: w, lattice: 'square' });

for (const w of nb.widths) {
  const check = await modular.calculateTotalTilingCombinations({ rowCount: 8, colCount: w, lattice: 'square' });

  if (check !== nb.count(w, 8)) {
    throw new Error(`the two solvers differ on the cylinder of circumference ${w} and height 8`);
  }
}

table(
  ['w \\ h', ...nb.heights.map(String)],
  nb.widths.map(w => [String(w), ...nb.heights.map(h => String(nb.count(w, h)))]),
);
```

## What the OEIS has

Every row of the table is in the OEIS: the Pell numbers [OEIS A000129](https://oeis.org/A000129), shifted by one, for circumference 2, and the domino tilings of $C_w \times P_h$ for the others, [OEIS A004253](https://oeis.org/A004253), [OEIS A006253](https://oeis.org/A006253), [OEIS A003729](https://oeis.org/A003729), [OEIS A028477](https://oeis.org/A028477), [OEIS A028478](https://oeis.org/A028478) and [OEIS A028479](https://oeis.org/A028479) for $w = 3$ to $8$ [1]; the entries of odd circumference list only the even heights. The cell checks every one of these against the table, with the terms of the entries as they stood on 1 November 2026.

```js run
const pell = [0n, 1n];

while (pell.length <= nb.heights.length) {
  pell.push(2n * pell.at(-1) + pell.at(-2));
}

const fromHeight = (terms, step = 1, first = 0) => new Map(terms.map((term, i) => [first + step * i, term]));
const entries = [
  [2, 'A000129', fromHeight(pell.slice(1))],
  [3, 'A004253', fromHeight([1n, 4n, 19n, 91n, 436n], 2)],
  [4, 'A006253', fromHeight([1n, 2n, 9n, 32n, 121n, 450n, 1681n, 6272n, 23409n])],
  [5, 'A003729', fromHeight([11n, 176n, 2911n, 48301n], 2, 2)],
  [6, 'A028477', fromHeight([1n, 2n, 20n, 108n, 725n, 4480n, 28561n, 179928n, 1138660n])],
  [7, 'A028478', fromHeight([1n, 29n, 1471n, 79808n, 4375897n], 2)],
  [8, 'A028479', fromHeight([1n, 2n, 49n, 392n, 5041n, 51842n, 591361n, 6422528n, 71385601n])],
];
const rows = [];

for (const [w, entry, terms] of entries) {
  const differs = [...terms].filter(([h, term]) => nb.count(w, h) !== term);

  if (differs.length) {
    throw new Error(`the cylinders of circumference ${w} differ from ${entry} at h = ${differs.map(([h]) => h).join(', ')}`);
  }

  rows.push([`w = ${w}`, entry, `h = ${[...terms.keys()].join(', ')}`]);
}

table(['board', 'OEIS', 'checked at'], rows);
```

## Running time

Average time of the count inside each solver, without the start of its process, from the newest complete benchmark run in [`benchmarks/results`](../../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['board', 'modular, Rust', 'modular, Python', 'modular, JavaScript', 'BigInt'],
  nb.context.dominoPeriodicBenchmark
    .filter(r => r.surface === 'cylinder')
    .map(r => [`${r.rowCount}×${r.colCount}`, formatTime(r.languages.rs), formatTime(r.languages.py), formatTime(r.modular), formatTime(r.bigint)]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```

## Verification

The `BigInt` solver agrees with every OEIS entry above and the modular solver with the `BigInt` one at $h = 8$, and `node harness/testRunner.js` runs the cylinders of [`spec/cases/periodicTilingTests.json`](../../spec/cases/periodicTilingTests.json) through both of them.

## References

1. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A000129](https://oeis.org/A000129), [OEIS A004253](https://oeis.org/A004253), [OEIS A006253](https://oeis.org/A006253), [OEIS A003729](https://oeis.org/A003729), [OEIS A028477](https://oeis.org/A028477), [OEIS A028478](https://oeis.org/A028478) and [OEIS A028479](https://oeis.org/A028479). [oeis.org](https://oeis.org)
