# Notes

Each note is Markdown with code cells marked `js run`. `pnpm site:build` runs the cells in order and publishes every note as a page of the [project site](https://dawidrylko.github.io/lattice-dimers/) with the output under each cell, so the results there are recomputed from this repository on every deploy. On GitHub only the code is shown. A cell that throws stops the build, so a cell that checks a result fails the deploy when the result is wrong. Cells write their output with `print`, `table`, `chart`, a line chart drawn as inline SVG in the colours of the page, and `figure(svgs, caption, { highlight })`, a drawing of tilings on a sheet in the colours of the gallery; `drawTilings({ rowCount, colCount, pieces, surface, diagonals, ranks })` in `site/notes.js` draws them with the gallery's renderer, one SVG per tiling named for screen readers, and `highlight` greys out the straight pieces.

The renderer in `site/notes.js` covers a subset of Markdown: headings, paragraphs, flat lists, tables, block quotes, code blocks, `math` blocks and inline `$...$` (rendered with KaTeX), code spans, links, bold and italics. Nested lists and a `|` inside a table cell are not supported.

The notebooks are grouped as the site menu groups them: the notes of each kind of piece or lattice sit in their own directory, and a note `notes/<group>/<nn>-<name>.md` is published as `notes/<group>/<name>.html`. Every notebook says how its counts are made and how they are checked; the rectangles notebooks also say how the gallery numbers and samples the tilings.

- [Research](00-research.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/research.html)): the king's graph paper in brief, with its results read from `research/king-entropy/data/` and the asymptotics of A239273 checked against the exact terms.
- Dominoes:
  - [Rectangles](dominoes/01-rectangle.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/dominoes/rectangle.html)): domino tilings of the 2n × 2n board, A004003, by three methods, the resultant, numbering, sampling by coupling from the past and the running time.
  - [Cylinders](dominoes/02-cylinder.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/dominoes/cylinder.html)): domino tilings of cylinders and the OEIS entry of every circumference up to 8.
  - [Tori](dominoes/03-torus.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/dominoes/torus.html)): domino tilings of tori and A335586.
- Domicules:
  - [Rectangles](domicules/01-rectangle.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/domicules/rectangle.html)): domicule tilings of the 2n × 2n board, A239273, up to 20 × 20, the modular solver and the Markov chain.
  - [Cylinders](domicules/02-cylinder.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/domicules/cylinder.html)): domicule tilings of cylinders, the king's graph on the cylinder.
  - [Tori](domicules/03-torus.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/domicules/torus.html)): domicule tilings of tori, A401670, the torus count of three lattices over $e^{sL^2}$ and the seam sign.
  - [Diagonal pieces](domicules/04-diagonals.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/domicules/diagonals.html)): domicule tilings of the 2n × 2n board by the number of diagonal pieces, A401673.
- Triangular lattice:
  - [Cylinders](triangular/01-cylinder.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/triangular/cylinder.html)): the triangular lattice on cylinders, for comparison.
  - [Tori](triangular/02-torus.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/triangular/torus.html)): the triangular lattice on 2n × 2n tori, for comparison.

The pages of the old notes still answer and send the reader on: `method.html` and `dominoes.html` to Dominoes ▸ Rectangles, `domicules.html` to Domicules ▸ Rectangles, `cylinders.html` to Domicules ▸ Cylinders, `tori.html` and `torus.html` to Domicules ▸ Tori, `diagonals.html` to Diagonal pieces. The OEIS drafts of A401670 and A401673 link to `torus.html` and `diagonals.html`.
