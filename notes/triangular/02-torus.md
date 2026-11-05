# The triangular lattice on tori

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/triangular/torus.html) has the results. It counts the perfect matchings of the triangular lattice on tori, boards whose opposite edges are glued in both directions. The project counts this lattice for comparison with [dominoes](../dominoes/03-torus.md) and [domicules](../domicules/03-torus.md) on the same boards; the notebook on domicules on tori divides the counts of all three lattices by $e^{sL^2}$. The [cylinders notebook](01-cylinder.md) glues only the left and right edges.

## The problem

The triangular lattice is the square lattice with one diagonal in every cell, the one that runs down to the right, so a tiling uses dominoes and diagonal pieces in that one direction. On a torus a piece may cross the column seam, between the last and the first column, or the row seam, between the last and the first row.

## How the counts are made

Two solvers count the same boards by different methods. [`periodicTilingSolver-BigInt.js`](../../js/solvers/periodicTilingSolver-BigInt.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row. The torus count is then the trace of the $h$-th power of this row transfer matrix.

[`periodicTilingSolver-Modular.js`](../../js/solvers/periodicTilingSolver-Modular.js) goes cell by cell with a state of the next $w + 2$ cells. A torus is a sum over the sets $S$ of first-row cells covered from the last row. Each run starts from $S$ and must end with $S$. Rotating the columns maps the runs of $S$ onto those of its rotations, so one run per rotation class is enough. The solver counts modulo primes below $2^{31}$. The Chinese remainder theorem rebuilds the count, and one more prime checks it.

## The 2n × 2n torus

For $n = 1$ the torus has multiple edges, because on a $2 \times 2$ torus a cell meets its right and its left neighbour in the same cell, and each edge counts as a separate piece. Boards up to $8 \times 8$ go through both solvers, $10 \times 10$ and $12 \times 12$ through the modular one, and every count that `spec/cases/` stores is compared with it. The OEIS was searched by terms and by name on 30 October 2026 and by terms again on 1 November 2026. It has no entry for triangular tori.

```js run
const reference = require('./js/solvers/periodicTilingSolver-BigInt.js');
const modular = require('./js/solvers/periodicTilingSolver-Modular.js');
const { testCasesPeriodic, testCasesPeriodicModular } = require('./js/core/cases');
const stored = side =>
  [...testCasesPeriodic, ...testCasesPeriodicModular].find(
    t => t.lattice === 'triangular' && t.torus && !t.twisted && t.rowCount === side && t.colCount === side,
  );
const rows = [];

for (let n = 1; n <= 6; n++) {
  const side = 2 * n;
  const board = { rowCount: side, colCount: side, lattice: 'triangular', torus: true };
  const count = await modular.calculateTotalTilingCombinations(board);
  const expected = stored(side);

  if (n <= 4 && reference.calculateTotalTilingCombinations(board) !== count) {
    throw new Error(`the two solvers differ on the ${side}×${side} torus`);
  }

  if (expected && expected.expectedResult !== String(count)) {
    throw new Error(`the ${side}×${side} torus differs from spec/cases/`);
  }

  rows.push([n, `${side}×${side}`, String(count), String(count).length, n <= 4 ? 'BigInt and modular' : 'modular', expected ? 'matches spec/cases/' : '']);
}

table(['n', 'board', 'count', 'digits', 'solver', 'status'], rows);
```

## Verification

The two periodic solvers agree with each other up to $8 \times 8$, and the modular solver checks every result against an extra prime. `node harness/testRunner.js` runs the triangular tori of [`spec/cases/periodicTilingTests.json`](../../spec/cases/periodicTilingTests.json) through both solvers and those of `spec/cases/periodicTilingTests-Modular.json` through the modular one.
