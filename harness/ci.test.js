const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');
const { JOB_STEP, readLines, readStepScript, readStepEnv, readJobs, readGateInputs, runStepInRepository, selectGeneratorChecks } = require('./workflow');

const ROOT = path.join(__dirname, '..');
const AGGREGATOR = 'check';
const AGGREGATOR_STEP = 'Require every job to succeed unless Changes skipped it';
const GATE_JOB = 'changes';
const UNGATED_JOBS = [GATE_JOB, 'repository', AGGREGATOR];
const JAVASCRIPT_ENTRIES = {
  javascript: ['js/test'],
  benchmarks: ['benchmarks/test'],
  'site-build': ['site/build.js'],
  'site-tests': ['site/test'],
  macos: ['js/test/render.test.js'],
};
const GENERATOR_OUTPUT = 'generator-checks';
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

function runAggregator(results, choices) {
  const needs = Object.fromEntries(Object.entries(results).map(([job, result]) => [job, { result, outputs: job === GATE_JOB ? choices : {} }]));

  return runStep(readStepScript(AGGREGATOR_STEP), { NEEDS: JSON.stringify(needs) });
}

function readChosenJobs(githubOutput) {
  return githubOutput
    .split('\n')
    .filter(line => line.endsWith('=run') && !line.startsWith(`${GENERATOR_OUTPUT}=`))
    .map(line => line.slice(0, -'=run'.length));
}

function selectOutput(files, event, env = readStepEnv(JOB_STEP)) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-jobs-'));
  const output = path.join(directory, 'github-output');

  try {
    fs.writeFileSync(path.join(directory, 'git'), '#!/bin/bash\n[ "$1" = rev-parse ] || printf "%s" "$NAME_STATUS"\n', { mode: 0o755 });
    fs.writeFileSync(output, '');

    const result = runStep(readStepScript(JOB_STEP), {
      ...env,
      EVENT: event,
      NAME_STATUS: files.map(file => `M\t${file}\n`).join(''),
      PATH: `${directory}${path.delimiter}${process.env.PATH}`,
      GITHUB_OUTPUT: output,
    });

    assert.equal(result.status, 0, result.stderr);

    return fs.readFileSync(output, 'utf-8');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function selectJobs(files, event, env) {
  return readChosenJobs(selectOutput(files, event, env));
}

function listScripts(entry) {
  const file = path.join(ROOT, entry);

  if (!fs.statSync(file).isDirectory()) {
    return [file];
  }

  return fs.readdirSync(file, { recursive: true }).filter(name => name.endsWith('.js')).map(name => path.join(file, name));
}

function resolveRequire(from, request) {
  const base = path.resolve(path.dirname(from), request);

  return [base, `${base}.js`, `${base}.json`, path.join(base, 'index.js')].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
}

function listLoadedFiles(entries) {
  const loaded = new Set();
  const queue = entries.flatMap(listScripts);

  while (queue.length) {
    const file = queue.pop();

    if (loaded.has(file)) {
      continue;
    }

    loaded.add(file);

    if (file.endsWith('.js')) {
      for (const [, , request] of fs.readFileSync(file, 'utf-8').matchAll(/require\((['"])(\.{1,2}\/[^'"]+)\1\)/g)) {
        const target = resolveRequire(file, request);

        assert.ok(target, `${path.relative(ROOT, file)} requires ${request}, which is not a file.`);
        queue.push(target);
      }
    }
  }

  return [...loaded].map(file => path.relative(ROOT, file));
}

test('every job of CI is a need of the Check job, which runs whatever their results', () => {
  const jobs = readJobs();
  const check = jobs.get(AGGREGATOR);

  assert.ok(check, `.github/workflows/ci.yml has no job ${AGGREGATOR}.`);
  assert.match(check, /^ {4}name: Check$/m, 'The required check is named Check.');
  assert.match(check, /^ {4}if: always\(\)$/m, 'Check runs even when a job it needs fails or is cancelled.');
  assert.deepEqual(new Set(readNeeds(check)), new Set([...jobs.keys()].filter(id => id !== AGGREGATOR)));
});

test('Check passes only when every job succeeded or Changes chose to skip it', () => {
  const jobs = readNeeds(readJobs().get(AGGREGATOR));
  const gated = jobs.filter(job => !UNGATED_JOBS.includes(job));
  const choose = choice => Object.fromEntries(gated.map(job => [job, choice]));
  const passing = Object.fromEntries(jobs.map(job => [job, 'success']));

  for (const choice of ['run', 'skip']) {
    const passed = runAggregator(passing, choose(choice));

    assert.equal(passed.status, 0, passed.stderr);
  }

  for (const job of jobs) {
    for (const result of ['failure', 'cancelled']) {
      assert.notEqual(runAggregator({ ...passing, [job]: result }, choose('skip')).status, 0, `Check passes with ${job} ${result}.`);
    }

    assert.notEqual(runAggregator({ ...passing, [job]: 'skipped' }, choose('run')).status, 0, `Check passes with ${job} skipped though Changes chose to run it.`);
    assert.notEqual(runAggregator({ ...passing, [job]: 'skipped' }, {}).status, 0, `Check passes with ${job} skipped though Changes chose nothing.`);

    const skipped = runAggregator({ ...passing, [job]: 'skipped' }, choose('skip'));

    if (gated.includes(job)) {
      assert.equal(skipped.status, 0, `Check fails with ${job} skipped as Changes chose: ${skipped.stderr}`);
    } else {
      assert.notEqual(skipped.status, 0, `Check passes with ${job} skipped, which Changes never skips.`);
    }
  }
});

test('the generator checks run on push, schedule and dispatch, and on a pull request that changes what the generators depend on', () => {
  for (const event of ['push', 'schedule', 'workflow_dispatch']) {
    assert.match(selectOutput([], event), new RegExp(`^${GENERATOR_OUTPUT}=run$`, 'm'), `The generator checks do not run on ${event}.`);
  }

  for (const [changes, choice] of [[['oeis/A309117/b309117.rs'], 'run'], [['rust/core/src/zażółć.rs'], 'run'], [['zz/a"b.txt'], 'run'], [['docs/glossary.md'], 'skip']]) {
    const selection = selectGeneratorChecks(readGateInputs(), changes);

    assert.equal(selection.status, 0, selection.stderr);
    assert.equal(selection.skip ? 'skip' : 'run', choice, `A pull request that changes ${changes} must ${choice} the generator checks.`);
  }
});

test('the jobs that run the b-file generators take the choice of Changes', () => {
  const jobs = readJobs();

  assert.match(jobs.get(GATE_JOB), /^ {6}generator-checks: \$\{\{ steps\.jobs\.outputs\.generator-checks \}\}$/m);

  for (const id of GENERATOR_JOBS) {
    assert.ok(readNeeds(jobs.get(id)).includes(GATE_JOB), `${id} does not need ${GATE_JOB}.`);
    assert.match(
      jobs.get(id),
      /^ {6}GENERATOR_CHECKS: \$\{\{ needs\.changes\.outputs\.generator-checks \}\}$/m,
      `${id} does not take GENERATOR_CHECKS from ${GATE_JOB}.`,
    );
  }
});

test('every job but Changes, Repository and Check runs only when Changes chose it', () => {
  const jobs = readJobs();
  const script = readStepScript(JOB_STEP);
  const env = readStepEnv(JOB_STEP);

  assert.ok(script, `Changes has no step ${JOB_STEP} with a run script.`);
  assert.match(jobs.get(GATE_JOB), new RegExp(`^ {6}- name: ${JOB_STEP}\\n {8}id: jobs$`, 'm'));

  for (const id of UNGATED_JOBS) {
    assert.doesNotMatch(jobs.get(id), /^ {4}if: (?!always\(\)$)/m, `${id} runs on a condition.`);
  }

  for (const id of [...jobs.keys()].filter(job => !UNGATED_JOBS.includes(job))) {
    const job = jobs.get(id);
    const choice = new RegExp(`^choose ${id} "\\$([A-Z_]+_INPUTS)"$`, 'm').exec(script);

    assert.ok(readNeeds(job).includes(GATE_JOB), `${id} does not need ${GATE_JOB}.`);
    assert.match(job, new RegExp(`^ {4}if: needs\\.changes\\.outputs\\.${id} == 'run'$`, 'm'), `${id} does not run on the choice of ${GATE_JOB}.`);
    assert.match(jobs.get(GATE_JOB), new RegExp(`^ {6}${id}: \\$\\{\\{ steps\\.jobs\\.outputs\\.${id} \\}\\}$`, 'm'), `${GATE_JOB} does not pass on the choice of ${id}.`);
    assert.ok(choice && env[choice[1]], `The step ${JOB_STEP} does not choose ${id} by a pattern of its env.`);
  }
});

test('Changes runs every job on push, schedule and dispatch, and on a pull request the jobs that read a file it changes', () => {
  const gated = [...readJobs().keys()].filter(job => !UNGATED_JOBS.includes(job));
  const site = ['site-build', 'site-tests'];
  const cases = [
    [['docs/glossary.md'], []],
    [['README.md'], []],
    [['harness/oeis.test.js'], []],
    [['oeis/A309117/b309117.js'], []],
    [['.github/workflows/ci.yml'], gated],
    [['spec/cases/domino-rectangle-bigint.json'], gated],
    [['js/pnpm-lock.yaml'], gated],
    [['js/package.json'], gated],
    [['js/.nvmrc'], gated],
    [['rust/Cargo.toml'], gated],
    [['rust/Cargo.lock'], gated],
    [['python/pyproject.toml'], gated],
    [['research/king-entropy/src/requirements.txt'], gated],
    [['"notes/a\\"b.md"'], gated],
    [['rust/core/src/lib.rs'], ['rust', 'benchmarks']],
    [['python/lattice_dimers/core/modular.py'], ['python', 'benchmarks']],
    [['js/core/modular.js'], ['javascript', 'benchmarks', ...site, 'macos']],
    [['.github/workflows/pages.yml'], []],
    [['js/README.md'], []],
    [['rust/README.md'], []],
    [['python/README.md'], []],
    [['benchmarks/README.md'], []],
    [['js/README.md', 'rust/solvers/src/bin/domino-rectangle-bigint.rs'], ['rust', 'benchmarks']],
    [['rust/solvers/src/bin/domino-rectangle-bigint.rs'], ['rust', 'benchmarks']],
    [['oeis/A309117/b309117.rs'], ['rust']],
    [['oeis/A309117/b309117.py'], ['python']],
    [['oeis/A309117/b309117.txt'], ['rust', 'python', ...site]],
    [['oeis/A309117/A309117.gp'], site],
    [['oeis/A239264/b239264.txt'], ['rust', 'python', ...site, 'research']],
    [['python/lattice_dimers/solvers/domino_rectangle_bigint.py'], ['python', 'benchmarks']],
    [['js/solvers/domino-rectangle-bigint.js'], ['javascript', 'benchmarks', ...site, 'macos']],
    [['site/notes.js'], ['javascript', ...site, 'macos']],
    [['site/benchmarkRuns.js'], ['javascript', 'benchmarks', ...site, 'macos']],
    [['notes/dominoes/01-rectangles.md'], site],
    [['benchmarks/results/run.json'], ['benchmarks', ...site]],
    [['research/king-entropy/src/lspec.py'], [...site, 'macos', 'research']],
    [['.zenodo.json'], ['research']],
    [['research/crossing-polynomial/check.py'], ['research']],
    [['.github/assets/dimer.svg'], ['javascript', ...site, 'macos']],
    [['docs/glossary.md', 'notes/dominoes/01-rectangles.md', '.zenodo.json'], [...site, 'research']],
  ];

  for (const event of ['push', 'schedule', 'workflow_dispatch']) {
    assert.deepEqual(selectJobs([], event), gated, `Not every job runs on ${event}.`);
  }

  for (const [files, chosen] of cases) {
    assert.deepEqual(selectJobs(files, 'pull_request'), gated.filter(job => chosen.includes(job)), `A pull request that changes ${files} runs the wrong jobs.`);
  }

  assert.throws(() => selectJobs(['docs/glossary.md'], 'pull_request', { ...readStepEnv(JOB_STEP), RUST_INPUTS: '(' }), /grep failed with status 2/);
  assert.throws(() => selectJobs(['docs/glossary.md'], 'pull_request', { ...readStepEnv(JOB_STEP), REPOSITORY_ONLY: '(' }), /grep failed with status 2 on \(/);
});

test('Changes runs every job when a pull request deletes or moves a file, reads names as git writes them, and fails when it cannot tell what changed', () => {
  const gated = [...readJobs().keys()].filter(job => !UNGATED_JOBS.includes(job));
  const script = readStepScript(JOB_STEP);
  const env = { ...readStepEnv(JOB_STEP), EVENT: 'pull_request' };

  for (const changes of [['-research/king-entropy/notes.md'], ['docs/glossary.md -> docs/terms.md'], ['-js/README.md'], ['js/README.md -> js/GUIDE.md']]) {
    const result = runStepInRepository(script, env, changes);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readChosenJobs(result.githubOutput), gated, `A pull request that makes the change ${changes} does not run every job.`);
  }

  const named = runStepInRepository(script, env, ['notes/zażółć.md']);

  assert.equal(named.status, 0, named.stderr);
  assert.deepEqual(readChosenJobs(named.githubOutput), ['site-build', 'site-tests'], 'A pull request that changes notes/zażółć.md does not run the site jobs alone.');

  const unmerged = runStepInRepository(script, env, ['docs/glossary.md'], { merge: false });

  assert.notEqual(unmerged.status, 0, 'The step runs with no second parent of HEAD.');
  assert.match(unmerged.stderr, /no second parent/);
});

test('each job that Changes may skip runs on a change to any JavaScript file it loads', () => {
  const jobs = readJobs();
  const env = readStepEnv(JOB_STEP);
  const script = readStepScript(JOB_STEP);

  for (const [id, entries] of Object.entries(JAVASCRIPT_ENTRIES)) {
    const inputs = env[new RegExp(`^choose ${id} "\\$([A-Z_]+_INPUTS)"$`, 'm').exec(script)[1]];

    assert.ok(jobs.has(id), `CI has no job ${id}.`);

    for (const file of listLoadedFiles(entries)) {
      assert.ok(new RegExp(inputs).test(file) || new RegExp(env.SHARED_INPUTS).test(file), `${id} loads ${file}, which its pattern in ${JOB_STEP} does not match.`);
    }
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
