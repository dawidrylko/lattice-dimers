const LARGEST_PRIME_BOUND = 2 ** 26;

function negate(value, prime) {
  return value === 0 ? 0 : prime - value;
}

function invert(value, prime) {
  let result = 1;
  let base = value;

  for (let exponent = prime - 2; exponent > 0; exponent = Math.floor(exponent / 2)) {
    if (exponent % 2 === 1) {
      result = (result * base) % prime;
    }

    base = (base * base) % prime;
  }

  return result;
}

/**
 * Swaps the vertices k + 1 and j > k + 1 of a skew-symmetric matrix kept as its entries above
 * the diagonal, from row k on: the rows before it are already eliminated.
 * @param {Float64Array} matrix The matrix, row by row.
 * @param {number} size The number of rows.
 * @param {number} k The row being eliminated.
 * @param {number} j The vertex to move next to it.
 * @param {number} prime The modulus.
 */
function swapWithNext(matrix, size, k, j, prime) {
  const next = k + 1;
  const swap = (first, second) => {
    const kept = matrix[first];

    matrix[first] = matrix[second];
    matrix[second] = kept;
  };

  swap(k * size + next, k * size + j);

  for (let between = next + 1; between < j; between++) {
    const above = matrix[next * size + between];

    matrix[next * size + between] = negate(matrix[between * size + j], prime);
    matrix[between * size + j] = negate(above, prime);
  }

  matrix[next * size + j] = negate(matrix[next * size + j], prime);

  for (let after = j + 1; after < size; after++) {
    swap(next * size + after, j * size + after);
  }
}

/**
 * Computes the Pfaffian of a skew-symmetric matrix modulo a prime below 2^26. The matrix holds
 * size rows of size residues below the prime. Only the entries above the diagonal are read, the
 * entry in row i and column j > i standing for its negative in row j and column i, and they are
 * overwritten.
 *
 * The elimination takes the vertices two at a time. For the pair k and k + 1 it moves a vertex j
 * with a nonzero entry in row k to the place k + 1, which flips the sign, multiplies the Pfaffian
 * by that entry and subtracts the two rows from the rest: with f the row k divided by the entry
 * and b the row k + 1, the entry in row i and column j becomes a[i][j] - f[i] b[j] + f[j] b[i].
 * Only the columns where f or b is nonzero change, so a step costs the square of their number,
 * not of the size. On a board numbered along its shorter side these are the cells of a few rows,
 * and the whole elimination takes about cells x side^2 updates instead of cells^3 / 6.
 *
 * A double holds an integer below 2^53 exactly. With a prime below 2^26 an entry and two products
 * of residues stay below it, so one reduction per update is exact; Rust and Python take primes
 * below 2^31 in 64-bit integers.
 * @param {Float64Array} matrix The matrix, row by row.
 * @param {number} size The number of rows.
 * @param {number} prime The modulus.
 * @returns {number} The Pfaffian modulo the prime.
 */
function pfaffianModulo(matrix, size, prime) {
  if (matrix.length !== size * size || !(prime < LARGEST_PRIME_BOUND)) {
    throw new Error(`The matrix must hold size x size entries and the prime must be below ${LARGEST_PRIME_BOUND}.`);
  }

  if (size % 2 === 1) {
    return 0;
  }

  const support = new Int32Array(size);
  const factors = new Float64Array(size);
  const partners = new Float64Array(size);
  let pfaffian = 1 % prime;

  for (let k = 0; k < size; k += 2) {
    const row = k * size;
    let found = k + 1;

    while (found < size && matrix[row + found] === 0) {
      found++;
    }

    if (found === size) {
      return 0;
    }

    if (found !== k + 1) {
      swapWithNext(matrix, size, k, found, prime);
      pfaffian = negate(pfaffian, prime);
    }

    const pivot = matrix[row + k + 1];
    const inverse = invert(pivot, prime);
    let count = 0;

    pfaffian = (pfaffian * pivot) % prime;

    for (let j = k + 2; j < size; j++) {
      const above = matrix[row + j];
      const below = matrix[row + size + j];

      if (above !== 0 || below !== 0) {
        support[count] = j;
        factors[count] = (above * inverse) % prime;
        partners[count] = below;
        count++;
      }
    }

    for (let position = 0; position < count; position++) {
      const base = support[position] * size;
      const partner = partners[position];
      const negatedFactor = prime - factors[position];

      for (let later = position + 1; later < count; later++) {
        const cell = base + support[later];
        const value = matrix[cell] + factors[later] * partner + negatedFactor * partners[later];

        matrix[cell] = value - Math.floor(value / prime) * prime;
      }
    }
  }

  return pfaffian;
}

module.exports = { pfaffianModulo, LARGEST_PRIME_BOUND };
