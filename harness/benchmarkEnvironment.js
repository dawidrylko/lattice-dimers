const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const RESULTS_DIRECTORY = process.env.BENCHMARK_ROOT || path.join(ROOT_DIRECTORY, 'benchmarks', 'results');

function readVersion(program, args) {
  const { status, stdout, stderr } = spawnSync(program, args, { cwd: ROOT_DIRECTORY, encoding: 'utf-8' });

  return status === 0 ? `${stdout}${stderr}`.trim() : null;
}

function readCommit() {
  return process.env.BENCHMARK_COMMIT || readVersion('git', ['rev-parse', 'HEAD']);
}

function isDirty() {
  return process.env.BENCHMARK_COMMIT
    ? false
    : readVersion('git', ['status', '--porcelain', '--', '.', ':!benchmarks/results']) !== '';
}

function describeEnvironment() {
  const cpus = os.cpus();

  return {
    date: new Date().toISOString().slice(0, 10),
    timing: 'solver',
    commit: readCommit(),
    dirty: isDirty(),
    node: process.version,
    python: readVersion(process.env.PYTHON || 'python3', ['--version']),
    rust: readVersion('rustc', ['--version']),
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: cpus.length ? cpus[0].model.trim() : null,
    cores: cpus.length || null,
    memory: `${Math.round(os.totalmem() / 2 ** 30)} GB`,
    host: process.env.BENCHMARK_HOST || null,
    image: process.env.BENCHMARK_IMAGE || null,
  };
}

function versionNumber(version) {
  return version ? version.match(/\d+\.\d+\.\d+/)?.[0] ?? 'unknown' : 'none';
}

function runDirectoryName({ commit, dirty, node, python, rust }) {
  const toolchain = `node${versionNumber(node)}-python${versionNumber(python)}-rust${versionNumber(rust)}`;

  return `${(commit || 'nocommit').slice(0, 12)}-${toolchain}${dirty ? '-dirty' : ''}`;
}

module.exports = { RESULTS_DIRECTORY, ROOT_DIRECTORY, describeEnvironment, runDirectoryName };
