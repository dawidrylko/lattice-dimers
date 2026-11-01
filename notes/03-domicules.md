# Domicules: tilings of the 2n × 2n board (A239273)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/domicules.html) has the results. It counts the domicule tilings of the $2n \times 2n$ board, [OEIS A239273](https://oeis.org/A239273), and of the $h \times w$ rectangles, [OEIS A239264](https://oeis.org/A239264). The method is described in the [method note](01-method.md).

## The sequence up to 20 × 20

The `BigInt` solver counts the boards up to $16 \times 16$, the modular one $18 \times 18$ and $20 \times 20$. The data section of the OEIS entry lists the terms up to $a(9)$; the [OEIS A239273 b-file](https://oeis.org/A239273/b239273.txt) continues to $a(12)$ ($24 \times 24$), beyond the solvers here, and $a(10)$ is checked against it.

```js run
const reference = require('./src/solvers/domiculeTilingSolver-BigInt.js');
const known = require('./data').testCasesDomicule;
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
const { calculateTotalTilingCombinations } = require('./src/solvers/domiculeTilingSolver-BigInt.js');
const sides = [1, 2, 3, 4, 5, 6, 7, 8];

table(
  ['h \\ w', ...sides.map(String)],
  sides.map(h => [String(h), ...sides.map(w => String(calculateTotalTilingCombinations({ rowCount: h, colCount: w })))]),
);
```

## How many primes the modular solver needs

The Kahn-Lovász theorem bounds $\log_2$ of the count. Each prime below $2^{31}$ adds at least 30 bits, and one more prime checks the result.

```js run
const { calculateLog2Bound } = require('./src/solvers/domiculeTilingSolver-Modular.js');

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
const { listPrimes, countModulo, combineResidues } = require('./src/solvers/domiculeTilingSolver-Modular.js');
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

A state remembers the next $w + 2$ cells, so the table is four times wider than for dominoes.

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

## Is the Markov chain uniform?

On $4 \times 4$ the chain can be compared with the exact answer: 280 tilings, each should appear equally often. A chi-squared statistic above 357.8 (279 degrees of freedom, $p = 0.001$) would reject uniformity.

```js run
const { sampleDomiculeTiling } = require('./src/renderer');
const { createRandom } = require('./src/renderer/cftp');
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

Average wall-clock time of a full solver process, from the newest complete benchmark run in [`benchmarks/results`](../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['board', 'BigInt', 'modular'],
  nb.context.domiculeBenchmark.map(r => [`${r.rowCount}×${r.colCount}`, formatTime(r.bigint), formatTime(r.modular)]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```

## PARI/GP

The same transfer in [`oeis/A239264/A239264.gp`](../oeis/A239264/A239264.gp), with $a(n) = T(2n, 2n)$ in [`oeis/A239273/A239273.gp`](../oeis/A239273/A239273.gp), checked in CI against A239273 up to $12 \times 12$ and the A239264 rectangles of the test data.

```js run
print(['A239264', 'A239273'].map(a => require('fs').readFileSync(require('path').join(nb.context.root, `oeis/${a}/${a}.gp`), 'utf-8').trim()).join('\n\n'));
```
