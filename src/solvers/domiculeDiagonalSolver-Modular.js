const os = require('os');
const { isMainThread, parentPort, workerData } = require('worker_threads');
const { parseArgs } = require('../helpers');
const { listPrimes, calculateLog2Bound, combineCheckedResidues, runWorkers } = require('../helpers/modular');

const MAX_SHORTER_SIDE = 18;

/**
 * Counts the domicule tilings by the number of diagonal pieces modulo a prime, with the
 * transfer of domiculeDiagonalSolver-BigInt.js. The polynomial of state s occupies the
 * entries s * (degree + 1) to s * (degree + 1) + degree of one Uint32Array. Each cell places
 * at most one piece, so before cell p only the coefficients up to x^p are visited.
 * @param {Object} board The board and the prime.
 * @returns {number[]} The coefficients modulo the prime.
 */
function countModulo({ rows, cols, prime }) {
  const degree = Math.floor((rows * cols) / 2);
  const width = degree + 1;
  const stateCount = 2 ** (cols + 2);
  let current = new Uint32Array(stateCount * width);
  let next = new Uint32Array(stateCount * width);
  current[0] = 1 % prime;

  for (let cell = 0; cell < rows * cols; cell++) {
    const rowIndex = Math.floor(cell / cols);
    const colIndex = cell % cols;
    const hasRight = colIndex + 1 < cols;
    const hasBelow = rowIndex + 1 < rows;
    const moves = [
      ...(hasRight ? [[1, 0]] : []),
      ...(hasBelow && colIndex > 0 ? [[cols - 1, 1]] : []),
      ...(hasBelow ? [[cols, 0]] : []),
      ...(hasBelow && hasRight ? [[cols + 1, 1]] : []),
    ].map(([offset, diagonal]) => [2 ** offset, diagonal]);
    const placed = Math.min(degree, cell);

    next.fill(0);

    const add = (source, target, diagonal) => {
      const from = source * width;
      const to = target * width + diagonal;

      for (let k = 0; k <= placed && k + diagonal <= degree; k++) {
        const count = current[from + k];

        if (count !== 0) {
          const sum = next[to + k] + count;
          next[to + k] = sum >= prime ? sum - prime : sum;
        }
      }
    };

    for (let state = 0; state < stateCount; state++) {
      let empty = true;

      for (let k = 0; k <= placed && empty; k++) {
        empty = current[state * width + k] === 0;
      }

      if (empty) {
        continue;
      }

      if (state & 1) {
        add(state, state >>> 1, 0);
        continue;
      }

      for (let i = 0; i < moves.length; i++) {
        const [bit, diagonal] = moves[i];

        if (!(state & bit)) {
          add(state, (state + bit) >>> 1, diagonal);
        }
      }
    }

    [current, next] = [next, current];
  }

  return Array.from(current.subarray(0, width));
}

/**
 * Counts the tilings by the number of diagonal pieces exactly: every coefficient is at most
 * the number of tilings, so the Kahn-Lovasz bound of domiculeTilingSolver-Modular.js sets the
 * number of primes, and one more prime checks every coefficient.
 * @param {Object} options The board and the number of worker threads.
 * @returns {Promise<BigInt[]>} The coefficients, from x^0 to x^(rowCount * colCount / 2).
 */
async function calculateDiagonalPolynomial({ rowCount, colCount, jobs = os.availableParallelism() }) {
  const rows = Math.max(rowCount, colCount);
  const cols = Math.min(rowCount, colCount);
  const degree = Math.floor((rows * cols) / 2);

  if ((rows * cols) % 2 === 1) {
    return new Array(degree + 1).fill(BigInt(0));
  }

  const primeCount = Math.ceil((calculateLog2Bound(rows, cols) + 1) / 30) + 1;
  const primes = listPrimes(primeCount);
  const residues = await runWorkers(__filename, primes.map(prime => ({ rows, cols, prime })), jobs);

  return Array.from({ length: degree + 1 }, (_, k) =>
    combineCheckedResidues(
      residues.map(coefficients => coefficients[k]),
      primes,
    ),
  );
}

function isValidSize(size) {
  return Number.isInteger(size) && size >= 0;
}

async function __main__() {
  const argsSchema = { '-r': 'rowCount', '-c': 'colCount', '-j': 'jobs' };
  const options = parseArgs(process.argv.slice(2), argsSchema);
  const jobs = options.jobs ?? os.availableParallelism();

  if (!isValidSize(options.rowCount) || !isValidSize(options.colCount) || !(jobs > 0)) {
    console.error('Usage: node src/solvers/domiculeDiagonalSolver-Modular.js -r <rowCount> -c <colCount> [-j <jobs>]');
    process.exit(1);
  }

  if (Math.min(options.rowCount, options.colCount) > MAX_SHORTER_SIDE) {
    console.error(
      `The shorter side of the board can be at most ${MAX_SHORTER_SIDE}, because the polynomial of every state is kept in memory.`,
    );
    process.exit(1);
  }

  const coefficients = await calculateDiagonalPolynomial({ ...options, jobs });
  console.log(coefficients.join(','));
}

if (!isMainThread) {
  parentPort.postMessage(countModulo(workerData));
} else if (require.main === module) {
  __main__().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { calculateDiagonalPolynomial, countModulo };
