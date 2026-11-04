const { Worker } = require('worker_threads');

const LARGEST_PRIME_BOUND = 2 ** 31;

/**
 * Lists the given number of primes, starting from the largest one below 2^31.
 * The sum of two residues then stays below 2^32 and fits a Uint32Array cell.
 * @param {number} count The number of primes.
 * @returns {number[]} The primes in decreasing order.
 */
function listPrimes(count) {
  const isPrime = n => {
    for (let d = 3; d * d <= n; d += 2) {
      if (n % d === 0) {
        return false;
      }
    }

    return true;
  };
  const primes = [];

  for (let n = LARGEST_PRIME_BOUND - 1; primes.length < count; n -= 2) {
    if (isPrime(n)) {
      primes.push(n);
    }
  }

  return primes;
}

/**
 * Bounds log2 of the number of perfect matchings of the board's king's graph with the
 * Kahn-Lovasz theorem (proved by Alon and Friedland, 2008): a graph has at most
 * Prod_v (d(v)!)^(1/(2 d(v))) perfect matchings, where d(v) is the degree of the vertex v.
 * @param {number} rows The number of rows.
 * @param {number} cols The number of columns.
 * @returns {number} An upper bound on log2 of the number of tilings.
 */
function calculateLog2Bound(rows, cols) {
  let bound = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const height = Math.min(r + 1, rows - 1) - Math.max(r - 1, 0) + 1;
      const width = Math.min(c + 1, cols - 1) - Math.max(c - 1, 0) + 1;
      const degree = height * width - 1;
      let log2Factorial = 0;

      for (let k = 2; k <= degree; k++) {
        log2Factorial += Math.log2(k);
      }

      bound += degree ? log2Factorial / (2 * degree) : 0;
    }
  }

  return bound;
}

/**
 * Rebuilds a non-negative integer from its residues with the Chinese remainder theorem.
 * @param {number[]} residues The residues.
 * @param {number[]} primes The moduli.
 * @returns {BigInt} The unique solution in [0, product of the primes).
 */
function combineResidues(residues, primes) {
  let result = BigInt(0);
  let modulus = BigInt(1);

  residues.forEach((residue, i) => {
    const prime = BigInt(primes[i]);
    const difference = (((BigInt(residue) - result) % prime) + prime) % prime;
    const inverse = modularInverse(modulus % prime, prime);
    result += modulus * ((difference * inverse) % prime);
    modulus *= prime;
  });

  return result;
}

function modularInverse(value, modulus) {
  let [a, b, x, y] = [value, modulus, BigInt(1), BigInt(0)];

  while (b !== BigInt(0)) {
    const quotient = a / b;
    [a, b] = [b, a - quotient * b];
    [x, y] = [y, x - quotient * y];
  }

  return ((x % modulus) + modulus) % modulus;
}

/**
 * Rebuilds an integer from its residues and checks it: all primes but the last one give
 * the integer, the last prime is the check.
 * @param {number[]} residues The residues, one per prime.
 * @param {number[]} primes The moduli; their product without the last one must exceed twice
 * the absolute value of the integer when it may be negative.
 * @param {boolean} signed Whether the integer may be negative.
 * @returns {BigInt} The integer.
 */
function combineCheckedResidues(residues, primes, signed = false) {
  const modulus = primes.slice(0, -1).reduce((product, prime) => product * BigInt(prime), BigInt(1));
  const unsigned = combineResidues(residues.slice(0, -1), primes.slice(0, -1));
  const result = signed && BigInt(2) * unsigned > modulus ? unsigned - modulus : unsigned;
  const checkPrime = BigInt(primes.at(-1));

  if (((result % checkPrime) + checkPrime) % checkPrime !== BigInt(residues.at(-1))) {
    throw new Error(`The result does not match the residue modulo the check prime ${primes.at(-1)}.`);
  }

  return result;
}

/**
 * Runs one worker thread per task, at most `jobs` at a time. The worker runs `file` with the
 * task as its workerData and posts one result.
 * @param {string} file The script the workers run.
 * @param {Object[]} tasks The workerData of each worker.
 * @param {number} jobs The number of worker threads.
 * @returns {Promise<Array>} The results, in the order of the tasks.
 */
async function runWorkers(file, tasks, jobs) {
  const results = new Array(tasks.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await new Promise((resolve, reject) => {
        const worker = new Worker(file, { workerData: tasks[index] });
        worker.once('message', resolve);
        worker.once('error', reject);
        worker.once('exit', code =>
          reject(new Error(`The worker for task ${index + 1} of ${tasks.length} stopped with exit code ${code} before it sent a result.`)),
        );
      });
    }
  };

  await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, runWorker));

  return results;
}

module.exports = { listPrimes, calculateLog2Bound, combineResidues, combineCheckedResidues, runWorkers };
