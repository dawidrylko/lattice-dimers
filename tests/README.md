# Tests

Every command below runs in CI on each pull request, in the order listed, except the full solver run.

| command | runner | what it checks |
| --- | --- | --- |
| `pnpm test` | [`testRunner.js`](testRunner.js) | every solver against the first cases of the files in [`data/`](../data/README.md) (`-m 7`), the Number counts against the BigInt ones and a(0) = 1 of every square, the command-line parsers, the rejection of invalid boards, the command the executor builds for each language, the implementations in `src/solvers` against [`src/ports.json`](../src/ports.json) and `data/` (an algorithm lacks no language that `ports.json` does not list, every language there can be run, every file in `data/` is loaded by `data/index.js` and checks all implementations of an algorithm or none), the benchmark runner's guards, the site build's choice of benchmark run, no `process.exit(0)` in `src/`, and the renderer started from another directory |
| `pnpm test:oeis` | [`../oeis/buildBFiles.js`](../oeis/buildBFiles.js), [`oeisTestRunner.js`](oeisTestRunner.js) | each b-file in [`oeis/`](../oeis/README.md) against a rebuild from the committed counts; the layout of `oeis/`, its table, the README of every entry against its files, the format of the entry texts and b-files, and the PARI program of each entry text against its `A<n>.gp` |
| `pnpm test:markdown` | [`markdownTestRunner.js`](markdownTestRunner.js) | every tracked Markdown file: math that GitHub renders, no math in link text, no `..` in inline math, and every inline relative link resolves |
| `pnpm test:numbers` | [`numbersTestRunner.js`](numbersTestRunner.js) | the constants of the king's graph in the README files, the release texts, the Zenodo metadata and A401669 against the outputs in [`research/king-entropy`](../research/king-entropy/README.md) |
| `pnpm test:metadata` | [`metadataTestRunner.js`](metadataTestRunner.js) | the title and abstract of [`CITATION.cff`](../CITATION.cff) against the README, the description of `package.json` against that title, that `package.json` is private, and the OEIS keywords of both against the entries in `oeis/` |
| `pnpm test:render` | [`renderTestRunner.js`](renderTestRunner.js) | numbering, sampling and drawing, and the README images against the renderer |
| `pnpm test:pari` | [`pariTestRunner.js`](pariTestRunner.js) | every `A<n>.gp` in `oeis/` against `data/`, and the PARI program of every entry text against its b-file; needs [PARI/GP](https://pari.math.u-bordeaux.fr/) (`apt install pari-gp`, `brew install pari`, or `GP_PATH`) |
| `pnpm site:build` | [`../site/build.js`](../site/build.js) | runs every notebook cell in [`notes/`](../notes/README.md); a cell that checks a result against the data stops the build when they disagree. CI starts it from another directory |
| `pnpm test:site` | [`siteTestRunner.js`](siteTestRunner.js) | the built site in headless Chrome at 1440, 786 and 375 px (`CHROME_PATH` if Chrome is not found), the contrast of the highlight and the colours of glued edges in both themes, the notebook drawings (labels of at least 11 px, a name on every tiling, the dark sheet and the greyed pieces, no tile background over its neighbour), and in the built pages every link into the repository, an integrity attribute on every CDN file and the description of the older benchmark runs |

[REGRESSIONS.md](REGRESSIONS.md) lists every defect fixed so far, the check that fails if it comes back, and how that was shown.

`node tests/testRunner.js` without `-m` runs every known term through every solver. It takes hours, the 16 × 16 torus alone about 75 minutes, and runs outside CI.

The CI job `Research` runs the Python checks of [`research/king-entropy`](../research/king-entropy/README.md): `src/test_paths.py`, `src/test_timed.py`, `src/test_regressions.py`, reruns of `src/derived.py`, `src/errbar.py`, `src/hidden_oos.py`, `src/lspec.py` and `src/ltest.py` against their files in `out/` and of `replication/analyze_eig.py` and `replication/compare_eig.py` against theirs in `replication/out/`, and the syntax of `.zenodo.json`.

The CI job `macOS` runs `renderTestRunner.js`, `src/test_timed.py` and the rerun of `src/lspec.py` again on macOS, where a pipe takes output asynchronously, `ru_maxrss` is in bytes and LAPACK is another build.
