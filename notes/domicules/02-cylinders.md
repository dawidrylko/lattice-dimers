# Domicules: tilings of cylinders (A002532, A062510, A402163)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/domicules/cylinders.html) has the results. It counts the domicule tilings of cylinders, boards of circumference $w$ and height $h$ whose left and right edges are glued and which are open at the top and the bottom; they are the perfect matchings of the king's graph on the cylinder. The same boards are counted with [dominoes](../dominoes/02-cylinders.md) and on the [triangular lattice](../triangular-lattice/02-cylinders.md); the [rectangles notebook](01-rectangles.md) counts domicules on boards with no glued edge.

## The problem

On a cylinder the left and right edges of the board are glued, so a domicule may cross the seam between the last and the first column. The drawings mark the glued edges and draw a domicule that crosses the seam cut, with one half on each side. They show 4 tilings of the cylinder of circumference 8 and height 8, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 8, colCount: 8, pieces: 'domicule', surface: 'cylinder', spread: 4 });

figure(svgs, `4 of the ${total} domicule tilings of the cylinder of circumference 8 and height 8.`);
```

## The Modular solver

[`any-lattice-cylinder-torus-modular.js`](../../js/solvers/any-lattice-cylinder-torus-modular.js) goes cell by cell, from the empty state to the empty state. Its state holds the next $w + 2$ cells and, with $w \ge 3$, one more bit: a domicule from the first column to the last column of the next row lies $2w - 1$ cells ahead, outside the window, so the extra bit holds it until the window gets there. It counts modulo primes below $2^{31}$, the Chinese remainder theorem rebuilds the count, and one more prime checks it. The same algorithm is in Rust, [`any-lattice-cylinder-torus-modular.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-modular.rs), and in Python, [`any_lattice_cylinder_torus_modular.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_modular.py).

## The BigInt solver

[`any-lattice-cylinder-torus-bigint.js`](../../js/solvers/any-lattice-cylinder-torus-bigint.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row, and the cylinder count is the entry of the $h$-th power of this row transfer matrix from the empty row to the empty row. The same algorithm is in Rust, [`any-lattice-cylinder-torus-bigint.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-bigint.rs), and in Python, [`any_lattice_cylinder_torus_bigint.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_bigint.py).

## Numbering

The gallery numbers the tilings of the cylinders up to $10 \times 10$ with the cell-by-cell scan of the modular solver, as it numbers the [tilings of a rectangle](01-rectangles.md#numbering). The Random button draws a uniformly random number, so the sample is exact. The [Cylinders by diagonal pieces](05-cylinders-by-diagonal-pieces.md#numbering) notebook says how the same scan numbers only the tilings with $k$ diagonal pieces.

## The counts

Two solvers count the same boards by different methods, and the cell below compares the last column of the table, $h = 8$, with the count of the modular solver.

Circumference 2 has multiple edges, because on a ring of two cells a cell meets its right and its left neighbour in the same cell. Each edge counts as a separate piece, so one row of two cells has 2 tilings. A row of odd circumference has an odd number of cells, so the counts vanish at odd heights.

For fixed $w$ the counts grow like $\lambda_w^h$, with $\lambda_w$ the leading eigenvalue of the cylinder transfer matrix; [the paper](https://dawidrylko.github.io/lattice-dimers/papers/king-entropy.pdf) [2] extrapolates its growth rate per site, $\log \lambda_w / w$, in $w$.

```js run
const { calculateTotalTilingCombinations } = require('./js/solvers/any-lattice-cylinder-torus-bigint.js');
const modular = require('./js/solvers/any-lattice-cylinder-torus-modular.js');

nb.heights = [0, 1, 2, 3, 4, 5, 6, 7, 8];
nb.widths = [2, 3, 4, 5, 6, 7, 8];
nb.count = (w, h) => calculateTotalTilingCombinations({ rowCount: h, colCount: w, lattice: 'king' });

for (const w of nb.widths) {
  const check = await modular.calculateTotalTilingCombinations({ rowCount: 8, colCount: w, lattice: 'king' });

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

The OEIS has the cylinders of circumference 2, [OEIS A002532](https://oeis.org/A002532), and those of height 2, [OEIS A062510](https://oeis.org/A062510), each shifted by one [1]. The cell checks both against the table, with the terms of the entries as they stood on 1 November 2026. The OEIS was searched by terms and by name on 30 October 2026 and by terms again on 1 November 2026. It has no entry for the cylinders of circumference 3 to 6.

The $2n \times 2n$ cylinders are the draft entry [OEIS A402163](https://oeis.org/draft/A402163) [1], submitted on 14 November 2026 with a b-file of $n = 0, \dots, 11$, [`oeis/A402163/b402163.txt`](../../oeis/A402163/b402163.txt). The cell checks the square boards of the table, $2 \times 2$ to $8 \times 8$, against that b-file.

```js run
const terms = [0n, 1n];

while (terms.length <= nb.heights.length) {
  terms.push(2n * terms.at(-1) + 5n * terms.at(-2));
}

const row = terms.slice(1).map((term, h) => [h, term]).filter(([h, term]) => nb.count(2, h) !== term);

if (row.length) {
  throw new Error(`the cylinders of circumference 2 differ from A002532 at h = ${row.map(([h]) => h).join(', ')}`);
}

const column = nb.widths.filter(w => nb.count(w, 2) !== 2n ** BigInt(w + 1) + (w % 2 ? -1n : 1n));

if (column.length) {
  throw new Error(`the cylinders of height 2 differ from A062510 at w = ${column.join(', ')}`);
}

const bFile = require('fs')
  .readFileSync(require('path').join(nb.context.root, 'oeis/A402163/b402163.txt'), 'utf-8')
  .trim()
  .split('\n')
  .map(line => BigInt(line.split(' ')[1]));
const squares = nb.widths.filter(w => w % 2 === 0 && nb.heights.includes(w));
const diagonal = squares.filter(w => nb.count(w, w) !== bFile[w / 2]);

if (diagonal.length) {
  throw new Error(`the 2n × 2n cylinders differ from A402163 at 2n = ${diagonal.join(', ')}`);
}

table(
  ['board', 'OEIS', 'checked at'],
  [
    ['w = 2', 'A002532', `h = ${nb.heights.join(', ')}`],
    ['h = 2', 'A062510', `w = ${nb.widths.join(', ')}`],
    ['w = h = 2n', 'A402163', `2n = ${squares.join(', ')}`],
  ],
);
```

## Running time

Average time of the count inside each solver, without the start of its process, from the newest complete benchmark run in [`benchmarks/results`](../../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['board', 'modular, Rust', 'modular, Python', 'modular, JavaScript', 'BigInt, Rust', 'BigInt, Python', 'BigInt, JavaScript'],
  nb.context.cylinderTorusBenchmark
    .filter(r => r.surface === 'cylinder')
    .map(r => [
      `${r.rowCount}×${r.colCount}`,
      ...[r.languages.rs, r.languages.py, r.modular, r.bigintLanguages.rs, r.bigintLanguages.py, r.bigint].map(formatTime),
    ]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```

## PARI/GP

The cylinder count as the entry of the power of the row transfer matrix from the empty row to the empty row in [`oeis/A402163/A402163.gp`](../../oeis/A402163/A402163.gp), checked in CI against the king's graph cylinders of the test data up to circumference 8.

```js run
print(require('fs').readFileSync(require('path').join(nb.context.root, 'oeis/A402163/A402163.gp'), 'utf-8').trim());
```

## Verification

The `BigInt` solver agrees with the OEIS entries above and the modular solver with the `BigInt` one at $h = 8$, the PARI/GP program runs in CI against the king's graph cylinders of the test data, and `FULL_CASES=1 node --test js/test/conformance.test.js` runs the king's graph cylinders of [`spec/cases/any-lattice-cylinder-torus-bigint.json`](../../spec/cases/any-lattice-cylinder-torus-bigint.json) through both of them.

## References

1. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A002532](https://oeis.org/A002532) and [OEIS A062510](https://oeis.org/A062510) and draft entry [OEIS A402163](https://oeis.org/draft/A402163). [oeis.org](https://oeis.org)
2. D. Ryłko. The dimer entropy of the king's graph. Preprint, October 2026. [doi:10.5281/zenodo.23686056](https://doi.org/10.5281/zenodo.23686056)
