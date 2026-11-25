# Dominoes: tilings of the 2n × 2n torus

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/dominoes/tori.html) has the results. It counts the domino tilings of tori, boards whose opposite edges are glued in both directions. The same boards are counted on the [triangular lattice](../triangular-lattice/03-tori.md) and with [domicules](../domicules/03-tori.md), where the torus count of the three lattices is compared with their entropy; the [cylinders notebook](02-cylinders.md) glues only the left and right edges.

## The problem

On a torus both pairs of opposite edges of the board are glued, so a domino may cross the column seam, between the last and the first column, or the row seam, between the last and the first row. A domino that crosses a seam is drawn cut, with one half on each side, and the glued edges are marked, one pair with one tick and the other with two. The drawings show 4 tilings of the $8 \times 8$ torus, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 8, colCount: 8, pieces: 'domino', surface: 'torus', spread: 4 });

figure(svgs, `4 of the ${total} domino tilings of the 8 × 8 torus.`);
```

## The Pfaffian solver

[`any-lattice-cylinder-torus-pfaffian.js`](../../js/solvers/any-lattice-cylinder-torus-pfaffian.js) counts in polynomial time: it eliminates matrices of $wh \times wh$ entries. A torus is not planar, so Kasteleyn's theorem gives no single Pfaffian. Kasteleyn [1] showed for the square lattice that four are enough, one per pair of signs on the edges across the two seams: the count is half of the sum of three of them minus the fourth.

Which one is subtracted depends on the choice of the signs, so the solver forms all four such combinations. Each adds the numbers of tilings in four classes, by the parities of the dominoes across the two seams, with a sign per class. In one combination the four signs agree, so the solver returns the largest absolute value. Let $K_{\sigma\tau}$ be the skew-symmetric matrix of the board with the sign $\sigma$ on the edges across the row seam and $\tau$ on those across the column seam, $\sigma, \tau \in \{+, -\}$. Then

```math
a(w, h) = \max_{\sigma,\tau} \left\lvert \frac{1}{2} \Bigl( \sum_{\sigma',\tau'} \mathrm{Pf}\, K_{\sigma'\tau'} - 2\, \mathrm{Pf}\, K_{\sigma\tau} \Bigr) \right\rvert
```

where each Pfaffian is evaluated modulo a prime by elimination.

Inside the board it uses the signs of [`A401988.gp`](../../oeis/A401988/A401988.gp), alternating by rows or, when the number of rows is odd, by columns. The solver counts modulo primes. They are below $2^{31}$ in Rust and Python and below $2^{26}$ in JavaScript, where a sum of two products of residues has to stay exact in a double. The Chinese remainder theorem rebuilds the count, and one more prime checks it.

A board has at most 1600 cells. That is a limit of memory, because every thread keeps a whole matrix. The same algorithm is in Rust, [`any-lattice-cylinder-torus-pfaffian.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-pfaffian.rs), and in Python, [`any_lattice_cylinder_torus_pfaffian.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_pfaffian.py).

## The Modular solver

[`any-lattice-cylinder-torus-modular.js`](../../js/solvers/any-lattice-cylinder-torus-modular.js) goes cell by cell with a state of the next $w + 2$ cells. A torus is a sum over the sets $S$ of first-row cells covered from the last row. Each run starts from $S$ and must end with $S$. Rotating the columns maps the runs of $S$ onto those of its rotations, so one run per rotation class is enough. Mirroring the columns does the same on the square lattice and the king's graph, so there one run also stands for a class and its mirror image. The triangular lattice keeps the rotations only. A mirror image would turn its diagonals the other way. The solver counts modulo primes below $2^{31}$. The Chinese remainder theorem rebuilds the count, and one more prime checks it.

```math
\begin{aligned}
r_i &= \sum_{S} \mathbf{e}_{S}^{\top}\, C_{c_N} \cdots C_{c_2}\, C_{c_1}\, \mathbf{e}_{S} \bmod p_i, \\
a(w, h) &= \sum_i r_i\, M_i \bigl( M_i^{-1} \bmod p_i \bigr) \bmod M, \qquad M = \prod_i p_i, \quad M_i = M / p_i,
\end{aligned}
```

where $S$ runs over the sets of first-row cells covered from the last row, $N = wh$, $c_k$ is the column of the $k$-th cell, $C_c$ is the step that decides the cell in column $c$, $\mathbf{e}_{S}$ is the state with the cells of $S$ covered, and the $p_i$ are the primes, without the last one that only checks. One run per class of sets stands for all its members, weighted by the size of the class. The same algorithm is in Rust, [`any-lattice-cylinder-torus-modular.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-modular.rs), and in Python, [`any_lattice_cylinder_torus_modular.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_modular.py). The Rust implementation also counts modulo [wide primes](../domicules/01-rectangles.md#wide-primes), the primes below $2^{61}$.

## The BigInt solver

[`any-lattice-cylinder-torus-bigint.js`](../../js/solvers/any-lattice-cylinder-torus-bigint.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row. The torus count is then the trace of the $h$-th power of this row transfer matrix.

```math
a(w, h) = \mathrm{tr}\bigl(T^{h}\bigr) = \sum_{S} \bigl(T^{h}\bigr)_{S,S}, \qquad T_{S,S'} = \begin{cases} \mathrm{pm}\bigl(C_w - S - S'\bigr) & \text{if } S \cap S' = \varnothing, \\ 0 & \text{otherwise,} \end{cases}
```

where $S$ is the set of cells of a row covered from the row below, $S'$ the set of cells that start a vertical piece into the next row, and $\mathrm{pm}(C_w - S - S')$ the number of ways to cover the other cells of the ring of $w$ cells by horizontal pieces, one of them possibly across the seam. The same algorithm is in Rust, [`any-lattice-cylinder-torus-bigint.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-bigint.rs), and in Python, [`any_lattice_cylinder_torus_bigint.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_bigint.py).

## Numbering

The gallery numbers the tilings of the tori up to $10 \times 10$ with the cell-by-cell scan of the modular solver. The tilings are ordered by $S$ and then by the scan. The tilings of $S$ and of its rotations are equally many, so one table per rotation class gives every count, and the table of a single $S$ is rebuilt when a page needs it. The Random button draws a uniformly random number, so the sample is exact.

## The counts

Domino tilings of the $2n \times 2n$ torus are [OEIS A335586](https://oeis.org/A335586) [2]. For $n = 1$ the torus has multiple edges, because on a $2 \times 2$ torus a cell meets its right and its left neighbour in the same cell, and each edge counts as a separate domino, as in A335586. Boards up to $8 \times 8$ go through all three solvers, $10 \times 10$ and $12 \times 12$ through the modular and the Pfaffian one, and $14 \times 14$ to $20 \times 20$ through the Pfaffian one alone. Every count is compared with the terms of A335586 stored in `spec/cases/`, and the column `checked against` adds the solvers that counted the row too.

The chart draws the entropy per cell, $\ln a(n) / (2n)^2$, against the side. The dashed line is the limit of the square lattice, $G/\pi \approx 0.29156$ ([OEIS A143233](https://oeis.org/A143233) [2], $G$ is Catalan's constant). A torus has no boundary, so no term of the edges lowers the entropy per cell, and the points lie above the line and fall towards it.

```js run
const reference = require('./js/solvers/any-lattice-cylinder-torus-bigint.js');
const modular = require('./js/solvers/any-lattice-cylinder-torus-modular.js');
const pfaffian = require('./js/solvers/any-lattice-cylinder-torus-pfaffian.js');
const { testCasesOf } = require('./js/core/cases');
const stored = side =>
  testCasesOf('any-lattice-cylinder-torus-modular').find(
    t => t.lattice === 'square' && t.torus && !t.twisted && t.oeis === 'A335586' && t.rowCount === side && t.colCount === side,
  );
const { logCount } = nb.context;
const rows = [];
const points = [];

for (let n = 1; n <= 10; n++) {
  const side = 2 * n;
  const board = { rowCount: side, colCount: side, lattice: 'square', torus: true };
  const count = await pfaffian.calculateTotalTilingCombinations(board);
  const expected = stored(side);

  if (n <= 6 && (await modular.calculateTotalTilingCombinations(board)) !== count) {
    throw new Error(`the modular and the Pfaffian solver differ on the ${side}×${side} torus`);
  }

  if (n <= 4 && reference.calculateTotalTilingCombinations(board) !== count) {
    throw new Error(`the BigInt and the Pfaffian solver differ on the ${side}×${side} torus`);
  }

  if (!expected || expected.expectedResult !== String(count)) {
    throw new Error(`the ${side}×${side} torus differs from A335586`);
  }

  const checks = ['spec/cases/', n <= 6 && 'modular solver', n <= 4 && 'BigInt solver'].filter(Boolean);

  points.push([side, logCount(count) / side ** 2]);
  rows.push([n, `${side}×${side}`, String(count), String(count).length, 'Pfaffian', checks.join(', ')]);
}

table(['n', 'board', 'a(n)', 'digits', 'solver', 'checked against'], rows);

chart({
  title: 'Entropy per cell of the 2n × 2n torus against its side',
  x: { label: 'side 2n of the torus', min: 2, max: 20, ticks: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
  y: { label: 'ln a(n) / (2n)²', min: 0.28, max: 0.54, ticks: [0.3, 0.35, 0.4, 0.45, 0.5] },
  reference: { y: 0.915965594177219 / Math.PI },
  series: [{ name: 'torus', color: 'var(--ordinal-1)', points }],
  describe: ([side, entropy]) => `${side}×${side} torus, ln a / cells = ${entropy.toFixed(6)}`,
});
```

The tori of circumference 8 and 10 are in the OEIS as well, $C_8 \times C_n$ in [OEIS A253678](https://oeis.org/A253678) and $C_{10} \times C_n$ in [OEIS A281679](https://oeis.org/A281679), and the test data holds some of their terms.

## Running time

Average time of the count inside each solver, without the start of its process, from the newest complete benchmark run in [`benchmarks/results`](../../benchmarks/results).

```js run
const { formatTime } = nb.context;

const rows = nb.context.dominoCylinderTorusBenchmark.filter(r => r.surface === 'torus');
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

## Verification

The three cylinder and torus solvers agree with each other and with [OEIS A335586](https://oeis.org/A335586) and [OEIS A253678](https://oeis.org/A253678), and the modular and the Pfaffian solver also with [OEIS A281679](https://oeis.org/A281679). `FULL_CASES=1 node --test js/test/conformance.test.js` runs the tori of [`spec/cases/any-lattice-cylinder-torus-bigint.json`](../../spec/cases/any-lattice-cylinder-torus-bigint.json) through all three solvers and those of `spec/cases/any-lattice-cylinder-torus-modular.json` through the modular one, all but the 18 × 18 and 20 × 20 tori, whose counts that file copies from A335586. The Pfaffian solver counts these two as well: [`spec/cases/any-lattice-cylinder-torus-pfaffian.json`](../../spec/cases/any-lattice-cylinder-torus-pfaffian.json) holds terms of A335586 up to the 40 × 40 torus, and they agree with the b-file of the entry as it stood on 18 November 2026.

## The OEIS entries

- [OEIS A335586](https://oeis.org/A335586): the domino tilings of the $2n \times 2n$ torus, the counts of this notebook.
- [OEIS A253678](https://oeis.org/A253678): the tori $C_8 \times C_n$.
- [OEIS A281679](https://oeis.org/A281679): the tori $C_{10} \times C_n$.
- [OEIS A143233](https://oeis.org/A143233): $G/\pi$, the entropy per cell of the square lattice, the dashed line of the chart.

## References
1. P. W. Kasteleyn. The statistics of dimers on a lattice. *Physica* 27(12):1209-1225, 1961. Equation (23), p. 1219. [doi:10.1016/0031-8914(61)90063-5](https://doi.org/10.1016/0031-8914%2861%2990063-5)
2. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A335586](https://oeis.org/A335586), [OEIS A253678](https://oeis.org/A253678), [OEIS A281679](https://oeis.org/A281679) and [OEIS A143233](https://oeis.org/A143233). [oeis.org](https://oeis.org)
