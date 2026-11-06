const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, test, before, after } = require('node:test');
const executor = require('../executor');
const { ROOT_DIRECTORY, makeTemporaryDirectory, withEnvironment } = require('./support');

const BOARD = { rowCount: 2, colCount: 2 };
const JAVASCRIPT = path.join(ROOT_DIRECTORY, 'js', 'solvers', 'domino-rectangle-number.js');
const PYTHON = 'python/lattice_dimers/solvers/domino_rectangle_number.py';
const RUST = 'rust/solvers/src/bin/domino-rectangle-number.rs';
const NOT_BUILT = 'does not exist; build it with cargo build --release in rust/.';
const STALE = 'is older than the .rs files it is built from; rebuild it with cargo build --release in rust/.';

const guard = action => {
  try {
    return action();
  } catch (error) {
    return `an error: ${error.message}`;
  }
};

describe('executor', () => {
  const absoluteTarget = path.join(os.tmpdir(), 'cargo-target');
  const staleTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-target-'));
  const staleBinary = path.join(staleTarget, 'release', 'domino-rectangle-number');

  before(() => {
    fs.mkdirSync(path.dirname(staleBinary));
    fs.writeFileSync(staleBinary, '', { mode: 0o755 });
    fs.utimesSync(staleBinary, 0, 0);
  });

  after(() => fs.rmSync(staleTarget, { recursive: true, force: true }));

  const cases = [
    ['a bare name in js/solvers', 'domino-rectangle-number.js', {}, `"${process.execPath}" "${JAVASCRIPT}" -r 2 -c 2`],
    ['a root-relative JavaScript file', 'js/solvers/domino-rectangle-number.js', {}, `"${process.execPath}" "${JAVASCRIPT}" -r 2 -c 2`],
    ['python3', PYTHON, { PYTHON: undefined }, '"python3" "-I" "-m" "lattice_dimers.solvers.domino_rectangle_number" -r 2 -c 2'],
    ['$PYTHON', PYTHON, { PYTHON: '/opt/python' }, '"/opt/python" "-I" "-m" "lattice_dimers.solvers.domino_rectangle_number" -r 2 -c 2'],
    [
      'the Rust binary in rust/target',
      RUST,
      { CARGO_TARGET_DIR: undefined },
      () => `"${path.join(ROOT_DIRECTORY, 'rust', 'target', 'release', 'domino-rectangle-number')}" -r 2 -c 2`,
    ],
    [
      'a relative $CARGO_TARGET_DIR',
      RUST,
      { CARGO_TARGET_DIR: 'build' },
      () => `"${path.join(ROOT_DIRECTORY, 'rust', 'build', 'release', 'domino-rectangle-number')}" -r 2 -c 2`,
    ],
    [
      'an absolute $CARGO_TARGET_DIR',
      RUST,
      { CARGO_TARGET_DIR: absoluteTarget },
      () => `"${path.join(absoluteTarget, 'release', 'domino-rectangle-number')}" -r 2 -c 2`,
    ],
    ['an unknown language', 'domino-rectangle-number.ts', {}, 'an error: domino-rectangle-number.ts is not a .rs, .py or .js implementation.'],
  ];

  for (const [name, fileName, environment, expected] of cases) {
    test(name, () => {
      const actual = withEnvironment(environment, () => guard(() => executor.generateCommand(fileName, BOARD)));

      assert.equal(actual, typeof expected === 'function' ? expected() : expected);
    });
  }

  test('a Rust binary that was not built', () => {
    const actual = withEnvironment({ CARGO_TARGET_DIR: absoluteTarget }, () => guard(() => executor(RUST, BOARD)));

    assert.equal(actual, `an error: Execution failed: ${path.join(absoluteTarget, 'release', 'domino-rectangle-number')} ${NOT_BUILT}`);
  });

  test('a Rust binary older than the Rust sources', () => {
    const actual = withEnvironment({ CARGO_TARGET_DIR: staleTarget }, () => guard(() => executor(RUST, BOARD)));

    assert.equal(actual, `an error: Execution failed: ${staleBinary} ${STALE}`);
  });
});

describe('a copy of the executor in a root of its own', () => {
  test('a Rust binary older than only its own root', t => {
    const root = fs.realpathSync(makeTemporaryDirectory(t, 'own-root-'));
    const file = name => path.join(root, ...name.split('/'));
    const binary = file('rust/target/release/solver');
    const now = Date.now() / 1000;
    const write = (name, seconds, mode) => {
      fs.mkdirSync(path.dirname(file(name)), { recursive: true });
      fs.writeFileSync(file(name), '', { mode });
      fs.utimesSync(file(name), seconds, seconds);
    };

    fs.mkdirSync(file('benchmarks'), { recursive: true });
    fs.copyFileSync(path.join(ROOT_DIRECTORY, 'benchmarks', 'executor.js'), file('benchmarks/executor.js'));
    write('rust/core/src/lib.rs', now - 60);
    write('rust/solvers/src/bin/solver.rs', now + 60);
    write('rust/solvers/src/bin/other.rs', now - 60);
    write('rust/target/release/solver', now, 0o755);

    const actual = withEnvironment({ CARGO_TARGET_DIR: undefined }, () => guard(() => require(file('benchmarks/executor.js'))('rust/solvers/src/bin/solver.rs', BOARD)));

    assert.equal(actual, `an error: Execution failed: ${binary} ${STALE}`);
  });
});

describe('the newest Rust source of a binary', () => {
  const sources = [
    ['core/src/lib.rs', 3000],
    ['solvers/src/bin/first.rs', 2000],
    ['solvers/src/bin/second.rs', 4000],
    ['target/release/build/generated.rs', 5000],
    ['build/release/build/generated.rs', 6000],
    ['tests/conformance.rs', 7000],
  ];
  const cases = [
    ['a binary whose shared source is newer than its own file, not the newer root of another binary', 'solvers/src/bin/first.rs', 3000],
    ['a binary whose own file is the newest', 'solvers/src/bin/second.rs', 4000],
  ];

  for (const [name, source, seconds] of cases) {
    test(name, t => {
      const rust = makeTemporaryDirectory(t, 'rust-sources-');
      const file = relative => path.join(rust, ...relative.split('/'));

      for (const [relative, modified] of sources) {
        fs.mkdirSync(path.dirname(file(relative)), { recursive: true });
        fs.writeFileSync(file(relative), '');
        fs.utimesSync(file(relative), modified, modified);
      }

      const actual = withEnvironment({ CARGO_TARGET_DIR: 'build' }, () => executor.rustSourcesModifiedAt(file(source), rust));

      assert.equal(actual, seconds * 1000);
    });
  }
});

test('the executor runs exactly the languages of spec/algorithms.json', () => {
  const { languages } = JSON.parse(fs.readFileSync(path.join(ROOT_DIRECTORY, 'spec', 'algorithms.json'), 'utf-8'));

  assert.deepEqual(Object.keys(executor.LAUNCHERS).sort(), Object.keys(languages).map(language => `.${language}`).sort());
});
