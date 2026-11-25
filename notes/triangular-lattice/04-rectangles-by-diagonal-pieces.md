# Diagonal pieces: triangular lattice tilings of the 2n × 2n board by their count

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/triangular-lattice/rectangles-by-diagonal-pieces.html) has the results. It sorts the tilings of the triangular lattice on the $2n \times 2n$ board by the number of diagonal pieces, as the [domicule notebook](../domicules/04-rectangles-by-diagonal-pieces.md) sorts the domicule tilings. The tilings themselves are counted in the [rectangles notebook](01-rectangles.md). The [cylinders](05-cylinders-by-diagonal-pieces.md) and [tori](06-tori-by-diagonal-pieces.md) are sorted the same way in notebooks of their own.

## The problem

On the triangular lattice a diagonal piece covers two cells joined by the diagonal that runs down to the right, and every other piece is a domino. The drawing shows the first tiling of the $8 \times 8$ board in the gallery's numbering for $k = 0, 8, 16$ and $24$ diagonal pieces, with the straight pieces greyed out. No tiling of this board has more than 24.

```js run
const { drawTilings } = require('./site/notes.js');
const counts = [0, 8, 16, 24];
const svgs = counts.flatMap(k => drawTilings({ rowCount: 8, colCount: 8, lattice: 'triangular', diagonals: k, ranks: [0] }).svgs);

figure(svgs, 'Tilings of the triangular lattice on the 8 × 8 board with k = 0, 8, 16 and 24 diagonal pieces.', { highlight: true });
```

Give every diagonal piece the weight $x$. The weighted count of the $h \times w$ board is a polynomial,

```math
P_{h,w}(x) = \sum_k T(h, w, k)\, x^k,
```

where $T(h, w, k)$ counts the tilings with $k$ diagonal pieces. At $x = 0$ only dominoes are left, so $P(0)$ is the domino count ([OEIS A004003](https://oeis.org/A004003) on the $2n \times 2n$ board), and $P(1)$ is the count of the triangular lattice ([OEIS A401988](https://oeis.org/A401988)) [1]. This is the dimer model of Fendley, Moessner and Sondhi [2] with the diagonal dimers given the fugacity $x$.

## The Modular solver

[`any-lattice-rectangle-polynomial-modular.js`](../../js/solvers/any-lattice-rectangle-polynomial-modular.js) runs the transfer of the [rectangles notebook](01-rectangles.md#the-bigint-solver) with a polynomial in every state, modulo primes, one prime per worker thread, and `--lattice triangular` chooses this lattice. The number of primes comes from the Kahn-Lovász bound of the king's graph, as in the [rectangles notebook](01-rectangles.md#the-modular-solver). [`any-lattice-rectangle-polynomial-modular.rs`](../../rust/solvers/src/bin/any-lattice-rectangle-polynomial-modular.rs) and [`any_lattice_rectangle_polynomial_modular.py`](../../python/lattice_dimers/solvers/any_lattice_rectangle_polynomial_modular.py) count the same polynomial. On the king's graph, the default lattice, all three give the polynomial of the [domicule solver](../domicules/04-rectangles-by-diagonal-pieces.md#the-modular-solver).

## The BigInt solver

[`any-lattice-rectangle-polynomial-bigint.js`](../../js/solvers/any-lattice-rectangle-polynomial-bigint.js) runs the same transfer with `BigInt` coefficients, and so do its Rust and Python implementations, [`any-lattice-rectangle-polynomial-bigint.rs`](../../rust/solvers/src/bin/any-lattice-rectangle-polynomial-bigint.rs) and [`any_lattice_rectangle_polynomial_bigint.py`](../../python/lattice_dimers/solvers/any_lattice_rectangle_polynomial_bigint.py). In every language this solver is the reference of the modular one.

## Numbering

The gallery can also number only the tilings with $k$ diagonal pieces, with the table of the [domicule numbering by diagonal pieces](../domicules/04-rectangles-by-diagonal-pieces.md#numbering) without the down-left neighbour. Unranking keeps the order of the [full numbering](01-rectangles.md#numbering), and the gallery offers this up to $10 \times 10$. The count for every $k$ comes from [`any-lattice-rectangle-polynomial-bigint.js`](../../js/solvers/any-lattice-rectangle-polynomial-bigint.js) or `spec/cases/`, and the build checks that the counts add up to the number of tilings.

## The counts

A diagonal piece joins two cells of the same colour of the chessboard and a domino two cells of different colours, so every tiling has as many diagonal pieces on black cells as on white ones and their number is even. The table therefore lists $T(n, j)$, the tilings of the $2n \times 2n$ board with $2j$ diagonal pieces.

At most $2n^2 - 2n$ of the $2n^2$ pieces are diagonal. The cells with $r - c = d$ form a line that a diagonal piece never leaves, and the $2n$ lines with $d$ odd have an odd number of cells, $2n - |d|$. A domino covers two cells whose values of $r - c$ differ by one, so exactly one of its cells lies on an odd line, and every odd line needs a domino. A tiling therefore has at least $2n$ dominoes, and $j$ runs from $0$ to $n^2 - n$. When the OEIS was searched on 17 November 2026 by the terms of the rows for $n = 2$ and $n = 3$, and by the counts of the tilings with the most diagonal pieces, it had none of them.

```js run
const reference = require('./js/solvers/any-lattice-rectangle-polynomial-bigint.js');
const data = require('./js/core/cases');
const stored = side =>
  data.testCasesOf('any-lattice-rectangle-polynomial-modular').find(t => t.lattice === 'triangular' && t.rowCount === side && t.colCount === side);
const total = side =>
  data.testCasesOf('any-lattice-rectangle-modular').find(t => t.lattice === 'triangular' && t.rowCount === side && t.colCount === side).expectedResult;
const domino = side => data.testCasesOf('domino-rectangle-formula').find(t => t.rowCount === side && t.colCount === side).expectedResult;
const factorial = m => (m <= 1 ? 1n : BigInt(m) * factorial(m - 1));

nb.rows = {};
const rows = [];

for (let n = 0; n <= 10; n++) {
  const side = 2 * n;
  const board = { rowCount: side, colCount: side, lattice: 'triangular' };
  let coefficients;
  let source;

  if (n <= 5) {
    coefficients = reference.calculateDiagonalPolynomial(board);
    source = 'BigInt';
  } else if (stored(side)) {
    coefficients = stored(side).expectedResult.split(',').map(BigInt);
    source = 'spec/cases/';
  } else {
    continue;
  }

  const row = coefficients.filter((_, k) => k % 2 === 0);
  const last = n * n - n;
  const problems = [
    String(coefficients.reduce((sum, c) => sum + c, 0n)) !== total(side) && 'the sum is not A401988',
    String(coefficients[0]) !== domino(side) && 'T(n, 0) is not A004003',
    coefficients.some((c, k) => k % 2 === 1 && c !== 0n) && 'an odd number of diagonal pieces',
    row.some((c, j) => j > last && c !== 0n) && `a tiling with more than ${2 * last} diagonal pieces`,
    row[last] !== factorial(2 * Math.floor(n / 2)) * factorial(2 * Math.ceil(n / 2)) && `T(n, n² − n) = ${row[last]}`,
    source === 'BigInt' && stored(side) && stored(side).expectedResult !== coefficients.join(',') && 'the BigInt row differs from spec/cases/',
  ].filter(Boolean);

  if (problems.length) {
    throw new Error(`n = ${n}: ${problems.join(', ')}`);
  }

  const shown = row.slice(0, last + 1);
  const peak = shown.indexOf(shown.reduce((max, c) => (c > max ? c : max), 0n));

  nb.rows[n] = shown;
  rows.push([n, `${side}×${side}`, shown.length, peak, String(shown[peak]).length, source]);
}

table(['n', 'board', 'terms T(n, 0..n² − n)', 'j of the largest term', 'digits of the largest term', 'solver'], rows);
print('The first rows:');

for (let n = 0; n <= 3; n++) {
  print(`n = ${n}: ${nb.rows[n].join(', ')}`);
}
```

Every row the cell lists passes the same checks, and the cell stops the build when one fails: the sum is A401988, $T(n, 0)$ is A004003, every odd number of diagonal pieces has no tiling, no tiling has more than $2n^2 - 2n$ diagonal pieces, and the tilings with exactly that many number $(2\lfloor n/2 \rfloor)!\,(2\lceil n/2 \rceil)!$. The bound is proved above; the factorial count is an observation on these rows, not a proof.

## How many pieces are diagonal

The cell prints the mean share of diagonal pieces among the $2n^2$ pieces of a uniformly random tiling, and the variance of their number per site. A free board has a boundary, so the last rows are not yet the value of the infinite lattice. On the $n \times n$ torus the share is exactly $1/3$ ([tori by diagonal pieces](06-tori-by-diagonal-pieces.md#the-counts)).

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

The polynomial gives the weighted count for any $x$. The cell prints $\log P(x) / (4n^2)$, the free energy per site of the weighted board, at the six weights of the [domicule table](../domicules/04-rectangles-by-diagonal-pieces.md#weighted-counts): $x = 0$ (dominoes), $1/2$, $1$ (the triangular lattice), $3/2$, $2$ and $3$. The chart draws it for every $x$ from 0 to 3 on four boards, with dots at the same six weights. Two tilings placed side by side tile the joined board, so $\log P(x)$ is superadditive in each side, and the value of a free board never exceeds the free energy per site of the infinite lattice at the same $x$. That is $G/\pi = 0.2915\ldots$ at $x = 0$, with $G$ Catalan's constant, and at $x = 1$ the entropy per site of the triangular lattice [2], $s = 0.4285\ldots$, which the cell reads from the Kasteleyn computation in `research/king-entropy/out/out_validate.txt`. The cell stops the build when a board of the table reaches either value.

```js run
const fs = require('fs');
const path = require('path');
const { logCount, root } = nb.context;
const validate = fs.readFileSync(path.join(root, 'research/king-entropy/out/out_validate.txt'), 'utf-8');
const squareEntropy = 0.29156090403081878;
const triangularEntropy = Number(validate.match(/Kasteleyn Bloch average, 64x64 grid: s_tri = ([0-9.]+)/)[1]);
const weights = [[0, 1], [1, 2], [1, 1], [3, 2], [2, 1], [3, 1]];
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
      const values = weights.map(([p, q]) => (logCount(evaluate(row, [p, q])) - 2 * (row.length - 1) * Math.log(q)) / cells);

      if (!(values[0] < squareEntropy && values[2] < triangularEntropy)) {
        throw new Error(`the ${2 * n}×${2 * n} board reaches the free energy per site of the infinite lattice`);
      }

      return [n, `${2 * n}×${2 * n}`, ...values.map(value => value.toFixed(6))];
    }),
);

const freeEnergy = (row, x) => {
  const terms = row.map((c, j) => (c === 0n ? -Infinity : logCount(c) + (j === 0 ? 0 : 2 * j * Math.log(x))));
  const top = Math.max(...terms);

  return top + Math.log(terms.reduce((sum, t) => sum + Math.exp(t - top), 0));
};
const shown = [5, 6, 7, 8].filter(n => nb.rows[n]);
const xs = Array.from({ length: 61 }, (_, i) => i / 20);

chart({
  title: 'log P(x) / (4n²) against the weight x of a diagonal piece, for boards 2n × 2n',
  x: { label: 'weight x of a diagonal piece', min: 0, max: 3, ticks: [0, 0.5, 1, 1.5, 2, 2.5, 3] },
  y: { label: 'log P(x) / (4n²)', min: 0.2, max: 0.7, ticks: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7] },
  series: shown.map((n, i) => ({
    name: `${2 * n}×${2 * n}`,
    color: `var(--ordinal-${i + 1})`,
    points: xs.map(x => [x, freeEnergy(nb.rows[n], x) / (4 * n * n)]),
    markers: weights.map(([p, q]) => p / q).map(x => [x, freeEnergy(nb.rows[n], x) / (4 * n * n)]),
  })),
  describe: ([x, value]) => `x = ${x}, log P(x)/(4n²) = ${value.toFixed(6)}`,
});
```

## Verification

The two solvers agree with each other in Rust, Python and JavaScript, with A004003 at $k = 0$ and with A401988 summed over $k$, on the rectangles of up to 20 cells with every tiling listed one by one, and on the king's graph and the square lattice with the domicule polynomial and the domino count. The numbering by diagonal pieces is checked against these counts up to $6 \times 6$, its first and last tiling of every $k$ for coverage, for the number of diagonal pieces and for the missing down-left diagonal, and on the $4 \times 4$ board for the order of the full numbering. The tests are in [`harness/`](../../harness), [`js/test/`](../../js/test), [`python/tests/`](../../python/tests) and [`rust/tests/`](../../rust/tests), the known values in [`spec/cases/`](../../spec/cases).

## The OEIS entries

The triangle of these counts is not in the OEIS. Two of its sums are:

- [OEIS A004003](https://oeis.org/A004003): its column $k = 0$, $P(0)$.
- [OEIS A401988](https://oeis.org/A401988): its row sums, $P(1)$.

## References
1. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A004003](https://oeis.org/A004003) and [OEIS A401988](https://oeis.org/A401988). [oeis.org](https://oeis.org)
2. P. Fendley, R. Moessner and S. L. Sondhi. Classical dimers on the triangular lattice. *Physical Review B* 66(21):214513, 2002. [doi:10.1103/PhysRevB.66.214513](https://doi.org/10.1103/PhysRevB.66.214513)
