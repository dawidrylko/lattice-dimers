const fs = require('fs');
const path = require('path');
const { filesInt, testCasesInt, filesBigInt, testCasesBigInt, filesDomicule } = require('../js/core/cases');
const { listImplementations } = require('../js/core/registry');

const RESULTS_DIRECTORY = path.join(__dirname, '..', 'benchmarks', 'results');
const LARGEST_PERIODIC_RESULTS = [
  'periodicTilingSolver-BigInt.js_10x10-king-torus.txt',
  ...listImplementations('periodic-tiling-modular').flatMap(({ file }) => [
    `${path.basename(file)}_14x14-king-torus.txt`,
    `${path.basename(file)}_16x16-king-cylinder.txt`,
  ]),
  'periodicTilingSolver-BigInt.js_12x12-king-cylinder.txt',
  'domiculeDiagonalSolver-BigInt.js_12x12.txt',
  'domiculeDiagonalSolver-Modular.js_20x20.txt',
];

function resultFileName(fileName, { rowCount, colCount }) {
  return `${fileName}_${rowCount}x${colCount}.txt`;
}

function isCompleteRun(root, run) {
  const lastInt = testCasesInt[testCasesInt.length - 1];
  const lastBigInt = testCasesBigInt[testCasesBigInt.length - 1];
  const requiredFiles = [
    'environment.json',
    ...filesInt.map(fileName => resultFileName(fileName, lastInt)),
    ...filesBigInt.map(fileName => resultFileName(fileName, lastBigInt)),
    ...filesDomicule.map(fileName => resultFileName(fileName, { rowCount: 16, colCount: 16 })),
    ...filesDomicule.map(fileName => resultFileName(fileName, { rowCount: 20, colCount: 20 })),
    ...LARGEST_PERIODIC_RESULTS,
  ];

  return requiredFiles.every(file => fs.existsSync(path.join(root, run, file)));
}

/**
 * Lists the benchmark runs, newest first, and picks the newest complete one: a partial run in a
 * new month, such as pnpm start, must not replace the full table.
 * @param {string} [root] The directory of the YYYY-MM run directories.
 * @returns {{runs: string[], latest: string}} Every run and the newest complete one.
 */
function readBenchmarkRuns(root = RESULTS_DIRECTORY) {
  const runs = fs
    .readdirSync(root)
    .filter(name => /^\d{4}-\d{2}$/.test(name))
    .sort()
    .reverse();
  const latest = runs.find(run => isCompleteRun(root, run));

  if (!latest) {
    throw new Error(
      `No complete benchmarks/results/YYYY-MM directory: one needs environment.json and every solver's largest board.`,
    );
  }

  return { runs, latest };
}

module.exports = { readBenchmarkRuns };
