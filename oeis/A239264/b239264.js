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

function board(n) {
  let d = 0;
  while (((d + 1) * (d + 2)) / 2 <= n) d++;
  const h = n - (d * (d + 1)) / 2;
  return [Math.min(h, d - h), Math.max(h, d - h)];
}

async function main() {
  const range = process.argv.slice(2);
  if (range.length !== 2 || !range.every(arg => /^[0-9]+$/.test(arg)) || Number(range[0]) > Number(range[1])) {
    console.error('Usage: b239264.js <first n> <last n>');
    process.exit(2);
  }
  const [from, to] = range.map(Number);
  const boards = [];
  for (let n = from; n <= to; n++) boards.push(board(n));
  const longest = new Map();
  for (const [cols, rows] of boards) if (cols > 0 && (cols * rows) % 2 === 0) longest.set(cols, Math.max(rows, longest.get(cols) ?? 0));
  const primes = new Map([...longest].map(([cols, rows]) => [cols, listPrimes(Math.ceil((calculateLog2Bound(rows, cols) + 1) / 30) + 1)]));
  const tasks = [...longest].flatMap(([cols, rows]) => primes.get(cols).map(prime => ({ cols, rows, prime })));
  const results = await runWorkers(__filename, tasks, os.availableParallelism());
  const residues = new Map();
  tasks.forEach(({ cols }, i) => residues.set(cols, [...(residues.get(cols) ?? []), results[i]]));
  boards.forEach(([cols, rows], i) => {
    let count = 1n;
    if (cols > 0) count = (cols * rows) % 2 ? 0n : combineCheckedResidues(residues.get(cols).map(counts => counts[rows - 1]), primes.get(cols));
    console.log(from + i, count.toString());
  });
}

if (isMainThread) main();
else parentPort.postMessage(countStrips(workerData));
