const fs = require('fs');
const path = require('path');

const RESULTS_DIRECTORY = path.join(__dirname, '..', 'benchmarks', 'results');

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
 * set the boards of a benchmark table: a board only another language ran adds no row.
 * @param {string} directory The directory of one run.
 * @param {string} prefix The start of the solver id.
 * @returns {string[]} The result file names.
 */
function listJavaScriptResults(directory, prefix) {
  return fs.readdirSync(directory).filter(fileName => fileName.startsWith(prefix) && fileName.includes('.js_'));
}

module.exports = { readBenchmarkRuns, listJavaScriptResults };
