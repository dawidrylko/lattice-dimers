const MAX_DOMICULE_TABLE_SIZE = 4000000;
const DEFAULT_SWEEPS = 5000;
const SAMPLER_STEPS = {
  king: [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ],
  triangular: [
    [-1, -1],
    [-1, 0],
    [0, -1],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
};

/**
 * Lists the cells a free cell can be matched with, as offsets in row-major order:
 * right, down-left, down and down-right, the order of domicule-rectangle-bigint.js. The
 * triangular lattice has no down-left diagonal, as in any-lattice-rectangle-bigint.js.
 * @param {number} index The cell.
 * @param {number} rowCount The number of rows.
 * @param {number} colCount The number of columns.
 * @param {string} [lattice] 'king' or 'triangular'.
 * @returns {number[]} The offsets.
 */
function listOffsets(index, rowCount, colCount, lattice = 'king') {
  const row = Math.floor(index / colCount);
  const col = index % colCount;
  const hasRight = col + 1 < colCount;
  const hasBelow = row + 1 < rowCount;

  return [
    ...(hasRight ? [1] : []),
    ...(lattice === 'king' && hasBelow && col > 0 ? [colCount - 1] : []),
    ...(hasBelow ? [colCount] : []),
    ...(hasBelow && hasRight ? [colCount + 1] : []),
  ];
}

function toDomicule(index, offset, colCount) {
  const row = Math.floor(index / colCount);
  const col = index % colCount;
  const mate = index + offset;

  return { row, col, dr: Math.floor(mate / colCount) - row, dc: (mate % colCount) - col };
}

function isDiagonalOffset(index, offset, colCount) {
  const { dr, dc } = toDomicule(index, offset, colCount);

  return dr !== 0 && dc !== 0 ? 1 : 0;
}

/**
 * Checks whether the domicule unranking table for a board fits in memory.
 * A state remembers colCount + 2 cells, so the table is four times wider than the domino one.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {boolean} True if the board can be unranked.
 */
function canUnrankDomicule({ rowCount, colCount }) {
  return (rowCount * colCount + 1) * 2 ** (colCount + 2) <= MAX_DOMICULE_TABLE_SIZE;
}

/**
 * Builds a table of completion counts for the domicule broken-profile scan.
 * table[i][state] is the number of ways to finish the tiling when the cells before i are
 * covered and bit j of state tells whether cell i + j is already covered.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @property {string} [options.lattice] 'king' for domicules, 'triangular' for the triangular lattice.
 * @param {function(number): void} [onProgress] Called with the completed fraction after every board row.
 * @returns {{ rowCount: number, colCount: number, table: BigInt[][], total: BigInt }} The unranker.
 */
function createDomiculeUnranker({ rowCount, colCount, lattice = 'king' }, onProgress) {
  if (!['king', 'triangular'].includes(lattice)) {
    throw new Error(`createDomiculeUnranker() takes lattice king or triangular, not ${lattice}.`);
  }

  const cellCount = rowCount * colCount;
  const stateCount = 2 ** (colCount + 2);
  const zero = BigInt(0);
  const table = new Array(cellCount + 1);

  table[cellCount] = new Array(stateCount).fill(zero);
  table[cellCount][0] = BigInt(1);

  for (let index = cellCount - 1; index >= 0; index--) {
    const next = table[index + 1];
    const current = new Array(stateCount);
    const bits = listOffsets(index, rowCount, colCount, lattice).map(offset => 2 ** offset);

    for (let state = 0; state < stateCount; state++) {
      if (state & 1) {
        current[state] = next[state >>> 1];
        continue;
      }

      let sum = zero;

      for (let i = 0; i < bits.length; i++) {
        if (!(state & bits[i])) {
          sum += next[(state + bits[i]) >>> 1];
        }
      }

      current[state] = sum;
    }

    table[index] = current;

    if (onProgress && index % colCount === 0) {
      onProgress((cellCount - index) / cellCount);
    }
  }

  return { rowCount, colCount, lattice, table, total: table[0][0] };
}

/**
 * Returns the domicule tiling with the given 0-based rank. A domicule covers the cell
 * (row, col) and the cell (row + dr, col + dc).
 * @param {Object} unranker The result of createDomiculeUnranker.
 * @param {BigInt} rank The 0-based rank, lower than unranker.total.
 * @returns {{ row: number, col: number, dr: number, dc: number }[]} The tiling.
 */
function unrankDomiculeTiling({ rowCount, colCount, lattice, table, total }, rank) {
  if (rank < BigInt(0) || rank >= total) {
    throw new RangeError(`Rank must be between 0 and ${total - BigInt(1)}.`);
  }

  const cellCount = table.length - 1;
  const domicules = [];
  let remaining = rank;
  let state = 0;

  for (let index = 0; index < cellCount; index++) {
    if (state & 1) {
      state >>>= 1;
      continue;
    }

    const next = table[index + 1];
    const offsets = listOffsets(index, rowCount, colCount, lattice).filter(offset => !(state & 2 ** offset));

    for (let i = 0; i < offsets.length; i++) {
      const target = (state + 2 ** offsets[i]) >>> 1;

      if (remaining < next[target]) {
        domicules.push(toDomicule(index, offsets[i], colCount));
        state = target;
        break;
      }

      remaining -= next[target];
    }
  }

  return domicules;
}

/**
 * Builds the counting table of the domicule tilings with a given number of diagonal pieces.
 * table[i][state][r] is the number of ways to finish the tiling with exactly r diagonal pieces
 * when the cells before i are covered as in createDomiculeUnranker; a state that cannot be
 * finished holds null, and r stops at the requested number. Fewer than r = diagonals - i
 * diagonal pieces can never remain at cell i, so those entries stay 0.
 * @param {Object} options The board and the number of diagonal pieces.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @property {number} options.diagonals The number of diagonal pieces.
 * @param {function(number): void} [onProgress] Called with the completed fraction after every board row.
 * @returns {{ rowCount: number, colCount: number, diagonals: number, table: Array<Array<BigInt[]|null>>, total: BigInt }} The unranker.
 */
function createDiagonalUnranker({ rowCount, colCount, diagonals }, onProgress) {
  const cellCount = rowCount * colCount;
  const stateCount = 2 ** (colCount + 2);
  const zero = BigInt(0);
  const table = new Array(cellCount + 1);

  table[cellCount] = new Array(stateCount).fill(null);
  table[cellCount][0] = [BigInt(1)];

  for (let index = cellCount - 1; index >= 0; index--) {
    const next = table[index + 1];
    const current = new Array(stateCount).fill(null);
    const moves = listOffsets(index, rowCount, colCount).map(offset => ({
      bit: 2 ** offset,
      diagonal: isDiagonalOffset(index, offset, colCount),
    }));
    const lowest = Math.max(0, diagonals - index);

    for (let state = 0; state < stateCount; state++) {
      if (state & 1) {
        current[state] = next[state >>> 1];
        continue;
      }

      let counts = null;

      for (let i = 0; i < moves.length; i++) {
        const following = state & moves[i].bit ? null : next[(state + moves[i].bit) >>> 1];

        if (!following) {
          continue;
        }

        counts ??= new Array(diagonals + 1).fill(zero);

        for (let r = Math.max(0, lowest - moves[i].diagonal); r < following.length && r + moves[i].diagonal <= diagonals; r++) {
          counts[r + moves[i].diagonal] += following[r];
        }
      }

      if (counts) {
        let length = counts.length;

        while (length > 0 && counts[length - 1] === zero) {
          length--;
        }

        current[state] = length ? counts.slice(0, length) : null;
      }
    }

    table[index] = current;

    if (onProgress && index % colCount === 0) {
      onProgress((cellCount - index) / cellCount);
    }
  }

  return { rowCount, colCount, diagonals, table, total: table[0][0]?.[diagonals] ?? zero };
}

/**
 * Returns the domicule tiling with the given 0-based rank among those with the unranker's
 * number of diagonal pieces, in the order of unrankDomiculeTiling.
 * @param {Object} unranker The result of createDiagonalUnranker.
 * @param {BigInt} rank The 0-based rank, lower than unranker.total.
 * @returns {{ row: number, col: number, dr: number, dc: number }[]} The tiling.
 */
function unrankDiagonalTiling({ rowCount, colCount, diagonals, table, total }, rank) {
  if (rank < BigInt(0) || rank >= total) {
    throw new RangeError(`Rank must be between 0 and ${total - BigInt(1)}.`);
  }

  const cellCount = table.length - 1;
  const domicules = [];
  let remaining = rank;
  let left = diagonals;
  let state = 0;

  for (let index = 0; index < cellCount; index++) {
    if (state & 1) {
      state >>>= 1;
      continue;
    }

    const next = table[index + 1];
    const offsets = listOffsets(index, rowCount, colCount).filter(offset => !(state & 2 ** offset));

    for (let i = 0; i < offsets.length; i++) {
      const target = (state + 2 ** offsets[i]) >>> 1;
      const diagonal = isDiagonalOffset(index, offsets[i], colCount);
      const count = left >= diagonal ? next[target]?.[left - diagonal] ?? BigInt(0) : BigInt(0);

      if (remaining < count) {
        domicules.push(toDomicule(index, offsets[i], colCount));
        state = target;
        left -= diagonal;
        break;
      }

      remaining -= count;
    }
  }

  return domicules;
}

function createStartPartners(rowCount, colCount) {
  const partner = new Int32Array(rowCount * colCount);
  const step = colCount % 2 === 0 ? 1 : colCount;

  for (let index = 0; index < partner.length; index++) {
    const first = step === 1 ? index % 2 === 0 : Math.floor(index / colCount) % 2 === 0;

    partner[index] = first ? index + step : index - step;
  }

  return partner;
}

function stepFrom(cell, steps, random, rowCount, colCount) {
  const [dRow, dCol] = steps[Math.floor(random() * steps.length)];
  const row = Math.floor(cell / colCount) + dRow;
  const col = (cell % colCount) + dCol;

  return row < 0 || row >= rowCount || col < 0 || col >= colCount ? -1 : row * colCount + col;
}

function areNeighbours(steps, colCount, from, to) {
  const dRow = Math.floor(to / colCount) - Math.floor(from / colCount);
  const dCol = (to % colCount) - (from % colCount);

  return steps.some(([stepRow, stepCol]) => stepRow === dRow && stepCol === dCol);
}

/**
 * Samples a domicule tiling with a Markov chain whose stationary distribution is uniform.
 * A step picks a cell a and one of its neighbours c, eight on the king's graph and six on
 * the triangular lattice; when the partners b of a and d of c are neighbours too, the pairs
 * ab and cd become ac and bd. These moves along 4-cycles reach every tiling of the king's
 * graph, not of the triangular lattice, so there half of the steps go along a 6-cycle: from
 * d a neighbour e is picked, and when the partner f of e is a neighbour of b, the pairs ab,
 * cd and ef become ac, de and fb. Both proposals are symmetric, so the uniform distribution
 * is stationary, but a finite run is only approximately uniform.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @property {string} [options.lattice] 'king' for domicules, 'triangular' for the triangular lattice.
 * @param {function(): number} [random] A generator of numbers in [0, 1).
 * @param {number} [sweeps] The number of steps per cell.
 * @returns {{ row: number, col: number, dr: number, dc: number }[]|null} A tiling, or null if the board has an odd number of cells.
 */
function sampleDomiculeTiling({ rowCount, colCount, lattice = 'king' }, random = Math.random, sweeps = DEFAULT_SWEEPS) {
  const steps = SAMPLER_STEPS[lattice];

  if (!steps) {
    throw new Error(`sampleDomiculeTiling() takes lattice king or triangular, not ${lattice}.`);
  }

  const cellCount = rowCount * colCount;

  if (cellCount % 2 !== 0) {
    return null;
  }

  const partner = createStartPartners(rowCount, colCount);
  const stepCount = sweeps * cellCount;

  for (let step = 0; step < stepCount; step++) {
    const sixCycle = lattice === 'triangular' && random() < 0.5;
    const a = Math.floor(random() * cellCount);
    const c = stepFrom(a, steps, random, rowCount, colCount);

    if (c < 0) {
      continue;
    }

    const b = partner[a];
    const d = partner[c];

    if (b === c) {
      continue;
    }

    if (!sixCycle) {
      if (areNeighbours(steps, colCount, b, d)) {
        partner[a] = c;
        partner[c] = a;
        partner[b] = d;
        partner[d] = b;
      }

      continue;
    }

    const e = stepFrom(d, steps, random, rowCount, colCount);

    if (e < 0 || e === a || e === b || e === c) {
      continue;
    }

    const f = partner[e];

    if (f === a || f === b || !areNeighbours(steps, colCount, f, b)) {
      continue;
    }

    partner[a] = c;
    partner[c] = a;
    partner[d] = e;
    partner[e] = d;
    partner[f] = b;
    partner[b] = f;
  }

  const domicules = [];

  for (let index = 0; index < cellCount; index++) {
    if (partner[index] > index) {
      domicules.push(toDomicule(index, partner[index] - index, colCount));
    }
  }

  return domicules;
}

if (typeof module !== 'undefined') {
  module.exports = {
    canUnrankDomicule,
    createDomiculeUnranker,
    unrankDomiculeTiling,
    createDiagonalUnranker,
    unrankDiagonalTiling,
    sampleDomiculeTiling,
    DEFAULT_SWEEPS,
  };
}
