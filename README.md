# <img src=".github/assets/dimer.svg" alt="" width="36" height="36"> Lattice Dimers

[![Continuous Integration](https://github.com/dawidrylko/lattice-dimers/actions/workflows/ci.yml/badge.svg)](https://github.com/dawidrylko/lattice-dimers/actions/workflows/ci.yml)
[![Pages](https://github.com/dawidrylko/lattice-dimers/actions/workflows/pages.yml/badge.svg)](https://github.com/dawidrylko/lattice-dimers/actions/workflows/pages.yml)
[![Paper](https://img.shields.io/badge/Paper-PDF-ab3415?style=flat)](https://dawidrylko.github.io/lattice-dimers/papers/king-entropy.pdf)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23686293.svg)](https://doi.org/10.5281/zenodo.23686293)
[![Site](https://img.shields.io/badge/Site_%26_notebooks-dawidrylko.github.io-044cb6?style=flat)](https://dawidrylko.github.io/lattice-dimers/)

Research code, data and papers on dimer coverings of two lattices: the square lattice, whose perfect matchings are domino tilings, and the king's graph, the square lattice with both diagonals, whose perfect matchings are domicule tilings. The repository holds a paper on the entropy per site of the king's graph dimers with its companion note, exact solvers for boards, cylinders and tori, and the OEIS entries built on them.

<table>
  <tr>
    <td align="center"><img src=".github/assets/showcase-domino.svg" alt="A domino tiling of a 10×10 board" width="200"></td>
    <td align="center"><img src=".github/assets/showcase-domicule.svg" alt="A domicule tiling of a 10×10 board" width="200"></td>
    <td align="center"><img src=".github/assets/showcase-cylinder.svg" alt="A domicule tiling of the 10×10 cylinder" width="200"></td>
    <td align="center"><img src=".github/assets/showcase-torus.svg" alt="A domicule tiling of the 10×10 torus" width="200"></td>
  </tr>
  <tr>
    <td align="center">dominoes, 10 × 10</td>
    <td align="center">domicules, 10 × 10</td>
    <td align="center">domicules, 10 × 10 cylinder</td>
    <td align="center">domicules, 10 × 10 torus</td>
  </tr>
</table>

The [gallery](https://dawidrylko.github.io/lattice-dimers/) numbers every tiling of a board, cylinder or torus and draws any single one.

## Results

The king's graph is not planar, and its boards with both sides at least 3 admit no Pfaffian orientation, so Kasteleyn's method does not apply. Transfer matrices on cylinders of circumference up to 25, split by a conserved parity, give the entropy per site; computer-assisted certificates prove a two-sided bound.

| quantity | value | status |
| --- | --- | --- |
| entropy per site $s$ | 0.5655119110413253 ± 6·10⁻¹⁶ | estimate, not rigorous |
| bounds on $s$ | 0.545343749727 ≤ s ≤ 0.582767477484 | proved, computer-assisted |
| surface free energy $\sigma$ of a free edge | 0.242017935766251 ± 9·10⁻¹⁵ | estimate |
| corner free energy $\kappa$ | 0.36319625605 ± 3·10⁻¹⁰ | estimate |
| decay length $\xi$ of the parity splitting | 1.236091 ± 10⁻⁶ | estimate |

- Paper: *The dimer entropy of the king's graph* ([PDF](research/king-entropy/paper/king-entropy.pdf), [doi:10.5281/zenodo.23686056](https://doi.org/10.5281/zenodo.23686056)).
- Companion note: *Log-convexity of strip dimer counts on the king's graph* ([PDF](research/king-entropy/paper/king-entropy-log-convexity.pdf), [doi:10.5281/zenodo.23686087](https://doi.org/10.5281/zenodo.23686087)).
- Code and data of the tag `king-entropy-v1.0.0`: [doi:10.5281/zenodo.23686293](https://doi.org/10.5281/zenodo.23686293).

## Repository

| directory | contents |
| --- | --- |
| [`research/king-entropy`](research/king-entropy/README.md) | scripts, data, outputs, proofs and papers on the entropy of the king's graph |
| [`oeis`](oeis/README.md) | the OEIS entries this repository contributed to, with their b-files and PARI/GP programs |
| [`notes`](notes/README.md) | notebooks on the method and the sequences, built into the [site](https://dawidrylko.github.io/lattice-dimers/) |
| [`src`](src/README.md) | solvers for boards, cylinders and tori, and the renderer that numbers, samples and draws tilings |
| [`data`](data/README.md) | the known counts every solver and program is checked against |
| [`docs`](docs/glossary.md) | the glossary of the words the repository uses for pieces and surfaces |
| [`tests`](tests/README.md) | the test runners and what each one checks |
| [`benchmarks`](benchmarks/README.md) | the benchmark runner and its results |
| `site` | the build of the [site](https://dawidrylko.github.io/lattice-dimers/): the gallery, the benchmark tables and the notebooks |

## Quick start

Node.js 26 or newer (`.nvmrc`) and pnpm:

```sh
git clone https://github.com/dawidrylko/lattice-dimers.git
cd lattice-dimers
pnpm install
node src/solvers/domiculeTilingSolver-Modular.js -r 20 -c 20
pnpm test
```

## Citation

[`CITATION.cff`](CITATION.cff) holds the metadata of the repository, and GitHub offers it as BibTeX under "Cite this repository". For the entropy of the king's graph, cite the paper as given on the [research page](https://dawidrylko.github.io/lattice-dimers/notes/research.html#how-to-cite).

## License

The code is MIT, see [LICENSE](LICENSE). Text and data are licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), see
[LICENSES/CC-BY-4.0.txt](LICENSES/CC-BY-4.0.txt). CC BY 4.0 covers exactly these paths:

- text: `research/king-entropy/paper/`, `research/king-entropy/proofs/`, `research/king-entropy/notes/`,
  `research/king-entropy/release/`, `research/king-entropy/replication/REPORT.md` and `notes/`;
- data: `research/king-entropy/data/`, `research/king-entropy/out/`, `research/king-entropy/logs/`,
  `research/king-entropy/replication/out/`, the outputs `research/king-entropy/log-convexity/out_*.txt` and
  `research/king-entropy/log-convexity/time_*.txt`, the JSON files in `data/` and the measurements in `benchmarks/results/`.

Everything else is MIT, in particular all programs and scripts: `src/`, `oeis/`, `site/`, `tests/`,
`benchmarks/benchmarkRunner.js`, `data/index.js`, `research/king-entropy/src/`,
`research/king-entropy/log-convexity/*.py` and the code in `research/king-entropy/replication/`.

## Author

[Dawid Ryłko](https://dawidrylko.com), ORCID [0009-0008-6307-9015](https://orcid.org/0009-0008-6307-9015).

The project began as two blog posts in Polish, [Domino Tiling](https://dawidrylko.com/domino-tiling/) and [Domino tiling library](https://dawidrylko.com/domino-tiling-library/), which describe the first domino solvers and their test and benchmark runners. The domicule solvers, the research on the king's graph and the OEIS entries grew from that code.
