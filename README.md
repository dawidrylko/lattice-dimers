# <img src=".github/assets/dimer.svg" alt="" width="36" height="36"> Lattice Dimers

[![Continuous Integration](https://github.com/dawidrylko/lattice-dimers/actions/workflows/ci.yml/badge.svg)](https://github.com/dawidrylko/lattice-dimers/actions/workflows/ci.yml)
[![Pages](https://github.com/dawidrylko/lattice-dimers/actions/workflows/pages.yml/badge.svg)](https://github.com/dawidrylko/lattice-dimers/actions/workflows/pages.yml)
[![Paper](https://img.shields.io/badge/Paper-PDF-ab3415?style=flat)](https://dawidrylko.github.io/lattice-dimers/papers/king-entropy.pdf)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23686293.svg)](https://doi.org/10.5281/zenodo.23686293)
[![Site](https://img.shields.io/badge/Site_%26_notebooks-dawidrylko.github.io-044cb6?style=flat)](https://dawidrylko.github.io/lattice-dimers/)

Research code, data and papers on dimer coverings of two lattices: the square lattice, whose perfect matchings are domino tilings, and the king's graph, the square lattice with both diagonals, whose perfect matchings are domicule tilings. The repository holds a paper on the entropy per site of the king's graph dimers with its companion note, exact solvers for both kinds of tilings up to $20 \times 20$, and a site that recounts the exact terms on each deploy and checks the research results against the committed data.

## Research: the dimer entropy of the king's graph

The king's graph is not planar, and its boards with both sides at least 3 admit no Pfaffian orientation, so Kasteleyn's method does not apply. Row transfer matrices on cylinders of circumference up to 25 are split by a conserved parity of the dimers crossing a loop. Their growth rates, extrapolated in the circumference with predictive backtests and an error budget, give the entropy per site with an error bar of 6·10⁻¹⁶. Computer-assisted Collatz-Wielandt certificates prove a two-sided bound.

| quantity | value | status |
| --- | --- | --- |
| entropy per site $s$ | 0.5655119110413253 ± 6·10⁻¹⁶ | estimate, not rigorous |
| bounds on $s$ | 0.545343749727 ≤ s ≤ 0.582767477484 | proved, computer-assisted |
| surface free energy $\sigma$ of a free edge | 0.242017935766251 ± 9·10⁻¹⁵ | estimate |
| corner free energy $\kappa$ | 0.36319625605 ± 3·10⁻¹⁰ | estimate |
| decay length $\xi$ of the parity splitting | 1.236091 ± 10⁻⁶ | estimate |

The free energies give the asymptotics of [A239273](https://oeis.org/A239273), $a(n) \sim e^{\kappa}\, e^{4sn^2} e^{-8\sigma n}$, with relative error $6 \cdot 10^{-8}$ at $n = 10$.

- Paper: *The dimer entropy of the king's graph* ([PDF](research/king-entropy/paper/king-entropy.pdf), [source](research/king-entropy/paper/king-entropy.tex)).
- Companion note: *Log-convexity of strip dimer counts on the king's graph* ([PDF](research/king-entropy/paper/king-entropy-log-convexity.pdf), [source](research/king-entropy/paper/king-entropy-log-convexity.tex)), the convexity hypothesis tested in 1453 cases and where it fails.
- [Research page](https://dawidrylko.github.io/lattice-dimers/notes/research.html): the results above read from the committed data on every build.
- [`research/king-entropy`](research/king-entropy): scripts, data, outputs, proofs of the bounds, and [`replication/`](research/king-entropy/replication/REPORT.md), an independent recomputation written from scratch. [`paper/NUMBERS.md`](research/king-entropy/paper/NUMBERS.md) maps every number of the paper to its output file and script.

The code, data and both preprints are archived on Zenodo: the paper as [10.5281/zenodo.23686056](https://doi.org/10.5281/zenodo.23686056), the companion note as [10.5281/zenodo.23686087](https://doi.org/10.5281/zenodo.23686087), and the code and data of the tag `king-entropy-v1.0.0` as [10.5281/zenodo.23686293](https://doi.org/10.5281/zenodo.23686293) ([`ZENODO.md`](research/king-entropy/release/ZENODO.md)).

## Exact counts: OEIS A004003 and A239273

How many ways are there to cover a $2n \times 2n$ board with pieces that each cover two neighbouring cells, and what does any one of those coverings look like? For dominoes, which join cells that share a side, the count is [OEIS A004003](https://oeis.org/A004003) and has a closed form found by [Kasteleyn](https://doi.org/10.1016/0031-8914%2861%2990063-5) and [Fisher](https://doi.org/10.1103/PhysRev.124.1664) in 1961. For domicules, which may also join cells that share only a corner, the count is [OEIS A239273](https://oeis.org/A239273) on squares and [A239264](https://oeis.org/A239264) on rectangles, and no closed form is used here. This repository counts both exactly, numbers every tiling so that any single one can be drawn from its number, and samples tilings of boards too large to number. It evaluates the domino product formula exactly as a resultant of two integer polynomials, counts domicule tilings with a cell-by-cell transfer that runs modulo primes in parallel and is rebuilt with the Chinese remainder theorem, and checks the solvers against each other, against the OEIS and against two PARI/GP programs run in CI.

Both sequences up to $20 \times 20$. The site recounts the $20 \times 20$ domicule term on every build and the modular solver checks it against an extra prime.

| n | board | A004003 (dominoes) | A239273 (domicules) |
| --: | --- | --: | --: |
| 0 | 0×0 | 1 | 1 |
| 1 | 2×2 | 2 | 3 |
| 2 | 4×4 | 36 | 280 |
| 3 | 6×6 | 6728 | 3037561 |
| 4 | 8×8 | 12988816 | 3263262629905 |
| 5 | 10×10 | 258584046368 | 326207195516663381931 |
| 6 | 12×12 | 53060477521960000 | 3011882198082438957330143630563 |
| 7 | 14×14 | 112202208776036178000000 | 2565014347691062208319404612723752103028288 |
| 8 | 16×16 | 2444888770250892795802079170816 | 201442620359313683494245316355883565275531844406384955392 |
| 9 | 18×18 | 548943583215388338077567813208427340288 | 1458834332808489549111708247664894524221330758005874053074138540424018259 |
| 10 | 20×20 | 1269984011256235834242602753102293934298576249856 | 974206002957112698855240779762528002509423239819130603938953917534367085458193363176670427 |

## Tori, cylinders and diagonal pieces

Two more families of counts. The OEIS has no entry for the king's graph or triangular tori, or for the diagonal triangle below; it was searched by terms and by name on 30 October 2026.

**Cylinders and tori.** [`periodicTilingSolver-BigInt.js`](src/solvers/periodicTilingSolver-BigInt.js) (transfer by rows) and [`periodicTilingSolver-Modular.js`](src/solvers/periodicTilingSolver-Modular.js) (transfer by cells modulo primes) count the tilings of cylinders and tori on the square lattice, the triangular lattice and the king's graph. On the square lattice they reproduce [A335586](https://oeis.org/A335586), [A253678](https://oeis.org/A253678), [A281679](https://oeis.org/A281679) and [A006253](https://oeis.org/A006253). The domicule tilings of the $2n \times 2n$ torus, with the multiple edges of the $2 \times 2$ torus counted as separate pieces, as in A335586:

| n | torus | domicule tilings |
| --: | --- | --: |
| 1 | 2×2 | 24 |
| 2 | 4×4 | 17552 |
| 3 | 6×6 | 1393836408 |
| 4 | 8×8 | 10460530355843328 |
| 5 | 10×10 | 7259829482503772231361024 |
| 6 | 12×12 | 464778919849879305868191391185324176 |
| 7 | 14×14 | 2743949253453878323721620757393919402021091285528 |
| 8 | 16×16 | 1493818604384654177402428232647033968399591852459255168583663616 |

Up to $10 \times 10$ both solvers agree on these terms; the larger ones come from the modular solver alone, checked against one more prime.

A torus has no boundary, so the count has no surface or corner term. Divided by $e^{sL^2}$ it tends to 2 on the king's graph and on the triangular lattice, but not on the square lattice, which is critical, and $\log(Z/2)/L^2$ agrees with the entropy per site of the king's graph to $5 \cdot 10^{-10}$ at $L = 16$, with no extrapolation model ([notebook](notes/04-torus.md)).

**Diagonal pieces.** [`domiculeDiagonalSolver-BigInt.js`](src/solvers/domiculeDiagonalSolver-BigInt.js) and [`domiculeDiagonalSolver-Modular.js`](src/solvers/domiculeDiagonalSolver-Modular.js) count the domicule tilings by the number of pieces that join two cells sharing only a corner. On the $2n \times 2n$ board that number is even, and the triangle of the tilings with $0, 2, \dots, 2n^2$ diagonal pieces begins 1; 2, 1; 36, 126, 105, 12, 1; 6728, 84132, 413932, 934213, 1000638, 491689, 99554, 6638, 36, 1. Its first column is A004003, its row sums are A239273, and it is counted up to $18 \times 18$ ([notebook](notes/05-diagonals.md)).

The PARI/GP programs, both run in CI: [`pari/king-torus.gp`](pari/king-torus.gp), where `T(h, w)` is the $h \times w$ torus and `a(n)` the $2n \times 2n$ one, and [`pari/king-diagonals.gp`](pari/king-diagonals.gp), where `P(h, w)` is the polynomial in $x$ and `row(n)` a row of the triangle.

```gp
R(w, c, f, t) = {
  my(v = []);
  if (c == w, return([t]));
  if (bittest(f, c), return(R(w, c+1, f, t)));
  if (c+1 < w && !bittest(f, c+1), v = concat(v, R(w, c+2, f + 2^c + 2^(c+1), t)));
  if (c == 0 && !bittest(f, w-1), v = concat(v, R(w, 1, f + 1 + 2^(w-1), t)));
  for (d = -1, 1, my(j = (c+d) % w); if (!bittest(t, j), v = concat(v, R(w, c+1, f + 2^c, t + 2^j))));
  v
};
M(w) = {
  my(A = matrix(2^w, 2^w));
  for (f = 0, 2^w-1, my(v = R(w, 0, f, 0)); for (i = 1, #v, A[f+1, v[i]+1]++));
  A
};
T(h, w) = trace(M(w)^h);
a(n) = T(2*n, 2*n);
```

```gp
P(h, w) = {
  my(S = 2^(w+2), v = vector(S), u);
  if (h*w == 0, return(1));
  v[1] = 1;
  for (p = 0, h*w-1,
    my(r = p\w, c = p%w, d = [], e = []);
    if (c+1 < w, d = concat(d, 1); e = concat(e, 1));
    if (r+1 < h,
      if (c > 0, d = concat(d, w-1); e = concat(e, x));
      d = concat(d, w); e = concat(e, 1);
      if (c+1 < w, d = concat(d, w+1); e = concat(e, x)));
    u = vector(S);
    for (s = 0, S-1,
      my(y = v[s+1]);
      if (y,
        if (bitand(s, 1),
          u[(s>>1) + 1] += y,
          for (i = 1, #d, if (!bittest(s, d[i]), my(t = (s + 2^d[i])>>1); u[t+1] += e[i]*y)))));
    v = u);
  v[1]
};
row(n) = my(q = P(2*n, 2*n)); vector(n^2+1, k, polcoef(q, 2*(k-1)));
```

## Notes

The notes are Markdown files with code cells. The site build runs every cell and publishes the output under it, so the rendered pages are notebooks whose results are recomputed from this repository on every deploy.

- [Research](notes/00-research.md) ([rendered](https://dawidrylko.github.io/lattice-dimers/notes/research.html)): the king's graph paper in brief, its results checked against the committed data, and the asymptotics of A239273 against the exact terms.
- [Method](notes/01-method.md) ([rendered](https://dawidrylko.github.io/lattice-dimers/notes/method.html)): the closed form and the resultant, transfer by rows and by cells, numbering, coupling from the past, counting modulo primes, the Markov chain for domicules, and how every number is verified.
- [A004003 notebook](notes/02-a004003.md) ([rendered](https://dawidrylko.github.io/lattice-dimers/notes/a004003.html)): three methods side by side, the floating-point error of the product, the polynomial behind the resultant, running times.
- [A239273 notebook](notes/03-a239273.md) ([rendered](https://dawidrylko.github.io/lattice-dimers/notes/a239273.html)): the sequence up to $20 \times 20$, the A239264 table, the Kahn-Lovász bound, the Chinese remainder theorem at work, a uniformity test of the Markov chain.
- [Tori and cylinders](notes/04-torus.md) ([rendered](https://dawidrylko.github.io/lattice-dimers/notes/torus.html)): both periodic solvers checked against each other and the OEIS, the king's graph on the $2n \times 2n$ torus, the torus count over $e^{sL^2}$ on three lattices, the seam sign, cylinders.
- [Diagonal pieces](notes/05-diagonals.md) ([rendered](https://dawidrylko.github.io/lattice-dimers/notes/diagonals.html)): the domicule tilings of the $2n \times 2n$ board by the number of diagonal pieces, their share and the weighted counts.

## Method in brief

The numbers $4\cos^2(j\pi/(2n+1))$ in the domino product are the roots of a monic integer polynomial $P$ with $P(x^2) = U_{2n}(x/2)$. The product therefore equals $(-1)^n \mathrm{Res}(P(x), P(-x))$, the determinant of a $2n \times 2n$ integer matrix, which fraction-free [Bareiss elimination](https://doi.org/10.1090/S0025-5718-1968-0226829-0) (1968) computes exactly.

Both kinds of tilings are also counted by transfer. Dominoes go row by row with a bitmask of the next row. Domicules go cell by cell with a state of the next $w + 2$ cells, because a cell can be matched with its right, down-left, down or down-right neighbour. That transfer only adds, so it runs modulo primes below $2^{31}$ in `Uint32Array` tables, one worker thread per prime; the Kahn-Lovász bound ([Alon and Friedland, 2008](https://doi.org/10.37236/888)) gives the number of primes, the Chinese remainder theorem rebuilds the count, and one more prime checks it.

A table of completion counts turns a number into a tiling. Domino tilings too large to number are sampled exactly with monotone [coupling from the past](https://doi.org/10.1002/%28SICI%291098-2418%28199608/09%299:1/2%3C223::AID-RSA14%3E3.0.CO;2-O) (Propp and Wilson, 1996). The full references are in the [method note](notes/01-method.md#references). Domicule tilings are sampled with a symmetric Markov chain of pair swaps, which is only approximately uniform.

The PARI/GP programs, both run in CI against the known values:

```gp
a(n) = my(P = substpol(polchebyshev(2*n, 2, x/2), x^2, x)); (-1)^n * polresultant(P, subst(P, x, -x));
```

```gp
T(h, w) = {
  my(S = 2^(w+2), v = vector(S), u);
  if (h*w == 0, return(1));
  v[1] = 1;
  for (p = 0, h*w-1,
    my(r = p\w, c = p%w, d = []);
    if (c+1 < w, d = concat(d, 1));
    if (r+1 < h,
      if (c > 0, d = concat(d, w-1));
      d = concat(d, w);
      if (c+1 < w, d = concat(d, w+1)));
    u = vector(S);
    for (s = 0, S-1,
      my(x = v[s+1]);
      if (x,
        if (bitand(s, 1),
          u[(s>>1) + 1] += x,
          for (i = 1, #d, if (!bittest(s, d[i]), my(t = (s + 2^d[i])>>1); u[t+1] += x)))));
    v = u);
  v[1]
};
a(n) = T(2*n, 2*n);
```

The first is [`pari/A004003.gp`](pari/A004003.gp), the second [`pari/A239273.gp`](pari/A239273.gp), where `T(h, w)` is A239264 and `a(n)` is A239273.

## Repository layout

```text
src/solvers/      command-line solvers, one file per method
  dominoTilingSolver.js             dominoes, transfer by rows, Number (exact up to 10×10)
  dominoTilingSolver-BigInt.js      dominoes, transfer by rows, BigInt
  dominoTilingSolver-Formula.js     dominoes, the product formula as a resultant
  domiculeTilingSolver-BigInt.js    domicules, transfer by cells, BigInt (reference)
  domiculeTilingSolver-Modular.js   domicules, transfer modulo primes, worker threads, CRT
  periodicTilingSolver-BigInt.js    cylinders and tori on three lattices, transfer by rows, BigInt (reference)
  periodicTilingSolver-Modular.js   cylinders and tori on three lattices, transfer by cells modulo primes
  domiculeDiagonalSolver-BigInt.js  domicules by the number of diagonal pieces, BigInt (reference)
  domiculeDiagonalSolver-Modular.js domicules by the number of diagonal pieces, modulo primes
src/renderer/     numbering, coupling from the past, the domicule chain, SVG and ASCII output
src/dominoTilingRenderer.js         command line for drawing tilings
pari/             PARI/GP programs
notes/            the research page, the method and the notebooks, built into the site
data/             known values the solvers, the PARI programs and the site are checked against
tests/            test runners for the solvers, the renderer, the PARI programs and the site
benchmarks/       the benchmark runner and its results, one directory per month and machine
site/             the site: gallery, benchmark tables, notes
research/         research write-ups: king-entropy, the entropy of the king's graph and its paper
```

## Reproducing the results

Requirements: [Node.js](https://nodejs.org/) 26 or newer (`.nvmrc`), [pnpm](https://pnpm.io/) (version pinned in `package.json`), and for the PARI tests [PARI/GP](https://pari.math.u-bordeaux.fr/) (`apt install pari-gp`, `brew install pari`; set `GP_PATH` when `gp` is not on the `PATH`).

```sh
git clone https://github.com/dawidrylko/lattice-dimers.git
cd lattice-dimers
pnpm install
```

Counting a single board:

```sh
node src/solvers/dominoTilingSolver-Formula.js -r 20 -c 20
node src/solvers/domiculeTilingSolver-Modular.js -r 20 -c 20    # -j <jobs> sets the number of worker threads
node src/solvers/periodicTilingSolver-Modular.js -r 12 -c 12 --torus             # the king's graph on the 12×12 torus
node src/solvers/periodicTilingSolver-Modular.js -r 8 -c 6 --lattice triangular  # a triangular cylinder, circumference 6
node src/solvers/domiculeDiagonalSolver-Modular.js -r 16 -c 16                    # coefficients by the number of diagonal pieces
```

Verification:

```sh
pnpm test           # solvers against data/, up to 12×12 (node tests/testRunner.js runs every known term)
pnpm test:render    # numbering, sampling and drawing
pnpm test:pari      # both PARI/GP programs and their copies in this README
pnpm site:build     # runs the notebooks and builds dist/site
pnpm test:site      # the built site in headless Chrome at 1440, 786 and 375 px (set CHROME_PATH if needed)
```

Benchmarks:

```sh
pnpm benchmark            # domino solvers, results in benchmarks/results/<year-month>
pnpm benchmark:domicule   # domicule solvers, 10 runs up to 16×16 and one run of 18×18 and 20×20
```

A run writes `environment.json` next to the timings and refuses to mix machines or Node.js versions in one month directory unless given `--force`. The site shows the newest directory that holds the largest board of every solver. Older runs stay in [`benchmarks/results`](benchmarks/results): March 2024 (machine not recorded) and April 2024 (100,000 runs per board on an Intel Core i7-8700).

## Drawing tilings

Every tiling has a number, and the renderer rebuilds any tiling from it without listing the ones before:

```sh
pnpm render -r 8 -c 8 -o 5000 -l 200              # tilings 5001-5200 of 12,988,816, as SVG sheets in output/8x8/
pnpm render -r 12 -c 12 -i 1000000000000 --ascii  # one tiling, printed in the terminal
pnpm render -r 20 -c 20 --random -l 12            # 12 uniformly random tilings (coupling from the past)
pnpm render -r 4 -c 4 --domicule --all            # all 280 domicule tilings of a 4×4 board
pnpm render -r 20 -c 20 --domicule --random -l 6  # six approximately uniform domicule tilings
```

The gallery draws a tiling in three styles. Below are the same four 8×8 domicule tilings in each of them; `pnpm readme:images` regenerates the images, and `pnpm test:render` fails when they no longer match the renderer.

**Blocks**, every piece as a bar:

![Four 8×8 domicule tilings drawn as blocks](.github/assets/gallery-blocks.svg)

**Dimer graph**, every piece as an edge between the centres of its two cells:

![The same four tilings drawn as a dimer graph](.github/assets/gallery-dimer.svg)

**Engraving**, outlined cells with diagonal pieces hatched along their direction:

![The same four tilings drawn as an engraving](.github/assets/gallery-engraving.svg)

`-l` limits the number of tilings (default 1000), `-o` skips tilings, `-i` draws one tiling by its 1-based number, `--random` samples, `--all` lifts the limit on boards with at most 100,000 tilings, `--ascii` prints instead of writing SVG. The command line numbers boards whose table has at most 4 million entries: dominoes up to 14×14, domicules up to 12×12. The [gallery](https://dawidrylko.github.io/lattice-dimers/) does the same in the browser, up to 18×18 for dominoes and 16×16 for domicules, with sampling above that.

## Citation

If you use the code or the counts, cite the repository; [`CITATION.cff`](CITATION.cff) holds the metadata, and GitHub offers it as BibTeX under "Cite this repository". For the entropy of the king's graph, cite the paper as given on the [research page](https://dawidrylko.github.io/lattice-dimers/notes/research.html#how-to-cite); the DOIs are `10.5281/zenodo.23686056` for the paper and `10.5281/zenodo.23686293` for the code and data behind it.

## License

The code is MIT, see [LICENSE](LICENSE). Text and data are licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), see
[LICENSES/CC-BY-4.0.txt](LICENSES/CC-BY-4.0.txt). CC BY 4.0 covers exactly these paths:

- text: `research/king-entropy/paper/`, `research/king-entropy/proofs/`, `research/king-entropy/notes/`,
  `research/king-entropy/release/`, `research/king-entropy/replication/REPORT.md` and `notes/`;
- data: `research/king-entropy/data/`, `research/king-entropy/out/`, `research/king-entropy/logs/`,
  `research/king-entropy/replication/out/`, the outputs `research/king-entropy/log-convexity/out_*.txt` and
  `research/king-entropy/log-convexity/time_*.txt`, the JSON files in `data/` and the measurements in `benchmarks/results/`.

Everything else is MIT, in particular all programs and scripts: `src/`, `pari/`, `site/`, `tests/`,
`benchmarks/benchmarkRunner.js`, `data/index.js`, `research/king-entropy/src/`,
`research/king-entropy/log-convexity/*.py` and the code in `research/king-entropy/replication/`.

## Author

[Dawid Ryłko](https://dawidrylko.com). The first version of the domino solvers and the test and benchmark runners is described in two blog posts (in Polish): [Domino Tiling](https://dawidrylko.com/domino-tiling/) and [Domino tiling library](https://dawidrylko.com/domino-tiling-library/).
