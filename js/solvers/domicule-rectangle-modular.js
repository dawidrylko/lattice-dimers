const os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { parseArgs, startTimer } = require('../core');
const { listPrimes, calculateLog2Bound, combineResidues } = require('../core/modular');

const MAX_SHORTER_SIDE = 30;

/**
 * Lists the offsets of the cells a free cell in column c can cover with its partner: right,
 * down-left, down and down-right.
 * @param {number} cols The number of columns.
 * @param {number} c The column.
 * @param {boolean} hasBelow Whether the cell has a next row.
 * @returns {number[]} The offsets.
 */
function listOffsets(cols, c, hasBelow) {
  const hasRight = c + 1 < cols;

  return [
    ...(hasRight ? [1] : []),
    ...(hasBelow && c > 0 ? [cols - 1] : []),
    ...(hasBelow ? [cols] : []),
    ...(hasBelow && hasRight ? [cols + 1] : []),
  ];
}

/**
 * Lists the terms of the cell step of column c for every block of the next table. A next state
 * comes from the state shifted left with bit 0 set, the covered cell, or from the state
 * shifted left without the bit of a move, the free cell that made the move. Either way the
 * count it needs lies a fixed number of entries, the shift of the term, below the next state
 * in the current table. A move onto the next cell sets bit 0 of the next state, so it has only
 * odd next states (odd). The top three bits of an entry decide which terms it has, so the
 * table is at most eight blocks of entries with the same terms. With crossingSign the
 * down-left move is negative where bit cols - 2 of the entry is set: the cell below the one
 * that moves is then covered already, which only the down-right move of the cell to its left
 * does, so the two diagonal pieces cross.
 * @param {number} cols The number of columns.
 * @param {number} c The column.
 * @param {boolean} hasBelow Whether the cell has a next row.
 * @param {boolean} crossingSign Whether the tilings count with their crossing sign.
 * @returns {Array<{ plain: Object[], odd: Object[] }>} The terms of every block, each with its
 * shift and whether it is subtracted.
 */
function listBlocks(cols, c, hasBelow, crossingSign) {
  const offsets = listOffsets(cols, c, hasBelow);
  const blockBits = Math.min(cols, 3);

  return Array.from({ length: 1 << blockBits }, (_, block) => {
    const entry = block << (cols - blockBits);
    const isSet = bit => ((entry >>> bit) & 1) === 1;
    const top = isSet(cols - 1);
    const terms = { plain: top ? [] : [{ shift: 0, negative: false }], odd: [] };

    for (const offset of offsets) {
      const negative = crossingSign && c > 0 && offset === cols - 1 && isSet(cols - 2);

      if (offset === 1 && !top) {
        terms.odd.push({ shift: 1, negative });
      } else if (offset > 1 && isSet(offset - 2) && (offset === cols + 1 || !top)) {
        terms.plain.push({ shift: 1 << (offset - 1), negative });
      }
    }

    return terms;
  });
}

/**
 * Adds two counts modulo the prime, inside 32-bit integers.
 * @param {number} sum The first count.
 * @param {number} count The second count.
 * @param {number} prime The modulus.
 * @returns {number} The sum modulo the prime.
 */
function addModulo(sum, count, prime) {
  const total = sum + (count - prime);

  return total < 0 ? total + prime : total;
}

/**
 * Subtracts a count from a sum modulo the prime.
 * @param {number} sum The sum.
 * @param {number} count The count.
 * @param {number} prime The modulus.
 * @returns {number} The difference modulo the prime.
 */
function subtractModulo(sum, count, prime) {
  const total = sum - count;

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
 * loop holds three plain terms and one odd term, the most a block has on any board; a block
 * with more would take the entry loop, which takes any number. A block with a subtracted
 * term takes the entry loop as well, so the pair loop only adds.
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

  const subtracts = [...plain, ...odd].some(term => term.negative);

  if (size < 2 || subtracts || plain.length > 3 || odd.length > 1) {
    for (let entry = from; entry < from + size; entry++) {
      const bit = parityOf(entry) ^ parity;
      let sum = 0;

      for (const { shift, negative } of plain) {
        sum = (negative ? subtractModulo : addModulo)(sum, current[2 * entry + bit - shift], prime);
      }

      for (const { shift, negative } of bit === 1 ? odd : []) {
        sum = (negative ? subtractModulo : addModulo)(sum, current[2 * entry + 1 - shift], prime);
      }

      next[entry] = sum;
    }

    return;
  }

  const plains = plain.length;
  const odds = odd.length;
  const first = 2 * from - (plain[0]?.shift ?? 0);
  const second = 2 * from - (plain[1]?.shift ?? 0);
  const third = 2 * from - (plain[2]?.shift ?? 0);
  const onto = 2 * from - (odd[0]?.shift ?? 0);

  for (let place = 0; place < size; place += 2) {
    const bit = parityOf(from + place) ^ parity;
    const lowState = 2 * place + bit;
    const highState = 2 * place + 3 - bit;
    let low = 0;
    let high = 0;

    if (plains > 0) {
      low = current[first + lowState];
      high = current[first + highState];

      if (plains > 1) {
        low = addModulo(low, current[second + lowState], prime);
        high = addModulo(high, current[second + highState], prime);

        if (plains > 2) {
          low = addModulo(low, current[third + lowState], prime);
          high = addModulo(high, current[third + highState], prime);
        }
      }
    }

    if (odds > 0) {
      if (bit === 1) {
        low = addModulo(low, current[onto + lowState], prime);
      } else {
        high = addModulo(high, current[onto + highState], prime);
      }
    }

    next[from + place] = low;
    next[from + place + 1] = high;
  }
}

/**
 * Counts the domicule tilings modulo a prime with the same broken-profile dynamic programming
 * as domicule-rectangle-bigint.js. Bit i of a state tells whether the cell i places ahead of
 * the current one is already covered. A state has cols + 2 bits, but the top one is clear
 * before every cell step, since a step shifts the state right after setting at most that bit.
 * After k cells the number of set bits of a live state has the parity of k: a piece inside the
 * processed cells covers two of them, and a piece that sticks out covers one and sets one bit.
 * So bit 0 of a live state follows from its other bits, and the tables hold one count for
 * every value of bits 1 to cols, 2^cols counts instead of 2^(cols + 1). A step fills every
 * next entry from the entries that lead to it (listBlocks), so it neither clears a table nor
 * tests a count. Only additions are needed, so the counts are kept in Uint32Array tables.
 *
 * With crossingSign a tiling counts with its crossing sign, (-1)^k for the k unit squares in
 * which two diagonal pieces cross. The sum is plus or minus the Pfaffian of the board
 * (Wildeboer and Seidel, cited in research/king-entropy/paper/king-entropy.tex), which
 * js/test/core.test.js checks. No solver prints it.
 * @param {number} rows The number of rows (the longer side).
 * @param {number} cols The number of columns (the shorter side).
 * @param {number} prime The modulus.
 * @param {boolean} [crossingSign] Whether the tilings count with their crossing sign.
 * @returns {number} The number of tilings modulo the prime, or their sum with that sign.
 */
function countModulo(rows, cols, prime, crossingSign = false) {
  const stateCount = 2 ** cols;
  const blockSize = stateCount / 2 ** Math.min(cols, 3);
  const blocksBelow = Array.from({ length: cols }, (_, c) => listBlocks(cols, c, true, crossingSign));
  const blocksLast = Array.from({ length: cols }, (_, c) => listBlocks(cols, c, false, crossingSign));
  let current = new Uint32Array(stateCount);
  let next = new Uint32Array(stateCount);
  current[0] = 1 % prime;

  for (let cell = 0; cell < rows * cols; cell++) {
    const blocks = (Math.floor(cell / cols) + 1 < rows ? blocksBelow : blocksLast)[cell % cols];

    for (let block = 0; block < blocks.length; block++) {
      fillBlock(next, current, block * blockSize, blockSize, blocks[block], (cell + 1) % 2, prime);
    }

    [current, next] = [next, current];
  }

  return current[0];
}

/**
 * Counts the residues in worker threads, at most `jobs` at a time.
 * @param {number} rows The longer side.
 * @param {number} cols The shorter side.
 * @param {number[]} primes The moduli.
 * @param {number} jobs The number of worker threads.
 * @returns {Promise<number[]>} The residues, in the order of the primes.
 */
async function countResidues(rows, cols, primes, jobs) {
  const residues = new Array(primes.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < primes.length) {
      const index = nextIndex++;
      residues[index] = await new Promise((resolve, reject) => {
        const worker = new Worker(__filename, { workerData: { rows, cols, prime: primes[index] } });
        worker.once('message', resolve);
        worker.once('error', reject);
        worker.once('exit', code =>
          reject(new Error(`The worker for the prime ${primes[index]} stopped with exit code ${code} before it sent a result.`)),
        );
      });
    }
  };

  await Promise.all(Array.from({ length: Math.min(jobs, primes.length) }, runWorker));

  return residues;
}

/**
 * Counts the tilings exactly: enough primes for the Kahn-Lovasz bound, plus one more prime
 * that the result is checked against.
 * @param {Object} options The board and the number of worker threads.
 * @returns {Promise<BigInt>} The number of tilings.
 */
async function calculateTotalTilingCombinations({ rowCount, colCount, jobs = os.availableParallelism() }) {
  const rows = Math.max(rowCount, colCount);
  const cols = Math.min(rowCount, colCount);

  if ((rows * cols) % 2 === 1) {
    return BigInt(0);
  }

  const primeCount = Math.ceil((calculateLog2Bound(rows, cols) + 1) / 30) + 1;
  const primes = listPrimes(primeCount);
  const residues = await countResidues(rows, cols, primes, jobs);
  const result = combineResidues(residues.slice(0, -1), primes.slice(0, -1));

  if (result % BigInt(primes.at(-1)) !== BigInt(residues.at(-1))) {
    throw new Error(`The result does not match the residue modulo the check prime ${primes.at(-1)}.`);
  }

  return result;
}

function isValidSize(size) {
  return Number.isInteger(size) && size >= 0;
}

async function __main__() {
  const argsSchema = { '-r': 'rowCount', '-c': 'colCount', '-j': 'jobs' };
  const options = parseArgs(process.argv.slice(2), argsSchema);
  const jobs = options.jobs ?? os.availableParallelism();

  if (!isValidSize(options.rowCount) || !isValidSize(options.colCount) || !(jobs > 0)) {
    console.error(
      'Usage: node js/solvers/domicule-rectangle-modular.js -r <rowCount> -c <colCount> [-j <jobs>]',
    );
    process.exit(1);
  }

  if (Math.min(options.rowCount, options.colCount) > MAX_SHORTER_SIDE) {
    console.error(
      `The shorter side of the board can be at most ${MAX_SHORTER_SIDE}, because the states are indexed with 32-bit integers.`,
    );
    process.exit(1);
  }

  const stopTimer = startTimer();
  const result = await calculateTotalTilingCombinations({ ...options, jobs });
  stopTimer();
  console.log(result.toString());
}

if (!isMainThread) {
  const { rows, cols, prime } = workerData;
  parentPort.postMessage(countModulo(rows, cols, prime));
} else if (require.main === module) {
  __main__().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { calculateTotalTilingCombinations, calculateLog2Bound, listPrimes, countModulo, combineResidues };
