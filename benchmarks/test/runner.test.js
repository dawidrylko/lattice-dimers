const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, test } = require('node:test');
const { listImplementations } = require('../../js/core/registry');
const { describeEnvironment, runDirectoryName } = require('../environment');
const { WRONG_COUNT, makeTemporaryDirectory, runNode, runRunner, runBenchmark } = require('./support');

const RUNNER = 'benchmarks/runner.js';

describe('rejections', () => {
  const cases = [
    { args: ['-n', '1', '--only', 'missing.js'], message: 'Usage' },
    { args: ['-n', '1', '-o', '99'], message: 'No test cases' },
    { args: ['-n', '1', '--domicule', '--only', 'domino-rectangle-number.js'], message: 'Usage' },
    { args: ['-n', '1', '--torus', '--only', 'domicule-rectangle-bigint.js'], message: 'Usage' },
    { args: ['-n', '1', '--torus', '--diagonal'], message: 'Usage' },
    { args: ['-n', '1', '--torus', '--lattice', 'hexagonal'], message: 'Usage' },
    { args: ['-n', '1', '--cylinder', '--lattice'], message: 'Usage' },
    { args: ['-n', '1', '--domicule', '--lattice', 'square'], message: 'Usage' },
    { args: ['-n', '1', '--lattice', 'square'], message: 'Usage' },
    { args: ['-n', '1', '--torus', '--lattice=square'], message: 'Usage' },
  ];

  for (const { args, message } of cases) {
    test(args.join(' '), () => {
      const { status, stderr, error } = runNode([RUNNER, ...args]);

      assert.ifError(error);
      assert.notEqual(status, 0, 'The runner accepted the arguments.');
      assert.ok(stderr.includes(message), `Expected "${message}" on standard error: ${stderr.trim()}`);
    });
  }
});

describe('usage line', () => {
  test(RUNNER, () => {
    const { stderr } = runNode([RUNNER, '-r', 'x']);
    const named = (stderr.match(/Usage: node (\S+)/) || [])[1];

    assert.equal(named, RUNNER, `The usage line names ${named || 'no script'}: ${stderr.trim().split('\n')[0]}`);
  });
});

describe('result files by surface', () => {
  const fileOf = ({ file }, suffix) => `${path.basename(file)}_${suffix}.txt`;
  const cases = [
    { args: ['--torus', '--only', 'all-lattices-cylinder-torus-modular.js'], file: 'all-lattices-cylinder-torus-modular.js_2x2-king-torus.txt' },
    ...listImplementations('all-lattices-cylinder-torus-bigint').flatMap(implementation => [
      { args: ['--cylinder', '--only', 'all-lattices-cylinder-torus-bigint.js'], file: fileOf(implementation, '2x2-king-cylinder') },
      { args: ['--cylinder', '--lattice', 'square', '--only', 'all-lattices-cylinder-torus-bigint.js'], file: fileOf(implementation, '2x2-square-cylinder') },
      { args: ['--cylinder', '--lattice', 'triangular', '--only', 'all-lattices-cylinder-torus-bigint.js'], file: fileOf(implementation, '2x2-triangular-cylinder') },
      { args: ['--torus', '--lattice', 'square', '--only', 'all-lattices-cylinder-torus-bigint.js'], file: fileOf(implementation, '2x2-square-torus') },
    ]),
    ...listImplementations('all-lattices-cylinder-torus-modular').flatMap(implementation => [
      { args: ['--torus', '--only', 'all-lattices-cylinder-torus-modular.js'], file: fileOf(implementation, '2x2-king-torus') },
      { args: ['--torus', '--lattice', 'square', '--only', 'all-lattices-cylinder-torus-modular.js'], file: fileOf(implementation, '2x2-square-torus') },
      { args: ['--cylinder', '--lattice', 'square', '--only', 'all-lattices-cylinder-torus-modular.js'], file: fileOf(implementation, '2x2-square-cylinder') },
    ]),
    ...[
      ['domino-rectangle-formula', []],
      ['domino-rectangle-number', []],
      ['domino-rectangle-bigint', []],
      ['diagonal-pieces-bigint', ['--diagonal']],
      ['domicule-rectangle-bigint', ['--domicule']],
      ['diagonal-pieces-modular', ['--diagonal']],
      ['domicule-rectangle-modular', ['--domicule']],
    ].flatMap(([algorithm, flags]) =>
      listImplementations(algorithm).map(implementation => ({ args: [...flags, '--only', `${algorithm}.js`], file: fileOf(implementation, '0x0') })),
    ),
  ];

  for (const { args, file } of cases) {
    test(`${args.join(' ')} writes ${file}`, t => {
      const benchmarkRoot = makeTemporaryDirectory(t, 'domino-benchmark-');
      const { status, stderr } = runRunner(benchmarkRoot, ['-n', '1', '-m', '1', ...args]);
      const written = fs.readdirSync(benchmarkRoot).flatMap(month => fs.readdirSync(path.join(benchmarkRoot, month)));

      assert.equal(status, 0, `Exit code ${status}: ${stderr.trim()}`);
      assert.ok(written.includes(file), `Files ${written.join(', ')}`);
    });
  }
});

describe('a run', () => {
  test('refuses to overwrite the results of another machine unless forced', t => {
    const benchmarkRoot = makeTemporaryDirectory(t, 'domino-benchmark-');
    const directory = path.join(benchmarkRoot, runDirectoryName(describeEnvironment()));
    const foreign = { date: null, node: 'v0.0.0', platform: 'Other 0 x0', cpu: 'Other CPU', cores: 1, memory: null };

    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'environment.json'), JSON.stringify(foreign));

    const refused = runBenchmark(benchmarkRoot, []);
    const kept = JSON.parse(fs.readFileSync(path.join(directory, 'environment.json'), 'utf-8'));
    const forced = runBenchmark(benchmarkRoot, ['--force']);

    assert.notEqual(refused.status, 0, 'The run was not refused.');
    assert.ok(refused.stderr.includes('--force'), refused.stderr.trim());
    assert.equal(kept.cpu, foreign.cpu);
    assert.equal(forced.status, 0, `--force did not overwrite: ${forced.stderr.trim()}`);
    assert.ok(fs.existsSync(path.join(directory, 'domino-rectangle-formula.js_0x0.txt')));
  });

  test('records the time of the count and of the process', t => {
    const benchmarkRoot = makeTemporaryDirectory(t, 'domino-benchmark-');
    const { status, stderr } = runBenchmark(benchmarkRoot, []);
    const [month] = fs.readdirSync(benchmarkRoot);
    const content = fs.readFileSync(path.join(benchmarkRoot, month, 'domino-rectangle-formula.js_0x0.txt'), 'utf-8');
    const environment = JSON.parse(fs.readFileSync(path.join(benchmarkRoot, month, 'environment.json'), 'utf-8'));
    const count = Number(content.match(/^Average Execution Time: ([\d.]+) ms$/m)?.[1]);
    const whole = Number(content.match(/^Average Process Time: ([\d.]+) ms$/m)?.[1]);

    assert.equal(status, 0, stderr.trim());
    assert.ok(count >= 0, `The count took ${count} ms.`);
    assert.ok(whole > count, `The process took ${whole} ms against ${count} ms of the count.`);
    assert.match(content, /^Load Average Before: /m);
    assert.equal(environment.timing, 'solver');
  });

  test('refuses a count that differs from spec/cases', t => {
    const benchmarkRoot = makeTemporaryDirectory(t, 'domino-benchmark-');
    const { status, stderr } = runRunner(benchmarkRoot, ['-n', '1', '-m', '1', '--torus', '--only', 'all-lattices-cylinder-torus-modular.js'], { PYTHON: WRONG_COUNT });

    assert.notEqual(status, 0, 'A wrong count was not refused.');
    assert.ok(stderr.includes('counted 1 instead of 24'), stderr.trim());
  });

  test('refuses a Python whose version cannot be read', t => {
    const benchmarkRoot = makeTemporaryDirectory(t, 'domino-benchmark-');
    const { status, stderr } = runRunner(benchmarkRoot, ['-n', '1', '-m', '1', '--torus', '--only', 'all-lattices-cylinder-torus-modular.js'], {
      PYTHON: path.join(benchmarkRoot, 'missing-python'),
    });

    assert.notEqual(status, 0, 'A run without a readable Python version was not refused.');
    assert.ok(stderr.includes('cannot read its version'), stderr.trim());
    assert.deepEqual(fs.readdirSync(benchmarkRoot), []);
  });

  test('writes nothing when the offset selects no test case', t => {
    const benchmarkRoot = makeTemporaryDirectory(t, 'domino-benchmark-');
    const { status, stderr } = runBenchmark(benchmarkRoot, ['-o', '99']);

    assert.notEqual(status, 0, 'The empty selection was not refused.');
    assert.ok(stderr.includes('No test cases'), stderr.trim());
    assert.deepEqual(fs.readdirSync(benchmarkRoot), []);
  });
});
