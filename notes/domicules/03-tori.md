# Domicules: tilings of the 2n × 2n torus (A401670)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/domicules/tori.html) has the results. It counts the domicule tilings of tori, boards whose opposite edges are glued in both directions; they are the perfect matchings of the king's graph on the torus. It compares the torus count of the king's graph with those of [dominoes](../dominoes/03-tori.md) and of the [triangular lattice](../triangular-lattice/02-tori.md). The [cylinders notebook](02-cylinders.md) glues only the left and right edges.

## The problem

On a torus both pairs of opposite edges of the board are glued, so a domicule may cross the column seam, between the last and the first column, or the row seam, between the last and the first row. A domicule that crosses a seam is drawn cut, with one half on each side, and the glued edges are marked, one pair with one tick and the other with two. The drawings show tilings of the $4 \times 4$ torus, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');
const { total } = drawTilings({ rowCount: 4, colCount: 4, pieces: 'domicule', surface: 'torus', ranks: [0] });
const ranks = [0, 1, 2, 3].map(i => Math.floor((Number(total) * i) / 4));
const { svgs } = drawTilings({ rowCount: 4, colCount: 4, pieces: 'domicule', surface: 'torus', ranks });

figure(svgs, `4 of the ${total} domicule tilings of the 4 × 4 torus.`);
```

## The Modular solver

[`all-lattices-cylinder-torus-modular.js`](../../js/solvers/all-lattices-cylinder-torus-modular.js) goes cell by cell, like the scan of the [rectangles notebook](01-rectangles.md#the-bigint-solver). Its state holds the next $w + 2$ cells and, with $w \ge 3$, one more bit. A domicule from the first column to the last column of the next row lies $2w - 1$ cells ahead, outside the window, so the extra bit holds it until the window gets there.

A torus is a sum over the sets $S$ of first-row cells covered from the last row. Each run starts from $S$ and must end with $S$. Rotating the columns maps the runs of $S$ onto those of its rotations, so one run per rotation class is enough. The solver counts modulo primes below $2^{31}$. The Chinese remainder theorem rebuilds the count, and one more prime checks it. The same algorithm is in Rust, [`all-lattices-cylinder-torus-modular.rs`](../../rust/solvers/src/bin/all-lattices-cylinder-torus-modular.rs), and in Python, [`all_lattices_cylinder_torus_modular.py`](../../python/lattice_dimers/solvers/all_lattices_cylinder_torus_modular.py).

## The BigInt solver

[`all-lattices-cylinder-torus-bigint.js`](../../js/solvers/all-lattices-cylinder-torus-bigint.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row. The torus count is then the trace of the $h$-th power of this row transfer matrix. The same algorithm is in Rust, [`all-lattices-cylinder-torus-bigint.rs`](../../rust/solvers/src/bin/all-lattices-cylinder-torus-bigint.rs), and in Python, [`all_lattices_cylinder_torus_bigint.py`](../../python/lattice_dimers/solvers/all_lattices_cylinder_torus_bigint.py).

## Numbering

The gallery numbers the tilings of the tori up to $10 \times 10$ with the cell-by-cell scan of the modular solver. The tilings are ordered by $S$ and then by the scan. The tilings of $S$ and of its rotations are equally many, so one table per rotation class gives every count, and the table of a single $S$ is rebuilt when a page needs it. The Random button draws a uniformly random number, so the sample is exact. The [Diagonal pieces](04-diagonal-pieces.md#numbering) notebook says how the same scan numbers only the tilings with $k$ diagonal pieces.

## The counts

The domicule tilings of the $2n \times 2n$ torus counted below are [OEIS A401670](https://oeis.org/draft/A401670) [1]. The OEIS was searched by terms and by name on 30 October 2026 and by terms again on 1 November 2026. Beyond A401670 it has no entry for king's graph tori.

For $n = 1$ the torus has multiple edges, because on a $2 \times 2$ torus a cell meets its right and its left neighbour in the same cell; each edge counts as a separate piece, as in [OEIS A335586](https://oeis.org/A335586) [1]. Boards up to $8 \times 8$ go through both solvers. The modular one counts $10 \times 10$ and $12 \times 12$. The larger boards come from `spec/cases/all-lattices-cylinder-torus-modular.json`, where it wrote them once.

```js run
const reference = require('./js/solvers/all-lattices-cylinder-torus-bigint.js');
const modular = require('./js/solvers/all-lattices-cylinder-torus-modular.js');
const known = require('./js/core/cases').testCasesOf('all-lattices-cylinder-torus-modular');
const stored = (side, twisted) =>
  known.find(t => t.lattice === 'king' && t.torus && !t.twisted === !twisted && t.rowCount === side && t.colCount === side);

nb.torus = {};
nb.twisted = {};
const rows = [];

for (let n = 1; n <= 8; n++) {
  const side = 2 * n;
  const board = { rowCount: side, colCount: side, lattice: 'king', torus: true };
  let count;
  let twisted;
  let method;

  if (n <= 6) {
    count = await modular.calculateTotalTilingCombinations(board);
    twisted = await modular.calculateTotalTilingCombinations({ ...board, twisted: true });
    method = 'modular';

    if (n <= 4) {
      const check = reference.calculateTotalTilingCombinations(board);
      const checkTwisted = reference.calculateTotalTilingCombinations({ ...board, twisted: true });

      if (check !== count || checkTwisted !== twisted) {
        throw new Error(`the two solvers differ on the ${side}×${side} torus`);
      }

      method = 'BigInt and modular';
    }
  } else if (stored(side, false)) {
    count = BigInt(stored(side, false).expectedResult);
    twisted = stored(side, true) ? BigInt(stored(side, true).expectedResult) : null;
    method = 'spec/cases/';
  } else {
    continue;
  }

  nb.torus[side] = count;
  nb.twisted[side] = twisted;
  rows.push([n, `${side}×${side}`, String(count), String(count).length, method]);
}

table(['n', 'board', 'a(n)', 'digits', 'solver'], rows);
```

## Three lattices on the torus

Since a torus has no boundary, $\log Z(L \times L) = s L^2 + c + o(1)$ has no surface or corner term, where $s$ is the entropy per site [2].

The cell divides the torus count by $e^{sL^2}$ on the king's graph and, for comparison, on the square lattice of the [domino tori](../dominoes/03-tori.md) and on the [triangular lattice](../triangular-lattice/02-tori.md), and the chart under the table draws the same ratios with 2 as a dashed line. For the square lattice $s = G/\pi$ ([OEIS A143233](https://oeis.org/A143233) [1], $G$ is Catalan's constant). The triangular value comes from the Kasteleyn computation in `research/king-entropy/out/out_validate.txt`, the king's graph value from `research/king-entropy/data/errbar.json`.

```js run
const fs = require('fs');
const path = require('path');
const modular = require('./js/solvers/all-lattices-cylinder-torus-modular.js');
const root = nb.context.root;
const validate = fs.readFileSync(path.join(root, 'research/king-entropy/out/out_validate.txt'), 'utf-8');
const [, triangular] = validate.match(/Kasteleyn Bloch average, 64x64 grid: s_tri = ([0-9.]+)/);
const king = JSON.parse(fs.readFileSync(path.join(root, 'research/king-entropy/data/errbar.json'), 'utf-8')).recommended.s;
const entropy = { square: 0.29156090403081878, triangular: Number(triangular), king: Number(king) };
const { logCount } = nb.context;

nb.entropy = entropy;
nb.ratio = {};
const rows = [];

for (const side of Object.keys(nb.torus).map(Number)) {
  const ratios = {};

  for (const lattice of ['square', 'triangular', 'king']) {
    const count = lattice === 'king' ? nb.torus[side] : side <= 12 ? await modular.calculateTotalTilingCombinations({ rowCount: side, colCount: side, lattice, torus: true }) : null;

    ratios[lattice] = count === null ? null : Math.exp(logCount(count) - entropy[lattice] * side * side);
  }

  nb.ratio[side] = ratios;
  rows.push([
    `${side}×${side}`,
    ...['square', 'triangular', 'king'].map(lattice => (ratios[lattice] === null ? '' : ratios[lattice].toFixed(10))),
  ]);
}

const kingSides = Object.keys(nb.ratio).map(Number).filter(side => side >= 4);
const gaps = kingSides.map(side => nb.ratio[side].king - 2);

if (gaps.some((gap, i) => !(gap > 0) || (i > 0 && !(gap < gaps[i - 1])))) {
  throw new Error(`the king's graph ratio does not approach 2 from above: ${gaps.join(', ')}`);
}

table(['torus', 'square', 'triangular', 'king'], rows);

const lattices = [
  ['square', 'square lattice', 'var(--series-1)'],
  ['triangular', 'triangular', 'var(--series-2)'],
  ['king', "king's graph", 'var(--series-3)'],
];
const sides = Object.keys(nb.ratio).map(Number);

chart({
  title: 'The torus count divided by e^(sL²) against the side L, for three lattices',
  x: { label: 'side L of the L × L torus', min: 2, max: Math.max(...sides), ticks: sides },
  y: { label: 'Z / e^(sL²)', min: 1.9, max: 2.65, ticks: [2, 2.2, 2.4, 2.6] },
  reference: { y: 2 },
  series: lattices.map(([lattice, name, color]) => ({
    name,
    color,
    points: sides.filter(side => nb.ratio[side][lattice] !== null).map(side => [side, nb.ratio[side][lattice]]),
  })),
  describe: ([side, ratio]) => `${side}×${side} torus, Z/e^(sL²) = ${ratio.toFixed(10)}`,
});
```

The square lattice is critical, and its ratio drifts with $L$ well above 2. On the triangular lattice and on the king's graph the ratio tends to 2.

[The paper](https://dawidrylko.github.io/lattice-dimers/papers/king-entropy.pdf) explains the constant: it splits the cylinder transfer matrix of even circumference $w$ by the parity of the dimers crossing a loop around the axis, and the two sector values $f^{(0)}_w > s > f^{(1)}_w$ approach $s$ exponentially fast. A torus of even side $L$ is the trace of the $L$-th power of that matrix, so each sector contributes about $e^{sL^2}$ and $Z \approx 2 e^{sL^2}$. How fast the ratio gets there is a separate question: on the king's graph the distance to 2 shrinks by a factor of about 8 per step of 2 in $L$. The approach to 2 and the factor 8 are observations on the boards of the table, not proofs.

With no surface term, $\log(Z/2)/L^2$ can be compared with $s$ directly. The difference shrinks exponentially in $L$, with no fit and no extrapolation model. It is a check on the value of $s$ from the paper, because the constant 2 was itself read off against $s$.

```js run
const s = nb.entropy.king;
const { logCount } = nb.context;
const rows = Object.keys(nb.torus)
  .map(Number)
  .filter(side => side >= 4)
  .map((side, i, sides) => {
    const difference = (logCount(nb.torus[side]) - Math.LN2) / (side * side) - s;
    const before = i > 0 ? (logCount(nb.torus[sides[i - 1]]) - Math.LN2) / (sides[i - 1] * sides[i - 1]) - s : null;

    return [`${side}×${side}`, difference.toExponential(2), before === null ? '' : (before / difference).toFixed(2)];
  });

table(['torus', 'log(Z/2)/L² − s', 'factor per step'], rows);
```

## The seam sign

The signed sum counts every tiling of the torus with $(-1)^k$, where $k$ is the number of pieces that cross the seam between the last and the first column. The sum is the difference between the two parities of the pieces crossing a vertical loop. On the king's graph its share of $Z$ falls by a factor per step of 2 in $L$. In the table that factor grows with $L$ and stays below $e^{2/\xi} \approx 5.04$, where $\xi$ is the decay length of the parity splitting from `research/king-entropy/log-convexity/out_levels.txt`. With an odd number of rows the signed sum is 0, because moving every piece one column to the right then changes the parity of the seam crossings.

```js run
const fs = require('fs');
const path = require('path');
const levels = fs.readFileSync(path.join(nb.context.root, 'research/king-entropy/log-convexity/out_levels.txt'), 'utf-8');
const [, xi] = levels.match(/RESULT xi = 1\/m_v = ([0-9.]+)/);
const sides = Object.keys(nb.twisted).map(Number).filter(side => nb.twisted[side] !== null);
const share = side => Number(nb.twisted[side] * 10n ** 18n / nb.torus[side]) / 1e18;

table(
  ['torus', 'signed sum', 'share of Z', 'factor per step'],
  sides.map((side, i) => [
    `${side}×${side}`,
    String(nb.twisted[side]),
    share(side).toExponential(2),
    i > 0 ? (share(sides[i - 1]) / share(side)).toFixed(2) : '',
  ]),
);
print(`e^(2/ξ) = ${Math.exp(2 / Number(xi)).toFixed(2)} with ξ = ${nb.context.roundDecimal(xi, 6)}`);
```

## Running time

Average time of the count inside each solver on the king's graph, without the start of its process, from the newest complete benchmark run in [`benchmarks/results`](../../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['board', 'modular, Rust', 'modular, Python', 'modular, JavaScript', 'BigInt, Rust', 'BigInt, Python', 'BigInt, JavaScript'],
  nb.context.periodicBenchmark
    .filter(r => r.surface === 'torus')
    .map(r => [
      `${r.rowCount}×${r.colCount}`,
      ...[r.languages.rs, r.languages.py, r.modular, r.bigintLanguages.rs, r.bigintLanguages.py, r.bigint].map(formatTime),
    ]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```

## PARI/GP

The torus count as the trace of the row transfer matrix in [`oeis/A401670/A401670.gp`](../../oeis/A401670/A401670.gp), checked in CI against the king's graph tori of the test data up to circumference 8.

```js run
print(require('fs').readFileSync(require('path').join(nb.context.root, 'oeis/A401670/A401670.gp'), 'utf-8').trim());
```

## Verification

The two cylinder and torus solvers agree with each other up to $8 \times 8$, the modular solver checks every result against an extra prime, and the PARI/GP program runs in CI against the king's graph tori of the test data. `node harness/testRunner.js` runs the king's graph boards of [`spec/cases/all-lattices-cylinder-torus-bigint.json`](../../spec/cases/all-lattices-cylinder-torus-bigint.json) through both solvers.

## References

1. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A401670](https://oeis.org/draft/A401670), [OEIS A335586](https://oeis.org/A335586) and [OEIS A143233](https://oeis.org/A143233). [oeis.org](https://oeis.org)
2. D. Ryłko. The dimer entropy of the king's graph. Preprint, October 2026. [doi:10.5281/zenodo.23686056](https://doi.org/10.5281/zenodo.23686056)
