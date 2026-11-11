const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const { testCasesOf, isEvenSquare } = require('../js/core/cases');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const OEIS_DIRECTORY = path.join(ROOT_DIRECTORY, 'oeis');
const GP = process.env.GP_PATH || 'gp';
const GP_TIMEOUT = 300000;
const OUTPUT_MARKER = 'END OF PROGRAMS';
const MAX_DOMICULE_SQUARE_SIDE = 12;
const MAX_TORUS_CIRCUMFERENCE = 8;
const MAX_DIAGONAL_SIDE = 8;
const MAX_TRIANGULAR_SIDE = 16;
const PROGRAMS = [
  {
    files: ['oeis/A004003/A004003.gp'],
    testCases: testCasesOf('domino-rectangle-formula')
      .filter(({ rowCount, colCount }) => rowCount === colCount && rowCount % 2 === 0)
      .map(({ rowCount, expectedResult }) => ({ call: `a(${rowCount / 2})`, expectedResult })),
  },
  {
    files: ['oeis/A239264/A239264.gp'],
    testCases: testCasesOf('domicule-rectangle-bigint')
      .filter(testCase => !isEvenSquare(testCase) || testCase.rowCount <= MAX_DOMICULE_SQUARE_SIDE)
      .map(({ rowCount, colCount, expectedResult }) => ({
        call: `T(${Math.max(rowCount, colCount)}, ${Math.min(rowCount, colCount)})`,
        expectedResult,
      })),
  },
  {
    files: ['oeis/A239264/A239264.gp', 'oeis/A239273/A239273.gp'],
    testCases: [
      { call: 'a(1)', expectedResult: '3' },
      { call: 'a(2)', expectedResult: '280' },
    ],
  },
  {
    files: ['oeis/A401670/A401670.gp'],
    testCases: testCasesOf('all-lattices-cylinder-torus-modular')
      .filter(({ lattice, torus, twisted, colCount }) => lattice === 'king' && torus && !twisted && colCount <= MAX_TORUS_CIRCUMFERENCE)
      .map(({ rowCount, colCount, expectedResult }) => ({ call: `T(${rowCount}, ${colCount})`, expectedResult }))
      .concat({ call: 'a(2)', expectedResult: '17552' }),
  },
  {
    files: ['oeis/A401673/A401673.gp'],
    testCases: testCasesOf('domicule-rectangle-polynomial-modular')
      .filter(({ rowCount, colCount }) => Math.max(rowCount, colCount) <= MAX_DIAGONAL_SIDE)
      .map(({ rowCount, colCount, expectedResult }) => ({
        call: `(q -> vector(${rowCount * colCount}\\2 + 1, k, polcoef(q, k-1)))(P(${rowCount}, ${colCount}))`,
        expectedResult: `[${expectedResult.split(',').join(', ')}]`,
      }))
      .concat({ call: 'row(2)', expectedResult: '[36, 126, 105, 12, 1]' }),
  },
  {
    files: ['notes/triangular-lattice/rectangles.gp'],
    testCases: testCasesOf('all-lattices-rectangle-modular')
      .filter(({ lattice, rowCount, colCount }) => lattice === 'triangular' && rowCount === colCount && rowCount % 2 === 0 && rowCount <= MAX_TRIANGULAR_SIDE)
      .map(({ rowCount, expectedResult }) => ({ call: `a(${rowCount / 2})`, expectedResult })),
  },
];
const ENTRY_PROGRAMS = {
  A004003: 'vector(11, n, a(n-1))',
  A239264: 'concat(vector(11, d, vector(d, n, T(n-1, d-n))))',
  A239273: 'vector(5, n, a(n-1))',
  A401670: 'vector(5, n, a(n-1))',
  A401673: 'concat(vector(4, n, row(n-1)))',
};

function runGp(programs, calls) {
  const script = ['default(parisizemax, 10^9);', ...programs, `print("${OUTPUT_MARKER}");`, ...calls.map(call => `print(${call});`)].join('\n');
  const { status, stdout, stderr, error } = spawnSync(GP, ['-q', '-f'], {
    input: script,
    encoding: 'utf-8',
    timeout: GP_TIMEOUT,
  });

  if (error || status !== 0 || stderr.split('\n').some(line => line.includes('***') && !line.includes('Warning'))) {
    throw new Error(
      `Failed to run PARI/GP (${GP}): ${error ? error.message : stderr.trim()}. Install it (apt install pari-gp, brew install pari, micromamba create -n pari -c conda-forge pari) or set GP_PATH.`,
    );
  }

  return stdout.slice(stdout.indexOf(`${OUTPUT_MARKER}\n`) + OUTPUT_MARKER.length + 1).trim().split('\n');
}

function runProgramCalls({ files, testCases }) {
  return runGp(
    files.map(name => `read("${path.join(ROOT_DIRECTORY, name).replace(/\\/g, '/')}");`),
    testCases.map(({ call }) => call),
  );
}

function readEntryProgram(entry) {
  const lines = fs
    .readFileSync(path.join(OEIS_DIRECTORY, entry, `${entry}.txt`), 'utf-8')
    .split('\n')
    .filter(line => line.startsWith(`%o ${entry} `))
    .map(line => line.slice(`%o ${entry} `.length));
  const start = lines.findIndex(line => line.startsWith('(PARI) '));

  if (start === -1) {
    return [];
  }

  const end = lines.findIndex((line, index) => index > start && /^\([A-Za-z]/.test(line));
  const program = lines.slice(start, end === -1 ? lines.length : end);
  program[0] = program[0].slice('(PARI) '.length);

  return program;
}

function checkProgramList() {
  const tested = new Set(PROGRAMS.flatMap(({ files }) => files));
  const untested = fs
    .readdirSync(OEIS_DIRECTORY)
    .filter(name => /^A\d{6}$/.test(name))
    .map(entry => `oeis/${entry}/${entry}.gp`)
    .filter(file => fs.existsSync(path.join(ROOT_DIRECTORY, file)) && !tested.has(file));

  assert.deepEqual(untested, [], 'No test in harness/pari.test.js runs these programs.');
}

function checkEntryProgram(entry, program) {
  assert.ok(
    fs.existsSync(path.join(OEIS_DIRECTORY, entry, `b${entry.slice(1)}.txt`)),
    `${entry}.txt has a PARI program and oeis/${entry} has no b-file to check it against.`,
  );
  assert.ok(ENTRY_PROGRAMS[entry], `${entry}.txt has a PARI program with no test in harness/pari.test.js.`);

  const dependencies = [...program.join('\n').matchAll(/defined in (A\d{6})/g)].flatMap(([, other]) => readEntryProgram(other));
  const results = runGp([...dependencies, ...program], [ENTRY_PROGRAMS[entry]]);
  const actual = results[0].replace(/^\[|\]$/g, '').split(', ');
  const expected = fs
    .readFileSync(path.join(OEIS_DIRECTORY, entry, `b${entry.slice(1)}.txt`), 'utf-8')
    .split('\n')
    .slice(0, actual.length)
    .map(line => line.split(' ')[1]);

  assert.deepEqual(actual, expected);
}

for (const program of PROGRAMS) {
  const file = program.files[program.files.length - 1];
  let results;

  program.testCases.forEach(({ call, expectedResult }, index) => {
    test(`PARI/GP test ${index + 1} of ${program.testCases.length} for ${file}: ${call}`, () => {
      results ??= runProgramCalls(program);
      assert.equal(results[index], expectedResult);
    });
  });
}

test('every program in oeis/ is run', checkProgramList);

for (const entry of fs.readdirSync(OEIS_DIRECTORY).filter(name => /^A\d{6}$/.test(name)).sort()) {
  const program = readEntryProgram(entry);

  if (program.length > 0) {
    test(`the PARI program of ${entry}.txt against b${entry.slice(1)}.txt`, () => {
      checkEntryProgram(entry, program);
    });
  }
}
