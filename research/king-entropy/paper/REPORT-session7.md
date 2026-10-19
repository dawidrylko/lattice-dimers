# Session 7 report: paper PDF rebuild after the repo rename

No new research; the PDF was rebuilt from unchanged sources at 72fd374.

## Build

- `latexmk -C && latexmk -pdf main.tex` (TeX Live, pdfTeX 1.40.25): exit code 0.
- LaTeX/pdfTeX warnings: 0. BibTeX warnings: 0 (`main.blg`: `warning$ -- 0`).
- Overfull/underfull boxes: 0.
- Pages: 12 (same as before).
- No source changes were needed.

## `pdftotext main.pdf - | grep -n -E "domino-tiling|d/king-entropy|lattice-dimers|v1.0-king-entropy"`

```
788:https://github.com/dawidrylko/lattice-dimers,
789:tag v1.0-king-entropy [TODO: tag not yet created], directory research/king-entropy/.
840:https://github.com/dawidrylko/lattice-dimers at the tag v1.0-king-entropy [TODO:
```

No `domino-tiling`, no branch name; the repo URL and the tag with its visible TODO are present.

## `pdfinfo main.pdf`

```
Title:           The dimer entropy of the king's graph
Author:          Dawid Ryłko
Creator:         LaTeX with hyperref
Producer:        pdfTeX-1.40.25
Pages:           12
```

## Commits

- d036b1c `build(research): rebuild paper PDF after the lattice-dimers rename`
- this report: `docs(research): REPORT-session7.md`
