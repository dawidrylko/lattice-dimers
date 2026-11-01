# Tests

Every command below runs in CI on each pull request, in the order listed, except the full solver run.

| command | runner | what it checks |
| --- | --- | --- |
| `pnpm test` | [`testRunner.js`](testRunner.js) | every solver against the first cases of the files in [`data/`](../data/README.md) (`-m 7`), the command-line parsers, the rejection of invalid boards and the benchmark runner's guards |
| `pnpm test:oeis` | [`../oeis/buildBFiles.js`](../oeis/buildBFiles.js), [`oeisTestRunner.js`](oeisTestRunner.js) | each b-file in [`oeis/`](../oeis/README.md) against a rebuild from the committed counts; the layout of `oeis/`, its table, the README of every entry against its files, the format of the entry texts and b-files, and the PARI program of each entry text against its `A<n>.gp` |
| `pnpm test:markdown` | [`markdownTestRunner.js`](markdownTestRunner.js) | every tracked Markdown file: math that GitHub renders, no math in link text, no `..` in inline math, and every inline relative link resolves |
| `pnpm test:numbers` | [`numbersTestRunner.js`](numbersTestRunner.js) | the constants of the king's graph in the README files, the release texts, the Zenodo metadata and A401669 against the outputs in [`research/king-entropy`](../research/king-entropy/README.md) |
| `pnpm test:render` | [`renderTestRunner.js`](renderTestRunner.js) | numbering, sampling and drawing, and the README images against the renderer |
| `pnpm test:pari` | [`pariTestRunner.js`](pariTestRunner.js) | every `A<n>.gp` in `oeis/` against `data/`, and the PARI program of every entry text against its b-file; needs [PARI/GP](https://pari.math.u-bordeaux.fr/) (`apt install pari-gp`, `brew install pari`, or `GP_PATH`) |
| `pnpm site:build` | [`../site/build.js`](../site/build.js) | runs every notebook cell in [`notes/`](../notes/README.md); a cell that checks a result against the data stops the build when they disagree |
| `pnpm test:site` | [`siteTestRunner.js`](siteTestRunner.js) | the built site in headless Chrome at 1440, 786 and 375 px (`CHROME_PATH` if Chrome is not found) |

`node tests/testRunner.js` without `-m` runs every known term through every solver. It takes hours, the 16 × 16 torus alone about 75 minutes, and runs outside CI.

The CI job `Research` runs the Python checks of [`research/king-entropy`](../research/king-entropy/README.md): `src/test_paths.py`, `src/test_timed.py`, a rerun of `src/derived.py` against `out/out_derived.txt`, and the syntax of `.zenodo.json`.
