const fs = require('fs');
const path = require('path');

const RESULTS_DIRECTORY = path.join(__dirname, '..', 'benchmarks', 'results');
const FORMER_NAMES = [
  ['domicule-rectangle-polynomial-', 'diagonal-pieces-'],
  ['domicule_rectangle_polynomial_', 'diagonal_pieces_'],
  ['any-lattice-', 'all-lattices-'],
  ['any_lattice_', 'all_lattices_'],
  ['domino-rectangle-float', 'domino-rectangle-number'],
  ['domino_rectangle_float', 'domino_rectangle_number'],
];

/**
 * Names a result file as a run made before a solver rename recorded it, so that run stays readable.
 * @param {string} fileName The result file name under the current solver id.
 * @returns {string} The same name under the former id, or the name itself.
 */
function formerResultName(fileName) {
  const renamed = FORMER_NAMES.find(([current]) => fileName.startsWith(current));

  return renamed ? renamed[1] + fileName.slice(renamed[0].length) : fileName;
}

/**
 * Finds the file a run recorded for a result, under the current solver id or the former one.
 * @param {string} directory The directory of one run.
 * @param {string} fileName The result file name under the current solver id.
 * @returns {string} The path of the file, which may not exist.
 */
function resultFileOf(directory, fileName) {
  const current = path.join(directory, fileName);
  const former = path.join(directory, formerResultName(fileName));

  return fs.existsSync(current) || !fs.existsSync(former) ? current : former;
}

function readRunEnvironment(root, run) {
  const file = path.join(root, run, 'environment.json');

  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return {};
  }
}

function isCompleteRun(root, run) {
  const { complete, dirty } = readRunEnvironment(root, run);

  return complete === true && dirty === false;
}

/**
 * Lists the benchmark runs, newest first, and picks the newest complete one: a partial run in a
 * new directory, such as pnpm -C js start, must not replace the full table.
 * @param {string} [root] The directory of the run directories.
 * @returns {{runs: string[], latest: string}} Every run and the newest complete one.
 */
function readBenchmarkRuns(root = RESULTS_DIRECTORY) {
  const runs = fs
    .readdirSync(root)
    .filter(name => fs.existsSync(path.join(root, name, 'environment.json')))
    .map(name => ({ name, date: readRunEnvironment(root, name).date || '' }))
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
 * set the boards of a benchmark table: a board only another language ran adds no row, and neither
 * does a longer solver id that starts with the prefix. A run made before a solver rename is listed
 * under the current id.
 * @param {string} directory The directory of one run.
 * @param {string} prefix The start of the solver id.
 * @returns {string[]} The result file names.
 */
function listJavaScriptResults(directory, prefix) {
  const former = formerResultName(prefix);

  return fs
    .readdirSync(directory)
    .filter(fileName => fileName.includes('.js_'))
    .map(fileName => (former !== prefix && fileName.startsWith(former) ? prefix + fileName.slice(former.length) : fileName))
    .filter(fileName => fileName.startsWith(prefix) && !fileName.slice(prefix.length).split('.js_')[0].includes('-'));
}

/**
 * Finds the newest clean run that measured the solvers a prefix names. A solver added after the
 * complete run the site shows is measured in a run of its own, which stays incomplete because it
 * leaves the other solvers out, so its table reads that run instead.
 * @param {string} prefix The start of the solver id.
 * @param {string} [root] The directory of the run directories.
 * @returns {string|null} The name of the run directory, or null when no run measured them.
 */
function findSeriesRun(prefix, root = RESULTS_DIRECTORY) {
  const { runs } = readBenchmarkRuns(root);

  return runs.find(run => readRunEnvironment(root, run).dirty === false && listJavaScriptResults(path.join(root, run), prefix).length) ?? null;
}

/**
 * Says why plan.json records a board as not measured. A failure closes the larger boards of its
 * series too, so a failed board may never have started.
 * @param {{reason: string, budgetHours?: number}} entry The entry of plan.json; its own budgetHours
 * wins over the run's, for a series measured with a budget of its own.
 * @param {number} budgetHours The budget of one board in the run.
 * @returns {string} The reason for the tooltip of a dash.
 */
function describeMissing({ reason, budgetHours: ownBudgetHours }, budgetHours) {
  if (reason === 'over budget') {
    return `not measured: 10 runs would exceed the budget of ${ownBudgetHours ?? budgetHours} h per board`;
  }

  if (/ETIMEDOUT/.test(reason)) {
    return 'not measured: a run on this or a smaller board passed its time limit';
  }

  return /Last few GCs|exit code (134|137)|memory|Invalid array length|allocation/i.test(reason)
    ? 'not measured: ran out of memory on this or a smaller board'
    : 'not measured: a run failed on this or a smaller board';
}

module.exports = { readBenchmarkRuns, findSeriesRun, listJavaScriptResults, describeMissing, formerResultName, resultFileOf };
