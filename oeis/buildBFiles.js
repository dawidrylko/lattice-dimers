const fs = require('fs');
const path = require('path');
const { calculateTotalTilingCombinations } = require('../js/solvers/domino-rectangle-formula');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const ZEX_DIRECTORY = path.join(ROOT_DIRECTORY, 'research', 'king-entropy', 'data', 'zex');
const LAST_DOMINO_SQUARE = 44;
const LAST_ANTIDIAGONAL = 46;
const LAST_SQUARE = 12;
const LAST_TORUS = 8;
const LAST_DIAGONAL_ROW = 10;
const TORUS_FILE = 'spec/cases/all-lattices-cylinder-torus-modular.json';
const DIAGONAL_FILE = 'spec/cases/domicule-rectangle-polynomial-modular.json';
const SOURCES = {
  'A004003/b004003.txt': 'js/solvers/domino-rectangle-formula.js',
  'A239264/b239264.txt': path.relative(ROOT_DIRECTORY, ZEX_DIRECTORY),
  'A239273/b239273.txt': path.relative(ROOT_DIRECTORY, ZEX_DIRECTORY),
  'A401670/b401670.txt': TORUS_FILE,
  'A401673/b401673.txt': DIAGONAL_FILE,
};

function readStrips() {
  const strips = new Map();

  for (const file of fs.readdirSync(ZEX_DIRECTORY).sort()) {
    const match = file.match(/^zex_king_free_m(\d+)_K\d+\.json$/);

    if (!match) {
      continue;
    }

    const width = Number(match[1]);
    const counts = JSON.parse(fs.readFileSync(path.join(ZEX_DIRECTORY, file), 'utf-8')).Z.map(String);
    const known = strips.get(width) ?? [];
    const shared = Math.min(known.length, counts.length);

    if (known.slice(0, shared).some((count, length) => count !== counts[length])) {
      throw new Error(`The strip counts of width ${width} disagree between files in ${path.relative(ROOT_DIRECTORY, ZEX_DIRECTORY)}.`);
    }

    if (counts.length > known.length) {
      strips.set(width, counts);
    }
  }

  return strips;
}

function countTilings(strips, rows, columns) {
  const width = Math.min(rows, columns);
  const length = Math.max(rows, columns);

  if (width === 0) {
    return '1';
  }

  if ((rows * columns) % 2 === 1) {
    return '0';
  }

  if (width === 1) {
    return '1';
  }

  const counts = strips.get(width) ?? [];

  if (length >= counts.length) {
    throw new Error(`No count for the ${width} X ${length} board in ${path.relative(ROOT_DIRECTORY, ZEX_DIRECTORY)}.`);
  }

  return counts[length];
}

function readTestCases(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8')).testCases;
}

function readTori() {
  const tori = new Map([[0, '1']]);

  for (const { rowCount, colCount, lattice, torus, twisted, expectedResult } of readTestCases(TORUS_FILE)) {
    if (lattice !== 'king' || !torus || twisted || rowCount !== colCount || rowCount % 2 === 1) {
      continue;
    }

    tori.set(rowCount / 2, expectedResult);
  }

  return Array.from({ length: LAST_TORUS + 1 }, (_, n) => {
    if (!tori.has(n)) {
      throw new Error(`No count for the ${2 * n} X ${2 * n} torus in ${TORUS_FILE}.`);
    }

    return tori.get(n);
  });
}

function readDiagonalRows() {
  const rows = new Map();

  for (const { rowCount, colCount, expectedResult } of readTestCases(DIAGONAL_FILE)) {
    if (rowCount !== colCount || rowCount % 2 === 1) {
      continue;
    }

    const coefficients = expectedResult.split(',');

    if (coefficients.some((coefficient, index) => index % 2 === 1 && coefficient !== '0')) {
      throw new Error(`An odd number of diagonal pieces has tilings on the ${rowCount} X ${rowCount} board in ${DIAGONAL_FILE}.`);
    }

    const row = coefficients.filter((_, index) => index % 2 === 0);
    const length = (rowCount / 2) ** 2 + 1;

    if (row.length !== length) {
      throw new Error(`The ${rowCount} X ${rowCount} board has ${row.length} diagonal counts in ${DIAGONAL_FILE} instead of ${length}.`);
    }

    rows.set(rowCount / 2, row);
  }

  return Array.from({ length: LAST_DIAGONAL_ROW + 1 }, (_, n) => {
    if (!rows.has(n)) {
      throw new Error(`No diagonal counts for the ${2 * n} X ${2 * n} board in ${DIAGONAL_FILE}.`);
    }

    return rows.get(n);
  });
}

function formatBFile(terms) {
  return terms.map((term, index) => `${index} ${term}\n`).join('');
}

function buildBFiles() {
  const strips = readStrips();
  const array = [];

  for (let antidiagonal = 0; antidiagonal <= LAST_ANTIDIAGONAL; antidiagonal++) {
    for (let n = 0; n <= antidiagonal; n++) {
      array.push(countTilings(strips, n, antidiagonal - n));
    }
  }

  const squares = Array.from({ length: LAST_SQUARE + 1 }, (_, n) => countTilings(strips, 2 * n, 2 * n));

  const dominoes = Array.from({ length: LAST_DOMINO_SQUARE + 1 }, (_, n) =>
    String(calculateTotalTilingCombinations({ rowCount: 2 * n })),
  );
  const triangle = readDiagonalRows().flat();

  return {
    'A004003/b004003.txt': formatBFile(dominoes),
    'A239264/b239264.txt': formatBFile(array),
    'A239273/b239273.txt': formatBFile(squares),
    'A401670/b401670.txt': formatBFile(readTori()),
    'A401673/b401673.txt': formatBFile(triangle),
  };
}

function main() {
  const check = process.argv.includes('--check');
  let passed = true;

  for (const [name, content] of Object.entries(buildBFiles())) {
    const file = path.join(__dirname, name);
    const terms = content.split('\n').length - 1;

    if (!check) {
      fs.writeFileSync(file, content);
      console.log(`Wrote ${name}: ${terms} terms.`);
      continue;
    }

    process.stdout.write(`Checking ${name} (${terms} terms) against ${SOURCES[name]}... `);

    if (fs.existsSync(file) && fs.readFileSync(file, 'utf-8') === content) {
      console.log('Passed!');
    } else {
      console.error(`Failed! Run node oeis/buildBFiles.js to rebuild ${name}.`);
      passed = false;
    }
  }

  process.exit(passed ? 0 : 1);
}

main();
