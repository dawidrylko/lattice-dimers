const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');
const { GATE_STEP, readLines, readStepScript, readJobs, readGateInputs, readGateScript, runGateScript } = require('./workflow');

const AGGREGATOR = 'check';
const AGGREGATOR_STEP = 'Require every job to succeed';
const GATE_JOB = 'changes';
const SELECTION_STEP = 'Pass on the choice of the generator checks';
const GENERATOR_JOBS = ['rust', 'python', 'repository'];
const PYTHON_JOB = 'python';
const PYTEST = 'python -m pytest python/tests';
const SITE_TEST_JOB = 'site-tests';
const indent = line => line.length - line.trimStart().length;

function readNeeds(job) {
  const needs = /^ {4}needs: (?:\[([^\]]*)\]|([\w-]+))$/m.exec(job);

  return needs ? (needs[1] ?? needs[2]).split(',').map(need => need.trim()) : [];
}

function runStep(script, env) {
  const { GENERATOR_CHECKS, ...inherited } = process.env;
  const environment = Object.fromEntries(Object.entries({ ...inherited, ...env }).filter(([, value]) => value !== undefined));

  return spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', script], { env: environment, encoding: 'utf-8' });
}

function runAggregator(results) {
  const needs = Object.fromEntries(Object.entries(results).map(([job, result]) => [job, { result, outputs: {} }]));

  return runStep(readStepScript(AGGREGATOR_STEP), { NEEDS: JSON.stringify(needs) });
}

function runSelection(generatorChecks) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'generator-selection-'));
  const output = path.join(directory, 'github-output');

  try {
    fs.writeFileSync(output, '');

    const result = runStep(readStepScript(SELECTION_STEP), { GITHUB_OUTPUT: output, GENERATOR_CHECKS: generatorChecks });

    assert.equal(result.status, 0, result.stderr);

    return fs.readFileSync(output, 'utf-8');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
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
  const jobs = readNeeds(readJobs().get(AGGREGATOR));
  const passing = Object.fromEntries(jobs.map(job => [job, 'success']));
  const passed = runAggregator(passing);

  assert.equal(passed.status, 0, passed.stderr);

  for (const result of ['failure', 'cancelled', 'skipped']) {
    for (const job of jobs) {
      assert.notEqual(runAggregator({ ...passing, [job]: result }).status, 0, `Check passes with ${job} ${result}.`);
    }
  }
});

test('the generator checks run on push, schedule and dispatch, and on a pull request as the generator gate chose', () => {
  const jobs = readJobs();
  const script = readGateScript();
  const inputs = readGateInputs();

  assert.match(jobs.get(GATE_JOB), new RegExp(`^ {6}- name: ${GATE_STEP}\\n {8}if: github\\.event_name == 'pull_request'$`, 'm'));
  assert.equal(runSelection(undefined), 'generator-checks=run\n', 'With no gate, on push, schedule and dispatch, the generator checks must run.');

  for (const [changes, choice] of [[['oeis/A309117/b309117.rs'], 'run'], [['docs/glossary.md'], 'skip']]) {
    const gate = runGateScript(script, inputs, changes);

    assert.equal(gate.status, 0, gate.stderr);
    assert.equal(runSelection(gate.skip ? 'skip' : undefined), `generator-checks=${choice}\n`, `A pull request that changes ${changes} must ${choice} the generator checks.`);
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

test('no step of CI passes on a failure, runs for a pull request with the rights of master, or may write to the repository', () => {
  const lines = readLines();
  const workflow = lines.join('\n');
  const permissions = lines.flatMap((line, index) => (/^\s*permissions:/.test(line) ? [index] : []));

  assert.doesNotMatch(workflow, /continue-on-error/, 'A job or step with continue-on-error succeeds when it fails.');
  assert.doesNotMatch(workflow, /pull_request_target/, 'pull_request_target runs the code of a pull request with the rights of master.');
  assert.ok(permissions.some(index => lines[index] === 'permissions:'), 'The workflow sets its permissions at the top.');

  for (const index of permissions) {
    const end = lines.findIndex((line, position) => position > index && line.trim() !== '' && indent(line) <= indent(lines[index]));
    const block = lines.slice(index + 1, end === -1 ? lines.length : end).filter(line => line.trim() !== '');

    assert.equal(lines[index].trim(), 'permissions:', `Line ${index + 1} of ci.yml sets permissions in one line.`);
    assert.deepEqual(block.map(line => line.trim()), ['contents: read'], `The permissions at line ${index + 1} of ci.yml are not contents: read alone.`);
  }
});

test('the Python job runs the timing tests alone after the parallel run', () => {
  const job = readJobs().get(PYTHON_JOB);
  const parallel = job.indexOf(`run: ${PYTEST} -n 4 -m "not timing"`);
  const timing = job.indexOf(`run: ${PYTEST} -m timing`);

  assert.notEqual(parallel, -1, 'The Python job runs pytest on four workers without the timing tests.');
  assert.ok(timing > parallel, 'The Python job runs the timing tests after the parallel run.');
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
