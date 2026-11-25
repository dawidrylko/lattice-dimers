const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const { checkNotebook, listNotebooks, ROOT_DIRECTORY } = require('./oeisEntries');

const notebooks = listNotebooks();

test(`${notebooks.length} notebooks list their OEIS entries just above References, one per line, as their OEIS reference names them`, () => {
  assert.equal(notebooks.length, 15);
  assert.deepEqual(
    notebooks.flatMap(file => checkNotebook(file, fs.readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8'))),
    [],
  );
});

const note = body => ['# Note', '', '## Verification', '', 'Checked.', '', '## The OEIS entries', '', ...body, '', '## References', '', '1. OEIS Foundation Inc. The On-Line Encyclopedia of Integer Sequences, entries [OEIS A000129](https://oeis.org/A000129) and [OEIS A004253](https://oeis.org/A004253). [oeis.org](https://oeis.org)'].join('\n');

test('a notebook with every entry on its own line passes, and a draft needs no reference', () => {
  assert.deepEqual(
    checkNotebook('note.md', note(['- [OEIS A000129](https://oeis.org/A000129): circumference 2.', '- [OEIS A004253](https://oeis.org/A004253): circumference 3.', '- [OEIS A402693](https://oeis.org/draft/A402693): the square boards, a draft.'])),
    [],
  );
});

test('two entries on one line, an entry left out and a notebook with no entry and no sentence fail', () => {
  assert.equal(checkNotebook('note.md', note(['- [OEIS A000129](https://oeis.org/A000129), [OEIS A004253](https://oeis.org/A004253): circumference 2 and 3.'])).length, 2);
  assert.deepEqual(checkNotebook('note.md', note(['- [OEIS A000129](https://oeis.org/A000129): circumference 2.'])), [
    'note.md cites A004253 in its OEIS reference but does not list it under The OEIS entries.',
  ]);
  assert.deepEqual(checkNotebook('note.md', note(['Nothing here.']).replace(/\n1\. OEIS.*$/, '\n1. A. Author. A title.')), [
    'note.md lists no OEIS entry and does not say that the OEIS has none.',
  ]);
  assert.deepEqual(checkNotebook('note.md', note(['The OEIS has no entry for these counts.']).replace(/\n1\. OEIS.*$/, '\n1. A. Author. A title.')), []);
});

test('the section must stand just above References', () => {
  assert.deepEqual(checkNotebook('note.md', '# Note\n\n## References\n\n1. A. Author. A title.'), ['note.md has no section "The OEIS entries" just above References.']);
});
