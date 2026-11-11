# Dominoes: tilings of the 2n × 2n torus (A335586)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/dominoes/tori.html) has the results. It counts the domino tilings of tori, boards whose opposite edges are glued in both directions. The same boards are counted with [domicules](../domicules/03-tori.md), where the torus count of three lattices is compared with their entropy, and on the [triangular lattice](../triangular-lattice/03-tori.md); the [cylinders notebook](02-cylinders.md) glues only the left and right edges.

## The problem

On a torus both pairs of opposite edges of the board are glued, so a domino may cross the column seam, between the last and the first column, or the row seam, between the last and the first row. A domino that crosses a seam is drawn cut, with one half on each side, and the glued edges are marked, one pair with one tick and the other with two. The drawings show 4 tilings of the $8 \times 8$ torus, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 8, colCount: 8, pieces: 'domino', surface: 'torus', spread: 4 });

figure(svgs, `4 of the ${total} domino tilings of the 8 × 8 torus.`);
```

## The Modular solver

[`all-lattices-cylinder-torus-modular.js`](../../js/solvers/all-lattices-cylinder-torus-modular.js) goes cell by cell with a state of the next $w + 2$ cells. A torus is a sum over the sets $S$ of first-row cells covered from the last row. Each run starts from $S$ and must end with $S$. Rotating the columns maps the runs of $S$ onto those of its rotations, so one run per rotation class is enough. The solver counts modulo primes below $2^{31}$. The Chinese remainder theorem rebuilds the count, and one more prime checks it. The same algorithm is in Rust, [`all-lattices-cylinder-torus-modular.rs`](../../rust/solvers/src/bin/all-lattices-cylinder-torus-modular.rs), and in Python, [`all_lattices_cylinder_torus_modular.py`](../../python/lattice_dimers/solvers/all_lattices_cylinder_torus_modular.py).

## The BigInt solver

[`all-lattices-cylinder-torus-bigint.js`](../../js/solvers/all-lattices-cylinder-torus-bigint.js) goes row by row. For every set of cells of a row already covered from the row below, it lists the ways to finish the row. The torus count is then the trace of the $h$-th power of this row transfer matrix. The same algorithm is in Rust, [`all-lattices-cylinder-torus-bigint.rs`](../../rust/solvers/src/bin/all-lattices-cylinder-torus-bigint.rs), and in Python, [`all_lattices_cylinder_torus_bigint.py`](../../python/lattice_dimers/solvers/all_lattices_cylinder_torus_bigint.py).

## Numbering

The gallery numbers the tilings of the tori up to $10 \times 10$ with the cell-by-cell scan of the modular solver. The tilings are ordered by $S$ and then by the scan. The tilings of $S$ and of its rotations are equally many, so one table per rotation class gives every count, and the table of a single $S$ is rebuilt when a page needs it. The Random button draws a uniformly random number, so the sample is exact.

## The counts

Domino tilings of the $2n \times 2n$ torus are [OEIS A335586](https://oeis.org/A335586) [1]. For $n = 1$ the torus has multiple edges, because on a $2 \times 2$ torus a cell meets its right and its left neighbour in the same cell, and each edge counts as a separate domino, as in A335586. Boards up to $8 \times 8$ go through both solvers, $10 \times 10$ and $12 \times 12$ through the modular one, and every count is compared with the terms of A335586 stored in `spec/cases/`.

```js run
const reference = require('./js/solvers/all-lattices-cylinder-torus-bigint.js');
const modular = require('./js/solvers/all-lattices-cylinder-torus-modular.js');
const { testCasesOf } = require('./js/core/cases');
const stored = side =>
  testCasesOf('all-lattices-cylinder-torus-modular').find(
    t => t.lattice === 'square' && t.torus && !t.twisted && t.oeis === 'A335586' && t.rowCount === side && t.colCount === side,
  );
const rows = [];

for (let n = 1; n <= 6; n++) {
  const side = 2 * n;
  const board = { rowCount: side, colCount: side, lattice: 'square', torus: true };
  const count = await modular.calculateTotalTilingCombinations(board);
  const expected = stored(side);

  if (n <= 4 && reference.calculateTotalTilingCombinations(board) !== count) {
    throw new Error(`the two solvers differ on the ${side}×${side} torus`);
  }

  if (!expected || expected.expectedResult !== String(count)) {
    throw new Error(`the ${side}×${side} torus differs from A335586`);
  }

  rows.push([n, `${side}×${side}`, String(count), String(count).length, n <= 4 ? 'BigInt and modular' : 'modular', 'matches OEIS']);
}

table(['n', 'board', 'a(n)', 'digits', 'solver', 'status'], rows);
```

The tori of circumference 8 and 10 are in the OEIS as well, $C_8 \times C_n$ in [OEIS A253678](https://oeis.org/A253678) and $C_{10} \times C_n$ in [OEIS A281679](https://oeis.org/A281679), and the test data holds some of their terms.

## Running time

Average time of the count inside each solver, without the start of its process, from the newest complete benchmark run in [`benchmarks/results`](../../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['board', 'modular, Rust', 'modular, Python', 'modular, JavaScript', 'BigInt, Rust', 'BigInt, Python', 'BigInt, JavaScript'],
  nb.context.dominoPeriodicBenchmark
    .filter(r => r.surface === 'torus')
    .map(r => [
      `${r.rowCount}×${r.colCount}`,
      ...[r.languages.rs, r.languages.py, r.modular, r.bigintLanguages.rs, r.bigintLanguages.py, r.bigint].map(formatTime),
    ]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```

## Verification

The two cylinder and torus solvers agree with each other and with [OEIS A335586](https://oeis.org/A335586) and [OEIS A253678](https://oeis.org/A253678), and the modular solver also with [OEIS A281679](https://oeis.org/A281679). `FULL_CASES=1 node --test js/test/conformance.test.js` runs the tori of [`spec/cases/all-lattices-cylinder-torus-bigint.json`](../../spec/cases/all-lattices-cylinder-torus-bigint.json) through both solvers and those of `spec/cases/all-lattices-cylinder-torus-modular.json` through the modular one.

## References

1. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A335586](https://oeis.org/A335586), [OEIS A253678](https://oeis.org/A253678) and [OEIS A281679](https://oeis.org/A281679). [oeis.org](https://oeis.org)
