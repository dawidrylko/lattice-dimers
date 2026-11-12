const os = require('os');
const { isMainThread, parentPort, workerData } = require('worker_threads');
const { parseArgs, startTimer } = require('../core');
const { listPrimes, combineCheckedResidues, runWorkers } = require('../core/modular');

const MAX_CIRCUMFERENCE = 20;

/**
 * Lists the moves of a free cell in column c of a king's graph cylinder, as listMoves of
 * any-lattice-cylinder-torus-modular.js does, with whether the piece is diagonal instead of
 * whether it crosses the seam. Bit i of a state is the cell i places ahead in row-major order;
 * a piece from column 0 to the last column of the next row is kept in the extra bit wrapBit
 * when cols >= 3.
 * @param {number} cols The circumference.
 * @param {number} c The column.
 * @param {boolean} hasBelow Whether the cell has a next row.
 * @param {number} wrapBit The extra bit.
 * @returns {Array<{ bit: number, diagonal: number }>} The moves.
 */
function listMoves(cols, c, hasBelow, wrapBit) {
  const moves = [];
  const add = (offset, diagonal) => moves.push({ bit: 2 ** offset, diagonal });

  if (c + 1 < cols) {
    add(1, 0);
  }

  if (c === 0) {
    add(cols - 1, 0);
  }

  if (!hasBelow) {
    return moves;
  }

  if (c > 0) {
    add(cols - 1, 1);
  } else if (cols === 2) {
    add(cols + 1, 1);
  } else {
    moves.push({ bit: wrapBit, diagonal: 1 });
  }

  add(cols, 0);
  add(c + 1 < cols ? cols + 1 : 1, 1);

  return moves;
}

/**
 * Counts the domicule tilings of a cylinder or a torus by the number of diagonal pieces modulo a
 * prime, cell by cell, with the states of any-lattice-cylinder-torus-modular.js and a block of
 * coefficients per state: entry k is the coefficient of x^k. Before cell p at most p pieces are
 * placed, so only the coefficients up to x^p are visited. A torus runs the smallest rotation of
 * every start set S, weighted by the number of its rotations.
 * @param {Object} board The board and the prime.
 * @returns {number[]} The coefficients modulo the prime, from x^0 to x^(rows * cols / 2).
 */
function countModulo({ rows, cols, torus, prime }) {
  const degree = Math.floor((rows * cols) / 2);
  const width = degree + 1;
  const windowBits = cols + 2;
  const windowMask = 2 ** windowBits - 1;
  const wrapBit = 2 ** windowBits;
  const usesWrapBit = cols >= 3;
  const stateCount = 2 ** (windowBits + (usesWrapBit ? 1 : 0));
  const topBit = 2 ** (windowBits - 1);
  const movesBelow = Array.from({ length: cols }, (_, c) => listMoves(cols, c, true, wrapBit));
  const movesLast = Array.from({ length: cols }, (_, c) => listMoves(cols, c, torus, wrapBit));
  let current = new Uint32Array(stateCount * width);
  let next = new Uint32Array(stateCount * width);
  let reached = new Uint8Array(stateCount);
  let nextReached = new Uint8Array(stateCount);

  const shift = (state, c) => {
    const window = (state & windowMask) >>> 1;

    if (!usesWrapBit) {
      return window;
    }

    if (c === cols - 3) {
      return window | (state & wrapBit ? topBit : 0);
    }

    return window | (state & wrapBit);
  };

  const run = start => {
    current.fill(0);
    reached.fill(0);
    current[start * width] = 1 % prime;
    reached[start] = 1;

    for (let cell = 0; cell < rows * cols; cell++) {
      const c = cell % cols;
      const moves = cell < (rows - 1) * cols ? movesBelow[c] : movesLast[c];
      const placed = Math.min(degree, cell);

      next.fill(0);
      nextReached.fill(0);

      const add = (source, target, diagonal) => {
        const from = source * width;
        const to = target * width + diagonal;
        nextReached[target] = 1;

        for (let k = 0; k <= placed && k + diagonal < width; k++) {
          const count = current[from + k];

          if (count !== 0) {
            const sum = next[to + k] + count;
            next[to + k] = sum >= prime ? sum - prime : sum;
          }
        }
      };

      for (let state = 0; state < stateCount; state++) {
        if (!reached[state]) {
          continue;
        }

        if (state & 1) {
          add(state, shift(state, c), 0);
          continue;
        }

        for (let i = 0; i < moves.length; i++) {
          const { bit, diagonal } = moves[i];

          if (!(state & bit)) {
            add(state, shift(state + bit, c), diagonal);
          }
        }
      }

      [current, next] = [next, current];
      [reached, nextReached] = [nextReached, reached];
    }

    return Array.from(current.subarray(start * width, (start + 1) * width));
  };

  if (!torus) {
    return rows === 0 ? [1 % prime] : run(0);
  }

  const rotate = set => ((set << 1) | (set >>> (cols - 1))) & (2 ** cols - 1);
  const total = new Array(width).fill(0);

  for (let start = 0; start < 2 ** cols; start++) {
    let weight = 1;
    let rotation = rotate(start);

    while (rotation !== start && rotation > start) {
      weight++;
      rotation = rotate(rotation);
    }

    if (rotation !== start) {
      continue;
    }

    run(start).forEach((count, k) => {
      total[k] = (total[k] + weight * count) % prime;
    });
  }

  return total;
}

/**
 * Bounds log2 of the number of tilings as calculateLog2Bound of any-lattice-cylinder-torus-modular.js
 * does on the king's graph: every piece is one of the at most m moves of its cell, so a cylinder
 * has at most m^(N/2) tilings and a torus, with its 2^cols start sets, at most 2^cols m^(N/2).
 * @param {Object} board The board.
 * @returns {number} The bound.
 */
function calculateLog2Bound({ rows, cols, torus }) {
  const wrapBit = 2 ** (cols + 2);
  const most = Math.max(...Array.from({ length: cols }, (_, c) => listMoves(cols, c, rows > 1 || torus, wrapBit).length));

  return ((rows * cols) / 2) * Math.log2(most) + (torus ? cols : 0);
}

/**
 * Caps the number of worker threads so that their tables fit in half the memory: each keeps two
 * Uint32Array tables of a whole polynomial per state and two Uint8Array tables of reached states.
 * @param {number} jobs The number of threads asked for.
 * @param {number} cols The circumference.
 * @param {number} degree The largest number of pieces, rows * cols / 2.
 * @param {number} [memory] The memory of the machine in bytes.
 * @returns {number} The number of threads to run, at least 1.
 */
function capThreads(jobs, cols, degree, memory = os.totalmem()) {
  const bytesPerWorker = 2 ** (cols + (cols >= 3 ? 3 : 2)) * (2 * 4 * (degree + 1) + 2);

  return Math.max(1, Math.min(jobs, Math.floor(memory / 2 / bytesPerWorker)));
}

/**
 * Counts the tilings by the number of diagonal pieces exactly: every coefficient is at most the
 * number of tilings, so the bound of any-lattice-cylinder-torus-modular.js on the king's graph
 * sets the number of primes, and one more prime checks every coefficient. A torus is counted with
 * its shorter side as the circumference.
 * @param {Object} options The board and the number of worker threads.
 * @returns {Promise<BigInt[]>} The coefficients, from x^0 to x^(rowCount * colCount / 2).
 */
async function calculateDiagonalPolynomial({ rowCount, colCount, torus = false, jobs = os.availableParallelism() }) {
  if (!isValidBoard({ rowCount, colCount }, torus)) {
    throw new Error('The circumference must be at least 2, and a torus needs at least 2 rows unless the board has no cells.');
  }

  if (rowCount * colCount === 0) {
    return [BigInt(1)];
  }

  const transpose = torus && rowCount < colCount;
  const rows = transpose ? colCount : rowCount;
  const cols = transpose ? rowCount : colCount;
  const degree = Math.floor((rows * cols) / 2);

  if ((rows * cols) % 2 === 1) {
    return new Array(degree + 1).fill(BigInt(0));
  }

  const primeCount = Math.ceil((calculateLog2Bound({ rows, cols, torus }) + 1) / 30) + 1;
  const primes = listPrimes(primeCount);
  const residues = await runWorkers(__filename, primes.map(prime => ({ rows, cols, torus, prime })), capThreads(jobs, cols, degree));

  return Array.from({ length: degree + 1 }, (_, k) =>
    combineCheckedResidues(
      residues.map(coefficients => coefficients[k]),
      primes,
    ),
  );
}

function isValidBoard({ rowCount, colCount }, torus) {
  if (!Number.isInteger(rowCount) || !Number.isInteger(colCount) || rowCount < 0 || colCount < 0) {
    return false;
  }

  return rowCount * colCount === 0 || (colCount >= 2 && (!torus || rowCount >= 2));
}

async function __main__() {
  const argv = process.argv.slice(2);
  const options = parseArgs(argv, { '-r': 'rowCount', '-c': 'colCount', '-j': 'jobs' });
  const torus = argv.includes('--torus');
  const jobs = options.jobs ?? os.availableParallelism();

  if (!isValidBoard(options, torus) || !(jobs > 0)) {
    console.error(
      'Usage: node js/solvers/domicule-cylinder-torus-polynomial-modular.js -r <rowCount> -c <circumference> [--torus] [-j <jobs>]\n' +
        'The circumference is at least 2, and a torus has at least 2 rows, unless the board has no cells.',
    );
    process.exit(1);
  }

  const circumference = Math.min(options.colCount, torus ? options.rowCount : Infinity);

  if (circumference > MAX_CIRCUMFERENCE) {
    console.error(
      `The circumference can be at most ${MAX_CIRCUMFERENCE}, because every worker thread keeps the polynomial of every one of 2^(circumference + 3) states in memory (-j sets the number of threads).`,
    );
    process.exit(1);
  }

  const threads = capThreads(jobs, circumference, Math.floor((options.rowCount * options.colCount) / 2));

  if (threads < jobs) {
    console.error(`Running ${threads} worker threads instead of ${jobs}, so that their tables fit in half the memory.`);
  }

  const stopTimer = startTimer(argv);
  const coefficients = await calculateDiagonalPolynomial({ ...options, torus, jobs });
  stopTimer();
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

module.exports = { calculateDiagonalPolynomial, countModulo, capThreads, MAX_CIRCUMFERENCE };
