const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { readBenchmarkRuns, listJavaScriptResults } = require('../../site/benchmarkRuns.js');
const { ROOT_DIRECTORY, makeTemporaryDirectory } = require('./support');

function build(t) {
  const benchmarkRoot = makeTemporaryDirectory(t, 'domino-benchmark-');
  const complete = fs.readdirSync(path.join(ROOT_DIRECTORY, 'benchmarks', 'results', readBenchmarkRuns().latest));
  const touch = (run, files) => {
    fs.mkdirSync(path.join(benchmarkRoot, run));
    files.forEach(file => fs.writeFileSync(path.join(benchmarkRoot, run, file), ''));
  };

  return { benchmarkRoot, complete, touch };
}

test('the site shows the complete run, not a newer month that lacks a result', t => {
  const { benchmarkRoot, complete, touch } = build(t);

  touch('2000-01', complete);
  touch('2000-02', ['environment.json', 'domino-rectangle-formula.js_0x0.txt']);
  touch('2000-03', complete.filter(file => !['all-lattices-cylinder-torus-modular.rs_14x14-square-torus.txt', 'domicule_rectangle_modular.py_20x20.txt'].includes(file)));
  touch('2000-04', complete.filter(file => file !== 'domino_rectangle_formula.py_20x20.txt'));
  touch('2000-05', complete.filter(file => file !== 'domino-rectangle-bigint.rs_20x20.txt'));
  touch('2000-06', complete.filter(file => file !== 'domicule_rectangle_bigint.py_20x20.txt'));
  touch('2000-07', complete.filter(file => file !== 'domino-rectangle-number.rs_10x10.txt'));
  touch('2000-08', complete.filter(file => file !== 'diagonal_pieces_bigint.py_12x12.txt'));
  touch('2000-09', complete.filter(file => file !== 'diagonal-pieces-modular.rs_20x20.txt'));
  touch('2000-10', complete.filter(file => file !== 'all-lattices-cylinder-torus-bigint.rs_10x10-king-torus.txt'));
  touch('2000-11', complete.filter(file => file !== 'all_lattices_cylinder_torus_bigint.py_12x12-square-torus.txt'));

  assert.equal(readBenchmarkRuns(benchmarkRoot).latest, '2000-01');
});

test('a benchmark table reads the JavaScript results only', t => {
  const { benchmarkRoot, touch } = build(t);

  touch('tables', ['a-b-bigint.js_2x2.txt', 'a-b-bigint.rs_4x4.txt', 'a_b_bigint.py_6x6.txt', 'c-d-bigint.js_8x8.txt']);

  assert.deepEqual(listJavaScriptResults(path.join(benchmarkRoot, 'tables'), 'a-b-'), ['a-b-bigint.js_2x2.txt']);
});
