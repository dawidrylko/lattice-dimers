const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const { runsUnshardedTests } = require('./shard');

const TEMPLATE = fs.readFileSync(path.join(__dirname, '..', 'template.html'), 'utf-8');

function loadRandomBelow(draws) {
  const source = (TEMPLATE.match(/function randomBelow\(limit\) \{[\s\S]*?\n\}\n/) ?? [])[0];
  const state = { calls: 0 };
  const math = {
    floor: Math.round,
    random: () => draws[Math.min(state.calls++, draws.length - 1)] / 1e9,
  };

  assert.ok(source, 'site/template.html must define randomBelow(limit).');

  return { randomBelow: new Function('Math', `${source}; return randomBelow;`)(math), state };
}

function readCardRules(query) {
  const opening = `@media ${query} {\n`;
  const start = TEMPLATE.indexOf(opening);

  assert.notEqual(start, -1, `site/template.html must keep the card rules under @media ${query}.`);

  const rest = TEMPLATE.slice(start + opening.length);

  return rest
    .slice(0, rest.indexOf('\n}\n'))
    .split('\n')
    .map(rule => rule.trim());
}

const skip = !runsUnshardedTests(process.env.SITE_TEST_SHARD) && 'runs in shard 1';

test('a benchmark table of three solvers becomes cards by the rules of the other tables', { skip }, () => {
  const scope = '.bench .table-wrap';
  const rules = readCardRules('(max-width: 919px)');
  const widened = readCardRules('(min-width: 920px) and (max-width: 1099px)');

  assert.ok(rules.length > 1, 'the card rules of the benchmark tables are missing.');
  assert.deepEqual(
    rules.filter(rule => !rule.startsWith(`${scope} `)),
    [],
    `every card rule must start with ${scope}.`,
  );
  assert.deepEqual(
    widened,
    rules.map(rule => rule.replace(scope, `${scope}.three-solvers`)),
    'the card rules of the three-solver tables must be the card rules of the other tables under .three-solvers.',
  );
});

test('the Random button draws a tiling number with no modulo bias', { skip }, () => {
  const { randomBelow, state } = loadRandomBelow([999999999, 0]);

  assert.equal(randomBelow(7n), 0n);
  assert.equal(state.calls, 2);
});

test('the Random button keeps a draw below the largest multiple of the count', { skip }, () => {
  const { randomBelow, state } = loadRandomBelow([999999993]);

  assert.equal(randomBelow(7n), 6n);
  assert.equal(state.calls, 1);
});

test('the Random button draws again when the draw equals that multiple', { skip }, () => {
  const { randomBelow, state } = loadRandomBelow([999999994, 0]);

  assert.equal(randomBelow(7n), 0n);
  assert.equal(state.calls, 2);
});

test('the Random button joins two draws for a count of two digits', { skip }, () => {
  const { randomBelow, state } = loadRandomBelow([20, 0]);

  assert.equal(randomBelow(12n), 8n);
  assert.equal(state.calls, 2);
});
