# Domicules: tilings of the 2n × 2n board (A239273)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/domicules/rectangles.html) has the results. It counts the domicule tilings of the $2n \times 2n$ board, [OEIS A239273](https://oeis.org/A239273), and of the $h \times w$ rectangles, [OEIS A239264](https://oeis.org/A239264) [2]. It also says how the gallery numbers and samples these tilings, and how every number is checked. The notebooks on [cylinders](02-cylinders.md) and [tori](03-tori.md) count domicules on boards with glued edges, and [Diagonal pieces](04-diagonal-pieces.md) sorts the tilings by their diagonal pieces.

## The problem

A domicule covers two cells that share either a side, as a straight piece, or only a corner, as a diagonal piece. Its tilings are the perfect matchings of the king's graph, where every cell is joined to its eight neighbours. Of the 3 tilings of the $2 \times 2$ board, two use straight pieces and the third uses two diagonal pieces that cross. The $4 \times 4$ board has 280 tilings, and the second drawing shows 8 of them, spread over the numbering.

```js run
const { drawTilings } = require('./site/notes.js');
const small = drawTilings({ rowCount: 2, colCount: 2, pieces: 'domicule', ranks: 'all' });
const ranks = Array.from({ length: 8 }, (_, i) => 35 * i);
const board = drawTilings({ rowCount: 4, colCount: 4, pieces: 'domicule', ranks });

figure(small.svgs, `All ${small.total} domicule tilings of the 2 × 2 board.`);
figure(board.svgs, `8 of the ${board.total} domicule tilings of the 4 × 4 board.`);
```

## Transfer by cells

A domicule tiling is counted with a cell-by-cell scan. A free cell is matched with its right, down-left, down or down-right neighbour, so the farthest cell a state has to remember lies $w + 1$ places ahead and a state has $w + 2$ bits. The table is four times wider than the one of the [domino scan](../dominoes/01-rectangles.md#numbering-tilings). [`domiculeTilingSolver-BigInt.js`](../../js/solvers/domiculeTilingSolver-BigInt.js) keeps the counts as `BigInt` and is the reference. The same scan is in [`oeis/A239264/A239264.gp`](../../oeis/A239264/A239264.gp), where `T(h, w)` is A239264, and [`oeis/A239273/A239273.gp`](../../oeis/A239273/A239273.gp), where `a(n)` is A239273.

## The sequence up to 20 × 20

The `BigInt` solver counts the boards up to $16 \times 16$, the modular one $18 \times 18$ and $20 \times 20$. The data section of the OEIS entry lists the terms up to $a(9)$; the [OEIS A239273 b-file](https://oeis.org/A239273/b239273.txt) continues to $a(12)$ ($24 \times 24$), beyond the solvers here, and $a(10)$ is checked against it.

```js run
const reference = require('./js/solvers/domiculeTilingSolver-BigInt.js');
const known = require('./js/core/cases').testCasesDomicule;
const bFile = { 10: '974206002957112698855240779762528002509423239819130603938953917534367085458193363176670427' };

nb.terms = [];
const rows = [];

for (let n = 0; n <= 10; n++) {
  const side = 2 * n;
  const board = { rowCount: side, colCount: side };
  const count = n <= 8 ? reference.calculateTotalTilingCombinations(board) : await nb.context.countDomicule(board);
  const published = known.find(t => t.rowCount === side && t.colCount === side);
  const expected = published?.expectedResult ?? bFile[n] ?? null;
  const status = expected === null ? 'not in OEIS yet' : expected !== String(count) ? 'DIFFERS FROM OEIS' : published ? 'matches OEIS' : 'matches the OEIS b-file';

  if (expected !== null && expected !== String(count)) {
    throw new Error(`a(${n}) differs from OEIS`);
  }

  nb.terms.push(count);
  rows.push([n, `${side}×${side}`, String(count), String(count).length, n <= 8 ? 'BigInt' : 'modular', status]);
}

table(['n', 'board', 'a(n)', 'digits', 'solver', 'status'], rows);
```

## Rectangles: A239264

`T(h, w)` counts the domicule tilings of an $h \times w$ board. The table is symmetric, and its diagonal of even sides is A239273.

```js run
const { calculateTotalTilingCombinations } = require('./js/solvers/domiculeTilingSolver-BigInt.js');
const sides = [1, 2, 3, 4, 5, 6, 7, 8];

table(
  ['h \\ w', ...sides.map(String)],
  sides.map(h => [String(h), ...sides.map(w => String(calculateTotalTilingCombinations({ rowCount: h, colCount: w })))]),
);
```

## Counting modulo primes

The scan only adds counts, so it can run modulo a prime $p < 2^{31}$: the sum of two residues stays below $2^{32}$ and fits a `Uint32Array` cell. [`domiculeTilingSolver-Modular.js`](../../js/solvers/domiculeTilingSolver-Modular.js) counts modulo several primes in parallel worker threads and rebuilds the exact count with the Chinese remainder theorem. It needs enough primes for their product to exceed the count, and the Kahn-Lovász theorem, proved by Alon and Friedland [1], bounds the number of perfect matchings of a graph with degrees $d(v)$:

```math
\#\text{perfect matchings} \le \prod_{v} \bigl(d(v)!\bigr)^{1/(2d(v))}
```

Every prime contributes at least 30 bits, so $\lceil (\log_2 B + 1)/30 \rceil$ primes suffice for a bound $B$. One more prime checks the result: the rebuilt count must agree with the residue modulo that prime, and a mismatch stops the solver.

## How many primes the modular solver needs

The bound gives $\log_2$ of the count from above. Each prime below $2^{31}$ adds at least 30 bits, and one more prime checks the result.

```js run
const { calculateLog2Bound } = require('./js/solvers/domiculeTilingSolver-Modular.js');

table(
  ['board', 'log2 of the bound', 'log2 of a(n)', 'primes for the CRT', 'check primes'],
  [2, 4, 6, 8, 10].map(n => {
    const side = 2 * n;
    const bound = calculateLog2Bound(side, side);
    const actual = nb.terms[n].toString(2).length - 1;
    return [`${side}×${side}`, bound.toFixed(1), String(actual), String(Math.ceil((bound + 1) / 30)), '1'];
  }),
);
```

## The Chinese remainder theorem at work

The $8 \times 8$ board counted modulo the two largest primes below $2^{31}$, combined, and checked against a third.

```js run
const { listPrimes, countModulo, combineResidues } = require('./js/solvers/domiculeTilingSolver-Modular.js');
const primes = listPrimes(3);
const residues = primes.map(p => countModulo(8, 8, p));
const combined = combineResidues(residues.slice(0, 2), primes.slice(0, 2));

primes.forEach((p, i) => print(`a(4) mod ${p} = ${residues[i]}`));
print(`CRT of the first two: ${combined}`);
print(`check: ${combined} mod ${primes[2]} = ${combined % BigInt(primes[2])}, residue ${residues[2]}`);
print(`exact a(4) = ${nb.terms[4]}`);

if (combined !== nb.terms[4] || combined % BigInt(primes[2]) !== BigInt(residues[2])) {
  throw new Error('the CRT does not reproduce a(4)');
}
```

## The state of the transfer

The number of states per cell for both pieces, and the size of the domicule numbering table on the gallery boards.

```js run
table(
  ['board', 'states per cell (dominoes)', 'states per cell (domicules)', 'numbering table (domicules)'],
  [8, 12, 14, 16, 18, 20].map(side => [
    `${side}×${side}`,
    (2 ** side).toLocaleString('en-US'),
    (2 ** (side + 2)).toLocaleString('en-US'),
    ((side * side + 1) * 2 ** (side + 2)).toLocaleString('en-US'),
  ]),
);
```

## Sampling with a Markov chain

Domicule tilings have no lattice structure like the domino rotations, so [coupling from the past](../dominoes/01-rectangles.md#sampling-with-coupling-from-the-past) does not apply. Up to $14 \times 14$ the gallery numbers every tiling with a table of $(hw + 1) \cdot 2^{w+2}$ entries, which is exactly uniform when the number is drawn at random. From $16 \times 16$ to $20 \times 20$ it runs a Markov chain. A step picks a cell $a$ and one of its eight neighbours $c$; when the partner $b$ of $a$ and the partner $d$ of $c$ are neighbours too, the pairs $ab$ and $cd$ become $ac$ and $bd$. Each such move arises from four ordered choices, and so does the move back, so the proposal is symmetric and the uniform distribution is stationary. On every board small enough to check (up to $4 \times 5$) the moves connect all tilings. A chain run for finitely many steps is still only approximately uniform, and the gallery labels its samples as such. Each sample gets its number from the backward scan of the [domino sampling](../dominoes/01-rectangles.md#sampling-with-coupling-from-the-past); a domicule state has $w + 1$ bits there, since no piece reaches further than $w + 1$ cells ahead and the scan shifts before it stores the state.

## Is the Markov chain uniform?

On $4 \times 4$ the chain can be compared with the exact answer: 280 tilings, each should appear equally often. A chi-squared statistic above 357.8 (279 degrees of freedom, $p = 0.001$) would reject uniformity.

```js run
const { sampleDomiculeTiling } = require('./js/renderer');
const { createRandom } = require('./js/renderer/cftp');
const random = createRandom(2024);
const board = { rowCount: 4, colCount: 4 };
const samples = 280 * 100;
const counts = new Map();

for (let i = 0; i < samples; i++) {
  const key = JSON.stringify(sampleDomiculeTiling(board, random, 200));
  counts.set(key, (counts.get(key) || 0) + 1);
}

const expected = samples / 280;
const chiSquared = [...counts.values()].reduce((sum, observed) => sum + (observed - expected) ** 2 / expected, (280 - counts.size) * expected);
print(`distinct tilings seen: ${counts.size} of 280`);
print(`chi-squared: ${chiSquared.toFixed(1)} (limit 357.8)`);

if (counts.size !== 280 || chiSquared > 357.8) {
  throw new Error('the chain fails the uniformity test');
}
```

## Running time

Average time of the count inside each solver, without the start of its process, from the newest complete benchmark run in [`benchmarks/results`](../../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['board', 'modular, Rust', 'modular, Python', 'modular, JavaScript', 'BigInt'],
  nb.context.domiculeBenchmark.map(r => [`${r.rowCount}×${r.colCount}`, formatTime(r.languages.rs), formatTime(r.languages.py), formatTime(r.modular), formatTime(r.bigint)]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```

## PARI/GP

The same transfer in [`oeis/A239264/A239264.gp`](../../oeis/A239264/A239264.gp), with $a(n) = T(2n, 2n)$ in [`oeis/A239273/A239273.gp`](../../oeis/A239273/A239273.gp), checked in CI against A239273 up to $12 \times 12$ and the A239264 rectangles of the test data.

```js run
print(['A239264', 'A239273'].map(a => require('fs').readFileSync(require('path').join(nb.context.root, `oeis/${a}/${a}.gp`), 'utf-8').trim()).join('\n\n'));
```

## Verification

Every count on this page is checked in more than one independent way:

- the two domicule solvers agree with A239273 and the data section of A239264;
- the PARI/GP programs run in CI against the same data;
- unranking is checked against an enumeration of every tiling of the small boards, and every unranked tiling is checked for coverage;
- the Markov chain is checked with chi-squared tests on $2 \times 2$ and $4 \times 4$;
- the modular solver checks every result against an extra prime.

The tests are in [`harness/`](../../harness), the known values in [`spec/cases/`](../../spec/cases).

## References

1. N. Alon and S. Friedland. The maximum number of perfect matchings in graphs with a given degree sequence. *Electronic Journal of Combinatorics* 15:N13, 2008. [doi:10.37236/888](https://doi.org/10.37236/888)
2. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A239264](https://oeis.org/A239264) and [OEIS A239273](https://oeis.org/A239273). [oeis.org](https://oeis.org)
