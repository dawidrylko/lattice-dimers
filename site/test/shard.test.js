const assert = require('node:assert/strict');
const { test } = require('node:test');
const { selectShard } = require('./shard');

const CASES = [
  { width: 1440, check: 'sheets' },
  { width: 1440, check: 'samples' },
  { width: 1440, check: 'picker' },
  { width: 786, check: 'sheets' },
  { width: 786, check: 'samples' },
  { width: 375, check: 'sheets' },
  { width: 375, check: 'samples' },
];

test('no shard selects every case', () => {
  assert.deepEqual(selectShard(CASES, undefined), CASES);
  assert.deepEqual(selectShard(CASES, ''), CASES);
});

test('the shards split the cases without a gap or an overlap and keep their order', () => {
  for (const count of [1, 2, 3]) {
    const shards = Array.from({ length: count }, (_, index) => selectShard(CASES, `${index + 1}/${count}`));

    shards.forEach(shard => assert.deepEqual(shard, CASES.filter(testCase => shard.includes(testCase))));
    assert.deepEqual(new Set(shards.flat()), new Set(CASES));
    assert.equal(shards.flat().length, CASES.length);
  }
});

test('two shards share out the widths of each check', () => {
  const [first, second] = ['1/2', '2/2'].map(shard => selectShard(CASES, shard));

  for (const check of ['sheets', 'samples']) {
    assert.ok(first.some(testCase => testCase.check === check), `shard 1 has no ${check} case`);
    assert.ok(second.some(testCase => testCase.check === check), `shard 2 has no ${check} case`);
  }
});

test('a malformed shard is an error', () => {
  for (const shard of ['0/2', '3/2', '1', '1/0', 'a/b', '1/2/3', ' 1/2']) {
    assert.throws(() => selectShard(CASES, shard), /SITE_TEST_SHARD must be k\/n/, shard);
  }
});
