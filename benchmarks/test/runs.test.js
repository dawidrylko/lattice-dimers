const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { listJavaScriptResults, describeMissing, findSeriesRun, hasTriangularResults, readTriangularTimes } = require('../../site/benchmarkRuns.js');
const { listSeries } = require('../full');
const { generateFileName } = require('../runner');
const { makeTemporaryDirectory } = require('./support');

test('a benchmark table reads the JavaScript results only', t => {
  const benchmarkRoot = makeTemporaryDirectory(t, 'domino-benchmark-');

  fs.mkdirSync(path.join(benchmarkRoot, 'tables'));
  ['a-b-bigint.js_2x2.txt', 'a-b-bigint.rs_4x4.txt', 'a_b_bigint.py_6x6.txt', 'c-d-bigint.js_8x8.txt'].forEach(file => fs.writeFileSync(path.join(benchmarkRoot, 'tables', file), ''));

  assert.deepEqual(listJavaScriptResults(path.join(benchmarkRoot, 'tables'), 'a-b-'), ['a-b-bigint.js_2x2.txt']);
});

test('a benchmark table leaves out a longer solver id that starts with its prefix', t => {
  const directory = makeTemporaryDirectory(t, 'prefix-benchmark-');

  ['domicule-rectangle-bigint.js_2x2.txt', 'domicule-rectangle-polynomial-bigint.js_20x20.txt'].forEach(file => fs.writeFileSync(path.join(directory, file), ''));

  assert.deepEqual(listJavaScriptResults(directory, 'domicule-rectangle-'), ['domicule-rectangle-bigint.js_2x2.txt']);
  assert.deepEqual(listJavaScriptResults(directory, 'domicule-rectangle-polynomial-'), ['domicule-rectangle-polynomial-bigint.js_20x20.txt']);
});

test('a table of solvers newer than the complete run reads the newest clean run that measured them', t => {
  const root = makeTemporaryDirectory(t, 'series-benchmark-');
  const run = (name, environment, files) => {
    fs.mkdirSync(path.join(root, name));
    fs.writeFileSync(path.join(root, name, 'environment.json'), JSON.stringify(environment));
    files.forEach(file => fs.writeFileSync(path.join(root, name, file), ''));
  };

  run('old', { complete: true, dirty: false, date: '2026-11-07' }, ['domicule-rectangle-bigint.js_2x2.txt']);
  run('new', { complete: false, dirty: false, date: '2026-11-09' }, ['domicule-cylinder-torus-polynomial-bigint.js_2x2-torus.txt']);
  run('dirty', { complete: false, dirty: true, date: '2026-11-10' }, ['domicule-cylinder-torus-polynomial-bigint.js_4x4-torus.txt']);

  assert.equal(findSeriesRun('domicule-cylinder-torus-polynomial-', root), 'new');
  assert.equal(findSeriesRun('domino-rectangle-', root), null);
});

test('a dash gives the reason plan.json records', () => {
  const reasons = [
    ['over budget', 'not measured: 10 runs would exceed the budget of 1 h per board'],
    ['failed: exit code null, <--- Last few GCs --->', 'not measured: ran out of memory on this or a smaller board'],
    ['failed: spawnSync node ETIMEDOUT', 'not measured: a run on this or a smaller board passed its time limit'],
    ['failed: exit code 137, ', 'not measured: ran out of memory on this or a smaller board'],
    ['failed: exit code 1, ', 'not measured: a run failed on this or a smaller board'],
  ];

  reasons.forEach(([reason, text]) => assert.equal(describeMissing({ reason }, 1), text));
});

test('an entry of plan.json with a budget of its own names that budget', () => {
  assert.equal(describeMissing({ reason: 'over budget', budgetHours: 0.25 }, 2), 'not measured: 10 runs would exceed the budget of 0.25 h per board');
});

test('the site reads every triangular board of the full run from the file the run writes', t => {
  const directory = makeTemporaryDirectory(t, 'triangular-benchmark-');
  const series = listSeries(4).filter(({ name }) => /-triangular-/.test(name));
  const content = ['Average Execution Time: 2 ms', 'Average Process Time: 3 ms', 'Load Average Before: 0', '---', '1. Execution Time: 2 ms, Process Time: 3 ms'].join('\n');

  assert.equal(hasTriangularResults(directory), false);
  series.forEach(({ boards }) => boards.forEach(board => fs.writeFileSync(generateFileName({ directory, ...board }), content)));
  assert.equal(hasTriangularResults(directory), true);

  const read = [];

  for (const surface of ['rectangle', 'cylinder', 'torus']) {
    for (const count of ['all', 'diagonal']) {
      for (let side = 0; side <= 20; side += 2) {
        const { missing, ...times } = readTriangularTimes(directory, { rowCount: side, colCount: side, surface }, count);
        const solvers = Object.keys(missing);

        assert.deepEqual(solvers, count === 'all' && surface !== 'rectangle' ? ['pfaffian', 'modular', 'bigint'] : ['modular', 'bigint'], `${surface} ${count}`);

        for (const result of solvers.flatMap(solver => [times[solver], ...Object.values(times[{ pfaffian: 'pfaffianLanguages', modular: 'languages', bigint: 'bigintLanguages' }[solver]])])) {
          assert.deepEqual(result, { average: 2, process: 3, runs: 1 }, `${side}x${side} ${surface} ${count}`);
          read.push(result);
        }
      }
    }
  }

  assert.equal(read.length, series.reduce((sum, { boards }) => sum + boards.length, 0));
});

test('a run that predates the triangular lattice gives that reason, a later one the reason of its plan', t => {
  const directory = makeTemporaryDirectory(t, 'triangular-benchmark-');
  const board = { rowCount: 20, colCount: 20, surface: 'torus' };
  const before = readTriangularTimes(directory, board, 'all');

  assert.equal(before.bigint, null);
  assert.deepEqual(Object.values(before.missing).flatMap(Object.values), Array(9).fill('not measured: no benchmark run has measured the triangular lattice yet'));

  fs.writeFileSync(path.join(directory, 'any-lattice-cylinder-torus-bigint.js_0x0-triangular-torus.txt'), '');
  fs.writeFileSync(
    path.join(directory, 'plan.json'),
    JSON.stringify({ budgetHours: 2, notMeasured: [{ series: 'any-lattice-cylinder-torus-bigint.rs-triangular-torus', board: '20x20', reason: 'over budget' }] }),
  );

  const after = readTriangularTimes(directory, board, 'all');

  assert.equal(after.missing.bigint.rs, 'not measured: 10 runs would exceed the budget of 2 h per board');
  assert.equal(after.missing.bigint.py, 'not measured: the run did not reach this board');
  assert.equal(readTriangularTimes(directory, board, 'diagonal').missing.modular.js, 'not measured: the run did not reach this board');
});
