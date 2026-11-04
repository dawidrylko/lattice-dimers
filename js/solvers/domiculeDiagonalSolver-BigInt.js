const { parseArgs } = require('../core');

const MAX_SHORTER_SIDE = 12;

/**
 * Counts the domicule tilings of a board by the number of diagonal pieces, the pieces that
 * join two cells sharing only a corner. The transfer is the one of
 * domiculeTilingSolver-BigInt.js, with a polynomial instead of a number in every state:
 * the coefficient of x^k counts the partial tilings with k diagonal pieces, and a piece to
 * the down-left or down-right neighbour multiplies by x. At x = 1 the polynomial gives
 * A239264, at x = 0 the domino tilings (A099390).
 * @param {number} rowCount The number of rows.
 * @param {number} colCount The number of columns.
 * @returns {BigInt[]} The coefficients, from x^0 to x^(rowCount * colCount / 2).
 */
function calculateDiagonalPolynomial({ rowCount, colCount }) {
  const rows = Math.max(rowCount, colCount);
  const cols = Math.min(rowCount, colCount);
  const degree = Math.floor((rows * cols) / 2);
  const stateCount = 2 ** (cols + 2);
  const zero = () => new Array(degree + 1).fill(BigInt(0));
  let current = Array.from({ length: stateCount }, () => null);
  current[0] = zero();
  current[0][0] = BigInt(1);

  for (let cell = 0; cell < rows * cols; cell++) {
    const rowIndex = Math.floor(cell / cols);
    const colIndex = cell % cols;
    const hasRight = colIndex + 1 < cols;
    const hasBelow = rowIndex + 1 < rows;
    const moves = [
      ...(hasRight ? [{ offset: 1, diagonal: 0 }] : []),
      ...(hasBelow && colIndex > 0 ? [{ offset: cols - 1, diagonal: 1 }] : []),
      ...(hasBelow ? [{ offset: cols, diagonal: 0 }] : []),
      ...(hasBelow && hasRight ? [{ offset: cols + 1, diagonal: 1 }] : []),
    ];
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
  const argsSchema = { '-r': 'rowCount', '-c': 'colCount' };
  const options = parseArgs(process.argv.slice(2), argsSchema);

  if (!isValidSize(options.rowCount) || !isValidSize(options.colCount)) {
    console.error('Usage: node js/solvers/domiculeDiagonalSolver-BigInt.js -r <rowCount> -c <colCount>');
    process.exit(1);
  }

  if (Math.min(options.rowCount, options.colCount) > MAX_SHORTER_SIDE) {
    console.error(
      `The shorter side of the board can be at most ${MAX_SHORTER_SIDE}; use domiculeDiagonalSolver-Modular.js for larger boards.`,
    );
    process.exit(1);
  }

  console.log(calculateDiagonalPolynomial(options).join(','));
}

if (require.main === module) {
  __main__();
}

module.exports = { calculateDiagonalPolynomial };
