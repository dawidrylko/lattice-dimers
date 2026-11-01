# Tori and cylinders

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/torus.html) has the results. It counts the tilings of boards whose sides are glued. A cylinder is periodic across its width, a torus in both directions. There are three lattices: the square lattice (dominoes), the triangular lattice (the square lattice with one diagonal) and the king's graph (domicules). The method is described in the [method note](01-method.md).

## How the counts are made

Two solvers count the same boards by different methods. [`periodicTilingSolver-BigInt.js`](../src/solvers/periodicTilingSolver-BigInt.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row. The torus count is then the trace of the $h$-th power of this row transfer matrix.

[`periodicTilingSolver-Modular.js`](../src/solvers/periodicTilingSolver-Modular.js) goes cell by cell, like the solver of the [A239273 notebook](03-a239273.md). Its state holds the next $w + 2$ cells and, on the king's graph with $w \ge 3$, one more bit. A domicule from the first column to the last column of the next row lies $2w - 1$ cells ahead, outside the window, so the extra bit holds it until the window gets there.

A torus is a sum over the sets $S$ of first-row cells covered from the last row. Each run starts from $S$ and must end with $S$. Rotating the columns maps the runs of $S$ onto those of its rotations, so one run per rotation class is enough. The modular solver counts modulo primes below $2^{31}$. The Chinese remainder theorem rebuilds the count, and one more prime checks it.

The square lattice checks both solvers against the OEIS. Domino tilings of the $2n \times 2n$ torus are [OEIS A335586](https://oeis.org/A335586), of $C_8 \times C_n$ [OEIS A253678](https://oeis.org/A253678), of $C_{10} \times C_n$ [OEIS A281679](https://oeis.org/A281679), of the cylinder $C_4 \times P_n$ [OEIS A006253](https://oeis.org/A006253). `node tests/testRunner.js` runs these boards and the king's graph and triangular boards of `data/periodicTilingTests.json` through both solvers. `pnpm test` runs the first seven.

The domicule tilings of the $2n \times 2n$ torus counted below are [OEIS A401670](https://oeis.org/draft/A401670). The OEIS was searched by terms and by name on 30 October 2026 and by terms again on 1 November 2026. Beyond A401670 it has no entry for king's graph or triangular tori, for the king's graph cylinders of circumference 3 to 6 or for the triangular ones of circumference 3 and 4. The cylinders of circumference 2 are linear recurrences it already lists: [OEIS A002532](https://oeis.org/A002532) on the king's graph, [OEIS A002605](https://oeis.org/A002605) on the triangular lattice. So are the king's graph cylinders of height 2, [OEIS A062510](https://oeis.org/A062510).

## The king's graph on the 2n × 2n torus: A401670

For $n = 1$ the torus has multiple edges, because on a $2 \times 2$ torus a cell meets its right and its left neighbour in the same cell; each edge counts as a separate piece, as in A335586. Boards up to $8 \times 8$ go through both solvers. The modular one counts $10 \times 10$ and $12 \times 12$. The larger boards come from `data/periodicTilingTests-Modular.json`, where it wrote them once.

```js run
const reference = require('./src/solvers/periodicTilingSolver-BigInt.js');
const modular = require('./src/solvers/periodicTilingSolver-Modular.js');
const known = require('./data').testCasesPeriodicModular;
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
    method = 'data/';
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

Since a torus has no boundary, $\log Z(L \times L) = s L^2 + c + o(1)$ has no surface or corner term, where $s$ is the entropy per site.

The cell divides the torus count by $e^{sL^2}$ on all three lattices, and the chart under the table draws the same ratios with 2 as a dashed line. For the square lattice $s = G/\pi$ ([OEIS A143233](https://oeis.org/A143233), $G$ is Catalan's constant). The triangular value comes from the Kasteleyn computation in `research/king-entropy/out/out_validate.txt`, the king's graph value from `research/king-entropy/data/errbar.json`.

```js run
const fs = require('fs');
const path = require('path');
const modular = require('./src/solvers/periodicTilingSolver-Modular.js');
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

[The paper](00-research.md) explains the constant: it splits the cylinder transfer matrix of even circumference $w$ by the parity of the dimers crossing a loop around the axis, and the two sector values $f^{(0)}_w > s > f^{(1)}_w$ approach $s$ exponentially fast. A torus of even side $L$ is the trace of the $L$-th power of that matrix, so each sector contributes about $e^{sL^2}$ and $Z \approx 2 e^{sL^2}$. How fast the ratio gets there is a separate question: on the king's graph the distance to 2 shrinks by a factor of about 8 per step of 2 in $L$. The approach to 2 and the factor 8 are observations on the boards of the table, not proofs.

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

## Cylinders

The king's graph on a cylinder of circumference $w$ and height $h$, open at the top and the bottom. For fixed $w$ the counts grow like $\lambda_w^h$, with $\lambda_w$ the leading eigenvalue of the cylinder transfer matrix that the paper extrapolates in $w$. Rows of odd circumference vanish at odd heights. Circumference 2 has the multiple edges of the $2 \times 2$ torus, so one row of two cells has 2 tilings.

```js run
const { calculateTotalTilingCombinations } = require('./src/solvers/periodicTilingSolver-BigInt.js');
const heights = [0, 1, 2, 3, 4, 5, 6, 7, 8];

table(
  ['w \\ h', ...heights.map(String)],
  [2, 3, 4, 5, 6, 7, 8].map(w => [String(w), ...heights.map(h => String(calculateTotalTilingCombinations({ rowCount: h, colCount: w })))]),
);
```

## Running time

Average wall-clock time of a full solver process on the king's graph, from the newest complete benchmark run in [`benchmarks/results`](../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['surface', 'board', 'BigInt', 'modular'],
  nb.context.periodicBenchmark.map(r => [r.surface, `${r.rowCount}×${r.colCount}`, formatTime(r.bigint), formatTime(r.modular)]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```

## PARI/GP

The torus count as the trace of the row transfer matrix in [`oeis/A401670/A401670.gp`](../oeis/A401670/A401670.gp), checked in CI against the king's graph tori of the test data up to circumference 8.

```js run
print(require('fs').readFileSync(require('path').join(nb.context.root, 'oeis/A401670/A401670.gp'), 'utf-8').trim());
```
