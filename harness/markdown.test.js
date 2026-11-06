const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const GITHUB_DISALLOWED_MACROS = ['operatorname', 'DeclareMathOperator', 'newcommand', 'renewcommand', 'def'];

function listMarkdownFiles() {
  const { stdout, stderr, status, error } = spawnSync('git', ['ls-files', '*.md'], { cwd: ROOT_DIRECTORY, encoding: 'utf-8' });

  if (error || status !== 0) {
    throw error || new Error(`git ls-files failed: ${stderr.trim()}`);
  }

  return stdout.split('\n').filter(file => file && fs.existsSync(path.join(ROOT_DIRECTORY, file)));
}

function readProse(file) {
  return fs
    .readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
}

function listDefinitions(prose) {
  return new Map(
    [...prose.matchAll(/^ {0,3}\[(?!\^)([^\]\n]+)\]:[ \t]*<?([^\s>]+)>?/gm)].map(([, label, target]) => [label.toLowerCase(), target]),
  );
}

function listReferenceLinks(prose) {
  const definitions = listDefinitions(prose);

  return [...prose.matchAll(/\[([^\]\n]*)\](?:\[([^\]\n]*)\]|(?![(\[:]))/g)]
    .map(([text, label, reference]) => ({ text, label, target: definitions.get((reference || label).toLowerCase()) }))
    .filter(({ target }) => target !== undefined);
}

function checkMathMacros(file) {
  const pattern = new RegExp(`\\\\(${GITHUB_DISALLOWED_MACROS.join('|')})(?![A-Za-z])`, 'g');

  return [...readProse(file).matchAll(pattern)].map(
    ([, macro]) => `${file} uses \\${macro}, which GitHub does not render in math; use \\mathrm or a plain symbol.`,
  );
}

function checkMathInLinks(file) {
  const prose = readProse(file);

  return [
    ...[...prose.matchAll(/\[([^\]\n]*\$[^\]\n]*)\]\([^)\s]+\)/g)].map(([, text]) => text),
    ...listReferenceLinks(prose)
      .filter(({ label }) => label.includes('$'))
      .map(({ label }) => label),
  ].map(text => `${file} has math in the link text "${text}", which GitHub shows as raw TeX; write it as plain text.`);
}

function checkMathRanges(file) {
  return [...readProse(file).matchAll(/\$([^$\n]+)\$/g)]
    .filter(([, math]) => math.includes('..'))
    .map(([, math]) => `${file} writes a range as ".." in the math "${math}", which GitHub renders with a gap; use \\dots.`);
}

function checkOeisLinks(file) {
  const prose = readProse(file);
  const references = listReferenceLinks(prose);
  const entryOf = target => (target.match(/^https:\/\/oeis\.org\/(?:draft\/)?(A\d{6})$/) ?? [])[1];
  const labels = [
    ...[...prose.matchAll(/\[([^\]\n]*)\]\(https:\/\/oeis\.org\/(?:draft\/)?(A\d{6})\)/g)].map(([link, label, entry]) => ({ link, label, entry })),
    ...references.filter(({ target }) => entryOf(target)).map(({ text, label, target }) => ({ link: text, label, entry: entryOf(target) })),
  ]
    .filter(({ label, entry }) => label !== `OEIS ${entry}`)
    .map(({ link, entry }) => `${file} links ${link}; a link to an OEIS entry reads [OEIS ${entry}](...).`);
  const outside = [
    ...[...prose.matchAll(/OEIS \[A\d{6}\](?:\([^)]*\)|\[[^\]\n]*\])|\[OEIS A\d{6}\]\((?!https:\/\/oeis\.org\/)[^)]*\)/g)].map(([link]) => link),
    ...references.filter(({ label, target }) => /^OEIS A\d{6}$/.test(label) && !target.startsWith('https://oeis.org/')).map(({ text }) => text),
  ].map(link => `${file} has ${link}; [OEIS A<n>] links to the entry on oeis.org, and the word OEIS belongs inside the link.`);

  return [...labels, ...outside];
}

function decodeTarget(target) {
  try {
    return decodeURIComponent(target.split('#')[0]);
  } catch {
    return null;
  }
}

function checkRelativeLinks(file) {
  const prose = readProse(file);

  return [...[...prose.matchAll(/\]\(([^)\s]+)\)/g)].map(([, target]) => target), ...listDefinitions(prose).values()]
    .filter(target => !/^([a-z]+:|#)/i.test(target))
    .filter(target => {
      const decoded = decodeTarget(target);

      return decoded === null || !fs.existsSync(path.join(ROOT_DIRECTORY, path.dirname(file), decoded));
    })
    .map(target => `${file} links to ${target}, which does not exist.`);
}

const files = listMarkdownFiles();

function runCheck(name, check) {
  test(`${files.length} Markdown files have no ${name}`, () => {
    assert.deepEqual(files.flatMap(check), []);
  });
}

runCheck('math macros GitHub does not render', checkMathMacros);
runCheck('math in link text', checkMathInLinks);
runCheck('ranges written as .. in math', checkMathRanges);
runCheck('relative links to missing files', checkRelativeLinks);
runCheck('links to OEIS entries that break the rules', checkOeisLinks);
