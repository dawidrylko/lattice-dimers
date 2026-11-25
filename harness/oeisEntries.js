const fs = require('fs');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const NOTES_DIRECTORY = path.join(ROOT_DIRECTORY, 'notes');
const SECTION = 'The OEIS entries';
const ENTRY_LINE = /^- \[OEIS (A\d{6})\]\(https:\/\/oeis\.org\/(draft\/)?(A\d{6})\): \S.*\.$/;
const NO_ENTRY = /has no entry for these counts\.|is not in the OEIS\./;
const OEIS_ITEM = /^\d+\. OEIS Foundation Inc\. The On-Line Encyclopedia of Integer Sequences, /;

function listNotebooks() {
  return fs
    .readdirSync(NOTES_DIRECTORY, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry =>
      fs
        .readdirSync(path.join(NOTES_DIRECTORY, entry.name))
        .filter(name => /^\d{2}-.+\.md$/.test(name))
        .map(name => path.join('notes', entry.name, name)),
    )
    .sort();
}

function readSections(text) {
  const sections = [];

  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      sections.push({ title: line.slice(3), lines: [] });
    } else if (sections.length) {
      sections.at(-1).lines.push(line);
    }
  }

  return sections;
}

function checkNotebook(file, text) {
  const sections = readSections(text);
  const place = sections.findIndex(section => section.title === SECTION);

  if (place < 0 || sections[place + 1]?.title !== 'References') {
    return [`${file} has no section "${SECTION}" just above References.`];
  }

  const problems = [];
  const lines = sections[place].lines;
  const listed = lines.filter(line => line.startsWith('- '));
  const listedEntries = [];

  for (const line of listed) {
    const match = line.match(ENTRY_LINE);

    if (!match || match[1] !== match[3]) {
      problems.push(`${file} has the entry line "${line.slice(0, 80)}", which is not one OEIS link followed by what it counts.`);
    } else if (!match[2]) {
      listedEntries.push(match[1]);
    }
  }

  if (!listed.length && !lines.some(line => NO_ENTRY.test(line))) {
    problems.push(`${file} lists no OEIS entry and does not say that the OEIS has none.`);
  }

  const item = sections[place + 1].lines.find(line => OEIS_ITEM.test(line)) || '';
  const cited = item.match(/A\d{6}(?=\]\()/g) || [];
  const missing = listedEntries.filter(entry => !cited.includes(entry));
  const unlisted = cited.filter(entry => !listedEntries.includes(entry));

  if (missing.length) {
    problems.push(`${file} lists ${missing.join(', ')} under ${SECTION} but not in its OEIS reference.`);
  }

  if (unlisted.length) {
    problems.push(`${file} cites ${unlisted.join(', ')} in its OEIS reference but does not list it under ${SECTION}.`);
  }

  return problems;
}

module.exports = { checkNotebook, listNotebooks, ROOT_DIRECTORY };
