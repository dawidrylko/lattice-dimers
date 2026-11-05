# Known counts

The test runners, the PARI/GP programs and the site check every implementation against these files. [`js/core/cases.js`](../../js/core/cases.js) loads them for the JavaScript code.

Each file names the algorithms it checks in `algorithms`, by their ids in [`algorithms.json`](../algorithms.json), so every implementation of an algorithm runs on its boards, and lists its boards in `testCases`. A case gives `rowCount`, `colCount` and the exact count `expectedResult` as a decimal string; the periodic files add `lattice` (`square`, `triangular` or `king`), `torus` for a torus (without it the board is a cylinder of circumference `colCount`), `twisted` for the [signed sum](../../notes/domicules/03-tori.md#the-seam-sign) over the pieces crossing the seam, and `oeis` where the count is a term of an OEIS entry. The diagonal files give `expectedResult` as the comma-separated counts with 0, 1, 2 and more diagonal pieces.

| file | boards | checks |
| --- | --- | --- |
| [`dominoTilingTests.json`](dominoTilingTests.json) | domino squares up to 10 × 10 | `domino-tiling-number` |
| [`dominoTilingTests-BigInt.json`](dominoTilingTests-BigInt.json) | domino squares up to 20 × 20 (A004003) | `domino-tiling-bigint` (up to 16 × 16 in `pnpm test`), `domino-tiling-formula` |
| [`dominoTilingTests-Rectangles.json`](dominoTilingTests-Rectangles.json) | domino rectangles | `domino-tiling-number`, `domino-tiling-bigint` |
| [`domiculeTilingTests.json`](domiculeTilingTests.json) | domicule squares up to 18 × 18 (A239273) | `domicule-tiling-bigint`, `domicule-tiling-modular` |
| [`domiculeTilingTests-Rectangles.json`](domiculeTilingTests-Rectangles.json) | domicule rectangles (A239264) | `domicule-tiling-bigint`, `domicule-tiling-modular` |
| [`periodicTilingTests.json`](periodicTilingTests.json) | cylinders and tori on three lattices up to 10 × 10 | `periodic-tiling-bigint`, `periodic-tiling-modular` |
| [`periodicTilingTests-Modular.json`](periodicTilingTests-Modular.json) | larger cylinders and tori, up to the 16 × 16 torus | `periodic-tiling-modular` |
| [`domiculeDiagonalTests.json`](domiculeDiagonalTests.json) | domicule boards by diagonal pieces up to 12 × 12 | `domicule-diagonal-bigint`, `domicule-diagonal-modular` |
| [`domiculeDiagonalTests-Modular.json`](domiculeDiagonalTests-Modular.json) | the same up to 20 × 20 | `domicule-diagonal-modular` |

A count that only the modular solvers reach was checked with one prime more than the Chinese remainder theorem needs. The b-files of the domicule entries in [`oeis/`](../../oeis/README.md) are rebuilt from these files and from the strip counts in [`research/king-entropy/data/zex`](../../research/king-entropy/data/zex).
