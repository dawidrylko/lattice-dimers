const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, test, before, after } = require('node:test');
const { runDirectoryName } = require('../environment');
const { estimateBoard, parseInstructionCount, compareRuns } = require('../full');
const { compareSeries } = require('../measureVariance');
const { readBenchmarkRuns } = require('../../site/benchmarkRuns.js');
const { WRONG_COUNT, makeTemporaryDirectory, runNode } = require('./support');

describe('the plan of a full run', () => {
  test('a first board has no estimate', () => {
    assert.equal(estimateBoard({ seriesName: 'a-king-torus', previousSeconds: null, earlierSeconds: 0 }), 0);
  });

  test('the state count bounds a low observed growth from below', () => {
    assert.equal(estimateBoard({ seriesName: 'domino-rectangle-bigint.rs', previousSeconds: 2, earlierSeconds: 1 }), 2 * 4.4);
  });

  test('a higher observed growth wins over the floor', () => {
    assert.equal(estimateBoard({ seriesName: 'domino-rectangle-bigint.rs', previousSeconds: 20, earlierSeconds: 1 }), 400);
  });

  test('the name of a solver does not make a cylinder a torus', () => {
    assert.equal(estimateBoard({ seriesName: 'all-lattices-cylinder-torus-modular.js-king-cylinder', previousSeconds: 1, earlierSeconds: 0 }), 4.4);
  });

  test('the instruction count is read from the output of Cachegrind', () => {
    assert.equal(parseInstructionCount('==76== I refs:        68,784,200\n'), 68784200);
    assert.equal(parseInstructionCount('no count'), null);
  });

  test('the run directory is named by the commit and the toolchain', () => {
    const name = runDirectoryName({ commit: 'abcdef1234567890', dirty: true, node: 'v26.11.1', python: 'Python 3.14.5', rust: null });

    assert.equal(name, 'abcdef123456-node26.11.1-python3.14.5-rustnone-dirty');
  });

  test('the noise floor is the difference between two series', () => {
    const series = medians => ({ results: medians.map(median => ({ id: 'x', board: String(median), language: 'js', median, cv: 1 })) });
    const noise = compareSeries(
      { results: [{ id: 'x', board: 'b', language: 'js', median: 100, cv: 1 }, { id: 'y', board: 'b', language: 'js', median: 5, cv: 1 }] },
      { results: [{ id: 'x', board: 'b', language: 'js', median: 90, cv: 3 }] },
    );

    assert.equal(noise.length, 1);
    assert.equal(noise[0].difference, 11.11);
    assert.equal(noise[0].cv, 3);
    assert.deepEqual(compareSeries(series([1]), series([2])), []);
  });

  test('a comparison gives the ratio of the medians', t => {
    const benchmarkRoot = makeTemporaryDirectory(t, 'domino-benchmark-');
    const write = (run, text) => {
      fs.mkdirSync(path.join(benchmarkRoot, run), { recursive: true });
      fs.writeFileSync(path.join(benchmarkRoot, run, 'x.js_2x2.txt'), text);
    };

    write('a', '1. Execution Time: 10 ms, Process Time: 11 ms\n2. Execution Time: 12 ms, Process Time: 13 ms\n');
    write('b', '1. Execution Time: 24 ms, Process Time: 25 ms\n');

    assert.equal(compareRuns(path.join(benchmarkRoot, 'a'), path.join(benchmarkRoot, 'b'))[0]?.ratio, 2);
  });

  test('the site reads the newest complete and clean run', t => {
    const benchmarkRoot = makeTemporaryDirectory(t, 'domino-benchmark-');
    const write = (run, text) => {
      fs.mkdirSync(path.join(benchmarkRoot, run), { recursive: true });
      fs.writeFileSync(path.join(benchmarkRoot, run, 'environment.json'), text);
    };

    write('2000-01', '{}');
    write('c1-new', JSON.stringify({ date: '2026-12-01', dirty: false, complete: false }));
    write('c2-dirty', JSON.stringify({ date: '2026-12-02', dirty: true, complete: true }));
    write('c3-done', JSON.stringify({ date: '2026-11-30', dirty: false, complete: true }));

    assert.equal(readBenchmarkRuns(benchmarkRoot).latest, 'c3-done');
  });
});

describe('a full run', () => {
  let benchmarkRoot;

  before(() => {
    benchmarkRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-benchmark-'));
  });

  after(() => fs.rmSync(benchmarkRoot, { recursive: true, force: true }));

  const run = (env, extra = []) =>
    runNode(['benchmarks/full.js', '--board-budget-hours', '0.0001', '--skip-instructions', ...extra], {
      env: { ...process.env, BENCHMARK_ROOT: benchmarkRoot, BENCHMARK_COMMIT: 'fullruntest0', ...env },
      timeout: undefined,
    });
  const directoryOf = () => path.join(benchmarkRoot, fs.readdirSync(benchmarkRoot).find(name => name.startsWith('fullruntest0')));
  const read = (directory, name) => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf-8'));

  test('one solver does not complete a run or measure another solver', () => {
    const batch = run({}, ['domino-rectangle-formula']);
    const environment = read(directoryOf(), 'environment.json');

    assert.equal(batch.status, 0, batch.stderr.trim());
    assert.equal(environment.complete, false);
    assert.equal(fs.existsSync(path.join(directoryOf(), 'domino-rectangle-bigint.js_2x2.txt')), false);
  });

  test('a night limit stops before the next board', () => {
    const stopped = run({}, ['domino-rectangle-bigint', '--stop-after-hours', '0.0000001']);

    assert.equal(stopped.status, 0, stopped.stderr.trim());
    assert.equal(fs.existsSync(path.join(directoryOf(), 'domino-rectangle-bigint.js_8x8.txt')), false);
  });

  test('an unknown solver is refused', () => {
    assert.notEqual(run({}, ['no-such-solver']).status, 0);
  });

  test('a budgeted run finishes, records what it left out and keeps the boards it measured', () => {
    const first = run({});
    const directory = directoryOf();
    const environment = read(directory, 'environment.json');
    const plan = read(directory, 'plan.json');
    const kept = path.join(directory, 'domino-rectangle-bigint.js_2x2.txt');
    const before = fs.statSync(kept).mtimeMs;

    assert.equal(first.status, 0, first.stderr.trim());
    assert.equal(environment.complete, true);
    assert.ok(
      plan.notMeasured.some(({ reason, estimateTenRunsHours }) => reason === 'over budget' && estimateTenRunsHours > 0),
      'The plan does not record a board left out for its budget.',
    );

    run({});

    assert.equal(fs.statSync(kept).mtimeMs, before, 'A rerun measured a board again.');
  });

  test('a wrong count stops the run and leaves it incomplete', () => {
    fs.rmSync(directoryOf(), { recursive: true, force: true });

    const wrong = run({ PYTHON: WRONG_COUNT });

    assert.notEqual(wrong.status, 0, 'A wrong count did not stop the run.');
    assert.equal(read(directoryOf(), 'environment.json').complete, false);
  });
});
