const fs = require('fs');
const path = require('path');

const { listImplementations } = require('../js/core/registry');

const RESULTS_DIRECTORY = path.join(__dirname, '..', 'benchmarks', 'results');
const NOT_REACHED = 'not measured: the run did not reach this board';
const EMPTY_BOARD_UNMEASURED = 'not measured: the run predates the 0 × 0 board';
const TRIANGULAR_UNMEASURED = 'not measured: no benchmark run has measured the triangular lattice yet';
const TRIANGULAR_RESULT_FILE = /-triangular-(rectangle|cylinder|torus)\.txt$/;
const TRIANGULAR_SOLVERS = {
  all: {
    rectangle: { modular: 'any-lattice-rectangle-modular', bigint: 'any-lattice-rectangle-bigint' },
    cylinderTorus: {
      pfaffian: 'any-lattice-cylinder-torus-pfaffian',
      modular: 'any-lattice-cylinder-torus-modular',
      bigint: 'any-lattice-cylinder-torus-bigint',
    },
  },
  diagonal: {
    rectangle: { modular: 'any-lattice-rectangle-polynomial-modular', bigint: 'any-lattice-rectangle-polynomial-bigint' },
    cylinderTorus: { modular: 'any-lattice-cylinder-torus-polynomial-modular', bigint: 'any-lattice-cylinder-torus-polynomial-bigint' },
  },
};
const LANGUAGE_KEYS = { pfaffian: 'pfaffianLanguages', modular: 'languages', bigint: 'bigintLanguages' };

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
 * does a longer solver id that starts with the prefix.
 * @param {string} directory The directory of one run.
 * @param {string} prefix The start of the solver id.
 * @returns {string[]} The result file names.
 */
function listJavaScriptResults(directory, prefix) {
  return fs
    .readdirSync(directory)
    .filter(fileName => fileName.includes('.js_'))
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

/**
 * Reads the mean times of one result file.
 * @param {string} directory The directory of one run.
 * @param {string} fileName The result file.
 * @returns {Object|null} The mean time of the count, of the process and the number of runs; null without the file.
 */
function readAverageTime(directory, fileName) {
  const file = path.join(directory, fileName);

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

function readLanguages(algorithm, suffix, directory) {
  return Object.fromEntries(
    listImplementations(algorithm)
      .filter(({ language }) => language !== 'js')
      .map(({ language, file }) => [language, readAverageTime(directory, `${path.basename(file)}${suffix}`)]),
  );
}

/**
 * Says why each implementation of a solver has no time on a board: the reason plan.json records,
 * or, for a board it does not list, that the run predates the empty board or did not reach it.
 * A reason is shown only where the time is missing.
 * @returns {Object} The reason per language.
 */
function readMissingReasons(algorithm, { rowCount, colCount }, seriesSuffix, directory) {
  const plan = path.join(directory, 'plan.json');
  const { budgetHours, notMeasured } = fs.existsSync(plan) ? JSON.parse(fs.readFileSync(plan, 'utf-8')) : { budgetHours: null, notMeasured: [] };
  const board = `${rowCount}x${colCount}`;
  const fallback = rowCount * colCount === 0 ? EMPTY_BOARD_UNMEASURED : NOT_REACHED;

  return Object.fromEntries(
    listImplementations(algorithm).map(({ language, file }) => {
      const name = `${path.basename(file)}${seriesSuffix}`;
      const entry = notMeasured.find(({ series, board: other }) => series === name && other === board);

      return [language, entry ? describeMissing(entry, budgetHours) : fallback];
    }),
  );
}

/**
 * Tells whether a run measured the triangular lattice, which no run up to that of 2026-11-16 did.
 * @param {string} directory The directory of one run.
 * @returns {boolean} Whether the run holds a result file of the triangular lattice.
 */
function hasTriangularResults(directory) {
  return fs.readdirSync(directory).some(fileName => TRIANGULAR_RESULT_FILE.test(fileName));
}

/**
 * Reads the times of the solvers of one board of the triangular lattice, in the shape of the rows of the other
 * benchmark tables. A run that predates the triangular lattice gives every time that one reason.
 * @param {string} directory The directory of one run.
 * @param {Object} board The sides of the board and its surface: rectangle, cylinder or torus.
 * @param {string} count all for the solvers that count every tiling, diagonal for the ones that count by diagonal pieces.
 * @returns {Object} The JavaScript time per solver, the times in the other languages and the reasons of the missing ones.
 */
function readTriangularTimes(directory, { rowCount, colCount, surface }, count) {
  const solvers = TRIANGULAR_SOLVERS[count][surface === 'rectangle' ? 'rectangle' : 'cylinderTorus'];
  const suffix = `_${rowCount}x${colCount}-triangular-${surface}.txt`;
  const measured = hasTriangularResults(directory);
  const times = { missing: {} };

  for (const [solver, algorithm] of Object.entries(solvers)) {
    times[solver] = readAverageTime(directory, `${algorithm}.js${suffix}`);
    times[LANGUAGE_KEYS[solver]] = readLanguages(algorithm, suffix, directory);
    times.missing[solver] = measured
      ? readMissingReasons(algorithm, { rowCount, colCount }, `-triangular-${surface}`, directory)
      : Object.fromEntries(listImplementations(algorithm).map(({ language }) => [language, TRIANGULAR_UNMEASURED]));
  }

  return times;
}

module.exports = {
  readBenchmarkRuns,
  findSeriesRun,
  listJavaScriptResults,
  describeMissing,
  readAverageTime,
  readLanguages,
  readMissingReasons,
  hasTriangularResults,
  readTriangularTimes,
};
