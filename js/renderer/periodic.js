const MAX_PERIODIC_TABLE_SIZE = 1000000;
const PERIODIC_CACHED_TABLES = 2;
const PERIODIC_LATTICES = {
  square: { downLeft: false, downRight: false },
  triangular: { downLeft: false, downRight: true },
  king: { downLeft: true, downRight: true },
};

/**
 * Lists the moves of a free cell in column c, in the order of periodicTilingSolver-Modular.js:
 * the state bit of the cell it is matched with, and the piece as drawn. A piece that crosses
 * the seam keeps its partner outside the board (column -1 or colCount, row rowCount on a torus),
 * and the horizontal piece across the seam is anchored in the last column.
 * @param {number} colCount The circumference.
 * @param {number} col The column.
 * @param {boolean} hasBelow Whether the cell has a next row.
 * @param {Object} lattice The diagonals of the lattice.
 * @param {number} wrapBit The extra bit for the piece from column 0 to the last column of the next row.
 * @returns {Array<{ bit: number, col: number, dr: number, dc: number }>} The moves.
 */
function listPeriodicMoves(colCount, col, hasBelow, { downLeft, downRight }, wrapBit) {
  const moves = [];
  const add = (offset, anchor, dr, dc) => moves.push({ bit: 2 ** offset, col: anchor, dr, dc });

  if (col + 1 < colCount) {
    add(1, col, 0, 1);
  }

  if (col === 0) {
    add(colCount - 1, colCount - 1, 0, 1);
  }

  if (!hasBelow) {
    return moves;
  }

  if (downLeft && col > 0) {
    add(colCount - 1, col, 1, -1);
  } else if (downLeft && colCount === 2) {
    add(colCount + 1, col, 1, -1);
  } else if (downLeft) {
    moves.push({ bit: wrapBit, col, dr: 1, dc: -1 });
  }

  add(colCount, col, 1, 0);

  if (downRight && col + 1 < colCount) {
    add(colCount + 1, col, 1, 1);
  } else if (downRight) {
    add(1, col, 1, 1);
  }

  return moves;
}

function createPeriodicScan(rowCount, colCount, lattice, torus) {
  const diagonals = PERIODIC_LATTICES[lattice];
  const windowBits = colCount + 2;
  const windowMask = 2 ** windowBits - 1;
  const wrapBit = 2 ** windowBits;
  const usesWrapBit = diagonals.downLeft && colCount >= 3;
  const topBit = 2 ** (windowBits - 1);
  const cellCount = rowCount * colCount;

  return {
    rowCount,
    colCount,
    cellCount,
    stateCount: 2 ** (windowBits + (usesWrapBit ? 1 : 0)),
    moves: Array.from({ length: cellCount }, (_, index) =>
      listPeriodicMoves(colCount, index % colCount, torus || index < cellCount - colCount, diagonals, wrapBit),
    ),
    shift: (state, col) => {
      const window = (state & windowMask) >>> 1;

      if (!usesWrapBit) {
        return window;
      }

      return window | (col === colCount - 3 ? (state & wrapBit ? topBit : 0) : state & wrapBit);
    },
  };
}

function buildPeriodicTable({ cellCount, colCount, stateCount, moves, shift }, start, keepRows) {
  const zero = BigInt(0);
  let next = new Array(stateCount).fill(zero);
  const table = keepRows ? new Array(cellCount + 1) : null;

  next[start] = BigInt(1);

  if (table) {
    table[cellCount] = next;
  }

  for (let index = cellCount - 1; index >= 0; index--) {
    const col = index % colCount;
    const cellMoves = moves[index];
    const current = new Array(stateCount);

    for (let state = 0; state < stateCount; state++) {
      if (state & 1) {
        current[state] = next[shift(state, col)];
        continue;
      }

      let sum = zero;

      for (let i = 0; i < cellMoves.length; i++) {
        if (!(state & cellMoves[i].bit)) {
          sum += next[shift(state + cellMoves[i].bit, col)];
        }
      }

      current[state] = sum;
    }

    if (table) {
      table[index] = current;
    }

    next = current;
  }

  return table || next;
}

function isDiagonalMove({ dr, dc }) {
  return dr !== 0 && dc !== 0;
}

function addShifted(counts, following, shift) {
  for (let r = 0; r < following.length; r++) {
    counts[r + shift] = (counts[r + shift] ?? BigInt(0)) + following[r];
  }
}

function buildPeriodicPolynomialTable({ cellCount, colCount, stateCount, moves, shift }, start, keepRows) {
  let next = new Array(stateCount).fill(null);
  const table = keepRows ? new Array(cellCount + 1) : null;

  next[start] = [BigInt(1)];

  if (table) {
    table[cellCount] = next;
  }

  for (let index = cellCount - 1; index >= 0; index--) {
    const col = index % colCount;
    const cellMoves = moves[index];
    const current = new Array(stateCount).fill(null);

    for (let state = 0; state < stateCount; state++) {
      if (state & 1) {
        current[state] = next[shift(state, col)];
        continue;
      }

      let counts = null;

      for (let i = 0; i < cellMoves.length; i++) {
        const following = state & cellMoves[i].bit ? null : next[shift(state + cellMoves[i].bit, col)];

        if (following) {
          counts ??= [];
          addShifted(counts, following, isDiagonalMove(cellMoves[i]) ? 1 : 0);
        }
      }

      current[state] = counts && Array.from(counts, count => count ?? BigInt(0));
    }

    if (table) {
      table[index] = current;
    }

    next = current;
  }

  return table || next;
}

let cachedPolynomials = { key: null, classes: null };

function readClassPolynomials({ rowCount, colCount, lattice, torus }) {
  const key = `${rowCount}x${colCount}-${lattice}-${torus ? 'torus' : 'cylinder'}`;

  if (cachedPolynomials.key !== key) {
    cachedPolynomials = { key, classes: new Map() };
  }

  return cachedPolynomials.classes;
}

function readClassPolynomial(classes, scan, start) {
  if (!classes.has(start)) {
    classes.set(start, buildPeriodicPolynomialTable(scan, start, false)[start] ?? []);
  }

  return classes.get(start);
}

function smallestRotation(set, colCount) {
  const mask = 2 ** colCount - 1;
  let smallest = set;
  let rotation = set;

  for (let i = 1; i < colCount; i++) {
    rotation = ((rotation << 1) | (rotation >>> (colCount - 1))) & mask;
    smallest = Math.min(smallest, rotation);
  }

  return smallest;
}

/**
 * Checks whether the counting table of a cylinder or a torus fits in memory. A state has
 * colCount + 2 window bits and, on the king's graph with colCount >= 3, one more bit.
 * @param {Object} options The board.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The circumference.
 * @property {string} [options.lattice] One of square, triangular, king.
 * @returns {boolean} True if the board can be unranked.
 */
function canUnrankPeriodic({ rowCount, colCount, lattice = 'king' }) {
  const extraBit = PERIODIC_LATTICES[lattice].downLeft && colCount >= 3 ? 1 : 0;

  return (rowCount * colCount + 1) * 2 ** (colCount + 2 + extraBit) <= MAX_PERIODIC_TABLE_SIZE;
}

/**
 * Prepares the numbering of the tilings of a cylinder (periodic across the width) or a torus,
 * scanned cell by cell as in periodicTilingSolver-Modular.js. A torus tiling has one set S of
 * first-row cells covered from the last row; the tilings are ordered by S, and those of one S
 * by the scan. The count of every S is the count of its smallest rotation, so one table per
 * rotation class gives the totals, and the table of an S is rebuilt when a rank needs it.
 * As in the solvers, each edge of a circumference 2 counts as a separate piece.
 * @param {Object} options The board.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The circumference, at least 2.
 * @property {string} [options.lattice] One of square, triangular, king.
 * @property {boolean} [options.torus] Whether the rows are periodic too.
 * @property {number|null} [options.diagonals] Number only the tilings with this many diagonal pieces.
 * @param {function(number): void} [onProgress] Called with the completed fraction after every rotation class.
 * @returns {{ rowCount: number, colCount: number, totals: BigInt[], total: BigInt }} The unranker.
 */
function createPeriodicUnranker({ rowCount, colCount, lattice = 'king', torus = false, diagonals = null }, onProgress) {
  if (!Object.hasOwn(PERIODIC_LATTICES, lattice) || colCount < 2 || rowCount < (torus ? 2 : 1)) {
    throw new RangeError('The circumference must be at least 2 and a torus needs at least 2 rows.');
  }

  const scan = createPeriodicScan(rowCount, colCount, lattice, torus);
  const startCount = torus ? 2 ** colCount : 1;
  const classTotals = new Map();
  const totals = [];
  const polynomials = diagonals === null ? null : readClassPolynomials({ rowCount, colCount, lattice, torus });
  const countClass = start =>
    polynomials === null ? buildPeriodicTable(scan, start, false)[start] : readClassPolynomial(polynomials, scan, start)[diagonals] ?? BigInt(0);

  for (let start = 0; start < startCount; start++) {
    const smallest = smallestRotation(start, colCount);

    if (!classTotals.has(smallest)) {
      classTotals.set(smallest, countClass(smallest));

      if (onProgress) {
        onProgress((start + 1) / startCount);
      }
    }

    totals.push(classTotals.get(smallest));
  }

  return {
    rowCount,
    colCount,
    diagonals,
    scan,
    tables: new Map(),
    totals,
    total: totals.reduce((sum, count) => sum + count, BigInt(0)),
  };
}

/**
 * Counts the domicule tilings of a cylinder or a torus by the number of diagonal pieces, with the
 * scan of createPeriodicUnranker; the coefficients add up to the number of tilings.
 * @param {Object} options The board, as for createPeriodicUnranker.
 * @returns {BigInt[]} The coefficients, from 0 diagonal pieces up.
 */
function countPeriodicDiagonals({ rowCount, colCount, lattice = 'king', torus = false }) {
  const scan = createPeriodicScan(rowCount, colCount, lattice, torus);
  const polynomials = readClassPolynomials({ rowCount, colCount, lattice, torus });
  const startCount = torus ? 2 ** colCount : 1;
  const counts = [];

  for (let start = 0; start < startCount; start++) {
    addShifted(counts, readClassPolynomial(polynomials, scan, smallestRotation(start, colCount)), 0);
  }

  return Array.from(counts, count => count ?? BigInt(0));
}

function readPeriodicTable({ scan, tables, diagonals }, start) {
  if (!tables.has(start)) {
    if (tables.size >= PERIODIC_CACHED_TABLES) {
      tables.delete(tables.keys().next().value);
    }

    tables.set(start, diagonals === null ? buildPeriodicTable(scan, start, true) : buildPeriodicPolynomialTable(scan, start, true));
  }

  return tables.get(start);
}

/**
 * Returns the tiling of a cylinder or a torus with the given 0-based rank. A piece covers the
 * cell (row, col) and the cell (row + dr, col + dc) taken modulo the board.
 * @param {Object} unranker The result of createPeriodicUnranker.
 * @param {BigInt} rank The 0-based rank, lower than unranker.total.
 * @returns {{ row: number, col: number, dr: number, dc: number }[]} The tiling.
 */
function unrankPeriodicTiling(unranker, rank) {
  const { scan, totals, total } = unranker;

  if (rank < BigInt(0) || rank >= total) {
    throw new RangeError(`Rank must be between 0 and ${total - BigInt(1)}.`);
  }

  let remaining = rank;
  let start = 0;

  while (remaining >= totals[start]) {
    remaining -= totals[start];
    start++;
  }

  const table = readPeriodicTable(unranker, start);
  const filtered = unranker.diagonals !== null;
  const pieces = [];
  let left = unranker.diagonals;
  let state = start;

  for (let index = 0; index < scan.cellCount; index++) {
    const col = index % scan.colCount;

    if (state & 1) {
      state = scan.shift(state, col);
      continue;
    }

    const next = table[index + 1];
    const moves = scan.moves[index];

    for (let i = 0; i < moves.length; i++) {
      if (state & moves[i].bit) {
        continue;
      }

      const target = scan.shift(state + moves[i].bit, col);
      const diagonal = isDiagonalMove(moves[i]) ? 1 : 0;
      const count = filtered ? (left >= diagonal ? next[target]?.[left - diagonal] ?? BigInt(0) : BigInt(0)) : next[target];

      if (remaining < count) {
        pieces.push({ row: Math.floor(index / scan.colCount), col: moves[i].col, dr: moves[i].dr, dc: moves[i].dc });
        state = target;
        left -= diagonal;
        break;
      }

      remaining -= count;
    }
  }

  return pieces;
}

if (typeof module !== 'undefined') {
  module.exports = { canUnrankPeriodic, createPeriodicUnranker, unrankPeriodicTiling, countPeriodicDiagonals, PERIODIC_LATTICES };
}
