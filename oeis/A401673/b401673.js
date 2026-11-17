const os = require('os');
const { isMainThread, parentPort, workerData } = require('worker_threads');
const { listPrimes, calculateLog2Bound, combineCheckedResidues, runWorkers } = require('../../js/core/modular');

function evaluate(cols, prime, weight) {
  const size = 2 ** (cols + 1);
  let current = new Uint32Array(size), next = new Uint32Array(size);
  const moves = Array.from({ length: cols }, (_, c) => {
    const bits = [2 ** cols], factors = [1];
    if (c + 1 < cols) bits.push(2, 2 ** (cols + 1)), factors.push(1, weight);
    if (c > 0) bits.push(2 ** (cols - 1)), factors.push(weight);
    return { bits, factors };
  });
  current[0] = 1;
  for (let cell = 0; cell < cols * cols; cell++) {
    const { bits, factors } = moves[cell % cols];
    next.fill(0);
    for (let s = 0; s < size; s++) {
      const v = current[s];
      if (v === 0) continue;
      if (s & 1) {
        const t = s >>> 1, x = next[t] + v;
        next[t] = x >= prime ? x - prime : x;
        continue;
      }
      for (let i = 0; i < bits.length; i++) {
        if (s & bits[i]) continue;
        const t = (s | bits[i]) >>> 1, x = next[t] + (factors[i] === 1 ? v : (v * factors[i]) % prime);
        next[t] = x >= prime ? x - prime : x;
      }
    }
    [current, next] = [next, current];
  }
  return current[0];
}

function power(base, exponent, modulus) {
  let result = 1n;
  for (; exponent > 0n; exponent >>= 1n, base = (base * base) % modulus) if (exponent & 1n) result = (result * base) % modulus;
  return result;
}

function interpolate(values, prime) {
  const p = BigInt(prime), degree = values.length - 1;
  const points = values.map((_, j) => BigInt(j * j) % p);
  let master = [1n];
  for (const u of points) master = [...master, 0n].map((m, i) => (((i ? master[i - 1] : 0n) - u * (master[i] ?? 0n)) % p + p) % p);
  const result = new Array(degree + 1).fill(0n);
  points.forEach((u, j) => {
    const quotient = new Array(degree + 1);
    quotient[degree] = master[degree + 1];
    for (let i = degree; i >= 1; i--) quotient[i - 1] = (master[i] + u * quotient[i]) % p;
    const denominator = quotient.reduceRight((sum, q) => (sum * u + q) % p, 0n);
    const factor = (BigInt(values[j]) * power(denominator, p - 2n, p)) % p;
    quotient.forEach((q, i) => (result[i] = (result[i] + factor * q) % p));
  });
  return result.map(Number);
}

const rowStart = n => ((n - 1) * n * (2 * n - 1)) / 6 + n;

async function main() {
  const range = process.argv.slice(2);
  if (range.length !== 2 || !range.every(arg => /^[0-9]+$/.test(arg)) || Number(range[0]) > Number(range[1])) {
    console.error('Usage: b401673.js <first n> <last n>');
    process.exit(2);
  }
  const [from, to] = range.map(Number);
  const jobs = os.availableParallelism();
  const terms = [];
  for (let i = from, n = 0; i <= to; i++) {
    while (rowStart(n + 1) <= i) n++;
    terms.push([n, i - rowStart(n)]);
  }
  const sides = [...new Set(terms.map(([n]) => n))].filter(n => n > 0);
  const primes = new Map(sides.map(n => [n, listPrimes(Math.ceil((calculateLog2Bound(2 * n, 2 * n) + 1) / 30) + 1)]));
  const tasks = sides.flatMap(n => {
    const size = Math.ceil((n * n + 1) / jobs);
    return primes.get(n).flatMap(prime => {
      const chunks = [];
      for (let j = 0; j <= n * n; j += size) chunks.push({ n, prime, weights: Array.from({ length: Math.min(size, n * n + 1 - j) }, (_, i) => j + i) });
      return chunks;
    });
  });
  const results = await runWorkers(__filename, tasks, jobs);
  const values = new Map();
  tasks.forEach(({ n, prime }, i) => values.set(`${n} ${prime}`, [...(values.get(`${n} ${prime}`) ?? []), ...results[i]]));
  const coefficients = new Map(sides.map(n => [n, primes.get(n).map(prime => interpolate(values.get(`${n} ${prime}`), prime))]));
  terms.forEach(([n, k], i) => {
    const count = n === 0 ? 1n : combineCheckedResidues(coefficients.get(n).map(row => row[k]), primes.get(n));
    console.log(from + i, count.toString());
  });
}

if (isMainThread) main();
else parentPort.postMessage(workerData.weights.map(weight => evaluate(2 * workerData.n, workerData.prime, weight)));
