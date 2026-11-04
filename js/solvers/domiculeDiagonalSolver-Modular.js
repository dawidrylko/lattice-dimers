const os = require('os');
const { isMainThread, parentPort, workerData } = require('worker_threads');
const { parseArgs } = require('../core');
const { listPrimes, calculateLog2Bound, combineCheckedResidues, runWorkers } = require('../core/modular');

const MAX_SHORTER_SIDE = 20;
const UNREACHED = 2;

/**
 * Counts the domicule tilings by the number of diagonal pieces modulo a prime, with the
 * transfer of domiculeDiagonalSolver-BigInt.js. A domino covers a black and a white cell of
 * the chessboard and a diagonal piece two cells of one colour, so the covered cells of a state
 * fix the difference between the diagonal pieces on black and on white cells, and with it the
 * parity of their number. Every state therefore keeps only the coefficients of x^k with k of
 * its parity: entry j of its block is the coefficient of x^(2j + parity). The parity of a state
 * is set when it is first reached, and reaching it with the other one throws. Each cell places
 * at most one piece, so before cell p only the coefficients up to x^p are visited.
 * @param {Object} board The board and the prime.
 * @returns {number[]} The coefficients modulo the prime, from x^0 to x^(rows * cols / 2).
 */
function countModulo({ rows, cols, prime }) {
  const degree = Math.floor((rows * cols) / 2);
  const width = Math.floor(degree / 2) + 1;
  const stateCount = 2 ** (cols + 2);
  let current = new Uint32Array(stateCount * width);
  let next = new Uint32Array(stateCount * width);
  let parity = new Uint8Array(stateCount).fill(UNREACHED);
  let nextParity = new Uint8Array(stateCount);
  current[0] = 1 % prime;
  parity[0] = 0;

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
    const placed = Math.min(width - 1, Math.floor(cell / 2));

    next.fill(0);
    nextParity.fill(UNREACHED);

    const add = (source, target, diagonal) => {
      const own = parity[source];
      const shift = own & diagonal;

      if (nextParity[target] === UNREACHED) {
        nextParity[target] = own ^ diagonal;
      } else if (nextParity[target] !== (own ^ diagonal)) {
        throw new Error('A state was reached with both parities of the number of diagonal pieces.');
      }

      const from = source * width;
      const to = target * width + shift;

      for (let k = 0; k <= placed && k + shift < width; k++) {
        const count = current[from + k];

        if (count !== 0) {
          const sum = next[to + k] + count;
          next[to + k] = sum >= prime ? sum - prime : sum;
        }
      }
    };

    for (let state = 0; state < stateCount; state++) {
      if (parity[state] === UNREACHED) {
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
    [parity, nextParity] = [nextParity, parity];
  }

  const coefficients = new Array(degree + 1).fill(0);

  if (parity[0] !== UNREACHED) {
    for (let j = 0; 2 * j + parity[0] <= degree; j++) {
      coefficients[2 * j + parity[0]] = current[j];
    }
  }

  return coefficients;
}

/**
 * Caps the number of worker threads so that their tables fit in half the memory: each keeps
 * two Uint32Array tables of half a polynomial per state and two Uint8Array parity tables.
 * @param {number} jobs The number of threads asked for.
 * @param {number} cols The shorter side.
 * @param {number} degree The largest number of pieces, rows * cols / 2.
 * @param {number} [memory] The memory of the machine in bytes.
 * @returns {number} The number of threads to run, at least 1.
 */
function capThreads(jobs, cols, degree, memory = os.totalmem()) {
  const bytesPerWorker = 2 ** (cols + 2) * (2 * 4 * (Math.floor(degree / 2) + 1) + 2);

  return Math.max(1, Math.min(jobs, Math.floor(memory / 2 / bytesPerWorker)));
}

/**
 * Counts the tilings by the number of diagonal pieces exactly: every coefficient is at most
 * the number of tilings, so the Kahn-Lovasz bound of domiculeTilingSolver-Modular.js sets the
 * number of primes, and one more prime checks every coefficient. The number of worker threads
 * is capped so that their tables fit in half the memory of the machine.
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
  const residues = await runWorkers(__filename, primes.map(prime => ({ rows, cols, prime })), capThreads(jobs, cols, degree));

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
    console.error('Usage: node js/solvers/domiculeDiagonalSolver-Modular.js -r <rowCount> -c <colCount> [-j <jobs>]');
    process.exit(1);
  }

  if (Math.min(options.rowCount, options.colCount) > MAX_SHORTER_SIDE) {
    console.error(
      `The shorter side of the board can be at most ${MAX_SHORTER_SIDE}, because every worker thread keeps half the polynomial of every state in memory (about 3.4 GB at 20 x 20; -j sets the number of threads).`,
    );
    process.exit(1);
  }

  const cols = Math.min(options.rowCount, options.colCount);
  const threads = capThreads(jobs, cols, Math.floor((options.rowCount * options.colCount) / 2));

  if (threads < jobs) {
    console.error(`Running ${threads} worker threads instead of ${jobs}, so that their tables fit in half the memory.`);
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

module.exports = { calculateDiagonalPolynomial, countModulo, capThreads };
