# Dominoes: tilings of the 2n × 2n board (A004003)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/dominoes/rectangles.html) has the results. It counts the domino tilings of the $2n \times 2n$ board, [OEIS A004003](https://oeis.org/A004003) [5], says how the gallery numbers and samples them, and how every number is checked. The notebooks on [cylinders](02-cylinders.md) and [tori](03-tori.md) count dominoes on boards with glued edges.

## The problem

A domino covers two cells that share a side, and a tiling lays dominoes on the board so that every cell is covered exactly once. The dimer drawing turns each cell into a vertex and each domino into an edge between two of them, which makes a tiling a perfect matching of the grid graph. The questions are how many tilings a board of $h \times w$ cells has, what the tiling with a given number looks like, and how to draw a tiling uniformly at random when there are too many to number. The $4 \times 4$ board has 36 tilings, the value $a(2)$ in the table below, and the drawing shows all of them.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 4, colCount: 4, ranks: 'all' });

figure(svgs, `All ${total} domino tilings of the 4 × 4 board, numbered as in the gallery.`);
```

## The closed form

Kasteleyn [1] and Fisher [2] found in 1961 that a $2n \times 2n$ board has

```math
a(n) = \prod_{j=1}^{n} \prod_{k=1}^{n} \left( 4\cos^2\frac{j\pi}{2n+1} + 4\cos^2\frac{k\pi}{2n+1} \right)
```

tilings. Evaluated with floating-point cosines the product loses its last digits from $12 \times 12$ on, so the formula solver evaluates it exactly. The numbers $x_j = 4\cos^2(j\pi/(2n+1))$, $j = 1, \dots, n$, are the roots of a monic integer polynomial $P$ of degree $n$, and the double product over $x_j + x_k$ is, up to sign, the resultant of $P(x)$ and $P(-x)$:

```math
a(n) = (-1)^n \mathrm{Res}\bigl(P(x), P(-x)\bigr), \qquad P(x^2) = U_{2n}(x/2)
```

where $U_{2n}$ is the Chebyshev polynomial of the second kind. The resultant is the determinant of the Sylvester matrix, an integer matrix of size $2n$, and fraction-free Bareiss elimination [3] keeps every intermediate value an integer. Neither square roots nor floating point are involved, and $20 \times 20$ takes milliseconds. The same formula is a two-line PARI/GP program in [`oeis/A004003/A004003.gp`](../../oeis/A004003/A004003.gp).

## Transfer by rows

Two solvers count tilings directly. They scan the board row by row and keep, for every bitmask of the cells of the current row that a vertical domino from the row above already covers, the number of ways to reach it. A row is filled by a depth-first search that places horizontal dominoes in free pairs and starts vertical ones into the next row. The table has $2^{w}$ entries per row, so the cost grows with the shorter side and the solvers turn the board so that it is the row width. One solver keeps the counts as JavaScript numbers and is exact only while they stay below $2^{53}$ (up to $10 \times 10$); the other keeps them as `BigInt`.

## Three ways to the same numbers

The formula solver evaluates the resultant, the two transfer solvers scan the board. The `Number` solver is exact only while the count stays below $2^{53}$, and the `BigInt` transfer needs about 35 seconds at $18 \times 18$ and about four minutes at $20 \times 20$ (see the running time below), so this notebook runs it up to $14 \times 14$; every value is also compared with the known terms in `spec/cases/`.

```js run
const formula = require('./js/solvers/dominoTilingSolver-Formula.js');
const transfer = require('./js/solvers/dominoTilingSolver-BigInt.js');
const number = require('./js/solvers/dominoTilingSolver.js');
const known = require('./js/core/cases').testCasesBigInt;

nb.terms = [];
const rows = [];

for (let n = 0; n <= 10; n++) {
  const side = 2 * n;
  const viaFormula = formula.calculateTotalTilingCombinations({ rowCount: side, colCount: side });
  const viaTransfer = n <= 7 ? transfer.calculateTotalTilingCombinations({ rowCount: side, colCount: side }) : null;
  const viaNumber = n <= 5 ? number.calculateTotalTilingCombinations({ rowCount: side, colCount: side }) : null;
  const expected = known.find(t => t.rowCount === side && t.colCount === side).expectedResult;
  const methods = ['formula', viaTransfer !== null && 'BigInt', viaNumber !== null && 'Number'].filter(Boolean);
  const agree = String(viaFormula) === expected && (viaTransfer === null || viaTransfer === viaFormula) && (viaNumber === null || BigInt(viaNumber) === viaFormula);

  if (!agree) {
    throw new Error(`a(${n}) disagrees with spec/cases/`);
  }

  nb.terms.push(viaFormula);
  rows.push([n, `${side}×${side}`, String(viaFormula), String(viaFormula).length, methods.join(', '), 'matches OEIS']);
}

table(['n', 'board', 'a(n)', 'digits', 'solver', 'status'], rows);
```

## Why the product needs exact arithmetic

The closed form as a floating-point product, next to the exact value. The relative error stays near $10^{-16}$, but once the count has more than 16 digits the last ones are wrong.

```js run
const product = n => {
  let value = 1;
  for (let j = 1; j <= n; j++) {
    for (let k = 1; k <= n; k++) {
      value *= 4 * Math.cos((j * Math.PI) / (2 * n + 1)) ** 2 + 4 * Math.cos((k * Math.PI) / (2 * n + 1)) ** 2;
    }
  }
  return value;
};

table(
  ['n', 'rounded float product', 'exact a(n)', 'difference'],
  [4, 5, 6, 7, 8].map(n => {
    const rounded = BigInt(Math.round(product(n)));
    return [n, String(rounded), String(nb.terms[n]), String(rounded - nb.terms[n])];
  }),
);
```

## The polynomial behind the resultant

$P$ is monic of degree $n$ with integer coefficients, and its roots are $4\cos^2(j\pi/(2n+1))$. The Sylvester matrix of $P(x)$ and $P(-x)$ has size $2n$.

```js run
const { createRootPolynomial, calculateResultant } = require('./js/solvers/dominoTilingSolver-Formula.js');

for (let n = 1; n <= 5; n++) {
  const p = createRootPolynomial(n);
  const terms = p
    .map((c, i) => [c, i])
    .reverse()
    .filter(([c]) => c !== 0n)
    .map(([c, i]) => `${c < 0n ? '- ' : '+ '}${c < 0n ? -c : c}${i ? (i === 1 ? 'x' : `x^${i}`) : ''}`)
    .join(' ')
    .replace(/^\+ /, '')
    .replace(/\b1x/g, 'x');
  const resultant = calculateResultant(p, p.map((c, i) => (i % 2 ? -c : c)));
  print(`n = ${n}: P(x) = ${terms};  Res(P(x), P(-x)) = ${resultant};  a(n) = ${n % 2 ? -resultant : resultant}`);
}
```

## Numbering tilings

To show tiling number $r$ without listing the ones before it, the gallery processes the board one cell at a time in row-major order. The state is the set of covered cells among the next $w$ cells, and a table of completion counts, `table[i][state]`, stores in how many ways the board can be finished from cell $i$ in that state. It has $(hw + 1) \cdot 2^{w}$ entries. Unranking walks the cells, tries a horizontal domino before a vertical one, and moves to the second choice after subtracting the number of tilings the first choice would cover. Every tiling of a board up to $16 \times 16$ can be shown this way in a browser.

The cell below shows tiling 1 and the last tiling of a $4 \times 4$ board, and the size of the table on the gallery boards.

```js run
const { createUnranker, unrankTiling, renderAscii } = require('./js/renderer');
const board = { rowCount: 4, colCount: 4 };
const unranker = createUnranker(board);

print(`#1 of ${unranker.total}:`);
print(renderAscii(unrankTiling(unranker, 0n), board));
print(`\n#${unranker.total} of ${unranker.total}:`);
print(renderAscii(unrankTiling(unranker, unranker.total - 1n), board));

table(
  ['board', 'table entries'],
  [8, 12, 14, 16, 18, 20].map(side => [`${side}×${side}`, ((side * side + 1) * 2 ** side).toLocaleString('en-US')]),
);
```

## Sampling with coupling from the past

The table for $18 \times 18$ would need about a gigabyte and the one for $20 \times 20$ several, so the gallery samples these boards instead. Domino tilings of a simply connected region form a distributive lattice under the rotation of two parallel dominoes in a $2 \times 2$ square, with a top and a bottom tiling. Monotone coupling from the past [4] runs the same random rotations from the top and the bottom tiling, starting further and further in the past, until both runs meet at time 0. The meeting point is an exactly uniform tiling. No table is needed.

The number of a sampled tiling needs no table either. A scan from the last cell back keeps one row of completion counts, `table[i + 1]`, and wherever the tiling takes a later choice it adds the counts of the earlier ones, as unranking subtracts them. The scan runs modulo primes below $2^{31}$ in `Uint32Array` rows, a few primes per browser worker, and the Chinese remainder theorem rebuilds the number from as many primes as the count of all tilings needs. The same scan ends with that count modulo every prime, which checks the prime against the count the gallery already holds.

## Running time

Average time of the count inside each solver, without the start of its process, from the newest complete benchmark run in [`benchmarks/results`](../../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['board', 'formula, Rust', 'formula, Python', 'formula, JavaScript', 'BigInt'],
  nb.context.benchmark.map(r => [`${r.rowCount}×${r.colCount}`, formatTime(r.languages.rs), formatTime(r.languages.py), formatTime(r.formula), formatTime(r.bigint)]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```

## PARI/GP

The same formula in [`oeis/A004003/A004003.gp`](../../oeis/A004003/A004003.gp), checked in CI against A004003 up to $20 \times 20$.

```js run
print(require('fs').readFileSync(require('path').join(nb.context.root, 'oeis/A004003/A004003.gp'), 'utf-8').trim());
```

## Verification

Every count on this page is checked in more than one independent way:

- the formula and `BigInt` solvers agree with each other and with A004003 up to $20 \times 20$, the `Number` solver up to $10 \times 10$;
- the PARI/GP program runs in CI against the same data;
- unranking is checked against an enumeration of every tiling of the small boards, and every unranked tiling is checked for coverage;
- coupling from the past is checked with chi-squared tests on $2 \times 2$ and $4 \times 4$.

The tests are in [`harness/`](../../harness), the known values in [`spec/cases/`](../../spec/cases).

## References

1. P. W. Kasteleyn. The statistics of dimers on a lattice. *Physica* 27(12):1209-1225, 1961. [doi:10.1016/0031-8914(61)90063-5](https://doi.org/10.1016/0031-8914%2861%2990063-5)
2. M. E. Fisher. Statistical mechanics of dimers on a plane lattice. *Physical Review* 124(6):1664-1672, 1961. [doi:10.1103/PhysRev.124.1664](https://doi.org/10.1103/PhysRev.124.1664)
3. E. H. Bareiss. Sylvester's identity and multistep integer-preserving Gaussian elimination. *Mathematics of Computation* 22(103):565-578, 1968. [doi:10.1090/S0025-5718-1968-0226829-0](https://doi.org/10.1090/S0025-5718-1968-0226829-0)
4. J. G. Propp and D. B. Wilson. Exact sampling with coupled Markov chains and applications to statistical mechanics. *Random Structures and Algorithms* 9(1-2):223-252, 1996. [doi:10.1002/(SICI)1098-2418(199608/09)9:1/2<223::AID-RSA14>3.0.CO;2-O](https://doi.org/10.1002/%28SICI%291098-2418%28199608/09%299:1/2%3C223::AID-RSA14%3E3.0.CO;2-O)
5. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entry [OEIS A004003](https://oeis.org/A004003). [oeis.org](https://oeis.org)
