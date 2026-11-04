# Dominoes: tilings of the 2n × 2n board (A004003)

A notebook: every code cell below runs when the site is built, and its output is printed under it. On GitHub only the code is shown; the [rendered page](https://dawidrylko.github.io/lattice-dimers/notes/dominoes.html) has the results. It counts the domino tilings of the $2n \times 2n$ board, [OEIS A004003](https://oeis.org/A004003). The method is described in the [method note](01-method.md).

## The problem

A domino covers two cells that share a side, and a tiling lays dominoes on the board so that every cell is covered exactly once. The dimer drawing turns each cell into a vertex and each domino into an edge between two of them, which makes a tiling a perfect matching of the grid graph. The $4 \times 4$ board has 36 tilings, the value $a(2)$ in the table below, and the drawing shows all of them.

```js run
const { drawTilings } = require('./site/notes.js');
const { svgs, total } = drawTilings({ rowCount: 4, colCount: 4, ranks: 'all' });

figure(svgs, `All ${total} domino tilings of the 4 × 4 board, numbered as in the gallery.`);
```

## Three ways to the same numbers

The formula solver evaluates the resultant, the two transfer solvers scan the board. The `Number` solver is exact only while the count stays below $2^{53}$, and the `BigInt` transfer needs about 35 seconds at $18 \times 18$ and about four minutes at $20 \times 20$ (see the running time below), so this notebook runs it up to $14 \times 14$; every value is also compared with the known terms in `data/`.

```js run
const formula = require('./src/solvers/dominoTilingSolver-Formula.js');
const transfer = require('./src/solvers/dominoTilingSolver-BigInt.js');
const number = require('./src/solvers/dominoTilingSolver.js');
const known = require('./data').testCasesBigInt;

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
    throw new Error(`a(${n}) disagrees with data/`);
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
const { createRootPolynomial, calculateResultant } = require('./src/solvers/dominoTilingSolver-Formula.js');

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

The completion-count table numbers every tiling. Here are tiling 1 and the last tiling of a $4 \times 4$ board, and the size of the table on the gallery boards. The gallery pages through the tilings up to $16 \times 16$; at $18 \times 18$ and $20 \times 20$ it samples them and finds the number of each sample without the table.

```js run
const { createUnranker, unrankTiling, renderAscii } = require('./src/renderer');
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

## Running time

Average wall-clock time of a full solver process, from the newest complete benchmark run in [`benchmarks/results`](../benchmarks/results).

```js run
const { formatTime } = nb.context;

table(
  ['board', 'BigInt', 'formula'],
  nb.context.benchmark.map(r => [`${r.rowCount}×${r.colCount}`, formatTime(r.bigint), formatTime(r.formula)]),
);
print(`Run: ${nb.context.benchmarkRun}`);
```

## PARI/GP

The same formula in [`oeis/A004003/A004003.gp`](../oeis/A004003/A004003.gp), checked in CI against A004003 up to $20 \times 20$.

```js run
print(require('fs').readFileSync(require('path').join(nb.context.root, 'oeis/A004003/A004003.gp'), 'utf-8').trim());
```
