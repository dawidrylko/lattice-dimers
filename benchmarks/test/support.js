const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT_DIRECTORY = path.join(__dirname, '..', '..');
const REJECTION_TIMEOUT = 30000;
const WRONG_COUNT = path.join(__dirname, 'fixtures', 'wrongCount.js');

/**
 * Creates a temporary directory that is removed when the test ends.
 * @param {Object} context The context of the test or suite.
 * @param {string} prefix The start of the directory name.
 * @returns {string} The path of the directory.
 */
function makeTemporaryDirectory(context, prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));

  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  return directory;
}

/**
 * Runs an action with environment variables set, or deleted when the value is undefined, and restores them afterwards.
 * @param {Object<string, string|undefined>} values The variables to set.
 * @param {function(): *} action The action to run.
 * @returns {*} What the action returns.
 */
function withEnvironment(values, action) {
  const saved = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  const assign = entries => Object.entries(entries).forEach(([key, value]) => (value === undefined ? delete process.env[key] : (process.env[key] = value)));

  assign(values);

  try {
    return action();
  } finally {
    assign(saved);
  }
}

/**
 * Runs a Node.js script from the repository root and collects its output.
 * @param {string[]} args The arguments of the node binary, the script first.
 * @param {Object} [options] The options of spawnSync.
 * @returns {Object} The result of spawnSync with the output as text.
 */
function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, { cwd: ROOT_DIRECTORY, encoding: 'utf-8', timeout: REJECTION_TIMEOUT, ...options });
}

/**
 * Runs benchmarks/runner.js with its results written to a given root.
 * @param {string} benchmarkRoot The directory that replaces benchmarks/results.
 * @param {string[]} args The arguments of the runner.
 * @param {Object<string, string>} [env] More environment variables.
 * @returns {Object} The result of spawnSync with the output as text.
 */
function runRunner(benchmarkRoot, args, env = {}) {
  return runNode(['benchmarks/runner.js', ...args], { env: { ...process.env, BENCHMARK_ROOT: benchmarkRoot, ...env } });
}

/**
 * Runs the runner on the smallest board of the formula solver.
 * @param {string} benchmarkRoot The directory that replaces benchmarks/results.
 * @param {string[]} extraArgs More arguments of the runner.
 * @returns {Object} The result of spawnSync with the output as text.
 */
function runBenchmark(benchmarkRoot, extraArgs) {
  return runRunner(benchmarkRoot, ['-n', '1', '-m', '1', '--only', 'domino-rectangle-formula.js', ...extraArgs]);
}

module.exports = { ROOT_DIRECTORY, REJECTION_TIMEOUT, WRONG_COUNT, makeTemporaryDirectory, withEnvironment, runNode, runRunner, runBenchmark };
