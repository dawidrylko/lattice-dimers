const { javaScriptFileOf } = require('./registry');

function load(name) {
  const { algorithms, testCases } = require(`../../spec/cases/${name}`);

  return { files: algorithms.map(javaScriptFileOf), testCases };
}

const { files: filesInt, testCases: testCasesInt } = load('dominoTilingTests.json');
const { files: filesBigInt, testCases: testCasesBigInt } = load('dominoTilingTests-BigInt.json');
const { files: filesRectangles, testCases: testCasesRectangles } = load('dominoTilingTests-Rectangles.json');
const { files: filesDomicule, testCases: testCasesDomicule } = load('domiculeTilingTests.json');
const { files: filesDomiculeRectangles, testCases: testCasesDomiculeRectangles } = load('domiculeTilingTests-Rectangles.json');
const { files: filesPeriodic, testCases: testCasesPeriodic } = load('periodicTilingTests.json');
const { files: filesPeriodicModular, testCases: testCasesPeriodicModular } = load('periodicTilingTests-Modular.json');
const { files: filesDiagonal, testCases: testCasesDiagonal } = load('domiculeDiagonalTests.json');
const { files: filesDiagonalModular, testCases: testCasesDiagonalModular } = load('domiculeDiagonalTests-Modular.json');

module.exports = {
  filesInt,
  testCasesInt,
  filesBigInt,
  testCasesBigInt,
  filesRectangles,
  testCasesRectangles,
  filesDomicule,
  testCasesDomicule,
  filesDomiculeRectangles,
  testCasesDomiculeRectangles,
  filesPeriodic,
  testCasesPeriodic,
  filesPeriodicModular,
  testCasesPeriodicModular,
  filesDiagonal,
  testCasesDiagonal,
  filesDiagonalModular,
  testCasesDiagonalModular,
};
