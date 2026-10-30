# Diagonal pieces

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/diagonals.html) has the results. It sorts the domicule tilings of the $2n \times 2n$ board by the number of diagonal pieces, the domicules that join two cells sharing only a corner.

## The polynomial

Give every diagonal piece the weight $x$. The weighted count of the $h \times w$ board is a polynomial,

```math
P_{h,w}(x) = \sum_k T(h, w, k)\, x^k,
```

where $T(h, w, k)$ counts the tilings with $k$ diagonal pieces. At $x = 0$ only dominoes are left, so $P(0)$ is the domino count ([A004003](https://oeis.org/A004003) on the $2n \times 2n$ board), and $P(1)$ is the domicule count ([A239273](https://oeis.org/A239273)). This is the dimer model of Sandvik and Moessner with diagonal dimers of fugacity $x$, and the weights $x = 3/2, 2, 3$ of the companion note on log-convexity are values of the same polynomial.

`domiculeDiagonalSolver-BigInt.js` runs the transfer of the A239273 notebook with a polynomial in every state, and `domiculeDiagonalSolver-Modular.js` does the same modulo primes, one prime per worker thread. A diagonal piece joins two cells of the same colour of the chessboard and a domino two cells of different colours, so every tiling has as many diagonal pieces on black cells as on white ones and their number is even. The table therefore lists $T(n, j)$, the tilings of the $2n \times 2n$ board with $2j$ diagonal pieces, for $j = 0, \dots, n^2$. The OEIS has no such triangle; it was searched by terms on 30 October 2026.

```js run
const reference = require('./src/solvers/domiculeDiagonalSolver-BigInt.js');
const data = require('./data');
const stored = side => data.testCasesDiagonalModular.find(t => t.rowCount === side && t.colCount === side);
const domino = side => data.testCasesBigInt.find(t => t.rowCount === side && t.colCount === side).expectedResult;

nb.rows = {};
const rows = [];

for (let n = 0; n <= 9; n++) {
  const side = 2 * n;
  const board = { rowCount: side, colCount: side };
  let coefficients;
  let source;

  if (n <= 6) {
    coefficients = reference.calculateDiagonalPolynomial(board);
    source = 'BigInt';
  } else if (stored(side)) {
    coefficients = stored(side).expectedResult.split(',').map(BigInt);
    source = 'data/';
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

Every row the cell lists passes the same checks, and the cell stops the build when one fails: the sum is A239273, $T(n, 0)$ is A004003, every odd number of diagonal pieces has no tiling, exactly one tiling uses only diagonal pieces, and $T(n, n^2 - 1) = n^2(n + 1)$ ([A011379](https://oeis.org/A011379)). The last two are observations on these rows, not proofs.

## How many pieces are diagonal

The cell prints the mean share of diagonal pieces among the $2n^2$ pieces of a uniformly random tiling, and the variance of their number per cell. A free board has a boundary. In the table its correction to the share shrinks roughly like $1/n$, so the last rows are not yet the value of the infinite lattice. That value is $2\,\partial s / \partial \log x$ at $x = 1$.

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

table(['n', 'board', 'share of diagonal pieces', 'variance per cell'], rows);
```

## Weighted counts

The polynomial gives the weighted count for any $x$. The cell prints $\log P(x) / (4n^2)$, the free energy per cell of the weighted board. The columns are $x = 0$ (dominoes), $1/2$, $1$ (domicules) and the weights $3/2$, $2$ and $3$ of the companion note. A free boundary keeps every value below the free energy per site of the infinite lattice at the same $x$, which is $G/\pi = 0.2916\ldots$ at $x = 0$ and $s = 0.5655\ldots$ at $x = 1$.

```js run
const weights = [[0, 1], [1, 2], [1, 1], [3, 2], [2, 1], [3, 1]];
const log = count => {
  const digits = String(count);
  const head = digits.slice(0, 17);

  return Math.log(Number(head)) + (digits.length - head.length) * Math.LN10;
};
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
        ...weights.map(([p, q]) => ((log(evaluate(row, [p, q])) - 2 * (row.length - 1) * Math.log(q)) / cells).toFixed(6)),
      ];
    }),
);
```
