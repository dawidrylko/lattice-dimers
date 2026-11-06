const fs = require('fs');
const path = require('path');
const { filesInt, testCasesInt, filesBigInt, testCasesBigInt, filesDomicule } = require('../js/core/cases');
const { listImplementations, algorithmOf } = require('../js/core/registry');

const RESULTS_DIRECTORY = path.join(__dirname, '..', 'benchmarks', 'results');
const LARGEST_PERIODIC_RESULTS = [
  ...listImplementations('all-lattices-cylinder-torus-bigint').flatMap(({ file }) =>
    ['10x10-king-torus', '12x12-king-cylinder', '12x12-square-torus', '12x12-square-cylinder'].map(board => `${path.basename(file)}_${board}.txt`),
  ),
  ...listImplementations('all-lattices-cylinder-torus-modular').flatMap(({ file }) =>
    ['king', 'square'].flatMap(lattice => [
      `${path.basename(file)}_14x14-${lattice}-torus.txt`,
      `${path.basename(file)}_16x16-${lattice}-cylinder.txt`,
    ]),
  ),
  ...listImplementations('diagonal-pieces-bigint').map(({ file }) => `${path.basename(file)}_12x12.txt`),
  ...listImplementations('diagonal-pieces-modular').map(({ file }) => `${path.basename(file)}_20x20.txt`),
];

function resultFileName(fileName, { rowCount, colCount }) {
  return `${fileName}_${rowCount}x${colCount}.txt`;
}

function readRunEnvironment(root, run) {
  const file = path.join(root, run, 'environment.json');

  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return {};
  }
}

function isMonthRun(run) {
  return /^\d{4}-\d{2}$/.test(run);
}

function isCompleteRun(root, run) {
  if (!isMonthRun(run)) {
    const { complete, dirty } = readRunEnvironment(root, run);

    return complete === true && dirty === false;
  }

  const lastInt = testCasesInt[testCasesInt.length - 1];
  const lastBigInt = testCasesBigInt[testCasesBigInt.length - 1];
  const requiredFiles = [
    'environment.json',
    ...filesInt
      .flatMap(fileName => listImplementations(algorithmOf(fileName)))
      .map(({ file }) => resultFileName(path.basename(file), lastInt)),
    ...filesBigInt
      .flatMap(fileName => listImplementations(algorithmOf(fileName)))
      .map(({ file }) => resultFileName(path.basename(file), lastBigInt)),
    ...filesDomicule
      .flatMap(fileName => listImplementations(algorithmOf(fileName)))
      .flatMap(({ file }) => [16, 20].map(side => resultFileName(path.basename(file), { rowCount: side, colCount: side }))),
    ...LARGEST_PERIODIC_RESULTS,
  ];

  return requiredFiles.every(file => fs.existsSync(path.join(root, run, file)));
}

/**
 * Lists the benchmark runs, newest first, and picks the newest complete one: a partial run in a
 * new month, such as pnpm -C js start, must not replace the full table.
 * @param {string} [root] The directory of the run directories.
 * @returns {{runs: string[], latest: string}} Every run and the newest complete one.
 */
function readBenchmarkRuns(root = RESULTS_DIRECTORY) {
  const runs = fs
    .readdirSync(root)
    .filter(name => isMonthRun(name) || fs.existsSync(path.join(root, name, 'environment.json')))
    .map(name => ({ name, date: isMonthRun(name) ? name : readRunEnvironment(root, name).date || '' }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.name.localeCompare(a.name))
    .map(({ name }) => name);
  const latest = runs.find(run => isCompleteRun(root, run));

  if (!latest) {
    throw new Error(
      `No complete run in benchmarks/results: a run directory needs environment.json with complete: true.`,
    );
  }

  return { runs, latest };
}

/**
 * Lists the result files of the JavaScript implementations of the solvers a prefix names, which
 * set the boards of a benchmark table: a board only another language ran adds no row.
 * @param {string} directory The directory of one run.
 * @param {string} prefix The start of the solver id.
 * @returns {string[]} The result file names.
 */
function listJavaScriptResults(directory, prefix) {
  return fs.readdirSync(directory).filter(fileName => fileName.startsWith(prefix) && fileName.includes('.js_'));
}

module.exports = { readBenchmarkRuns, listJavaScriptResults };
