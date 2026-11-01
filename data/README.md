# Known counts

The test runners, the PARI/GP programs and the site check every solver against these files. [`index.js`](index.js) loads them for the JavaScript code.

Each file names the solvers it checks in `files` and lists its boards in `testCases`. A case gives `rowCount`, `colCount` and the exact count `expectedResult` as a decimal string; the periodic files add `lattice` (`square`, `triangular` or `king`), `torus` for a torus (without it the board is a cylinder of circumference `colCount`), `twisted` for the [signed sum](../notes/04-torus.md#the-seam-sign) over the pieces crossing the seam, and `oeis` where the count is a term of an OEIS entry. The diagonal files give `expectedResult` as the comma-separated counts with 0, 1, 2 and more diagonal pieces.

| file | boards | checks |
| --- | --- | --- |
| [`dominoTilingTests.json`](dominoTilingTests.json) | domino squares up to 10 × 10 | `dominoTilingSolver.js` |
| [`dominoTilingTests-BigInt.json`](dominoTilingTests-BigInt.json) | domino squares up to 20 × 20 (A004003) | `dominoTilingSolver-BigInt.js`, `dominoTilingSolver-Formula.js` |
| [`dominoTilingTests-Rectangles.json`](dominoTilingTests-Rectangles.json) | domino rectangles | `dominoTilingSolver.js`, `dominoTilingSolver-BigInt.js` |
| [`domiculeTilingTests.json`](domiculeTilingTests.json) | domicule squares up to 18 × 18 (A239273) | `domiculeTilingSolver-BigInt.js`, `domiculeTilingSolver-Modular.js` |
| [`domiculeTilingTests-Rectangles.json`](domiculeTilingTests-Rectangles.json) | domicule rectangles (A239264) | `domiculeTilingSolver-BigInt.js`, `domiculeTilingSolver-Modular.js` |
| [`periodicTilingTests.json`](periodicTilingTests.json) | cylinders and tori on three lattices up to 10 × 10 | `periodicTilingSolver-BigInt.js`, `periodicTilingSolver-Modular.js` |
| [`periodicTilingTests-Modular.json`](periodicTilingTests-Modular.json) | larger cylinders and tori, up to the 16 × 16 torus | `periodicTilingSolver-Modular.js` |
| [`domiculeDiagonalTests.json`](domiculeDiagonalTests.json) | domicule boards by diagonal pieces up to 12 × 12 | `domiculeDiagonalSolver-BigInt.js`, `domiculeDiagonalSolver-Modular.js` |
| [`domiculeDiagonalTests-Modular.json`](domiculeDiagonalTests-Modular.json) | the same up to 20 × 20 | `domiculeDiagonalSolver-Modular.js` |

A count that only the modular solvers reach was checked with one prime more than the Chinese remainder theorem needs. The b-files of the domicule entries in [`oeis/`](../oeis/README.md) are rebuilt from these files and from the strip counts in [`research/king-entropy/data/zex`](../research/king-entropy/data/zex).
