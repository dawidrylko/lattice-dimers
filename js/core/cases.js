const { registry } = require('./registry');

/**
 * Reads the known counts of one algorithm from spec/cases/<algorithm>.json.
 * @param {string} algorithm The id of the algorithm in spec/algorithms.json.
 * @returns {Object[]} The test cases of the file, in its order.
 */
function testCasesOf(algorithm) {
  if (!Object.hasOwn(registry.algorithms, algorithm)) {
    throw new Error(`${algorithm} is not an algorithm of spec/algorithms.json.`);
  }

  return require(`../../spec/cases/${algorithm}.json`).testCases;
}

/**
 * Names the board of a test case, so two cases can be compared across the files of spec/cases.
 * @param {Object} testCase The test case.
 * @returns {string} The same text for the same board of one family of algorithms.
 */
function boardKeyOf({ rowCount, colCount, lattice, torus, twisted }) {
  return [rowCount, colCount, lattice ?? '', Boolean(torus), Boolean(twisted)].join('|');
}

/**
 * Tells the 2n x 2n boards from the other rectangles.
 * @param {Object} testCase The test case.
 * @returns {boolean} Whether the board is a square with an even side.
 */
function isEvenSquare({ rowCount, colCount }) {
  return rowCount === colCount && rowCount % 2 === 0;
}

module.exports = { testCasesOf, boardKeyOf, isEvenSquare };
