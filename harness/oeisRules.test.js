const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const { ACCEPTED, RULES, evaluate, lintEntry, lintRepository, parseDraftPage, readNotes } = require('../oeis/editorRules');
const { CASES } = require('./fixtures/oeisRuleCases');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const DRAFT_PAGE = path.join(__dirname, 'fixtures', 'oeis-draft-A402163.html');
const NOTES = readNotes();

function entryText(entry, rows) {
  return rows.map(([type, value]) => `%${type} ${entry} ${value}`).join('\n') + '\n';
}

function caseOptions(item) {
  const { previous, others, ...rest } = item.options ?? {};

  return {
    entry: item.entry,
    mode: 'repo',
    notes: NOTES,
    ...rest,
    previous: previous ? entryText(item.entry, previous) : null,
    others: (others ?? []).map(other => ({ entry: other.entry, text: entryText(other.entry, other.rows) })),
  };
}

function fired(item, rows) {
  return lintEntry(entryText(item.entry, rows), caseOptions(item))
    .filter(result => result.rule === item.rule)
    .map(result => result.message);
}

function isAccepted(result) {
  return ACCEPTED.some(item => item.entry === result.entry && item.rule === result.rule);
}

for (const item of CASES) {
  test(`${item.rule}: ${item.source}`, () => {
    assert.notDeepEqual(fired(item, item.before), [], 'the text before the edit passes the rule');
    assert.deepEqual(fired(item, item.after), [], 'the text after the edit breaks the rule');
  });
}

test('every rule has a case', () => {
  const covered = new Set(CASES.map(item => item.rule));

  assert.deepEqual(
    RULES.map(rule => rule.id).filter(id => !covered.has(id)),
    [],
  );
  assert.deepEqual(
    CASES.map(item => item.rule).filter(id => !RULES.some(rule => rule.id === id)),
    [],
  );
});

test('every rule has a unique id, a text and a source', () => {
  const ids = RULES.map(rule => rule.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    RULES.filter(rule => !rule.text || rule.source.length === 0).map(rule => rule.id),
    [],
  );
});

test('the entries in oeis/ break no rule beyond the accepted findings', () => {
  const defects = lintRepository().filter(result => !isAccepted(result));

  assert.deepEqual(
    defects.map(result => `${result.entry} [${result.rule}] line ${result.line}: ${result.message}`),
    [],
  );
});

test('every accepted finding still fires', () => {
  const results = lintRepository();

  assert.deepEqual(
    ACCEPTED.filter(item => !results.some(result => result.entry === item.entry && result.rule === item.rule)).map(item => `${item.entry} [${item.rule}]`),
    [],
  );
  assert.deepEqual(
    ACCEPTED.filter(item => !RULES.some(rule => rule.id === item.rule)).map(item => item.rule),
    [],
  );
});

test('the draft page parses into the entry text', () => {
  const text = parseDraftPage(fs.readFileSync(DRAFT_PAGE, 'utf-8'), 'A402163');
  const lines = text.trimEnd().split('\n');
  const data = lines.find(line => line.startsWith('%S '));

  assert.equal(data.split(' ')[2].split(',').length, 10);
  assert.ok(data.startsWith('%S A402163 1,9,2649,77481277,'));
  assert.ok(lines.includes('%N A402163 Number of domicule tilings of a 2n X 2n cylindrical grid.'));
  assert.ok(lines.includes('%H A402163 Dawid Ryłko, <a href="/A402163/b402163_1.txt">Table of n, a(n) for n = 0..11</a>'));
  assert.ok(lines.some(line => line.startsWith('%o A402163 R(w, c, f, t) = ') && line.includes('c+1 < w && !bittest(f, c+1)')));
  assert.ok(lines.includes('%o A402163 a(n) = (M(2*n)^(2*n))[1, 1];'));
  assert.ok(lines.includes('%Y A402163 Cf. A239264, A239273 (2n X 2n square), A401670 (2n X 2n torus), A401669.'));
  assert.ok(lines.includes('%K A402163 nonn,changed'));
  assert.ok(lines.includes('%O A402163 0,2'));
  assert.ok(lines.includes('%A A402163 _Dawid Ryłko_, Nov 14 2026'));
  assert.equal(/allocated|proposed|&[a-z]+;|<span|<tt>/.test(text), false);
  assert.equal(parseDraftPage('<html></html>', 'A402163'), null);
});

test('the upper bound of k in the name of a triangle is evaluated', () => {
  assert.equal(evaluate('n^2', 3), 9);
  assert.equal(evaluate('floor(n^2/2)', 3), 4);
  assert.equal(evaluate('2n', 4), 8);
  assert.equal(evaluate('2*n+1', 2), 5);
  assert.equal(evaluate('n/2', 3), null);
  assert.equal(evaluate('log(n)', 2), null);
});

test('the command line lints the repository and a draft page and lists the rules', () => {
  const run = args => spawnSync(process.execPath, [path.join(ROOT_DIRECTORY, 'oeis', 'editorRules.js'), ...args], { encoding: 'utf-8' });
  const repository = run([]);
  const rules = run(['--rules']);
  const draft = run(['--draft', 'A402163', DRAFT_PAGE]);

  assert.equal(repository.status, 0, repository.stdout + repository.stderr);
  assert.doesNotMatch(repository.stdout, / defect /);
  assert.equal(rules.status, 0);
  assert.equal(rules.stdout.split('\n').filter(line => /^[a-z-]+ \(/.test(line)).length, RULES.length);
  assert.equal(draft.status, 1, draft.stdout + draft.stderr);
  assert.match(draft.stdout, /\[program-shared\]/);
  assert.match(draft.stdout, /\[links-mathworld\]/);
  assert.doesNotMatch(draft.stdout, /\[keyword-system\]/);
});
