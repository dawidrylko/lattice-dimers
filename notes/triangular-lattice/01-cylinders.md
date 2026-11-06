# Triangular lattice: tilings of cylinders (A002605)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/triangular-lattice/cylinders.html) has the results. It counts the perfect matchings of the triangular lattice on cylinders, boards of circumference $w$ and height $h$ whose left and right edges are glued and which are open at the top and the bottom. The project counts this lattice for comparison with [dominoes](../dominoes/02-cylinders.md) and [domicules](../domicules/02-cylinders.md) on the same boards; the gallery does not draw it.

## The problem

The triangular lattice [2] is the square lattice with one diagonal in every cell, here the one that runs down to the right. A tiling uses dominoes and diagonal pieces in that one direction, so it lies between a domino tiling, which has no diagonal piece, and a domicule tiling, which may use both diagonals. On a cylinder a piece may cross the seam between the last and the first column.

## The Modular solver

[`all-lattices-cylinder-torus-modular.js`](../../js/solvers/all-lattices-cylinder-torus-modular.js) goes cell by cell, from the empty state to the empty state, with a state of the next $w + 2$ cells. It counts modulo primes below $2^{31}$, the Chinese remainder theorem rebuilds the count, and one more prime checks it. The same algorithm is in Rust, [`all-lattices-cylinder-torus-modular.rs`](../../rust/solvers/src/bin/all-lattices-cylinder-torus-modular.rs), and in Python, [`all_lattices_cylinder_torus_modular.py`](../../python/lattice_dimers/solvers/all_lattices_cylinder_torus_modular.py).

## The BigInt solver

[`all-lattices-cylinder-torus-bigint.js`](../../js/solvers/all-lattices-cylinder-torus-bigint.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row, and the cylinder count is the entry of the $h$-th power of this row transfer matrix from the empty row to the empty row. The same algorithm is in Rust, [`all-lattices-cylinder-torus-bigint.rs`](../../rust/solvers/src/bin/all-lattices-cylinder-torus-bigint.rs), and in Python, [`all_lattices_cylinder_torus_bigint.py`](../../python/lattice_dimers/solvers/all_lattices_cylinder_torus_bigint.py).

## The counts

Two solvers count the same boards by different methods, and the cell below compares the last column of the table, $h = 8$, with the count of the modular solver.

Circumference 2 has multiple edges, because on a ring of two cells a cell meets its right and its left neighbour in the same cell. Each edge counts as a separate piece, so one row of two cells has 2 tilings. A row of odd circumference has an odd number of cells, so the counts vanish at odd heights.

```js run
const { calculateTotalTilingCombinations } = require('./js/solvers/all-lattices-cylinder-torus-bigint.js');
const modular = require('./js/solvers/all-lattices-cylinder-torus-modular.js');

nb.heights = [0, 1, 2, 3, 4, 5, 6, 7, 8];
nb.widths = [2, 3, 4, 5, 6, 7, 8];
nb.count = (w, h) => calculateTotalTilingCombinations({ rowCount: h, colCount: w, lattice: 'triangular' });

for (const w of nb.widths) {
  const check = await modular.calculateTotalTilingCombinations({ rowCount: 8, colCount: w, lattice: 'triangular' });

  if (check !== nb.count(w, 8)) {
    throw new Error(`the two solvers differ on the cylinder of circumference ${w} and height 8`);
  }
}

table(
  ['w \\ h', ...nb.heights.map(String)],
  nb.widths.map(w => [String(w), ...nb.heights.map(h => String(nb.count(w, h)))]),
);
```

## What the OEIS has

The OEIS has the cylinders of circumference 2, [OEIS A002605](https://oeis.org/A002605), shifted by one [1]. The cell checks it against the table, with the terms of the entry as they stood on 1 November 2026. The OEIS was searched by terms and by name on 30 October 2026 and by terms again on 1 November 2026. It has no entry for the cylinders of circumference 3 and 4.

```js run
const terms = [0n, 1n];

while (terms.length <= nb.heights.length) {
  terms.push(2n * terms.at(-1) + 2n * terms.at(-2));
}

const differs = terms.slice(1).map((term, h) => [h, term]).filter(([h, term]) => nb.count(2, h) !== term);

if (differs.length) {
  throw new Error(`the cylinders of circumference 2 differ from A002605 at h = ${differs.map(([h]) => h).join(', ')}`);
}

table(['board', 'OEIS', 'checked at'], [['w = 2', 'A002605', `h = ${nb.heights.join(', ')}`]]);
```

## Verification

The `BigInt` solver agrees with A002605 and the modular solver with the `BigInt` one at $h = 8$, and `node harness/testRunner.js` runs the triangular cylinders of [`spec/cases/periodicTilingTests.json`](../../spec/cases/periodicTilingTests.json) through both of them.

## References

1. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entry [OEIS A002605](https://oeis.org/A002605). [oeis.org](https://oeis.org)
2. P. Fendley, R. Moessner and S. L. Sondhi. Classical dimers on the triangular lattice. *Physical Review B* 66(21):214513, 2002. [doi:10.1103/PhysRevB.66.214513](https://doi.org/10.1103/PhysRevB.66.214513)
