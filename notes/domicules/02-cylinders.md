# Domicules: tilings of cylinders and of the 2n × 2n cylinder

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/domicules/cylinders.html) has the results. It counts the domicule tilings of cylinders, boards of circumference $w$ and height $h$ whose left and right edges are glued and which are open at the top and the bottom; they are the perfect matchings of the king's graph on the cylinder. The same boards are counted with [dominoes](../dominoes/02-cylinders.md) and on the [triangular lattice](../triangular-lattice/02-cylinders.md); the [rectangles notebook](01-rectangles.md) counts domicules on boards with no glued edge.

## The problem

On a cylinder the left and right edges of the board are glued, so a domicule may cross the seam between the last and the first column. The drawings mark the glued edges and draw a domicule that crosses the seam cut, with one half on each side. They show 4 tilings of the cylinder of circumference 8 and height 8, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 8, colCount: 8, pieces: 'domicule', surface: 'cylinder', spread: 4 });

figure(svgs, `4 of the ${total} domicule tilings of the cylinder of circumference 8 and height 8.`);
```

## The Modular solver

[`any-lattice-cylinder-torus-modular.js`](../../js/solvers/any-lattice-cylinder-torus-modular.js) goes cell by cell, from the empty state to the empty state. Its state holds the next $w + 2$ cells and, with $w \ge 3$, one more bit: a domicule from the first column to the last column of the next row lies $2w - 1$ cells ahead, outside the window, so the extra bit holds it until the window gets there. It counts modulo primes below $2^{31}$, the Chinese remainder theorem rebuilds the count, and one more prime checks it. The same algorithm is in Rust, [`any-lattice-cylinder-torus-modular.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-modular.rs), and in Python, [`any_lattice_cylinder_torus_modular.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_modular.py). The Rust implementation also counts modulo [wide primes](01-rectangles.md#wide-primes), the primes below $2^{61}$.

Let $T_t$ be the matrix of the step that covers the cell $t$, from a state to the states a move of that cell can reach, with $\varnothing$ the empty state and $w$ the circumference. A run modulo the prime $p_i$ gives the residue $r_i$, and the count $a$ of the cylinder with $h$ rows is the number below the product of the primes that has these residues:

```math
r_i \equiv \bigl(T_{hw-1} \cdots T_1 T_0\bigr)_{\varnothing,\varnothing} \pmod{p_i}, \qquad a \equiv r_i \pmod{p_i} \quad (i = 1, \dots, m), \qquad 0 \le a < p_1 \cdots p_m
```

## The BigInt solver

[`any-lattice-cylinder-torus-bigint.js`](../../js/solvers/any-lattice-cylinder-torus-bigint.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row, and the cylinder count is the entry of the $h$-th power of this row transfer matrix from the empty row to the empty row. The same algorithm is in Rust, [`any-lattice-cylinder-torus-bigint.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-bigint.rs), and in Python, [`any_lattice_cylinder_torus_bigint.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_bigint.py).

Here $R_{S,S'}$ is the number of ways to finish a row of circumference $w$ whose cells in $S$ are covered already, with horizontal pieces and pieces sent to the cells $S'$ of the next row, and $\varnothing$ is the empty set:

```math
a = \bigl(R^{h}\bigr)_{\varnothing,\varnothing} = \sum_{S_1, \dots, S_{h-1}} R_{\varnothing,S_1}\, R_{S_1,S_2} \cdots R_{S_{h-1},\varnothing}
```

## Numbering

The gallery numbers the tilings of the cylinders up to $10 \times 10$ with the cell-by-cell scan of the modular solver, as it numbers the [tilings of a rectangle](01-rectangles.md#numbering). The Random button draws a uniformly random number, so the sample is exact. The [Cylinders by diagonal pieces](05-cylinders-by-diagonal-pieces.md#numbering) notebook says how the same scan numbers only the tilings with $k$ diagonal pieces.

## The counts

Two solvers count the same boards by different methods, and the cell below compares the last column of the table, $h = 8$, with the count of the modular solver.

Circumference 2 has multiple edges, because on a ring of two cells a cell meets its right and its left neighbour in the same cell. Each edge counts as a separate piece, so one row of two cells has 2 tilings. A row of odd circumference has an odd number of cells, so the counts vanish at odd heights.

For fixed $w$ the counts grow like $\lambda_w^h$, with $\lambda_w$ the leading eigenvalue of the cylinder transfer matrix; [the paper](https://dawidrylko.github.io/lattice-dimers/papers/king-entropy.pdf) [1] extrapolates its growth rate per site, $\log \lambda_w / w$, in $w$.

The column `checked against` names what the cell compared the counts of each row with, and the cell stops the build on a mismatch. Every row is compared at $h = 8$ with the modular solver and at $h = 2$ with [OEIS A062510](https://oeis.org/A062510) [2]. The row $w = 2$ is compared at every height with [OEIS A002532](https://oeis.org/A002532), and the square boards, $w = h = 2$ to $8$, with the b-file of [OEIS A402163](https://oeis.org/A402163), kept in [`oeis/A402163/b402163.txt`](../../oeis/A402163/b402163.txt). The terms of the first two entries are those of 1 November 2026.

The second table lists the $2n \times 2n$ cylinders, A402163, as the modular solver stored them in `spec/cases/` up to $20 \times 20$, each compared with the b-file of the entry and up to $8 \times 8$ with the `BigInt` solver. The chart draws the entropy per cell, $\ln a(n) / (2n)^2$, of the whole b-file, up to $22 \times 22$, against the side $2n$. The dashed line is the entropy per site $s = 0.5655\ldots$ of the king's graph, read from `research/king-entropy/data/errbar.json`. The two open edges keep every point below it, and the points rise towards it from $4 \times 4$ on.

```js run
const fs = require('fs');
const path = require('path');
const { calculateTotalTilingCombinations } = require('./js/solvers/any-lattice-cylinder-torus-bigint.js');
const modular = require('./js/solvers/any-lattice-cylinder-torus-modular.js');
const { root, logCount } = nb.context;

nb.heights = [0, 1, 2, 3, 4, 5, 6, 7, 8];
nb.widths = [2, 3, 4, 5, 6, 7, 8];
nb.count = (w, h) => calculateTotalTilingCombinations({ rowCount: h, colCount: w, lattice: 'king' });

const checks = Object.fromEntries(nb.widths.map(w => [w, []]));
const terms = [0n, 1n];

while (terms.length <= nb.heights.length) {
  terms.push(2n * terms.at(-1) + 5n * terms.at(-2));
}

const row = terms.slice(1).map((term, h) => [h, term]).filter(([h, term]) => nb.count(2, h) !== term);

if (row.length) {
  throw new Error(`the cylinders of circumference 2 differ from A002532 at h = ${row.map(([h]) => h).join(', ')}`);
}

checks[2].push('A002532');

const column = nb.widths.filter(w => nb.count(w, 2) !== 2n ** BigInt(w + 1) + (w % 2 ? -1n : 1n));

if (column.length) {
  throw new Error(`the cylinders of height 2 differ from A062510 at w = ${column.join(', ')}`);
}

nb.widths.forEach(w => checks[w].push('A062510'));

const bFile = fs
  .readFileSync(path.join(root, 'oeis/A402163/b402163.txt'), 'utf-8')
  .trim()
  .split('\n')
  .map(line => BigInt(line.split(' ')[1]));

nb.squares = nb.widths.filter(w => w % 2 === 0 && nb.heights.includes(w));

const diagonal = nb.squares.filter(w => nb.count(w, w) !== bFile[w / 2]);

if (diagonal.length) {
  throw new Error(`the 2n × 2n cylinders differ from A402163 at 2n = ${diagonal.join(', ')}`);
}

nb.squares.forEach(w => checks[w].push('A402163 b-file'));

for (const w of nb.widths) {
  const check = await modular.calculateTotalTilingCombinations({ rowCount: 8, colCount: w, lattice: 'king' });

  if (check !== nb.count(w, 8)) {
    throw new Error(`the two solvers differ on the cylinder of circumference ${w} and height 8`);
  }

  checks[w].push('modular solver');
}

table(
  ['w \\ h', ...nb.heights.map(String), 'checked against'],
  nb.widths.map(w => [String(w), ...nb.heights.map(h => String(nb.count(w, h))), checks[w].join(', ')]),
);

const stored = require('./js/core/cases')
  .testCasesOf('any-lattice-cylinder-torus-modular')
  .filter(t => (t.lattice || 'king') === 'king' && !t.torus && t.rowCount === t.colCount && t.rowCount >= 2 && t.rowCount % 2 === 0)
  .sort((a, b) => a.rowCount - b.rowCount);

table(
  ['n', 'board', 'a(n)', 'digits', 'solver', 'checked against'],
  stored.map(({ rowCount: side, expectedResult }) => {
    const sources = [['A402163 b-file', bFile[side / 2]], ...(side <= 8 ? [['BigInt solver', nb.count(side, side)]] : [])];
    const differs = sources.filter(([, value]) => String(value) !== expectedResult).map(([name]) => name);

    if (differs.length) {
      throw new Error(`the stored ${side}×${side} cylinder differs from ${differs.join(' and ')}`);
    }

    return [side / 2, `${side}×${side}`, expectedResult, expectedResult.length, 'modular, spec/cases/', sources.map(([name]) => name).join(', ')];
  }),
);

const king = Number(JSON.parse(fs.readFileSync(path.join(root, 'research/king-entropy/data/errbar.json'), 'utf-8')).recommended.s);

chart({
  title: "The entropy per cell ln a(n) / (2n)² of the 2n × 2n cylinders against the side 2n, with the entropy s of the king's graph dashed",
  x: { label: 'side 2n of the cylinder', min: 2, max: 22, ticks: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] },
  y: { label: 'ln a(n) / (2n)²', min: 0.45, max: 0.6, ticks: [0.45, 0.5, 0.55, 0.6] },
  reference: { y: king },
  series: [
    {
      name: 'ln a(n) / (2n)²',
      color: 'var(--ordinal-1)',
      points: bFile.slice(1).map((count, i) => [2 * (i + 1), logCount(count) / (4 * (i + 1) ** 2)]),
    },
  ],
  describe: ([side, entropy]) => `${side}×${side} cylinder, ln a / cells = ${entropy.toFixed(6)}`,
});
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

The `BigInt` solver agrees with the OEIS entries below and the modular solver with the `BigInt` one at $h = 8$, the PARI/GP program runs in CI against the king's graph cylinders of the test data, and `FULL_CASES=1 node --test js/test/conformance.test.js` runs the king's graph cylinders of [`spec/cases/any-lattice-cylinder-torus-bigint.json`](../../spec/cases/any-lattice-cylinder-torus-bigint.json) through both of them.

## The OEIS entries

- [OEIS A002532](https://oeis.org/A002532): the cylinders of circumference 2, shifted by one.
- [OEIS A062510](https://oeis.org/A062510): the cylinders of height 2, shifted by one.
- [OEIS A402163](https://oeis.org/A402163): the $2n \times 2n$ cylinders.

The first two are in the OEIS [2], the first as a row of the table and the second as a column of it. The cell of The counts checks both against the table through closed forms: the recurrence $a(h) = 2a(h-1) + 5a(h-2)$ for the row and $2^{w+1} + (-1)^w$ for the column. The OEIS was searched by terms and by name on 30 October 2026 and by terms again on 1 November 2026. It has no entry for the cylinders of circumference 3 to 6.

The $2n \times 2n$ cylinders are the entry [OEIS A402163](https://oeis.org/A402163) [2], with a b-file of $n = 0, \dots, 11$, [`oeis/A402163/b402163.txt`](../../oeis/A402163/b402163.txt). The cell of The counts checks the square boards of the table, $2 \times 2$ to $8 \times 8$, against that b-file, and the table below sums up what it checked.

```js run
table(
  ['board', 'OEIS', 'checked at'],
  [
    ['w = 2', 'A002532', `h = ${nb.heights.join(', ')}`],
    ['h = 2', 'A062510', `w = ${nb.widths.join(', ')}`],
    ['w = h = 2n', 'A402163', `2n = ${nb.squares.join(', ')}`],
  ],
);
```

## References
1. D. Ryłko. The dimer entropy of the king's graph. Preprint, October 2026. [doi:10.5281/zenodo.23686056](https://doi.org/10.5281/zenodo.23686056)
2. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A002532](https://oeis.org/A002532), [OEIS A062510](https://oeis.org/A062510) and [OEIS A402163](https://oeis.org/A402163). [oeis.org](https://oeis.org)
