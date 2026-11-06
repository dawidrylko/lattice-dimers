const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('../js/core');
const { listImplementations } = require('../js/core/registry');

const BOARDS = [
  { id: 'domicule-rectangle-modular', args: ['-r', '18', '-c', '18', '-j', '4'] },
  { id: 'domino-rectangle-bigint', args: ['-r', '16', '-c', '16'] },
  { id: 'all-lattices-cylinder-torus-modular', args: ['-r', '16', '-c', '16', '--lattice', 'king', '-j', '4'] },
];
const SOLVER_TIME = /^time ([\d.]+) ms$/m;

function readValue(flag, fallback) {
  const index = process.argv.indexOf(flag);

  return index === -1 ? fallback : process.argv[index + 1];
}

function shuffled(items) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function languageOf(file) {
  return path.extname(file).slice(1);
}

function runOnce(file, args) {
  const [program, ...launchArgs] = exec.launch(file);
  const { status, stderr } = spawnSync(program, [...launchArgs, ...args, '--time'], { encoding: 'utf-8' });
  const reported = (stderr || '').match(SOLVER_TIME);

  if (status !== 0 || !reported) {
    throw new Error(`${file}: exit code ${status}, ${(stderr || '').trim()}`);
  }

  return Number(reported[1]);
}

function summarize(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
  const deviation = Math.sqrt(times.reduce((sum, time) => sum + (time - mean) ** 2, 0) / (times.length - 1));

  return {
    runs: times.length,
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
    cv: Number((100 * deviation / mean).toFixed(2)),
    spread: Number((100 * (sorted[sorted.length - 1] - sorted[0]) / sorted[0]).toFixed(2)),
  };
}

function __main__() {
  const series = readValue('--series', 'unnamed');
  const runs = Number(readValue('--runs', '15'));
  const output = readValue('--out', null);
  const started = new Date().toISOString();
  const entries = BOARDS.flatMap(({ id, args }) => listImplementations(id).map(({ file }) => ({ id, args, file, times: [] })));
  const loads = [];

  for (let round = 0; round < runs; round++) {
    loads.push(os.loadavg()[0]);
    shuffled(entries).forEach(entry => entry.times.push(runOnce(entry.file, entry.args)));
    console.error(`${series}: round ${round + 1} of ${runs}, load ${loads[loads.length - 1].toFixed(2)}`);
  }

  const results = entries.map(({ id, args, file, times }) => ({ id, board: args.join(' '), language: languageOf(file), ...summarize(times), times }));
  const report = {
    series,
    started,
    finished: new Date().toISOString(),
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    cpus: os.cpus().length,
    memoryGb: Math.round(os.totalmem() / 2 ** 30),
    loadFirst: loads[0],
    loadMax: Math.max(...loads),
    results,
  };

  results.forEach(({ id, language, median, cv, spread }) => console.log(`${series} ${id} ${language} median ${median} ms cv ${cv}% spread ${spread}%`));

  if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  }
}

__main__();
