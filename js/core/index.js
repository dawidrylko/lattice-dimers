const parseArgs = require('./commandLineArgsParser');
const { verifyInt, verifyBigInt } = require('./verifiers');
const { startTimer } = require('./timer');

module.exports = {
  parseArgs,
  verifyInt,
  verifyBigInt,
  startTimer,
};
