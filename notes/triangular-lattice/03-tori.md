# Triangular lattice: tilings of the 2n × 2n torus (not in the OEIS)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/triangular-lattice/tori.html) has the results. It counts the perfect matchings of the triangular lattice on tori, boards whose opposite edges are glued in both directions. The project counts this lattice for comparison with [dominoes](../dominoes/03-tori.md) and [domicules](../domicules/03-tori.md) on the same boards; the notebook on domicules on tori divides the counts of all three lattices by $e^{sL^2}$. The [cylinders notebook](02-cylinders.md) glues only the left and right edges, and the [rectangles notebook](01-rectangles.md) none.

## The problem

The triangular lattice [1] is the square lattice with one diagonal in every cell, here the one that runs down to the right, so a tiling uses dominoes and diagonal pieces in that one direction. On a torus a piece may cross the column seam, between the last and the first column, or the row seam, between the last and the first row. A piece that crosses a seam is drawn cut, with one half on each side, and the glued edges are marked, one pair with one tick and the other with two. The drawings show 4 tilings of the $8 \times 8$ torus, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 8, colCount: 8, lattice: 'triangular', surface: 'torus', spread: 4 });

figure(svgs, `4 of the ${total} tilings of the triangular lattice on the 8 × 8 torus.`);
```

## The Modular solver

[`any-lattice-cylinder-torus-modular.js`](../../js/solvers/any-lattice-cylinder-torus-modular.js) goes cell by cell with a state of the next $w + 2$ cells. A torus is a sum over the sets $S$ of first-row cells covered from the last row. Each run starts from $S$ and must end with $S$. Rotating the columns maps the runs of $S$ onto those of its rotations, so one run per rotation class is enough. The solver counts modulo primes below $2^{31}$. The Chinese remainder theorem rebuilds the count, and one more prime checks it. The same algorithm is in Rust, [`any-lattice-cylinder-torus-modular.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-modular.rs), and in Python, [`any_lattice_cylinder_torus_modular.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_modular.py).

## The BigInt solver

[`any-lattice-cylinder-torus-bigint.js`](../../js/solvers/any-lattice-cylinder-torus-bigint.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row. The torus count is then the trace of the $h$-th power of this row transfer matrix. The same algorithm is in Rust, [`any-lattice-cylinder-torus-bigint.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-bigint.rs), and in Python, [`any_lattice_cylinder_torus_bigint.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_bigint.py).

## The counts

For $n = 1$ the torus has multiple edges, because on a $2 \times 2$ torus a cell meets its right and its left neighbour in the same cell, and each edge counts as a separate piece. Boards up to $8 \times 8$ go through both solvers, $10 \times 10$ and $12 \times 12$ through the modular one, and every count that `spec/cases/` stores is compared with it. The OEIS was searched by terms and by name on 30 October 2026 and by terms again on 1 November 2026. It has no entry for triangular tori.

```js run
const reference = require('./js/solvers/any-lattice-cylinder-torus-bigint.js');
const modular = require('./js/solvers/any-lattice-cylinder-torus-modular.js');
const { testCasesOf } = require('./js/core/cases');
const stored = side =>
  testCasesOf('any-lattice-cylinder-torus-modular').find(
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

The two cylinder and torus solvers agree with each other up to $8 \times 8$, and the modular solver checks every result against an extra prime. `FULL_CASES=1 node --test js/test/conformance.test.js` runs the triangular tori of [`spec/cases/any-lattice-cylinder-torus-bigint.json`](../../spec/cases/any-lattice-cylinder-torus-bigint.json) through both solvers and those of `spec/cases/any-lattice-cylinder-torus-modular.json` through the modular one.

## References

1. P. Fendley, R. Moessner and S. L. Sondhi. Classical dimers on the triangular lattice. *Physical Review B* 66(21):214513, 2002. [doi:10.1103/PhysRevB.66.214513](https://doi.org/10.1103/PhysRevB.66.214513)
