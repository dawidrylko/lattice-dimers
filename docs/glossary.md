# Glossary

The words this repository uses for its pieces and surfaces, in the README files, the notes, the site and the code comments. Use these words and avoid the ones listed against them. A new term, or a correction to one, is added here in the same change that introduces it.

## Pieces

| term | meaning | where it is used | avoid |
| --- | --- | --- | --- |
| domino, dominoes | a piece that covers two cells sharing a side; a domino tiling is a perfect matching of the grid graph, counted on the 2n × 2n board in [OEIS A004003](https://oeis.org/A004003) | the gallery's Pieces switch, the Dominoes benchmark tab, the Dominoes notebook ([`notes/02-dominoes.md`](../notes/02-dominoes.md)) | "Straight" for the kind of tiling |
| domicule, domicules | a piece that covers two cells sharing a side or only a corner; a domicule tiling is a perfect matching of the king's graph, counted in [OEIS A239264](https://oeis.org/A239264) and on the 2n × 2n board in [OEIS A239273](https://oeis.org/A239273) | the gallery's Pieces switch, the Domicules benchmark tab, the Domicules notebook ([`notes/03-domicules.md`](../notes/03-domicules.md)) | "Straight + diagonal" |

A domicule that joins two cells sharing only a corner is a diagonal piece; one that joins two cells sharing a side is a straight piece. Diagonal pieces are what the [Diagonal pieces notebook](../notes/06-diagonals.md) counts.

## Surfaces

A surface is the board a tiling covers. The gallery's Surface switch picks one, so it names the surface in the singular; a notebook or a benchmark tab covers many boards of one surface, so it names them in the plural.

| term | meaning | where it is used | avoid |
| --- | --- | --- | --- |
| rectangle, board | an h × w board with no glued edges; the 2n × 2n board is the square case | the gallery's Surface switch (Rectangle) | |
| cylinder, cylinders | a board of circumference w and height h whose left and right edges are glued and which is open at the top and the bottom | the gallery's Surface switch (Cylinder), the Cylinders benchmark tab, the Cylinders notebook ([`notes/04-cylinders.md`](../notes/04-cylinders.md)) | "Tori and cylinders" as one heading |
| torus, tori | a board whose left and right edges and top and bottom edges are both glued | the gallery's Surface switch (Torus), the Tori benchmark tab, the Tori notebook ([`notes/05-tori.md`](../notes/05-tori.md), page `tori.html`) | "toruses"; "torus" as the name of the notebook or its file |
