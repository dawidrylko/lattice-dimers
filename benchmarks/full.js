const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const exec = require('./executor');
const { listImplementations, algorithmOf } = require('../js/core/registry');
const {
  BENCHMARK_DIRECTORY,
  DOMINO_GROUP,
  ENVIRONMENT,
  NUMBER_GROUP,
  checkDirectory,
  generateFileName,
  listGroups,
  listSquareBoards,
  measure,
  saveEnvironment,
  saveExecutionResults,
} = require('./runner');
const { RESULTS_DIRECTORY } = require('./environment');
const { formerResultName } = require('../site/benchmarkRuns');

const RUNS = 10;
const DEFAULT_JOBS = 4;
const USAGE = 'Usage: node benchmarks/full.js [<solver id>] [--board-budget-hours <hours>] [--stop-after-hours <hours>] [--jobs <threads>] [--skip-instructions] [--force]';
const STATE_GROWTH = 4.4;
const TORUS_GROWTH = 16;
const GROWTH_FLOORS = [
  [/^all[-_]lattices.*bigint.*king-torus/, 51],
  [/^all[-_]lattices.*bigint.*square-torus/, 23],
  [/^all[-_]lattices.*bigint.*king-cylinder/, 12.87],
  [/^all[-_]lattices.*bigint.*square-cylinder/, 5.83],
  [/^all[-_]lattices.*torus$/, TORUS_GROWTH],
  [/^domicule[-_]rectangle[-_]polynomial[-_]bigint/, 10],
  [/^domicule[-_]rectangle[-_]polynomial[-_]modular/, 5],
  [/^domicule[-_]cylinder[-_]torus[-_]polynomial[-_]bigint.*torus$/, 51],
  [/^domicule[-_]cylinder[-_]torus[-_]polynomial[-_]bigint.*cylinder$/, 24],
  [/^domicule[-_]cylinder[-_]torus[-_]polynomial[-_]modular.*torus$/, 37],
  [/^domicule[-_]cylinder[-_]torus[-_]polynomial[-_]modular.*cylinder$/, 8],
];
const INSTRUCTION_BOARDS = [
  { id: 'domino-rectangle-formula', args: ['-r', '20', '-c', '20'] },
  { id: 'domino-rectangle-number', args: ['-r', '8', '-c', '8'] },
  { id: 'domino-rectangle-bigint', args: ['-r', '8', '-c', '8'] },
  { id: 'domicule-rectangle-modular', args: ['-r', '8', '-c', '8', '-j', '1'] },
  { id: 'domicule-rectangle-bigint', args: ['-r', '8', '-c', '8'] },
  { id: 'domicule-rectangle-polynomial-modular', args: ['-r', '6', '-c', '6', '-j', '1'] },
  { id: 'domicule-rectangle-polynomial-bigint', args: ['-r', '6', '-c', '6'] },
  { id: 'all-lattices-cylinder-torus-modular', args: ['-r', '8', '-c', '8', '--lattice', 'king', '-j', '1'] },
  { id: 'all-lattices-cylinder-torus-bigint', args: ['-r', '6', '-c', '6', '--lattice', 'king'] },
  { id: 'domicule-cylinder-torus-polynomial-modular', args: ['-r', '8', '-c', '8', '-j', '1'] },
  { id: 'domicule-cylinder-torus-polynomial-bigint', args: ['-r', '6', '-c', '6'] },
];
const INSTRUCTION_RUNS = 3;
const MIN_RUN_TIMEOUT_SECONDS = 60;
const OUT_OF_REACH = /ETIMEDOUT|exit code (null|134|137)|memory|Invalid array length|allocation/i;

function growthFloor(seriesName) {
  return GROWTH_FLOORS.find(([pattern]) => pattern.test(seriesName))?.[1] ?? STATE_GROWTH;
}

function estimateBoard({ seriesName, previousSeconds, earlierSeconds }) {
  if (previousSeconds === null) {
    return 0;
  }

  const observed = earlierSeconds > 0 ? previousSeconds / earlierSeconds : 0;

  return previousSeconds * Math.max(growthFloor(seriesName), observed);
}

function parseInstructionCount(output) {
  const match = output.match(/I\s+refs:\s+([\d,]+)/);

  return match ? Number(match[1].replaceAll(',', '')) : null;
}

function listSeries(jobs) {
  const series = [];
  const add = (files, boards, suffix = '') =>
    files.flatMap(fileName => listImplementations(algorithmOf(fileName))).forEach(({ file }) => {
      const modular = /modular/.test(path.basename(file));

      series.push({
        name: `${path.basename(file)}${suffix}`,
        boards: boards.map(board => ({ ...board, fileName: file, numberOfExecutions: RUNS, ...(modular ? { jobs } : {}) })),
      });
    });
  const numberBoards = [
    ...NUMBER_GROUP.testCases,
    ...listSquareBoards(12, 20).filter(({ rowCount }) => !NUMBER_GROUP.testCases.some(known => known.rowCount === rowCount && known.colCount === rowCount)),
  ];

  add(NUMBER_GROUP.files, numberBoards);
  add(DOMINO_GROUP.files, DOMINO_GROUP.testCases);

  const king = listGroups('king');
  const square = listGroups('square');

  king['--domicule'].forEach(({ files, testCases }) => add(files, testCases));
  king['--diagonal'].forEach(({ files, testCases }) => add(files, testCases));
  [
    ['king', 'torus', king['--torus']],
    ['king', 'cylinder', king['--cylinder']],
    ['square', 'torus', square['--torus']],
    ['square', 'cylinder', square['--cylinder']],
  ].forEach(([lattice, surface, groups]) =>
    groups.forEach(({ files, testCases }) => add(files, testCases, `-${lattice}-${surface}`)),
  );
  ['torus', 'cylinder'].forEach(surface => king[`--diagonal-${surface}`].forEach(({ files, testCases }) => add(files, testCases, `-${surface}`)));

  return series;
}

function readRecordedTimes(file, runs) {
  if (!fs.existsSync(file)) {
    return null;
  }

  const times = [...fs.readFileSync(file, 'utf-8').matchAll(/^\d+\. Execution Time: ([\d.]+) ms/gm)].map(match => Number(match[1]));

  return times.length >= runs ? times : null;
}

function median(times) {
  return [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)];
}

function solverOf(seriesName) {
  return seriesName.split('.')[0].replaceAll('_', '-');
}

function readState() {
  const file = path.join(BENCHMARK_DIRECTORY, 'plan.json');

  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : { notMeasured: [] };
}

function isEverySeriesSettled(series, notMeasured) {
  return series.every(({ name, boards }) =>
    boards.every(board => fs.existsSync(generateFileName({ directory: BENCHMARK_DIRECTORY, ...board })) || notMeasured.some(entry => entry.series === name && entry.board === `${board.rowCount}x${board.colCount}`)),
  );
}

function saveState(state) {
  fs.writeFileSync(path.join(BENCHMARK_DIRECTORY, 'plan.json'), `${JSON.stringify(state, null, 2)}\n`);
}

function measureBoard(board, budgetSeconds) {
  const executionTimes = [];
  const processTimes = [];
  const timeout = Number.isFinite(budgetSeconds) ? Math.ceil(Math.max((budgetSeconds / RUNS) * 2, MIN_RUN_TIMEOUT_SECONDS) * 1000) : undefined;

  for (let i = 0; i < RUNS; i++) {
    const { execution, process: processTime } = measure({ ...board, timeout });

    executionTimes.push(execution);
    processTimes.push(processTime);
  }

  saveExecutionResults({ ...board, executionTimes, processTimes, load: `see host-load-${String(ENVIRONMENT.commit).slice(0, 12)}.txt` });

  return executionTimes;
}

function runPlan(budgetSeconds, jobs, solver, stopAfterSeconds) {
  const started = Date.now();
  const selected = listSeries(jobs).filter(({ name }) => solver === null || solverOf(name) === solver);
  const selectedNames = new Set(selected.map(({ name }) => name));
  const heads = selected.map(series => ({ ...series, index: 0, previousSeconds: null, earlierSeconds: 0 }));
  const state = {
    budgetHours: Number.isFinite(budgetSeconds) ? budgetSeconds / 3600 : null,
    runs: RUNS,
    jobs,
    notMeasured: readState().notMeasured.filter(({ series }) => !selectedNames.has(series)),
  };
  const stop = (head, reason, estimateSeconds) => {
    head.boards.slice(head.index).forEach(({ rowCount, colCount }, i) =>
      state.notMeasured.push({ series: head.name, board: `${rowCount}x${colCount}`, reason, ...(i === 0 && estimateSeconds ? { estimateTenRunsHours: Number((estimateSeconds * RUNS / 3600).toPrecision(3)) } : {}) }),
    );
    head.index = head.boards.length;
  };

  for (;;) {
    const open = heads.filter(head => head.index < head.boards.length);

    if (!open.length) {
      break;
    }

    if (Date.now() - started > stopAfterSeconds * 1000) {
      return { ...state, stopped: true };
    }

    const estimates = open.map(head => ({ head, estimate: estimateBoard({ seriesName: head.name, previousSeconds: head.previousSeconds, earlierSeconds: head.earlierSeconds }) }));
    const { head, estimate } = estimates.reduce((best, next) => (next.estimate < best.estimate ? next : best));

    if (estimate * RUNS > budgetSeconds) {
      stop(head, 'over budget', estimate);
      saveState(state);
      continue;
    }

    const board = head.boards[head.index];
    const file = generateFileName({ directory: BENCHMARK_DIRECTORY, ...board });
    let times = readRecordedTimes(file, RUNS);

    try {
      times = times ?? measureBoard(board, budgetSeconds);
      head.earlierSeconds = head.previousSeconds ?? 0;
      head.previousSeconds = median(times) / 1000;
      head.index++;
    } catch (error) {
      if (!OUT_OF_REACH.test(error.message)) {
        throw new Error(`${board.fileName}: ${error.message}`);
      }

      stop(head, `failed: ${error.message}`.slice(0, 200));
    }

    saveState(state);
  }

  return state;
}

function runInstructions() {
  const file = path.join(BENCHMARK_DIRECTORY, 'instructions.json');

  if (fs.existsSync(file)) {
    return;
  }

  const results = INSTRUCTION_BOARDS.flatMap(({ id, args }) =>
    listImplementations(id).map(({ file }) => {
      const counts = [];

      for (let i = 0; i < INSTRUCTION_RUNS; i++) {
        const [program, ...launchArgs] = exec.launchBuilt(file);
        const { stderr } = spawnSync('valgrind', ['--tool=cachegrind', '--cache-sim=no', '--cachegrind-out-file=/dev/null', program, ...launchArgs, ...args], { encoding: 'utf-8', maxBuffer: 2 ** 26 });
        const count = parseInstructionCount(stderr);

        if (count === null) {
          throw new Error(`Cachegrind gave no count for ${file}: ${stderr.trim().slice(-200)}`);
        }

        counts.push(count);
      }

      return { file: path.basename(file), board: args.join(' '), counts, instructions: median(counts) };
    }),
  );

  fs.writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
}

function readValgrind() {
  const { status, stdout } = spawnSync('valgrind', ['--version'], { encoding: 'utf-8' });

  return status === 0 ? stdout.trim() : null;
}

function compareRuns(before, after) {
  const read = directory =>
    Object.fromEntries(
      fs.existsSync(directory)
        ? fs.readdirSync(directory)
            .filter(name => name.endsWith('.txt') && name !== 'host-load.txt')
            .map(name => [name, median([...fs.readFileSync(path.join(directory, name), 'utf-8').matchAll(/^\d+\. Execution Time: ([\d.]+) ms/gm)].map(match => Number(match[1])))])
        : [],
    );
  const beforeTimes = read(before);
  const afterTimes = read(after);

  const beforeOf = name => beforeTimes[name] ?? beforeTimes[formerResultName(name)];

  return Object.keys(afterTimes)
    .filter(name => beforeOf(name) > 0 && afterTimes[name] > 0)
    .map(name => ({ name, before: beforeOf(name), after: afterTimes[name], ratio: Number((afterTimes[name] / beforeOf(name)).toFixed(3)) }))
    .sort((a, b) => b.ratio - a.ratio);
}

function __main__() {
  const argv = process.argv.slice(2);
  const read = flag => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : null);
  const optionsWithValue = ['--board-budget-hours', '--stop-after-hours', '--jobs'];
  const positional = argv.filter((arg, i) => !arg.startsWith('--') && !optionsWithValue.includes(argv[i - 1]));

  if (argv[0] === 'compare') {
    const [before, after] = argv.slice(1).map(name => path.join(RESULTS_DIRECTORY, name));

    compareRuns(before, after).forEach(({ name, before: a, after: b, ratio }) => console.log(`${ratio}\t${a} ms\t${b} ms\t${name}`));

    return;
  }

  const budgetHours = Number(read('--board-budget-hours') ?? Infinity);
  const jobs = Number(read('--jobs') ?? DEFAULT_JOBS);

  if (!(budgetHours > 0) || !Number.isInteger(jobs) || jobs < 1) {
    throw new Error(USAGE);
  }

  if (!ENVIRONMENT.rust || !ENVIRONMENT.python) {
    throw new Error('A full run needs readable Rust and Python versions (rustc, $PYTHON or python3).');
  }

  if (ENVIRONMENT.dirty) {
    throw new Error('A full run needs a clean checkout: its commit must identify the code.');
  }

  checkDirectory(ENVIRONMENT, argv.includes('--force'));
  saveEnvironment({ ...ENVIRONMENT, valgrind: readValgrind(), complete: false });

  if (!argv.includes('--skip-instructions')) {
    runInstructions();
  }

  const solver = positional[0] ?? null;
  const stopAfterHours = Number(read('--stop-after-hours') ?? Infinity);

  if (solver !== null && !listSeries(jobs).some(({ name }) => solverOf(name) === solver)) {
    throw new Error(`No solver ${solver}. The solvers: ${[...new Set(listSeries(jobs).map(({ name }) => solverOf(name)))].join(', ')}.`);
  }

  if (!(stopAfterHours > 0)) {
    throw new Error(USAGE);
  }

  const { notMeasured } = runPlan(budgetHours * 3600, jobs, solver, stopAfterHours * 3600);
  const complete = isEverySeriesSettled(listSeries(jobs), notMeasured);

  saveEnvironment({ ...ENVIRONMENT, valgrind: readValgrind(), complete });
  console.log(complete ? 'Every board is measured or recorded in plan.json.' : 'The run is not complete yet: run the command again for the rest.');
}

if (require.main === module) {
  try {
    __main__();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { estimateBoard, parseInstructionCount, compareRuns, listSeries, growthFloor };
