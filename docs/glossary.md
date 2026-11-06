# Glossary

The words this repository uses for its pieces, lattices, surfaces, signs, site and code, in the README files, the notes, the site, the research notes, the papers and the code comments. Use these words and avoid the ones listed against them. A new term, or a correction to one, is added here in the same change that introduces it.

Three exceptions. The OEIS entry texts in [`oeis/`](../oeis) are quoted as they stand on the OEIS, so they keep the OEIS wording ("diagonal domicule", the link text of a `%H` line). An avoided name is avoided as the name of one notebook, page or tab; a section that describes two surfaces together may name both. Text that a script prints into a recorded output keeps its wording until the output is recomputed, so [`research/king-entropy/src/cw.py`](../research/king-entropy/src/cw.py) still prints "king lattice" into `out/out_cw.txt`.

## Pieces

| term | meaning | where it is used | avoid |
| --- | --- | --- | --- |
| domino, dominoes | a piece that covers two cells sharing a side; a domino tiling is a perfect matching of the grid graph, counted on the 2n × 2n board in [OEIS A004003](https://oeis.org/A004003) | the Pieces switches of the gallery and the benchmarks, the Dominoes group of the site menu and its notebooks ([`notes/dominoes/`](../notes/dominoes)) | "Straight" as the name of the kind of tiling |
| domicule, domicules | a piece that covers two cells sharing a side or only a corner; a domicule tiling is a perfect matching of the king's graph, counted in [OEIS A239264](https://oeis.org/A239264) and on the 2n × 2n board in [OEIS A239273](https://oeis.org/A239273) | the Pieces switches of the gallery and the benchmarks, the Domicules group of the site menu and its notebooks ([`notes/domicules/`](../notes/domicules)) | "Straight + diagonal" |
| straight piece | a piece of a domicule tiling that covers two cells sharing a side, that is a domino | the Domicules notebooks, the problem section of the Diagonal pieces notebook | |
| diagonal piece | a piece of a domicule tiling that covers two cells sharing only a corner | the gallery's Diagonal pieces filter, the Diagonal pieces notebook ([`notes/domicules/04-diagonal-pieces.md`](../notes/domicules/04-diagonal-pieces.md)) | "diagonal domicule" outside the OEIS texts |

## Lattices

A lattice says which cells of a board are neighbours, and so which pieces a tiling may use. The code picks one with its `lattice` option, `square`, `triangular` or `king` (`sq`, `tri` or `king` in [`research/king-entropy/src/tm.py`](../research/king-entropy/src/tm.py)).

| term | meaning | where it is used | avoid |
| --- | --- | --- | --- |
| square lattice | the graph whose vertices are the cells and whose edges join cells sharing a side; on a rectangle it is the grid graph, and its perfect matchings are the domino tilings | the cylinder and torus notebooks of the three menu groups, the names of the benchmark tables Dominoes on cylinders and Dominoes on tori, the cylinder and torus solvers ([`js/README.md`](../js/README.md)), the controls of the research scripts | |
| triangular lattice | the square lattice with one diagonal in every cell, the one that runs down to the right (↘), so a tiling uses dominoes and ↘ diagonal pieces; the project counts it for comparison | the Triangular lattice group of the site menu and its notebooks ([`notes/triangular-lattice/`](../notes/triangular-lattice)), the comparison of three lattices in the Domicules ▸ Tori notebook, the cylinder and torus solvers, the controls of the papers and the research scripts | "Triangular" alone as the label of the menu group |
| king's graph | the square lattice with both diagonals, so every cell is joined to its eight neighbours; its perfect matchings are the domicule tilings | the titles of both papers, the notebooks, the site, the research notes and scripts | "king graph" and "king-graph", "king lattice", also in a list next to the square and triangular lattices |

## Surfaces

A board is the h × w grid of cells a tiling covers, on any surface; the gallery's Board picker and the code use the word that way. A surface says which edges of the board are glued. The Surface switches of the gallery and the benchmarks pick one, so they name the surface in the singular; a notebook or a benchmark table covers many boards of one surface, so it names them in the plural.

| term | meaning | where it is used | avoid |
| --- | --- | --- | --- |
| rectangle | a board with no glued edges; the 2n × 2n board is the square case | the Surface switches of the gallery and the benchmarks (Rectangle), the gallery sentence of the README and the site, the screen-reader names of the gallery sheets and the notebook drawings ("Domino tiling number 3 of a 4 by 4 rectangle") | "board" for the rectangle alone, as in "a board, cylinder or torus" |
| cylinder, cylinders | a board of circumference w and height h whose left and right edges are glued and which is open at the top and the bottom | the Surface switches of the gallery and the benchmarks (Cylinder), the names of the benchmark tables Dominoes on cylinders and Domicules on cylinders, the Cylinders item of each menu group (`notes/<group>/02-cylinders.md` or `01-cylinders.md`, page `notes/<group>/cylinders.html`) | "Tori and cylinders" as the name of one notebook or tab |
| torus, tori | a board whose left and right edges and top and bottom edges are both glued; tori is the plural, as in the literature | the Surface switches of the gallery and the benchmarks (Torus), the names of the benchmark tables Dominoes on tori and Domicules on tori, the Tori item of each menu group (`notes/<group>/03-tori.md` or `02-tori.md`, page `notes/<group>/tori.html`) | "Torus" as the label of a notebook in the menu or the name of its file or page, except the page `torus.html` that only redirects |
| glued edge | an edge of the board that is identified with the opposite edge; a cylinder has one pair, a torus two | the gallery's legend ("left and right edges glued", "top and bottom edges glued") and its label "pieces across a glued edge", the drawings, the problem sections of the cylinder and torus notebooks | |
| seam | the loop along which a pair of glued edges meet, so a cylinder has one seam and a torus two; a piece that joins the last and the first column crosses the column seam, and on a torus a piece that joins the last and the first row crosses the row seam | the cylinder and torus notebooks, the cylinder and torus solvers and the renderer, the research notes | |
| strip | a board of fixed width w whose length grows without bound; the research counts it row by row and takes the growth rate λ_w of its counts per row. Its sides are either free (a free strip) or glued (a cylinder of circumference w) | the Research notebook ([`notes/00-research.md`](../notes/00-research.md)), the papers, the proofs and the research scripts | |
| free strip | a strip whose sides are not glued, so every piece stays inside it; boundary `free` in [`research/king-entropy/src/tm.py`](../research/king-entropy/src/tm.py) | the lower bound, the Research notebook, the papers, the notes on log-convexity | "open strip" for it |
| open strip | the strip of the upper bound: a free strip whose side cells may also be covered from outside it, each such cell with a weight (z = √φ in [`src/bounds.py`](../research/king-entropy/src/bounds.py), weights by runs of such cells in `src/runweight.py`) | the upper bound, [`proofs/upper-bound.md`](../research/king-entropy/proofs/upper-bound.md), the Research notebook ("the open side of a strip") | |

## Signs

A signed count weighs each tiling with a sign instead of counting it once. The one this repository uses comes from the column seam, and the word twisted marks it in the code and the research notes.

| term | meaning | where it is used | avoid |
| --- | --- | --- | --- |
| seam sign | the sign (-1)^k of a tiling of a cylinder or a torus, where k is the number of pieces that cross the column seam; the row seam of a torus is not counted. The signed count is the difference between the two parities of those crossings, and the papers call the sign a Z2 flux | the Domicules ▸ Tori notebook (section The seam sign), the cylinder and torus solvers, the research notes and the papers | |
| twisted | counted with the seam sign | the option `twisted` and the flag `--twisted` of the cylinder and torus solvers, the field `twisted` of the test cases in `spec/cases/`, the twisted transfer and its twisted levels in the research notes | "twisted" in the prose of the notebooks and the site, where the name is seam sign |
| twisted cut, twisted swap | a cut where two rows agree up to the left-right reflection J, and the swap of the parts below it; neither has anything to do with the seam sign | the notes on log-convexity, `log-convexity/involution.py`, the companion note | |

## Site

The site has the gallery and the benchmarks on its main page and the notebooks on their own pages. The header menu groups the notebooks by the kind of piece or lattice, and each group lists them by surface.

| term | meaning | where it is used | avoid |
| --- | --- | --- | --- |
| notebook | a note in [`notes/`](../notes/README.md) whose code cells run when the site is built, published as a page of the site | the notes, the site, the README files | "method note" for any of them; the method note was split into the notebooks on 2026-11-05 |
| benchmark card | one row of a benchmark table below 920 px, drawn as a card: each cell has its column name above its value, and the name of a solver column is a link like the solver header | the Benchmarks tab ([`site/template.html`](../site/template.html)), the test of `harness/siteTestRunner.js` | |
| notebook title | the h1 of a counting notebook: `<Group>: tilings of <what> (<OEIS>)`, with the OEIS entries the notebook counts, or "not in the OEIS" where no entry fits, as on the triangular lattice on tori. The group is Dominoes, Domicules or Triangular lattice, the Diagonal pieces notebook has "Diagonal pieces: domicule tilings of", and the Research notebook stays outside the pattern | every notebook of a menu group, the test of [`harness/siteTestRunner.js`](../harness/siteTestRunner.js) | "The triangular lattice on tori", "Dominoes on cylinders" as a title |
| notebook skeleton | the common order of the sections of a counting notebook: an intro, The problem, one solver section each, Numbering where the gallery draws the surface, The counts, sections of its own (What the OEIS has, The seam sign), Running time where a benchmark exists, PARI/GP where a program exists, Verification, References | the notebooks of the menu groups, the test of `harness/siteTestRunner.js` | "How the counts are made" as one section for two solvers |
| solver section | the section of a notebook about one solver, named as the solver's column in the benchmark tables: The Formula solver, The Modular solver, The BigInt solver, in the order of the columns; a solver header of a benchmark table, and below 920 px the solver label of its cards, links it. A method such as transfer by rows or the closed form is named in its text | the notebooks of the menu groups, the benchmark tables ([`site/template.html`](../site/template.html)) | |
| section alias | an old section id that still lands on a notebook: an empty `span` with that id inside the heading that took the section over, listed in `SECTION_ALIASES` of [`site/chrome.js`](../site/chrome.js) | the headings of the notebooks, the test of `harness/siteTestRunner.js` | |
| menu group | an entry of the header menu that opens a list of notebooks: Dominoes, Domicules and Triangular lattice; on disk a directory of `notes/` and in the URL a path segment named as the label is (`notes/dominoes/`, `notes/triangular-lattice/`) | the header of every page ([`site/chrome.js`](../site/chrome.js)) | a link on the group label itself |
| Gallery, Benchmarks | the two tabs of the main page, named in the intro of the page and in the README; the gallery draws tilings and the Benchmarks tab shows six tables, chosen by its Pieces and Surface switches | the main page, the README | "Benchmark" in the singular as the label of the tab |
| Research | the entry of the header menu that opens the one notebook on the research, with no group around it (`notes/00-research.md`, page `notes/research.html`) | the header of every page, the intro of the main page, the README | |
| Rectangles, Cylinders, Tori | the items of a menu group, one notebook per surface, named in the plural because a notebook covers many boards; the file and the page are named as the label is (`notes/dominoes/01-rectangles.md`, page `notes/dominoes/rectangles.html`), and so is Diagonal pieces (`diagonal-pieces.html`) | the header menu, the notes README | "Square", "Board" for the Rectangles item; a page path in the singular (`rectangle.html`, `cylinder.html`, `torus.html`), which only redirects |

## Code

An algorithm is a solver apart from its language. [`spec/algorithms.json`](../spec/algorithms.json) names each one by an id and lists the file of every implementation it has.

| term | meaning | where it is used | avoid |
| --- | --- | --- | --- |
| algorithm | a solver apart from its language, named by an id in kebab case: `<pieces>-<surface>-<method>`, such as `domino-rectangle-bigint` | [`spec/contract.md`](../spec/contract.md), `spec/algorithms.json`, the field `algorithms` of the files in [`spec/cases`](../spec/cases/README.md), the port tests of [`harness/testRunner.js`](../harness/testRunner.js) | a name per language, "tiling" or "periodic" in an id |
| `all-lattices-cylinder-torus-*` | the one solver that counts the square lattice, the triangular lattice and the king's graph on cylinders and tori; `--lattice` chooses the lattice, so there is one solver instead of one per lattice | `spec/algorithms.json`, [`js/README.md`](../js/README.md), the benchmark files | |
| `diagonal-pieces-*` | the solvers that count the domicule tilings of a rectangle by the number of diagonal pieces. This name is marked to change; the owner will choose it later | `spec/algorithms.json`, [`js/README.md`](../js/README.md), the Diagonal pieces notebook | |
| implementation | one algorithm in one language: a binary in `rust/solvers/src/bin`, a module in `python/lattice_dimers/solvers` or a script in [`js/solvers`](../js/solvers); Rust is the first language, Python the second, JavaScript the third | `spec/contract.md`, the registry, the executor | "reference implementation" for the Rust one, since reference names the BigInt solver of a Modular one |
| solver contract | the arguments, output, errors and limits every implementation keeps, so the runners and `spec/cases` treat the three languages alike | `spec/contract.md` | |
| pending port | a language missing from an algorithm's entry in `spec/algorithms.json`; the field `pendingPorts` there counts them, and the test holds it to the count | `spec/contract.md`, the registry | |
| time of the count | the time an implementation reports with `--time`, from the end of its argument checks to the count, without the start of its process | `spec/contract.md`, [`benchmarks/README.md`](../benchmarks/README.md), the names of the benchmark tables and the Running time sections of the notebooks | "wall-clock time" for it, since that names the whole process |
| process time | the time of the whole process of one run, start-up included; the benchmark files record it next to the time of the count, and the site shows it in a tooltip | `benchmarks/README.md`, the files in `benchmarks/results` from November 2026 on | |
