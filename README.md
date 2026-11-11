# <img src=".github/assets/dimer.svg" alt="" width="36" height="36"> Lattice Dimers

[![Continuous Integration](https://github.com/dawidrylko/lattice-dimers/actions/workflows/ci.yml/badge.svg)](https://github.com/dawidrylko/lattice-dimers/actions/workflows/ci.yml)
[![Pages](https://github.com/dawidrylko/lattice-dimers/actions/workflows/pages.yml/badge.svg)](https://github.com/dawidrylko/lattice-dimers/actions/workflows/pages.yml)
[![Paper](https://img.shields.io/badge/Paper-PDF-ab3415?style=flat)](https://dawidrylko.github.io/lattice-dimers/papers/king-entropy.pdf)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23686293.svg)](https://doi.org/10.5281/zenodo.23686293)
[![Site](https://img.shields.io/badge/Site_%26_notebooks-dawidrylko.github.io-044cb6?style=flat)](https://dawidrylko.github.io/lattice-dimers/)

Research code, data and papers on dimer coverings of two lattices: the square lattice, whose perfect matchings are domino tilings, and the king's graph, the square lattice with both diagonals, whose perfect matchings are domicule tilings. The repository holds a paper on the entropy per site of the king's graph dimers with its companion note, exact solvers for rectangles, cylinders and tori, and the OEIS entries built on them.

<table>
  <tr>
    <td align="center"><img src=".github/assets/showcase-domino.svg" alt="A domino tiling of an 8×8 board" width="200"></td>
    <td align="center"><img src=".github/assets/showcase-domicule.svg" alt="A domicule tiling of an 8×8 board" width="200"></td>
    <td align="center"><img src=".github/assets/showcase-cylinder.svg" alt="A domicule tiling of the 8×8 cylinder" width="200"></td>
    <td align="center"><img src=".github/assets/showcase-torus.svg" alt="A domicule tiling of the 8×8 torus" width="200"></td>
  </tr>
  <tr>
    <td align="center">dominoes, 8 × 8</td>
    <td align="center">domicules, 8 × 8</td>
    <td align="center">domicules, 8 × 8 cylinder</td>
    <td align="center">domicules, 8 × 8 torus</td>
  </tr>
</table>

## Solvers

| solver | Rust | Python | JS |
| --- | --- | --- | --- |
| `domino-rectangle-formula` | [✅](rust/solvers/src/bin/domino-rectangle-formula.rs) | [✅](python/lattice_dimers/solvers/domino_rectangle_formula.py) | [✅](js/solvers/domino-rectangle-formula.js) |
| `domino-rectangle-bigint` | [✅](rust/solvers/src/bin/domino-rectangle-bigint.rs) | [✅](python/lattice_dimers/solvers/domino_rectangle_bigint.py) | [✅](js/solvers/domino-rectangle-bigint.js) |
| `domino-rectangle-number` | [✅](rust/solvers/src/bin/domino-rectangle-number.rs) | [✅](python/lattice_dimers/solvers/domino_rectangle_number.py) | [✅](js/solvers/domino-rectangle-number.js) |
| `domicule-rectangle-modular` | [✅](rust/solvers/src/bin/domicule-rectangle-modular.rs) | [✅](python/lattice_dimers/solvers/domicule_rectangle_modular.py) | [✅](js/solvers/domicule-rectangle-modular.js) |
| `domicule-rectangle-bigint` | [✅](rust/solvers/src/bin/domicule-rectangle-bigint.rs) | [✅](python/lattice_dimers/solvers/domicule_rectangle_bigint.py) | [✅](js/solvers/domicule-rectangle-bigint.js) |
| `domicule-rectangle-polynomial-modular` | [✅](rust/solvers/src/bin/domicule-rectangle-polynomial-modular.rs) | [✅](python/lattice_dimers/solvers/domicule_rectangle_polynomial_modular.py) | [✅](js/solvers/domicule-rectangle-polynomial-modular.js) |
| `domicule-rectangle-polynomial-bigint` | [✅](rust/solvers/src/bin/domicule-rectangle-polynomial-bigint.rs) | [✅](python/lattice_dimers/solvers/domicule_rectangle_polynomial_bigint.py) | [✅](js/solvers/domicule-rectangle-polynomial-bigint.js) |
| `domicule-cylinder-torus-polynomial-modular` | [✅](rust/solvers/src/bin/domicule-cylinder-torus-polynomial-modular.rs) | [✅](python/lattice_dimers/solvers/domicule_cylinder_torus_polynomial_modular.py) | [✅](js/solvers/domicule-cylinder-torus-polynomial-modular.js) |
| `domicule-cylinder-torus-polynomial-bigint` | [✅](rust/solvers/src/bin/domicule-cylinder-torus-polynomial-bigint.rs) | [✅](python/lattice_dimers/solvers/domicule_cylinder_torus_polynomial_bigint.py) | [✅](js/solvers/domicule-cylinder-torus-polynomial-bigint.js) |
| `all-lattices-cylinder-torus-modular` | [✅](rust/solvers/src/bin/all-lattices-cylinder-torus-modular.rs) | [✅](python/lattice_dimers/solvers/all_lattices_cylinder_torus_modular.py) | [✅](js/solvers/all-lattices-cylinder-torus-modular.js) |
| `all-lattices-cylinder-torus-bigint` | [✅](rust/solvers/src/bin/all-lattices-cylinder-torus-bigint.rs) | [✅](python/lattice_dimers/solvers/all_lattices_cylinder_torus_bigint.py) | [✅](js/solvers/all-lattices-cylinder-torus-bigint.js) |
| `all-lattices-rectangle-modular` | [✅](rust/solvers/src/bin/all-lattices-rectangle-modular.rs) | [✅](python/lattice_dimers/solvers/all_lattices_rectangle_modular.py) | [✅](js/solvers/all-lattices-rectangle-modular.js) |
| `all-lattices-rectangle-bigint` | [✅](rust/solvers/src/bin/all-lattices-rectangle-bigint.rs) | [✅](python/lattice_dimers/solvers/all_lattices_rectangle_bigint.py) | [✅](js/solvers/all-lattices-rectangle-bigint.js) |

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
| [`notes`](notes/README.md) | notebooks on dominoes and domicules on rectangles, cylinders and tori, on diagonal pieces, on the triangular lattice on rectangles, cylinders and tori, and on the research, built into the [site](https://dawidrylko.github.io/lattice-dimers/) |
| [`spec`](spec/README.md) | the solver contract, the registry of algorithms and the known counts every implementation and program is checked against |
| [`rust`](rust/README.md) | the Rust solvers, for the algorithms [`spec/algorithms.json`](spec/algorithms.json) lists with Rust, and the library they share; its manifest is [`Cargo.toml`](rust/Cargo.toml) |
| [`python`](python/README.md) | the Python package `lattice_dimers`: the Python solvers, for the algorithms `spec/algorithms.json` lists with Python, and the library they share; its manifest is [`pyproject.toml`](python/pyproject.toml) |
| [`js`](js/README.md) | the JavaScript solvers for rectangles, cylinders and tori, and the renderer that numbers, samples and draws tilings; its manifest is [`package.json`](js/package.json), which also holds the commands of the test runners and the site |
| [`docs`](docs/glossary.md) | the glossary of the words the repository uses for pieces, lattices, surfaces, signs, the site and the code |
| [`harness`](harness/README.md) | the checks of the whole repository: its data, its Markdown, its metadata and the check that keeps the languages in step; each language has its own tests |
| [`benchmarks`](benchmarks/README.md) | the benchmark results |
| `site` | the build of the [site](https://dawidrylko.github.io/lattice-dimers/): the gallery, the benchmark tables and the notebooks |

## Citation

[`CITATION.cff`](CITATION.cff) holds the metadata of the repository, and GitHub offers it as BibTeX under "Cite this repository". For the entropy of the king's graph, cite the paper as given on the [research page](https://dawidrylko.github.io/lattice-dimers/notes/research.html#how-to-cite).

## License

The code is MIT, see [LICENSE](LICENSE). Text and data are licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), see
[LICENSES/CC-BY-4.0.txt](LICENSES/CC-BY-4.0.txt). CC BY 4.0 covers exactly these paths:

- text: `research/king-entropy/paper/`, `research/king-entropy/proofs/`, `research/king-entropy/notes/`,
  `research/king-entropy/release/`, `research/king-entropy/replication/REPORT.md` and `notes/`;
- data: `research/king-entropy/data/`, `research/king-entropy/out/`, `research/king-entropy/logs/`,
  `research/king-entropy/rerun/`, `research/king-entropy/replication/out/`, the outputs `research/king-entropy/log-convexity/out_*.txt` and
  `research/king-entropy/log-convexity/time_*.txt`, the JSON files in `spec/cases/` and the measurements in `benchmarks/results/`.

The entry texts `oeis/*/A*.txt` are copies of OEIS content, which the OEIS Foundation licenses under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), see [LICENSES/CC-BY-SA-4.0.txt](LICENSES/CC-BY-SA-4.0.txt);
they keep that license. The b-files `oeis/*/b*.txt` are built from the counts of this repository and are MIT.

Everything else is MIT, in particular all programs and scripts: `rust/`, `python/`, `js/`, the programs in `oeis/`, `site/`, `harness/`, `research/king-entropy/src/`,
`research/king-entropy/log-convexity/*.py`, `research/king-entropy/rerun/2026-10/release/step0-rerun.sh` and the code in `research/king-entropy/replication/`.

## Author

[Dawid Ryłko](https://dawidrylko.com), ORCID [0009-0008-6307-9015](https://orcid.org/0009-0008-6307-9015).

The project began as two blog posts in Polish, [Domino Tiling](https://dawidrylko.com/domino-tiling/) and [Domino tiling library](https://dawidrylko.com/domino-tiling-library/), which describe the first domino solvers and their test and benchmark runners. The domicule solvers, the research on the king's graph and the OEIS entries grew from that code.
