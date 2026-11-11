const fs = require('fs');
const os = require('os');
const path = require('path');
const { testCasesOf, isEvenSquare } = require('../js/core/cases');

const testCasesDomino = testCasesOf('domino-rectangle-formula');
const testCasesDomicule = testCasesOf('domicule-rectangle-bigint').filter(isEvenSquare);
const testCasesCylinderTorus = testCasesOf('any-lattice-cylinder-torus-modular');
const testCasesDiagonal = testCasesOf('domicule-rectangle-polynomial-modular');
const { DOMICULE_SWEEPS } = require('../js/renderer');
const domiculeModular = require('../js/solvers/domicule-rectangle-modular.js');
const cylinderTorusModular = require('../js/solvers/any-lattice-cylinder-torus-modular.js');
const diagonalReference = require('../js/solvers/domicule-rectangle-polynomial-bigint.js');
const { listImplementations } = require('../js/core/registry');
const { countCylinderTorusDiagonals } = require('../js/renderer/cylinderTorus');
const { renderNote, listNotes, formatTime, logCount, NOTES_DIRECTORY } = require('./notes');
const { THEME_CSS, CHROME_CSS, renderHeader, renderFooter, NOTE_REDIRECTS, SECTION_ALIASES, resolveRedirect } = require('./chrome');
const { readBenchmarkRuns, findSeriesRun, listJavaScriptResults, describeMissing, formerResultName, resultFileOf } = require('./benchmarkRuns');
const { DEFAULT_BOARD } = require('./defaultBoard');

const SITE_URL = 'https://dawidrylko.github.io/lattice-dimers/';
const REPOSITORY_TREE_URL = 'https://github.com/dawidrylko/lattice-dimers/tree/master';
const ROOT_DIRECTORY = path.join(__dirname, '..');
const OUTPUT_DIRECTORY = path.join(ROOT_DIRECTORY, 'dist', 'site');
const BENCHMARK_ROOT = 'benchmarks/results';
const RESULT_FILE = /_(\d+)x(\d+)\.txt$/;
const CYLINDER_TORUS_RESULT_FILE = /_(\d+)x(\d+)-(\w+)-(torus|cylinder)\.txt$/;
const { latest: BENCHMARK_RUN } = readBenchmarkRuns();
const BENCHMARK_DIRECTORY = path.join(ROOT_DIRECTORY, BENCHMARK_ROOT, BENCHMARK_RUN);
const CYLINDER_TORUS_DIAGONAL_PREFIX = 'domicule-cylinder-torus-polynomial-';
const CYLINDER_TORUS_DIAGONAL_RESULT_FILE = /_(\d+)x(\d+)-(torus|cylinder)\.txt$/;
const CYLINDER_TORUS_DIAGONAL_RUN = findSeriesRun(CYLINDER_TORUS_DIAGONAL_PREFIX, path.join(ROOT_DIRECTORY, BENCHMARK_ROOT));
const BROWSER_SCRIPTS = ['js/renderer/svg.js', 'js/renderer/rank.js'];
const WORKER_SCRIPTS = [
  'js/renderer/unrank.js',
  'js/renderer/cftp.js',
  'js/renderer/domicule.js',
  'js/renderer/cylinderTorus.js',
  'js/renderer/rank.js',
  'site/worker.js',
];
const ASSETS = {
  'dimer.svg': '.github/assets/dimer.svg',
  'apple-touch-icon.png': '.github/assets/apple-touch-icon.png',
  'og-image.png': '.github/assets/og-image.png',
  'papers/king-entropy.pdf': 'research/king-entropy/paper/king-entropy.pdf',
  'papers/king-entropy-log-convexity.pdf': 'research/king-entropy/paper/king-entropy-log-convexity.pdf',
};
const RESEARCH_DATA = 'research/king-entropy/data';
const PAPERS = [
  {
    title: "The dimer entropy of the king's graph",
    file: 'papers/king-entropy.pdf',
    identifier: 'https://doi.org/10.5281/zenodo.23686056',
  },
  {
    title: "Log-convexity of strip dimer counts on the king's graph",
    file: 'papers/king-entropy-log-convexity.pdf',
    identifier: 'https://doi.org/10.5281/zenodo.23686087',
  },
];
const AUTHOR = {
  '@type': 'Person',
  name: 'Dawid Ryłko',
  url: 'https://dawidrylko.com',
  sameAs: 'https://orcid.org/0009-0008-6307-9015',
};
const GALLERY_BOARDS = [
  { rowCount: 2, colCount: 2 },
  { rowCount: 4, colCount: 4 },
  { rowCount: 6, colCount: 6 },
  { rowCount: 8, colCount: 8 },
  { rowCount: 10, colCount: 10 },
  { rowCount: 12, colCount: 12 },
  { rowCount: 14, colCount: 14, memory: '60 MB' },
  { rowCount: 16, colCount: 16, memory: '250 MB' },
  { rowCount: 18, colCount: 18, mode: 'random' },
  { rowCount: 20, colCount: 20, mode: 'random' },
];
const DOMICULE_BOARDS = [
  { rowCount: 2, colCount: 2 },
  { rowCount: 4, colCount: 4 },
  { rowCount: 6, colCount: 6 },
  { rowCount: 8, colCount: 8 },
  { rowCount: 10, colCount: 10 },
  { rowCount: 12, colCount: 12 },
  { rowCount: 14, colCount: 14, memory: '200 MB' },
  { rowCount: 16, colCount: 16, mode: 'random' },
  { rowCount: 18, colCount: 18, mode: 'random' },
  { rowCount: 20, colCount: 20, mode: 'random' },
];
const CYLINDER_TORUS_SIDES = [2, 4, 6, 8, 10];
const CYLINDER_TORUS_FILTER_MEMORY = { '10x10-diagonal-torus': '800 MB' };
const CYLINDER_TORUS_PIECES = [
  { pieces: 'domino', lattice: 'square', suffix: '' },
  { pieces: 'domicule', lattice: 'king', suffix: '-diagonal' },
];
const DIAGONAL_FILTER_MAX_SIDE = 10;
const REPOSITORY_BLOB_URL = 'https://github.com/dawidrylko/lattice-dimers/blob/master';
const COMPUTED = 'every output on this page was produced during that build from the files of this repository';
const NOTE_PROVENANCE = {
  research: 'every output on this page was read from the committed research data, checked or computed during that build.',
  'dominoes/rectangles': `${COMPUTED}; the running times come from the benchmark run the page names.`,
  'dominoes/cylinders': `${COMPUTED}; the running times come from the benchmark run the page names.`,
  'dominoes/tori': `${COMPUTED}; the running times come from the benchmark run the page names.`,
  'domicules/rectangles': `${COMPUTED}; the running times come from the benchmark run the page names.`,
  'domicules/cylinders': `${COMPUTED}; the running times come from the benchmark run the page names.`,
  'domicules/tori': `${COMPUTED}; the boards the solver column marks as spec/cases/ are stored counts, the entropies and the decay length ξ come from research/king-entropy/, and the running times from the benchmark run the page names.`,
  'domicules/rectangles-by-diagonal-pieces': `${COMPUTED}; the rows the solver column marks as spec/cases/ are stored counts, which the build checked, and the running times come from the benchmark run the page names.`,
  'domicules/cylinders-by-diagonal-pieces': `${COMPUTED}; the counts are stored in spec/cases/ and checked against the gallery's scan, and the running times come from the benchmark run the page names.`,
  'domicules/tori-by-diagonal-pieces': `${COMPUTED}; the counts are stored in spec/cases/ and checked against the gallery's scan, and the running times come from the benchmark run the page names.`,
  'triangular-lattice/rectangles': `${COMPUTED}; the rows the solver column marks as spec/cases/ are stored counts, which the build checked, and the entropy s comes from research/king-entropy/.`,
  'triangular-lattice/cylinders': `${COMPUTED}.`,
  'triangular-lattice/tori': `${COMPUTED}.`,
};
const NOTE_SUMMARIES = {
  research: "The entropy per site of the king's graph dimers: an estimate with error bar 6·10⁻¹⁶, rigorous bounds, the surface and corner free energies, and the asymptotics of A239273.",
  'dominoes/rectangles': 'Notebook: domino tilings of the 2n × 2n board (A004003) by three methods, how the gallery numbers and samples them, and how every count is checked.',
  'dominoes/cylinders': 'Notebook: domino tilings of cylinders, checked against the OEIS entries of every circumference up to 8.',
  'dominoes/tori': 'Notebook: domino tilings of tori, the 2n × 2n torus (A335586) by two solvers.',
  'domicules/rectangles': 'Notebook: domicule tilings of the 2n × 2n board (A239273) up to 20 × 20, the modular solver, the Markov chain and how every count is checked.',
  'domicules/cylinders': "Notebook: domicule tilings of cylinders, the perfect matchings of the king's graph on the cylinder.",
  'domicules/tori': "Notebook: domicule tilings of tori (A401670); the king's graph torus count over e^(sL²) tends to 2, compared with two other lattices.",
  'domicules/rectangles-by-diagonal-pieces': 'Notebook: domicule tilings of the 2n × 2n board by the number of diagonal pieces, up to 20 × 20 (A401673), and their weighted counts.',
  'domicules/cylinders-by-diagonal-pieces': 'Notebook: domicule tilings of cylinders by the number of diagonal pieces, checked against the gallery up to 10 × 10.',
  'domicules/tori-by-diagonal-pieces': 'Notebook: domicule tilings of tori by the number of diagonal pieces, checked against the gallery up to 10 × 10.',
  'triangular-lattice/rectangles': 'Notebook: perfect matchings of the triangular lattice on the 2n × 2n board (A401988) and on rectangles, by a transfer and by the Kasteleyn determinant, counted for comparison with dominoes and domicules.',
  'triangular-lattice/cylinders': 'Notebook: perfect matchings of the triangular lattice on cylinders, counted for comparison with dominoes and domicules.',
  'triangular-lattice/tori': 'Notebook: perfect matchings of the triangular lattice on 2n × 2n tori, counted for comparison with dominoes and domicules.',
};

function countTilings(board) {
  const testCase = testCasesDomino.find(
    t => t.rowCount === board.rowCount && t.colCount === board.colCount,
  );

  if (!testCase) {
    throw new Error(`No expected result in spec/cases/ for ${board.rowCount}x${board.colCount}.`);
  }

  return testCase.expectedResult;
}

const cylinderTorusCounts = new Map();

/**
 * Finds the stored count of a cylinder or torus that is not twisted.
 * @param {Object} board The board, as for countCylinderTorusTilings.
 * @returns {Object|undefined} The case of spec/cases/, if there is one.
 */
function findCylinderTorusCase({ rowCount, colCount, lattice, torus }) {
  return testCasesCylinderTorus.find(
    t => t.rowCount === rowCount && t.colCount === colCount && t.lattice === lattice && !t.torus === !torus && !t.twisted,
  );
}

/**
 * Reads the stored count of a board in a benchmark table. The tables never count a board: the
 * largest boards a run measures take the modular solver longer than the whole build should.
 * @param {Object} board The board, as for countCylinderTorusTilings.
 * @returns {string} The number of tilings.
 */
function readStoredCylinderTorusCount(board) {
  const known = findCylinderTorusCase(board);

  if (!known) {
    const { rowCount, colCount, lattice, torus } = board;
    throw new Error(
      `No count of the ${rowCount}x${colCount} ${lattice} ${torus ? 'torus' : 'cylinder'} in spec/cases/any-lattice-cylinder-torus-modular.json, which the benchmark table needs.`,
    );
  }

  return known.expectedResult;
}

/**
 * Counts the tilings of a king's graph or square lattice cylinder or torus once per build:
 * from spec/cases/ when the board is known there, otherwise with the modular solver.
 * @param {Object} board The board.
 * @property {number} board.rowCount The number of rows.
 * @property {number} board.colCount The circumference.
 * @property {string} board.lattice square or king.
 * @property {boolean} board.torus Whether the rows are periodic too.
 * @returns {Promise<string>} The number of tilings.
 */
function countCylinderTorusTilings({ rowCount, colCount, lattice, torus }) {
  const key = `${rowCount}x${colCount}-${lattice}-${torus ? 'torus' : 'cylinder'}`;

  if (!cylinderTorusCounts.has(key)) {
    const known = findCylinderTorusCase({ rowCount, colCount, lattice, torus });

    cylinderTorusCounts.set(
      key,
      known
        ? Promise.resolve(known.expectedResult)
        : cylinderTorusModular
            .calculateTotalTilingCombinations({ rowCount, colCount, lattice, torus, jobs: os.availableParallelism() })
            .then(String),
    );
  }

  return cylinderTorusCounts.get(key);
}

/**
 * Reads the domicule tilings of a board by the number of diagonal pieces from spec/cases/, or counts
 * them with the reference solver, and checks that they add up to the number of tilings.
 * @param {Object} board The board.
 * @param {string} total The number of tilings.
 * @returns {string[]} The coefficients, from 0 diagonal pieces up.
 */
function countDiagonalTilings({ rowCount, colCount }, total) {
  const known = testCasesDiagonal.find(t => t.rowCount === rowCount && t.colCount === colCount);
  const coefficients = known
    ? known.expectedResult.split(',')
    : diagonalReference.calculateDiagonalPolynomial({ rowCount, colCount }).map(String);
  const sum = coefficients.reduce((acc, count) => acc + BigInt(count), BigInt(0));

  if (String(sum) !== total) {
    throw new Error(`The diagonal counts of ${rowCount}x${colCount} add up to ${sum}, not ${total}.`);
  }

  return coefficients;
}

/**
 * Counts the domicule tilings of a cylinder or a torus by the number of diagonal pieces with the
 * gallery's transfer, and checks them against the number of tilings and, for no diagonal piece, the domino count.
 * @param {Object} board The board, as for countCylinderTorusTilings.
 * @param {string} total The number of tilings.
 * @returns {Promise<string[]>} The coefficients, from 0 diagonal pieces up.
 */
async function countCylinderTorusDiagonalTilings(board, total) {
  const coefficients = countCylinderTorusDiagonals(board);
  const sum = coefficients.reduce((acc, count) => acc + count, BigInt(0));
  const surface = `${board.rowCount}x${board.colCount} ${board.torus ? 'torus' : 'cylinder'}`;
  const dominoes = await countCylinderTorusTilings({ ...board, lattice: 'square' });

  if (String(sum) !== total) {
    throw new Error(`The diagonal counts of the ${surface} add up to ${sum}, not ${total}.`);
  }

  if (String(coefficients[0]) !== dominoes) {
    throw new Error(`The ${surface} has ${coefficients[0]} tilings without diagonal pieces, not the ${dominoes} domino tilings.`);
  }

  return coefficients.map(String);
}

const domiculeCounts = new Map();

/**
 * Counts the domicule tilings of a board once per build: from spec/cases/ when the term is
 * known there, otherwise with the modular solver. The gallery and the notebooks share the result.
 * @param {Object} board The board.
 * @returns {Promise<string>} The number of tilings.
 */
function countDomiculeTilings({ rowCount, colCount }) {
  const key = `${rowCount}x${colCount}`;

  if (!domiculeCounts.has(key)) {
    const known = testCasesDomicule.find(t => t.rowCount === rowCount && t.colCount === colCount);

    domiculeCounts.set(
      key,
      known
        ? Promise.resolve(known.expectedResult)
        : domiculeModular
            .calculateTotalTilingCombinations({ rowCount, colCount, jobs: os.availableParallelism() })
            .then(String),
    );
  }

  return domiculeCounts.get(key);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function readAverageTime(directory, fileName) {
  const file = resultFileOf(directory, fileName);

  if (!fs.existsSync(file)) {
    return null;
  }

  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  const match = lines[0].match(/Average Execution Time: ([\d.]+) ms/);
  const processTime = lines.find(line => line.startsWith('Average Process Time:'))?.match(/([\d.]+) ms/);

  return {
    average: match ? Number(match[1]) : null,
    process: processTime ? Number(processTime[1]) : null,
    runs: lines.filter(line => /^\d+\. Execution Time/.test(line)).length,
  };
}

function buildBenchmark() {
  const prefix = 'domino-rectangle-';
  const tilingsBySize = new Map(
    testCasesDomino.map(t => [`${t.rowCount}x${t.colCount}`, t.expectedResult]),
  );
  const sizes = listJavaScriptResults(BENCHMARK_DIRECTORY, prefix)
    .map(fileName => fileName.match(RESULT_FILE))
    .filter(Boolean)
    .map(([, rowCount, colCount]) => ({
      rowCount: Number(rowCount),
      colCount: Number(colCount),
    }))
    .filter(
      (size, index, all) =>
        all.findIndex(
          s => s.rowCount === size.rowCount && s.colCount === size.colCount,
        ) === index,
    )
    .sort((a, b) => a.rowCount * a.colCount - b.rowCount * b.colCount);

  return sizes.map(({ rowCount, colCount }) => {
    const suffix = `_${rowCount}x${colCount}.txt`;
    return {
      rowCount,
      colCount,
      tilings: tilingsBySize.get(`${rowCount}x${colCount}`) ?? null,
      bigint: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}bigint.js${suffix}`),
      formula: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}formula.js${suffix}`),
      languages: readLanguages('domino-rectangle-formula', suffix),
      bigintLanguages: readLanguages('domino-rectangle-bigint', suffix),
    };
  });
}

function buildDomiculeBenchmark(totals) {
  const prefix = 'domicule-rectangle-';

  return listJavaScriptResults(BENCHMARK_DIRECTORY, prefix)
    .map(fileName => fileName.match(RESULT_FILE))
    .filter(Boolean)
    .map(([, rowCount, colCount]) => `${rowCount}x${colCount}`)
    .filter((size, index, all) => all.indexOf(size) === index)
    .map(size => size.split('x').map(Number))
    .sort(([a], [b]) => a - b)
    .map(([rowCount, colCount]) => {
      const suffix = `_${rowCount}x${colCount}.txt`;
      return {
        rowCount,
        colCount,
        tilings: totals.get(`${rowCount}x${colCount}`) ?? null,
        bigint: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}bigint.js${suffix}`),
        modular: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}modular.js${suffix}`),
        languages: readLanguages('domicule-rectangle-modular', suffix),
        bigintLanguages: readLanguages('domicule-rectangle-bigint', suffix),
      };
    });
}

/**
 * Reads the times of the cylinder and torus solvers on one lattice.
 * @param {string} lattice The lattice of the result files: king for the domicules, square for the dominoes.
 * @returns {Promise<Object[]>} One row per board, the tori first.
 */
async function buildCylinderTorusBenchmark(lattice) {
  const prefix = 'any-lattice-cylinder-torus-';
  const boards = listJavaScriptResults(BENCHMARK_DIRECTORY, prefix)
    .map(fileName => fileName.match(CYLINDER_TORUS_RESULT_FILE))
    .filter(match => match && match[3] === lattice)
    .map(([, rowCount, colCount, , surface]) => `${surface}/${rowCount}x${colCount}`)
    .filter((board, index, all) => all.indexOf(board) === index)
    .map(board => {
      const [surface, size] = board.split('/');
      const [rowCount, colCount] = size.split('x').map(Number);
      return { surface, rowCount, colCount };
    })
    .sort((a, b) => b.surface.localeCompare(a.surface) || a.rowCount - b.rowCount);
  const rows = [];

  for (const { surface, rowCount, colCount } of boards) {
    const suffix = `_${rowCount}x${colCount}-${lattice}-${surface}.txt`;
    rows.push({
      rowCount,
      colCount,
      surface,
      tilings: readStoredCylinderTorusCount({ rowCount, colCount, lattice, torus: surface === 'torus' }),
      bigint: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}bigint.js${suffix}`),
      bigintMissing: readMissingReasons('any-lattice-cylinder-torus-bigint', `${rowCount}x${colCount}`, `-${lattice}-${surface}`),
      modular: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}modular.js${suffix}`),
      languages: readLanguages('any-lattice-cylinder-torus-modular', suffix),
      bigintLanguages: readLanguages('any-lattice-cylinder-torus-bigint', suffix),
    });
  }

  return rows;
}

function buildDiagonalBenchmark(totals) {
  const prefix = 'domicule-rectangle-polynomial-';

  return listJavaScriptResults(BENCHMARK_DIRECTORY, prefix)
    .map(fileName => fileName.match(RESULT_FILE))
    .filter(Boolean)
    .map(([, rowCount, colCount]) => `${rowCount}x${colCount}`)
    .filter((size, index, all) => all.indexOf(size) === index)
    .map(size => size.split('x').map(Number))
    .sort(([a], [b]) => a - b)
    .map(([rowCount, colCount]) => {
      const suffix = `_${rowCount}x${colCount}.txt`;
      return {
        rowCount,
        colCount,
        tilings: totals.get(`${rowCount}x${colCount}`) ?? null,
        bigint: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}bigint.js${suffix}`),
        bigintLanguages: readLanguages('domicule-rectangle-polynomial-bigint', suffix),
        bigintMissing: readMissingReasons('domicule-rectangle-polynomial-bigint', `${rowCount}x${colCount}`, ''),
        modular: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}modular.js${suffix}`),
        languages: readLanguages('domicule-rectangle-polynomial-modular', suffix),
      };
    });
}

/**
 * Reads the times of the solvers that count the domicule tilings of cylinders and tori by diagonal
 * pieces, from the newest clean run that measured them, which may not be the run of the other tables.
 * @returns {Object[]} One row per board, the tori first; none before such a run exists.
 */
function buildCylinderTorusDiagonalBenchmark() {
  if (CYLINDER_TORUS_DIAGONAL_RUN === null) {
    return [];
  }

  const directory = path.join(ROOT_DIRECTORY, BENCHMARK_ROOT, CYLINDER_TORUS_DIAGONAL_RUN);
  const prefix = CYLINDER_TORUS_DIAGONAL_PREFIX;

  return listJavaScriptResults(directory, prefix)
    .map(fileName => fileName.match(CYLINDER_TORUS_DIAGONAL_RESULT_FILE))
    .filter(Boolean)
    .map(([, rowCount, colCount, surface]) => `${surface}/${rowCount}x${colCount}`)
    .filter((board, index, all) => all.indexOf(board) === index)
    .map(board => {
      const [surface, size] = board.split('/');
      const [rowCount, colCount] = size.split('x').map(Number);
      return { surface, rowCount, colCount };
    })
    .sort((a, b) => b.surface.localeCompare(a.surface) || a.rowCount - b.rowCount)
    .map(({ surface, rowCount, colCount }) => {
      const suffix = `_${rowCount}x${colCount}-${surface}.txt`;
      return {
        rowCount,
        colCount,
        surface,
        tilings: readStoredCylinderTorusCount({ rowCount, colCount, lattice: 'king', torus: surface === 'torus' }),
        bigint: readAverageTime(directory, `${prefix}bigint.js${suffix}`),
        bigintLanguages: readLanguages(`${prefix}bigint`, suffix, directory),
        bigintMissing: readMissingReasons(`${prefix}bigint`, `${rowCount}x${colCount}`, `-${surface}`, directory),
        modular: readAverageTime(directory, `${prefix}modular.js${suffix}`),
        languages: readLanguages(`${prefix}modular`, suffix, directory),
      };
    });
}

function readMissingReasons(algorithm, board, seriesSuffix, directory = BENCHMARK_DIRECTORY) {
  const plan = path.join(directory, 'plan.json');
  const { budgetHours, notMeasured } = fs.existsSync(plan) ? JSON.parse(fs.readFileSync(plan, 'utf-8')) : { budgetHours: null, notMeasured: [] };

  return Object.fromEntries(
    listImplementations(algorithm).map(({ language, file }) => {
      const name = `${path.basename(file)}${seriesSuffix}`;
      const entry = notMeasured.find(({ series, board: other }) => (series === name || series === formerResultName(name)) && other === board);

      return [language, entry ? describeMissing(entry, budgetHours) : null];
    }),
  );
}

function readLanguages(algorithm, suffix, directory = BENCHMARK_DIRECTORY) {
  return Object.fromEntries(
    listImplementations(algorithm)
      .filter(({ language }) => language !== 'js')
      .map(({ language, file }) => [language, readAverageTime(directory, `${path.basename(file)}${suffix}`)]),
  );
}

function readEnvironment(directory) {
  const file = path.join(directory, 'environment.json');

  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null;
}

/**
 * Rounds a decimal string to nearest at a given number of decimals, exactly (no floating point).
 * @param {string} value The decimal, such as '0.56551191104132531763'.
 * @param {number} digits The number of decimals to keep.
 * @returns {string} The rounded decimal.
 */
function roundDecimal(value, digits) {
  const [whole, fraction = ''] = value.split('.');
  const scaled = BigInt(whole + fraction.padEnd(digits + 1, '0').slice(0, digits + 1));
  const rounded = String((scaled + BigInt(5)) / BigInt(10)).padStart(digits + 1, '0');

  return `${rounded.slice(0, -digits)}.${rounded.slice(-digits)}`;
}

/**
 * Formats the 8×8 count of a test data file for the main page.
 * @param {Object[]} testCases The test cases of one data file.
 * @returns {string} The count with thousands separators.
 */
function chessboard(testCases) {
  const { expectedResult } = testCases.find(({ rowCount, colCount }) => rowCount === 8 && colCount === 8);

  return BigInt(expectedResult).toLocaleString('en-US');
}

/**
 * Reads the headline results of research/king-entropy from its committed data, so the main page
 * quotes the same numbers as the paper and the research note.
 * @returns {{ s: string, ds: string, lower: string, upper: string }} The estimate of s, its error bar and the proved bounds.
 */
function readResearchResults() {
  const read = file => JSON.parse(fs.readFileSync(path.join(ROOT_DIRECTORY, RESEARCH_DATA, file), 'utf-8'));
  const { s, err } = read('errbar.json').recommended;
  const widest = table => table[Math.max(...Object.keys(table).map(Number))];
  const [mantissa, exponent] = Number(err).toExponential(0).split('e');
  const superscript = [...exponent].map(c => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)] || '').join('');

  return {
    s: roundDecimal(s, 16),
    ds: `${mantissa}·10${superscript}`,
    lower: String(widest(read('bounds.json').lower)).slice(0, 14),
    upper: widest(read('runweight_3state.json')).upper,
  };
}

function buildJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}#website`,
        url: SITE_URL,
        name: 'Lattice Dimers',
        inLanguage: 'en',
        author: AUTHOR,
      },
      {
        '@type': 'SoftwareSourceCode',
        name: 'Lattice Dimers',
        description:
          "Code and data on dimers of the square lattice and the king's graph: transfer-matrix scripts, certificates and data for the entropy per site of the king's graph dimers, and exact counts, numbering and sampling of domino tilings (OEIS A004003) and domicule tilings (OEIS A239264, OEIS A239273): a resultant form of the product formula, transfer-matrix solvers, a modular solver with the Chinese remainder theorem, PARI/GP programs and notebooks.",
        codeRepository: 'https://github.com/dawidrylko/lattice-dimers',
        programmingLanguage: ['Rust', 'Python', 'JavaScript'],
        runtimePlatform: 'Node.js',
        license: 'https://opensource.org/licenses/MIT',
        keywords: "dimer model, king's graph, entropy per site, transfer matrix, domino tiling, domicule tiling, perfect matchings, OEIS A004003, OEIS A239264, OEIS A239273, combinatorics",
        author: AUTHOR,
        isBasedOn: 'https://oeis.org/A004003',
        subjectOf: {
          '@type': 'BlogPosting',
          url: 'https://dawidrylko.com/domino-tiling/',
          inLanguage: 'pl',
          author: AUTHOR,
        },
      },
      ...PAPERS.map(paper => ({
        '@type': 'ScholarlyArticle',
        headline: paper.title,
        url: `${SITE_URL}${paper.file}`,
        ...(paper.identifier && { identifier: paper.identifier }),
        encodingFormat: 'application/pdf',
        datePublished: '2026-10',
        inLanguage: 'en',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        about: "perfect matchings of the king's graph",
        isBasedOn: 'https://oeis.org/A239264',
        author: AUTHOR,
      })),
    ],
  };
}

/**
 * Writes a page at the old address of every moved note that sends the reader to the new one. A fragment
 * the old page had goes to the section that now holds it, on whichever page that is; any other fragment is
 * kept. GitHub Pages has no server-side redirects.
 * @param {{ slug: string }[]} notes The notes, already written to the output directory.
 */
function writeNoteRedirects(notes) {
  Object.entries(NOTE_REDIRECTS).forEach(([from, { to, sections = {} }]) => {
    const url = `${SITE_URL}notes/${to}.html`;
    const up = '../'.repeat(from.split('/').length - 1);
    const moved = Object.fromEntries(Object.keys(sections).map(id => [id, `${up}${resolveRedirect(from, id)}`]));

    if (!notes.some(({ slug }) => slug === to) || notes.some(({ slug }) => slug === from)) {
      throw new Error(`the redirect from ${from}.html to ${to}.html leads to no note or hides one`);
    }

    Object.keys(sections).forEach(id => {
      const target = resolveRedirect(from, id);
      const [page, fragment] = target.split('#');
      const file = path.join(OUTPUT_DIRECTORY, 'notes', page);

      if (!fs.existsSync(file) || !fs.readFileSync(file, 'utf-8').includes(`id="${fragment}"`)) {
        throw new Error(`the redirect from ${from}.html#${id} leads to ${target}, which has no such section`);
      }
    });

    fs.mkdirSync(path.dirname(path.join(OUTPUT_DIRECTORY, 'notes', `${from}.html`)), { recursive: true });
    fs.writeFileSync(
      path.join(OUTPUT_DIRECTORY, 'notes', `${from}.html`),
      [
        '<!doctype html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="utf-8">',
        `<title>Moved to ${to}.html</title>`,
        `<link rel="canonical" href="${url}">`,
        '<meta name="robots" content="noindex">',
        `<meta http-equiv="refresh" content="0; url=${up}${to}.html">`,
        `<script>const moved = ${JSON.stringify(moved)}; const id = location.hash.slice(1); location.replace(Object.hasOwn(moved, id) ? moved[id] : '${up}${to}.html' + location.hash);</script>`,
        '</head>',
        `<body><p>This page moved to <a href="${up}${to}.html">${url}</a>.</p></body>`,
        '</html>',
        '',
      ].join('\n'),
    );
  });
}

function buildSitemap(notes) {
  const today = new Date().toISOString().slice(0, 10);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...['', ...notes.map(({ slug }) => `notes/${slug}.html`)].map(
      page => `  <url><loc>${SITE_URL}${page}</loc><lastmod>${today}</lastmod></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');
}

function noteRoot(note) {
  return '../'.repeat(note.slug.split('/').length);
}

function resolveNoteLink(target, notes, from) {
  if (/^[a-z]+:/.test(target) || target.startsWith('#')) {
    return target;
  }

  const [linked, fragment] = target.split('#');
  const directory = path.posix.dirname(path.posix.join('notes', from.file));
  const file = path.posix.normalize(path.posix.join(directory, linked));
  const note = notes.find(({ file: noteFile }) => `notes/${noteFile}` === file);

  if (note) {
    const href = path.posix.relative(path.posix.dirname(`notes/${from.slug}`), `notes/${note.slug}.html`);

    return fragment === undefined ? href : `${href}#${fragment}`;
  }

  return `${path.extname(file) ? REPOSITORY_BLOB_URL : REPOSITORY_TREE_URL}/${file}${fragment === undefined ? '' : `#${fragment}`}`;
}

async function buildNotes(notes, context) {
  const template = fs.readFileSync(path.join(__dirname, 'note-template.html'), 'utf-8');
  const directory = path.join(OUTPUT_DIRECTORY, 'notes');
  const today = new Date().toISOString().slice(0, 10);
  const rendered = [];
  const slugs = notes.map(({ slug }) => slug).sort().join();

  [['NOTE_SUMMARIES', NOTE_SUMMARIES], ['NOTE_PROVENANCE', NOTE_PROVENANCE]].forEach(([name, map]) => {
    if (Object.keys(map).sort().join() !== slugs) {
      throw new Error(`${name} names ${Object.keys(map).sort().join(', ')} and the notes are ${slugs}`);
    }
  });

  fs.mkdirSync(directory, { recursive: true });

  for (const note of notes) {
    const markdown = fs.readFileSync(path.join(NOTES_DIRECTORY, note.file), 'utf-8');
    const { title, description, html, toc, cells } = await renderNote(markdown, {
      resolveLink: target => resolveNoteLink(target, notes, note),
      context,
      sectionAliases: SECTION_ALIASES[note.slug],
    });
    rendered.push({ ...note, title });
    const tocHtml = toc.length > 2 ? `<nav class="toc" aria-label="Contents"><strong>Contents</strong><ol>${toc.map(item => `<li><a href="#${item.id}">${item.title}</a></li>`).join('')}</ol></nav>` : '';
    const page = template
      .replace(/__TITLE__/g, () => escapeHtml(title))
      .replace(/__DESCRIPTION__/g, () => escapeHtml(NOTE_SUMMARIES[note.slug] || description))
      .replace(/__URL__/g, `${SITE_URL}notes/${note.slug}.html`)
      .replace(/__SITE_URL__/g, SITE_URL)
      .replace('__CONTENT__', () => html.replace('</h1>', `</h1>\n${tocHtml}`))
      .replace('__THEME_CSS__', () => THEME_CSS)
      .replace('__CHROME_CSS__', () => CHROME_CSS)
      .replace(/__ROOT__/g, noteRoot(note))
      .replace('__SITE_HEADER__', () => renderHeader({ root: noteRoot(note), current: note.slug, notes }))
      .replace('__SITE_FOOTER__', () =>
        renderFooter([
          `Built from <a href="${REPOSITORY_BLOB_URL}/notes/${note.file}">notes/${note.file}</a> on ${today}${cells ? `; ${NOTE_PROVENANCE[note.slug] || 'every output on this page was computed during that build.'}` : '.'}`,
        ]),
      );

    fs.mkdirSync(path.dirname(path.join(directory, `${note.slug}.html`)), { recursive: true });
    fs.writeFileSync(path.join(directory, `${note.slug}.html`), page);
    console.log(`Note saved: ${path.relative(ROOT_DIRECTORY, path.join(directory, `${note.slug}.html`))} (${cells} cells)`);
  }

  return rendered;
}

async function __main__() {
  fs.rmSync(OUTPUT_DIRECTORY, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  const domiculeBoards = [];

  for (const board of DOMICULE_BOARDS) {
    const total = await countDomiculeTilings(board);
    const filtered = !board.mode && Math.max(board.rowCount, board.colCount) <= DIAGONAL_FILTER_MAX_SIDE;

    domiculeBoards.push({
      id: `${board.rowCount}x${board.colCount}-diagonal`,
      pieces: 'domicule',
      surface: 'rectangle',
      mode: 'pages',
      ...board,
      total,
      ...(filtered && { diagonals: countDiagonalTilings(board, total) }),
    });
  }

  const cylinderTorusBoards = [];

  for (const { pieces, lattice, suffix } of CYLINDER_TORUS_PIECES) {
    for (const surface of ['cylinder', 'torus']) {
      for (const side of CYLINDER_TORUS_SIDES) {
        const board = { rowCount: side, colCount: side, lattice, torus: surface === 'torus' };
        const total = await countCylinderTorusTilings(board);
        const id = `${side}x${side}${suffix}-${surface}`;
        cylinderTorusBoards.push({
          id,
          pieces,
          surface,
          mode: 'pages',
          rowCount: side,
          colCount: side,
          total,
          ...(pieces === 'domicule' && { diagonals: await countCylinderTorusDiagonalTilings(board, total) }),
          ...(CYLINDER_TORUS_FILTER_MEMORY[id] && { filterMemory: CYLINDER_TORUS_FILTER_MEMORY[id] }),
        });
      }
    }
  }

  const domiculeTotals = new Map([
    ...testCasesDomicule.map(t => [`${t.rowCount}x${t.colCount}`, t.expectedResult]),
    ...domiculeBoards.map(b => [`${b.rowCount}x${b.colCount}`, b.total]),
  ]);
  const data = {
    defaultBoard: `${DEFAULT_BOARD.rowCount}x${DEFAULT_BOARD.colCount}`,
    boards: [
      ...GALLERY_BOARDS.map(board => ({
        id: `${board.rowCount}x${board.colCount}`,
        pieces: 'domino',
        surface: 'rectangle',
        mode: 'pages',
        ...board,
        total: countTilings(board),
      })),
      ...domiculeBoards,
      ...cylinderTorusBoards,
    ],
    benchmark: buildBenchmark(),
    domiculeBenchmark: buildDomiculeBenchmark(domiculeTotals),
    cylinderTorusBenchmark: await buildCylinderTorusBenchmark('king'),
    dominoCylinderTorusBenchmark: await buildCylinderTorusBenchmark('square'),
    diagonalBenchmark: buildDiagonalBenchmark(domiculeTotals),
    cylinderTorusDiagonalBenchmark: buildCylinderTorusDiagonalBenchmark(),
    environment: readEnvironment(BENCHMARK_DIRECTORY),
    cylinderTorusDiagonalRun: CYLINDER_TORUS_DIAGONAL_RUN && {
      directory: `${BENCHMARK_ROOT}/${CYLINDER_TORUS_DIAGONAL_RUN}`,
      environment: readEnvironment(path.join(ROOT_DIRECTORY, BENCHMARK_ROOT, CYLINDER_TORUS_DIAGONAL_RUN)),
    },
  };
  const notes = listNotes();
  await buildNotes(notes, {
    root: ROOT_DIRECTORY,
    benchmark: data.benchmark,
    benchmarkRun: `${BENCHMARK_ROOT}/${BENCHMARK_RUN}`,
    domiculeBenchmark: data.domiculeBenchmark,
    cylinderTorusBenchmark: data.cylinderTorusBenchmark,
    dominoCylinderTorusBenchmark: data.dominoCylinderTorusBenchmark,
    diagonalBenchmark: data.diagonalBenchmark,
    cylinderTorusDiagonalBenchmark: data.cylinderTorusDiagonalBenchmark,
    cylinderTorusDiagonalRun: data.cylinderTorusDiagonalRun,
    cylinderTorusDiagonals: cylinderTorusBoards
      .filter(({ diagonals }) => diagonals)
      .map(({ surface, rowCount, diagonals }) => ({ surface, side: rowCount, diagonals })),
    countDomicule: board => countDomiculeTilings(board).then(BigInt),
    roundDecimal,
    logCount,
    formatTime,
  });
  writeNoteRedirects(notes);
  const readScripts = files => files.map(file => fs.readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8')).join('\n');
  const scripts = readScripts(BROWSER_SCRIPTS);
  const workerSource = readScripts(WORKER_SCRIPTS);
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf-8');
  const research = readResearchResults();
  const html = template
    .replaceAll('__RESEARCH_S__', research.s)
    .replaceAll('__RESEARCH_DS__', research.ds)
    .replaceAll('__RESEARCH_LOWER__', research.lower)
    .replaceAll('__RESEARCH_UPPER__', research.upper)
    .replaceAll('__CHESSBOARD_DOMINOES__', chessboard(testCasesDomino))
    .replaceAll('__CHESSBOARD_DOMICULES__', chessboard(testCasesDomicule))
    .replace('__SCRIPTS__', () => scripts)
    .replace('__DATA__', () => JSON.stringify(data))
    .replace('__WORKER__', () => JSON.stringify(workerSource).replace(/</g, '\\u003c'))
    .replace('__JSON_LD__', () => JSON.stringify(buildJsonLd()).replace(/</g, '\\u003c'))
    .replace(/__SITE_URL__/g, SITE_URL)
    .replace(/__BENCHMARK_DIRECTORY__/g, `${BENCHMARK_ROOT}/${BENCHMARK_RUN}`)
    .replace(/__DOMICULE_SWEEPS__/g, DOMICULE_SWEEPS.toLocaleString('en-US'))
    .replace('__THEME_CSS__', () => THEME_CSS)
    .replace('__CHROME_CSS__', () => CHROME_CSS)
    .replace('__SITE_HEADER__', () => renderHeader({ root: '', current: 'home', notes }))
    .replace('__SITE_FOOTER__', () => renderFooter());

  Object.entries(ASSETS).forEach(([name, source]) => {
    fs.mkdirSync(path.dirname(path.join(OUTPUT_DIRECTORY, name)), { recursive: true });
    fs.copyFileSync(path.join(ROOT_DIRECTORY, source), path.join(OUTPUT_DIRECTORY, name));
  });
  fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'index.html'), html);
  fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'sitemap.xml'), buildSitemap(notes));
  console.log(`Site saved: ${path.relative(ROOT_DIRECTORY, path.join(OUTPUT_DIRECTORY, 'index.html'))}`);
}

__main__().catch(error => {
  console.error(error);
  process.exit(1);
});
