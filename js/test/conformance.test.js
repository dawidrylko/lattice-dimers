const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, test } = require('node:test');
const { verifyInt, verifyBigInt } = require('../core');
const cli = require('../../spec/cli.json');
const { REJECTION_TIMEOUT, listJavaScriptAlgorithms, solverPathOf, runNode, argsOf, labelOf, shortenArg, selectCases } = require('./support');

const MEMORY_TEST_BYTES = 256 * 2 ** 20;
const MEMORY_TEST_TIMEOUT = 120000;
const MEMORY_REPORTER = path.join(__dirname, 'fixtures', 'reportPeakMemory.js');
const hasJavaScript = ({ algorithm }) => listJavaScriptAlgorithms().includes(algorithm);

function verifierOf({ expectedResult }, algorithm) {
  if (algorithm.startsWith('domicule-rectangle-polynomial-')) {
    return (expected, actual) => expected === actual;
  }

  return algorithm === 'domino-rectangle-number' && typeof expectedResult === 'number' ? verifyInt : verifyBigInt;
}

test('every algorithm in JavaScript runs at least one known count', () => {
  assert.ok(listJavaScriptAlgorithms().length > 0);
  assert.deepEqual(listJavaScriptAlgorithms().filter(algorithm => !selectCases(algorithm).length), []);
});

describe('known counts', () => {
  for (const algorithm of listJavaScriptAlgorithms()) {
    describe(algorithm, () => {
      for (const testCase of selectCases(algorithm)) {
        test(labelOf(testCase), () => {
          const { status, stdout, stderr } = runNode([solverPathOf(algorithm), ...argsOf(testCase)]);

          assert.equal(status, 0, `Exit code ${status}: ${stderr.trim()}`);
          assert.ok(
            verifierOf(testCase, algorithm)(testCase.expectedResult, stdout.trim()),
            `Expected: ${testCase.expectedResult}, Actual: ${stdout.trim()}`,
          );
        });
      }
    });
  }
});

describe('rejections', () => {
  for (const { algorithm, args, message } of cli.rejections.filter(hasJavaScript)) {
    test(`${algorithm} ${args.map(shortenArg).join(' ')}`, () => {
      const { status, stderr, error } = runNode([solverPathOf(algorithm), ...args], { timeout: REJECTION_TIMEOUT });

      assert.ifError(error);
      assert.notEqual(status, 0, 'The solver accepted the arguments.');
      assert.ok(stderr.includes(message), `Expected "${message}" on standard error: ${stderr.trim()}`);
    });
  }
});

describe('parity', () => {
  for (const { algorithm, rowCount, colCount, expectedResult } of cli.parity.filter(hasJavaScript)) {
    test(`${algorithm} on ${rowCount} x ${colCount}`, () => {
      const { status, stdout, stderr } = runNode([solverPathOf(algorithm), ...argsOf({ rowCount, colCount })]);

      assert.equal(status, 0, `Exit code ${status}: ${stderr.trim()}`);
      assert.equal(stdout.trim(), expectedResult);
    });
  }
});

describe('precision', () => {
  const solver = solverPathOf('domino-rectangle-number');

  for (const { rowCount, colCount, expected, warns } of cli.precision) {
    test(`domino-rectangle-number on ${rowCount} x ${colCount}`, () => {
      const { status, stdout, stderr } = runNode([solver, ...argsOf({ rowCount, colCount })], { timeout: REJECTION_TIMEOUT });

      assert.equal(status, 0, `Exit code ${status}: ${stderr.trim()}`);
      assert.equal(stdout.trim(), expected);
      assert.equal(stderr.includes('not exact'), warns, `The warning should be ${warns ? 'shown' : 'missing'}: ${stderr.trim()}`);
    });
  }
});

describe('memory', () => {
  for (const { algorithm, args, expectedResult } of cli.memory.filter(hasJavaScript)) {
    test(`${algorithm} ${args.join(' ')}`, () => {
      const { status, stdout, stderr, error } = runNode(['--require', MEMORY_REPORTER, solverPathOf(algorithm), ...args], {
        timeout: MEMORY_TEST_TIMEOUT,
      });
      const peak = Number((stderr.match(/^peak (\d+)$/m) || [])[1]);

      assert.ifError(error);
      assert.equal(status, 0, `Exit code ${status}: ${stderr.trim()}`);
      assert.equal(stdout.trim(), expectedResult);
      assert.ok(peak <= MEMORY_TEST_BYTES, `Peak ${Math.round(peak / 2 ** 20)} MB of at most ${MEMORY_TEST_BYTES / 2 ** 20} MB`);
    });
  }
});

describe('time', () => {
  test(`${cli.timeSpan.algorithm} reports the count within the whole process on ${cli.timeSpan.args.join(' ')}`, () => {
    const start = process.hrtime.bigint();
    const { status, stderr } = runNode([solverPathOf(cli.timeSpan.algorithm), ...cli.timeSpan.args, '--time']);
    const whole = Number(process.hrtime.bigint() - start) / 1e6;
    const reported = Number((stderr.match(/^time ([\d.]+) ms$/m) || [])[1]);

    assert.equal(status, 0, `Exit code ${status}: ${stderr.trim()}`);
    assert.ok(reported >= whole / 2 && reported <= whole, `The count took ${reported} ms of a ${whole.toFixed(1)} ms process.`);
  });

  for (const algorithm of listJavaScriptAlgorithms()) {
    test(`${algorithm} keeps the output with --time`, () => {
      const args = [solverPathOf(algorithm), '-r', '2', '-c', '2'];
      const plain = runNode(args);
      const timed = runNode([...args, '--time']);

      assert.equal(plain.status, 0, plain.stderr.trim());
      assert.equal(timed.status, 0, timed.stderr.trim());
      assert.equal(timed.stdout, plain.stdout);
      assert.match(timed.stderr, /^time \d+\.\d{3} ms$/m);
    });
  }
});

test('a count written without quotes outside domino-rectangle-number compares as an exact integer', () => {
  assert.equal(verifierOf({ expectedResult: 1e30 }, 'all-lattices-cylinder-torus-modular'), verifyBigInt);
});
