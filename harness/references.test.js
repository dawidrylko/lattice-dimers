const assert = require('node:assert/strict');
const { test } = require('node:test');
const { checkConsistency, checkFile, checkSnapshot, listReferenceFiles, readSnapshot } = require('./references');

const files = listReferenceFiles();
const snapshot = readSnapshot();

test(`${files.length} References sections match their DOI records and are numbered in the order of first citation`, () => {
  assert.deepEqual(
    files.flatMap(file => checkFile(file, snapshot)),
    [],
  );
});

test('a work cited by several notes reads the same in each', () => {
  assert.deepEqual(checkConsistency(files), []);
});

test('harness/references.json keeps only the DOIs the notes cite', () => {
  assert.deepEqual(checkSnapshot(files, snapshot), []);
});

test('the site links each citation to its item in References', async () => {
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

  assert.match(html, /Kasteleyn \[<a href="#reference-2">2<\/a>\] and Fisher \[<a href="#reference-1">1<\/a>, <a href="#reference-2">2<\/a>\]/);
  assert.match(html, /<td>table \[<a href="#reference-1">1<\/a>\]<\/td>/);
  assert.match(html, /<blockquote>quoted \[<a href="#reference-2">2<\/a>\]<\/blockquote>/);
  assert.match(html, /<li>listed \[<a href="#reference-1">1<\/a>\]<\/li>/);
  assert.match(html, /<code>\[3\]<\/code>/);
  assert.match(html, /data-tex="\[1\]"/);
  assert.match(html, /and \[3\] is no reference/);
  assert.match(html, /<li id="reference-1">M\. E\. Fisher/);
  assert.match(html, /<li id="reference-2">P\. W\. Kasteleyn/);
});
