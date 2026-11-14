const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');

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

test('the Random button draws a tiling number with no modulo bias', () => {
  const { randomBelow, state } = loadRandomBelow([999999999, 0]);

  assert.equal(randomBelow(7n), 0n);
  assert.equal(state.calls, 2);
});

test('the Random button keeps a draw below the largest multiple of the count', () => {
  const { randomBelow, state } = loadRandomBelow([999999993]);

  assert.equal(randomBelow(7n), 6n);
  assert.equal(state.calls, 1);
});

test('the Random button draws again when the draw equals that multiple', () => {
  const { randomBelow, state } = loadRandomBelow([999999994, 0]);

  assert.equal(randomBelow(7n), 0n);
  assert.equal(state.calls, 2);
});

test('the Random button joins two draws for a count of two digits', () => {
  const { randomBelow, state } = loadRandomBelow([20, 0]);

  assert.equal(randomBelow(12n), 8n);
  assert.equal(state.calls, 2);
});
