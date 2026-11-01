const fs = require('fs');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const ZEX_DIRECTORY = path.join(ROOT_DIRECTORY, 'research', 'king-entropy', 'data', 'zex');
const LAST_ANTIDIAGONAL = 46;
const LAST_SQUARE = 12;

function readStrips() {
  const strips = new Map();

  for (const file of fs.readdirSync(ZEX_DIRECTORY)) {
    const match = file.match(/^zex_king_free_m(\d+)_K\d+\.json$/);

    if (!match) {
      continue;
    }

    const width = Number(match[1]);
    const counts = JSON.parse(fs.readFileSync(path.join(ZEX_DIRECTORY, file), 'utf-8')).Z.map(String);

    if (counts.length > (strips.get(width) ?? []).length) {
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

  return { 'b239264.txt': formatBFile(array), 'b239273.txt': formatBFile(squares) };
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

    process.stdout.write(`Checking ${name} (${terms} terms) against ${path.relative(ROOT_DIRECTORY, ZEX_DIRECTORY)}... `);

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
