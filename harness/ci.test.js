const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const { test } = require('node:test');
const { readLines, readStepScript, readJobs } = require('./workflow');

const AGGREGATOR = 'check';
const AGGREGATOR_STEP = 'Require every job to succeed';
const GATE_JOB = 'changes';
const GENERATOR_JOBS = ['rust', 'python', 'repository'];
const SITE_TEST_JOB = 'site-tests';

function readNeeds(job) {
  const needs = /^ {4}needs: (?:\[([^\]]*)\]|([\w-]+))$/m.exec(job);

  return needs ? (needs[1] ?? needs[2]).split(',').map(need => need.trim()) : [];
}

function runAggregator(results) {
  const needs = Object.fromEntries(Object.entries(results).map(([job, result]) => [job, { result, outputs: {} }]));

  return spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', readStepScript(AGGREGATOR_STEP)], {
    env: { ...process.env, NEEDS: JSON.stringify(needs) },
    encoding: 'utf-8',
  });
}

test('every job of CI is a need of the Check job, which runs whatever their results', () => {
  const jobs = readJobs();
  const check = jobs.get(AGGREGATOR);

  assert.ok(check, `.github/workflows/ci.yml has no job ${AGGREGATOR}.`);
  assert.match(check, /^ {4}name: Check$/m, 'The required check is named Check.');
  assert.match(check, /^ {4}if: always\(\)$/m, 'Check runs even when a job it needs fails or is cancelled.');
  assert.deepEqual(new Set(readNeeds(check)), new Set([...jobs.keys()].filter(id => id !== AGGREGATOR)));
});

test('Check fails unless every job it needs succeeded', () => {
  const jobs = [...readJobs().keys()].filter(id => id !== AGGREGATOR);
  const passing = Object.fromEntries(jobs.map(job => [job, 'success']));
  const passed = runAggregator(passing);

  assert.equal(passed.status, 0, passed.stderr);

  for (const result of ['failure', 'cancelled', 'skipped']) {
    for (const job of [jobs[0], jobs.at(-1)]) {
      assert.notEqual(runAggregator({ ...passing, [job]: result }).status, 0, `Check passes with ${job} ${result}.`);
    }
  }
});

test('the jobs that run the b-file generators take the choice of the generator gate', () => {
  const jobs = readJobs();

  assert.match(jobs.get(GATE_JOB), /^ {6}generator-checks: \$\{\{ steps\.selection\.outputs\.generator-checks \}\}$/m);

  for (const id of GENERATOR_JOBS) {
    assert.ok(readNeeds(jobs.get(id)).includes(GATE_JOB), `${id} does not need ${GATE_JOB}.`);
    assert.match(
      jobs.get(id),
      /^ {6}GENERATOR_CHECKS: \$\{\{ needs\.changes\.outputs\.generator-checks \}\}$/m,
      `${id} does not take GENERATOR_CHECKS from ${GATE_JOB}.`,
    );
  }
});

test('the site test shards take their count from the matrix, so that every case runs in one of them', () => {
  const job = readJobs().get(SITE_TEST_JOB);

  assert.match(job, /^ {10}SITE_TEST_SHARD: \$\{\{ matrix\.shard \}\}\/\$\{\{ strategy\.job-total \}\}$/m);
});

test('CI runs every job on master after a merge and cancels only superseded pull request runs', () => {
  const workflow = readLines().join('\n');

  assert.match(workflow, /^on:\n(?: {2}.*\n)*? {2}push:\n {4}branches: \[master\]$/m);
  assert.match(workflow, /^concurrency:\n {2}group: ci-\$\{\{ github\.ref \}\}\n {2}cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}$/m);
});
