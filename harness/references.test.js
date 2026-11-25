const assert = require('node:assert/strict');
const { test } = require('node:test');
const { checkAdjacent, checkConsistency, checkFile, checkSnapshot, listReferenceFiles, readSnapshot } = require('./references');

const files = listReferenceFiles();
const snapshot = readSnapshot();

test(`${files.length} References sections match their DOI records and are numbered in the order of first citation`, () => {
  assert.deepEqual(
    files.flatMap(file => checkFile(file, snapshot)),
    [],
  );
});

test('two citations side by side are one citation [n, m]', () => {
  assert.deepEqual(checkAdjacent('note.md', 'Fisher [1, 2], Kasteleyn [2] and `[1], [2]` in code.'), []);
  assert.equal(checkAdjacent('note.md', 'Fisher [1], [2] and Kasteleyn [1] [2].').length, 2);
});

test('a work cited by several notes reads the same in each', () => {
  assert.deepEqual(checkConsistency(files), []);
});

test('harness/references.json keeps only the DOIs the notes cite', () => {
  assert.deepEqual(checkSnapshot(files, snapshot), []);
});

test('the site sets each citation as a superscript linked to its item in References', async () => {
  const { renderNote } = require('../site/notes');
  const markdown = [
    '# Note',
    '',
    'Kasteleyn [2] and Fisher [1, 2] count, `[3]` is code, $[1]$ is math and [3] is no reference.',
    '',
    '| board | source |',
    '| --- | --- |',
    '| 2 × 2 | table [1] |',
    '',
    '> quoted [2]',
    '',
    '- listed [1]',
    '',
    '## References',
    '',
    '1. M. E. Fisher. A title.',
    '2. P. W. Kasteleyn. A title.',
  ].join('\n');
  const { html } = await renderNote(markdown, { resolveLink: href => href, context: {} });

  assert.match(html, /Kasteleyn<sup class="citation">\[<a href="#reference-2">2<\/a>\]<\/sup> and Fisher<sup class="citation">\[<a href="#reference-1">1<\/a>, <a href="#reference-2">2<\/a>\]<\/sup> count/);
  assert.match(html, /<td>table<sup class="citation">\[<a href="#reference-1">1<\/a>\]<\/sup><\/td>/);
  assert.match(html, /<blockquote>quoted<sup class="citation">\[<a href="#reference-2">2<\/a>\]<\/sup><\/blockquote>/);
  assert.match(html, /<li>listed<sup class="citation">\[<a href="#reference-1">1<\/a>\]<\/sup><\/li>/);
  assert.match(html, /<code>\[3\]<\/code>/);
  assert.match(html, /data-tex="\[1\]"/);
  assert.match(html, /and \[3\] is no reference/);
  assert.match(html, /<li id="reference-1">M\. E\. Fisher/);
  assert.match(html, /<li id="reference-2">P\. W\. Kasteleyn/);
});
