# Dominoes: tilings of cylinders and of the 2n × 2n cylinder

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/dominoes/cylinders.html) has the results. It counts the domino tilings of cylinders, boards of circumference $w$ and height $h$ whose left and right edges are glued and which are open at the top and the bottom. The same boards are counted on the [triangular lattice](../triangular-lattice/02-cylinders.md) and with [domicules](../domicules/02-cylinders.md); the [rectangles notebook](01-rectangles.md) counts dominoes on boards with no glued edge.

## The problem

On a cylinder the left and right edges of the board are glued, so a domino may cross the seam between the last and the first column. The drawings mark the glued edges and draw a domino that crosses the seam cut, with one half on each side. They show 4 tilings of the cylinder of circumference 8 and height 8, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 8, colCount: 8, pieces: 'domino', surface: 'cylinder', spread: 4 });

figure(svgs, `4 of the ${total} domino tilings of the cylinder of circumference 8 and height 8.`);
```

## The Pfaffian solver

[`any-lattice-cylinder-torus-pfaffian.js`](../../js/solvers/any-lattice-cylinder-torus-pfaffian.js) counts in polynomial time: it eliminates a matrix of $wh \times wh$ entries. The cylinder is a planar graph, so by Kasteleyn's theorem [1] a sign on every edge makes the number of tilings the absolute value of the Pfaffian of a skew-symmetric matrix. The solver computes two Pfaffians, one with the edges across the seam as they are and one with their signs flipped. One of the two is the count up to sign. The other is the difference between the tilings with an even and with an odd number of dominoes across the seam, so the solver returns the larger absolute value. Inside the board it uses the signs of [`A401988.gp`](../../oeis/A401988/A401988.gp), alternating by rows or, when the number of rows is odd, by columns.

Let $K_{+}$ be the skew-symmetric matrix of the board with the seam edges as they are and $K_{-}$ the one with their signs flipped. The solver returns

```math
a(w, h) = \max\bigl(\lvert \mathrm{Pf}\, K_{+} \rvert,\ \lvert \mathrm{Pf}\, K_{-} \rvert\bigr)
```

where $\mathrm{Pf}$ is the Pfaffian, $\mathrm{Pf}(K)^2 = \det K$, which the solver evaluates modulo each prime by elimination.

The solver counts modulo primes. They are below $2^{31}$ in Rust and Python and below $2^{26}$ in JavaScript, where a sum of two products of residues has to stay exact in a double. The Chinese remainder theorem rebuilds the count, and one more prime checks it.

A board has at most 1600 cells. That is a limit of memory, because every thread keeps a whole matrix. The same algorithm is in Rust, [`any-lattice-cylinder-torus-pfaffian.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-pfaffian.rs), and in Python, [`any_lattice_cylinder_torus_pfaffian.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_pfaffian.py).

## The Modular solver

[`any-lattice-cylinder-torus-modular.js`](../../js/solvers/any-lattice-cylinder-torus-modular.js) goes cell by cell, from the empty state to the empty state, with a state of the next $w + 2$ cells. It counts modulo primes below $2^{31}$, the Chinese remainder theorem rebuilds the count, and one more prime checks it.

```math
\begin{aligned}
r_i &= \mathbf{e}_{\varnothing}^{\top}\, C_{c_N} \cdots C_{c_2}\, C_{c_1}\, \mathbf{e}_{\varnothing} \bmod p_i, \\
a(w, h) &= \sum_i r_i\, M_i \bigl( M_i^{-1} \bmod p_i \bigr) \bmod M, \qquad M = \prod_i p_i, \quad M_i = M / p_i,
\end{aligned}
```

where $N = wh$, $c_k$ is the column of the $k$-th cell, $C_c$ is the step that decides the cell in column $c$ (it covers it with a piece from an earlier cell, or starts a horizontal or vertical piece), $\mathbf{e}_{\varnothing}$ is the empty state, and the $p_i$ are the primes, without the last one that only checks. The same algorithm is in Rust, [`any-lattice-cylinder-torus-modular.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-modular.rs), and in Python, [`any_lattice_cylinder_torus_modular.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_modular.py). The Rust implementation also counts modulo [wide primes](../domicules/01-rectangles.md#wide-primes), the primes below $2^{61}$.

## The BigInt solver

[`any-lattice-cylinder-torus-bigint.js`](../../js/solvers/any-lattice-cylinder-torus-bigint.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row, and the cylinder count is the entry of the $h$-th power of this row transfer matrix from the empty row to the empty row.

```math
a(w, h) = \bigl(T^{h}\bigr)_{\varnothing,\varnothing}, \qquad T_{S,S'} = \begin{cases} \mathrm{pm}\bigl(C_w - S - S'\bigr) & \text{if } S \cap S' = \varnothing, \\ 0 & \text{otherwise,} \end{cases}
```

where $S$ is the set of cells of a row covered from the row below, $S'$ the set of cells that start a vertical piece into the next row, and $\mathrm{pm}(C_w - S - S')$ the number of ways to cover the other cells of the ring of $w$ cells by horizontal pieces, one of them possibly across the seam. The same algorithm is in Rust, [`any-lattice-cylinder-torus-bigint.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-bigint.rs), and in Python, [`any_lattice_cylinder_torus_bigint.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_bigint.py).

## Numbering

The gallery numbers the tilings of the cylinders up to $10 \times 10$ with the cell-by-cell scan of the modular solver, as it numbers the [tilings of a rectangle](01-rectangles.md#numbering). The Random button draws a uniformly random number, so the sample is exact.

## The counts

Three solvers count the same boards by different methods. The table comes from the `BigInt` solver. The cell below compares its last column, $h = 8$, with the counts of the modular and the Pfaffian solver, and every row with the terms of its OEIS entry [2], as they stood on 1 November 2026; the column `checked against` names the entry of each row, and [The OEIS entries](#the-oeis-entries) lists the heights it holds.

Circumference 2 has multiple edges, because on a ring of two cells a cell meets its right and its left neighbour in the same cell. Each edge counts as a separate domino, so one row of two cells has 2 tilings. A row of odd circumference has an odd number of cells, so the counts vanish at odd heights.

The second table lists the $2n \times 2n$ cylinders, A402345, counted by the Pfaffian solver and checked against the b-file of the entry, up to $8 \times 8$ also against the `BigInt` solver. The chart draws their entropy per cell, $\ln a / (2n)^2$, against the side. The dashed line is the limit of the square lattice, $G/\pi \approx 0.29156$ ([OEIS A143233](https://oeis.org/A143233) [2], $G$ is Catalan's constant). The $2 \times 2$ and $4 \times 4$ cylinders lie above it. From $6 \times 6$ on the points lie below the line, lowest near $8 \times 8$ and $10 \times 10$, and rise towards it, since the open edges at the top and the bottom cost a term proportional to the side.

```js run
const { calculateTotalTilingCombinations } = require('./js/solvers/any-lattice-cylinder-torus-bigint.js');
const modular = require('./js/solvers/any-lattice-cylinder-torus-modular.js');
const pfaffian = require('./js/solvers/any-lattice-cylinder-torus-pfaffian.js');
const { logCount } = nb.context;

nb.heights = [0, 1, 2, 3, 4, 5, 6, 7, 8];
nb.widths = [2, 3, 4, 5, 6, 7, 8];
nb.count = (w, h) => calculateTotalTilingCombinations({ rowCount: h, colCount: w, lattice: 'square' });

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

nb.checked = [];

for (const [w, entry, terms] of entries) {
  const board = { rowCount: 8, colCount: w, lattice: 'square' };
  const solvers = [await modular.calculateTotalTilingCombinations(board), await pfaffian.calculateTotalTilingCombinations(board)];

  if (solvers.some(count => count !== nb.count(w, 8))) {
    throw new Error(`the three solvers differ on the cylinder of circumference ${w} and height 8`);
  }

  const differs = [...terms].filter(([h, term]) => nb.count(w, h) !== term);

  if (differs.length) {
    throw new Error(`the cylinders of circumference ${w} differ from ${entry} at h = ${differs.map(([h]) => h).join(', ')}`);
  }

  nb.checked.push([`w = ${w}`, entry, `h = ${[...terms.keys()].join(', ')}`]);
  rows.push([String(w), ...nb.heights.map(h => String(nb.count(w, h))), `${entry}, modular and Pfaffian solver`]);
}

table(['w \\ h', ...nb.heights.map(String), 'checked against'], rows);

const bFile = require('fs')
  .readFileSync(require('path').join(nb.context.root, 'oeis/A402345/b402345.txt'), 'utf-8')
  .trim()
  .split('\n')
  .map(line => BigInt(line.split(' ')[1]));
const sides = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const points = [];
const squares = [];

for (const side of sides) {
  const count = await pfaffian.calculateTotalTilingCombinations({ rowCount: side, colCount: side, lattice: 'square' });
  const checks = [['A402345 b-file', bFile[side / 2]], ...(side <= 8 ? [['BigInt solver', nb.count(side, side)]] : [])];
  const differs = checks.filter(([, value]) => value !== count).map(([name]) => name);

  if (differs.length) {
    throw new Error(`the ${side}×${side} cylinder of the Pfaffian solver differs from ${differs.join(' and ')}`);
  }

  squares.push([side / 2, `${side}×${side}`, String(count), String(count).length, 'Pfaffian', checks.map(([name]) => name).join(', ')]);
  points.push([side, logCount(count) / side ** 2]);
}

table(['n', 'board', 'a(n)', 'digits', 'solver', 'checked against'], squares);

chart({
  title: 'Entropy per cell of the 2n × 2n cylinder against its side',
  x: { label: 'side 2n of the cylinder', min: 2, max: 20, ticks: sides },
  y: { label: 'ln a / (2n)²', min: 0.28, max: 0.42, ticks: [0.3, 0.34, 0.38, 0.42] },
  reference: { y: 0.915965594177219 / Math.PI },
  series: [{ name: 'cylinder', color: 'var(--ordinal-1)', points }],
  describe: ([side, entropy]) => `${side}×${side} cylinder, ln a / cells = ${entropy.toFixed(6)}`,
});
```

## Running time

Average time of the count inside each solver, without the start of its process, from the newest complete benchmark run in [`benchmarks/results`](../../benchmarks/results).

```js run
const { formatTime } = nb.context;

const rows = nb.context.dominoCylinderTorusBenchmark.filter(r => r.surface === 'cylinder');
const pfaffian = r => [r.pfaffianLanguages.rs, r.pfaffianLanguages.py, r.pfaffian];

table(
  ['board', 'Pfaffian, Rust', 'Pfaffian, Python', 'Pfaffian, JavaScript', 'modular, Rust', 'modular, Python', 'modular, JavaScript', 'BigInt, Rust', 'BigInt, Python', 'BigInt, JavaScript'],
  rows.map(r => [
    `${r.rowCount}×${r.colCount}`,
    ...[...pfaffian(r), r.languages.rs, r.languages.py, r.modular, r.bigintLanguages.rs, r.bigintLanguages.py, r.bigint].map(formatTime),
  ]),
  { wrapHeaders: true },
);
print(`Run: ${nb.context.benchmarkRun}`);

if (!rows.some(r => pfaffian(r).some(Boolean))) {
  print('The Pfaffian solver has no benchmark run yet.');
}
```

## PARI/GP

[`oeis/A402345/A402345.gp`](../../oeis/A402345/A402345.gp) counts the $2n \times 2n$ cylinder as a resultant. The cylinder is planar, and with the opposite sign on the edges across the seam its Kasteleyn matrix splits over the circumference, so the product over its eigenvalues is the resultant of the polynomial of [A004003](../../oeis/A004003/A004003.gp) with $Q(x) = 2 T_n((x+2)/2) + 2$. CI checks the program against the square boards of the test data up to $20 \times 20$, and [`oeis/A402345/b402345.js`](../../oeis/A402345/b402345.js) evaluates the same resultant in exact integers for the b-file.

```js run
print(require('fs').readFileSync(require('path').join(nb.context.root, 'oeis/A402345/A402345.gp'), 'utf-8').trim());
```

## Verification

The `BigInt` solver agrees with every OEIS entry below, and the modular and the Pfaffian solver with the `BigInt` one at $h = 8$. The Pfaffian solver also agrees with A402345 up to $20 \times 20$ and at $40 \times 40$, the largest board it takes. `FULL_CASES=1 node --test js/test/conformance.test.js` runs the cylinders of [`spec/cases/any-lattice-cylinder-torus-bigint.json`](../../spec/cases/any-lattice-cylinder-torus-bigint.json) through all three of them.

## The OEIS entries

- [OEIS A000129](https://oeis.org/A000129): the Pell numbers, shifted by one: the cylinders of circumference 2.
- [OEIS A004253](https://oeis.org/A004253): the cylinders $C_3 \times P_h$, at even heights.
- [OEIS A006253](https://oeis.org/A006253): the cylinders $C_4 \times P_h$.
- [OEIS A003729](https://oeis.org/A003729): the cylinders $C_5 \times P_h$, at even heights.
- [OEIS A028477](https://oeis.org/A028477): the cylinders $C_6 \times P_h$.
- [OEIS A028478](https://oeis.org/A028478): the cylinders $C_7 \times P_h$, at even heights.
- [OEIS A028479](https://oeis.org/A028479): the cylinders $C_8 \times P_h$.
- [OEIS A402345](https://oeis.org/A402345): the $2n \times 2n$ cylinders.
- [OEIS A143233](https://oeis.org/A143233): $G/\pi$, the entropy per cell of the square lattice, the dashed line of the chart.

Every row of the table in The counts is in the OEIS [2]. The cell there checks each row against its entry, with the terms as they stood on 1 November 2026, and the table below lists the heights it checked.

```js run
table(['board', 'OEIS', 'checked at'], nb.checked);
```

The $2n \times 2n$ cylinders are the entry [OEIS A402345](https://oeis.org/A402345) [2], with a b-file of $n = 0, \dots, 44$, [`oeis/A402345/b402345.txt`](../../oeis/A402345/b402345.txt). Its term $a(n)$ is the term $h = 2n$ of the row $w = 2n$, so the table of The counts holds $a(1)$ to $a(4)$. The cell checks the square boards against that b-file, $2 \times 2$ to $14 \times 14$ with the `BigInt` solver and $2 \times 2$ to $20 \times 20$ and $40 \times 40$ with the Pfaffian one.

```js run
const bFile = require('fs')
  .readFileSync(require('path').join(nb.context.root, 'oeis/A402345/b402345.txt'), 'utf-8')
  .trim()
  .split('\n')
  .map(line => BigInt(line.split(' ')[1]));
const { calculateTotalTilingCombinations } = require('./js/solvers/any-lattice-cylinder-torus-pfaffian.js');
const sides = [2, 4, 6, 8, 10, 12, 14];
const pfaffianSides = [...sides, 16, 18, 20, 40];
const diagonal = sides.filter(w => nb.count(w, w) !== bFile[w / 2]);

for (const w of pfaffianSides) {
  if ((await calculateTotalTilingCombinations({ rowCount: w, colCount: w, lattice: 'square' })) !== bFile[w / 2]) {
    diagonal.push(w);
  }
}

if (diagonal.length) {
  throw new Error(`the 2n × 2n cylinders differ from A402345 at 2n = ${diagonal.join(', ')}`);
}

table(
  ['board', 'OEIS', 'solver', 'checked at'],
  [
    ['w = h = 2n', 'A402345', 'BigInt', `2n = ${sides.join(', ')}`],
    ['w = h = 2n', 'A402345', 'Pfaffian', `2n = ${pfaffianSides.join(', ')}`],
  ],
);
```

## References
1. L. Lovász and M. D. Plummer. Determinants and matchings. Chapter 8 of *Matching Theory*, North-Holland Mathematics Studies 121 and Annals of Discrete Mathematics 29, North-Holland, Amsterdam, pp. 307-355, 1986. Lemma 8.3.3 and Theorem 8.3.4, pp. 321-322. [doi:10.1016/S0304-0208(08)73644-2](https://doi.org/10.1016/S0304-0208%2808%2973644-2)
2. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A000129](https://oeis.org/A000129), [OEIS A004253](https://oeis.org/A004253), [OEIS A006253](https://oeis.org/A006253), [OEIS A003729](https://oeis.org/A003729), [OEIS A028477](https://oeis.org/A028477), [OEIS A028478](https://oeis.org/A028478), [OEIS A028479](https://oeis.org/A028479), [OEIS A402345](https://oeis.org/A402345) and [OEIS A143233](https://oeis.org/A143233). [oeis.org](https://oeis.org)
