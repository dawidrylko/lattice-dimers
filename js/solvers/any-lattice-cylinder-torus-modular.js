const os = require('os');
const { isMainThread, parentPort, workerData } = require('worker_threads');
const { parseArgs, startTimer } = require('../core');
const { listPrimes, combineCheckedResidues, runWorkers } = require('../core/modular');

const MAX_CIRCUMFERENCE = 24;
const LATTICES = {
  square: { downLeft: false, downRight: false },
  triangular: { downLeft: false, downRight: true },
  king: { downLeft: true, downRight: true },
};

/**
 * Lists the moves of a free cell in column c: the later cells it can be matched with, as
 * state bits, and whether the piece crosses the seam between the last and the first column.
 * Bit i of a state is the cell i places ahead in row-major order. A piece from column 0 to
 * the last column of the next row lies 2 cols - 1 places ahead, beyond the cols + 2 bits of
 * the window when cols >= 3, so it is kept in an extra bit (wrapBit) until the window reaches
 * that cell.
 * @param {number} cols The circumference.
 * @param {number} c The column.
 * @param {boolean} hasBelow Whether the cell has a next row.
 * @param {Object} lattice The diagonals of the lattice.
 * @param {number} wrapBit The extra bit.
 * @returns {Array<{ bit: number, crossing: boolean }>} The moves.
 */
function listMoves(cols, c, hasBelow, { downLeft, downRight }, wrapBit) {
  const moves = [];
  const add = (offset, crossing) => moves.push({ bit: 2 ** offset, crossing });

  if (c + 1 < cols) {
    add(1, false);
  }

  if (c === 0) {
    add(cols - 1, true);
  }

  if (!hasBelow) {
    return moves;
  }

  if (downLeft && c > 0) {
    add(cols - 1, false);
  } else if (downLeft && cols === 2) {
    add(cols + 1, true);
  } else if (downLeft) {
    moves.push({ bit: wrapBit, crossing: true });
  }

  add(cols, false);

  if (downRight && c + 1 < cols) {
    add(cols + 1, false);
  } else if (downRight) {
    add(1, true);
  }

  return moves;
}

/**
 * Counts the tilings of a cylinder or a torus modulo a prime, cell by cell. A state has
 * cols + 2 window bits and, on the king's graph with cols >= 3, the extra bit of listMoves,
 * which joins the window at column cols - 3. A cylinder starts and ends with the empty state.
 * A torus is a trace: for every set S of first-row cells covered from the last row, the run
 * starts from S and must end with S. Rotating the columns maps the runs of S onto the runs of
 * its rotations, so only the smallest rotation of each S is run, weighted by the number of
 * its rotations; with the seam sign this needs an even number of rows, which keeps the
 * parity of the pieces crossing a column boundary the same for every boundary.
 * @param {Object} board The board and the prime.
 * @returns {number} The count (or the signed sum) modulo the prime.
 */
function countModulo({ rows, cols, lattice, torus, twisted, prime }) {
  const diagonals = LATTICES[lattice];
  const windowBits = cols + 2;
  const windowMask = 2 ** windowBits - 1;
  const wrapBit = 2 ** windowBits;
  const usesWrapBit = diagonals.downLeft && cols >= 3;
  const stateCount = 2 ** (windowBits + (usesWrapBit ? 1 : 0));
  const topBit = 2 ** (windowBits - 1);
  const movesBelow = Array.from({ length: cols }, (_, c) => listMoves(cols, c, true, diagonals, wrapBit));
  const movesLast = Array.from({ length: cols }, (_, c) => listMoves(cols, c, torus, diagonals, wrapBit));
  let current = new Uint32Array(stateCount);
  let next = new Uint32Array(stateCount);

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

  const add = (target, count, negative) => {
    const sum = next[target] + (negative && count ? prime - count : count);
    next[target] = sum >= prime ? sum - prime : sum;
  };

  const run = start => {
    current.fill(0);
    current[start] = 1 % prime;

    for (let cell = 0; cell < rows * cols; cell++) {
      const c = cell % cols;
      const moves = cell < (rows - 1) * cols ? movesBelow[c] : movesLast[c];

      next.fill(0);

      for (let state = 0; state < stateCount; state++) {
        const count = current[state];

        if (count === 0) {
          continue;
        }

        if (state & 1) {
          add(shift(state, c), count, false);
          continue;
        }

        for (let i = 0; i < moves.length; i++) {
          const { bit, crossing } = moves[i];

          if (!(state & bit)) {
            add(shift(state + bit, c), count, twisted && crossing);
          }
        }
      }

      [current, next] = [next, current];
    }

    return current[start];
  };

  if (!torus) {
    return rows === 0 ? 1 % prime : run(0);
  }

  const rotate = set => ((set << 1) | (set >>> (cols - 1))) & (2 ** cols - 1);
  const reduce = !twisted || rows % 2 === 0;
  let total = 0;

  for (let start = 0; start < 2 ** cols; start++) {
    let weight = 1;

    if (reduce) {
      let rotation = rotate(start);

      while (rotation !== start && rotation > start) {
        weight++;
        rotation = rotate(rotation);
      }

      if (rotation !== start) {
        continue;
      }
    }

    total = (total + weight * run(start)) % prime;
  }

  return total;
}

/**
 * Bounds log2 of the number of tilings: the transfer places every piece from one cell, which
 * picks one of its at most m moves (listMoves), so given the cells covered when the run starts
 * a tiling is a sequence of N/2 such choices. A cylinder starts empty and has at most m^(N/2)
 * tilings; a torus starts from one of the 2^cols sets S, so it has at most 2^cols m^(N/2).
 * @param {Object} board The board.
 * @returns {number} The bound.
 */
function calculateLog2Bound({ rows, cols, lattice, torus }) {
  const wrapBit = 2 ** (cols + 2);
  const most = Math.max(...Array.from({ length: cols }, (_, c) => listMoves(cols, c, rows > 1 || torus, LATTICES[lattice], wrapBit).length));

  return ((rows * cols) / 2) * Math.log2(most) + (torus ? cols : 0);
}

/**
 * Counts the tilings exactly with the Chinese remainder theorem: enough primes for the bound
 * and the sign, plus one more prime that the result is checked against. A torus is counted
 * with its shorter side as the circumference unless the seam sign fixes the orientation.
 * @param {Object} options The board and the number of worker threads.
 * @returns {Promise<BigInt>} The number (or the signed sum) of tilings.
 */
async function calculateTotalTilingCombinations({
  rowCount,
  colCount,
  lattice = 'king',
  torus = false,
  twisted = false,
  jobs = os.availableParallelism(),
}) {
  if (!isValidBoard({ rowCount, colCount }, torus) || !Object.hasOwn(LATTICES, lattice)) {
    throw new Error('The circumference must be at least 2, a torus needs at least 2 rows unless the board has no cells, and the lattice is square, triangular or king.');
  }

  if (rowCount * colCount === 0) {
    return BigInt(1);
  }

  const transpose = torus && !twisted && rowCount < colCount;
  const rows = transpose ? colCount : rowCount;
  const cols = transpose ? rowCount : colCount;

  if ((rows * cols) % 2 === 1) {
    return BigInt(0);
  }

  const board = { rows, cols, lattice, torus, twisted };
  const primeCount = Math.ceil((calculateLog2Bound(board) + 2) / 30) + 1;
  const primes = listPrimes(primeCount);
  const residues = await runWorkers(__filename, primes.map(prime => ({ ...board, prime })), jobs);

  return combineCheckedResidues(residues, primes, twisted);
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
  const latticeIndex = argv.indexOf('--lattice');
  const lattice = latticeIndex === -1 ? 'king' : argv[latticeIndex + 1];
  const torus = argv.includes('--torus');
  const twisted = argv.includes('--twisted');
  const jobs = options.jobs ?? os.availableParallelism();

  if (!isValidBoard(options, torus) || !Object.hasOwn(LATTICES, lattice) || !(jobs > 0)) {
    console.error(
      'Usage: node js/solvers/any-lattice-cylinder-torus-modular.js -r <rowCount> -c <circumference> [--torus] [--twisted] [--lattice king|triangular|square] [-j <jobs>]\n' +
        'The circumference is at least 2, and a torus has at least 2 rows, unless the board has no cells.',
    );
    process.exit(1);
  }

  if (Math.min(options.colCount, torus && !twisted ? options.rowCount : Infinity) > MAX_CIRCUMFERENCE) {
    console.error(`The circumference can be at most ${MAX_CIRCUMFERENCE}, because every worker thread keeps two tables of 2^(circumference + 3) states.`);
    process.exit(1);
  }

  const stopTimer = startTimer(argv);
  const result = await calculateTotalTilingCombinations({ ...options, lattice, torus, twisted, jobs });
  stopTimer();
  console.log(result.toString());
}

if (!isMainThread) {
  parentPort.postMessage(countModulo(workerData));
} else if (require.main === module) {
  __main__().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { calculateTotalTilingCombinations, countModulo, calculateLog2Bound, LATTICES };
