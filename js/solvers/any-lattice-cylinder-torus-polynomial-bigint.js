const { parseArgs, hasUnusableArgument, startTimer } = require('../core');
const { LATTICES } = require('./any-lattice-cylinder-torus-bigint.js');

const MAX_CIRCUMFERENCE = 20;

/**
 * Lists the row transitions of a cylinder on the square lattice, the triangular lattice or the
 * king's graph, as in any-lattice-cylinder-torus-bigint.js, with the number of diagonal pieces each
 * one places: a piece sent from column c to column c + d of the next row is diagonal when d is -1
 * or 1. Columns are taken modulo the circumference, so on a circumference of 2 the two diagonals
 * of a cell on the king's graph are two separate pieces.
 * @param {number} cols The circumference.
 * @param {string} lattice One of square, triangular, king.
 * @returns {Array<Array<{ next: number, diagonals: number }>>} For every row state, its transitions.
 */
function listRowTransitions(cols, lattice) {
  const shifts = LATTICES[lattice];

  return Array.from({ length: 2 ** cols }, (_, covered) => {
    const transitions = [];
    const fill = (c, filled, next, diagonals) => {
      if (c === cols) {
        transitions.push({ next, diagonals });
        return;
      }

      if (filled & (2 ** c)) {
        fill(c + 1, filled, next, diagonals);
        return;
      }

      if (c + 1 < cols && !(filled & (2 ** (c + 1)))) {
        fill(c + 2, filled | (2 ** c) | (2 ** (c + 1)), next, diagonals);
      }

      if (c === 0 && !(filled & (2 ** (cols - 1)))) {
        fill(1, filled | 1 | (2 ** (cols - 1)), next, diagonals);
      }

      shifts.forEach(shift => {
        const target = (c + shift + cols) % cols;

        if (!(next & (2 ** target))) {
          fill(c + 1, filled | (2 ** c), next | (2 ** target), diagonals + (shift === 0 ? 0 : 1));
        }
      });
    };

    fill(0, covered, 0, 0);

    return transitions;
  });
}

/**
 * Counts the tilings of a cylinder (periodic across the width, open at the top and the bottom) or
 * a torus on the square lattice, the triangular lattice or the king's graph by the number of
 * diagonal pieces, row by row, with a polynomial in every
 * state: the coefficient of x^k counts the partial tilings with k diagonal pieces. The torus
 * count is the trace of the h-th power of the row transfer matrix. Rotating the columns maps the
 * runs of a start set S onto the runs of its rotations and keeps every piece diagonal or
 * straight, so only the smallest rotation of each S is run, weighted by the number of its
 * rotations. All three lattices are symmetric under swapping rows and columns, so a torus is
 * counted with its shorter side as the circumference. On the king's graph this is the polynomial
 * of domicule-cylinder-torus-polynomial-bigint.js; at x = 1 it gives the count of
 * any-lattice-cylinder-torus-bigint.js on the same lattice, at x = 0 its count on the square lattice.
 * @param {Object} options The board.
 * @property {number} options.rowCount The number of rows (the height).
 * @property {number} options.colCount The circumference.
 * @property {string} [options.lattice] One of square, triangular, king.
 * @property {boolean} [options.torus] Whether the rows are periodic too.
 * @returns {BigInt[]} The coefficients, from x^0 to x^(rowCount * colCount / 2).
 */
function calculateDiagonalPolynomial({ rowCount, colCount, lattice = 'king', torus = false }) {
  if (!isValidBoard({ rowCount, colCount }, torus) || !Object.hasOwn(LATTICES, lattice)) {
    throw new Error('The circumference must be at least 2, a torus needs at least 2 rows unless the board has no cells, and the lattice is square, triangular or king.');
  }

  if (rowCount * colCount === 0) {
    return [BigInt(1)];
  }

  const transpose = torus && rowCount < colCount;
  const rows = transpose ? colCount : rowCount;
  const cols = transpose ? rowCount : colCount;
  const degree = Math.floor((rows * cols) / 2);
  const zero = () => new Array(degree + 1).fill(BigInt(0));

  if ((rows * cols) % 2 === 1) {
    return zero();
  }

  const transitions = listRowTransitions(cols, lattice);
  const advance = vector => {
    const next = new Map();

    vector.forEach((polynomial, state) =>
      transitions[state].forEach(({ next: target, diagonals }) => {
        if (!next.has(target)) {
          next.set(target, zero());
        }

        const sum = next.get(target);

        for (let k = 0; k + diagonals <= degree; k++) {
          sum[k + diagonals] += polynomial[k];
        }
      }),
    );

    return next;
  };
  const run = start => {
    const initial = zero();
    initial[0] = BigInt(1);
    let vector = new Map([[start, initial]]);

    for (let row = 0; row < rows; row++) {
      vector = advance(vector);
    }

    return vector.get(start) ?? zero();
  };

  if (!torus) {
    return run(0);
  }

  const rotate = set => ((set << 1) | (set >>> (cols - 1))) & (2 ** cols - 1);
  const total = zero();

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
      total[k] += BigInt(weight) * count;
    });
  }

  return total;
}

function isValidBoard({ rowCount, colCount }, torus) {
  if (!Number.isInteger(rowCount) || !Number.isInteger(colCount) || rowCount < 0 || colCount < 0) {
    return false;
  }

  return rowCount * colCount === 0 || (colCount >= 2 && (!torus || rowCount >= 2));
}

function __main__() {
  const argv = process.argv.slice(2);
  const options = parseArgs(argv, { '-r': 'rowCount', '-c': 'colCount' });
  const torus = argv.includes('--torus');
  const latticeIndex = argv.indexOf('--lattice');
  const lattice = latticeIndex === -1 ? 'king' : argv[latticeIndex + 1];

  if (!isValidBoard(options, torus) || !Object.hasOwn(LATTICES, lattice) || hasUnusableArgument(argv, ['-r', '-c', '--lattice'], ['--torus'])) {
    console.error(
      'Usage: node js/solvers/any-lattice-cylinder-torus-polynomial-bigint.js -r <rowCount> -c <circumference> [--torus] [--lattice king|triangular|square]\n' +
        'The circumference is at least 2, and a torus has at least 2 rows, unless the board has no cells.',
    );
    process.exit(1);
  }

  if (Math.min(options.colCount, torus ? options.rowCount : Infinity) > MAX_CIRCUMFERENCE) {
    console.error(
      `The circumference can be at most ${MAX_CIRCUMFERENCE}; use any-lattice-cylinder-torus-polynomial-modular.js for larger boards.`,
    );
    process.exit(1);
  }

  const stopTimer = startTimer(argv);
  const coefficients = calculateDiagonalPolynomial({ ...options, lattice, torus });
  stopTimer();
  console.log(coefficients.join(','));
}

if (require.main === module) {
  __main__();
}

module.exports = { calculateDiagonalPolynomial, listRowTransitions, MAX_CIRCUMFERENCE };
