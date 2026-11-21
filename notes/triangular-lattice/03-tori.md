# Triangular lattice: tilings of the 2n × 2n torus (not in the OEIS)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/triangular-lattice/tori.html) has the results. It counts the perfect matchings of the triangular lattice on tori, boards whose opposite edges are glued in both directions. The project counts this lattice for comparison with [dominoes](../dominoes/03-tori.md) and [domicules](../domicules/03-tori.md) on the same boards; the notebook on domicules on tori divides the counts of all three lattices by $e^{sL^2}$. The [cylinders notebook](02-cylinders.md) glues only the left and right edges, and the [rectangles notebook](01-rectangles.md) none.

## The problem

The triangular lattice [1] is the square lattice with one diagonal in every square face, here the one that runs down to the right, so a tiling uses dominoes and diagonal pieces in that one direction. On a torus a piece may cross the column seam, between the last and the first column, or the row seam, between the last and the first row. A piece that crosses a seam is drawn cut, with one half on each side, and the glued edges are marked, one pair with one tick and the other with two. The drawings show 4 tilings of the $8 \times 8$ torus, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 8, colCount: 8, lattice: 'triangular', surface: 'torus', spread: 4 });

figure(svgs, `4 of the ${total} tilings of the triangular lattice on the 8 × 8 torus.`);
```

## The Pfaffian solver

[`any-lattice-cylinder-torus-pfaffian.js`](../../js/solvers/any-lattice-cylinder-torus-pfaffian.js) counts in polynomial time: it eliminates matrices of $wh \times wh$ entries. A torus is not planar, so Kasteleyn's theorem gives no single Pfaffian. Fendley, Moessner and Sondhi [1] count the triangular lattice on a torus with four, one per pair of signs on the edges across the two seams: the count is half of the sum of three of them minus the fourth.

Which one is subtracted depends on the choice of the signs, so the solver forms all four such combinations. Each adds the numbers of tilings in four classes, by the parities of the pieces across the two seams, with a sign per class. In one combination the four signs agree, so the solver returns the largest absolute value.

Inside the board it uses the signs of [`A401988.gp`](../../oeis/A401988/A401988.gp), alternating by rows or, when the number of rows is odd, by columns. The solver counts modulo primes. They are below $2^{31}$ in Rust and Python and below $2^{26}$ in JavaScript, where a sum of two products of residues has to stay exact in a double. The Chinese remainder theorem rebuilds the count, and one more prime checks it.

A board has at most 1600 cells. That is a limit of memory, because every thread keeps a whole matrix. The same algorithm is in Rust, [`any-lattice-cylinder-torus-pfaffian.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-pfaffian.rs), and in Python, [`any_lattice_cylinder_torus_pfaffian.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_pfaffian.py).

## The Modular solver

[`any-lattice-cylinder-torus-modular.js`](../../js/solvers/any-lattice-cylinder-torus-modular.js) goes cell by cell with a state of the next $w + 2$ cells. A torus is a sum over the sets $S$ of first-row cells covered from the last row. Each run starts from $S$ and must end with $S$. Rotating the columns maps the runs of $S$ onto those of its rotations, so one run per rotation class is enough. Mirroring the columns does the same on the square lattice and the king's graph, so there one run also stands for a class and its mirror image, while the triangular lattice, whose diagonals a mirror image turns the other way, keeps the rotations only. The solver counts modulo primes below $2^{31}$. The Chinese remainder theorem rebuilds the count, and one more prime checks it. The same algorithm is in Rust, [`any-lattice-cylinder-torus-modular.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-modular.rs), and in Python, [`any_lattice_cylinder_torus_modular.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_modular.py). The Rust implementation also counts modulo [wide primes](../domicules/01-rectangles.md#wide-primes), the primes below $2^{61}$.

## The BigInt solver

[`any-lattice-cylinder-torus-bigint.js`](../../js/solvers/any-lattice-cylinder-torus-bigint.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row. The torus count is then the trace of the $h$-th power of this row transfer matrix. The same algorithm is in Rust, [`any-lattice-cylinder-torus-bigint.rs`](../../rust/solvers/src/bin/any-lattice-cylinder-torus-bigint.rs), and in Python, [`any_lattice_cylinder_torus_bigint.py`](../../python/lattice_dimers/solvers/any_lattice_cylinder_torus_bigint.py).

## Numbering

The gallery numbers the tilings of the tori up to $10 \times 10$ with the cell-by-cell scan of the modular solver, as it numbers the [domino tilings of tori](../dominoes/03-tori.md#numbering): the tilings are ordered by $S$ and then by the scan, and one table per rotation class gives every count. The Random button draws a uniformly random number, so the sample is exact.

## The counts

For $n = 1$ the torus has multiple edges, because on a $2 \times 2$ torus a cell meets its right and its left neighbour in the same cell, and each edge counts as a separate piece. Boards up to $8 \times 8$ go through all three solvers, $10 \times 10$ and $12 \times 12$ through the modular and the Pfaffian one, and $14 \times 14$ to $20 \times 20$ through the Pfaffian one alone. Every count is compared with the one `spec/cases/` stores: the modular solver counted the stored tori up to $16 \times 16$, and the tori $18 \times 18$ and $20 \times 20$ have no count here but the Pfaffian one. The OEIS was searched by terms and by name on 30 October 2026 and by terms again on 1 November 2026. It has no entry for the $2n \times 2n$ tori.

```js run
const reference = require('./js/solvers/any-lattice-cylinder-torus-bigint.js');
const modular = require('./js/solvers/any-lattice-cylinder-torus-modular.js');
const pfaffian = require('./js/solvers/any-lattice-cylinder-torus-pfaffian.js');
const { testCasesOf } = require('./js/core/cases');
const stored = side =>
  ['any-lattice-cylinder-torus-modular', 'any-lattice-cylinder-torus-pfaffian']
    .flatMap(testCasesOf)
    .find(t => t.lattice === 'triangular' && t.torus && !t.twisted && t.rowCount === side && t.colCount === side);
const rows = [];

for (let n = 1; n <= 10; n++) {
  const side = 2 * n;
  const board = { rowCount: side, colCount: side, lattice: 'triangular', torus: true };
  const count = await pfaffian.calculateTotalTilingCombinations(board);
  const expected = stored(side);

  if (n <= 6 && (await modular.calculateTotalTilingCombinations(board)) !== count) {
    throw new Error(`the modular and the Pfaffian solver differ on the ${side}×${side} torus`);
  }

  if (n <= 4 && reference.calculateTotalTilingCombinations(board) !== count) {
    throw new Error(`the BigInt and the Pfaffian solver differ on the ${side}×${side} torus`);
  }

  if (!expected || expected.expectedResult !== String(count)) {
    throw new Error(`the ${side}×${side} torus differs from spec/cases/`);
  }

  const solvers = n <= 4 ? 'BigInt, modular and Pfaffian' : n <= 6 ? 'modular and Pfaffian' : 'Pfaffian';

  rows.push([n, `${side}×${side}`, String(count), String(count).length, solvers, 'matches spec/cases/']);
}

table(['n', 'board', 'count', 'digits', 'solver', 'status'], rows);
```

## Verification

The three cylinder and torus solvers agree with each other up to $8 \times 8$, the modular and the Pfaffian one up to $16 \times 16$, and both check every result against an extra prime. The Pfaffian solver also agrees with the eleven tori in Table I of Fendley, Moessner and Sondhi [1], boards of $L_x \times 2L_y$ cells with $L_x$ from 3 to 6 and $2L_y$ from 4 to 12, which [`spec/cases/any-lattice-cylinder-torus-pfaffian.json`](../../spec/cases/any-lattice-cylinder-torus-pfaffian.json) holds. `FULL_CASES=1 node --test js/test/conformance.test.js` runs the triangular tori of [`spec/cases/any-lattice-cylinder-torus-bigint.json`](../../spec/cases/any-lattice-cylinder-torus-bigint.json) through all three solvers, those of `spec/cases/any-lattice-cylinder-torus-modular.json` through the modular and the Pfaffian one, and those of the Pfaffian file, up to the $40 \times 40$ torus, through the Pfaffian one.

## References

1. P. Fendley, R. Moessner and S. L. Sondhi. Classical dimers on the triangular lattice. *Physical Review B* 66(21):214513, 2002. [doi:10.1103/PhysRevB.66.214513](https://doi.org/10.1103/PhysRevB.66.214513)
