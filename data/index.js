const { files: filesInt, testCases: testCasesInt } = require('./dominoTilingTests.json');
const { files: filesBigInt, testCases: testCasesBigInt } = require('./dominoTilingTests-BigInt.json');
const { files: filesRectangles, testCases: testCasesRectangles } = require('./dominoTilingTests-Rectangles.json');
const { files: filesDomicule, testCases: testCasesDomicule } = require('./domiculeTilingTests.json');
const {
  files: filesDomiculeRectangles,
  testCases: testCasesDomiculeRectangles,
} = require('./domiculeTilingTests-Rectangles.json');
const { files: filesPeriodic, testCases: testCasesPeriodic } = require('./periodicTilingTests.json');
const { files: filesPeriodicModular, testCases: testCasesPeriodicModular } = require('./periodicTilingTests-Modular.json');
const { files: filesDiagonal, testCases: testCasesDiagonal } = require('./domiculeDiagonalTests.json');
const { files: filesDiagonalModular, testCases: testCasesDiagonalModular } = require('./domiculeDiagonalTests-Modular.json');

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
