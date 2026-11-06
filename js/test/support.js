const { spawnSync } = require('child_process');
const path = require('path');
const { registry, listImplementations } = require('../core/registry');
const { testCasesOf, boardKeyOf } = require('../core/cases');
const limits = require('../../spec/limits.json');

const ROOT_DIRECTORY = path.join(__dirname, '..', '..');
const REJECTION_TIMEOUT = 30000;

/**
 * Lists the algorithms of spec/algorithms.json that have a JavaScript implementation.
 * @returns {string[]} The ids of the algorithms, in the order of the file.
 */
function listJavaScriptAlgorithms() {
  return Object.keys(registry.algorithms).filter(algorithm => Object.hasOwn(registry.algorithms[algorithm], 'js'));
}

/**
 * Finds the JavaScript solver of an algorithm.
 * @param {string} algorithm The id of the algorithm in spec/algorithms.json.
 * @returns {string} The absolute path of the solver.
 */
function solverPathOf(algorithm) {
  const { file } = listImplementations(algorithm).find(({ language }) => language === 'js');

  return path.join(ROOT_DIRECTORY, file);
}

/**
 * Runs a Node.js script and collects its output.
 * @param {string[]} args The arguments of the node binary, the script first.
 * @param {Object} [options] The options of spawnSync.
 * @returns {Object} The result of spawnSync with the output as text.
 */
function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, { cwd: ROOT_DIRECTORY, encoding: 'utf-8', ...options });
}

/**
 * Lists the flags that select the board of a test case.
 * @param {Object} testCase The test case.
 * @returns {string[]} The arguments after the solver.
 */
function argsOf({ rowCount, colCount, lattice, torus, twisted }) {
  return [
    '-r',
    String(rowCount),
    '-c',
    String(colCount),
    ...(lattice ? ['--lattice', lattice] : []),
    ...(torus ? ['--torus'] : []),
    ...(twisted ? ['--twisted'] : []),
  ];
}

/**
 * Names a test case by its board.
 * @param {Object} testCase The test case.
 * @returns {string} A text such as "king torus twisted 4x4".
 */
function labelOf({ rowCount, colCount, lattice, torus, twisted }) {
  return [lattice, lattice && (torus ? 'torus' : 'cylinder'), twisted && 'twisted', `${rowCount}x${colCount}`].filter(Boolean).join(' ');
}

/**
 * Shortens a long argument for the name of a test.
 * @param {string} arg The argument.
 * @returns {string} The argument, or its start and length when it is longer than 24 characters.
 */
function shortenArg(arg) {
  return arg.length > 24 ? `${arg.slice(0, 8)}...(${arg.length} characters)` : arg;
}

/**
 * Selects the test cases of an algorithm that the default run counts, by the limits of spec/limits.json. FULL_CASES=1 selects all.
 * @param {string} algorithm The id of the algorithm in spec/algorithms.json.
 * @returns {Object[]} The test cases, in the order of their file.
 */
function selectCases(algorithm) {
  const testCases = testCasesOf(algorithm);
  const limit = limits.algorithms[algorithm];

  if (process.env.FULL_CASES === '1' || !limit) {
    return testCases;
  }

  if (limit.maxTorusSide !== undefined) {
    return testCases.filter(({ torus, colCount }) => !torus || colCount <= limit.maxTorusSide);
  }

  if (limit.maxSquareSide !== undefined) {
    return testCases.filter(({ rowCount, colCount }) => rowCount !== colCount || rowCount <= limit.maxSquareSide);
  }

  const held = new Set(testCasesOf(limit.firstCasesPlusBoardsOf).map(boardKeyOf));

  return testCases.filter((testCase, index) => index < limits.firstCases || held.has(boardKeyOf(testCase)));
}

module.exports = {
  ROOT_DIRECTORY,
  REJECTION_TIMEOUT,
  listJavaScriptAlgorithms,
  solverPathOf,
  runNode,
  argsOf,
  labelOf,
  shortenArg,
  selectCases,
};
