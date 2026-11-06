const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const RESULTS_DIRECTORY = path.join(ROOT_DIRECTORY, 'benchmarks', 'results');
const MAX_START_LOAD = 2;
const LOAD_SAMPLE_MILLISECONDS = 60000;

function git(...args) {
  return spawnSync('git', args, { cwd: ROOT_DIRECTORY, encoding: 'utf-8' }).stdout.trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function __main__() {
  const argv = process.argv.slice(2);
  const force = argv.includes('--force-load');
  const passed = argv.filter(arg => arg !== '--force-load');

  if (!(Number(passed[passed.indexOf('--board-budget-hours') + 1]) > 0) || !passed.includes('--board-budget-hours')) {
    fail('Usage: pnpm benchmark --board-budget-hours <hours> [--jobs <threads>] [--skip-instructions] [--force] [--force-load]');
  }

  const commit = git('rev-parse', 'HEAD');

  if (git('status', '--porcelain', '--', '.', ':!benchmarks/results')) {
    fail('Commit first: the image is built from the commit, so uncommitted changes would not be measured.');
  }

  if (os.loadavg()[0] > MAX_START_LOAD && !force) {
    fail(`The host load is ${os.loadavg()[0].toFixed(2)}: close other work, or pass --force-load to measure under load.`);
  }

  const image = `lattice-dimers-benchmark:${commit.slice(0, 12)}`;
  const archive = spawn('git', ['archive', commit], { cwd: ROOT_DIRECTORY, stdio: ['ignore', 'pipe', 'inherit'] });
  const build = spawn('docker', ['build', '-f', 'benchmarks/Dockerfile', '-t', image, '-'], { stdio: ['pipe', 'inherit', 'inherit'] });

  archive.stdout.pipe(build.stdin);
  archive.on('close', status => status === 0 || fail('git archive failed.'));
  [archive, build].forEach(child => child.on('error', error => fail(error.message)));
  build.stdin.on('error', error => fail(error.message));
  build.on('close', status => {
    if (status !== 0) {
      fail('The image did not build.');
    }

    const loadFile = path.join(RESULTS_DIRECTORY, `host-load-${commit.slice(0, 12)}.txt`);

    fs.mkdirSync(RESULTS_DIRECTORY, { recursive: true });

    const sampler = setInterval(() => fs.appendFileSync(loadFile, `${new Date().toISOString()} ${os.loadavg().join(' ')}\n`), LOAD_SAMPLE_MILLISECONDS);
    const host = `${os.type()} ${os.release()} ${os.arch()}, ${os.cpus()[0]?.model}, ${os.cpus().length} cores, ${Math.round(os.totalmem() / 2 ** 30)} GB`;
    const run = spawn(
      'docker',
      ['run', '--rm', '--init', '--name', `lattice-dimers-benchmark-${commit.slice(0, 12)}`, '-e', `BENCHMARK_COMMIT=${commit}`, '-e', `BENCHMARK_HOST=${host}`, '-e', `BENCHMARK_IMAGE=${image}`, '-e', 'BENCHMARK_ROOT=/results', '-v', `${RESULTS_DIRECTORY}:/results`, image, 'node', 'harness/benchmarkFull.js', ...passed],
      { stdio: 'inherit' },
    );

    run.on('error', error => fail(error.message));
    run.on('close', code => {
      clearInterval(sampler);
      process.exit(code ?? 1);
    });
  });
}

__main__();
