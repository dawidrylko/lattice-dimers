const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const { ACCEPTED, RULES, classify, decodeHtml, evaluate, lintEntry, lintRepository, parseDraftPage, readNotes } = require('../oeis/editorRules');
const { CASES, CLEAN } = require('./fixtures/oeisRuleCases');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const DRAFT_PAGE = path.join(__dirname, 'fixtures', 'oeis-draft-A402163.html');
const NOTES = readNotes();

function entryText(entry, rows) {
  return rows.map(([type, value]) => `%${type} ${entry} ${value}`).join('\n') + '\n';
}

function caseOptions(item, options = item.options) {
  const { previous, others, ...rest } = options ?? {};

  return {
    entry: item.entry,
    mode: 'repo',
    notes: NOTES,
    ...rest,
    previous: previous ? entryText(item.entry, previous) : null,
    others: (others ?? []).map(other => ({ entry: other.entry, live: other.live, text: entryText(other.entry, other.rows) })),
  };
}

function fired(item, rows, options = item.options) {
  return lintEntry(entryText(item.entry, rows), caseOptions(item, options))
    .filter(result => result.rule === item.rule)
    .map(result => result.message);
}

for (const item of CASES) {
  test(`${item.rule}: ${item.source}`, () => {
    const before = fired(item, item.before);

    assert.notDeepEqual(before, [], 'the text before the edit passes the rule');

    if (item.expect) {
      assert.ok(
        before.some(message => message.includes(item.expect)),
        `no finding says "${item.expect}": ${before.join(' | ')}`,
      );
    }

    assert.deepEqual(fired(item, item.after, item.afterOptions ?? item.options), [], 'the text after the edit breaks the rule');
  });
}

for (const item of CLEAN) {
  test(`${item.rule} stays quiet: ${item.source}`, () => {
    assert.deepEqual(fired(item, item.rows), []);
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
  const defects = lintRepository().filter(result => classify(result) === 'defect');

  assert.deepEqual(
    defects.map(result => `${result.entry} [${result.rule}] line ${result.line}: ${result.message}`),
    [],
  );
});

test('every accepted finding still fires', () => {
  const results = lintRepository();

  assert.deepEqual(
    ACCEPTED.filter(item => !results.some(result => result.entry === item.entry && result.rule === item.rule && result.text.includes(item.match))).map(
      item => `${item.entry} [${item.rule}] "${item.match}"`,
    ),
    [],
  );
  assert.deepEqual(
    ACCEPTED.filter(item => !RULES.some(rule => rule.id === item.rule && rule.level === undefined)).map(item => item.rule),
    [],
  );
});

test('an accepted finding covers only the line it names', () => {
  const [accepted] = ACCEPTED;
  const result = { entry: accepted.entry, rule: accepted.rule, level: 'defect', text: '%o another line' };

  assert.equal(classify(result), 'defect');
  assert.equal(classify({ ...result, text: `%o ${accepted.match}` }), 'accepted');
});

test('advice rules never block and everything else is a defect', () => {
  assert.deepEqual(
    RULES.filter(rule => rule.level !== undefined).map(rule => `${rule.id}:${rule.level}`),
    ['links-mathworld:advice', 'links-arxiv-version:advice', 'program-shared:advice'],
  );
});

test('a CROSSREFS sentence naming an entry without a full copy gives a note in a draft and nothing in the repository', () => {
  const text = '%Y A401673 Row sums give A239273.\n';
  const others = [{ entry: 'A239273', text: '%H A239273 Dawid Ryłko, <a href="/A239273/b239273.txt">Table of n, a(n) for n = 0..12</a>\n' }];
  const draft = lintEntry(text, { entry: 'A401673', mode: 'draft', others }).filter(result => result.rule === 'crossrefs-reverse');
  const repository = lintEntry(text, { entry: 'A401673', mode: 'repo', others }).filter(result => result.rule === 'crossrefs-reverse');

  assert.deepEqual(
    draft.map(result => result.level),
    ['note'],
  );
  assert.match(draft[0].message, /--related/);
  assert.deepEqual(repository, []);
});

test('a missing converse sentence is a defect for an entry in oeis/ and advice for any other', () => {
  const text = '%Y A999990 Row sums give A239273. Column k=0 gives A000012.\n';
  const others = [
    { entry: 'A239273', live: true, text: '%Y A239273 Cf. A004003.\n' },
    { entry: 'A000012', live: true, text: '%Y A000012 Cf. A000027.\n' },
  ];
  const results = lintEntry(text, { entry: 'A999990', mode: 'draft', others }).filter(result => result.rule === 'crossrefs-reverse');

  assert.deepEqual(
    results.map(result => `${result.level} ${result.message.slice(0, 7)}`),
    ['defect A239273', 'advice A000012'],
  );
});

test('a triangle cut inside a row is a defect and a further whole row is advice', () => {
  const levels = expect =>
    CASES.filter(item => item.rule === 'data-rows' && (item.expect ?? '') === expect).flatMap(item =>
      lintEntry(entryText(item.entry, item.before), caseOptions(item))
        .filter(result => result.rule === 'data-rows')
        .map(result => result.level),
    );

  assert.deepEqual(levels(''), ['defect']);
  assert.deepEqual(levels('Row 4 still fits'), ['advice']);
});

test('DATA takes the next term at 290 characters with spaces and not at 291', () => {
  const fill = first => {
    const terms = [first, ...Array.from({ length: 24 }, () => '1234567890')];
    const text = entryText('A999990', [['S', terms.slice(0, -1).join(',')], ['O', '0,1']]);

    return lintEntry(text, { entry: 'A999990', notes: NOTES, bFile: terms.map((term, index) => [String(index), term]) }).filter(result => result.rule === 'data-fill');
  };

  assert.match(fill('12')[0]?.message ?? '', /still fits \(290\)/);
  assert.deepEqual(fill('123'), []);
});

test('two names before a link give a note, since the second can be a title', () => {
  const text = '%H A004003 Laura Florescu, Domino Tilings, <a href="https://doi.org/10.37236/1314">A constructed title</a>, 2015.\n';
  const results = lintEntry(text, { entry: 'A004003', notes: NOTES }).filter(result => result.rule === 'links-authors');

  assert.deepEqual(
    results.map(result => result.level),
    ['note'],
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

test('a space that the diff of a changed signature shows twice is read once', () => {
  const page = cell =>
    `All edits since published version <div class=sectname>PROG</div> <div class=sectbody><p class="diffs"><tt>${cell}</tt></p></div>`;
  const a239273 = '(PARI) a(n) = 1; \\\\ T(h, w) defined in A239264. - _Dawid <del>Rylko</del><del>_</del><del>, </del><del> </del><ins>Ryłko</ins><ins>_</ins><ins>, </ins><ins> </ins>Oct 15 2026';
  const a004003 = '(PARI) a(n) = 1; \\\\ _Dawid <del>Rylko</del><del>_</del><del>,</del><del> </del><ins>Ryłko</ins><ins>_</ins><ins>,</ins><ins> </ins>Oct 15 2026';

  assert.equal(parseDraftPage(page(a239273), 'A239273'), '%o A239273 (PARI) a(n) = 1; \\\\ T(h, w) defined in A239264. - _Dawid Ryłko_, Oct 15 2026\n');
  assert.equal(parseDraftPage(page(a004003), 'A004003'), '%o A004003 (PARI) a(n) = 1; \\\\ _Dawid Ryłko_, Oct 15 2026\n');
  assert.equal(parseDraftPage(page('a(n) = 1;  \\\\ two spaces kept'), 'A000001'), '%o A000001 a(n) = 1;  \\\\ two spaces kept\n');
  assert.equal(parseDraftPage(page('a(n) = 1;<ins> </ins><del>x</del><ins> </ins>b'), 'A000001'), '%o A000001 a(n) = 1;  b\n');
  assert.equal(parseDraftPage(page('a(n) = 1;<ins> </ins><br><ins> </ins>b'), 'A000001'), '%o A000001 a(n) = 1; \n%o A000001  b\n');
});

test('a no-break space of the draft page becomes a space', () => {
  assert.equal(decodeHtml('Number&#160;of&#xA0;tilings&nbsp;of a 2n&#160;X&#160;2n grid.'), 'Number of tilings of a 2n X 2n grid.');
  assert.equal(decodeHtml('&#8212;&amp;&lt;'), '\u2014&<');
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
  const single = run(['A402163']);
  const rules = run(['--rules']);
  const draft = run(['--draft', 'A402163', DRAFT_PAGE]);
  const printed = run(['--draft', 'A402163', DRAFT_PAGE, '--print']);
  const file = run(['--file', path.join(ROOT_DIRECTORY, 'oeis', 'A401988', 'A401988.txt')]);

  assert.equal(repository.status, 0, repository.stdout + repository.stderr);
  assert.doesNotMatch(repository.stdout, / defect /);
  assert.match(repository.stdout, /^0 defect\(s\), \d+ advice, 0 note\(s\), \d+ accepted, against \d+ rules\.$/m);
  assert.equal(single.status, 0, single.stdout + single.stderr);
  assert.doesNotMatch(single.stdout, /^A(?!402163)\d{6} /m);
  assert.equal(rules.status, 0);
  assert.equal(rules.stdout.split('\n').filter(line => /^[a-z-]+ \(/.test(line)).length, RULES.length);
  assert.equal(draft.status, 0, draft.stdout + draft.stderr);
  assert.match(draft.stdout, /advice \[program-shared\]/);
  assert.match(draft.stdout, /advice \[links-mathworld\]/);
  assert.doesNotMatch(draft.stdout, /\[keyword-system\]/);
  assert.doesNotMatch(draft.stdout, /No b-file/);
  assert.match(printed.stdout, /^%K A402163 nonn$/m);
  assert.doesNotMatch(printed.stdout, /changed/);
  assert.deepEqual(
    printed.stdout.trimEnd().split('\n').filter(line => !/^%[A-Za-z] A402163 /.test(line)),
    [],
  );
  assert.match(printed.stderr, /^0 defect\(s\), \d+ advice, /m);
  assert.equal(file.status, 1, file.stdout + file.stderr);
  assert.match(file.stdout, /defect \[comment-provenance\]/);
});

test('the command line refuses an unknown entry, a missing file, a bad argument and --related without a path', () => {
  const run = args => spawnSync(process.execPath, [path.join(ROOT_DIRECTORY, 'oeis', 'editorRules.js'), ...args], { encoding: 'utf-8' });
  const unknown = run(['A999999']);
  const missing = run(['--file', path.join(ROOT_DIRECTORY, 'oeis', 'A999999', 'A999999.txt')]);
  const page = run(['--draft', 'A402163', path.join(ROOT_DIRECTORY, 'oeis', 'missing.html')]);
  const bad = run(['--fix']);
  const related = run(['--draft', 'A402163', DRAFT_PAGE, '--related']);

  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /No entry A999999 in oeis\//);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /ENOENT/);
  assert.equal(page.status, 2);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /Usage:/);
  assert.equal(related.status, 2);
  assert.match(related.stderr, /--related needs the path/);
});

test('a draft without a b-file says that DATA was checked alone', () => {
  const html = fs.readFileSync(DRAFT_PAGE, 'utf-8').replaceAll('402163', '999998');
  const result = spawnSync(process.execPath, [path.join(ROOT_DIRECTORY, 'oeis', 'editorRules.js'), '--draft', 'A999998', '-'], { encoding: 'utf-8', input: html });

  assert.match(result.stdout, /^No b-file for A999998: /m);
});
