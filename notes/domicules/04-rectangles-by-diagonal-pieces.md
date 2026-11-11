# Diagonal pieces: domicule tilings of the 2n × 2n board by their count (A401673)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/domicules/rectangles-by-diagonal-pieces.html) has the results. It sorts the domicule tilings of the $2n \times 2n$ board by the number of diagonal pieces, the domicules that join two cells sharing only a corner. The triangle of these counts is [OEIS A401673](https://oeis.org/A401673) [3]. The [cylinders](05-cylinders-by-diagonal-pieces.md) and [tori](06-tori-by-diagonal-pieces.md) are sorted the same way in notebooks of their own.

## The problem

A diagonal piece covers two cells that share only a corner, and on the $2n \times 2n$ board every tiling has an even number of them, anywhere from 0 to $2n^2$. The drawing shows the first tiling of the $8 \times 8$ board in the gallery's numbering for $k = 0, 8, 16$ and $32$ diagonal pieces, with the straight pieces greyed out. Only one tiling has $k = 32$.

```js run
const { drawTilings } = require('./site/notes.js');
const counts = [0, 8, 16, 32];
const svgs = counts.flatMap(k => drawTilings({ rowCount: 8, colCount: 8, pieces: 'domicule', diagonals: k, ranks: [0] }).svgs);

figure(svgs, 'Tilings of the 8 × 8 board with k = 0, 8, 16 and 32 diagonal pieces.', { highlight: true });
```

Give every diagonal piece the weight $x$. The weighted count of the $h \times w$ board is a polynomial,

```math
P_{h,w}(x) = \sum_k T(h, w, k)\, x^k,
```

where $T(h, w, k)$ counts the tilings with $k$ diagonal pieces. At $x = 0$ only dominoes are left, so $P(0)$ is the domino count ([OEIS A004003](https://oeis.org/A004003) on the $2n \times 2n$ board), and $P(1)$ is the domicule count ([OEIS A239273](https://oeis.org/A239273)). This is the dimer model of Sandvik and Moessner [1] with diagonal dimers of fugacity $x$, and the weights $x = 3/2, 2, 3$ of the [companion note on log-convexity](https://dawidrylko.github.io/lattice-dimers/papers/king-entropy-log-convexity.pdf) [2] are values of the same polynomial.

## The Modular solver

[`domicule-rectangle-polynomial-modular.js`](../../js/solvers/domicule-rectangle-polynomial-modular.js) runs the transfer of the [domicules notebook](01-rectangles.md#the-bigint-solver) with a polynomial in every state, modulo primes, one prime per worker thread. [`domicule-rectangle-polynomial-modular.rs`](../../rust/solvers/src/bin/domicule-rectangle-polynomial-modular.rs) and [`domicule_rectangle_polynomial_modular.py`](../../python/lattice_dimers/solvers/domicule_rectangle_polynomial_modular.py) count the same polynomial. Rust keeps the parity of every state as JavaScript does. Python numbers the entries of a state by the diagonal pieces on white cells, so a cell step needs no table of parities and moves whole views of the table. Its tables take half the memory of the other two, but all three cap the worker threads by the same formula, so the running times below compare the same number of threads.

## The BigInt solver

[`domicule-rectangle-polynomial-bigint.js`](../../js/solvers/domicule-rectangle-polynomial-bigint.js) runs the transfer of the [domicules notebook](01-rectangles.md#the-bigint-solver) with a polynomial in every state, and keeps its coefficients as `BigInt`, and so do its Rust and Python implementations, [`domicule-rectangle-polynomial-bigint.rs`](../../rust/solvers/src/bin/domicule-rectangle-polynomial-bigint.rs) and [`domicule_rectangle_polynomial_bigint.py`](../../python/lattice_dimers/solvers/domicule_rectangle_polynomial_bigint.py).

## Numbering

The gallery can also number only the tilings with $k$ diagonal pieces. Every entry of the table of the [domicule numbering](01-rectangles.md#numbering) then becomes a list, `table[i][state][r]`, of the completions with exactly $r \le k$ diagonal pieces, and unranking keeps the order of the full numbering. The gallery offers this up to $10 \times 10$.

A straight piece covers a black and a white cell of the chessboard, a diagonal piece two cells of one colour. So on the $2n \times 2n$ board the number of diagonal pieces is even. The count for every $k$ comes from [`domicule-rectangle-polynomial-bigint.js`](../../js/solvers/domicule-rectangle-polynomial-bigint.js) or `spec/cases/`, and the build checks that the counts add up to the number of tilings.

## The counts

A diagonal piece joins two cells of the same colour of the chessboard and a domino two cells of different colours, so every tiling has as many diagonal pieces on black cells as on white ones and their number is even. The table therefore lists $T(n, j)$, the tilings of the $2n \times 2n$ board with $2j$ diagonal pieces, for $j = 0, \dots, n^2$. When the OEIS was searched by terms and by name on 30 October 2026, before A401673 was drafted, it had no such triangle.

```js run
const reference = require('./js/solvers/domicule-rectangle-polynomial-bigint.js');
const data = require('./js/core/cases');
const stored = side => data.testCasesOf('domicule-rectangle-polynomial-modular').find(t => t.rowCount === side && t.colCount === side);
const domino = side => data.testCasesOf('domino-rectangle-formula').find(t => t.rowCount === side && t.colCount === side).expectedResult;

nb.rows = {};
const rows = [];

for (let n = 0; n <= 10; n++) {
  const side = 2 * n;
  const board = { rowCount: side, colCount: side };
  let coefficients;
  let source;

  if (n <= 6) {
    coefficients = reference.calculateDiagonalPolynomial(board);
    source = 'BigInt';
  } else if (stored(side)) {
    coefficients = stored(side).expectedResult.split(',').map(BigInt);
    source = 'spec/cases/';
  } else {
    continue;
  }

  const total = coefficients.reduce((sum, c) => sum + c, 0n);
  const row = coefficients.filter((_, k) => k % 2 === 0);
  const problems = [
    total !== (await nb.context.countDomicule(board)) && 'the sum is not A239273',
    String(coefficients[0]) !== domino(side) && 'T(n, 0) is not A004003',
    coefficients.some((c, k) => k % 2 === 1 && c !== 0n) && 'an odd number of diagonal pieces',
    row.at(-1) !== 1n && `T(n, n²) = ${row.at(-1)}`,
    n > 0 && row.at(-2) !== BigInt(n * n * (n + 1)) && `T(n, n² − 1) = ${row.at(-2)}`,
    source === 'BigInt' && stored(side) && stored(side).expectedResult !== coefficients.join(',') && 'the BigInt row differs from spec/cases/',
  ].filter(Boolean);

  if (problems.length) {
    throw new Error(`n = ${n}: ${problems.join(', ')}`);
  }

  const peak = row.indexOf(row.reduce((max, c) => (c > max ? c : max), 0n));

  nb.rows[n] = row;
  rows.push([n, `${side}×${side}`, row.length, peak, String(row[peak]).length, source]);
}

table(['n', 'board', 'terms T(n, 0..n²)', 'j of the largest term', 'digits of the largest term', 'solver'], rows);
print('The first rows:');

for (let n = 0; n <= 3; n++) {
  print(`n = ${n}: ${nb.rows[n].join(', ')}`);
}
```

Every row the cell lists passes the same checks, and the cell stops the build when one fails: the sum is A239273, $T(n, 0)$ is A004003, every odd number of diagonal pieces has no tiling, exactly one tiling uses only diagonal pieces, and $T(n, n^2 - 1) = n^2(n + 1)$ ([OEIS A011379](https://oeis.org/A011379)). The last two are observations on these rows, not proofs.

## How many pieces are diagonal

The cell prints the mean share of diagonal pieces among the $2n^2$ pieces of a uniformly random tiling, and the variance of their number per site. A free board has a boundary. In the table its correction to the share shrinks roughly like $1/n$, so the last rows are not yet the value of the infinite lattice. That value is $2\,\partial s / \partial \log x$ at $x = 1$.

```js run
const rows = Object.entries(nb.rows)
  .filter(([n]) => Number(n) > 0)
  .map(([n, row]) => {
    const total = row.reduce((sum, c) => sum + c, 0n);
    const scale = 10n ** 15n;
    const mean = Number((row.reduce((sum, c, j) => sum + 2n * BigInt(j) * c, 0n) * scale) / total) / Number(scale);
    const square = Number((row.reduce((sum, c, j) => sum + 4n * BigInt(j * j) * c, 0n) * scale) / total) / Number(scale);
    const pieces = 2 * Number(n) * Number(n);

    return [n, `${2 * n}×${2 * n}`, (mean / pieces).toFixed(6), ((square - mean * mean) / (2 * pieces)).toFixed(6)];
  });

table(['n', 'board', 'share of diagonal pieces', 'variance per site'], rows);
```

## Weighted counts

The polynomial gives the weighted count for any $x$. The cell prints $\log P(x) / (4n^2)$, the free energy per site of the weighted board. The chart draws it for every $x$ from 0 to 3 on four boards, with dots at the six weights of the table. The columns are $x = 0$ (dominoes), $1/2$, $1$ (domicules) and the weights $3/2$, $2$ and $3$ of the companion note. A free boundary keeps every value below the free energy per site of the infinite lattice at the same $x$, which is $G/\pi = 0.2915\ldots$ at $x = 0$ and $s = 0.5655\ldots$ at $x = 1$.

```js run
const weights = [[0, 1], [1, 2], [1, 1], [3, 2], [2, 1], [3, 1]];
const { logCount } = nb.context;
const evaluate = (row, [p, q]) => {
  const degree = row.length - 1;

  return row.reduce((sum, c, j) => sum + c * BigInt(p) ** BigInt(2 * j) * BigInt(q) ** BigInt(2 * (degree - j)), 0n);
};

table(
  ['n', 'board', ...weights.map(([p, q]) => `x = ${q === 1 ? p : `${p}/${q}`}`)],
  Object.entries(nb.rows)
    .filter(([n]) => Number(n) >= 3)
    .map(([n, row]) => {
      const cells = 4 * Number(n) * Number(n);

      return [
        n,
        `${2 * n}×${2 * n}`,
        ...weights.map(([p, q]) => ((logCount(evaluate(row, [p, q])) - 2 * (row.length - 1) * Math.log(q)) / cells).toFixed(6)),
      ];
    }),
);

const freeEnergy = (row, x) => {
  const terms = row.map((c, j) => (c === 0n ? -Infinity : logCount(c) + (j === 0 ? 0 : 2 * j * Math.log(x))));
  const top = Math.max(...terms);

  return top + Math.log(terms.reduce((sum, t) => sum + Math.exp(t - top), 0));
};
const shown = [4, 6, 8, 10].filter(n => nb.rows[n]);
const xs = Array.from({ length: 61 }, (_, i) => i / 20);

chart({
  title: 'log P(x) / (4n²) against the weight x of a diagonal piece, for boards 2n × 2n',
  x: { label: 'weight x of a diagonal piece', min: 0, max: 3, ticks: [0, 0.5, 1, 1.5, 2, 2.5, 3] },
  y: { label: 'log P(x) / (4n²)', min: 0.2, max: 0.9, ticks: [0.2, 0.4, 0.6, 0.8] },
  series: shown.map((n, i) => ({
    name: `${2 * n}×${2 * n}`,
    color: `var(--ordinal-${i + 1})`,
    points: xs.map(x => [x, freeEnergy(nb.rows[n], x) / (4 * n * n)]),
    markers: weights.map(([p, q]) => p / q).map(x => [x, freeEnergy(nb.rows[n], x) / (4 * n * n)]),
  })),
  describe: ([x, value]) => `x = ${x}, log P(x)/(4n²) = ${value.toFixed(6)}`,
});
```

## Running time

Average time of the count inside each solver, without the start of its process, from the newest complete benchmark run in [`benchmarks/results`](../../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['board', 'modular, Rust', 'modular, Python', 'modular, JavaScript', 'BigInt, Rust', 'BigInt, Python', 'BigInt, JavaScript'],
  nb.context.diagonalBenchmark.map(r => [
    `${r.rowCount}×${r.colCount}`,
    ...[r.languages.rs, r.languages.py, r.modular, r.bigintLanguages.rs, r.bigintLanguages.py, r.bigint].map(formatTime),
  ]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```

## PARI/GP

The polynomial $P_{h,w}(x)$ and the rows of the triangle in [`oeis/A401673/A401673.gp`](../../oeis/A401673/A401673.gp), checked in CI against the test data up to $8 \times 8$.

```js run
print(require('fs').readFileSync(require('path').join(nb.context.root, 'oeis/A401673/A401673.gp'), 'utf-8').trim());
```

## Verification

The two solvers agree with each other, with A004003 at $k = 0$ and with A239273 summed over $k$. The PARI/GP program runs in CI against the same data. The tests are in [`harness/`](../../harness), the known values in [`spec/cases/`](../../spec/cases).

## References

1. A. W. Sandvik and R. Moessner. Correlations and confinement in nonplanar two-dimensional dimer models. *Physical Review B* 73(14):144504, 2006. [doi:10.1103/PhysRevB.73.144504](https://doi.org/10.1103/PhysRevB.73.144504)
2. D. Ryłko. Log-convexity of strip dimer counts on the king's graph. Companion note, October 2026. [doi:10.5281/zenodo.23686087](https://doi.org/10.5281/zenodo.23686087)
3. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A401673](https://oeis.org/A401673), [OEIS A004003](https://oeis.org/A004003), [OEIS A239273](https://oeis.org/A239273) and [OEIS A011379](https://oeis.org/A011379). [oeis.org](https://oeis.org)
