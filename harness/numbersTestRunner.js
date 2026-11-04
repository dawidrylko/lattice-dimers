const fs = require('fs');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const RESEARCH_DIRECTORY = path.join(ROOT_DIRECTORY, 'research', 'king-entropy');
const SUMMARY_FILES = [
  'README.md',
  '.zenodo.json',
  'CITATION.cff',
  'research/king-entropy/README.md',
  'research/king-entropy/release/ZENODO.md',
  'oeis/A401669/A401669.txt',
];
const SUPERSCRIPTS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const XI_DIGITS = 6;
const XI_ERROR = 1e-6;
const COPY_WINDOW = 0.1;

function readResearch(file) {
  return fs.readFileSync(path.join(RESEARCH_DIRECTORY, file), 'utf-8');
}

function match(file, pattern) {
  const found = readResearch(file).match(pattern);

  if (!found) {
    throw new Error(`research/king-entropy/${file} has no line matching ${pattern}.`);
  }

  return found;
}

function sharedPrefix(a, b) {
  let length = 0;

  while (length < a.length && a[length] === b[length]) {
    length++;
  }

  return a.slice(0, length);
}

function double(decimal) {
  const [integer, fraction] = decimal.split('.');
  const digits = (BigInt(integer + fraction) * 2n).toString().padStart(fraction.length + 1, '0');

  return `${digits.slice(0, -fraction.length)}.${digits.slice(-fraction.length)}`;
}

function splitError(error) {
  const [mantissa, exponent] = Number(error).toExponential(0).split('e');

  return [mantissa, String(Number(exponent))];
}

function formatError(error) {
  const [mantissa, exponent] = splitError(error);

  return `${mantissa}·10${exponent
    .split('')
    .map(character => SUPERSCRIPTS[character])
    .join('')}`;
}

function formatOeisError(error) {
  const [mantissa, exponent] = splitError(error);

  return `${mantissa}*10^${exponent}`;
}

function readConstants() {
  const [, s, sError] = match('out/out_errbar.txt', /RECOMMENDATION: s = ([0-9.]+) \+- ([0-9.e+-]+)/);
  const [, lower] = match('out/out_bounds.txt', /BEST CERTIFIED: ([0-9.]+) <= s/);
  const runweight = JSON.parse(readResearch('data/runweight_3state.json'));
  const widest = Object.keys(runweight).map(Number).sort((a, b) => b - a)[0];
  const [, sigma, sigmaError] = match('out/out_surface.txt', /RESULT: .*sigma = ([0-9.]+) \+- ([0-9.e+-]+)/);
  const [, kappa, kappaError] = match('out/out_corner.txt', /RESULT: kappa = ([0-9.]+) \+- ([0-9.e+-]+)/);
  const [, xi, xiChange] = match(
    'log-convexity/out_levels.txt',
    /RESULT xi = 1\/m_v = ([0-9.]+) \(w = \d+; change from w = \d+: ([0-9.e+-]+)\)/,
  );
  const [, conditionalLower, conditionalUpper] = match(
    'out/out_cw.txt',
    /CONDITIONAL INTERVAL given .*: ([0-9.]+) <= s <= ([0-9.]+)/,
  );
  const [, sLow, sHigh] = match('out/out_derived.txt', /s - ds, s \+ ds = ([0-9.]+), ([0-9.]+)/);
  const [, expLow, expHigh] = match('out/out_derived.txt', /exp\(s - ds\), exp\(s \+ ds\) = ([0-9.]+), ([0-9.]+)/);

  if (5 * Number(xiChange) > XI_ERROR) {
    throw new Error(`The last change of xi, ${xiChange}, is too large for the quoted error 10⁻⁶.`);
  }

  return {
    s: { values: [s, sharedPrefix(sLow, sHigh)], error: sError },
    lower: { values: [lower] },
    upper: { values: [runweight[widest].upper] },
    sigma: { values: [sigma], error: sigmaError },
    kappa: { values: [kappa], error: kappaError },
    xi: { values: [Number(xi).toFixed(XI_DIGITS)] },
    conditionalLower: { values: [conditionalLower] },
    conditionalUpper: { values: [conditionalUpper] },
    perDimer: { values: [sharedPrefix(double(sLow), double(sHigh))] },
    perSite: { values: [sharedPrefix(expLow, expHigh)] },
  };
}

function checkSummaryCopies(constants) {
  const errors = [];
  const copies = Object.entries(constants).flatMap(([name, { values }]) => values.map(value => ({ name, value })));

  for (const file of SUMMARY_FILES) {
    const content = fs.readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8');

    for (const [number] of content.matchAll(/\d+\.\d{6,}/g)) {
      const near = copies.filter(({ value }) => Math.abs(Number(value) - Number(number)) <= COPY_WINDOW * Number(value));

      if (near.length > 0 && !near.some(({ value }) => value === number)) {
        const allowed = near.map(({ name, value }) => `${name} = ${value}`).join(', ');

        errors.push(`${file} has ${number}, which is none of the constants of research/king-entropy within ${COPY_WINDOW * 100}% of it: ${allowed}.`);
      }
    }
  }

  return errors;
}

function checkReadmeTable(constants) {
  const readme = fs.readFileSync(path.join(ROOT_DIRECTORY, 'README.md'), 'utf-8');
  const expected = [
    `| entropy per site $s$ | ${constants.s.values[0]} ± ${formatError(constants.s.error)} |`,
    `| bounds on $s$ | ${constants.lower.values[0]} ≤ s ≤ ${constants.upper.values[0]} |`,
    `| surface free energy $\\sigma$ of a free edge | ${constants.sigma.values[0]} ± ${formatError(constants.sigma.error)} |`,
    `| corner free energy $\\kappa$ | ${constants.kappa.values[0]} ± ${formatError(constants.kappa.error)} |`,
    `| decay length $\\xi$ of the parity splitting | ${constants.xi.values[0]} ± 10⁻⁶ |`,
  ];

  return expected.filter(row => !readme.includes(row)).map(row => `README.md has no row starting ${row}`);
}

function checkEntropyEntry(constants) {
  const lines = fs.readFileSync(path.join(ROOT_DIRECTORY, 'oeis', 'A401669', 'A401669.txt'), 'utf-8').split('\n');
  const shared = constants.s.values[1];
  const comments = lines.filter(line => line.startsWith('%C A401669 ')).join(' ');
  const errors = [];

  for (const line of [`%S A401669 ${shared.split('.')[1].split('').join(',')}`, `%e A401669 ${shared}...`]) {
    if (!lines.includes(line)) {
      errors.push(`A401669.txt needs the line ${line}, the digits shared by both ends of s ± ds.`);
    }
  }

  const phrases = [
    `s = ${constants.s.values[0]} +- ${formatOeisError(constants.s.error)}`,
    `${constants.lower.values[0]} <= s <= ${constants.upper.values[0]}`,
    `2*s = ${constants.perDimer.values[0]}...`,
    `exp(s) = ${constants.perSite.values[0]}...`,
  ];

  for (const phrase of phrases) {
    if (!comments.includes(phrase)) {
      errors.push(`The comments of A401669.txt need "${phrase}".`);
    }
  }

  return errors;
}

function runCheck(name, check) {
  process.stdout.write(`Checking ${name}... `);
  const errors = check();

  if (errors.length > 0) {
    console.error(`Failed!\n${errors.map(error => `  ${error}`).join('\n')}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function __main__() {
  const constants = readConstants();
  const passed = [
    runCheck('the results table of README.md against research/king-entropy', () => checkReadmeTable(constants)),
    runCheck(`the constants in ${SUMMARY_FILES.length} summary files`, () => checkSummaryCopies(constants)),
    runCheck('the digits and comments of A401669.txt', () => checkEntropyEntry(constants)),
  ].every(Boolean);

  if (passed) {
    console.log('All number tests completed successfully.');
    process.exit(0);
  }

  console.error('Some number tests failed.');
  process.exit(1);
}

__main__();
