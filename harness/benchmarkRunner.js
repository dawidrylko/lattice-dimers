const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseArgs, exec } = require('../js/core');
const { listImplementations, algorithmOf } = require('../js/core/registry');
const {
  filesInt,
  testCasesInt,
  filesBigInt,
  testCasesBigInt,
  filesDomicule,
  testCasesDomicule,
  filesPeriodic,
  testCasesPeriodic,
  testCasesPeriodicModular,
  filesDiagonal,
  testCasesDiagonal,
  testCasesDiagonalModular,
} = require('../js/core/cases');

const RUN_DATE = new Date().toISOString().slice(0, 10);
const BENCHMARK_ROOT = process.env.BENCHMARK_ROOT || path.join(__dirname, '..', 'benchmarks', 'results');
const BENCHMARK_DIRECTORY = path.join(BENCHMARK_ROOT, RUN_DATE.slice(0, 7));
const MACHINE_KEYS = ['node', 'python', 'rust', 'platform', 'cpu', 'timing'];
const TOOLCHAIN_KEYS = ['python', 'rust'];
const SOLVER_TIME = /^time ([\d.]+) ms$/m;
const ROOT_DIRECTORY = path.join(__dirname, '..');
const LANGUAGE_KEYS = { '.rs': 'rust', '.py': 'python' };
const PERIODIC_CASES = [...testCasesPeriodic, ...testCasesPeriodicModular];
const DIAGONAL_CASES = [...testCasesDiagonal, ...testCasesDiagonalModular];
const DOMICULE_BOARDS = [...testCasesDomicule, { rowCount: 20, colCount: 20 }];
const GROUPS = {
  '--domicule': [{ files: filesDomicule, testCases: DOMICULE_BOARDS }],
  '--torus': [{ files: filesPeriodic, testCases: withKnownCounts(listSquareBoards(2, 14, { lattice: 'king', torus: true }), PERIODIC_CASES) }],
  '--cylinder': [{ files: filesPeriodic, testCases: withKnownCounts(listSquareBoards(2, 16, { lattice: 'king' }), PERIODIC_CASES) }],
  '--diagonal': [{ files: filesDiagonal, testCases: withKnownCounts(listSquareBoards(0, 20), DIAGONAL_CASES) }],
};
const USAGE =
  'Usage: node harness/benchmarkRunner.js -n <numberOfExecutions> [-m <maxSize>] [-o <offset>] [--only <solver file>] [--domicule | --torus | --cylinder | --diagonal] [--force]';

function displayPath(file) {
  const relative = path.relative(path.join(__dirname, '..'), file);

  return relative.startsWith('..') ? file : relative;
}

function withKnownCounts(boards, cases) {
  const same = (board, known) =>
    ['rowCount', 'colCount', 'lattice', 'torus', 'twisted'].every(key => (board[key] ?? false) === (known[key] ?? false));

  return boards.map(board => {
    const known = cases.find(candidate => same(board, candidate));

    return known ? { ...board, expectedResult: known.expectedResult } : board;
  });
}

function listSquareBoards(minSide, maxSide, options = {}) {
  return Array.from({ length: (maxSide - minSide) / 2 + 1 }, (_, i) => ({
    rowCount: minSide + 2 * i,
    colCount: minSide + 2 * i,
    ...options,
  }));
}

function readOnlyArg(argv) {
  const index = argv.indexOf('--only');

  return index === -1 ? null : argv[index + 1] ?? '';
}

function selectFiles(files, only) {
  return only === null ? files : files.filter(fileName => fileName === only);
}

function listBenchmarkedFiles(fileName) {
  return listImplementations(algorithmOf(fileName)).map(({ file }) => file);
}

function calculateAverageTime(times) {
  return Number((times.reduce((sum, time) => sum + time, 0) / times.length).toFixed(3));
}

function readVersion(program, args) {
  const { status, stdout, stderr } = spawnSync(program, args, { cwd: ROOT_DIRECTORY, encoding: 'utf-8' });

  return status === 0 ? `${stdout}${stderr}`.trim() : null;
}

function listSolverArguments({ rowCount, colCount, lattice, torus, twisted }) {
  return [
    '-r',
    String(rowCount),
    '-c',
    String(colCount),
    ...(lattice ? ['--lattice', lattice] : []),
    ...(torus ? ['--torus'] : []),
    ...(twisted ? ['--twisted'] : []),
    '--time',
  ];
}

function ensureDirectoryExists(directory) {
  if (fs.existsSync(directory)) {
    return;
  }

  fs.mkdirSync(directory, { recursive: true });
}

function generateFileName(options) {
  const { directory, fileName, rowCount, colCount, lattice, torus } = options;
  const surface = lattice ? `-${lattice}-${torus ? 'torus' : 'cylinder'}` : '';

  return path.join(directory, `${path.basename(fileName)}_${rowCount}x${colCount}${surface}.txt`);
}

function generateContent({ executionTimes, processTimes, load }) {
  return [
    `Average Execution Time: ${calculateAverageTime(executionTimes)} ms`,
    `Average Process Time: ${calculateAverageTime(processTimes)} ms`,
    `Load Average Before: ${load}`,
    '---',
    ...executionTimes.map((time, i) => `${i + 1}. Execution Time: ${time} ms, Process Time: ${processTimes[i]} ms`),
  ].join('\n');
}

function describeMachine() {
  const cpus = os.cpus();

  return {
    date: RUN_DATE,
    timing: 'solver',
    commit: readVersion('git', ['rev-parse', 'HEAD']),
    dirty: readVersion('git', ['status', '--porcelain', '--', '.', ':!benchmarks/results']) !== '',
    node: process.version,
    python: readVersion(process.env.PYTHON || 'python3', ['--version']),
    rust: readVersion('rustc', ['--version']),
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: cpus.length ? cpus[0].model.trim() : null,
    cores: cpus.length || null,
    memory: `${Math.round(os.totalmem() / 2 ** 30)} GB`,
  };
}

function checkDirectory(environment, force) {
  const file = path.join(BENCHMARK_DIRECTORY, 'environment.json');

  if (force || !fs.existsSync(file)) {
    return;
  }

  const recorded = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const differences = MACHINE_KEYS.filter(
    key => recorded[key] !== environment[key] && !(TOOLCHAIN_KEYS.includes(key) && recorded[key] && environment[key] === null),
  );

  if (differences.length) {
    throw new Error(
      `${displayPath(BENCHMARK_DIRECTORY)} holds results measured on another machine or toolchain (${differences
        .map(key => `${key} ${recorded[key] ?? 'not recorded'} instead of ${environment[key] ?? 'not found'}`)
        .join(', ')}). Run with --force to overwrite them.`,
    );
  }
}

function saveEnvironment(environment) {
  const file = path.join(BENCHMARK_DIRECTORY, 'environment.json');
  const recorded = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : {};
  const kept = Object.fromEntries(TOOLCHAIN_KEYS.filter(key => environment[key] === null && recorded[key]).map(key => [key, recorded[key]]));

  ensureDirectoryExists(BENCHMARK_DIRECTORY);
  fs.writeFileSync(file, `${JSON.stringify({ ...environment, ...kept }, null, 2)}\n`);
}

function selectTestCases(testCases, offset, maxSize) {
  return testCases.slice(offset, maxSize ? offset + maxSize : undefined);
}

function saveExecutionResults(options) {
  const directory = BENCHMARK_DIRECTORY;

  ensureDirectoryExists(directory);

  const resultFileName = generateFileName({ directory, ...options });

  fs.writeFileSync(resultFileName, generateContent(options));
  console.log(`File saved: ${displayPath(resultFileName)}`);
}

/**
 * Runs one implementation of a solver with --time and returns both times: the time of the count the solver
 * reports on standard error, and the time of the whole process. The count must match the expected result
 * when the case gives one.
 * @param {Object} testCase The implementation file, the board and its expected result if known.
 * @returns {{execution: number, process: number}} The two times in milliseconds.
 * @throws {Error} When the solver fails, reports no time or prints another count.
 */
function measure(testCase) {
  const [program, ...launchArgs] = exec.launch(testCase.fileName);
  const start = process.hrtime.bigint();
  const { status, stdout, stderr, error } = spawnSync(program, [...launchArgs, ...listSolverArguments(testCase)], {
    encoding: 'utf-8',
    maxBuffer: 2 ** 26,
  });
  const processTime = Number(process.hrtime.bigint() - start) / 1e6;
  const reported = (stderr || '').match(SOLVER_TIME);

  if (error || status !== 0 || !reported) {
    throw new Error(error ? error.message : `exit code ${status}, ${(stderr || '').trim() || 'no time reported'}`);
  }

  if (testCase.expectedResult !== undefined && stdout.trim() !== String(testCase.expectedResult)) {
    throw new Error(`counted ${stdout.trim()} instead of ${testCase.expectedResult}`);
  }

  return { execution: Number(reported[1]), process: Number(processTime.toFixed(3)) };
}

function runBenchmarkTest(testCase) {
  const { fileName, numberOfExecutions } = testCase;
  const executionTimes = [];
  const processTimes = [];
  const load = os.loadavg().map(value => value.toFixed(2)).join(' ');

  for (let i = 0; i < numberOfExecutions; i++) {
    try {
      const { execution, process: processTime } = measure(testCase);
      executionTimes.push(execution);
      processTimes.push(processTime);
    } catch (error) {
      console.error(`Error running program in file ${fileName}: ${error.message}`);

      return false;
    }
  }

  saveExecutionResults({ ...testCase, executionTimes, processTimes, load });

  return true;
}

function executeBenchmark(options, files, testCases) {
  const pairs = files.flatMap(listBenchmarkedFiles).flatMap(fileName =>
    testCases.map(testCase => ({ ...options, fileName, ...testCase })),
  );
  const allPassed = pairs.every((testCase, index) => {
    process.stdout.write(
      `Executing benchmark ${index + 1} of ${pairs.length} for ${
        testCase.fileName
      }... `,
    );

    return runBenchmarkTest(testCase);
  });

  return allPassed;
}

function __main__() {
  try {
    const argsSchema = {
      '-n': 'numberOfExecutions',
      '-m': 'maxSize',
      '-o': 'offset',
    };
    const argv = process.argv.slice(2);
    const {
      numberOfExecutions,
      maxSize,
      offset = 0,
    } = parseArgs(argv, argsSchema);
    const only = readOnlyArg(argv);
    const flags = Object.keys(GROUPS).filter(flag => argv.includes(flag));
    const groups = flags.length
      ? GROUPS[flags[0]]
      : [
          { files: filesInt, testCases: testCasesInt },
          { files: filesBigInt, testCases: testCasesBigInt },
        ];

    if (
      flags.length > 1 ||
      !(numberOfExecutions > 0) ||
      (maxSize !== undefined && !(maxSize > 0)) ||
      !(offset >= 0) ||
      (only !== null && !groups.some(({ files }) => files.includes(only)))
    ) {
      throw new Error(USAGE);
    }

    const options = { numberOfExecutions };
    const runs = groups.map(({ files, testCases }) => ({
      files: selectFiles(files, only),
      testCases: selectTestCases(testCases, offset, maxSize),
    }));

    if (!runs.some(({ files, testCases }) => files.length && testCases.length)) {
      throw new Error(`No test cases from test case ${offset + 1}. ${USAGE}`);
    }

    console.log(
      `Starting benchmark execution with ${numberOfExecutions} executions each for ${maxSize || 'all available'} test cases from test case ${offset + 1}...`,
    );

    const environment = describeMachine();
    const missing = [...new Set(runs.flatMap(({ files }) => files.flatMap(listBenchmarkedFiles)).map(file => LANGUAGE_KEYS[path.extname(file)]))]
      .filter(key => key && environment[key] === null);

    if (missing.length) {
      throw new Error(`The run includes ${missing.join(' and ')} but cannot read its version (${missing.map(key => (key === 'rust' ? 'rustc' : '$PYTHON or python3')).join(', ')} --version).`);
    }

    checkDirectory(environment, argv.includes('--force'));
    saveEnvironment(environment);

    const results = runs.map(({ files, testCases }) => executeBenchmark(options, files, testCases));

    if (results.every(Boolean)) {
      console.log('All benchmarks completed successfully.');
      process.exit(0);
    } else {
      console.error('Some benchmarks failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

__main__();
