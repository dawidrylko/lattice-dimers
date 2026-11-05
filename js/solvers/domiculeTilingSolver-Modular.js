const os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { parseArgs, startTimer } = require('../core');
const { listPrimes, calculateLog2Bound, combineResidues } = require('../core/modular');

const MAX_SHORTER_SIDE = 30;

/**
 * Counts the domicule tilings modulo a prime with the same broken-profile dynamic
 * programming as domiculeTilingSolver-BigInt.js. Bit i of a state tells whether the cell
 * i places ahead of the current one is already covered; a state has cols + 2 bits.
 * Only additions are needed, so the counts are kept in Uint32Array tables.
 * @param {number} rows The number of rows (the longer side).
 * @param {number} cols The number of columns (the shorter side).
 * @param {number} prime The modulus.
 * @returns {number} The number of tilings modulo the prime.
 */
function countModulo(rows, cols, prime) {
  const stateCount = 2 ** (cols + 2);
  let current = new Uint32Array(stateCount);
  let next = new Uint32Array(stateCount);
  current[0] = 1 % prime;

  for (let cell = 0; cell < rows * cols; cell++) {
    const rowIndex = Math.floor(cell / cols);
    const colIndex = cell % cols;
    const hasRight = colIndex + 1 < cols;
    const hasBelow = rowIndex + 1 < rows;
    const offsets = [
      ...(hasRight ? [1] : []),
      ...(hasBelow && colIndex > 0 ? [cols - 1] : []),
      ...(hasBelow ? [cols] : []),
      ...(hasBelow && hasRight ? [cols + 1] : []),
    ].map(offset => 2 ** offset);

    next.fill(0);

    for (let state = 0; state < stateCount; state++) {
      const count = current[state];

      if (count === 0) {
        continue;
      }

      if (state & 1) {
        const target = state >>> 1;
        const sum = next[target] + count;
        next[target] = sum >= prime ? sum - prime : sum;
        continue;
      }

      for (let i = 0; i < offsets.length; i++) {
        if (!(state & offsets[i])) {
          const target = (state + offsets[i]) >>> 1;
          const sum = next[target] + count;
          next[target] = sum >= prime ? sum - prime : sum;
        }
      }
    }

    [current, next] = [next, current];
  }

  return current[0];
}

/**
 * Counts the residues in worker threads, at most `jobs` at a time.
 * @param {number} rows The longer side.
 * @param {number} cols The shorter side.
 * @param {number[]} primes The moduli.
 * @param {number} jobs The number of worker threads.
 * @returns {Promise<number[]>} The residues, in the order of the primes.
 */
async function countResidues(rows, cols, primes, jobs) {
  const residues = new Array(primes.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < primes.length) {
      const index = nextIndex++;
      residues[index] = await new Promise((resolve, reject) => {
        const worker = new Worker(__filename, { workerData: { rows, cols, prime: primes[index] } });
        worker.once('message', resolve);
        worker.once('error', reject);
        worker.once('exit', code =>
          reject(new Error(`The worker for the prime ${primes[index]} stopped with exit code ${code} before it sent a result.`)),
        );
      });
    }
  };

  await Promise.all(Array.from({ length: Math.min(jobs, primes.length) }, runWorker));

  return residues;
}

/**
 * Counts the tilings exactly: enough primes for the Kahn-Lovasz bound, plus one more prime
 * that the result is checked against.
 * @param {Object} options The board and the number of worker threads.
 * @returns {Promise<BigInt>} The number of tilings.
 */
async function calculateTotalTilingCombinations({ rowCount, colCount, jobs = os.availableParallelism() }) {
  const rows = Math.max(rowCount, colCount);
  const cols = Math.min(rowCount, colCount);

  if ((rows * cols) % 2 === 1) {
    return BigInt(0);
  }

  const primeCount = Math.ceil((calculateLog2Bound(rows, cols) + 1) / 30) + 1;
  const primes = listPrimes(primeCount);
  const residues = await countResidues(rows, cols, primes, jobs);
  const result = combineResidues(residues.slice(0, -1), primes.slice(0, -1));

  if (result % BigInt(primes.at(-1)) !== BigInt(residues.at(-1))) {
    throw new Error(`The result does not match the residue modulo the check prime ${primes.at(-1)}.`);
  }

  return result;
}

function isValidSize(size) {
  return Number.isInteger(size) && size >= 0;
}

async function __main__() {
  const argsSchema = { '-r': 'rowCount', '-c': 'colCount', '-j': 'jobs' };
  const options = parseArgs(process.argv.slice(2), argsSchema);
  const jobs = options.jobs ?? os.availableParallelism();

  if (!isValidSize(options.rowCount) || !isValidSize(options.colCount) || !(jobs > 0)) {
    console.error(
      'Usage: node js/solvers/domiculeTilingSolver-Modular.js -r <rowCount> -c <colCount> [-j <jobs>]',
    );
    process.exit(1);
  }

  if (Math.min(options.rowCount, options.colCount) > MAX_SHORTER_SIDE) {
    console.error(
      `The shorter side of the board can be at most ${MAX_SHORTER_SIDE}, because the states are indexed with 32-bit integers.`,
    );
    process.exit(1);
  }

  const stopTimer = startTimer();
  const result = await calculateTotalTilingCombinations({ ...options, jobs });
  stopTimer();
  console.log(result.toString());
}

if (!isMainThread) {
  const { rows, cols, prime } = workerData;
  parentPort.postMessage(countModulo(rows, cols, prime));
} else if (require.main === module) {
  __main__().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { calculateTotalTilingCombinations, calculateLog2Bound, listPrimes, countModulo, combineResidues };
