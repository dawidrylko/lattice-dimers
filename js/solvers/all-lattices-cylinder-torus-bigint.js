const { parseArgs, startTimer } = require('../core');

const MAX_CIRCUMFERENCE = 12;
const LATTICES = {
  square: [0],
  triangular: [0, 1],
  king: [-1, 0, 1],
};

/**
 * Lists the row transitions of a board that is periodic across its width: for every set of
 * cells of a row already covered from the row below, the ways to cover the rest of the row
 * with horizontal pieces and pieces sent to the next row. A piece from column c goes to
 * column c + d of the next row for every d of the lattice: 0 for the square lattice,
 * 0 and 1 for the triangular lattice (one diagonal), -1, 0 and 1 for the king's graph.
 * Columns are taken modulo the circumference, so a board of circumference 2 has the
 * multiple edges of its graph, each counted as a separate piece.
 * @param {number} cols The circumference.
 * @param {string} lattice One of square, triangular, king.
 * @returns {Array<Array<{ next: number, crossings: number }>>} For every row state, its
 * transitions, with the number of pieces that cross the seam between the last and the first column.
 */
function listRowTransitions(cols, lattice) {
  const shifts = LATTICES[lattice];

  return Array.from({ length: 2 ** cols }, (_, covered) => {
    const transitions = [];
    const fill = (c, filled, next, crossings) => {
      if (c === cols) {
        transitions.push({ next, crossings });
        return;
      }

      if (filled & (2 ** c)) {
        fill(c + 1, filled, next, crossings);
        return;
      }

      if (c + 1 < cols && !(filled & (2 ** (c + 1)))) {
        fill(c + 2, filled | (2 ** c) | (2 ** (c + 1)), next, crossings);
      }

      if (c === 0 && !(filled & (2 ** (cols - 1)))) {
        fill(1, filled | 1 | (2 ** (cols - 1)), next, crossings + 1);
      }

      shifts.forEach(shift => {
        const target = (c + shift + cols) % cols;

        if (!(next & (2 ** target))) {
          fill(c + 1, filled | (2 ** c), next | (2 ** target), crossings + (c + shift === target ? 0 : 1));
        }
      });
    };

    fill(0, covered, 0, 0);

    return transitions;
  });
}

/**
 * Counts the perfect matchings of the square lattice, the triangular lattice or the king's
 * graph on a cylinder (periodic across the width, open at the top and bottom) or a torus,
 * row by row. The torus count is the trace of the h-th power of the row transfer matrix.
 * With `twisted`, every tiling is counted with the sign (-1)^k, where k is the number of
 * pieces that cross the seam between the last and the first column.
 * @param {Object} options The board.
 * @property {number} options.rowCount The number of rows (the height).
 * @property {number} options.colCount The circumference.
 * @property {string} [options.lattice] One of square, triangular, king.
 * @property {boolean} [options.torus] Whether the rows are periodic too.
 * @property {boolean} [options.twisted] Whether to count with the seam sign.
 * @returns {BigInt} The number (or the signed sum) of tilings.
 */
function calculateTotalTilingCombinations({ rowCount, colCount, lattice = 'king', torus = false, twisted = false }) {
  if (!isValidBoard({ rowCount, colCount }, torus) || !Object.hasOwn(LATTICES, lattice)) {
    throw new Error('The circumference must be at least 2, a torus needs at least 2 rows, and the lattice is square, triangular or king.');
  }

  const transitions = listRowTransitions(colCount, lattice);
  const sign = crossings => (twisted && crossings % 2 ? BigInt(-1) : BigInt(1));
  const advance = vector => {
    const next = new Map();

    vector.forEach((count, state) =>
      transitions[state].forEach(({ next: target, crossings }) =>
        next.set(target, (next.get(target) || BigInt(0)) + sign(crossings) * count),
      ),
    );

    return next;
  };
  const run = start => {
    let vector = new Map([[start, BigInt(1)]]);

    for (let row = 0; row < rowCount; row++) {
      vector = advance(vector);
    }

    return vector.get(start) || BigInt(0);
  };

  if (!torus) {
    return run(0);
  }

  let total = BigInt(0);

  for (let start = 0; start < 2 ** colCount; start++) {
    total += run(start);
  }

  return total;
}

function isValidBoard({ rowCount, colCount }, torus) {
  return Number.isInteger(rowCount) && rowCount >= (torus ? 2 : 0) && Number.isInteger(colCount) && colCount >= 2;
}

function __main__() {
  const argv = process.argv.slice(2);
  const options = parseArgs(argv, { '-r': 'rowCount', '-c': 'colCount' });
  const latticeIndex = argv.indexOf('--lattice');
  const lattice = latticeIndex === -1 ? 'king' : argv[latticeIndex + 1];
  const torus = argv.includes('--torus');
  const twisted = argv.includes('--twisted');

  if (!isValidBoard(options, torus) || !Object.hasOwn(LATTICES, lattice)) {
    console.error(
      'Usage: node js/solvers/all-lattices-cylinder-torus-bigint.js -r <rowCount> -c <circumference> [--torus] [--twisted] [--lattice king|triangular|square]\n' +
        'The circumference is at least 2, and a torus has at least 2 rows.',
    );
    process.exit(1);
  }

  if (options.colCount > MAX_CIRCUMFERENCE) {
    console.error(`The circumference can be at most ${MAX_CIRCUMFERENCE}; use all-lattices-cylinder-torus-modular.js for larger boards.`);
    process.exit(1);
  }

  const stopTimer = startTimer(argv);
  const result = calculateTotalTilingCombinations({ ...options, lattice, torus, twisted });
  stopTimer();
  console.log(result.toString());
}

if (require.main === module) {
  __main__();
}

module.exports = { calculateTotalTilingCombinations, listRowTransitions, LATTICES, MAX_CIRCUMFERENCE };
