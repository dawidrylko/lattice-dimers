# Notes

Each note is Markdown with code cells marked `js run`. `pnpm site:build` runs the cells in order and publishes every note as a page of the [project site](https://dawidrylko.github.io/lattice-dimers/) with the output under each cell, so the results there are recomputed from this repository on every deploy. On GitHub only the code is shown. A cell that throws stops the build, so a cell that checks a result fails the deploy when the result is wrong. Cells write their output with `print`, `table` and `chart`, a line chart drawn as inline SVG in the colours of the page.

The renderer in `site/notes.js` covers a subset of Markdown: headings, paragraphs, flat lists, tables, block quotes, code blocks, `math` blocks and inline `$...$` (rendered with KaTeX), code spans, links, bold and italics. Nested lists and a `|` inside a table cell are not supported.

0. [Research](00-research.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/research.html)): the king's graph paper in brief, with its results read from `research/king-entropy/data/` and the asymptotics of A239273 checked against the exact terms.
1. [Method](01-method.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/method.html)): how the tilings are counted, numbered and sampled, and how every number is checked.
2. [A004003 notebook](02-a004003.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/a004003.html)): domino tilings by three methods, the resultant and the running time.
3. [A239273 notebook](03-a239273.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/a239273.html)): domicule tilings up to 20 × 20, the modular solver and the Markov chain.
4. [Tori and cylinders notebook](04-torus.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/torus.html)): the king's graph, the triangular and the square lattice on tori, the king's graph on cylinders, and the torus count over $e^{sL^2}$.
5. [A401673 notebook](05-diagonals.md) ([page](https://dawidrylko.github.io/lattice-dimers/notes/diagonals.html)): domicule tilings of the 2n × 2n board by the number of diagonal pieces.
