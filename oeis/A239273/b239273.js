const os = require('os');
const { isMainThread, parentPort, workerData } = require('worker_threads');
const { listPrimes, calculateLog2Bound, combineCheckedResidues, runWorkers } = require('../../js/core/modular');

function countStrips({ cols, rows, prime }) {
  const size = 2 ** (cols + 1);
  let current = new Uint32Array(size), next = new Uint32Array(size);
  const counts = [];
  current[0] = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bits = [2 ** cols];
      if (c + 1 < cols) bits.push(2, 2 ** (cols + 1));
      if (c > 0) bits.push(2 ** (cols - 1));
      next.fill(0);
      for (let s = 0; s < size; s++) {
        const v = current[s];
        if (v === 0) continue;
        if (s & 1) {
          const t = s >>> 1, x = next[t] + v;
          next[t] = x >= prime ? x - prime : x;
          continue;
        }
        for (const b of bits) {
          if (s & b) continue;
          const t = (s | b) >>> 1, x = next[t] + v;
          next[t] = x >= prime ? x - prime : x;
        }
      }
      [current, next] = [next, current];
    }
    counts.push(current[0]);
  }
  return counts;
}

async function main() {
  const range = process.argv.slice(2);
  if (range.length !== 2 || !range.every(arg => /^[0-9]+$/.test(arg)) || Number(range[0]) > Number(range[1])) {
    console.error('Usage: b239273.js <first n> <last n>');
    process.exit(2);
  }
  const [from, to] = range.map(Number);
  const sides = [];
  for (let n = Math.max(from, 1); n <= to; n++) sides.push(2 * n);
  const primes = new Map(sides.map(side => [side, listPrimes(Math.ceil((calculateLog2Bound(side, side) + 1) / 30) + 1)]));
  const tasks = sides.flatMap(side => primes.get(side).map(prime => ({ cols: side, rows: side, prime })));
  const results = await runWorkers(__filename, tasks, os.availableParallelism());
  const residues = new Map();
  tasks.forEach(({ cols }, i) => residues.set(cols, [...(residues.get(cols) ?? []), results[i].at(-1)]));
  for (let n = from; n <= to; n++) {
    const count = n === 0 ? 1n : combineCheckedResidues(residues.get(2 * n), primes.get(2 * n));
    console.log(n, count.toString());
  }
}

if (isMainThread) main();
else parentPort.postMessage(countStrips(workerData));
