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

describe('rectangles on three lattices', () => {
  const rectangles = testCasesOf('all-lattices-rectangle-modular');
  const storedOf = algorithm =>
    new Map(testCasesOf(algorithm).map(({ rowCount, colCount, expectedResult }) => [`${rowCount}x${colCount}`, String(expectedResult)]));
  const anchors = { square: storedOf('domino-rectangle-bigint'), king: storedOf('domicule-rectangle-bigint') };

  for (const lattice of ['square', 'king']) {
    const shared = rectangles.filter(t => t.lattice === lattice && anchors[lattice].has(`${t.rowCount}x${t.colCount}`));

    test(`the ${lattice} rectangles agree with the stored ${lattice === 'square' ? 'domino' : 'domicule'} counts`, () => {
      assert.ok(shared.length >= 5, `Only ${shared.length} ${lattice} rectangles share a board with the stored counts.`);

      for (const { rowCount, colCount, expectedResult } of shared) {
        assert.equal(expectedResult, anchors[lattice].get(`${rowCount}x${colCount}`), `${rowCount}x${colCount}`);
      }
    });
  }

  const listTilings = ({ rowCount, colCount }) => {
    const covered = Array.from({ length: rowCount }, () => new Array(colCount).fill(false));
    const place = index => {
      while (index < rowCount * colCount && covered[Math.floor(index / colCount)][index % colCount]) {
        index++;
      }

      if (index === rowCount * colCount) {
        return 1;
      }

      const r = Math.floor(index / colCount);
      const c = index % colCount;
      let total = 0;
      covered[r][c] = true;

      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1]]) {
        if (r + dr < rowCount && c + dc < colCount && !covered[r + dr][c + dc]) {
          covered[r + dr][c + dc] = true;
          total += place(index + 1);
          covered[r + dr][c + dc] = false;
        }
      }

      covered[r][c] = false;

      return total;
    };

    return String(place(0));
  };
  test('the signs of oeis/A401988/A401988.gp orient every triangular face the same odd way', () => {
    const program = fs.readFileSync(path.join(ROOT_DIRECTORY, 'oeis', 'A401988', 'A401988.gp'), 'utf-8');

    for (const line of [
      'D = [1, 0; 0, 1; 1, 1]',
      's = if (k < 3 && x % 2 == 0, -1, 1);',
      'K[x*L + y + 1, x2*L + y2 + 1] = s;',
      'K[x2*L + y2 + 1, x*L + y + 1] = -s',
    ]) {
      assert.ok(program.includes(line), `The program no longer has ${line}; check its faces again.`);
    }

    const sign = (x, k) => (k < 2 && x % 2 === 0 ? -1 : 1);
    const STEPS = [[1, 0], [0, 1], [1, 1]];
    const along = ([ax, ay], [bx, by]) => {
      const k = STEPS.findIndex(([dx, dy]) => bx - ax === dx && by - ay === dy);

      return k === -1 ? Number(sign(bx, STEPS.findIndex(([dx, dy]) => ax - bx === dx && ay - by === dy)) === -1) : Number(sign(ax, k) === 1);
    };
    const parities = new Set();

    for (let L = 2; L <= 12; L++) {
      for (let x = 0; x + 1 < L; x++) {
        for (let y = 0; y + 1 < L; y++) {
          for (const face of [
            [[x, y], [x + 1, y], [x + 1, y + 1]],
            [[x, y], [x + 1, y + 1], [x, y + 1]],
          ]) {
            parities.add(face.reduce((sum, corner, i) => sum + along(corner, face[(i + 1) % 3]), 0) % 2);
          }
        }
      }
    }

    assert.deepEqual([...parities], [1]);
  });

  const small = rectangles.filter(t => t.lattice === 'triangular' && t.rowCount * t.colCount <= 40);

  test('at least 6 triangular rectangles are small enough to list', () => {
    assert.ok(small.length >= 6, `Only ${small.length} triangular rectangles have at most 40 cells.`);
  });

  for (const testCase of small) {
    test(`the triangular ${testCase.rowCount}x${testCase.colCount} rectangle listed one tiling at a time`, () => {
      assert.equal(listTilings(testCase), testCase.expectedResult);
    });
  }
});

describe('cylinder and torus diagonal anchors', () => {
  const periodic = require('../js/solvers/all-lattices-cylinder-torus-bigint.js');
  const anchored = testCasesOf('domicule-cylinder-torus-polynomial-modular').filter(({ rowCount, colCount }) => rowCount * colCount <= 64);

  test('at least 20 cylinder and torus rows are small enough to anchor', () => {
    assert.ok(anchored.length >= 20, `Only ${anchored.length} rows of spec/cases/ are anchored.`);
  });

  for (const { rowCount, colCount, torus = false, expectedResult } of anchored) {
    test(`${rowCount}x${colCount} ${torus ? 'torus' : 'cylinder'}`, () => {
      const coefficients = expectedResult.split(',').map(BigInt);
      const count = lattice => periodic.calculateTotalTilingCombinations({ rowCount, colCount, lattice, torus });

      assert.equal(coefficients.reduce((sum, c) => sum + c, BigInt(0)), count('king'), 'The sum of the coefficients differs from the count on the king\'s graph.');
      assert.equal(coefficients[0], count('square'), 'The constant coefficient differs from the domino count.');
    });
  }
});

describe('cylinder and torus diagonal pieces listed one by one', () => {
  const listCoefficients = ({ rowCount, colCount, torus = false }) => {
    const cells = rowCount * colCount;
    const id = (r, c) => r * colCount + c;
    const edges = Array.from({ length: cells }, () => []);
    const join = (a, b, diagonal) => {
      edges[a].push({ other: b, diagonal });
      edges[b].push({ other: a, diagonal });
    };

    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        join(id(r, c), id(r, (c + 1) % colCount), 0);

        if (r + 1 < rowCount || torus) {
          [-1, 0, 1].forEach(d => join(id(r, c), id((r + 1) % rowCount, (c + d + colCount) % colCount), d === 0 ? 0 : 1));
        }
      }
    }

    const counts = new Array(Math.floor(cells / 2) + 1).fill(0);
    const covered = new Array(cells).fill(false);
    const place = (from, diagonals) => {
      const cell = covered.indexOf(false, from);

      if (cell === -1) {
        counts[diagonals]++;
        return;
      }

      covered[cell] = true;
      edges[cell]
        .filter(({ other }) => other !== cell && !covered[other])
        .forEach(({ other, diagonal }) => {
          covered[other] = true;
          place(cell + 1, diagonals + diagonal);
          covered[other] = false;
        });
      covered[cell] = false;
    };

    place(0, 0);

    return counts.join(",");
  };
  const small = testCasesOf('domicule-cylinder-torus-polynomial-bigint').filter(({ rowCount, colCount }) => rowCount >= 1 && rowCount * colCount <= 16);

  test('at least 15 boards are small enough to list', () => {
    assert.ok(small.length >= 15, `Only ${small.length} boards of spec/cases/ have at most 16 cells.`);
  });

  for (const testCase of small) {
    test(`${testCase.rowCount}x${testCase.colCount} ${testCase.torus ? 'torus' : 'cylinder'}`, () => {
      assert.equal(listCoefficients(testCase), testCase.expectedResult);
    });
  }
});

describe('diagonal anchors', () => {
  const find = (testCases, rowCount, colCount) =>
    testCases.find(t => (t.rowCount === rowCount && t.colCount === colCount) || (t.rowCount === colCount && t.colCount === rowCount));
  const anchored = testCasesOf('domicule-rectangle-polynomial-modular')
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
          caseFile.algorithm === 'domicule-rectangle-polynomial-modular'
            ? { ...caseFile, testCases: caseFile.testCases.filter(({ rowCount, colCount }) => rowCount !== 5 || colCount !== 6) }
            : caseFile,
        ),
      },
      ['spec/cases/domicule-rectangle-polynomial-modular.json lacks the board 5|6||false|false of domicule-rectangle-polynomial-bigint.'],
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
    assert.ok(Number.isInteger(limits.firstCases) && limits.firstCases > 0);

    for (const [id, rule] of Object.entries(limits.algorithms)) {
      const [key, value, ...rest] = Object.entries(rule).flat();

      assert.ok(ids.includes(id), id);
      assert.deepEqual(rest, [], id);
      assert.ok(['maxTorusSide', 'maxSquareSide', 'firstCasesPlusBoardsOf'].includes(key), id);
      assert.ok(key === 'firstCasesPlusBoardsOf' ? ids.includes(value) && value !== id : Number.isInteger(value) && value > 0, id);
    }
  });

  test('every entry of spec/cli.json names a known algorithm, and every algorithm has rejections', () => {
    const named = ['rejections', 'parity', 'memory', 'longCounts'].flatMap(group => cli[group].map(({ algorithm }) => algorithm));

    assert.deepEqual(named.filter(id => !ids.includes(id)), []);
    assert.deepEqual(ids.filter(id => !cli.rejections.some(({ algorithm }) => algorithm === id)), []);
    assert.ok(ids.includes(cli.timeSpan.algorithm));
  });
});

test('every cylinder and torus of the benchmark run the site shows has a stored count', () => {
  const { readBenchmarkRuns, listJavaScriptResults } = require('../site/benchmarkRuns');
  const { latest } = readBenchmarkRuns();
  const directory = path.join(ROOT_DIRECTORY, 'benchmarks', 'results', latest);
  const stored = new Set(
    testCasesOf('all-lattices-cylinder-torus-modular')
      .filter(({ twisted }) => !twisted)
      .map(({ rowCount, colCount, lattice, torus }) => `${rowCount}x${colCount}-${lattice}-${torus ? 'torus' : 'cylinder'}`),
  );
  const measured = listJavaScriptResults(directory, 'all-lattices-cylinder-torus-')
    .map(fileName => fileName.match(/_(\d+x\d+-(?:king|square)-(?:torus|cylinder))\.txt$/))
    .filter(Boolean)
    .map(([, board]) => board);

  assert.ok(measured.length > 0);
  assert.deepEqual([...new Set(measured.filter(board => !stored.has(board)))], [], 'Add these counts to spec/cases/all-lattices-cylinder-torus-modular.json.');
});

test('every board of the cylinder and torus diagonal run the site shows has a stored king count', () => {
  const { findSeriesRun, listJavaScriptResults } = require('../site/benchmarkRuns');
  const run = findSeriesRun('domicule-cylinder-torus-polynomial-');
  const stored = new Set(
    testCasesOf('all-lattices-cylinder-torus-modular')
      .filter(({ lattice, twisted }) => lattice === 'king' && !twisted)
      .map(({ rowCount, colCount, torus }) => `${rowCount}x${colCount}-${torus ? 'torus' : 'cylinder'}`),
  );
  const measured = run === null
    ? []
    : listJavaScriptResults(path.join(ROOT_DIRECTORY, 'benchmarks', 'results', run), 'domicule-cylinder-torus-polynomial-')
        .map(fileName => fileName.match(/_(\d+x\d+-(?:torus|cylinder))\.txt$/))
        .filter(Boolean)
        .map(([, board]) => board);

  assert.deepEqual([...new Set(measured.filter(board => !stored.has(board)))], [], 'Add these king counts to spec/cases/all-lattices-cylinder-torus-modular.json.');
});
