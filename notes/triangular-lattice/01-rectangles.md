# Triangular lattice: tilings of the 2n × 2n board (not in the OEIS)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/triangular-lattice/rectangles.html) has the results. It counts the perfect matchings of the triangular lattice on the $2n \times 2n$ board and on $h \times w$ rectangles, boards with no glued edges. The project counts this lattice for comparison with [dominoes](../dominoes/01-rectangles.md) and [domicules](../domicules/01-rectangles.md) on the same boards; the gallery does not draw it. The notebooks on [cylinders](02-cylinders.md) and [tori](03-tori.md) glue the edges.

## The problem

The triangular lattice [1] is the square lattice with one diagonal in every cell, here the one that runs down to the right. A tiling uses dominoes and diagonal pieces in that one direction, so it lies between a domino tiling, which has no diagonal piece, and a domicule tiling, which may use both diagonals. The $2 \times 2$ board has 2 tilings, one fewer than with domicules, whose third tiling uses both diagonals, and the $8 \times 8$ board has 1,848,358,752. The drawings show 4 of them, spread over a numbering by a table of completion counts of the [cell-by-cell scan](#the-bigint-solver), as the [domicule rectangles](../domicules/01-rectangles.md#numbering) are numbered without the down-left move.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 8, colCount: 8, lattice: 'triangular', spread: 4 });

figure(svgs, `4 of the ${total} tilings of the triangular lattice on the 8 × 8 board.`);
```

## The Modular solver

The [cell-by-cell scan](#the-bigint-solver) only adds counts, so it can run modulo a prime $p < 2^{31}$. [`all-lattices-rectangle-modular.js`](../../js/solvers/all-lattices-rectangle-modular.js) counts modulo several primes in parallel worker threads, rebuilds the exact count with the Chinese remainder theorem, and checks it against one more prime. The number of primes comes from the Kahn-Lovász bound of the king's graph, as in the [domicule solver](../domicules/01-rectangles.md#the-modular-solver): the triangular lattice is a subgraph of the king's graph, so its count is below that bound too. The same algorithm is in Rust, [`all-lattices-rectangle-modular.rs`](../../rust/solvers/src/bin/all-lattices-rectangle-modular.rs), and in Python, [`all_lattices_rectangle_modular.py`](../../python/lattice_dimers/solvers/all_lattices_rectangle_modular.py). `--lattice` chooses the square lattice, the triangular lattice or the king's graph.

## The BigInt solver

[`all-lattices-rectangle-bigint.js`](../../js/solvers/all-lattices-rectangle-bigint.js) goes cell by cell in row-major order, the transfer by cells of the [domicule solver](../domicules/01-rectangles.md#the-bigint-solver). A free cell is matched with a later cell: its right, down or down-right neighbour on the triangular lattice, also its down-left neighbour on the king's graph, and only right or down on the square lattice. The farthest cell a state has to remember lies $w + 1$ places ahead, so a state has $w + 2$ bits. The counts are `BigInt`, and so are those of its Rust and Python implementations, [`all-lattices-rectangle-bigint.rs`](../../rust/solvers/src/bin/all-lattices-rectangle-bigint.rs) and [`all_lattices_rectangle_bigint.py`](../../python/lattice_dimers/solvers/all_lattices_rectangle_bigint.py). In every language this solver is the reference of the modular one.

## The counts

The `BigInt` and the modular solver count the boards up to $12 \times 12$ and must agree, the modular one alone continues to $18 \times 18$, and the last two rows are read from [`spec/cases/all-lattices-rectangle-modular.json`](../../spec/cases/all-lattices-rectangle-modular.json), where the Rust, Python and JavaScript solvers agree on them. Every computed count is compared with that file too. The OEIS was searched by terms on 11 November 2026 and has no entry for these counts.

```js run
const reference = require('./js/solvers/all-lattices-rectangle-bigint.js');
const modular = require('./js/solvers/all-lattices-rectangle-modular.js');
const stored = require('./js/core/cases')
  .testCasesOf('all-lattices-rectangle-modular')
  .filter(({ lattice, rowCount, colCount }) => lattice === 'triangular' && rowCount === colCount);
const rows = [];

nb.counts = [];

for (let n = 0; n <= 11; n++) {
  const side = 2 * n;
  const board = { rowCount: side, colCount: side, lattice: 'triangular' };
  const expected = stored.find(t => t.rowCount === side)?.expectedResult;
  const count = n <= 9 ? await modular.calculateTotalTilingCombinations(board) : BigInt(expected);

  if (n <= 6 && reference.calculateTotalTilingCombinations(board) !== count) {
    throw new Error(`the two solvers differ on the ${side}×${side} board`);
  }

  if (expected !== String(count)) {
    throw new Error(`the ${side}×${side} board differs from spec/cases/`);
  }

  nb.counts.push(count);
  rows.push([n, `${side}×${side}`, String(count), String(count).length, n <= 6 ? 'BigInt and modular' : n <= 9 ? 'modular' : 'spec/cases/']);
}

table(['n', 'board', 'a(n)', 'digits', 'solver'], rows);
```

### Rectangles

`T(h, w)` counts the tilings of an $h \times w$ board. Swapping rows and columns maps the diagonal that runs down to the right onto itself, so the table is symmetric, and its diagonal of even sides is $a(n)$.

```js run
const { calculateTotalTilingCombinations } = require('./js/solvers/all-lattices-rectangle-bigint.js');
const sides = [1, 2, 3, 4, 5, 6, 7, 8];

table(
  ['h \\ w', ...sides.map(String)],
  sides.map(h => [String(h), ...sides.map(w => String(calculateTotalTilingCombinations({ rowCount: h, colCount: w, lattice: 'triangular' })))]),
);
```

## The entropy per site

The count grows as $e^{sL^2}$ times a factor of the boundary, where $L = 2n$ and $s$ is the entropy per site of the triangular lattice [1]. The cell reads $s$ from the Kasteleyn computation in `research/king-entropy/out/out_validate.txt` and divides $\ln a(n)$ by $L^2$. The free edges cost a term proportional to $L$, so the ratio approaches $s$ from below, about as $1/L$.

```js run
const fs = require('fs');
const path = require('path');
const validate = fs.readFileSync(path.join(nb.context.root, 'research/king-entropy/out/out_validate.txt'), 'utf-8');
const s = Number(validate.match(/Kasteleyn Bloch average, 64x64 grid: s_tri = ([0-9.]+)/)[1]);
const rows = nb.counts.slice(1).map((count, i) => {
  const side = 2 * (i + 1);
  const ratio = nb.context.logCount(count) / side ** 2;

  if (!(ratio < s)) {
    throw new Error(`ln a(n) / L^2 reaches s on the ${side}×${side} board`);
  }

  return [`${side}×${side}`, ratio.toFixed(6), (s - ratio).toFixed(6), ((s - ratio) * side).toFixed(4)];
});

table(['board', 'ln a(n) / L²', 's − ratio', '(s − ratio) · L'], rows);
print(`s = ${s}`);
```

## PARI/GP

The counts follow also from Kasteleyn's theorem [2]: the board is a planar graph, every inner face is a triangle, and a sign on every edge that makes each triangle carry an odd number of clockwise edges turns the number of tilings into the Pfaffian of a skew-symmetric matrix $K$, so $a(n) = \sqrt{\det K}$. [`rectangles.gp`](rectangles.gp) builds $K$ with the sign $-1$ on the horizontal and vertical edges from the even rows and $+1$ elsewhere, where $K_{ab} = 1$ orients the edge from $a$ to $b$; with the rows drawn downwards, every triangle then has one or three clockwise edges. CI runs it on the boards up to $16 \times 16$ of `spec/cases/`, and [`harness/spec.test.js`](../../harness/spec.test.js) checks the parity of every triangle on boards up to $12 \times 12$, so the two methods are independent. The program moves to `oeis/` with an OEIS entry.

```js run
print(require('fs').readFileSync(require('path').join(nb.context.root, 'notes/triangular-lattice/rectangles.gp'), 'utf-8').trim());
```

## Verification

Every count on this page is checked in more than one independent way:

- the `BigInt` and the modular solver agree, in Rust, Python and JavaScript, on every board of [`spec/cases/all-lattices-rectangle-bigint.json`](../../spec/cases/all-lattices-rectangle-bigint.json) and [`spec/cases/all-lattices-rectangle-modular.json`](../../spec/cases/all-lattices-rectangle-modular.json);
- the same solvers on the square lattice and on the king's graph give the stored domino and domicule counts;
- a listing of every tiling agrees on the triangular boards of up to 40 cells;
- the Kasteleyn determinant of the PARI/GP program agrees up to $16 \times 16$ in CI;
- the numbering of the drawings is checked against the count, and every numbered tiling for coverage and for the missing down-left diagonal;
- the modular solver checks every result against an extra prime.

The tests are in [`harness/`](../../harness), [`js/test/`](../../js/test), [`python/tests/`](../../python/tests) and [`rust/tests/`](../../rust/tests).

## References

1. P. Fendley, R. Moessner and S. L. Sondhi. Classical dimers on the triangular lattice. *Physical Review B* 66(21):214513, 2002. [doi:10.1103/PhysRevB.66.214513](https://doi.org/10.1103/PhysRevB.66.214513)
2. P. W. Kasteleyn. The statistics of dimers on a lattice. *Physica* 27(12):1209-1225, 1961. [doi:10.1016/0031-8914(61)90063-5](https://doi.org/10.1016/0031-8914%2861%2990063-5)
