const { parseArgs, startTimer } = require('../core');

const MAX_SHORTER_SIDE = 29;
const LATTICES = {
  square: { downLeft: false, downRight: false },
  triangular: { downLeft: false, downRight: true },
  king: { downLeft: true, downRight: true },
};

/**
 * Lists the bits a free cell can cover with its partner, which is always a later cell: right and
 * down on every lattice, down-right on the triangular lattice and the king's graph, down-left on
 * the king's graph only. Bit i stands for the cell i places ahead in row-major order.
 * @param {number} cols The number of columns.
 * @param {number} colIndex The column of the cell.
 * @param {boolean} hasBelow Whether the cell has a row below it.
 * @param {string} lattice One of square, triangular, king.
 * @returns {number[]} The offsets of the cells the partner may be.
 */
function listOffsets(cols, colIndex, hasBelow, lattice) {
  const { downLeft, downRight } = LATTICES[lattice];
  const hasRight = colIndex + 1 < cols;

  return [
    ...(hasRight ? [1] : []),
    ...(downLeft && hasBelow && colIndex > 0 ? [cols - 1] : []),
    ...(hasBelow ? [cols] : []),
    ...(downRight && hasBelow && hasRight ? [cols + 1] : []),
  ];
}

/**
 * Counts the perfect matchings of a rectangle on the square lattice, the triangular lattice
 * (one diagonal in every cell, the one that runs down to the right) or the king's graph.
 * The cells are processed one by one in row-major order (the broken-profile method).
 * Bit i of a state tells whether the cell i places ahead of the current one is already
 * covered. The farthest cell a state has to remember is colCount + 1 places ahead, so a state
 * has colCount + 2 bits. All three lattices are symmetric under swapping rows and columns, so
 * the shorter side is taken as the width.
 * @param {Object} board The board.
 * @param {number} board.rowCount The number of rows.
 * @param {number} board.colCount The number of columns.
 * @param {string} [board.lattice] One of square, triangular, king.
 * @returns {BigInt} The number of tilings.
 */
function calculateTotalTilingCombinations({ rowCount, colCount, lattice = 'king' }) {
  const rows = Math.max(rowCount, colCount);
  const cols = Math.min(rowCount, colCount);
  const stateCount = 2 ** (cols + 2);
  let current = new Array(stateCount).fill(BigInt(0));
  current[0] = BigInt(1);

  for (let cell = 0; cell < rows * cols; cell++) {
    const offsets = listOffsets(cols, cell % cols, Math.floor(cell / cols) + 1 < rows, lattice);
    const next = new Array(stateCount).fill(BigInt(0));

    current.forEach((count, state) => {
      if (count === BigInt(0)) {
        return;
      }

      if (state & 1) {
        next[state >>> 1] += count;
        return;
      }

      offsets
        .filter(offset => !(state & (2 ** offset)))
        .forEach(offset => (next[(state + 2 ** offset) >>> 1] += count));
    });

    current = next;
  }

  return current[0];
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
      'Usage: node js/solvers/any-lattice-rectangle-bigint.js -r <rowCount> -c <colCount> [--lattice king|triangular|square]',
    );
    process.exit(1);
  }

  if (Math.min(options.rowCount, options.colCount) > MAX_SHORTER_SIDE) {
    console.error(
      `The shorter side of the board can be at most ${MAX_SHORTER_SIDE}, because a JavaScript array holds fewer than 2^32 states.`,
    );
    process.exit(1);
  }

  const stopTimer = startTimer(argv);
  const result = calculateTotalTilingCombinations({ ...options, lattice });
  stopTimer();
  console.log(result.toString());
}

if (require.main === module) {
  __main__();
}

module.exports = { calculateTotalTilingCombinations, listOffsets, LATTICES };
