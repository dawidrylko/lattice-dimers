const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, test } = require('node:test');
const { parseArgs } = require('../core');
const { listPrimes, combineCheckedResidues } = require('../core/modular');
const { pfaffianModulo, LARGEST_PRIME_BOUND } = require('../core/pfaffian');
const { testCasesOf } = require('../core/cases');
const cylinderTorusModular = require('../solvers/any-lattice-cylinder-torus-modular.js');
const { capThreads } = require('../solvers/domicule-rectangle-polynomial-modular.js');
const { capThreads: cylinderTorusThreads } = require('../solvers/domicule-cylinder-torus-polynomial-modular.js');
const { capThreads: anyLatticeCylinderTorusThreads } = require('../solvers/any-lattice-cylinder-torus-polynomial-modular.js');
const { ROOT_DIRECTORY, REJECTION_TIMEOUT, runNode } = require('./support');

const EXITING_WORKER = path.join(__dirname, 'fixtures', 'exitingWorker.js');
const JAVASCRIPT_DIRECTORY = path.join(ROOT_DIRECTORY, 'js');
const SOLVERS_DIRECTORY = path.join(JAVASCRIPT_DIRECTORY, 'solvers');
const RENDERER = path.join(JAVASCRIPT_DIRECTORY, 'tilingRenderer.js');

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

describe('Pfaffian modulo a prime', () => {
  const prime = listPrimes(1, LARGEST_PRIME_BOUND)[0];
  const residuesOf = (matrix, modulus = prime) => Float64Array.from(matrix, value => ((value % modulus) + modulus) % modulus);
  const entryOf = (matrix, size, i, j) => (i < j ? matrix[i * size + j] : -matrix[j * size + i]);
  const expand = (matrix, size, [first, ...rest]) =>
    first === undefined
      ? 1
      : rest.reduce(
          (sum, partner, position) =>
            sum +
            (position % 2 === 0 ? 1 : -1) *
              entryOf(matrix, size, first, partner) *
              expand(
                matrix,
                size,
                rest.filter(vertex => vertex !== partner),
              ),
          0,
        );
  const drawMatrix = (size, state, zeroEvery) => {
    const matrix = new Array(size * size).fill(0);

    for (let i = 0; i < size; i++) {
      for (let j = i + 1; j < size; j++) {
        state.seed = (Math.imul(state.seed, 1103515245) + 12345) >>> 0;

        const draw = state.seed >>> 8;

        matrix[i * size + j] = draw % zeroEvery === 0 ? 0 : (draw % 19) - 9;
      }
    }

    return matrix;
  };

  test('small matrices', () => {
    assert.equal(pfaffianModulo(new Float64Array(0), 0, prime), 1);
    assert.equal(pfaffianModulo(Float64Array.of(0, 7, 0, 0), 2, prime), 7);
    assert.equal(pfaffianModulo(Float64Array.of(0, prime - 7, 0, 0), 2, prime), prime - 7);
    assert.equal(pfaffianModulo(residuesOf([0, 1, 2, 3, 0, 0, 4, 5, 0, 0, 0, 6, 0, 0, 0, 0]), 4, prime), 8);
  });

  test('an odd size and a vertex without a partner give zero', () => {
    assert.equal(pfaffianModulo(Float64Array.of(0, 1, 1, 0, 0, 1, 0, 0, 0), 3, prime), 0);
    assert.equal(pfaffianModulo(Float64Array.of(0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0), 4, prime), 0);
  });

  test('a partner moved next to its vertex flips the sign', () => {
    const matrix = [0, 0, 0, 5, 0, 0, 3, 2, 0, 0, 0, 7, 0, 0, 0, 0];

    assert.equal(expand(matrix, 4, [0, 1, 2, 3]), 15);
    assert.equal(pfaffianModulo(residuesOf(matrix), 4, prime), 15);
  });

  test('the expansion along the first row', () => {
    const state = { seed: 2026 };

    for (const modulus of [prime, 7, 3]) {
      for (const [size, zeroEvery] of [
        [2, 3],
        [4, 2],
        [6, 2],
        [6, 5],
        [8, 2],
        [8, 3],
        [8, 1000],
        [10, 2],
      ]) {
        for (let round = 0; round < 20; round++) {
          const matrix = drawMatrix(size, state, zeroEvery);
          const vertices = Array.from({ length: size }, (_, vertex) => vertex);
          const expected = ((expand(matrix, size, vertices) % modulus) + modulus) % modulus;

          assert.equal(pfaffianModulo(residuesOf(matrix, modulus), size, modulus), expected, `${size} x ${size} modulo ${modulus}: ${matrix}`);
        }
      }
    }
  });

  test('the entries on and below the diagonal are not read', () => {
    const matrix = drawMatrix(6, { seed: 7 }, 4);
    const filled = residuesOf(matrix);

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j <= i; j++) {
        filled[i * 6 + j] = 12345;
      }
    }

    assert.equal(pfaffianModulo(filled, 6, prime), pfaffianModulo(residuesOf(matrix), 6, prime));
  });

  test('a prime of 26 bits or more and a matrix of another size are rejected', () => {
    assert.throws(() => pfaffianModulo(Float64Array.of(0, 1, 0, 0), 2, listPrimes(1)[0]), /below 67108864/);
    assert.throws(() => pfaffianModulo(Float64Array.of(0, 1, 0), 2, prime), /size x size/);
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
    const difference = cylinderTorusModular.calculateLog2Bound({ ...board, torus: true }) - cylinderTorusModular.calculateLog2Bound({ ...board, torus: false });

    assert.equal(difference, board.cols);
  });

  test('threads for 20x20 on 16 GB', () => {
    assert.equal(capThreads(10, 20, 200, 16 * gigabytes), 5);
  });

  test('threads for 6x6 on 16 GB', () => {
    assert.equal(capThreads(4, 6, 18, 16 * gigabytes), 4);
  });

  test('cylinder and torus threads for a circumference of 20 on 16 GB', () => {
    assert.equal(cylinderTorusThreads(4, 20, 200, 16 * gigabytes), 1);
  });

  test('cylinder and torus threads for a circumference of 12 on 16 GB', () => {
    assert.equal(cylinderTorusThreads(10, 12, 72, 16 * gigabytes), 10);
  });

  test('cylinder and torus threads without the down-left diagonal need no wrap bit', () => {
    assert.deepEqual(
      ['king', 'triangular', 'square'].map(lattice => anyLatticeCylinderTorusThreads(40, 16, 128, lattice, 16 * gigabytes)),
      [15, 31, 31],
    );
  });

  test('threads for 20x20 on 1 GB', () => {
    assert.equal(capThreads(3, 20, 200, gigabytes), 1);
  });
});

describe('rejections of the library and of a worker that exits', () => {
  const solver = name => path.join(SOLVERS_DIRECTORY, name);
  const exitingWorkerCases = [
    ['domicule-rectangle-modular'],
    ['any-lattice-cylinder-torus-modular'],
    ['any-lattice-cylinder-torus-pfaffian', '--lattice', 'square'],
    ['any-lattice-rectangle-modular'],
    ['domicule-rectangle-polynomial-modular'],
    ['domicule-cylinder-torus-polynomial-modular'],
    ['any-lattice-rectangle-polynomial-modular'],
    ['any-lattice-cylinder-torus-polynomial-modular'],
  ].map(([algorithm, ...lattice]) => ({
    name: `${algorithm} with a worker that exits before it sends a result`,
    args: ['--require', EXITING_WORKER, solver(`${algorithm}.js`), '-r', '2', '-c', '2', '-j', '1', ...lattice],
    message: 'before it sent a result',
  }));
  const libraryCases = [
    {
      name: 'any-lattice-cylinder-torus-bigint on a torus of one row',
      args: ['-e', `require(${JSON.stringify(solver('any-lattice-cylinder-torus-bigint.js'))}).calculateTotalTilingCombinations({ rowCount: 1, colCount: 4, torus: true })`],
      message: 'a torus needs at least 2 rows',
    },
    {
      name: 'domicule-cylinder-torus-polynomial-bigint on a torus of one row',
      args: [
        '-e',
        `require(${JSON.stringify(solver('domicule-cylinder-torus-polynomial-bigint.js'))}).calculateDiagonalPolynomial({ rowCount: 1, colCount: 4, torus: true })`,
      ],
      message: 'a torus needs at least 2 rows',
    },
    {
      name: 'domicule-cylinder-torus-polynomial-modular on a circumference of one',
      args: [
        '-e',
        `require(${JSON.stringify(solver('domicule-cylinder-torus-polynomial-modular.js'))}).calculateDiagonalPolynomial({ rowCount: 4, colCount: 1 }).catch(error => { console.error(error.message); process.exit(1); })`,
      ],
      message: 'circumference must be at least 2',
    },
    {
      name: 'any-lattice-rectangle-polynomial-bigint on an unknown lattice',
      args: ['-e', `require(${JSON.stringify(solver('any-lattice-rectangle-polynomial-bigint.js'))}).calculateDiagonalPolynomial({ rowCount: 2, colCount: 2, lattice: 'hexagonal' })`],
      message: 'The lattice is square, triangular or king, not hexagonal.',
    },
    {
      name: 'any-lattice-cylinder-torus-polynomial-bigint on a torus of one row',
      args: [
        '-e',
        `require(${JSON.stringify(solver('any-lattice-cylinder-torus-polynomial-bigint.js'))}).calculateDiagonalPolynomial({ rowCount: 1, colCount: 4, torus: true, lattice: 'triangular' })`,
      ],
      message: 'a torus needs at least 2 rows',
    },
    {
      name: 'any-lattice-cylinder-torus-polynomial-modular on a circumference of one',
      args: [
        '-e',
        `require(${JSON.stringify(solver('any-lattice-cylinder-torus-polynomial-modular.js'))}).calculateDiagonalPolynomial({ rowCount: 4, colCount: 1, lattice: 'triangular' }).catch(error => { console.error(error.message); process.exit(1); })`,
      ],
      message: 'circumference must be at least 2',
    },
    {
      name: 'any-lattice-cylinder-torus-modular on a circumference of one',
      args: [
        '-e',
        `require(${JSON.stringify(solver('any-lattice-cylinder-torus-modular.js'))}).calculateTotalTilingCombinations({ rowCount: 4, colCount: 1 }).catch(error => { console.error(error.message); process.exit(1); })`,
      ],
      message: 'circumference must be at least 2',
    },
    {
      name: 'any-lattice-cylinder-torus-pfaffian on the king\'s graph',
      args: [
        '-e',
        `require(${JSON.stringify(solver('any-lattice-cylinder-torus-pfaffian.js'))}).calculateTotalTilingCombinations({ rowCount: 4, colCount: 4, lattice: 'king' }).catch(error => { console.error(error.message); process.exit(1); })`,
      ],
      message: 'is not planar',
    },
    {
      name: 'any-lattice-cylinder-torus-pfaffian on more cells than its limit',
      args: [
        '-e',
        `require(${JSON.stringify(solver('any-lattice-cylinder-torus-pfaffian.js'))}).calculateTotalTilingCombinations({ rowCount: 41, colCount: 40, lattice: 'square' }).catch(error => { console.error(error.message); process.exit(1); })`,
      ],
      message: 'at most 1600 cells',
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
    ['any-lattice-cylinder-torus-modular.js', 'calculateTotalTilingCombinations', fourByFour('any-lattice-cylinder-torus-bigint')],
    ['any-lattice-cylinder-torus-pfaffian.js', 'calculateTotalTilingCombinations', fourByFour('any-lattice-cylinder-torus-pfaffian')],
    ['any-lattice-rectangle-modular.js', 'calculateTotalTilingCombinations', fourByFour('any-lattice-rectangle-bigint')],
    ['domicule-rectangle-polynomial-modular.js', 'calculateDiagonalPolynomial', fourByFour('domicule-rectangle-polynomial-bigint')],
    ['domicule-cylinder-torus-polynomial-modular.js', 'calculateDiagonalPolynomial', fourByFour('domicule-cylinder-torus-polynomial-bigint')],
    ['any-lattice-rectangle-polynomial-modular.js', 'calculateDiagonalPolynomial', fourByFour('any-lattice-rectangle-polynomial-bigint')],
    ['any-lattice-cylinder-torus-polynomial-modular.js', 'calculateDiagonalPolynomial', fourByFour('any-lattice-cylinder-torus-polynomial-bigint')],
  ];

  for (const [fileName, method, { expectedResult, ...board }] of modules) {
    test(fileName, async () => {
      const result = await require(path.join(SOLVERS_DIRECTORY, fileName))[method](board);

      assert.equal([].concat(result).map(String).join(), expectedResult);
    });
  }
});

