const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec, parseArgs, verifyInt, verifyBigInt } = require('../js/core');
const { listPrimes, combineCheckedResidues } = require('../js/core/modular');
const periodicModular = require('../js/solvers/periodicTilingSolver-Modular.js');
const { capThreads } = require('../js/solvers/domiculeDiagonalSolver-Modular.js');
const { readBenchmarkRuns } = require('../site/benchmarkRuns.js');
const { readRepository, listPortErrors } = require('./portCheck.js');
const { registry, listImplementations, algorithmOf } = require('../js/core/registry.js');
const {
  filesInt,
  testCasesInt,
  filesBigInt,
  testCasesBigInt,
  filesRectangles,
  testCasesRectangles,
  filesDomicule,
  testCasesDomicule,
  filesDomiculeRectangles,
  testCasesDomiculeRectangles,
  filesPeriodic,
  testCasesPeriodic,
  filesPeriodicModular,
  testCasesPeriodicModular,
  filesDiagonal,
  testCasesDiagonal,
  filesDiagonalModular,
  testCasesDiagonalModular,
} = require('../js/core/cases');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const REJECTION_TIMEOUT = 30000;
const MAX_PORTED_BIGINT_SIDE = 16;
const parserTestCases = [
  { value: '12', expectedResult: 12 },
  { value: '0', expectedResult: 0 },
  { value: '2abc', expectedResult: NaN },
  { value: '-2', expectedResult: NaN },
  { value: '1e3', expectedResult: NaN },
  { value: '99999999999999999999999', expectedResult: NaN },
  { value: undefined, expectedResult: NaN },
];
const rejectionTestCases = [
  { args: ['harness/testRunner.js', '-m', 'abc'], message: 'Usage' },
  { args: ['harness/testRunner.js', '-m'], message: 'Usage' },
  {
    args: ['--require', './harness/fixtures/exitingWorker.js', 'js/solvers/domiculeTilingSolver-Modular.js', '-r', '2', '-c', '2', '-j', '1'],
    message: 'before it sent a result',
  },
  { args: ['js/solvers/periodicTilingSolver-BigInt.js', '-r', '4', '-c', '13'], message: 'at most 12' },
  { args: ['js/solvers/periodicTilingSolver-BigInt.js', '-r', '1', '-c', '4', '--torus'], message: 'Usage' },
  { args: ['js/solvers/domiculeDiagonalSolver-BigInt.js', '-r', '13', '-c', '13'], message: 'at most 12' },
  { args: ['js/solvers/domiculeDiagonalSolver-Modular.js', '-r', '21', '-c', '21'], message: 'at most 20' },
  { args: ['js/solvers/domiculeDiagonalSolver-Modular.js', '-r', '2', '-c', '2', '-j', '0'], message: 'Usage' },
  {
    args: ['--require', './harness/fixtures/exitingWorker.js', 'js/solvers/periodicTilingSolver-Modular.js', '-r', '2', '-c', '2', '-j', '1'],
    message: 'before it sent a result',
  },
  {
    args: ['--require', './harness/fixtures/exitingWorker.js', 'js/solvers/domiculeDiagonalSolver-Modular.js', '-r', '2', '-c', '2', '-j', '1'],
    message: 'before it sent a result',
  },
  {
    args: ['-e', "require('./js/solvers/periodicTilingSolver-BigInt.js').calculateTotalTilingCombinations({ rowCount: 1, colCount: 4, torus: true })"],
    message: 'a torus needs at least 2 rows',
  },
  {
    args: ['-e', "require('./js/solvers/periodicTilingSolver-Modular.js').calculateTotalTilingCombinations({ rowCount: 4, colCount: 1 }).catch(error => { console.error(error.message); process.exit(1); })"],
    message: 'circumference must be at least 2',
  },
  { args: ['harness/benchmarkRunner.js', '-n', '1', '--only', 'missing.js'], message: 'Usage' },
  { args: ['harness/benchmarkRunner.js', '-n', '1', '-o', '99'], message: 'No test cases' },
  { args: ['harness/benchmarkRunner.js', '-n', '1', '--domicule', '--only', 'dominoTilingSolver.js'], message: 'Usage' },
  { args: ['harness/benchmarkRunner.js', '-n', '1', '--torus', '--only', 'domiculeTilingSolver-BigInt.js'], message: 'Usage' },
  { args: ['harness/benchmarkRunner.js', '-n', '1', '--torus', '--diagonal'], message: 'Usage' },
  { args: ['harness/benchmarkRunner.js', '-n', '1', '--torus', '--lattice', 'hexagonal'], message: 'Usage' },
  { args: ['harness/benchmarkRunner.js', '-n', '1', '--cylinder', '--lattice'], message: 'Usage' },
  { args: ['harness/benchmarkRunner.js', '-n', '1', '--domicule', '--lattice', 'square'], message: 'Usage' },
  { args: ['harness/benchmarkRunner.js', '-n', '1', '--lattice', 'square'], message: 'Usage' },
  { args: ['harness/benchmarkRunner.js', '-n', '1', '--torus', '--lattice=square'], message: 'Usage' },
];
const implementationRejectionTestCases = [
  { algorithm: 'periodic-tiling-modular', args: ['-r', '4', '-c', '25'], message: 'at most 24' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '25', '-c', '25', '--torus'], message: 'at most 24' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '4', '-c', '25', '--torus', '--twisted'], message: 'at most 24' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '4', '-c', '1'], message: 'Usage' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '1', '-c', '4', '--torus'], message: 'Usage' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '2abc', '-c', '4'], message: 'Usage' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '+4', '-c', '4'], message: 'Usage' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '9007199254740992', '-c', '4'], message: 'Usage' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '9'.repeat(5000), '-c', '4'], message: 'Usage' },
  { algorithm: 'periodic-tiling-modular', args: ['-c', '4'], message: 'Usage' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '4', '-c', '4', '--lattice', 'hexagonal'], message: 'Usage' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '4', '-c', '4', '--lattice'], message: 'Usage' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '4', '-c', '4', '-j', '0'], message: 'Usage' },
  { algorithm: 'periodic-tiling-modular', args: ['-r', '4', '-c', '4', '-j', 'x'], message: 'Usage' },
  { algorithm: 'domino-tiling-formula', args: ['-r', '3', '-c', '3'], message: '2n x 2n boards only' },
  { algorithm: 'domino-tiling-formula', args: ['-r', '4', '-c', '6'], message: '2n x 2n boards only' },
  { algorithm: 'domino-tiling-formula', args: ['-r', '2abc', '-c', '2'], message: 'Usage' },
  { algorithm: 'domino-tiling-formula', args: ['-r', '9007199254740992', '-c', '2'], message: 'Usage' },
  { algorithm: 'domino-tiling-formula', args: ['-c', '2'], message: 'Usage' },
  { algorithm: 'domino-tiling-number', args: ['-r', '31', '-c', '31'], message: 'at most 30' },
  { algorithm: 'domino-tiling-number', args: ['-r', '40', '-c', '31'], message: 'the rows are indexed with 32-bit integers' },
  { algorithm: 'domino-tiling-number', args: ['-r', '2abc', '-c', '2'], message: 'Usage' },
  { algorithm: 'domino-tiling-number', args: ['-r', '-2', '-c', '2'], message: 'Usage' },
  { algorithm: 'domino-tiling-number', args: ['-r', '9007199254740992', '-c', '2'], message: 'Usage' },
  { algorithm: 'domino-tiling-number', args: ['-c', '2'], message: 'Usage' },
  { algorithm: 'domino-tiling-bigint', args: ['-r', '31', '-c', '31'], message: 'at most 30' },
  { algorithm: 'domino-tiling-bigint', args: ['-r', '40', '-c', '31'], message: 'the rows are indexed with 32-bit integers' },
  { algorithm: 'domino-tiling-bigint', args: ['-r', '2abc', '-c', '2'], message: 'Usage' },
  { algorithm: 'domino-tiling-bigint', args: ['-r', '-2', '-c', '2'], message: 'Usage' },
  { algorithm: 'domino-tiling-bigint', args: ['-r', '9007199254740992', '-c', '2'], message: 'Usage' },
  { algorithm: 'domino-tiling-bigint', args: ['-c', '2'], message: 'Usage' },
  { algorithm: 'domicule-tiling-bigint', args: ['-r', '30', '-c', '30'], message: 'at most 29' },
  { algorithm: 'domicule-tiling-bigint', args: ['-r', '40', '-c', '30'], message: 'because a JavaScript array holds fewer than 2^32 states' },
  { algorithm: 'domicule-tiling-bigint', args: ['-r', '2abc', '-c', '2'], message: 'Usage' },
  { algorithm: 'domicule-tiling-bigint', args: ['-r', '-2', '-c', '2'], message: 'Usage' },
  { algorithm: 'domicule-tiling-bigint', args: ['-r', '9007199254740992', '-c', '2'], message: 'Usage' },
  { algorithm: 'domicule-tiling-bigint', args: ['-c', '2'], message: 'Usage' },
  { algorithm: 'domicule-tiling-modular', args: ['-r', '31', '-c', '31'], message: 'at most 30' },
  { algorithm: 'domicule-tiling-modular', args: ['-r', '40', '-c', '31'], message: 'because the states are indexed with 32-bit integers' },
  { algorithm: 'domicule-tiling-modular', args: ['-r', '2abc', '-c', '2'], message: 'Usage' },
  { algorithm: 'domicule-tiling-modular', args: ['-r', '-2', '-c', '2'], message: 'Usage' },
  { algorithm: 'domicule-tiling-modular', args: ['-r', '9007199254740992', '-c', '2'], message: 'Usage' },
  { algorithm: 'domicule-tiling-modular', args: ['-c', '2'], message: 'Usage' },
  { algorithm: 'domicule-tiling-modular', args: ['-r', '2', '-c', '2', '-j', '0'], message: 'Usage' },
  { algorithm: 'domicule-tiling-modular', args: ['-r', '2', '-c', '2', '-j', 'x'], message: 'Usage' },
];

const parityTestCases = ['domicule-tiling-modular', 'domicule-tiling-bigint'].map(algorithm => ({
  algorithm,
  boards: [[0, 5], [5, 0], [1, 1], [1, 2], [2, 1], [10, 1], [1, 40], [3, 3], [2, 31]],
}));

const MEMORY_TEST_BYTES = 256 * 2 ** 20;
const MEMORY_TEST_TIMEOUT = 120000;
const memoryTestCases = [{ algorithm: 'periodic-tiling-modular', args: ['-r', '2', '-c', '18', '-j', '1'], expectedResult: '524289' }];

function executeMemoryTests() {
  const measure = [
    'import resource, subprocess, sys',
    'result = subprocess.run(sys.argv[1:], capture_output=True, text=True)',
    "peak = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss * (1 if sys.platform == 'darwin' else 1024)",
    'print(result.returncode, peak, result.stdout.strip())',
  ].join('\n');
  const runs = memoryTestCases.flatMap(({ algorithm, args, expectedResult }) =>
    listImplementations(algorithm).map(({ file }) => ({ file, command: [...exec.launch(file), ...args], args, expectedResult })),
  );

  return runs.every(({ file, command, args, expectedResult }, index) => {
    process.stdout.write(`Executing memory test ${index + 1} of ${runs.length} for "${file} ${args.join(' ')}"... `);

    const { stdout, stderr, error } = spawnSync(process.env.PYTHON || 'python3', ['-I', '-c', measure, ...command], {
      cwd: ROOT_DIRECTORY,
      encoding: 'utf-8',
      timeout: MEMORY_TEST_TIMEOUT,
    });
    const [status, peak, output] = (stdout || '').trim().split(' ');

    if (error) {
      console.error(`Failed! ${error.message}`);

      return false;
    }

    if (status !== '0' || output !== expectedResult || !(Number(peak) <= MEMORY_TEST_BYTES)) {
      console.error(`Failed! Exit code ${status}, ${output || (stderr || '').trim()}, peak ${Math.round(Number(peak) / 2 ** 20)} MB of at most ${MEMORY_TEST_BYTES / 2 ** 20} MB`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeParityTests() {
  const runs = parityTestCases.flatMap(({ algorithm, boards }) =>
    boards.map(([rowCount, colCount]) => ({ algorithm, board: { rowCount, colCount } })),
  );

  return runs.every(({ algorithm, board }, index) => {
    const name = `${algorithm} on ${board.rowCount} × ${board.colCount}`;
    process.stdout.write(`Executing parity test ${index + 1} of ${runs.length} for ${name}... `);

    const outputs = listImplementations(algorithm).map(({ file }) => {
      try {
        return `${file}: ${exec(file, board)}`;
      } catch (error) {
        return `${file}: ${error.message}`;
      }
    });
    const counts = new Set(outputs.map(output => output.slice(output.indexOf(': ') + 2)));

    if (counts.size !== 1 || !/^\d+$/.test([...counts][0])) {
      console.error(`Failed! ${outputs.join('; ')}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeCheckPrimeTests() {
  const primes = listPrimes(3);
  const residuesOf = value => primes.map(prime => Number(((BigInt(value) % BigInt(prime)) + BigInt(prime)) % BigInt(prime)));
  const wrong = [...residuesOf(12345).slice(0, -1), (residuesOf(12345).at(-1) + 1) % primes.at(-1)];
  const cases = [
    { name: 'a positive count', run: () => combineCheckedResidues(residuesOf(12345), primes), expected: BigInt(12345) },
    { name: 'a negative signed sum', run: () => combineCheckedResidues(residuesOf(-12345), primes, true), expected: BigInt(-12345) },
    { name: 'a wrong check residue', run: () => combineCheckedResidues(wrong, primes), expected: 'check prime' },
  ];

  return cases.every(({ name, run, expected }, index) => {
    process.stdout.write(`Executing check prime test ${index + 1} of ${cases.length} for ${name}... `);

    let actual;

    try {
      actual = run();
    } catch (error) {
      actual = error.message.includes(expected) ? expected : error.message;
    }

    if (actual !== expected) {
      console.error(`Failed! Expected: ${expected}, Actual: ${actual}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeLimitTests() {
  const gigabytes = 2 ** 30;
  const board = { rows: 6, cols: 4, lattice: 'king' };
  const cases = [
    {
      name: 'the torus bound adds the start set',
      actual: periodicModular.calculateLog2Bound({ ...board, torus: true }) - periodicModular.calculateLog2Bound({ ...board, torus: false }),
      expected: board.cols,
    },
    { name: 'threads for 20x20 on 16 GB', actual: capThreads(10, 20, 200, 16 * gigabytes), expected: 2 },
    { name: 'threads for 6x6 on 16 GB', actual: capThreads(4, 6, 18, 16 * gigabytes), expected: 4 },
    { name: 'threads for 20x20 on 1 GB', actual: capThreads(3, 20, 200, gigabytes), expected: 1 },
  ];

  return cases.every(({ name, actual, expected }, index) => {
    process.stdout.write(`Executing limit test ${index + 1} of ${cases.length} for ${name}... `);

    if (actual !== expected) {
      console.error(`Failed! Expected: ${expected}, Actual: ${actual}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeDiagonalAnchorTests() {
  const find = (testCases, rowCount, colCount) =>
    testCases.find(t => (t.rowCount === rowCount && t.colCount === colCount) || (t.rowCount === colCount && t.colCount === rowCount));
  const anchored = [...testCasesDiagonal, ...testCasesDiagonalModular]
    .map(({ rowCount, colCount, expectedResult }) => ({
      rowCount,
      colCount,
      coefficients: expectedResult.split(',').map(BigInt),
      domicule: find([...testCasesDomicule, ...testCasesDomiculeRectangles], rowCount, colCount),
      domino: find([...testCasesBigInt, ...testCasesRectangles], rowCount, colCount),
    }))
    .filter(({ domicule, domino }) => domicule && domino);

  if (anchored.length < 10) {
    console.error(`Failed! Only ${anchored.length} diagonal rows have both a domicule and a domino count in spec/cases/.`);

    return false;
  }

  return anchored.every(({ rowCount, colCount, coefficients, domicule, domino }, index) => {
    process.stdout.write(`Executing diagonal anchor test ${index + 1} of ${anchored.length} for ${rowCount}x${colCount}... `);

    const total = coefficients.reduce((sum, c) => sum + c, BigInt(0));

    if (total !== BigInt(domicule.expectedResult) || coefficients[0] !== BigInt(domino.expectedResult)) {
      console.error(`Failed! Sum ${total} against ${domicule.expectedResult}, x^0 ${coefficients[0]} against ${domino.expectedResult}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeExecutorTests() {
  const board = { rowCount: 2, colCount: 2 };
  const guard = action => {
    try {
      return action();
    } catch (error) {
      return `an error: ${error.message}`;
    }
  };
  const command = fileName => guard(() => exec.generateCommand(fileName, board));
  const attempt = fileName => guard(() => exec(fileName, board));
  const absoluteTarget = path.join(os.tmpdir(), 'cargo-target');
  const staleTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-target-'));
  const staleBinary = path.join(staleTarget, 'release', 'domino-tiling-number');
  const javaScript = path.join(ROOT_DIRECTORY, 'js', 'solvers', 'dominoTilingSolver.js');
  const python = 'python/lattice_dimers/solvers/domino_tiling_number.py';
  const rust = 'rust/solvers/src/bin/domino-tiling-number.rs';
  const cases = [
    ['a bare name in js/solvers', 'dominoTilingSolver.js', {}, `"${process.execPath}" "${javaScript}" -r 2 -c 2`],
    ['a root-relative JavaScript file', 'js/solvers/dominoTilingSolver.js', {}, `"${process.execPath}" "${javaScript}" -r 2 -c 2`],
    ['python3', python, { PYTHON: undefined }, '"python3" "-I" "-m" "lattice_dimers.solvers.domino_tiling_number" -r 2 -c 2'],
    ['$PYTHON', python, { PYTHON: '/opt/python' }, '"/opt/python" "-I" "-m" "lattice_dimers.solvers.domino_tiling_number" -r 2 -c 2'],
    [
      'the Rust binary in target',
      rust,
      { CARGO_TARGET_DIR: undefined },
      `"${path.join(ROOT_DIRECTORY, 'target', 'release', 'domino-tiling-number')}" -r 2 -c 2`,
    ],
    [
      'a relative $CARGO_TARGET_DIR',
      rust,
      { CARGO_TARGET_DIR: 'build' },
      `"${path.join(ROOT_DIRECTORY, 'build', 'release', 'domino-tiling-number')}" -r 2 -c 2`,
    ],
    [
      'an absolute $CARGO_TARGET_DIR',
      rust,
      { CARGO_TARGET_DIR: absoluteTarget },
      `"${path.join(absoluteTarget, 'release', 'domino-tiling-number')}" -r 2 -c 2`,
    ],
    ['an unknown language', 'dominoTilingSolver.ts', {}, 'an error: dominoTilingSolver.ts is not a .rs, .py or .js implementation.'],
    [
      'a Rust binary that was not built',
      rust,
      { CARGO_TARGET_DIR: absoluteTarget },
      `an error: Execution failed: ${path.join(absoluteTarget, 'release', 'domino-tiling-number')} does not exist; build it with cargo build --release.`,
      true,
    ],
    [
      'a Rust binary older than the Rust sources',
      rust,
      { CARGO_TARGET_DIR: staleTarget },
      `an error: Execution failed: ${staleBinary} is older than the .rs files it is built from; rebuild it with cargo build --release.`,
      true,
    ],
  ];

  try {
    fs.mkdirSync(path.dirname(staleBinary));
    fs.writeFileSync(staleBinary, '', { mode: 0o755 });
    fs.utimesSync(staleBinary, 0, 0);

    return runExecutorTests(cases, command, attempt) && executeOwnRootTest() && executeRustSourceTests();
  } finally {
    fs.rmSync(staleTarget, { recursive: true, force: true });
  }
}

function executeOwnRootTest() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'own-root-')));
  const file = name => path.join(root, ...name.split('/'));
  const binary = file('target/release/solver');
  const now = Date.now() / 1000;
  const write = (name, seconds, mode) => {
    fs.mkdirSync(path.dirname(file(name)), { recursive: true });
    fs.writeFileSync(file(name), '', { mode });
    fs.utimesSync(file(name), seconds, seconds);
  };
  const target = process.env.CARGO_TARGET_DIR;
  const expected = `Execution failed: ${binary} is older than the .rs files it is built from; rebuild it with cargo build --release.`;

  process.stdout.write('Executing executor test for a Rust binary older than only its own root... ');

  try {
    fs.mkdirSync(file('js/core'), { recursive: true });
    fs.copyFileSync(path.join(ROOT_DIRECTORY, 'js', 'core', 'scriptExecutor.js'), file('js/core/scriptExecutor.js'));
    write('rust/core/src/lib.rs', now - 60);
    write('rust/solvers/src/bin/solver.rs', now + 60);
    write('rust/solvers/src/bin/other.rs', now - 60);
    write('target/release/solver', now, 0o755);
    delete process.env.CARGO_TARGET_DIR;

    let actual;

    try {
      actual = require(file('js/core/scriptExecutor.js'))('rust/solvers/src/bin/solver.rs', { rowCount: 2, colCount: 2 });
    } catch (error) {
      actual = error.message;
    }

    if (actual !== expected) {
      console.error(`Failed! Expected: ${expected}, Actual: ${actual}`);

      return false;
    }
  } finally {
    if (target === undefined) {
      delete process.env.CARGO_TARGET_DIR;
    } else {
      process.env.CARGO_TARGET_DIR = target;
    }

    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log('Passed!');

  return true;
}

function executeRustSourceTests() {
  const rust = fs.mkdtempSync(path.join(os.tmpdir(), 'rust-sources-'));
  const file = name => path.join(rust, ...name.split('/'));
  const sources = [
    ['core/src/lib.rs', 3000],
    ['solvers/src/bin/first.rs', 2000],
    ['solvers/src/bin/second.rs', 4000],
  ];
  const cases = [
    ['a binary whose shared source is newer than its own file, not the newer root of another binary', 'solvers/src/bin/first.rs', 3000],
    ['a binary whose own file is the newest', 'solvers/src/bin/second.rs', 4000],
  ];

  try {
    for (const [name, seconds] of sources) {
      fs.mkdirSync(path.dirname(file(name)), { recursive: true });
      fs.writeFileSync(file(name), '');
      fs.utimesSync(file(name), seconds, seconds);
    }

    return cases.every(([name, source, seconds], index) => {
      process.stdout.write(`Executing Rust source test ${index + 1} of ${cases.length} for ${name}... `);

      const actual = exec.rustSourcesModifiedAt(file(source), rust);

      if (actual !== seconds * 1000) {
        console.error(`Failed! Expected: ${seconds * 1000}, Actual: ${actual}`);

        return false;
      }

      console.log('Passed!');

      return true;
    });
  } finally {
    fs.rmSync(rust, { recursive: true, force: true });
  }
}

function runExecutorTests(cases, command, attempt) {
  return cases.every(([name, fileName, environment, expected, run], index) => {
    process.stdout.write(`Executing executor test ${index + 1} of ${cases.length} for ${name}... `);

    const saved = Object.fromEntries(Object.keys(environment).map(key => [key, process.env[key]]));
    const assign = values =>
      Object.entries(values).forEach(([key, value]) => (value === undefined ? delete process.env[key] : (process.env[key] = value)));

    assign(environment);

    const actual = run ? attempt(fileName) : command(fileName);

    assign(saved);

    if (actual !== expected) {
      console.error(`Failed! Command: ${actual}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executePortTests() {
  const repository = readRepository();
  const languages = { rs: 'rust/solvers/src/bin', py: 'python/lattice_dimers/solvers', js: 'js/solvers' };
  const complete = { rs: 'rust/solvers/src/bin/a.rs', py: 'python/lattice_dimers/solvers/a.py', js: 'js/solvers/a.js' };
  const countPending = algorithms =>
    Object.values(algorithms).reduce((count, entry) => count + Object.keys(languages).filter(language => !Object.hasOwn(entry, language)).length, 0);
  const state = ({
    algorithms = { a: complete },
    pendingPorts = countPending(algorithms),
    files = Object.values(complete),
    caseFiles = [{ name: 'a.json', algorithms: ['a'] }],
    ...rest
  } = {}) => ({
    registry: { languages, pendingPorts, algorithms },
    files,
    caseFiles,
    loadedCaseFiles: ['a.json'],
    runnableLanguages: ['rs', 'py', 'js'],
    ...rest,
  });
  const cases = [
    ['the repository', repository, []],
    ['three implementations', state(), []],
    ['an algorithm still waiting for its ports', state({ algorithms: { a: { js: complete.js } }, files: [complete.js] }), []],
    [
      'a new algorithm with one language',
      state({ algorithms: { a: complete, b: { js: 'js/solvers/b.js' } }, pendingPorts: 0, files: [...Object.values(complete), 'js/solvers/b.js'], caseFiles: [{ name: 'a.json', algorithms: ['a', 'b'] }] }),
      ['2 implementations are missing, but spec/algorithms.json allows 0 pending ports; an algorithm added from now on comes with all three.'],
    ],
    [
      'a port that did not lower the count',
      state({ pendingPorts: 1 }),
      ['0 implementations are missing; lower pendingPorts in spec/algorithms.json from 1 to 0.'],
    ],
    [
      'a Rust binary not named by its id',
      state({ algorithms: { a: { ...complete, rs: 'rust/solvers/src/bin/b.rs' } }, files: ['rust/solvers/src/bin/b.rs', complete.py, complete.js] }),
      ['spec/algorithms.json names the rs implementation of a b.rs, not a.rs.'],
    ],
    [
      'a Python module not named by its id',
      state({
        algorithms: { 'a-b': { py: 'python/lattice_dimers/solvers/a-b.py', js: 'js/solvers/a.js' } },
        files: ['python/lattice_dimers/solvers/a-b.py', 'js/solvers/a.js'],
        caseFiles: [{ name: 'a.json', algorithms: ['a-b'] }],
      }),
      ['spec/algorithms.json names the py implementation of a-b a-b.py, not a_b.py.'],
    ],
    [
      'an algorithm without its JavaScript solver',
      state({ algorithms: { a: { rs: complete.rs, py: complete.py } }, files: [complete.rs, complete.py] }),
      ['a has no js implementation; the runners and the site still reach every algorithm through it.'],
    ],
    [
      'a language the executor cannot run',
      state({ runnableLanguages: ['py', 'js'] }),
      ['spec/algorithms.json names rs, which js/core/scriptExecutor.js cannot run.'],
    ],
    [
      'an implementation in a language the registry does not have',
      state({ algorithms: { a: { ...complete, go: 'go/a.go' } } }),
      ['spec/algorithms.json gives a a go implementation, but go is not one of its languages.'],
    ],
    [
      'an implementation outside its directory',
      state({ algorithms: { a: { ...complete, py: 'js/solvers/a.py' } }, files: [complete.rs, 'js/solvers/a.py', complete.js] }),
      ['spec/algorithms.json puts the py implementation of a at js/solvers/a.py, outside python/lattice_dimers/solvers/*.py.'],
    ],
    [
      'a registered file that does not exist',
      state({ files: [complete.py, complete.js] }),
      ['spec/algorithms.json names rust/solvers/src/bin/a.rs for a, which does not exist.'],
    ],
    [
      'a file nobody registered',
      state({ files: [...Object.values(complete), 'js/solvers/b.js'] }),
      ['js/solvers/b.js is not registered in spec/algorithms.json.'],
    ],
    [
      'a case file that js/core/cases.js does not load',
      state({ caseFiles: [{ name: 'c.json', algorithms: ['a'] }] }),
      ['spec/cases/c.json is not loaded by js/core/cases.js, so no test runs it.', 'a is checked by no file in spec/cases.'],
    ],
    [
      'a case file naming an unknown algorithm',
      state({ caseFiles: [{ name: 'a.json', algorithms: ['a', 'b'] }] }),
      ['spec/cases/a.json checks b, which is not an algorithm of spec/algorithms.json.'],
    ],
    [
      'an algorithm no case file checks',
      state({ algorithms: { a: complete, b: { js: 'js/solvers/b.js' } }, files: [...Object.values(complete), 'js/solvers/b.js'] }),
      ['b is checked by no file in spec/cases.'],
    ],
  ];

  return cases.every(([name, repositoryState, expected], index) => {
    process.stdout.write(`Executing port test ${index + 1} of ${cases.length} for ${name}... `);

    const actual = listPortErrors(repositoryState);

    if (actual.join('\n') !== expected.join('\n')) {
      console.error(`Failed!\n  Expected: ${expected.join(' | ') || 'no errors'}\n  Actual: ${actual.join(' | ') || 'no errors'}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeResearchPathTest() {
  process.stdout.write('Executing research path test 1 of 1 for the counts research/king-entropy reads from spec/cases... ');

  const root = path.join(ROOT_DIRECTORY, 'research', 'king-entropy');
  const listSources = directory =>
    fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
      entry.isDirectory()
        ? listSources(path.join(directory, entry.name))
        : /\.(py|md)$/.test(entry.name)
          ? [path.join(directory, entry.name)]
          : [],
    );
  const oldRoot = /parents\[3\] \/ ['"]data['"]|['"]\.\.['"], ['"]\.\.['"], ['"]data['"]|REPO, ['"]data['"]|\.\.\/\.\.\/data\//;
  const stale = ['src', 'replication', 'README.md']
    .map(name => path.join(root, name))
    .flatMap(entry => (fs.statSync(entry).isDirectory() ? listSources(entry) : [entry]))
    .filter(file => oldRoot.test(fs.readFileSync(file, 'utf-8')))
    .map(file => path.relative(ROOT_DIRECTORY, file));

  if (stale.length) {
    console.error(`Failed! ${stale.join(', ')} still read the counts from data/ at the repository root, which moved to spec/cases.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runBenchmark(benchmarkRoot, extraArgs) {
  return spawnSync(
    process.execPath,
    ['harness/benchmarkRunner.js', '-n', '1', '-m', '1', '--only', 'dominoTilingSolver-Formula.js', ...extraArgs],
    {
      cwd: ROOT_DIRECTORY,
      encoding: 'utf-8',
      timeout: REJECTION_TIMEOUT,
      env: { ...process.env, BENCHMARK_ROOT: benchmarkRoot },
    },
  );
}

function executeBenchmarkGuardTest() {
  process.stdout.write('Executing benchmark guard test 1 of 1 for another machine... ');

  const benchmarkRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-benchmark-'));
  const directory = path.join(benchmarkRoot, new Date().toISOString().slice(0, 7));
  const foreign = { date: null, node: 'v0.0.0', platform: 'Other 0 x0', cpu: 'Other CPU', cores: 1, memory: null };

  try {
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'environment.json'), JSON.stringify(foreign));

    const refused = runBenchmark(benchmarkRoot, []);
    const kept = JSON.parse(fs.readFileSync(path.join(directory, 'environment.json'), 'utf-8'));
    const forced = runBenchmark(benchmarkRoot, ['--force']);
    const written = fs.existsSync(path.join(directory, 'dominoTilingSolver-Formula.js_0x0.txt'));

    if (refused.status === 0 || !refused.stderr.includes('--force') || kept.cpu !== foreign.cpu) {
      console.error(`Failed! The run was not refused: ${refused.stderr.trim()}`);

      return false;
    }

    if (forced.status !== 0 || !written) {
      console.error(`Failed! --force did not overwrite: ${forced.stderr.trim()}`);

      return false;
    }
  } finally {
    fs.rmSync(benchmarkRoot, { recursive: true, force: true });
  }

  console.log('Passed!');

  return true;
}

function executeBenchmarkSurfaceTests() {
  const cases = [
    { args: ['--torus', '--only', 'periodicTilingSolver-Modular.js'], file: 'periodicTilingSolver-Modular.js_2x2-king-torus.txt' },
    { args: ['--cylinder', '--only', 'periodicTilingSolver-BigInt.js'], file: 'periodicTilingSolver-BigInt.js_2x2-king-cylinder.txt' },
    { args: ['--diagonal', '--only', 'domiculeDiagonalSolver-BigInt.js'], file: 'domiculeDiagonalSolver-BigInt.js_0x0.txt' },
    { args: ['--cylinder', '--lattice', 'square', '--only', 'periodicTilingSolver-BigInt.js'], file: 'periodicTilingSolver-BigInt.js_2x2-square-cylinder.txt' },
    { args: ['--cylinder', '--lattice', 'triangular', '--only', 'periodicTilingSolver-BigInt.js'], file: 'periodicTilingSolver-BigInt.js_2x2-triangular-cylinder.txt' },
    ...listImplementations('periodic-tiling-modular').flatMap(({ file }) => [
      { args: ['--torus', '--only', 'periodicTilingSolver-Modular.js'], file: `${path.basename(file)}_2x2-king-torus.txt` },
      { args: ['--torus', '--lattice', 'square', '--only', 'periodicTilingSolver-Modular.js'], file: `${path.basename(file)}_2x2-square-torus.txt` },
      { args: ['--cylinder', '--lattice', 'square', '--only', 'periodicTilingSolver-Modular.js'], file: `${path.basename(file)}_2x2-square-cylinder.txt` },
    ]),
    ...listImplementations('domino-tiling-formula').map(({ file }) => ({
      args: ['--only', 'dominoTilingSolver-Formula.js'],
      file: `${path.basename(file)}_0x0.txt`,
    })),
    ...listImplementations('domino-tiling-number').map(({ file }) => ({
      args: ['--only', 'dominoTilingSolver.js'],
      file: `${path.basename(file)}_0x0.txt`,
    })),
    ...listImplementations('domino-tiling-bigint').map(({ file }) => ({
      args: ['--only', 'dominoTilingSolver-BigInt.js'],
      file: `${path.basename(file)}_0x0.txt`,
    })),
    ...listImplementations('domicule-tiling-bigint').map(({ file }) => ({
      args: ['--domicule', '--only', 'domiculeTilingSolver-BigInt.js'],
      file: `${path.basename(file)}_0x0.txt`,
    })),
    ...listImplementations('domicule-tiling-modular').map(({ file }) => ({
      args: ['--domicule', '--only', 'domiculeTilingSolver-Modular.js'],
      file: `${path.basename(file)}_0x0.txt`,
    })),
  ];

  return cases.every(({ args, file }, index) => {
    process.stdout.write(`Executing benchmark surface test ${index + 1} of ${cases.length} for ${args.slice(0, -2).join(' ')}... `);

    const benchmarkRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-benchmark-'));

    try {
      const { status, stderr } = spawnSync(process.execPath, ['harness/benchmarkRunner.js', '-n', '1', '-m', '1', ...args], {
        cwd: ROOT_DIRECTORY,
        encoding: 'utf-8',
        timeout: REJECTION_TIMEOUT,
        env: { ...process.env, BENCHMARK_ROOT: benchmarkRoot },
      });
      const written = fs.readdirSync(benchmarkRoot).flatMap(month => fs.readdirSync(path.join(benchmarkRoot, month)));

      if (status !== 0 || !written.includes(file)) {
        console.error(`Failed! Exit code ${status}, files ${written.join(', ')}: ${stderr.trim()}`);

        return false;
      }
    } finally {
      fs.rmSync(benchmarkRoot, { recursive: true, force: true });
    }

    console.log('Passed!');

    return true;
  });
}

function executeBenchmarkTimeTest() {
  process.stdout.write('Executing benchmark time test 1 of 1 for the time of the count and of the process... ');

  const benchmarkRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-benchmark-'));

  try {
    const { status, stderr } = runBenchmark(benchmarkRoot, []);
    const [month] = fs.readdirSync(benchmarkRoot);
    const content = fs.readFileSync(path.join(benchmarkRoot, month, 'dominoTilingSolver-Formula.js_0x0.txt'), 'utf-8');
    const environment = JSON.parse(fs.readFileSync(path.join(benchmarkRoot, month, 'environment.json'), 'utf-8'));
    const count = Number(content.match(/^Average Execution Time: ([\d.]+) ms$/m)?.[1]);
    const whole = Number(content.match(/^Average Process Time: ([\d.]+) ms$/m)?.[1]);

    if (status !== 0 || !(count >= 0) || !(whole > count) || !/^Load Average Before: /m.test(content) || environment.timing !== 'solver') {
      console.error(`Failed! Exit code ${status}, count ${count} ms, process ${whole} ms, timing ${environment.timing}: ${stderr.trim()}`);

      return false;
    }
  } finally {
    fs.rmSync(benchmarkRoot, { recursive: true, force: true });
  }

  console.log('Passed!');

  return true;
}

function executeBenchmarkCountTest() {
  process.stdout.write('Executing benchmark count test 1 of 1 for a count that differs from spec/cases... ');

  const benchmarkRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-benchmark-'));

  try {
    const { status, stderr } = spawnSync(
      process.execPath,
      ['harness/benchmarkRunner.js', '-n', '1', '-m', '1', '--torus', '--only', 'periodicTilingSolver-Modular.js'],
      {
        cwd: ROOT_DIRECTORY,
        encoding: 'utf-8',
        timeout: REJECTION_TIMEOUT,
        env: { ...process.env, BENCHMARK_ROOT: benchmarkRoot, PYTHON: path.join(ROOT_DIRECTORY, 'harness', 'fixtures', 'wrongCount.js') },
      },
    );

    if (status === 0 || !stderr.includes('counted 1 instead of 24')) {
      console.error(`Failed! A wrong count was not refused: exit code ${status}, ${stderr.trim()}`);

      return false;
    }
  } finally {
    fs.rmSync(benchmarkRoot, { recursive: true, force: true });
  }

  console.log('Passed!');

  return true;
}

function executeBenchmarkToolchainTest() {
  process.stdout.write('Executing benchmark toolchain test 1 of 1 for a Python whose version cannot be read... ');

  const benchmarkRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-benchmark-'));

  try {
    const { status, stderr } = spawnSync(
      process.execPath,
      ['harness/benchmarkRunner.js', '-n', '1', '-m', '1', '--torus', '--only', 'periodicTilingSolver-Modular.js'],
      {
        cwd: ROOT_DIRECTORY,
        encoding: 'utf-8',
        timeout: REJECTION_TIMEOUT,
        env: { ...process.env, BENCHMARK_ROOT: benchmarkRoot, PYTHON: path.join(benchmarkRoot, 'missing-python') },
      },
    );

    if (status === 0 || !stderr.includes('cannot read its version') || fs.readdirSync(benchmarkRoot).length) {
      console.error(`Failed! A run without a readable Python version was not refused: exit code ${status}, ${stderr.trim()}`);

      return false;
    }
  } finally {
    fs.rmSync(benchmarkRoot, { recursive: true, force: true });
  }

  console.log('Passed!');

  return true;
}

function executeTimeSpanTests() {
  const runs = listImplementations('periodic-tiling-modular').map(({ file }) => file);

  return runs.every((file, index) => {
    process.stdout.write(`Executing time span test ${index + 1} of ${runs.length} for ${file} on the 10 × 10 torus... `);

    const [program, ...launchArgs] = exec.launch(file);
    const start = process.hrtime.bigint();
    const { status, stderr } = spawnSync(program, [...launchArgs, '-r', '10', '-c', '10', '--torus', '--time'], {
      cwd: ROOT_DIRECTORY,
      encoding: 'utf-8',
    });
    const whole = Number(process.hrtime.bigint() - start) / 1e6;
    const reported = Number((stderr.match(/^time ([\d.]+) ms$/m) || [])[1]);

    if (status !== 0 || !(reported >= whole / 2) || !(reported <= whole)) {
      console.error(`Failed! The count took ${reported} ms of a ${whole.toFixed(1)} ms process.`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeTimeFlagTests() {
  const runs = Object.keys(registry.algorithms).flatMap(algorithm => listImplementations(algorithm).map(({ file }) => file));

  return runs.every((file, index) => {
    process.stdout.write(`Executing time flag test ${index + 1} of ${runs.length} for ${file}... `);

    const command = [...exec.launch(file), '-r', '2', '-c', '2'];
    const plain = spawnSync(command[0], command.slice(1), { cwd: ROOT_DIRECTORY, encoding: 'utf-8' });
    const timed = spawnSync(command[0], [...command.slice(1), '--time'], { cwd: ROOT_DIRECTORY, encoding: 'utf-8' });

    if (plain.status !== 0 || timed.status !== 0 || timed.stdout !== plain.stdout || !/^time \d+\.\d{3} ms$/m.test(timed.stderr)) {
      console.error(`Failed! Exit codes ${plain.status} and ${timed.status}, output ${timed.stdout.trim()} and ${plain.stdout.trim()}: ${timed.stderr.trim()}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executePrecisionWarningTests() {
  const cases = [
    { rowCount: 10, colCount: 10, expected: '258584046368', warns: false },
    { rowCount: 12, colCount: 12, expected: '53060477521960020', warns: true },
    { rowCount: 2, colCount: 90, expected: '4660046610375530000', warns: true },
    { rowCount: 14, colCount: 14, expected: '1.122022087760361e+23', warns: true },
    { rowCount: 2, colCount: 100, expected: '573147844013817200000', warns: true },
    { rowCount: 2, colCount: 102, expected: '1.5005205362068963e+21', warns: true },
    { rowCount: 2, colCount: 110, expected: '7.049252476708914e+22', warns: true },
    { rowCount: 2, colCount: 1500, expected: 'Infinity', warns: true },
  ];
  const runs = cases.flatMap(testCase => listImplementations('domino-tiling-number').map(({ file }) => ({ ...testCase, file })));

  return runs.every(({ file, rowCount, colCount, expected, warns }, index) => {
    process.stdout.write(`Executing precision warning test ${index + 1} of ${runs.length} for ${file} on ${rowCount}x${colCount}... `);

    const [program, ...args] = exec.launch(file);
    const { status, stdout, stderr } = spawnSync(program, [...args, '-r', String(rowCount), '-c', String(colCount)], {
      cwd: ROOT_DIRECTORY,
      encoding: 'utf-8',
      timeout: REJECTION_TIMEOUT,
    });

    if (status !== 0 || stdout.trim() !== expected || stderr.includes('not exact') !== warns) {
      console.error(`Failed! Exit code ${status}, output ${stdout.trim()} instead of ${expected}, warning ${stderr.includes('not exact') ? 'shown' : 'missing'}.`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeBenchmarkEmptySelectionTest() {
  process.stdout.write('Executing benchmark empty selection test 1 of 1 for -o 99... ');

  const benchmarkRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-benchmark-'));

  try {
    const { status, stderr } = runBenchmark(benchmarkRoot, ['-o', '99']);
    const written = fs.readdirSync(benchmarkRoot);

    if (status === 0 || !stderr.includes('No test cases') || written.length) {
      console.error(`Failed! Exit code ${status}, wrote ${written.join(', ') || 'nothing'}: ${stderr.trim()}`);

      return false;
    }
  } finally {
    fs.rmSync(benchmarkRoot, { recursive: true, force: true });
  }

  console.log('Passed!');

  return true;
}

function executeBenchmarkRunTest() {
  process.stdout.write('Executing benchmark run test 1 of 1 for partial newer months... ');

  const benchmarkRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-benchmark-'));
  const touch = (run, files) => {
    fs.mkdirSync(path.join(benchmarkRoot, run));
    files.forEach(file => fs.writeFileSync(path.join(benchmarkRoot, run, file), ''));
  };

  try {
    const complete = fs.readdirSync(path.join(ROOT_DIRECTORY, 'benchmarks', 'results', readBenchmarkRuns().latest));
    touch('2000-01', complete);
    touch('2000-02', ['environment.json', 'dominoTilingSolver-Formula.js_0x0.txt']);
    touch('2000-03', complete.filter(file => !['periodic-tiling-modular.rs_14x14-square-torus.txt', 'domicule_tiling_modular.py_20x20.txt'].includes(file)));
    touch('2000-04', complete.filter(file => file !== 'domino_tiling_formula.py_20x20.txt'));
    touch('2000-05', complete.filter(file => file !== 'domino-tiling-bigint.rs_20x20.txt'));
    touch('2000-06', complete.filter(file => file !== 'domicule_tiling_bigint.py_20x20.txt'));
    touch('2000-07', complete.filter(file => file !== 'domino-tiling-number.rs_10x10.txt'));
    const chosen = readBenchmarkRuns(benchmarkRoot).latest;

    if (chosen !== '2000-01') {
      console.error(`Failed! The site would show ${chosen} instead of the complete run 2000-01.`);

      return false;
    }
  } catch (error) {
    console.error(`Failed! ${error.message}`);

    return false;
  } finally {
    fs.rmSync(benchmarkRoot, { recursive: true, force: true });
  }

  console.log('Passed!');

  return true;
}

function executeDataTests() {
  const exact = new Map(testCasesBigInt.map(({ rowCount, colCount, expectedResult }) => [`${rowCount}x${colCount}`, expectedResult]));
  const cases = [
    ...testCasesInt.map(({ rowCount, colCount, expectedResult }) => ({
      name: `the Number count of ${rowCount}x${colCount}`,
      passed: Number.isSafeInteger(expectedResult) && String(expectedResult) === exact.get(`${rowCount}x${colCount}`),
      detail: `${expectedResult} against the BigInt count ${exact.get(`${rowCount}x${colCount}`)}`,
    })),
    ...[
      ['Number', testCasesInt],
      ['BigInt', testCasesBigInt],
      ['domicule', testCasesDomicule],
    ].map(([group, testCases]) => ({
      name: `a(0) of the ${group} squares`,
      passed: testCases[0].rowCount === 0 && testCases[0].colCount === 0 && String(testCases[0].expectedResult) === '1',
      detail: `the first case is ${testCases[0].rowCount}x${testCases[0].colCount} with ${testCases[0].expectedResult}`,
    })),
  ];

  return cases.every(({ name, passed, detail }, index) => {
    process.stdout.write(`Executing data test ${index + 1} of ${cases.length} for ${name}... `);

    if (!passed) {
      console.error(`Failed! ${detail}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function listScripts(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap(entry =>
      entry.isDirectory()
        ? listScripts(path.join(directory, entry.name))
        : entry.name.endsWith('.js')
          ? [path.join(directory, entry.name)]
          : [],
    );
}

function executeExitTests() {
  const scripts = listScripts(path.join(ROOT_DIRECTORY, 'js'));

  return scripts.every((file, index) => {
    const name = path.relative(ROOT_DIRECTORY, file);
    process.stdout.write(`Executing exit test ${index + 1} of ${scripts.length} for ${name}... `);

    const pattern = name === path.join('js', 'dominoTilingRenderer.js') ? /process\.exit\([^)]*\)/g : /process\.exit\(0?\)/g;
    const exits = fs.readFileSync(file, 'utf-8').match(pattern) || [];

    if (exits.length) {
      console.error(`Failed! ${exits.join(', ')} ends the process before a pipe has taken the whole output.`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeDirectoryTest() {
  process.stdout.write('Executing directory test 1 of 1 for the renderer started elsewhere... ');

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-directory-'));

  try {
    const { status, stdout, stderr } = spawnSync(
      process.execPath,
      [path.join(ROOT_DIRECTORY, 'js', 'dominoTilingRenderer.js'), '-r', '2', '-c', '100', '-l', '1', '--ascii'],
      { cwd, encoding: 'utf-8', timeout: REJECTION_TIMEOUT },
    );

    if (status !== 0 || !stdout.includes('Board 2x100: 573147844013817084101 tilings.')) {
      console.error(`Failed! Exit code ${status}: ${(stderr || stdout).trim().split('\n')[0]}`);

      return false;
    }
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }

  console.log('Passed!');

  return true;
}

function executeUsageTests() {
  const scripts = [
    ...listScripts(path.join(ROOT_DIRECTORY, 'js', 'solvers')),
    path.join(ROOT_DIRECTORY, 'js', 'dominoTilingRenderer.js'),
    path.join(ROOT_DIRECTORY, 'harness', 'benchmarkRunner.js'),
  ];

  return scripts.every((file, index) => {
    const name = path.relative(ROOT_DIRECTORY, file);
    process.stdout.write(`Executing usage test ${index + 1} of ${scripts.length} for ${name}... `);

    const { stderr } = spawnSync(process.execPath, [file, '-r', 'x'], { cwd: ROOT_DIRECTORY, encoding: 'utf-8', timeout: REJECTION_TIMEOUT });
    const named = (stderr.match(/Usage: node (\S+)/) || [])[1];

    if (named !== name) {
      console.error(`Failed! The usage line names ${named || 'no script'}: ${stderr.trim().split('\n')[0]}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

async function executeModuleTests() {
  const fourByFour = testCases => testCases.find(({ rowCount, colCount }) => rowCount === 4 && colCount === 4);
  const modules = [
    ['domiculeTilingSolver-Modular.js', 'calculateTotalTilingCombinations', fourByFour(testCasesDomicule)],
    ['periodicTilingSolver-Modular.js', 'calculateTotalTilingCombinations', fourByFour(testCasesPeriodic)],
    ['domiculeDiagonalSolver-Modular.js', 'calculateDiagonalPolynomial', fourByFour(testCasesDiagonal)],
  ];
  let passed = true;

  for (const [index, [fileName, method, { expectedResult, ...board }]] of modules.entries()) {
    process.stdout.write(`Executing module test ${index + 1} of ${modules.length} for ${fileName} without a worker count... `);

    const actual = await Promise.resolve()
      .then(() => require(`../js/solvers/${fileName}`)[method](board))
      .then(result => [].concat(result).map(String).join(), error => `an error: ${error.message}`);

    if (actual !== expectedResult) {
      console.error(`Failed! Expected: ${expectedResult}, Actual: ${actual}`);
      passed = false;
      break;
    }

    console.log('Passed!');
  }

  return (
    passed &&
    [
      ['periodic-tiling-modular', fourByFour(testCasesPeriodic)],
      ['domicule-tiling-modular', fourByFour(testCasesDomicule)],
    ].every(([algorithm, testCase]) => executeUnknownProcessorCountTest(algorithm, testCase)) &&
    executeScratchTest(testCasesDomiculeRectangles.find(({ rowCount, colCount }) => rowCount === 7 && colCount === 6)) &&
    executeLongCountTest('domino-tiling-formula', ['-r', '80', '-c', '80']) &&
    executeLongCountTest('domino-tiling-bigint', ['-r', '2', '-c', '6000']) &&
    executeLongCountTest('domicule-tiling-bigint', ['-r', '2', '-c', '6000'])
  );
}

function executeLongCountTest(algorithm, args) {
  const python = listImplementations(algorithm).find(({ language }) => language === 'py');
  const javascript = listImplementations(algorithm).find(({ language }) => language === 'js');
  const launcher = exec.launch(python.file);
  const expected = spawnSync(process.execPath, [javascript.file, ...args], { cwd: ROOT_DIRECTORY, encoding: 'utf-8' }).stdout.trim();
  const script = [
    'import runpy, sys',
    'sys.set_int_max_str_digits(640)',
    'sys.argv = sys.argv[1:]',
    'runpy.run_module(sys.argv[0], run_name="__main__", alter_sys=True)',
  ].join('\n');

  process.stdout.write(`Executing module test for ${python.file} with a count of ${expected.length} digits under a limit of 640... `);

  const { status, stdout, stderr } = spawnSync(launcher[0], ['-I', '-c', script, launcher.at(-1), ...args], {
    cwd: ROOT_DIRECTORY,
    encoding: 'utf-8',
  });

  if (status !== 0 || expected.length <= 640 || stdout.trim() !== expected) {
    console.error(`Failed! Exit code ${status}: ${(stdout || stderr).trim().slice(-200)}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function executeScratchTest({ expectedResult, rowCount, colCount }) {
  const python = listImplementations('domicule-tiling-modular').find(({ language }) => language === 'py');
  const launcher = exec.launch(python.file);
  const script = [
    'import importlib, sys',
    'solver = importlib.import_module(sys.argv[1])',
    'solver.SCRATCH_COUNTS = 1',
    'print(solver.calculate_total_tiling_combinations(int(sys.argv[2]), int(sys.argv[3]), 2))',
  ].join('\n');

  process.stdout.write(`Executing module test for ${python.file} with a scratch array of one count... `);

  const { status, stdout, stderr } = spawnSync(launcher[0], ['-I', '-c', script, launcher.at(-1), String(rowCount), String(colCount)], {
    cwd: ROOT_DIRECTORY,
    encoding: 'utf-8',
  });

  if (status !== 0 || stdout.trim() !== expectedResult) {
    console.error(`Failed! Exit code ${status}, expected ${expectedResult}: ${(stdout || stderr).trim()}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function executeUnknownProcessorCountTest(algorithm, { expectedResult, rowCount, colCount, lattice, torus }) {
  const python = listImplementations(algorithm).find(({ language }) => language === 'py');
  const launcher = exec.launch(python.file);
  const script = [
    'import importlib, json, os, runpy, sys',
    'os.process_cpu_count = lambda: None',
    'module = sys.argv[1]',
    'print(importlib.import_module(module).calculate_total_tiling_combinations(**json.loads(sys.argv[2])), flush=True)',
    'sys.argv = [module] + sys.argv[3:]',
    'runpy.run_module(module, run_name="__main__", alter_sys=True)',
  ].join('\n');
  const surface = lattice ? { lattice, torus: Boolean(torus) } : {};
  const board = [JSON.stringify({ row_count: rowCount, col_count: colCount, ...surface })];
  const args = ['-r', String(rowCount), '-c', String(colCount), ...(lattice ? ['--lattice', lattice] : []), ...(torus ? ['--torus'] : [])];

  process.stdout.write(`Executing module test for ${python.file} when the number of processors is unknown... `);

  const { status, stdout, stderr } = spawnSync(launcher[0], ['-I', '-c', script, launcher.at(-1), ...board, ...args], {
    cwd: ROOT_DIRECTORY,
    encoding: 'utf-8',
  });

  if (status !== 0 || stdout.trim() !== `${expectedResult}\n${expectedResult}`) {
    console.error(`Failed! Exit code ${status}, expected ${expectedResult}: ${(stdout || stderr).trim()}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function executeParserTests() {
  process.stdout.write('Executing parser test for a bare argument named like an Object property... ');

  const { size } = parseArgs(['constructor', '-s', '12'], { '-s': 'size' });

  if (size !== 12) {
    console.error(`Failed! Expected: 12, Actual: ${size}`);

    return false;
  }

  console.log('Passed!');

  return parserTestCases.every(({ value, expectedResult }, index) => {
    process.stdout.write(
      `Executing parser test ${index + 1} of ${parserTestCases.length} for "${value}"... `,
    );

    const args = value === undefined ? ['-s'] : ['-s', value];
    const { size } = parseArgs(args, { '-s': 'size' });

    if (!Object.is(size, expectedResult)) {
      console.error(`Failed! Expected: ${expectedResult}, Actual: ${size}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function executeRejectionTests() {
  const runs = [
    ...rejectionTestCases.map(({ args, message }) => ({ name: args.join(' '), command: [process.execPath, ...args], message })),
    ...implementationRejectionTestCases.flatMap(({ algorithm, args, message }) =>
      listImplementations(algorithm).map(({ file }) => ({ name: `${file} ${args.join(' ')}`, command: [...exec.launch(file), ...args], message })),
    ),
  ];

  return runs.every(({ name, command: [program, ...args], message }, index) => {
    process.stdout.write(`Executing rejection test ${index + 1} of ${runs.length} for "${name}"... `);

    const { status, stderr, error } = spawnSync(program, args, {
      cwd: ROOT_DIRECTORY,
      encoding: 'utf-8',
      timeout: REJECTION_TIMEOUT,
    });

    if (error || status === 0 || !stderr.includes(message)) {
      console.error(`Failed! Exit code ${status}: ${(error ? error.message : stderr).trim()}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function verifyList(expected, actual) {
  return expected === actual;
}

function runTest(testCase, verifyResult) {
  const { fileName, expectedResult } = testCase;

  try {
    const result = exec(fileName, testCase);

    if (verifyResult(expectedResult, result)) {
      console.log('Passed!');
    } else {
      console.error(`Failed! Expected: ${expectedResult}, Actual: ${result}`);

      return false;
    }
  } catch (error) {
    console.error(`Failed! Error: ${error.message}`);

    return false;
  }

  return true;
}

function executeTests(files, testCases, verifyResult, portedTestCases = testCases) {
  const implementations = files.flatMap(fileName => {
    const all = listImplementations(algorithmOf(fileName));

    return all.map(({ file }) => ({ file, cases: all.length > 1 ? portedTestCases : testCases }));
  });
  const pairs = implementations.flatMap(({ file, cases }) =>
    cases.map((testCase, index) => ({ index, fileName: file, ...testCase })),
  );
  const allPassed = pairs.every((testCase, index) => {
    process.stdout.write(
      `Executing test ${index + 1} of ${pairs.length} for ${
        testCase.fileName
      }... `,
    );

    return runTest(testCase, verifyResult);
  });

  return allPassed;
}

async function __main__() {
  try {
    const argsSchema = { '-m': 'maxSize' };
    const { maxSize } = parseArgs(process.argv.slice(2), argsSchema);

    if (maxSize !== undefined && !(maxSize > 0)) {
      throw new Error('Usage: node harness/testRunner.js [-m <maxSize>]');
    }

    console.log(
      `Starting test execution with ${maxSize || 'all available'} test cases per solver group...`,
    );

    const testCasesToRunInt = maxSize ? testCasesInt.slice(0, maxSize) : testCasesInt;
    const testCasesToRunBigInt = maxSize ? testCasesBigInt.slice(0, maxSize) : testCasesBigInt;

    const allIntTestsPassed = executeTests(filesInt, testCasesToRunInt, verifyInt);
    const isFormula = fileName => algorithmOf(fileName) === 'domino-tiling-formula';
    const allBigIntTestsPassed =
      executeTests(filesBigInt.filter(isFormula), testCasesToRunBigInt, verifyBigInt, testCasesBigInt) &&
      executeTests(
        filesBigInt.filter(fileName => !isFormula(fileName)),
        testCasesToRunBigInt,
        verifyBigInt,
        maxSize ? testCasesBigInt.filter(({ rowCount }) => rowCount <= MAX_PORTED_BIGINT_SIDE) : testCasesBigInt,
      );
    const allRectangleTestsPassed = executeTests(filesRectangles, testCasesRectangles, verifyBigInt);
    const testCasesToRunDomicule = maxSize ? testCasesDomicule.slice(0, maxSize) : testCasesDomicule;
    const isBigIntSolver = fileName => algorithmOf(fileName) === 'domicule-tiling-bigint';
    const allDomiculeTestsPassed =
      executeTests(filesDomicule.filter(fileName => !isBigIntSolver(fileName)), testCasesToRunDomicule, verifyBigInt, testCasesDomicule) &&
      executeTests(
        filesDomicule.filter(isBigIntSolver),
        testCasesToRunDomicule,
        verifyBigInt,
        maxSize ? testCasesDomicule.filter(({ rowCount }) => rowCount <= MAX_PORTED_BIGINT_SIDE) : testCasesDomicule,
      );
    const allDomiculeRectangleTestsPassed = executeTests(filesDomiculeRectangles, testCasesDomiculeRectangles, verifyBigInt);
    const testCasesToRunPeriodic = maxSize ? testCasesPeriodic.slice(0, maxSize) : testCasesPeriodic;
    const allPeriodicTestsPassed = executeTests(filesPeriodic, testCasesToRunPeriodic, verifyBigInt, testCasesPeriodic);
    const testCasesToRunPeriodicModular = maxSize ? testCasesPeriodicModular.slice(0, maxSize) : testCasesPeriodicModular;
    const allPeriodicModularTestsPassed = executeTests(filesPeriodicModular, testCasesToRunPeriodicModular, verifyBigInt);
    const allDiagonalTestsPassed = executeTests(filesDiagonal, testCasesDiagonal, verifyList);
    const testCasesToRunDiagonalModular = maxSize ? testCasesDiagonalModular.slice(0, maxSize) : testCasesDiagonalModular;
    const allDiagonalModularTestsPassed = executeTests(filesDiagonalModular, testCasesToRunDiagonalModular, verifyList);
    const checkPrimeTestsPassed = executeCheckPrimeTests();
    const diagonalAnchorTestsPassed = executeDiagonalAnchorTests();
    const limitTestsPassed = executeLimitTests();
    const allParserTestsPassed = executeParserTests();
    const allRejectionTestsPassed = executeRejectionTests();
    const parityTestsPassed = executeParityTests();
    const memoryTestsPassed = executeMemoryTests();
    const executorTestsPassed = executeExecutorTests();
    const portTestsPassed = executePortTests();
    const researchPathTestPassed = executeResearchPathTest();
    const benchmarkGuardTestPassed = executeBenchmarkGuardTest();
    const benchmarkSurfaceTestsPassed = executeBenchmarkSurfaceTests();
    const benchmarkTimeTestPassed = executeBenchmarkTimeTest();
    const timeFlagTestsPassed = executeTimeFlagTests();
    const timeSpanTestsPassed = executeTimeSpanTests();
    const benchmarkCountTestPassed = executeBenchmarkCountTest();
    const benchmarkToolchainTestPassed = executeBenchmarkToolchainTest();
    const precisionWarningTestsPassed = executePrecisionWarningTests();
    const benchmarkEmptySelectionTestPassed = executeBenchmarkEmptySelectionTest();
    const benchmarkRunTestPassed = executeBenchmarkRunTest();
    const dataTestsPassed = executeDataTests();
    const exitTestsPassed = executeExitTests();
    const directoryTestPassed = executeDirectoryTest();
    const usageTestsPassed = executeUsageTests();
    const moduleTestsPassed = await executeModuleTests();

    if (
      allIntTestsPassed &&
      allBigIntTestsPassed &&
      allRectangleTestsPassed &&
      allDomiculeTestsPassed &&
      allDomiculeRectangleTestsPassed &&
      allPeriodicTestsPassed &&
      allPeriodicModularTestsPassed &&
      allDiagonalTestsPassed &&
      allDiagonalModularTestsPassed &&
      checkPrimeTestsPassed &&
      diagonalAnchorTestsPassed &&
      limitTestsPassed &&
      allParserTestsPassed &&
      allRejectionTestsPassed &&
      parityTestsPassed &&
      memoryTestsPassed &&
      executorTestsPassed &&
      portTestsPassed &&
      researchPathTestPassed &&
      benchmarkGuardTestPassed &&
      benchmarkSurfaceTestsPassed &&
      benchmarkTimeTestPassed &&
      timeFlagTestsPassed &&
      timeSpanTestsPassed &&
      benchmarkCountTestPassed &&
      benchmarkToolchainTestPassed &&
      precisionWarningTestsPassed &&
      benchmarkEmptySelectionTestPassed &&
      benchmarkRunTestPassed &&
      dataTestsPassed &&
      exitTestsPassed &&
      directoryTestPassed &&
      usageTestsPassed &&
      moduleTestsPassed
    ) {
      console.log('All tests completed successfully.');
      process.exit(0);
    } else {
      console.error('Some tests failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

__main__();
