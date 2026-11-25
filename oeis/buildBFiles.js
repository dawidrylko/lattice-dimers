const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { calculateTotalTilingCombinations } = require('../js/solvers/domino-rectangle-formula');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const ZEX_DIRECTORY = path.join(ROOT_DIRECTORY, 'research', 'king-entropy', 'data', 'zex');
const LAST_DOMINO_SQUARE = 44;
const LAST_ANTIDIAGONAL = 46;
const LAST_SQUARE = 12;
const LAST_TORUS = 8;
const LAST_CYLINDER = 11;
const LAST_DIAGONAL_ROW = 10;
const TORUS_FILE = 'spec/cases/any-lattice-cylinder-torus-modular.json';
const DIAGONAL_FILE = 'spec/cases/domicule-rectangle-polynomial-modular.json';
const TRIANGULAR_FILE = 'spec/cases/any-lattice-rectangle-modular.json';
const LAST_TRIANGULAR_SQUARE = 11;
const LAST_DOMINO_CYLINDER = 10;
const LAST_TRIANGULAR_CYLINDER = 10;
const LAST_TRIANGULAR_TORUS = 8;
const TRIANGULAR_POLYNOMIAL_FILE = 'spec/cases/any-lattice-cylinder-torus-polynomial-modular.json';
const TRIANGULAR_STRIP = 4;
const LAST_TERMS = {
  A004003: 44,
  A239264: 1127,
  A239273: 12,
  A309117: 1000,
  A399633: 36,
  A401670: 8,
  A401673: 395,
  A401988: 37,
  A402163: 11,
  A402345: 44,
  A402693: 36,
};
const SOURCES = {
  'A004003/b004003.txt': 'js/solvers/domino-rectangle-formula.js',
  'A239264/b239264.txt': path.relative(ROOT_DIRECTORY, ZEX_DIRECTORY),
  'A239273/b239273.txt': path.relative(ROOT_DIRECTORY, ZEX_DIRECTORY),
  'A309117/b309117.txt': path.relative(ROOT_DIRECTORY, ZEX_DIRECTORY),
  'A399633/b399633.txt': TORUS_FILE,
  'A401670/b401670.txt': TORUS_FILE,
  'A401673/b401673.txt': DIAGONAL_FILE,
  'A401988/b401988.txt': TRIANGULAR_FILE,
  'A402163/b402163.txt': `${TORUS_FILE} and ${path.relative(ROOT_DIRECTORY, ZEX_DIRECTORY)}`,
  'A402345/b402345.txt': TORUS_FILE,
  'A402693/b402693.txt': `${TORUS_FILE} and ${TRIANGULAR_POLYNOMIAL_FILE}`,
};

function readStrips(lattice, boundary = 'free') {
  const strips = new Map();

  for (const file of fs.readdirSync(ZEX_DIRECTORY).sort()) {
    const match = file.match(new RegExp(`^zex_${lattice}_${boundary}_m(\\d+)_K\\d+\\.json$`));

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

function readCylinders() {
  const strips = readStrips('king', 'cyl');
  const squares = new Map([[0, '1']]);

  for (const { rowCount, colCount, lattice, torus, twisted, expectedResult } of readTestCases(TORUS_FILE)) {
    if (lattice === 'king' && !torus && !twisted && rowCount === colCount && rowCount % 2 === 0) {
      squares.set(rowCount / 2, expectedResult);
    }
  }

  return Array.from({ length: LAST_CYLINDER + 1 }, (_, n) => {
    const strip = strips.get(2 * n) ?? [];
    const stored = squares.get(n);
    const computed = strip[2 * n];

    if (stored !== undefined && computed !== undefined && stored !== computed) {
      throw new Error(`The ${2 * n} X ${2 * n} cylinder differs between ${TORUS_FILE} and ${path.relative(ROOT_DIRECTORY, ZEX_DIRECTORY)}.`);
    }

    if (stored === undefined && computed === undefined) {
      throw new Error(`No count for the ${2 * n} X ${2 * n} cylinder.`);
    }

    return stored ?? computed;
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

function readTriangularSquares() {
  const squares = new Map([[0, '1']]);

  for (const { rowCount, colCount, lattice, expectedResult } of readTestCases(TRIANGULAR_FILE)) {
    if (lattice === 'triangular' && rowCount === colCount && rowCount % 2 === 0) {
      squares.set(rowCount / 2, expectedResult);
    }
  }

  return Array.from({ length: LAST_TRIANGULAR_SQUARE + 1 }, (_, n) => {
    if (!squares.has(n)) {
      throw new Error(`No count for the ${2 * n} X ${2 * n} triangular board in ${TRIANGULAR_FILE}.`);
    }

    return squares.get(n);
  });
}

function readDominoCylinders() {
  const squares = new Map([[0, '1']]);

  for (const { rowCount, colCount, lattice, torus, twisted, expectedResult } of readTestCases(TORUS_FILE)) {
    if (lattice === 'square' && !torus && !twisted && rowCount === colCount && rowCount % 2 === 0) {
      squares.set(rowCount / 2, expectedResult);
    }
  }

  return Array.from({ length: LAST_DOMINO_CYLINDER + 1 }, (_, n) => {
    if (!squares.has(n)) {
      throw new Error(`No count for the ${2 * n} X ${2 * n} domino cylinder in ${TORUS_FILE}.`);
    }

    return squares.get(n);
  });
}

function readTriangularCylinders() {
  const squares = new Map([[0, '1']]);

  for (const file of [TORUS_FILE, TRIANGULAR_POLYNOMIAL_FILE]) {
    for (const { rowCount, colCount, lattice, torus, twisted, expectedResult } of readTestCases(file)) {
      if (lattice === 'triangular' && !torus && !twisted && rowCount === colCount && rowCount % 2 === 0) {
        const count = String(expectedResult.split(',').reduce((total, part) => total + BigInt(part), 0n));
        const known = squares.get(rowCount / 2);

        if (known !== undefined && known !== count) {
          throw new Error(`The ${rowCount} X ${rowCount} triangular cylinder has two counts in ${TORUS_FILE} and ${TRIANGULAR_POLYNOMIAL_FILE}.`);
        }

        squares.set(rowCount / 2, count);
      }
    }
  }

  return Array.from({ length: LAST_TRIANGULAR_CYLINDER + 1 }, (_, n) => {
    if (!squares.has(n)) {
      throw new Error(`No count for the ${2 * n} X ${2 * n} triangular cylinder in ${TORUS_FILE} or ${TRIANGULAR_POLYNOMIAL_FILE}.`);
    }

    return squares.get(n);
  });
}

function readTriangularTori() {
  const squares = new Map([[0, '1']]);

  for (const { rowCount, colCount, lattice, torus, twisted, expectedResult } of readTestCases(TORUS_FILE)) {
    if (lattice === 'triangular' && torus && !twisted && rowCount === colCount && rowCount % 2 === 0) {
      const known = squares.get(rowCount / 2);

      if (known !== undefined && known !== expectedResult) {
        throw new Error(`The ${rowCount} X ${rowCount} triangular torus has two counts in ${TORUS_FILE}.`);
      }

      squares.set(rowCount / 2, expectedResult);
    }
  }

  return Array.from({ length: LAST_TRIANGULAR_TORUS + 1 }, (_, n) => {
    if (!squares.has(n)) {
      throw new Error(`No count for the ${2 * n} X ${2 * n} triangular torus in ${TORUS_FILE}.`);
    }

    return squares.get(n);
  });
}

function formatBFile(terms) {
  return terms.map((term, index) => `${index} ${term}\n`).join('');
}

function readCheckedTerms() {
  const strips = readStrips('king');
  const array = [];

  for (let antidiagonal = 0; antidiagonal <= LAST_ANTIDIAGONAL; antidiagonal++) {
    for (let n = 0; n <= antidiagonal; n++) {
      array.push(countTilings(strips, n, antidiagonal - n));
    }
  }

  const squares = Array.from({ length: LAST_SQUARE + 1 }, (_, n) => countTilings(strips, 2 * n, 2 * n));
  const dominoes = Array.from({ length: LAST_DOMINO_SQUARE + 1 }, (_, n) => String(calculateTotalTilingCombinations({ rowCount: 2 * n })));

  return {
    'A004003/b004003.txt': formatBFile(dominoes),
    'A239264/b239264.txt': formatBFile(array),
    'A239273/b239273.txt': formatBFile(squares),
    'A309117/b309117.txt': formatBFile(readStrips('tri').get(TRIANGULAR_STRIP)),
    'A399633/b399633.txt': formatBFile(readTriangularTori()),
    'A401670/b401670.txt': formatBFile(readTori()),
    'A401673/b401673.txt': formatBFile(readDiagonalRows().flat()),
    'A401988/b401988.txt': formatBFile(readTriangularSquares()),
    'A402163/b402163.txt': formatBFile(readCylinders()),
    'A402345/b402345.txt': formatBFile(readDominoCylinders()),
    'A402693/b402693.txt': formatBFile(readTriangularCylinders()),
  };
}

function generatorCommand(entry) {
  return `node oeis/${entry}/b${entry.slice(1)}.js 0 ${LAST_TERMS[entry]}`;
}

function check() {
  let passed = true;

  for (const [name, content] of Object.entries(readCheckedTerms())) {
    const file = path.join(__dirname, name);
    const terms = content.split('\n').length - 1;
    const stored = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
    const total = stored.split('\n').length - 1;

    process.stdout.write(`Checking ${name}: terms 0..${terms - 1} of ${total} against ${SOURCES[name]}... `);

    if (stored.startsWith(content)) {
      console.log('Passed!');
    } else {
      console.error(`Failed! Run ${generatorCommand(name.split('/')[0])} > oeis/${name} and compare it with ${SOURCES[name]}.`);
      passed = false;
    }
  }

  return passed;
}

function build(entries) {
  for (const entry of entries) {
    const name = `${entry}/b${entry.slice(1)}.txt`;
    const { status, stdout, stderr } = spawnSync('node', [path.join(__dirname, name.replace('.txt', '.js')), '0', String(LAST_TERMS[entry])], {
      encoding: 'utf-8',
      maxBuffer: 1 << 28,
    });

    if (status !== 0) {
      console.error(`Failed! ${generatorCommand(entry)} stopped: ${stderr.trim()}`);
      return false;
    }

    fs.writeFileSync(path.join(__dirname, name), stdout);
    console.log(`Wrote ${name}: ${LAST_TERMS[entry] + 1} terms from ${generatorCommand(entry)}.`);
  }

  return true;
}

function main() {
  const args = process.argv.slice(2);
  const entries = args.filter(arg => arg !== '--check');
  const unknown = entries.filter(entry => !(entry in LAST_TERMS));

  if (unknown.length > 0 || (args.includes('--check') && entries.length > 0)) {
    console.error(`Usage: node oeis/buildBFiles.js --check | node oeis/buildBFiles.js [${Object.keys(LAST_TERMS).join('|')} ...]`);
    process.exit(2);
  }

  process.exit((args.includes('--check') ? check() : build(entries.length > 0 ? entries : Object.keys(LAST_TERMS))) ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { LAST_TERMS };
