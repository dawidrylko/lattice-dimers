const RANK_PRIME_BOUND = 2 ** 31;

/**
 * Lists the primes the ranks of a board's tilings are computed modulo, starting from the
 * largest one below 2^31, until their product exceeds the number of tilings.
 * @param {BigInt|string} total The number of tilings.
 * @returns {number[]} The primes in decreasing order.
 */
function listRankPrimes(total) {
  const isPrime = n => {
    for (let d = 3; d * d <= n; d += 2) {
      if (n % d === 0) {
        return false;
      }
    }

    return true;
  };
  const primes = [];
  let product = BigInt(1);

  for (let n = RANK_PRIME_BOUND - 1; product <= BigInt(total); n -= 2) {
    if (isPrime(n)) {
      primes.push(n);
      product *= BigInt(n);
    }
  }

  return primes;
}

function listPieceOffsets(pieces, index, rowCount, colCount) {
  const col = index % colCount;
  const hasRight = col + 1 < colCount;
  const hasBelow = index + colCount < rowCount * colCount;

  if (pieces === 'domino') {
    return [...(hasRight ? [1] : []), ...(hasBelow ? [colCount] : [])];
  }

  return [
    ...(hasRight ? [1] : []),
    ...(hasBelow && col > 0 ? [colCount - 1] : []),
    ...(hasBelow ? [colCount] : []),
    ...(hasBelow && hasRight ? [colCount + 1] : []),
  ];
}

function pieceOffset(piece, colCount) {
  const dr = piece.dr ?? (piece.horizontal ? 0 : 1);
  const dc = piece.dc ?? (piece.horizontal ? 1 : 0);

  return dr * colCount + dc;
}

/**
 * Lists, for every tiling, the scan states whose completion counts add up to its rank: at
 * every cell where the tiling takes a later choice, the states the earlier choices lead to.
 * @returns {Map<number, number[][]>} For every cell i + 1, pairs [tiling, state].
 */
function listRankTerms(pieces, rowCount, colCount, tilings) {
  const cellCount = rowCount * colCount;
  const terms = new Map();

  tilings.forEach((tiling, k) => {
    const chosen = new Map(tiling.map(piece => [piece.row * colCount + piece.col, pieceOffset(piece, colCount)]));
    let state = 0;

    for (let index = 0; index < cellCount; index++) {
      if (state & 1) {
        state >>>= 1;
        continue;
      }

      const offsets = listPieceOffsets(pieces, index, rowCount, colCount).filter(offset => !(state & 2 ** offset));
      const choice = offsets.indexOf(chosen.get(index));

      if (choice < 0) {
        throw new RangeError(`Tiling ${k + 1} is not a tiling of the ${rowCount}×${colCount} board.`);
      }

      for (let i = 0; i < choice; i++) {
        if (!terms.has(index + 1)) terms.set(index + 1, []);
        terms.get(index + 1).push([k, (state + 2 ** offsets[i]) >>> 1]);
      }

      state = (state + 2 ** offsets[choice]) >>> 1;
    }
  });

  return terms;
}

/**
 * Computes the 0-based ranks of tilings modulo a prime, in the order of unrankTiling and
 * unrankDomiculeTiling, without their tables: one backward scan keeps a single row of
 * completion counts, as a Uint32Array, and adds the counts each tiling skips.
 * @param {Object} options The board.
 * @property {string} options.pieces "domino" or "domicule".
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @param {Array<Object[]>} tilings The tilings.
 * @param {number} prime A prime below 2^31.
 * @param {function(number): void} [onProgress] Called with the completed fraction after every board row.
 * @returns {{ ranks: number[], total: number }} The ranks and the number of tilings, modulo the prime.
 */
function rankTilingsModulo({ pieces, rowCount, colCount }, tilings, prime, onProgress) {
  const cellCount = rowCount * colCount;
  const stateCount = 2 ** (pieces === 'domino' ? colCount : colCount + 1);
  const terms = listRankTerms(pieces, rowCount, colCount, tilings);
  const ranks = tilings.map(() => 0);
  let next = new Uint32Array(stateCount);
  let current = new Uint32Array(stateCount);

  next[0] = 1 % prime;

  for (let index = cellCount - 1; index >= 0; index--) {
    (terms.get(index + 1) || []).forEach(([k, state]) => (ranks[k] = (ranks[k] + next[state]) % prime));

    const bits = listPieceOffsets(pieces, index, rowCount, colCount).map(offset => 1 << offset);
    const [a = 0, b = 0, c = 0, d = 0] = bits;

    for (let state = 0; state < stateCount; state += 2) {
      current[state + 1] = next[(state + 1) >>> 1];

      let sum = 0;

      if (a && !(state & a)) sum = next[(state | a) >>> 1];
      if (b && !(state & b)) {
        sum += next[(state | b) >>> 1];
        if (sum >= prime) sum -= prime;
      }
      if (c && !(state & c)) {
        sum += next[(state | c) >>> 1];
        if (sum >= prime) sum -= prime;
      }
      if (d && !(state & d)) {
        sum += next[(state | d) >>> 1];
        if (sum >= prime) sum -= prime;
      }

      current[state] = sum;
    }

    [next, current] = [current, next];

    if (onProgress && index % colCount === 0) {
      onProgress((cellCount - index) / cellCount);
    }
  }

  return { ranks, total: next[0] };
}

/**
 * Rebuilds the ranks from their residues with the Chinese remainder theorem.
 * @param {number[][]} residues residues[j][k] is the rank of tiling k modulo primes[j].
 * @param {number[]} primes The primes of listRankPrimes.
 * @returns {BigInt[]} The 0-based ranks.
 */
function combineRanks(residues, primes) {
  return residues[0].map((_, k) => {
    let result = BigInt(0);
    let modulus = BigInt(1);

    primes.forEach((p, j) => {
      const prime = BigInt(p);
      const difference = (((BigInt(residues[j][k]) - result) % prime) + prime) % prime;
      let [a, b, x, y] = [modulus % prime, prime, BigInt(1), BigInt(0)];

      while (b !== BigInt(0)) {
        const quotient = a / b;
        [a, b] = [b, a - quotient * b];
        [x, y] = [y, x - quotient * y];
      }

      result += modulus * ((difference * (((x % prime) + prime) % prime)) % prime);
      modulus *= prime;
    });

    return result;
  });
}

if (typeof module !== 'undefined') {
  module.exports = { listRankPrimes, rankTilingsModulo, combineRanks };
}
