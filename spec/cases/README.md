# Known counts

The test runners, the PARI/GP programs and the site check every implementation against these files. [`js/core/cases.js`](../../js/core/cases.js) loads them for the JavaScript code.

There is one file per algorithm, `<id>.json` with the id of [`algorithms.json`](../algorithms.json), so every implementation of the algorithm runs on its boards. A file gives its id in `algorithm` and its boards in `testCases`. A case gives `rowCount`, `colCount` and the exact count `expectedResult` as a decimal string; the even squares of `domino-rectangle-number` hold a plain number. The files of the `all-lattices-*` solvers add `lattice` (`square`, `triangular` or `king`); the cylinder and torus files add `torus` for a torus (without it the board is a cylinder of circumference `colCount`), `twisted` for the [signed sum](../../notes/domicules/03-tori.md#the-seam-sign) over the pieces crossing the seam, and `oeis` where the count is a term of an OEIS entry. The diagonal files give `expectedResult` as the comma-separated counts with 0, 1, 2 and more diagonal pieces; the cylinder and torus ones count the king's graph and have no `lattice`.

| file | boards |
| --- | --- |
| [`domino-rectangle-formula.json`](domino-rectangle-formula.json) | domino squares up to 20 × 20 (A004003) |
| [`domino-rectangle-bigint.json`](domino-rectangle-bigint.json) | the same squares (up to 16 × 16 in a short run) and domino rectangles |
| [`domino-rectangle-number.json`](domino-rectangle-number.json) | domino squares up to 10 × 10 and domino rectangles |
| [`domicule-rectangle-bigint.json`](domicule-rectangle-bigint.json) | domicule squares up to 18 × 18 (A239273, up to 16 × 16 in a short run) and domicule rectangles (A239264) |
| [`domicule-rectangle-modular.json`](domicule-rectangle-modular.json) | the same boards |
| [`all-lattices-cylinder-torus-bigint.json`](all-lattices-cylinder-torus-bigint.json) | cylinders and tori on three lattices up to 10 × 10 (tori up to 8 × 8 in a short run) |
| [`all-lattices-cylinder-torus-modular.json`](all-lattices-cylinder-torus-modular.json) | larger cylinders and tori, up to the 16 × 16 torus (the first seven in a short run), then the boards of its BigInt twin, then every board of the benchmark run the site shows, so the site build reads their counts instead of computing them |
| [`all-lattices-rectangle-bigint.json`](all-lattices-rectangle-bigint.json) | rectangles on three lattices: the triangular squares up to 16 × 16, the square and king's squares up to 12 × 12, and other rectangles |
| [`all-lattices-rectangle-modular.json`](all-lattices-rectangle-modular.json) | the triangular squares up to 22 × 22 (the first seven in a short run), then the other boards of its BigInt twin |
| [`domicule-rectangle-polynomial-bigint.json`](domicule-rectangle-polynomial-bigint.json) | domicule boards by diagonal pieces up to 12 × 12 |
| [`domicule-rectangle-polynomial-modular.json`](domicule-rectangle-polynomial-modular.json) | the squares up to 20 × 20 (the first seven in a short run), then the other boards of its BigInt twin |
| [`domicule-cylinder-torus-polynomial-bigint.json`](domicule-cylinder-torus-polynomial-bigint.json) | domicule cylinders up to 10 × 10 and tori up to 8 × 8 by diagonal pieces |
| [`domicule-cylinder-torus-polynomial-modular.json`](domicule-cylinder-torus-polynomial-modular.json) | larger cylinders and tori, up to the 16 × 16 cylinder and the 12 × 12 torus (the first seven in a short run), then the boards of its BigInt twin |

Twin algorithms, whose ids differ only in the method, repeat the boards they share. `pnpm -C js test:spec` fails when twins hold different counts for a board ([`harness/portCheck.js`](../../harness/portCheck.js)). The OEIS programs and the research scripts read one file each: the modular file for tori and diagonal pieces, `domicule-rectangle-bigint.json` for domicules.

A count that only the modular solvers reach was checked with one prime more than the Chinese remainder theorem needs. The b-files of the domicule entries in [`oeis/`](../../oeis/README.md) are rebuilt from these files and from the strip counts in [`research/king-entropy/data/zex`](../../research/king-entropy/data/zex).
