const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, test } = require('node:test');
const { parseArgs } = require('../core');
const { listPrimes, combineCheckedResidues } = require('../core/modular');
const { testCasesOf } = require('../core/cases');
const periodicModular = require('../solvers/all-lattices-cylinder-torus-modular.js');
const { capThreads } = require('../solvers/diagonal-pieces-modular.js');
const { ROOT_DIRECTORY, REJECTION_TIMEOUT, runNode } = require('./support');

const EXITING_WORKER = path.join(__dirname, 'fixtures', 'exitingWorker.js');
const JAVASCRIPT_DIRECTORY = path.join(ROOT_DIRECTORY, 'js');
const SOLVERS_DIRECTORY = path.join(JAVASCRIPT_DIRECTORY, 'solvers');
const RENDERER = path.join(JAVASCRIPT_DIRECTORY, 'dominoTilingRenderer.js');

function listScripts(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.name !== 'node_modules')
    .flatMap(entry =>
      entry.isDirectory()
        ? listScripts(path.join(directory, entry.name))
        : entry.name.endsWith('.js')
          ? [path.join(directory, entry.name)]
          : [],
    );
}

describe('check primes', () => {
  const primes = listPrimes(3);
  const residuesOf = value => primes.map(prime => Number(((BigInt(value) % BigInt(prime)) + BigInt(prime)) % BigInt(prime)));
  const wrong = [...residuesOf(12345).slice(0, -1), (residuesOf(12345).at(-1) + 1) % primes.at(-1)];

  test('a positive count', () => {
    assert.equal(combineCheckedResidues(residuesOf(12345), primes), BigInt(12345));
  });

  test('a negative signed sum', () => {
    assert.equal(combineCheckedResidues(residuesOf(-12345), primes, true), BigInt(-12345));
  });

  test('a wrong check residue', () => {
    assert.throws(() => combineCheckedResidues(wrong, primes), /check prime/);
  });
});

describe('parser', () => {
  const cases = [
    { value: '12', expectedResult: 12 },
    { value: '0', expectedResult: 0 },
    { value: '2abc', expectedResult: NaN },
    { value: '-2', expectedResult: NaN },
    { value: '1e3', expectedResult: NaN },
    { value: '99999999999999999999999', expectedResult: NaN },
    { value: undefined, expectedResult: NaN },
  ];

  test('a bare argument named like an Object property', () => {
    assert.equal(parseArgs(['constructor', '-s', '12'], { '-s': 'size' }).size, 12);
  });

  for (const { value, expectedResult } of cases) {
    test(`the value ${value === undefined ? 'missing' : `"${value}"`}`, () => {
      const { size } = parseArgs(value === undefined ? ['-s'] : ['-s', value], { '-s': 'size' });

      assert.equal(size, expectedResult);
    });
  }
});

describe('limits', () => {
  const gigabytes = 2 ** 30;
  const board = { rows: 6, cols: 4, lattice: 'king' };

  test('the torus bound adds the start set', () => {
    const difference = periodicModular.calculateLog2Bound({ ...board, torus: true }) - periodicModular.calculateLog2Bound({ ...board, torus: false });

    assert.equal(difference, board.cols);
  });

  test('threads for 20x20 on 16 GB', () => {
    assert.equal(capThreads(10, 20, 200, 16 * gigabytes), 2);
  });

  test('threads for 6x6 on 16 GB', () => {
    assert.equal(capThreads(4, 6, 18, 16 * gigabytes), 4);
  });

  test('threads for 20x20 on 1 GB', () => {
    assert.equal(capThreads(3, 20, 200, gigabytes), 1);
  });
});

describe('rejections of the library and of a worker that exits', () => {
  const solver = name => path.join(SOLVERS_DIRECTORY, name);
  const exitingWorkerCases = ['domicule-rectangle-modular', 'all-lattices-cylinder-torus-modular', 'diagonal-pieces-modular'].map(algorithm => ({
    name: `${algorithm} with a worker that exits before it sends a result`,
    args: ['--require', EXITING_WORKER, solver(`${algorithm}.js`), '-r', '2', '-c', '2', '-j', '1'],
    message: 'before it sent a result',
  }));
  const libraryCases = [
    {
      name: 'all-lattices-cylinder-torus-bigint on a torus of one row',
      args: ['-e', `require(${JSON.stringify(solver('all-lattices-cylinder-torus-bigint.js'))}).calculateTotalTilingCombinations({ rowCount: 1, colCount: 4, torus: true })`],
      message: 'a torus needs at least 2 rows',
    },
    {
      name: 'all-lattices-cylinder-torus-modular on a circumference of one',
      args: [
        '-e',
        `require(${JSON.stringify(solver('all-lattices-cylinder-torus-modular.js'))}).calculateTotalTilingCombinations({ rowCount: 4, colCount: 1 }).catch(error => { console.error(error.message); process.exit(1); })`,
      ],
      message: 'circumference must be at least 2',
    },
  ];

  for (const { name, args, message } of [...exitingWorkerCases, ...libraryCases]) {
    test(name, () => {
      const { status, stderr, error } = runNode(args, { timeout: REJECTION_TIMEOUT });

      assert.ifError(error);
      assert.notEqual(status, 0, 'The process exited with code 0.');
      assert.ok(stderr.includes(message), `Expected "${message}" on standard error: ${stderr.trim()}`);
    });
  }
});

describe('exits', () => {
  for (const file of listScripts(JAVASCRIPT_DIRECTORY).filter(script => !script.startsWith(`${__dirname}${path.sep}`))) {
    const name = path.relative(ROOT_DIRECTORY, file);

    test(name, () => {
      const pattern = file === RENDERER ? /process\.exit\([^)]*\)/g : /process\.exit\(0?\)/g;
      const exits = fs.readFileSync(file, 'utf-8').match(pattern) || [];

      assert.deepEqual(exits, [], 'process.exit ends the process before a pipe has taken the whole output.');
    });
  }
});

describe('directory', () => {
  test('the renderer started elsewhere', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-directory-'));

    try {
      const { status, stdout, stderr } = runNode([RENDERER, '-r', '2', '-c', '100', '-l', '1', '--ascii'], { cwd, timeout: REJECTION_TIMEOUT });

      assert.equal(status, 0, `Exit code ${status}: ${(stderr || stdout).trim().split('\n')[0]}`);
      assert.ok(stdout.includes('Board 2x100: 573147844013817084101 tilings.'), stdout.split('\n')[0]);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe('usage lines', () => {
  for (const file of [...listScripts(SOLVERS_DIRECTORY), RENDERER]) {
    const name = path.relative(ROOT_DIRECTORY, file);

    test(name, () => {
      const { stderr } = runNode([file, '-r', 'x'], { timeout: REJECTION_TIMEOUT });
      const named = (stderr.match(/Usage: node (\S+)/) || [])[1];

      assert.equal(named, name, `The usage line names ${named || 'no script'}: ${stderr.trim().split('\n')[0]}`);
    });
  }
});

describe('modules without a worker count', () => {
  const fourByFour = algorithm => testCasesOf(algorithm).find(({ rowCount, colCount }) => rowCount === 4 && colCount === 4);
  const modules = [
    ['domicule-rectangle-modular.js', 'calculateTotalTilingCombinations', fourByFour('domicule-rectangle-modular')],
    ['all-lattices-cylinder-torus-modular.js', 'calculateTotalTilingCombinations', fourByFour('all-lattices-cylinder-torus-bigint')],
    ['diagonal-pieces-modular.js', 'calculateDiagonalPolynomial', fourByFour('diagonal-pieces-bigint')],
  ];

  for (const [fileName, method, { expectedResult, ...board }] of modules) {
    test(fileName, async () => {
      const result = await require(path.join(SOLVERS_DIRECTORY, fileName))[method](board);

      assert.equal([].concat(result).map(String).join(), expectedResult);
    });
  }
});
