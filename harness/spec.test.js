const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, test } = require('node:test');
const { readRepository, listPortErrors } = require('./portCheck.js');
const { testCasesOf, isEvenSquare } = require('../js/core/cases');

const ROOT_DIRECTORY = path.join(__dirname, '..');

describe('data', () => {
  const testCasesNumber = testCasesOf('domino-rectangle-number').filter(isEvenSquare);
  const testCasesFormula = testCasesOf('domino-rectangle-formula');
  const exact = new Map(testCasesFormula.map(({ rowCount, colCount, expectedResult }) => [`${rowCount}x${colCount}`, expectedResult]));

  for (const { rowCount, colCount, expectedResult } of testCasesNumber) {
    test(`the Number count of ${rowCount}x${colCount}`, () => {
      assert.ok(Number.isSafeInteger(expectedResult), `${expectedResult} is not a safe integer.`);
      assert.equal(String(expectedResult), exact.get(`${rowCount}x${colCount}`));
    });
  }

  for (const [group, testCases] of [
    ['Number', testCasesNumber],
    ['BigInt', testCasesFormula],
    ['domicule', testCasesOf('domicule-rectangle-bigint')],
  ]) {
    test(`a(0) of the ${group} squares`, () => {
      const [first] = testCases;

      assert.equal(`${first.rowCount}x${first.colCount}`, '0x0');
      assert.equal(String(first.expectedResult), '1');
    });
  }
});

describe('diagonal anchors', () => {
  const find = (testCases, rowCount, colCount) =>
    testCases.find(t => (t.rowCount === rowCount && t.colCount === colCount) || (t.rowCount === colCount && t.colCount === rowCount));
  const anchored = testCasesOf('diagonal-pieces-modular')
    .map(({ rowCount, colCount, expectedResult }) => ({
      rowCount,
      colCount,
      coefficients: expectedResult.split(',').map(BigInt),
      domicule: find(testCasesOf('domicule-rectangle-bigint'), rowCount, colCount),
      domino: find(testCasesOf('domino-rectangle-bigint'), rowCount, colCount),
    }))
    .filter(({ domicule, domino }) => domicule && domino);

  test('at least 10 diagonal rows have both a domicule and a domino count', () => {
    assert.ok(anchored.length >= 10, `Only ${anchored.length} diagonal rows have both a domicule and a domino count in spec/cases/.`);
  });

  for (const { rowCount, colCount, coefficients, domicule, domino } of anchored) {
    test(`${rowCount}x${colCount}`, () => {
      const total = coefficients.reduce((sum, c) => sum + c, BigInt(0));

      assert.equal(total, BigInt(domicule.expectedResult), 'The sum of the coefficients differs from the domicule count.');
      assert.equal(coefficients[0], BigInt(domino.expectedResult), 'The constant coefficient differs from the domino count.');
    });
  }
});

describe('ports', () => {
  const repository = readRepository();
  const portTestCase = { rowCount: 2, colCount: 2, expectedResult: '2' };
  const mutatedBoard = { rowCount: 4, colCount: 4 };
  const mutateFirstTwinCount = caseFile =>
    caseFile.algorithm === 'domino-rectangle-formula'
      ? {
          ...caseFile,
          testCases: caseFile.testCases.map(testCase =>
            testCase.rowCount === mutatedBoard.rowCount && testCase.colCount === mutatedBoard.colCount ? { ...testCase, expectedResult: '37' } : testCase,
          ),
        }
      : caseFile;
  const firstTwinDisagreement = 'domino-rectangle-bigint and domino-rectangle-formula disagree on the 4 x 4 board 4|4||false|false: 36 against 37.';
  const languages = { rs: 'rust/solvers/src/bin', py: 'python/lattice_dimers/solvers', js: 'js/solvers' };
  const complete = { rs: 'rust/solvers/src/bin/a.rs', py: 'python/lattice_dimers/solvers/a.py', js: 'js/solvers/a.js' };
  const countPending = algorithms =>
    Object.values(algorithms).reduce((count, entry) => count + Object.keys(languages).filter(language => !Object.hasOwn(entry, language)).length, 0);
  const state = ({
    algorithms = { a: complete },
    pendingPorts = countPending(algorithms),
    files = Object.values(complete),
    caseFiles = [{ name: 'a.json', algorithm: 'a', testCases: [portTestCase] }],
    ...rest
  } = {}) => ({
    registry: { languages, pendingPorts, algorithms },
    files,
    caseFiles,
    knownLanguages: ['rs', 'py', 'js'],
    ...rest,
  });
  const cases = [
    ['the repository', repository, []],
    ['three implementations', state(), []],
    ['an algorithm still waiting for its ports', state({ algorithms: { a: { js: complete.js } }, files: [complete.js] }), []],
    [
      'a new algorithm with one language',
      state({
        algorithms: { a: complete, b: { js: 'js/solvers/b.js' } },
        pendingPorts: 0,
        files: [...Object.values(complete), 'js/solvers/b.js'],
        caseFiles: [{ name: 'a.json', algorithm: 'a', testCases: [portTestCase] }, { name: 'b.json', algorithm: 'b', testCases: [portTestCase] }],
      }),
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
        algorithms: { 'a-b': { py: 'python/lattice_dimers/solvers/a-b.py', js: 'js/solvers/a-b.js' } },
        files: ['python/lattice_dimers/solvers/a-b.py', 'js/solvers/a-b.js'],
        caseFiles: [{ name: 'a-b.json', algorithm: 'a-b', testCases: [portTestCase] }],
      }),
      ['spec/algorithms.json names the py implementation of a-b a-b.py, not a_b.py.'],
    ],
    [
      'a JavaScript script not named by its id',
      state({ algorithms: { a: { ...complete, js: 'js/solvers/b.js' } }, files: [complete.rs, complete.py, 'js/solvers/b.js'] }),
      ['spec/algorithms.json names the js implementation of a b.js, not a.js.'],
    ],
    [
      'an algorithm without its JavaScript solver',
      state({ algorithms: { a: { rs: complete.rs, py: complete.py } }, files: [complete.rs, complete.py] }),
      ['a has no js implementation; the runners and the site still reach every algorithm through it.'],
    ],
    [
      'a language without a known file extension',
      state({ knownLanguages: ['py', 'js'] }),
      ['spec/algorithms.json names rs, which harness/portCheck.js has no file extension for.'],
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
      'a case file named after no algorithm',
      state({ caseFiles: [{ name: 'a.json', algorithm: 'a', testCases: [portTestCase] }, { name: 'c.json', algorithm: 'c', testCases: [portTestCase] }] }),
      ['spec/cases/c.json is not named after an algorithm of spec/algorithms.json, so no test runs it.'],
    ],
    [
      'a case file holding the cases of another algorithm',
      state({ caseFiles: [{ name: 'a.json', algorithm: 'b', testCases: [portTestCase] }] }),
      ['spec/cases/a.json holds the cases of b; the file of an algorithm is named <id>.json.'],
    ],
    [
      'a case file in the old shape',
      state({ caseFiles: [{ name: 'a.json', algorithms: ['a'], testCases: [portTestCase] }] }),
      ['spec/cases/a.json holds the cases of undefined; the file of an algorithm is named <id>.json.'],
    ],
    [
      'a case file holding one board twice',
      state({
        caseFiles: [{ name: 'a.json', algorithm: 'a', testCases: [{ rowCount: 2, colCount: 2, expectedResult: '2' }, { rowCount: 2, colCount: 2, expectedResult: '2' }] }],
      }),
      ['spec/cases/a.json holds the board 2|2||false|false more than once.'],
    ],
    [
      'an algorithm no case file checks',
      state({ algorithms: { a: complete, b: { js: 'js/solvers/b.js' } }, files: [...Object.values(complete), 'js/solvers/b.js'] }),
      ['b has no file in spec/cases.'],
    ],
    [
      'a case file without test cases',
      state({ caseFiles: [{ name: 'a.json', algorithm: 'a', testCases: [] }] }),
      ['spec/cases/a.json holds no test cases.'],
    ],
    [
      'a copy of the case files where a modular file lacks a board of its twin',
      {
        ...repository,
        caseFiles: repository.caseFiles.map(caseFile =>
          caseFile.algorithm === 'diagonal-pieces-modular'
            ? { ...caseFile, testCases: caseFile.testCases.filter(({ rowCount, colCount }) => rowCount !== 5 || colCount !== 6) }
            : caseFile,
        ),
      },
      ['spec/cases/diagonal-pieces-modular.json lacks the board 5|6||false|false of diagonal-pieces-bigint.'],
    ],
    [
      'a mutated copy of the case files, where twin algorithms disagree on a count',
      { ...repository, caseFiles: repository.caseFiles.map(mutateFirstTwinCount) },
      [firstTwinDisagreement],
    ],
  ];

  for (const [name, repositoryState, expected] of cases) {
    test(name, () => {
      assert.deepEqual(listPortErrors(repositoryState), expected);
    });
  }
});

test('research/king-entropy reads its counts from spec/cases', () => {
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

  assert.deepEqual(stale, [], 'These files still read the counts from data/ at the repository root, which moved to spec/cases.');
});

describe('the shared test data', () => {
  const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'spec', file), 'utf-8'));
  const { algorithms } = read('algorithms.json');
  const limits = read('limits.json');
  const cli = read('cli.json');
  const ids = Object.keys(algorithms);

  test('every rule of spec/limits.json has one known key and names known algorithms', () => {
    assert.ok(limits.firstCases > 0);

    for (const [id, rule] of Object.entries(limits.algorithms)) {
      const [key, value, ...rest] = Object.entries(rule).flat();

      assert.ok(ids.includes(id), id);
      assert.deepEqual(rest, [], id);
      assert.ok(['maxTorusSide', 'maxSquareSide', 'firstCasesPlusBoardsOf'].includes(key), id);
      assert.ok(key !== 'firstCasesPlusBoardsOf' || ids.includes(value), id);
    }
  });

  test('every entry of spec/cli.json names a known algorithm, and every algorithm has rejections', () => {
    const named = ['rejections', 'parity', 'memory', 'longCounts'].flatMap(group => cli[group].map(({ algorithm }) => algorithm));

    assert.deepEqual(named.filter(id => !ids.includes(id)), []);
    assert.deepEqual(ids.filter(id => !cli.rejections.some(({ algorithm }) => algorithm === id)), []);
    assert.ok(ids.includes(cli.timeSpan.algorithm));
  });
});
