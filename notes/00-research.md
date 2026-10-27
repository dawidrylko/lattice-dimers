# The dimer entropy of the king's graph

The research part of this repository is a paper and a companion note on the perfect matchings of the king's graph, the square lattice with both diagonals. A perfect matching of the $m \times n$ king board is a domicule tiling of the $m \times n$ board, counted in [OEIS A239264](https://oeis.org/A239264), with the squares in [A239273](https://oeis.org/A239273). The code cells on this page read the committed results of `research/king-entropy/` and stop the site build when a value in the results table no longer matches them.

## Papers

- *The dimer entropy of the king's graph.* Dawid Ryłko, preprint, October 2026. [PDF](https://dawidrylko.github.io/lattice-dimers/papers/king-entropy.pdf), [LaTeX source](https://github.com/dawidrylko/lattice-dimers/blob/master/research/king-entropy/paper/king-entropy.tex).
- *Log-convexity of strip dimer counts on the king's graph.* Dawid Ryłko, companion note, October 2026. [PDF](https://dawidrylko.github.io/lattice-dimers/papers/king-entropy-log-convexity.pdf), [LaTeX source](https://github.com/dawidrylko/lattice-dimers/blob/master/research/king-entropy/paper/king-entropy-log-convexity.tex).

Both are archived on Zenodo with the code and data: the paper as [10.5281/zenodo.23686056](https://doi.org/10.5281/zenodo.23686056), the companion note as [10.5281/zenodo.23686087](https://doi.org/10.5281/zenodo.23686087), and the code and data of the tag `king-entropy-v1.0.0` as [10.5281/zenodo.23686293](https://doi.org/10.5281/zenodo.23686293). The steps are in [ZENODO.md](https://github.com/dawidrylko/lattice-dimers/blob/master/research/king-entropy/release/ZENODO.md).

## Abstract

We compute the entropy per site $s$ of the perfect matchings of the king's graph. The graph is not planar, and its boards with both sides at least 3 admit no Pfaffian orientation, so Kasteleyn's method does not apply. Row transfer matrices on cylinders of circumference up to 25, split by a conserved parity of the dimers crossing a loop, converge exponentially; a Lüscher-type extrapolation with predictive backtests and an error budget gives a non-rigorous estimate of $s$ with an error bar of $6 \cdot 10^{-16}$. Computer-assisted Collatz-Wielandt certificates, combined with a bound for the matchings across a cut that depends on the runs of crossing cells, prove a two-sided bound. We also estimate the surface free energy of a free edge, the corner free energy, which gives the asymptotics of A239273, and the decay length of the splitting between the two parity sectors.

## Main results

The entropy per site is defined through the number $Z(m, n)$ of perfect matchings of the $m \times n$ king board:

```math
s = \lim_{m, n \to \infty} \frac{\log Z(m, n)}{mn}.
```

```js run
const fs = require('fs');
const path = require('path');
const directory = path.join(nb.context.root, 'research/king-entropy/data');
const read = file => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf-8').replace(/\bNaN\b/g, 'null'));
const errbar = read('errbar.json').recommended;
const bounds = read('bounds.json');
const runweight = read('runweight_3state.json');
const surface = read('surface.json');
const corner = read('corner.json');
const z2 = read('z2.json');
const widest = Object.keys(runweight).map(Number).sort((a, b) => b - a)[0];

nb.results = {
  s: '0.5655119110413253',
  lower: '0.545343749727',
  upper: '0.582767477484',
  sigma: '0.242017935766251',
  kappa: '0.36319625605',
};

const nearest = nb.context.roundDecimal;
const errors = {
  s: ['6e-16', errbar.err],
  sigma: ['9e-15', surface.sigma_err],
  kappa: ['3e-10', corner.kappa_err],
};

for (const [key, [quoted, value]] of Object.entries(errors)) {
  if (Number(value).toExponential(0) !== quoted) {
    throw new Error(`${key}: the page quotes the error bar ${quoted}, the data says ${value}`);
  }
}

if (z2.xi_inf_local.toFixed(3) !== '1.235') {
  throw new Error(`xi: the page says 1.235, the data says ${z2.xi_inf_local}`);
}

const found = {
  s: nearest(errbar.s, 16),
  lower: String(bounds.lower['24']).slice(0, 14),
  upper: runweight[widest].upper,
  sigma: nearest(surface.sigma, 15),
  kappa: nearest(corner.kappa, 11),
};

for (const key of Object.keys(nb.results)) {
  if (found[key] !== nb.results[key]) {
    throw new Error(`${key}: the page says ${nb.results[key]}, the data says ${found[key]}`);
  }
}

table(['quantity', 'value', 'status', 'source'], [
  ['entropy per site s', `${nb.results.s} ± ${Number(errbar.err).toExponential(0)}`, 'estimate, not rigorous', 'data/errbar.json'],
  ['lower bound on s', nb.results.lower, 'proved (certified, w = 24)', 'data/bounds.json'],
  ['upper bound on s', nb.results.upper, `proved (run-weighted, w = ${widest})`, 'data/runweight_3state.json'],
  ['surface free energy σ', `${nb.results.sigma} ± ${Number(surface.sigma_err).toExponential(0)}`, 'estimate', 'data/surface.json'],
  ['corner free energy κ', `${nb.results.kappa} ± ${errors.kappa[0]}`, 'estimate', 'data/corner.json'],
  ['parity splitting length ξ', '1.235 ± 0.004', 'estimate', 'data/z2.json'],
]);
```

Two sign properties of the strip growth rates, convexity in the even width and a one-sided bound on the odd increments, hold numerically and would give $0.565511911035 \le s \le 0.565511911049$. The companion note tests the finite form of the first of them, log-convexity of $q \mapsto Z(2q, m)$, in 1453 cases. The property is not structural. It fails on free strips of the triangular lattice, for every unequal pair of diagonal weights tried, and on wide strips for the equal weights $x = 3/2, 2, 3$.

## Asymptotics of A239273

The free energies give the growth of the domicule counts of the $2n \times 2n$ board,

```math
a(n) = Z(2n, 2n) \sim C\, d^{\,n^2} f^{-n}, \qquad C = e^{\kappa}, \quad d = e^{4s}, \quad f = e^{8\sigma}.
```

The cell below compares the formula with the exact terms counted by the solvers of this repository, up to $a(10)$, the $20 \times 20$ board; the relative error shrinks by a factor of about 5.6 per step in $n$.

```js run
const { s, sigma, kappa } = nb.results;
const log = count => {
  const digits = String(count);
  const head = digits.slice(0, 17);

  return Math.log(Number(head)) + (digits.length - head.length) * Math.LN10;
};
const rows = [];
let previous = null;

for (let n = 1; n <= 10; n++) {
  const side = 2 * n;
  const count = await nb.context.countDomicule({ rowCount: side, colCount: side });
  const predicted = Number(kappa) + 4 * Number(s) * n * n - 8 * Number(sigma) * n;
  const error = Math.expm1(predicted - log(count));

  rows.push([n, `${side}×${side}`, String(count).length, error.toExponential(2), previous ? (previous / error).toFixed(2) : '']);
  previous = error;
}

if (Math.abs(previous) > 1e-7) {
  throw new Error(`the asymptotic formula is off by ${previous} at n = 10`);
}

table(['n', 'board', 'digits of a(n)', 'relative error of C d^(n²) f^(-n)', 'ratio to the previous error'], rows);
```

## Method in brief

The matchings of a strip of width $w$ are counted row by row with a transfer matrix on $2^w$ states. On cylinders, the parity of the dimers that cross a fixed loop is conserved by the transfer matrix for even circumference and by its square for odd circumference. That splits the matrix into two sectors and makes the leading eigenvalues converge exponentially in $w$. The growth rates of cylinders up to $w = 25$ are extrapolated with several finite-size models; the spread of the models, predictive backtests on smaller widths and a check for a hidden mode make up the error budget of $6 \cdot 10^{-16}$.

Superadditivity of strips and a lower Collatz-Wielandt certificate on the free strip of width 24 give the lower bound. An upper certificate for a transfer matrix that weights the open side of a strip by the runs of crossing cells gives the upper bound. The certificates are evaluated in IEEE binary64 arithmetic with a rounding analysis that makes them rigorous; the cut identity and the strip inequalities behind them are proved in the paper and, in addition, audited in exact arithmetic on small boards. A separate script checks that no king board with both sides at least 3 has a Pfaffian orientation.

The directory `replication/` recomputes the counts, the spectra and the certificates with code written from scratch, including a C program that extends the cylinders to circumference 28; its verdicts are in [replication/REPORT.md](https://github.com/dawidrylko/lattice-dimers/blob/master/research/king-entropy/replication/REPORT.md).

## Reproducibility

Every number of the paper is mapped to the committed file it is read from and the script and arguments that wrote it in [paper/NUMBERS.md](https://github.com/dawidrylko/lattice-dimers/blob/master/research/king-entropy/paper/NUMBERS.md). The scripts, the layout of `research/king-entropy/` and the commands are described in its [README](https://github.com/dawidrylko/lattice-dimers/blob/master/research/king-entropy/README.md). The proofs of the bounds are written out in [proofs/lower-bound.md](https://github.com/dawidrylko/lattice-dimers/blob/master/research/king-entropy/proofs/lower-bound.md) and [proofs/upper-bound.md](https://github.com/dawidrylko/lattice-dimers/blob/master/research/king-entropy/proofs/upper-bound.md).

## How to cite

Cite the paper by its DOI:

```text
D. Ryłko. The dimer entropy of the king's graph. Preprint, Zenodo, October 2026.
https://doi.org/10.5281/zenodo.23686056
```

The code and data behind it are archived as [10.5281/zenodo.23686293](https://doi.org/10.5281/zenodo.23686293), the tag `king-entropy-v1.0.0`. The software is described in [CITATION.cff](https://github.com/dawidrylko/lattice-dimers/blob/master/CITATION.cff), which GitHub also offers as BibTeX. Scripts are MIT; the paper, notes, data and outputs are CC BY 4.0.
