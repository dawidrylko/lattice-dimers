const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { compareSeries } = require('../benchmarks/measureVariance');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const RESULTS_DIRECTORY = path.join(ROOT_DIRECTORY, 'benchmarks', 'results');
const MAX_START_LOAD = 2;
const LOAD_SAMPLE_MILLISECONDS = 60000;
const NOISE_SERIES = ['first', 'second'];
const NOISE_RUNS = '30';

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
  const noise = argv.includes('--noise');
  const passed = argv.filter(arg => arg !== '--force-load' && arg !== '--noise');

  if (noise && passed.length) {
    fail('Usage: pnpm benchmark:noise [--force-load]');
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

    const short = commit.slice(0, 12);
    const loadFile = noise ? path.join(RESULTS_DIRECTORY, `noise-${short}`, 'host-load.txt') : path.join(RESULTS_DIRECTORY, `host-load-${short}.txt`);

    fs.mkdirSync(path.dirname(loadFile), { recursive: true });

    const sampler = setInterval(() => fs.appendFileSync(loadFile, `${new Date().toISOString()} ${os.loadavg().join(' ')}\n`), LOAD_SAMPLE_MILLISECONDS);
    const host = `${os.type()} ${os.release()} ${os.arch()}, ${os.cpus()[0]?.model}, ${os.cpus().length} cores, ${Math.round(os.totalmem() / 2 ** 30)} GB`;
    const runInImage = (...command) =>
      new Promise((resolve, reject) => {
        const run = spawn(
          'docker',
          ['run', '--rm', '--init', '--name', `lattice-dimers-benchmark-${short}`, '-e', `BENCHMARK_COMMIT=${commit}`, '-e', `BENCHMARK_HOST=${host}`, '-e', `BENCHMARK_IMAGE=${image}`, '-e', 'BENCHMARK_ROOT=/results', '-v', `${RESULTS_DIRECTORY}:/results`, image, 'node', ...command],
          { stdio: 'inherit' },
        );

        run.on('error', reject);
        run.on('close', code => (code === 0 ? resolve() : reject(new Error(`The container exited with code ${code}.`))));
      });
    const measureNoise = async () => {
      for (const series of NOISE_SERIES) {
        await runInImage('benchmarks/measureVariance.js', '--series', series, '--runs', NOISE_RUNS, '--out', `/results/noise-${short}/${series}.json`);
      }

      const [first, second] = NOISE_SERIES.map(series => JSON.parse(fs.readFileSync(path.join(RESULTS_DIRECTORY, `noise-${short}`, `${series}.json`), 'utf-8')));

      console.log('The same code measured twice. One sample of the noise: read the largest difference and the cv, not a single line.');
      compareSeries(first, second).forEach(({ board, language, difference, cv }) => console.log(`${difference}%\tcv ${cv}%\t${language}\t${board}`));
    };

    (noise ? measureNoise() : runInImage('harness/benchmarkFull.js', ...passed))
      .then(() => {
        clearInterval(sampler);
        process.exit(0);
      })
      .catch(error => {
        clearInterval(sampler);
        fail(error.message);
      });
  });
}

__main__();
