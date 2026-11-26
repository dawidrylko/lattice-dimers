const path = require('path');

const COUNTS = 'The counts';
const SOLVER_SECTION = /^The \w+ solver$/;
const CHECKED_AGAINST = /(['"`])checked against\1/g;
const TABLE_CALL = /\btable\(\s*\[/g;
const DIGITS = /(['"`])digits\1/;

function readSections(text) {
  const sections = [];

  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      sections.push({ title: line.slice(3), body: '' });
    } else if (sections.length) {
      sections.at(-1).body += `${line}\n`;
    }
  }

  return sections;
}

function count(text, pattern) {
  return (text.match(pattern) || []).length;
}

function checkContent(file, text) {
  const sections = readSections(text);
  const name = path.basename(file);
  const problems = [];

  for (const { title, body } of sections.filter(({ title }) => SOLVER_SECTION.test(title))) {
    if (!/^```math$/m.test(body)) {
      problems.push(`${file}: ${title} sets no formula of its solver as a math block.`);
    }
  }

  const counts = sections.find(({ title }) => title === COUNTS);

  if (!counts) {
    return [...problems, `${file} has no section ${COUNTS}.`];
  }

  const cells = [...counts.body.matchAll(/^```js run\n([\s\S]*?)^```$/gm)]
    .map(([, code]) => code)
    .join('\n')
    .replace(/^\s*\/\/.*$/gm, '');

  if (!/\bchart\(\{/.test(cells)) {
    problems.push(`${file}: ${COUNTS} draws no chart.`);
  }

  const tables = count(cells, TABLE_CALL);

  if (!tables) {
    problems.push(`${file}: ${COUNTS} has no result table.`);
  } else if (count(cells, CHECKED_AGAINST) < tables) {
    problems.push(`${file}: ${COUNTS} has ${tables} tables and ${count(cells, CHECKED_AGAINST)} columns 'checked against'.`);
  }

  if (/-by-diagonal-pieces\.md$/.test(name)) {
    if (!cells.includes('The first rows')) {
      problems.push(`${file}: ${COUNTS} prints no full rows of the first boards.`);
    }

    return problems;
  }

  if (!DIGITS.test(cells)) {
    problems.push(`${file}: ${COUNTS} has no table of one row per board with the digits of its count.`);
  }

  if (/-rectangles\.md$/.test(name) && !cells.includes("'h \\\\ w'")) {
    problems.push(`${file}: ${COUNTS} has no h × w table of the rectangles.`);
  } else if (/-cylinders\.md$/.test(name) && !cells.includes("'w \\\\ h'")) {
    problems.push(`${file}: ${COUNTS} has no w × h table of the cylinders.`);
  }

  return problems;
}

module.exports = { checkContent };
