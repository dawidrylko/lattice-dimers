# Triangular lattice: tilings of the 2n × 2n board (A401988)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/triangular-lattice/rectangles.html) has the results. It counts the perfect matchings of the triangular lattice on the $2n \times 2n$ board and on $h \times w$ rectangles, boards with no glued edges. The project counts this lattice for comparison with [dominoes](../dominoes/01-rectangles.md) and [domicules](../domicules/01-rectangles.md) on the same boards. The notebooks on [cylinders](02-cylinders.md) and [tori](03-tori.md) glue the edges.

## The problem

The triangular lattice [1] is the square lattice with one diagonal in every square face, here the one that runs down to the right. A tiling uses dominoes and diagonal pieces in that one direction, so it lies between a domino tiling, which has no diagonal piece, and a domicule tiling, which may use both diagonals. The $2 \times 2$ board has 2 tilings, one fewer than with domicules, whose third tiling uses both diagonals, and the $8 \times 8$ board has 1,848,358,752. The drawings show 4 of them, spread over a numbering by a table of completion counts of the [cell-by-cell scan](#the-bigint-solver), as the [domicule rectangles](../domicules/01-rectangles.md#numbering) are numbered without the down-left move.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 8, colCount: 8, lattice: 'triangular', spread: 4 });

figure(svgs, `4 of the ${total} tilings of the triangular lattice on the 8 × 8 board.`);
```

## The Modular solver

The [cell-by-cell scan](#the-bigint-solver) only adds counts, so it can run modulo a prime $p < 2^{31}$. [`any-lattice-rectangle-modular.js`](../../js/solvers/any-lattice-rectangle-modular.js) counts modulo several primes in parallel worker threads, rebuilds the exact count with the Chinese remainder theorem, and checks it against one more prime. The number of primes comes from the Kahn-Lovász bound of the king's graph, as in the [domicule solver](../domicules/01-rectangles.md#the-modular-solver): the triangular lattice is a subgraph of the king's graph, so its count is below that bound too. The same algorithm is in Rust, [`any-lattice-rectangle-modular.rs`](../../rust/solvers/src/bin/any-lattice-rectangle-modular.rs), and in Python, [`any_lattice_rectangle_modular.py`](../../python/lattice_dimers/solvers/any_lattice_rectangle_modular.py). `--lattice` chooses the square lattice, the triangular lattice or the king's graph.

## The BigInt solver

[`any-lattice-rectangle-bigint.js`](../../js/solvers/any-lattice-rectangle-bigint.js) goes cell by cell in row-major order, the transfer by cells of the [domicule solver](../domicules/01-rectangles.md#the-bigint-solver). A free cell is matched with a later cell: its right, down or down-right neighbour on the triangular lattice, also its down-left neighbour on the king's graph, and only right or down on the square lattice. The farthest cell a state has to remember lies $w + 1$ places ahead, so a state has $w + 2$ bits. The counts are `BigInt`, and so are those of its Rust and Python implementations, [`any-lattice-rectangle-bigint.rs`](../../rust/solvers/src/bin/any-lattice-rectangle-bigint.rs) and [`any_lattice_rectangle_bigint.py`](../../python/lattice_dimers/solvers/any_lattice_rectangle_bigint.py). In every language this solver is the reference of the modular one.

## Numbering

Up to $14 \times 14$ the gallery numbers every tiling with the table of completion counts of the [cell-by-cell scan](#the-bigint-solver), as it numbers the [domicule tilings](../domicules/01-rectangles.md#numbering), without the down-left neighbour. Drawing the number at random gives an exactly uniform tiling.

### Sampling with a Markov chain

From $16 \times 16$ to $20 \times 20$ the gallery runs the Markov chain of the [domicule tilings](../domicules/01-rectangles.md#sampling-with-a-markov-chain) with the six neighbours of the triangular lattice. Its moves along 4-cycles do not connect all tilings here: they join 14 of the 15 tilings of the $3 \times 4$ board and 50 of the 56 of the $4 \times 4$ board. Half of the steps therefore go along a 6-cycle: from $a$, its partner $b$, a neighbour $c$ of $a$ and its partner $d$, a neighbour $e$ of $d$ and its partner $f$, the pairs $ab$, $cd$ and $ef$ become $ac$, $de$ and $fb$ when $f$ and $b$ are neighbours and the six cells are distinct. The move back arises from the same number of choices, so the uniform distribution stays stationary, and on every board small enough to check (up to $4 \times 5$) the two kinds of moves together connect all tilings. A chain run for finitely many steps is only approximately uniform, and the gallery labels its samples as such; each sample gets its number from the same backward scan as a domicule sample.

## The counts

The `BigInt` and the modular solver count the boards up to $12 \times 12$ and must agree, the modular one alone continues to $18 \times 18$, and the last two rows are read from [`spec/cases/any-lattice-rectangle-modular.json`](../../spec/cases/any-lattice-rectangle-modular.json), where the Rust, Python and JavaScript solvers agree on them. Every computed count is compared with that file too. The counts of the $2n \times 2n$ board are proposed as [OEIS A401988](https://oeis.org/draft/A401988) [3], a draft that the editors have not yet approved; the OEIS was searched by terms on 11 November 2026 and had no earlier entry for them.

```js run
const reference = require('./js/solvers/any-lattice-rectangle-bigint.js');
const modular = require('./js/solvers/any-lattice-rectangle-modular.js');
const stored = require('./js/core/cases')
  .testCasesOf('any-lattice-rectangle-modular')
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

`T(h, w)` counts the tilings of an $h \times w$ board. Swapping rows and columns maps the diagonal that runs down to the right onto itself, so the table is symmetric, and its diagonal of even sides is $a(n)$. Its row $h = 4$ is [OEIS A309117](https://oeis.org/A309117), and its row $h = 3$ at even $w$ is [OEIS A011900](https://oeis.org/A011900) [3]; the cell checks both, the first against [`oeis/A309117/b309117.txt`](../../oeis/A309117/b309117.txt) and the second against the recurrence of the entry.

```js run
const { calculateTotalTilingCombinations } = require('./js/solvers/any-lattice-rectangle-bigint.js');
const sides = [1, 2, 3, 4, 5, 6, 7, 8];
const count = (h, w) => calculateTotalTilingCombinations({ rowCount: h, colCount: w, lattice: 'triangular' });
const a309117 = require('fs')
  .readFileSync(require('path').join(nb.context.root, 'oeis/A309117/b309117.txt'), 'utf-8')
  .trim()
  .split('\n')
  .map(line => line.split(' ')[1]);
const a011900 = [1n, 3n];

while (a011900.length <= sides.length / 2) {
  a011900.push(6n * a011900.at(-1) - a011900.at(-2) - 2n);
}

if (sides.some(w => String(count(4, w)) !== a309117[w])) {
  throw new Error('the row h = 4 differs from A309117');
}

if (a011900.slice(1).some((term, index) => count(3, 2 * (index + 1)) !== term)) {
  throw new Error('the row h = 3 differs from A011900 at even w');
}

table(
  ['h \\ w', ...sides.map(String)],
  sides.map(h => [String(h), ...sides.map(w => String(count(h, w)))]),
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

The counts follow also from Kasteleyn's theorem [2]: the board is a planar graph, every inner face is a triangle, and a sign on every edge that makes each triangle carry an odd number of clockwise edges turns the number of tilings into the Pfaffian of a skew-symmetric matrix $K$, so $a(n) = \sqrt{\det K}$. [`A401988.gp`](../../oeis/A401988/A401988.gp) builds $K$ with the sign $-1$ on the horizontal and vertical edges from the even rows and $+1$ elsewhere, where $K_{ab} = 1$ orients the edge from $a$ to $b$; with the rows drawn downwards and the columns to the right, every triangle then has one or three counterclockwise edges, the same condition in the mirror image. CI runs it on the boards up to $16 \times 16$ of `spec/cases/`, and [`harness/spec.test.js`](../../harness/spec.test.js) checks the parity of every triangle on boards up to $12 \times 12$, so the two methods are independent.

```js run
print(require('fs').readFileSync(require('path').join(nb.context.root, 'oeis/A401988/A401988.gp'), 'utf-8').trim());
```

## Verification

Every count on this page is checked in more than one independent way:

- the `BigInt` and the modular solver agree, in Rust, Python and JavaScript, on every board of [`spec/cases/any-lattice-rectangle-bigint.json`](../../spec/cases/any-lattice-rectangle-bigint.json), which ends at $16 \times 16$; the larger boards of [`spec/cases/any-lattice-rectangle-modular.json`](../../spec/cases/any-lattice-rectangle-modular.json), up to $22 \times 22$, go through the modular solver alone, in the three languages;
- the same solvers on the square lattice and on the king's graph give the stored domino and domicule counts;
- a listing of every tiling agrees on the triangular boards of up to 40 cells;
- the Kasteleyn determinant of the PARI/GP program agrees up to $16 \times 16$ in CI, and the b-file that [`oeis/A401988/b401988.js`](../../oeis/A401988/b401988.js) builds from the same determinant agrees with the stored squares up to $22 \times 22$;
- the numbering of the drawings is checked against the count, and every numbered tiling for coverage and for the missing down-left diagonal;
- the Markov chain is checked with chi-squared tests on $2 \times 2$ and $4 \times 4$, and for reaching every tiling of the $2 \times 3$, $3 \times 4$, $4 \times 5$ and $5 \times 4$ boards;
- the modular solver checks every result against an extra prime.

The tests are in [`harness/`](../../harness), [`js/test/`](../../js/test), [`python/tests/`](../../python/tests) and [`rust/tests/`](../../rust/tests).

## References

1. P. Fendley, R. Moessner and S. L. Sondhi. Classical dimers on the triangular lattice. *Physical Review B* 66(21):214513, 2002. [doi:10.1103/PhysRevB.66.214513](https://doi.org/10.1103/PhysRevB.66.214513)
2. L. Lovász and M. D. Plummer. *Matching Theory*. Annals of Discrete Mathematics 29, North-Holland, Amsterdam, 1986. Lemma 8.3.3 and Theorem 8.3.4, pp. 321-322.
3. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A309117](https://oeis.org/A309117) and [OEIS A011900](https://oeis.org/A011900) and draft entry [OEIS A401988](https://oeis.org/draft/A401988). [oeis.org](https://oeis.org)
