const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const { checkContent } = require('./notebookContent');
const { listNotebooks, ROOT_DIRECTORY } = require('./oeisEntries');

const notebooks = listNotebooks();

test(`${notebooks.length} notebooks set every solver formula as a math block and give The counts a chart and a checked against column`, () => {
  assert.equal(notebooks.length, 15);
  assert.deepEqual(
    notebooks.flatMap(file => checkContent(file, fs.readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8'))),
    [],
  );
});

const fence = '```';
const cell = code => [`${fence}js run`, ...code, fence].join('\n');
const note = ({ solver = ['$$', `${fence}math`, 'a = b', fence], counts }) =>
  ['# Note', '', '## The Modular solver', '', ...solver, '', '## The counts', '', cell(counts), '', '## Verification', '', 'Checked.'].join('\n');
const grid = header => `table(['${header}', 'checked against'], rows);`;
const complete = ["table(['n', 'a(n)', 'checked against'], rows);", "chart({ title: 'entropy' });"];

test('a notebook that follows the rules passes, per kind of surface', () => {
  assert.deepEqual(checkContent('notes/x/03-tori.md', note({ counts: complete })), []);
  assert.deepEqual(checkContent('notes/x/01-rectangles.md', note({ counts: [...complete, grid('h \\\\ w')] })), []);
  assert.deepEqual(checkContent('notes/x/02-cylinders.md', note({ counts: [...complete, grid('w \\\\ h')] })), []);
  assert.deepEqual(checkContent('notes/x/05-cylinders-by-diagonal-pieces.md', note({ counts: [...complete, "print('The first rows:');"] })), []);
});

test('a solver without a math block, The counts without a chart and a table without the column fail', () => {
  assert.deepEqual(checkContent('n.md', note({ solver: ['Text with $a = b$ inline.'], counts: complete })), ['n.md: The Modular solver sets no formula of its solver as a math block.']);
  assert.deepEqual(checkContent('n.md', note({ counts: [complete[0]] })), ['n.md: The counts draws no chart.']);
  assert.deepEqual(checkContent('n.md', note({ counts: ["table(['n', 'a(n)', 'status'], rows);", complete[1]] })), [
    "n.md: The counts has 1 tables and 0 columns 'checked against'.",
  ]);
});

test('a rectangles notebook without its h × w table and a diagonal one without its first rows fail', () => {
  assert.deepEqual(checkContent('notes/x/01-rectangles.md', note({ counts: complete })), ['notes/x/01-rectangles.md: The counts has no h × w table of the rectangles.']);
  assert.deepEqual(checkContent('notes/x/02-cylinders.md', note({ counts: complete })), ['notes/x/02-cylinders.md: The counts has no w × h table of the cylinders.']);
  assert.deepEqual(checkContent('notes/x/04-rectangles-by-diagonal-pieces.md', note({ counts: complete })), [
    'notes/x/04-rectangles-by-diagonal-pieces.md: The counts prints no full rows of the first boards.',
  ]);
});

test('a chart outside the cells of The counts does not count', () => {
  assert.deepEqual(checkContent('n.md', note({ counts: [complete[0]] }).replace('## Verification', '## Verification\n\nThe call chart( is prose.')), ['n.md: The counts draws no chart.']);
});
