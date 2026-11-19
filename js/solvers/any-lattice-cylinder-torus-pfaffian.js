const os = require('os');
const { isMainThread, parentPort, workerData } = require('worker_threads');
const { parseArgs, startTimer } = require('../core');
const { listPrimes, combineCheckedResidues, runWorkers } = require('../core/modular');
const { pfaffianModulo, PFAFFIAN_PRIME_BOUND } = require('../core/pfaffian');

const MAX_CELLS = 1600;
const PRIME_BITS = 25;
const LATTICES = {
  square: [
    [1, 0],
    [0, 1],
  ],
  triangular: [
    [1, 0],
    [0, 1],
    [1, 1],
  ],
};
const NOT_PLANAR = "The king's graph is not planar, so a Pfaffian does not count its tilings. Pass --lattice square or --lattice triangular.";

/**
 * Numbers the cells so that the elimination of pfaffianModulo stays narrow. The cells of one line
 * along the shorter side are numbered together, so a piece joins lines that are close in the
 * numbering. Where the lines go around a seam, the last one is next to the first: they are then
 * taken from both ends in turn, 0, n - 1, 1, n - 2 and so on.
 * @param {number} rows The number of rows.
 * @param {number} cols The circumference.
 * @param {boolean} torus Whether the rows go around a seam.
 * @returns {(x: number, y: number) => number} The number of the cell in row x and column y.
 */
function numberCells(rows, cols, torus) {
  const fold = (line, count) => (2 * line < count ? 2 * line : 2 * (count - 1 - line) + 1);

  if (cols > rows) {
    return (x, y) => fold(y, cols) * rows + x;
  }

  return torus ? (x, y) => fold(x, rows) * cols + y : (x, y) => x * cols + y;
}

/**
 * Writes the entries above the diagonal of the Kasteleyn matrix of the board modulo a prime. The
 * cell in row x and column y has an edge to the cells at (x + 1, y) and (x, y + 1) and, on the
 * triangular lattice, (x + 1, y + 1). The entry of an edge is -1 for the first two steps out of a
 * cell whose alternating coordinate is even and 1 otherwise, and its negative in the other
 * direction: the orientation of oeis/A401988/A401988.gp, in which every face has an odd number of
 * edges pointing one way around it. The alternating coordinate is the row when the number of
 * rows is even and the column otherwise, so the pattern of period 2 closes across a seam. An edge
 * across the row seam changes sign with flipRows and one across the column seam with
 * flipColumns. Two edges between the same cells, on a circumference of 2 or a torus of 2 rows,
 * add.
 * @param {Object} board The board, the two signs and the prime.
 * @param {Float64Array} matrix The matrix to fill, row by row.
 */
function fillMatrix({ rows, cols, lattice, torus, flipRows, flipColumns, prime }, matrix) {
  const size = rows * cols;
  const alternatesByRow = rows % 2 === 0;
  const numberOf = numberCells(rows, cols, torus);

  matrix.fill(0);

  for (let x = 0; x < rows; x++) {
    for (let y = 0; y < cols; y++) {
      const even = (alternatesByRow ? x : y) % 2 === 0;

      for (const [dx, dy] of LATTICES[lattice]) {
        if (x + dx >= rows && !torus) {
          continue;
        }

        const from = numberOf(x, y);
        const to = numberOf((x + dx) % rows, (y + dy) % cols);
        const signs = [even && dx + dy === 1, flipRows && x + dx >= rows, flipColumns && y + dy >= cols, from > to];
        const negative = signs.filter(Boolean).length % 2 === 1;
        const cell = Math.min(from, to) * size + Math.max(from, to);

        matrix[cell] = (matrix[cell] + (negative ? prime - 1 : 1)) % prime;
      }
    }
  }
}

/**
 * Counts modulo a prime. A cylinder is planar, and one of its two Pfaffians, with and without
 * the sign on the column seam, is plus or minus the number of tilings; the other is plus or
 * minus the difference between the tilings with an even and an odd number of pieces across the
 * seam, so the larger absolute value is the count. A torus has four Pfaffians, one per pair of
 * signs on its two seams. With S their sum, each (S - 2 p) / 2 is plus or minus a sum of the
 * four numbers of tilings by the parities of the pieces across the two seams, each with a sign,
 * and for one Pfaffian p all four signs agree, so the largest absolute value is the count.
 * @param {Object} board The board and the prime.
 * @param {Float64Array} [matrix] A matrix of cells x cells entries to work in.
 * @returns {number[]} The two Pfaffians of a cylinder or the four values of a torus, modulo the prime.
 */
function countModulo(board, matrix = new Float64Array((board.rows * board.cols) ** 2)) {
  const { rows, cols, torus, prime } = board;
  const pfaffian = (flipRows, flipColumns) => {
    fillMatrix({ ...board, flipRows, flipColumns }, matrix);

    return pfaffianModulo(matrix, rows * cols, prime);
  };

  if (!torus) {
    return [pfaffian(false, false), pfaffian(false, true)];
  }

  const pfaffians = [pfaffian(false, false), pfaffian(true, false), pfaffian(false, true), pfaffian(true, true)];
  const sum = pfaffians.reduce((total, value) => total + value, 0);
  const half = (prime + 1) / 2;

  return pfaffians.map(value => (((sum + 2 * (prime - value)) % prime) * half) % prime);
}

/**
 * Bounds log2 of the number of tilings, as the Modular twin does: its transfer places every
 * piece from one cell, which picks one of at most m moves, so a cylinder of N cells has at most
 * m^(N/2) tilings. The moves are right, left across the seam, down and on the triangular lattice
 * down to the right: m is 3 on the square lattice, 4 on the triangular one and 2 on a cylinder
 * of one row, which has no move down. A torus also picks the cells of its first row that are
 * covered from the last one, and its rows and columns can be swapped, so it has at most
 * 2^side m^(N/2) with its shorter side.
 * @param {Object} board The board.
 * @returns {number} The bound.
 */
function calculateLog2Bound({ rows, cols, lattice, torus }) {
  const below = rows === 1 && !torus ? 0 : LATTICES[lattice].length - 1;

  return ((rows * cols) / 2) * Math.log2(2 + below) + (torus ? Math.min(rows, cols) : 0);
}

/**
 * Counts the tilings exactly with the Chinese remainder theorem: enough primes for the bound and
 * the sign of every value of countModulo, plus one more prime that each value is checked
 * against. The primes are dealt to at most `jobs` worker threads, and a thread works through its
 * primes in one matrix.
 * @param {Object} options The board and the number of worker threads.
 * @returns {Promise<BigInt>} The number of tilings.
 */
async function calculateTotalTilingCombinations({ rowCount, colCount, lattice, torus = false, jobs = os.availableParallelism() }) {
  if (lattice === 'king') {
    throw new Error(NOT_PLANAR);
  }

  if (!isValidBoard({ rowCount, colCount }, torus) || !Object.hasOwn(LATTICES, lattice)) {
    throw new Error('The circumference must be at least 2, a torus needs at least 2 rows unless the board has no cells, and the lattice is square or triangular.');
  }

  if (rowCount * colCount === 0) {
    return BigInt(1);
  }

  if ((rowCount * colCount) % 2 === 1) {
    return BigInt(0);
  }

  const board = { rows: rowCount, cols: colCount, lattice, torus };
  const primeCount = Math.ceil((calculateLog2Bound(board) + 2) / PRIME_BITS) + 1;
  const primes = listPrimes(primeCount, PFAFFIAN_PRIME_BOUND);
  const threads = Math.min(jobs, primes.length);
  const shares = Array.from({ length: threads }, (_, thread) => primes.filter((_, index) => index % threads === thread));
  const results = await runWorkers(__filename, shares.map(share => ({ ...board, primes: share })), threads);
  const residues = primes.map((_, index) => results[index % threads][Math.floor(index / threads)]);
  const values = residues[0].map((_, index) => combineCheckedResidues(residues.map(row => row[index]), primes, true));

  return values.map(value => (value < 0 ? -value : value)).reduce((largest, value) => (value > largest ? value : largest));
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
  const jobs = options.jobs ?? os.availableParallelism();

  if (!isValidBoard(options, torus) || !(lattice === 'king' || Object.hasOwn(LATTICES, lattice)) || !(jobs > 0) || argv.includes('--twisted')) {
    console.error(
      'Usage: node js/solvers/any-lattice-cylinder-torus-pfaffian.js -r <rowCount> -c <circumference> --lattice square|triangular [--torus] [-j <jobs>]\n' +
        'The circumference is at least 2, and a torus has at least 2 rows, unless the board has no cells.',
    );
    process.exit(1);
  }

  if (lattice === 'king') {
    console.error(NOT_PLANAR);
    process.exit(1);
  }

  if (options.rowCount * options.colCount > MAX_CELLS) {
    console.error(`The board can have at most ${MAX_CELLS} cells, because every worker thread keeps a matrix of cells x cells entries.`);
    process.exit(1);
  }

  const stopTimer = startTimer(argv);
  const result = await calculateTotalTilingCombinations({ ...options, lattice, torus, jobs });
  stopTimer();
  console.log(result.toString());
}

if (!isMainThread) {
  const matrix = new Float64Array((workerData.rows * workerData.cols) ** 2);

  parentPort.postMessage(workerData.primes.map(prime => countModulo({ ...workerData, prime }, matrix)));
} else if (require.main === module) {
  __main__().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { calculateTotalTilingCombinations, countModulo, calculateLog2Bound, LATTICES };
