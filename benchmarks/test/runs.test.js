const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { listJavaScriptResults, describeMissing, resultFileOf } = require('../../site/benchmarkRuns.js');
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

test('a run made before the rename of the diagonal solvers is read under their new id', t => {
  const directory = makeTemporaryDirectory(t, 'renamed-benchmark-');

  ['diagonal-pieces-modular.js_4x4.txt', 'diagonal_pieces_modular.py_4x4.txt'].forEach(file => fs.writeFileSync(path.join(directory, file), ''));

  assert.deepEqual(listJavaScriptResults(directory, 'domicule-rectangle-polynomial-'), ['domicule-rectangle-polynomial-modular.js_4x4.txt']);
  assert.equal(resultFileOf(directory, 'domicule_rectangle_polynomial_modular.py_4x4.txt'), path.join(directory, 'diagonal_pieces_modular.py_4x4.txt'));
  assert.equal(resultFileOf(directory, 'domicule-rectangle-polynomial-modular.rs_4x4.txt'), path.join(directory, 'domicule-rectangle-polynomial-modular.rs_4x4.txt'));
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
