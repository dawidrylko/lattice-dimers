# Tori and cylinders

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/torus.html) has the results. It counts the tilings of boards whose sides are glued: a cylinder, periodic across its width, and a torus, periodic in both directions, for the square lattice (dominoes), the triangular lattice (the square lattice with one diagonal) and the king's graph (domicules).

## How the counts are made

Two solvers count the same boards by different methods. `periodicTilingSolver-BigInt.js` goes row by row: for every set of cells of a row already covered from the row below it lists the ways to finish the row, and the torus count is the trace of the $h$-th power of that row transfer matrix. `periodicTilingSolver-Modular.js` goes cell by cell, like the solver of the [A239273 notebook](03-a239273.md), with a state of the next $w + 2$ cells and one more bit: a domicule from the first column to the last column of the next row lies $2w - 1$ cells ahead, outside the window, and the extra bit holds it until the window gets there. A torus is a sum over the sets $S$ of first-row cells covered from the last row, each run starting from $S$ and ending with $S$; rotating the columns maps the runs of $S$ onto those of its rotations, so one run per rotation class is enough. The modular solver counts modulo primes below $2^{31}$ and rebuilds the count with the Chinese remainder theorem, with one more prime as a check.

The square lattice checks both solvers against the OEIS: domino tilings of the $2n \times 2n$ torus are [A335586](https://oeis.org/A335586), of $C_8 \times C_n$ [A253678](https://oeis.org/A253678), of $C_{10} \times C_n$ [A281679](https://oeis.org/A281679), and of the cylinder $C_4 \times P_n$ [A006253](https://oeis.org/A006253). `pnpm test` runs those boards and the king's graph and triangular boards of `data/periodicTilingTests.json` through both solvers. No king's graph or triangular board of this notebook has an OEIS entry; the OEIS was searched by terms and by name on 30 October 2026.

## The king's graph on the 2n × 2n torus

For $n = 1$ the torus has multiple edges: on a $2 \times 2$ torus a cell meets its right and its left neighbour in the same cell. Each edge is counted as a separate piece, as in A335586. Boards up to $8 \times 8$ go through both solvers, $10 \times 10$ and $12 \times 12$ through the modular one, and the larger boards are read from `data/periodicTilingTests-Modular.json`, where the modular solver wrote them once.

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

      method = 'row transfer and modular';
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

On a torus there is no boundary, so $\log Z(L \times L) = s L^2 + c + o(1)$ with no surface or corner term, where $s$ is the entropy per site. The cell divides the torus count by $e^{sL^2}$ for the three lattices, with $s = G/\pi$ for the square lattice ([A143233](https://oeis.org/A143233), $G$ is Catalan's constant), $s$ of the triangular lattice from the Kasteleyn computation in `research/king-entropy/out/out_validate.txt`, and $s$ of the king's graph from `research/king-entropy/data/errbar.json`.

```js run
const fs = require('fs');
const path = require('path');
const modular = require('./src/solvers/periodicTilingSolver-Modular.js');
const root = nb.context.root;
const validate = fs.readFileSync(path.join(root, 'research/king-entropy/out/out_validate.txt'), 'utf-8');
const [, triangular] = validate.match(/Kasteleyn Bloch average, 64x64 grid: s_tri = ([0-9.]+)/);
const king = JSON.parse(fs.readFileSync(path.join(root, 'research/king-entropy/data/errbar.json'), 'utf-8')).recommended.s;
const entropy = { square: 0.29156090403081878, triangular: Number(triangular), king: Number(king) };
const log = count => {
  const digits = String(count);
  const head = digits.slice(0, 17);

  return Math.log(Number(head)) + (digits.length - head.length) * Math.LN10;
};

nb.log = log;
nb.entropy = entropy;
nb.ratio = {};
const rows = [];

for (const side of Object.keys(nb.torus).map(Number)) {
  const ratios = {};

  for (const lattice of ['square', 'triangular', 'king']) {
    const count = lattice === 'king' ? nb.torus[side] : side <= 12 ? await modular.calculateTotalTilingCombinations({ rowCount: side, colCount: side, lattice, torus: true }) : null;

    ratios[lattice] = count === null ? null : Math.exp(log(count) - entropy[lattice] * side * side);
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
```

The square lattice is critical: its ratio drifts with $L$ and does not settle at 2. On the triangular lattice and on the king's graph the ratio tends to 2; on the king's graph the distance to 2 shrinks by a factor of about 8 per step of 2 in $L$. The paper splits the cylinder transfer matrix of even circumference $w$ by the parity of the number of dimers crossing a loop around the axis, and the two sector values $f^{(0)}_w > s > f^{(1)}_w$ approach $s$ exponentially fast. A torus of even side $L$ is the trace of the $L$-th power of that matrix, so each sector contributes about $e^{sL^2}$ and $Z \approx 2 e^{sL^2}$. This is an observation on the boards of the table, not a proof.

Without a surface or corner term, the torus gives the entropy of the king's graph directly: $\log(Z/2)/L^2$ differs from $s$ by a quantity that shrinks exponentially in $L$, with no fit and no extrapolation model.

```js run
const s = nb.entropy.king;
const rows = Object.keys(nb.torus)
  .map(Number)
  .filter(side => side >= 4)
  .map((side, i, sides) => {
    const difference = (nb.log(nb.torus[side]) - Math.LN2) / (side * side) - s;
    const before = i > 0 ? (nb.log(nb.torus[sides[i - 1]]) - Math.LN2) / (sides[i - 1] * sides[i - 1]) - s : null;

    return [`${side}×${side}`, difference.toExponential(2), before === null ? '' : (before / difference).toFixed(2)];
  });

table(['torus', 'log(Z/2)/L² − s', 'ratio to the previous size'], rows);
```

## The seam sign

The signed sum counts every tiling of the torus with $(-1)^k$, where $k$ is the number of pieces that cross the seam between the last and the first column. It is the difference between the two parities of the pieces crossing a vertical loop. On the king's graph its share of $Z$ falls by a factor per step of 2 in $L$ that grows with $L$ and stays below $e^{2/\xi} \approx 5.04$, where $\xi$ is the decay length of the parity splitting from `research/king-entropy/log-convexity/out_levels.txt`.

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
    share(side).toExponential(3),
    i > 0 ? (share(sides[i - 1]) / share(side)).toFixed(3) : '',
  ]),
);
print(`e^(2/xi) = ${Math.exp(2 / Number(xi)).toFixed(3)} with xi = ${xi}`);
```

## Cylinders

The king's graph on a cylinder of circumference $w$ and height $h$, open at the top and the bottom. For fixed $w$ the counts grow like $\lambda_w^h$, where $\lambda_w$ is the leading eigenvalue of the cylinder transfer matrix that the paper extrapolates in $w$. The rows of odd circumference vanish at odd heights.

```js run
const { calculateTotalTilingCombinations } = require('./src/solvers/periodicTilingSolver-BigInt.js');
const heights = [0, 1, 2, 3, 4, 5, 6, 7, 8];

table(
  ['w \\ h', ...heights.map(String)],
  [2, 3, 4, 5, 6, 7, 8].map(w => [String(w), ...heights.map(h => String(calculateTotalTilingCombinations({ rowCount: h, colCount: w })))]),
);
```
