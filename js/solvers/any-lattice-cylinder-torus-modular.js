const os = require('os');
const { isMainThread, parentPort, workerData } = require('worker_threads');
const { parseArgs, hasUnusableArgument, startTimer } = require('../core');
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
 * Lists the terms of the cell step of column c for every block of the next table. A table
 * entry stands for a state without its bit 0 and without its top window bit: its bits are the
 * window bits 1 to cols and, on the king's graph with cols >= 3, one more bit above them. That
 * bit is the extra bit of listMoves until the step of column cols - 3, when the extra bit
 * joins the window as the top window bit, and it is that window bit for the one step of
 * column cols - 2, which shifts it down. A next state comes from the state shifted left with
 * bit 0 set, the covered cell, or from the state shifted left without the bit of a move, the
 * free cell that made the move. Either way the count it needs lies a fixed number of entries,
 * the shift of the term, below the next state in the current table. A move onto the next cell
 * sets bit 0 of the next state, so it has only odd next states (odd), and a piece across the
 * seam of a twisted board is subtracted (negative). The top bits of an entry decide which
 * terms it has, so the table is at most sixteen blocks of entries with the same terms.
 * @param {number} cols The circumference.
 * @param {number} c The column.
 * @param {Array<{ bit: number, crossing: boolean }>} moves The moves of the column.
 * @param {boolean} twisted Whether pieces across the seam count with a minus sign.
 * @param {boolean} usesWrapBit Whether the board needs the extra bit.
 * @returns {Array<{ plain: Object[], odd: Object[] }>} The terms of every block.
 */
function listBlocks(cols, c, moves, twisted, usesWrapBit) {
  const entryBits = cols + (usesWrapBit ? 1 : 0);
  const blockBits = Math.min(entryBits, usesWrapBit ? 4 : 3);
  const joins = usesWrapBit && c === cols - 2;

  return Array.from({ length: 1 << blockBits }, (_, block) => {
    const entry = block << (entryBits - blockBits);
    const isSet = bit => ((entry >>> bit) & 1) === 1;
    const held = usesWrapBit && isSet(cols);
    const open = joins || !isSet(cols - 1);
    const base = held ? 1 << cols : 0;
    const terms = { plain: [], odd: [] };

    if (joins && held) {
      return terms;
    }

    if (open) {
      terms.plain.push({ shift: base, negative: false });
    }

    for (const { bit, crossing } of moves) {
      const offset = 31 - Math.clz32(bit);
      const negative = twisted && crossing;

      if (offset === cols + 2 && held && open) {
        terms.plain.push({ shift: 2 << cols, negative });
      } else if (offset === 1 && open) {
        terms.odd.push({ shift: base + 1, negative });
      } else if (offset > 1 && offset < cols + 2 && isSet(offset - 2) && (offset === cols + 1 || open)) {
        terms.plain.push({ shift: base + (1 << (offset - 1)), negative });
      }
    }

    return terms;
  });
}

/**
 * Adds a count to a sum modulo the prime, or subtracts it, inside 32-bit integers.
 * @param {number} sum The sum.
 * @param {number} count The count.
 * @param {boolean} negative Whether the count is subtracted.
 * @param {number} prime The modulus.
 * @returns {number} The new sum modulo the prime.
 */
function addModulo(sum, count, negative, prime) {
  const total = negative ? sum - count : sum + (count - prime);

  return total < 0 ? total + prime : total;
}

/**
 * Tells whether an entry has an odd number of set bits.
 * @param {number} entry The entry.
 * @returns {number} 1 when the number is odd, otherwise 0.
 */
function parityOf(entry) {
  let folded = entry ^ (entry >>> 16);
  folded ^= folded >>> 8;
  folded ^= folded >>> 4;

  return (0x6996 >>> (folded & 15)) & 1;
}

/**
 * Fills one block of the next table. Entry e stands for the state 2e + bit, where bit makes
 * the number of set bits of the state odd or even as the step requires (parity), and a term
 * with the shift s reads the current entry 2e + bit - s. Two neighbouring entries have
 * opposite bits, so a block of at least two entries is filled a pair at a time. The pair
 * loop holds four plain terms and one odd term, the most a block of two or more entries has;
 * a block with more would take the entry loop, which takes any number.
 * @param {Uint32Array} next The next table.
 * @param {Uint32Array} current The current table.
 * @param {number} from The first entry of the block.
 * @param {number} size The number of entries of the block.
 * @param {{ plain: Object[], odd: Object[] }} terms The terms of the block.
 * @param {number} parity The parity of the number of set bits of every state of the next table.
 * @param {number} prime The modulus.
 */
function fillBlock(next, current, from, size, { plain, odd }, parity, prime) {
  if (plain.length + odd.length === 0) {
    next.fill(0, from, from + size);
    return;
  }

  if (size < 2 || plain.length > 4 || odd.length > 1) {
    for (let entry = from; entry < from + size; entry++) {
      const bit = parityOf(entry) ^ parity;
      let sum = 0;

      for (const { shift, negative } of plain) {
        sum = addModulo(sum, current[2 * entry + bit - shift], negative, prime);
      }

      for (const { shift, negative } of bit === 1 ? odd : []) {
        sum = addModulo(sum, current[2 * entry + 1 - shift], negative, prime);
      }

      next[entry] = sum;
    }

    return;
  }

  const none = { shift: 0, negative: false };
  const plains = plain.length;
  const odds = odd.length;
  const [first = none, second = none, third = none, fourth = none] = plain;
  const [onto = none] = odd;
  const firstStart = 2 * from - first.shift;
  const secondStart = 2 * from - second.shift;
  const thirdStart = 2 * from - third.shift;
  const fourthStart = 2 * from - fourth.shift;
  const ontoStart = 2 * from - onto.shift;
  const firstNegative = first.negative;
  const secondNegative = second.negative;
  const thirdNegative = third.negative;
  const fourthNegative = fourth.negative;
  const ontoNegative = onto.negative;

  for (let place = 0; place < size; place += 2) {
    const bit = parityOf(from + place) ^ parity;
    const lowState = 2 * place + bit;
    const highState = 2 * place + 3 - bit;
    let low = 0;
    let high = 0;

    if (plains > 0) {
      low = addModulo(low, current[firstStart + lowState], firstNegative, prime);
      high = addModulo(high, current[firstStart + highState], firstNegative, prime);

      if (plains > 1) {
        low = addModulo(low, current[secondStart + lowState], secondNegative, prime);
        high = addModulo(high, current[secondStart + highState], secondNegative, prime);

        if (plains > 2) {
          low = addModulo(low, current[thirdStart + lowState], thirdNegative, prime);
          high = addModulo(high, current[thirdStart + highState], thirdNegative, prime);

          if (plains > 3) {
            low = addModulo(low, current[fourthStart + lowState], fourthNegative, prime);
            high = addModulo(high, current[fourthStart + highState], fourthNegative, prime);
          }
        }
      }
    }

    if (odds > 0) {
      if (bit === 1) {
        low = addModulo(low, current[ontoStart + lowState], ontoNegative, prime);
      } else {
        high = addModulo(high, current[ontoStart + highState], ontoNegative, prime);
      }
    }

    next[from + place] = low;
    next[from + place + 1] = high;
  }
}

/**
 * Counts the tilings of a cylinder or a torus modulo a prime, cell by cell. A state has
 * cols + 2 window bits and, on the king's graph with cols >= 3, the extra bit of listMoves,
 * which joins the window at column cols - 3. After k cells the number of set bits of a live
 * state has the parity of k plus the size of the set the run started from: a piece inside the
 * processed cells covers two of them, and a piece that sticks out covers one and sets one bit.
 * So bit 0 of a live state follows from its other bits. The top window bit is set before a
 * cell step only at column cols - 2, where it is the extra bit that has just joined, so the
 * two share one bit of the tables. The tables thus hold 2^cols counts, or 2^(cols + 1) with
 * the extra bit, instead of 2^(cols + 2) and 2^(cols + 3) states, and a step fills every next
 * entry from the entries that lead to it (listBlocks), so it neither clears a table nor tests
 * a count. A board with an odd number of cells has no tiling, and the entry a run would end
 * on then stands for a state of the other parity, so its count is 0 without a run.
 * A cylinder starts and ends with the empty state.
 * A torus is a trace: for every set S of first-row cells covered from the last row, the run
 * starts from S and must end with S. Rotating the columns maps the runs of S onto the runs of
 * its rotations, so only the smallest rotation of each S is run, weighted by the number of
 * its rotations; with the seam sign this needs an even number of rows, which keeps the
 * parity of the pieces crossing a column boundary the same for every boundary. The mirror
 * image of the square lattice and of the king's graph is the same board with the seam in its
 * place, so S and its mirror image have the same runs too, and of the two classes of rotations
 * only the one with the smaller set is run, with twice the weight. The triangular lattice has
 * one diagonal and no such mirror image, and its runs do differ.
 * @param {Object} board The board and the prime.
 * @returns {number} The count (or the signed sum) modulo the prime.
 */
function countModulo({ rows, cols, lattice, torus, twisted, prime }) {
  if ((rows * cols) % 2 === 1) {
    return 0;
  }

  const diagonals = LATTICES[lattice];
  const wrapBit = 2 ** (cols + 2);
  const usesWrapBit = diagonals.downLeft && cols >= 3;
  const stateCount = 2 ** (cols + (usesWrapBit ? 1 : 0));
  const blockSize = stateCount / 2 ** Math.min(Math.log2(stateCount), usesWrapBit ? 4 : 3);
  const list = hasBelow =>
    Array.from({ length: cols }, (_, c) => listBlocks(cols, c, listMoves(cols, c, hasBelow, diagonals, wrapBit), twisted, usesWrapBit));
  const blocksBelow = list(true);
  const blocksLast = list(torus);
  let current = new Uint32Array(stateCount);
  let next = new Uint32Array(stateCount);

  const run = start => {
    current.fill(0);
    current[start >>> 1] = 1 % prime;

    for (let cell = 0; cell < rows * cols; cell++) {
      const blocks = (cell < (rows - 1) * cols ? blocksBelow : blocksLast)[cell % cols];
      const parity = (cell + 1 + parityOf(start)) % 2;

      for (let block = 0; block < blocks.length; block++) {
        fillBlock(next, current, block * blockSize, blockSize, blocks[block], parity, prime);
      }

      [current, next] = [next, current];
    }

    return current[start >>> 1];
  };

  if (!torus) {
    return rows === 0 ? 1 % prime : run(0);
  }

  const rotate = set => ((set << 1) | (set >>> (cols - 1))) & (2 ** cols - 1);
  const reverse = set => Array.from({ length: cols }, (_, i) => (set >>> i) & 1).reduce((mirrored, bit) => 2 * mirrored + bit, 0);
  const rotates = !twisted || rows % 2 === 0;
  const mirrors = diagonals.downLeft === diagonals.downRight;
  let total = 0;

  for (let start = 0; start < 2 ** cols; start++) {
    let weight = 1;

    if (rotates) {
      let rotation = rotate(start);

      while (rotation > start) {
        weight++;
        rotation = rotate(rotation);
      }

      if (rotation !== start) {
        continue;
      }
    }

    if (mirrors) {
      const mirrored = reverse(start);
      let least = mirrored;

      for (let rotation = rotate(mirrored); rotates && rotation !== mirrored; rotation = rotate(rotation)) {
        least = Math.min(least, rotation);
      }

      if (least < start) {
        continue;
      }

      if (least > start) {
        weight *= 2;
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

  if (!isValidBoard(options, torus) || !Object.hasOwn(LATTICES, lattice) || !(jobs > 0) || hasUnusableArgument(argv, ['-r', '-c', '-j', '--lattice'], ['--torus', '--twisted'])) {
    console.error(
      'Usage: node js/solvers/any-lattice-cylinder-torus-modular.js -r <rowCount> -c <circumference> [--torus] [--twisted] [--lattice king|triangular|square] [-j <jobs>]\n' +
        'The circumference is at least 2, and a torus has at least 2 rows, unless the board has no cells.',
    );
    process.exit(1);
  }

  if (Math.min(options.colCount, torus && !twisted ? options.rowCount : Infinity) > MAX_CIRCUMFERENCE) {
    console.error(`The circumference can be at most ${MAX_CIRCUMFERENCE}, because every worker thread keeps two tables whose size doubles with every unit of the circumference.`);
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
