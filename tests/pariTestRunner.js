const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  testCasesBigInt,
  testCasesDomicule,
  testCasesDomiculeRectangles,
  testCasesPeriodic,
  testCasesDiagonal,
} = require('../data');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const OEIS_DIRECTORY = path.join(ROOT_DIRECTORY, 'oeis');
const GP = process.env.GP_PATH || 'gp';
const GP_TIMEOUT = 300000;
const OUTPUT_MARKER = 'END OF PROGRAMS';
const MAX_DOMICULE_SQUARE_SIDE = 12;
const MAX_TORUS_CIRCUMFERENCE = 8;
const MAX_DIAGONAL_SIDE = 8;
const PROGRAMS = [
  {
    files: ['oeis/A004003/A004003.gp'],
    testCases: testCasesBigInt
      .filter(({ rowCount, colCount }) => rowCount === colCount && rowCount % 2 === 0)
      .map(({ rowCount, expectedResult }) => ({ call: `a(${rowCount / 2})`, expectedResult })),
  },
  {
    files: ['oeis/A239264/A239264.gp'],
    testCases: [
      ...testCasesDomicule.filter(({ rowCount }) => rowCount <= MAX_DOMICULE_SQUARE_SIDE),
      ...testCasesDomiculeRectangles,
    ].map(({ rowCount, colCount, expectedResult }) => ({
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
    testCases: testCasesPeriodic
      .filter(({ lattice, torus, twisted, colCount }) => lattice === 'king' && torus && !twisted && colCount <= MAX_TORUS_CIRCUMFERENCE)
      .map(({ rowCount, colCount, expectedResult }) => ({ call: `T(${rowCount}, ${colCount})`, expectedResult }))
      .concat({ call: 'a(2)', expectedResult: '17552' }),
  },
  {
    files: ['oeis/A401673/A401673.gp'],
    testCases: testCasesDiagonal
      .filter(({ rowCount, colCount }) => Math.max(rowCount, colCount) <= MAX_DIAGONAL_SIDE)
      .map(({ rowCount, colCount, expectedResult }) => ({
        call: `(q -> vector(${rowCount * colCount}\\2 + 1, k, polcoef(q, k-1)))(P(${rowCount}, ${colCount}))`,
        expectedResult: `[${expectedResult.split(',').join(', ')}]`,
      }))
      .concat({ call: 'row(2)', expectedResult: '[36, 126, 105, 12, 1]' }),
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
    console.error(
      `Failed to run PARI/GP (${GP}): ${error ? error.message : stderr.trim()}. Install it (apt install pari-gp, brew install pari) or set GP_PATH.`,
    );

    return null;
  }

  return stdout.slice(stdout.indexOf(`${OUTPUT_MARKER}\n`) + OUTPUT_MARKER.length + 1).trim().split('\n');
}

function executeGpTests({ files, testCases }) {
  const file = files[files.length - 1];
  const results = runGp(
    files.map(name => `read("${path.join(ROOT_DIRECTORY, name).replace(/\\/g, '/')}");`),
    testCases.map(({ call }) => call),
  );

  if (!results) {
    return false;
  }

  return testCases.every(({ call, expectedResult }, index) => {
    process.stdout.write(`Executing PARI/GP test ${index + 1} of ${testCases.length} for ${file}: ${call}... `);

    if (results[index] !== expectedResult) {
      console.error(`Failed! Expected: ${expectedResult}, Actual: ${results[index]}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
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

function executeProgramListTest() {
  const tested = new Set(PROGRAMS.flatMap(({ files }) => files));
  const untested = fs
    .readdirSync(OEIS_DIRECTORY)
    .filter(name => /^A\d{6}$/.test(name))
    .map(entry => `oeis/${entry}/${entry}.gp`)
    .filter(file => fs.existsSync(path.join(ROOT_DIRECTORY, file)) && !tested.has(file));

  process.stdout.write('Executing the test that every program in oeis/ is run... ');

  if (untested.length > 0) {
    console.error(`Failed! No test in tests/pariTestRunner.js runs ${untested.join(', ')}.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function executeEntryProgramTests() {
  const entries = fs.readdirSync(OEIS_DIRECTORY).filter(name => /^A\d{6}$/.test(name)).sort();

  return entries
    .map(entry => {
      const program = readEntryProgram(entry);

      if (program.length === 0) {
        return true;
      }

      process.stdout.write(`Executing the PARI program of ${entry}.txt against b${entry.slice(1)}.txt... `);

      if (!fs.existsSync(path.join(OEIS_DIRECTORY, entry, `b${entry.slice(1)}.txt`))) {
        console.error(`Failed! ${entry}.txt has a PARI program and oeis/${entry} has no b-file to check it against.`);

        return false;
      }

      if (!ENTRY_PROGRAMS[entry]) {
        console.error(`Failed! ${entry}.txt has a PARI program with no test in tests/pariTestRunner.js.`);

        return false;
      }

      const dependencies = [...program.join('\n').matchAll(/defined in (A\d{6})/g)].flatMap(([, other]) => readEntryProgram(other));
      const results = runGp([...dependencies, ...program], [ENTRY_PROGRAMS[entry]]);

      if (!results) {
        return false;
      }

      const actual = results[0].replace(/^\[|\]$/g, '').split(', ');
      const expected = fs
        .readFileSync(path.join(OEIS_DIRECTORY, entry, `b${entry.slice(1)}.txt`), 'utf-8')
        .split('\n')
        .slice(0, actual.length)
        .map(line => line.split(' ')[1]);

      if (actual.join(',') !== expected.join(',')) {
        console.error(`Failed! Expected: ${expected.join(', ')}, Actual: ${actual.join(', ')}`);

        return false;
      }

      console.log(`Passed! (${actual.length} terms)`);

      return true;
    })
    .every(Boolean);
}

function __main__() {
  const gpTestsPassed = PROGRAMS.map(executeGpTests).every(Boolean);
  const programListPassed = executeProgramListTest();
  const entryTestsPassed = executeEntryProgramTests();

  if (gpTestsPassed && programListPassed && entryTestsPassed) {
    console.log('All PARI/GP tests completed successfully.');
    process.exit(0);
  }

  console.error('Some PARI/GP tests failed.');
  process.exit(1);
}

__main__();
