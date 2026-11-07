const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { listJavaScriptResults } = require('../../site/benchmarkRuns.js');
const { makeTemporaryDirectory } = require('./support');

test('a benchmark table reads the JavaScript results only', t => {
  const benchmarkRoot = makeTemporaryDirectory(t, 'domino-benchmark-');

  fs.mkdirSync(path.join(benchmarkRoot, 'tables'));
  ['a-b-bigint.js_2x2.txt', 'a-b-bigint.rs_4x4.txt', 'a_b_bigint.py_6x6.txt', 'c-d-bigint.js_8x8.txt'].forEach(file => fs.writeFileSync(path.join(benchmarkRoot, 'tables', file), ''));

  assert.deepEqual(listJavaScriptResults(path.join(benchmarkRoot, 'tables'), 'a-b-'), ['a-b-bigint.js_2x2.txt']);
});
