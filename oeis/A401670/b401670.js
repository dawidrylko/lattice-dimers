const os = require('os');
const { isMainThread, parentPort, workerData } = require('worker_threads');
const { listPrimes, combineCheckedResidues, runWorkers } = require('../../js/core/modular');

function countRows({ cols, rows, start, prime }) {
  const corner = cols >= 3 ? 2 ** (cols + 2) : 0;
  const top = 2 ** (cols + 1);
  const size = 4 * top;
  const moves = Array.from({ length: cols }, (_, c) => {
    const bits = [2 ** cols, 2];
    if (c + 1 < cols) bits.push(2 ** (cols + 1));
    if (c > 0) bits.push(2 ** (cols - 1));
    if (c === 0) bits.push(2 ** (cols - 1), corner || 2 ** (2 * cols - 1));
    return bits;
  });
  let current = new Uint32Array(size), next = new Uint32Array(size);
  current[start] = 1;
  const add = (t, v) => {
    const x = next[t] + v;
    next[t] = x >= prime ? x - prime : x;
  };
  for (let cell = 0; cell < rows * cols; cell++) {
    const c = cell % cols;
    next.fill(0);
    for (let s = 0; s < size; s++) {
      const v = current[s];
      if (v === 0) continue;
      const flag = s & corner, window = s - flag;
      if (window & 1) {
        add(flag + (window >>> 1), v);
        continue;
      }
      for (const b of moves[c]) {
        if (b === corner) add(corner + (window >>> 1), v);
        else if (!(window & b)) add(flag + ((window | b) >>> 1), v);
      }
    }
    if (corner && c === cols - 3) {
      for (let s = corner; s < size; s++) {
        if (next[s]) {
          next[s - corner + top] = next[s];
          next[s] = 0;
        }
      }
    }
    [current, next] = [next, current];
  }
  return current[start];
}

function countTilings({ cols, rows, prime, starts, weights }) {
  let total = 0;
  starts.forEach((start, i) => (total = (total + weights[i] * countRows({ cols, rows, start, prime })) % prime));
  return total;
}

function log2Bound(cols, torus) {
  const cells = cols * cols;
  if (cols < 3) return (cells / 2) * Math.log2(5) + (torus ? cols : 0);
  const share = degree => {
    let log2Factorial = 0;
    for (let k = 2; k <= degree; k++) log2Factorial += Math.log2(k);
    return log2Factorial / (2 * degree);
  };
  return torus ? cells * share(8) : cols * (2 * share(5) + (cols - 2) * share(8));
}

function listOrbits(cols) {
  const full = 2 ** cols - 1;
  const rotate = set => ((set << 1) | (set >>> (cols - 1))) & full;
  const reflect = set => {
    let image = 0;
    for (let c = 0; c < cols; c++) if (set & (1 << c)) image |= 1 << (cols - 1 - c);
    return image;
  };
  const orbits = [];
  for (let set = 0; set <= full; set++) {
    const images = new Set();
    for (let i = 0, image = set; i < cols; i++, image = rotate(image)) images.add(image).add(reflect(image));
    if (Math.min(...images) === set) orbits.push([set, images.size]);
  }
  return orbits;
}

async function main() {
  const range = process.argv.slice(2);
  if (range.length !== 2 || !range.every(arg => /^[0-9]+$/.test(arg)) || Number(range[0]) > Number(range[1])) {
    console.error('Usage: b401670.js <first n> <last n>');
    process.exit(2);
  }
  const [from, to] = range.map(Number);
  const jobs = os.availableParallelism();
  const sides = [];
  for (let n = Math.max(from, 1); n <= to; n++) sides.push(2 * n);
  const primes = new Map(sides.map(cols => [cols, listPrimes(Math.ceil((log2Bound(cols, true) + 1) / 30) + 1)]));
  const tasks = sides.flatMap(cols => {
    const orbits = listOrbits(cols);
    const size = Math.ceil(orbits.length / jobs);
    const chunks = [];
    for (let i = 0; i < orbits.length; i += size) chunks.push(orbits.slice(i, i + size));
    return primes.get(cols).flatMap(prime =>
      chunks.map(chunk => ({ cols, rows: cols, prime, starts: chunk.map(([set]) => set), weights: chunk.map(([, weight]) => weight) })),
    );
  });
  const results = await runWorkers(__filename, tasks, jobs);
  const sums = new Map();
  tasks.forEach(({ cols, prime }, i) => {
    const key = `${cols} ${prime}`;
    sums.set(key, ((sums.get(key) ?? 0) + results[i]) % prime);
  });
  for (let n = from; n <= to; n++) {
    const cols = 2 * n;
    const count = n === 0 ? 1n : combineCheckedResidues(primes.get(cols).map(prime => sums.get(`${cols} ${prime}`)), primes.get(cols));
    console.log(n, count.toString());
  }
}

if (isMainThread) main();
else parentPort.postMessage(countTilings(workerData));
