# Diagonal pieces: domicule tilings of tori by their count (not in the OEIS)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/domicules/tori-by-diagonal-pieces.html) has the results. It sorts the domicule tilings of tori by the number of diagonal pieces, as the [rectangles notebook](04-rectangles-by-diagonal-pieces.md) does on the board with no glued edge. The tilings themselves are counted in the [tori notebook](03-tori.md).

## The problem

On a torus both pairs of opposite edges of the board are glued, so a diagonal piece may cross the seam between the last and the first column, the seam between the last and the first row, or both at a corner. The drawing shows the first tiling of the $8 \times 8$ torus in the gallery's numbering for $k = 0, 8, 16$ and $32$ diagonal pieces, with the straight pieces greyed out.

```js run
const { drawTilings } = require('./site/notes.js');
const counts = [0, 8, 16, 32];
const svgs = counts.flatMap(k => drawTilings({ rowCount: 8, colCount: 8, pieces: 'domicule', surface: 'torus', diagonals: k, ranks: [0] }).svgs);

figure(svgs, 'Tilings of the 8 × 8 torus with k = 0, 8, 16 and 32 diagonal pieces.', { highlight: true });
```

Give every diagonal piece the weight $x$, as in the [rectangles notebook](04-rectangles-by-diagonal-pieces.md#the-problem). The weighted count is the polynomial $P(x) = \sum_k T(k)\, x^k$, where $T(k)$ counts the tilings with $k$ diagonal pieces. At $x = 0$ it is the domino count of the same torus ([dominoes on tori](../dominoes/03-tori.md)) and at $x = 1$ its domicule count ([domicules on tori](03-tori.md)). This is the dimer model of Sandvik and Moessner [1] with diagonal dimers of fugacity $x$, on a torus.

## The Modular solver

[`domicule-cylinder-torus-polynomial-modular.js`](../../js/solvers/domicule-cylinder-torus-polynomial-modular.js) runs the cell by cell transfer of the [tori notebook](03-tori.md#the-modular-solver) on the king's graph with a block of coefficients in every state, one prime per worker thread. [`domicule-cylinder-torus-polynomial-modular.rs`](../../rust/solvers/src/bin/domicule-cylinder-torus-polynomial-modular.rs) and [`domicule_cylinder_torus_polynomial_modular.py`](../../python/lattice_dimers/solvers/domicule_cylinder_torus_polynomial_modular.py) count the same polynomial. A torus runs only the smallest rotation of every set of cells covered from the last row and counts it once per rotation, and its shorter side is taken as the circumference. The same solver counts the [cylinders](05-cylinders-by-diagonal-pieces.md).

## The BigInt solver

[`domicule-cylinder-torus-polynomial-bigint.js`](../../js/solvers/domicule-cylinder-torus-polynomial-bigint.js) runs the row transfer of the [cylinders notebook](02-cylinders.md#the-bigint-solver) on the king's graph and counts a piece sent to the next row one column left or right as diagonal. A torus is the trace of the transfer, with the same rotations as the Modular solver. Its Rust and Python implementations are [`domicule-cylinder-torus-polynomial-bigint.rs`](../../rust/solvers/src/bin/domicule-cylinder-torus-polynomial-bigint.rs) and [`domicule_cylinder_torus_polynomial_bigint.py`](../../python/lattice_dimers/solvers/domicule_cylinder_torus_polynomial_bigint.py).

## Numbering

The gallery can also number only the tilings of a torus with $k$ diagonal pieces. The scan of the [torus numbering](03-tori.md#numbering) then carries a list of counts by the number of diagonal pieces in every entry, one per rotation class, and unranking keeps the order of the full numbering. The gallery offers this up to $10 \times 10$. The build checks the scan's count for $k = 0$ against the domino count of the same torus and checks that the counts add up to the number of tilings.

## The counts

The cell below checks the gallery's scan against the stored counts of the solvers on every board both count. The table gives, for each $n \times n$ torus in `spec/cases/`, how many values of $k$ have a tiling, the $k$ of the largest term and the mean share of diagonal pieces among the $n^2/2$ pieces. When the OEIS was searched by the terms of the $2 \times 2$ and $4 \times 4$ tori on 11 November 2026, it had no such row.

```js run
const stored = require('./js/core/cases')
  .testCasesOf('domicule-cylinder-torus-polynomial-modular')
  .filter(({ rowCount, colCount, torus }) => torus && rowCount === colCount && rowCount >= 2 && rowCount % 2 === 0)
  .map(({ rowCount, expectedResult }) => ({ side: rowCount, diagonals: expectedResult.split(',') }))
  .sort((a, b) => a.side - b.side);
const gallery = nb.context.cylinderTorusDiagonals.filter(({ surface, side }) => surface === 'torus' && side >= 2);
const both = gallery.filter(g => stored.some(s => s.side === g.side));
const differing = both.filter(g => stored.find(s => s.side === g.side).diagonals.join() !== g.diagonals.join());

if (differing.length) {
  throw new Error(`The gallery and the solvers differ on ${differing.map(({ side }) => `the ${side}x${side} torus`).join(', ')}.`);
}

print(`The gallery's scan agrees with the solvers on the ${both.length} tori both count.`);

const rows = stored.map(({ side, diagonals }) => {
  const counts = diagonals.map(BigInt);
  const total = counts.reduce((sum, c) => sum + c, 0n);
  const peak = counts.indexOf(counts.reduce((max, c) => (c > max ? c : max), 0n));
  const scale = 10n ** 15n;
  const mean = Number((counts.reduce((sum, c, k) => sum + BigInt(k) * c, 0n) * scale) / total) / Number(scale);

  return [`${side}×${side}`, counts.filter(c => c > 0n).length, peak, (mean / ((side * side) / 2)).toFixed(6)];
});

table(['board', 'k with a tiling', 'k of the largest term', 'share of diagonal pieces'], rows);
print(`The 4 × 4 torus, k = 0, 1, 2, ...: ${stored.find(({ side }) => side === 4).diagonals.join(', ')}`);
```

## Running time

Average time of the count inside each solver, without the start of its process, from the newest benchmark run in [`benchmarks/results`](../../benchmarks/results) that measured these solvers.

```js run
const { formatTime, cylinderTorusDiagonalBenchmark, cylinderTorusDiagonalRun } = nb.context;

if (!cylinderTorusDiagonalRun) {
  print('These solvers have no benchmark run yet.');
} else {
  table(
    ['board', 'modular, Rust', 'modular, Python', 'modular, JavaScript', 'BigInt, Rust', 'BigInt, Python', 'BigInt, JavaScript'],
    cylinderTorusDiagonalBenchmark
      .filter(({ surface }) => surface === 'torus')
      .map(r => [
        `${r.rowCount}×${r.colCount}`,
        ...[r.languages.rs, r.languages.py, r.modular, r.bigintLanguages.rs, r.bigintLanguages.py, r.bigint].map(formatTime),
      ]),
  );
  print(`Run: ${cylinderTorusDiagonalRun.directory}`);
}
```

## Verification

The two solvers agree with each other, with the domino count of `any-lattice-cylinder-torus-bigint` at $k = 0$ and with its king's graph count summed over $k$, and on the tori of up to 16 cells with every tiling listed one by one. The tests are in [`harness/`](../../harness), [`js/test/`](../../js/test), [`python/tests/`](../../python/tests) and [`rust/tests/`](../../rust/tests), the known values in [`spec/cases/`](../../spec/cases).

## References

1. A. W. Sandvik and R. Moessner. Correlations and confinement in nonplanar two-dimensional dimer models. *Physical Review B* 73(14):144504, 2006. [doi:10.1103/PhysRevB.73.144504](https://doi.org/10.1103/PhysRevB.73.144504)
