# Glossary

The words this repository uses for its pieces and surfaces, in the README files, the notes, the site and the code comments. Use these words and avoid the ones listed against them. A new term, or a correction to one, is added here in the same change that introduces it.

Two exceptions. The OEIS entry texts in [`oeis/`](../oeis) are quoted as they stand on the OEIS, so they keep the OEIS wording ("diagonal domicule", the link text of a `%H` line). An avoided name is avoided as the name of one notebook, page or tab; a section that describes two surfaces together, such as "Cylinders and tori" in the method note, may name both.

## Pieces

| term | meaning | where it is used | avoid |
| --- | --- | --- | --- |
| domino, dominoes | a piece that covers two cells sharing a side; a domino tiling is a perfect matching of the grid graph, counted on the 2n × 2n board in [OEIS A004003](https://oeis.org/A004003) | the gallery's Pieces switch, the Dominoes benchmark tab, the Dominoes notebook ([`notes/02-dominoes.md`](../notes/02-dominoes.md)) | "Straight" as the name of the kind of tiling |
| domicule, domicules | a piece that covers two cells sharing a side or only a corner; a domicule tiling is a perfect matching of the king's graph, counted in [OEIS A239264](https://oeis.org/A239264) and on the 2n × 2n board in [OEIS A239273](https://oeis.org/A239273) | the gallery's Pieces switch, the Domicules benchmark tab, the Domicules notebook ([`notes/03-domicules.md`](../notes/03-domicules.md)) | "Straight + diagonal" |
| straight piece | a piece of a domicule tiling that covers two cells sharing a side, that is a domino | the method note | |
| diagonal piece | a piece of a domicule tiling that covers two cells sharing only a corner | the gallery's Diagonal pieces filter, the Diagonal pieces benchmark tab, the Diagonal pieces notebook ([`notes/06-diagonals.md`](../notes/06-diagonals.md)) | "diagonal domicule" outside the OEIS texts |

## Surfaces

A board is the h × w grid of cells a tiling covers, on any surface; the gallery's Board picker and the code use the word that way. A surface says which edges of the board are glued. The gallery's Surface switch picks one, so it names the surface in the singular; a notebook or a benchmark tab covers many boards of one surface, so it names them in the plural.

| term | meaning | where it is used | avoid |
| --- | --- | --- | --- |
| rectangle | a board with no glued edges; the 2n × 2n board is the square case | the gallery's Surface switch (Rectangle) | "board" for the rectangle alone |
| cylinder, cylinders | a board of circumference w and height h whose left and right edges are glued and which is open at the top and the bottom | the gallery's Surface switch (Cylinder), the Cylinders benchmark tab, the Cylinders notebook ([`notes/04-cylinders.md`](../notes/04-cylinders.md)) | "Tori and cylinders" as the name of one notebook or tab |
| torus, tori | a board whose left and right edges and top and bottom edges are both glued | the gallery's Surface switch (Torus), the Tori benchmark tab, the Tori notebook ([`notes/05-tori.md`](../notes/05-tori.md), page `tori.html`) | "torus" as the name of the notebook or its file |
