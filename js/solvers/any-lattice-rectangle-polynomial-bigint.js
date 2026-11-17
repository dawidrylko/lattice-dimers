const { parseArgs, startTimer } = require('../core');
const { LATTICES } = require('./any-lattice-rectangle-bigint.js');

const MAX_SHORTER_SIDE = 20;

/**
 * Lists the moves of a free cell, as listOffsets of any-lattice-rectangle-bigint.js does, with
 * whether the piece is diagonal: right and down on every lattice, down-right on the triangular
 * lattice and the king's graph, down-left on the king's graph only. On two columns the down-left
 * neighbour is the next cell, as the right neighbour is, so the flag is kept with the move
 * rather than read from the offset.
 * @param {number} cols The number of columns.
 * @param {number} colIndex The column of the cell.
 * @param {boolean} hasBelow Whether the cell has a row below it.
 * @param {string} lattice One of square, triangular, king.
 * @returns {Array<{ offset: number, diagonal: number }>} The moves.
 */
function listMoves(cols, colIndex, hasBelow, lattice) {
  const { downLeft, downRight } = LATTICES[lattice];
  const hasRight = colIndex + 1 < cols;

  return [
    ...(hasRight ? [{ offset: 1, diagonal: 0 }] : []),
    ...(downLeft && hasBelow && colIndex > 0 ? [{ offset: cols - 1, diagonal: 1 }] : []),
    ...(hasBelow ? [{ offset: cols, diagonal: 0 }] : []),
    ...(downRight && hasBelow && hasRight ? [{ offset: cols + 1, diagonal: 1 }] : []),
  ];
}

/**
 * Counts the tilings of a rectangle on the square lattice, the triangular lattice or the king's
 * graph by the number of diagonal pieces. The transfer is the one of any-lattice-rectangle-bigint.js,
 * with a polynomial instead of a number in every state: the coefficient of x^k counts the partial
 * tilings with k diagonal pieces, and a piece to a diagonal neighbour multiplies by x. On the
 * king's graph this is the polynomial of domicule-rectangle-polynomial-bigint.js; at x = 1 it
 * gives the count of any-lattice-rectangle-bigint.js on the same lattice, at x = 0 the domino
 * tilings (A099390). All three lattices are symmetric under swapping rows and columns, so the
 * shorter side is taken as the width.
 * @param {Object} board The board.
 * @param {number} board.rowCount The number of rows.
 * @param {number} board.colCount The number of columns.
 * @param {string} [board.lattice] One of square, triangular, king.
 * @returns {BigInt[]} The coefficients, from x^0 to x^(rowCount * colCount / 2).
 */
function calculateDiagonalPolynomial({ rowCount, colCount, lattice = 'king' }) {
  if (!Object.hasOwn(LATTICES, lattice)) {
    throw new Error(`The lattice is square, triangular or king, not ${lattice}.`);
  }

  const rows = Math.max(rowCount, colCount);
  const cols = Math.min(rowCount, colCount);
  const degree = Math.floor((rows * cols) / 2);
  const stateCount = 2 ** (cols + 1);
  const zero = () => new Array(degree + 1).fill(BigInt(0));
  let current = Array.from({ length: stateCount }, () => null);
  current[0] = zero();
  current[0][0] = BigInt(1);

  for (let cell = 0; cell < rows * cols; cell++) {
    const moves = listMoves(cols, cell % cols, Math.floor(cell / cols) + 1 < rows, lattice);
    const next = Array.from({ length: stateCount }, () => null);
    const add = (target, polynomial, diagonal) => {
      next[target] ??= zero();

      for (let k = 0; k + diagonal <= degree; k++) {
        next[target][k + diagonal] += polynomial[k];
      }
    };

    current.forEach((polynomial, state) => {
      if (polynomial === null) {
        return;
      }

      if (state & 1) {
        add(state >>> 1, polynomial, 0);
        return;
      }

      moves
        .filter(({ offset }) => !(state & (2 ** offset)))
        .forEach(({ offset, diagonal }) => add((state + 2 ** offset) >>> 1, polynomial, diagonal));
    });

    current = next;
  }

  return current[0] ?? zero();
}

function isValidSize(size) {
  return Number.isInteger(size) && size >= 0;
}

function __main__() {
  const argv = process.argv.slice(2);
  const options = parseArgs(argv, { '-r': 'rowCount', '-c': 'colCount' });
  const latticeIndex = argv.indexOf('--lattice');
  const lattice = latticeIndex === -1 ? 'king' : argv[latticeIndex + 1];

  if (!isValidSize(options.rowCount) || !isValidSize(options.colCount) || !Object.hasOwn(LATTICES, lattice)) {
    console.error(
      'Usage: node js/solvers/any-lattice-rectangle-polynomial-bigint.js -r <rowCount> -c <colCount> [--lattice king|triangular|square]',
    );
    process.exit(1);
  }

  if (Math.min(options.rowCount, options.colCount) > MAX_SHORTER_SIDE) {
    console.error(
      `The shorter side of the board can be at most ${MAX_SHORTER_SIDE}; use any-lattice-rectangle-polynomial-modular.js for larger boards.`,
    );
    process.exit(1);
  }

  const stopTimer = startTimer(argv);
  const coefficients = calculateDiagonalPolynomial({ ...options, lattice });
  stopTimer();
  console.log(coefficients.join(','));
}

if (require.main === module) {
  __main__();
}

module.exports = { calculateDiagonalPolynomial, listMoves, MAX_SHORTER_SIDE };
