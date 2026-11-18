const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const WORKFLOW = path.join(__dirname, '..', '.github', 'workflows', 'ci.yml');
const JOB_STEP = 'Select the jobs';
const indent = line => line.length - line.trimStart().length;

function readLines() {
  return fs.readFileSync(WORKFLOW, 'utf-8').split('\n');
}

/**
 * Reads the run script of a named step of the CI workflow, without its indentation.
 * @param {string} name The name of the step.
 * @returns {string|null} The script, or null when no step of that name has a block run script.
 */
function readStepScript(name) {
  const lines = readLines();
  const start = lines.findIndex(line => line.trim() === `- name: ${name}`);
  const run = lines.findIndex((line, index) => start !== -1 && index > start && line.trim() === 'run: |');

  if (run === -1) {
    return null;
  }

  const end = lines.findIndex((line, index) => index > run && line.trim() !== '' && indent(line) <= indent(lines[run]));
  const body = lines.slice(run + 1, end === -1 ? lines.length : end);
  const margin = Math.min(...body.filter(line => line.trim() !== '').map(indent));

  return body.map(line => line.slice(margin)).join('\n');
}

/**
 * Reads the single-quoted values of the env block of a named step.
 * @param {string} name The name of the step.
 * @returns {Object<string, string>} Each variable with a single-quoted value, by its name; empty when the step is missing.
 */
function readStepEnv(name) {
  const lines = readLines();
  const start = lines.findIndex(line => line.trim() === `- name: ${name}`);
  const env = {};

  for (const line of start === -1 ? [] : lines.slice(start + 1)) {
    if (line.trim() !== '' && indent(line) <= indent(lines[start])) {
      break;
    }

    const variable = /^ +([A-Z_]+): '([^']*)'$/.exec(line);

    if (variable) {
      env[variable[1]] = variable[2];
    }
  }

  return env;
}

/**
 * Lists the jobs of the CI workflow with the text of each.
 * @returns {Map<string, string>} The text of each job by its id, in the order of the workflow.
 */
function readJobs() {
  const lines = readLines();
  const start = lines.indexOf('jobs:');
  const jobs = new Map();
  let id = null;

  for (const line of lines.slice(start + 1)) {
    const key = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line);

    if (key) {
      id = key[1];
      jobs.set(id, '');
    } else if (id && (line.trim() === '' || indent(line) > 2)) {
      jobs.set(id, `${jobs.get(id)}${line}\n`);
    } else if (line.trim() !== '') {
      id = null;
    }
  }

  return jobs;
}

/**
 * Reads the GENERATOR_INPUTS pattern by which the job selection chooses the generator checks.
 * @returns {string|undefined} The pattern, or undefined when the workflow has none.
 */
function readGateInputs() {
  return (fs.readFileSync(WORKFLOW, 'utf-8').match(/^ +GENERATOR_INPUTS: '([^']+)'$/m) ?? [])[1];
}

/**
 * Runs a step script in a scratch repository whose HEAD merges a branch that makes the given changes.
 * @param {string} script The run script of the step.
 * @param {Object<string, string>} env The environment of the step, on top of this process's.
 * @param {string[]|null} changes The changed files: a path is written, "from -> to" is a move and "-path" a deletion; null leaves one commit and no merge.
 * @param {{merge?: boolean}} [options] merge false commits the changes on master itself, with no merge commit.
 * @returns {{status: number, stderr: string, githubEnv: string, githubOutput: string}} The exit status, stderr, and what the script wrote to GITHUB_ENV and GITHUB_OUTPUT.
 */
function runStepInRepository(script, env, changes, { merge = true } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-step-'));
  const repository = path.join(directory, 'repository');
  const githubEnv = path.join(directory, 'github-env');
  const githubOutput = path.join(directory, 'github-output');
  const environment = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'gate', GIT_AUTHOR_EMAIL: 'gate@example.com', GIT_COMMITTER_NAME: 'gate', GIT_COMMITTER_EMAIL: 'gate@example.com' };
  const git = (...args) => {
    const result = spawnSync('git', ['-c', 'init.defaultBranch=master', ...args], { cwd: repository, env: environment, encoding: 'utf-8' });

    if (result.status !== 0) {
      throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    }
  };
  const write = (files, text) => {
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(repository, file)), { recursive: true });
      fs.writeFileSync(path.join(repository, file), `${file}\n${text}`);
    }
  };

  const moves = (changes ?? []).filter(change => change.includes(' -> ')).map(change => change.split(' -> '));
  const deletions = (changes ?? []).filter(change => change.startsWith('-')).map(change => change.slice(1));
  const writes = (changes ?? []).filter(change => !change.includes(' -> ') && !change.startsWith('-'));

  try {
    write(['README.md', ...moves.map(([from]) => from), ...deletions], '');
    git('init', '-q');
    git('add', '-A');
    git('commit', '-qm', 'base');

    if (changes) {
      if (merge) {
        git('switch', '-qc', 'change');
      }

      write(writes, 'changed\n');

      for (const [from, to] of moves) {
        fs.mkdirSync(path.dirname(path.join(repository, to)), { recursive: true });
        git('mv', from, to);
      }

      for (const file of deletions) {
        git('rm', '-q', file);
      }

      git('add', '-A');
      git('commit', '-qm', 'change');

      if (merge) {
        git('switch', '-q', 'master');
        git('merge', '-q', '--no-ff', '-m', 'merge', 'change');
      }
    }

    fs.writeFileSync(path.join(directory, 'step.sh'), script);
    fs.writeFileSync(githubEnv, '');
    fs.writeFileSync(githubOutput, '');

    const { status, stderr } = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', path.join(directory, 'step.sh')], {
      cwd: repository,
      env: { ...environment, ...env, GITHUB_ENV: githubEnv, GITHUB_OUTPUT: githubOutput },
      encoding: 'utf-8',
    });

    return { status, stderr, githubEnv: fs.readFileSync(githubEnv, 'utf-8'), githubOutput: fs.readFileSync(githubOutput, 'utf-8') };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Runs the job selection of a pull request in a scratch repository whose HEAD merges a branch that makes the given changes, and reads its choice of the generator checks.
 * @param {string} inputs The GENERATOR_INPUTS pattern.
 * @param {string[]|null} changes The changed files, as runStepInRepository takes them.
 * @param {{merge?: boolean}} [options] merge false commits the changes on master itself, with no merge commit.
 * @returns {{status: number, stderr: string, skip: boolean}} The exit status, stderr, and whether the step chose to skip the generator checks.
 */
function selectGeneratorChecks(inputs, changes, options) {
  const env = { ...readStepEnv(JOB_STEP), EVENT: 'pull_request', GENERATOR_INPUTS: inputs };
  const { status, stderr, githubOutput } = runStepInRepository(readStepScript(JOB_STEP), env, changes, options);

  return { status, stderr, skip: /^generator-checks=skip$/m.test(githubOutput) };
}

module.exports = { WORKFLOW, JOB_STEP, readLines, readStepScript, readStepEnv, readJobs, readGateInputs, runStepInRepository, selectGeneratorChecks };
