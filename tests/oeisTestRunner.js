const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const OEIS_DIRECTORY = path.join(ROOT_DIRECTORY, 'oeis');
const ENTRY_PATTERN = /^A\d{6}$/;
const ROOT_FILES = ['README.md', 'buildBFiles.js'];
const TABLE_HEADER = '| entry | sequence | entry text | b-file | PARI/GP |';
const NO_FILE = '—';
const SECTIONS = ['Contribution', 'Status', 'Files'];
const OPTIONAL_SECTIONS = ['Notes'];
const LINE_ORDER = 'ISTUNCDHFeptoYKOAE';
const MAX_TERM_DIGITS = 1000;
const TEXT_EXTENSIONS = ['.md', '.txt', '.js', '.json', '.html', '.tex', '.bib', '.cff'];
const SUBMITTED_DRAFTS = ['research/king-entropy/release/oeis-draft.txt'];

function listEntries() {
  return fs
    .readdirSync(OEIS_DIRECTORY)
    .filter(name => ENTRY_PATTERN.test(name))
    .sort();
}

function entryFiles(entry) {
  const number = entry.slice(1);

  return {
    text: `${entry}.txt`,
    bFile: `b${number}.txt`,
    program: `${entry}.gp`,
  };
}

function exists(entry, name) {
  return fs.existsSync(path.join(OEIS_DIRECTORY, entry, name));
}

function read(entry, name) {
  return fs.readFileSync(path.join(OEIS_DIRECTORY, entry, name), 'utf-8');
}

function entryUrl(entry, proposed) {
  return proposed ? `https://oeis.org/draft/${entry}` : `https://oeis.org/${entry}`;
}

function readTable() {
  const lines = fs.readFileSync(path.join(OEIS_DIRECTORY, 'README.md'), 'utf-8').split('\n');
  const header = lines.indexOf(TABLE_HEADER);

  if (header === -1) {
    return null;
  }

  const rows = [];

  for (let index = header + 2; index < lines.length && lines[index].startsWith('|'); index++) {
    rows.push(
      lines[index]
        .slice(1, -1)
        .split(' | ')
        .map(cell => cell.trim()),
    );
  }

  return rows;
}

function parseEntryText(entry) {
  return read(entry, entryFiles(entry).text)
    .replace(/\n$/, '')
    .split('\n')
    .map(line => {
      const match = line.match(/^%(\w) (A\d{6})(?: (.*))?$/);

      return match ? { type: match[1], entry: match[2], value: match[3] ?? '', line } : { line };
    });
}

function readBFile(entry) {
  return read(entry, entryFiles(entry).bFile)
    .replace(/\n$/, '')
    .split('\n')
    .map(line => line.split(' '));
}

function readStatus(entry) {
  const match = read(entry, 'README.md').match(/## Status\n\n(.*)\n/);

  return match ? match[1].match(/^(Approved|Proposed) (\d{1,2} [A-Z][a-z]+ \d{4}), revision #(\d+)( of the draft)?\.$/) : null;
}

function checkLayout() {
  const errors = [];

  for (const name of fs.readdirSync(OEIS_DIRECTORY).filter(name => !name.startsWith('.'))) {
    if (!ROOT_FILES.includes(name) && !ENTRY_PATTERN.test(name)) {
      errors.push(`oeis/${name} is neither an entry directory A<6 digits> nor one of ${ROOT_FILES.join(', ')}.`);
    }
  }

  for (const entry of listEntries()) {
    const { text, bFile, program } = entryFiles(entry);
    const allowed = ['README.md', text, bFile, program];

    for (const name of fs.readdirSync(path.join(OEIS_DIRECTORY, entry)).filter(name => !name.startsWith('.'))) {
      if (!allowed.includes(name)) {
        errors.push(`oeis/${entry}/${name} is not one of ${allowed.join(', ')}.`);
      }
    }

    for (const name of ['README.md', text]) {
      if (!exists(entry, name)) {
        errors.push(`oeis/${entry}/${name} is missing.`);
      }
    }
  }

  return errors;
}

function checkTable() {
  const rows = readTable();

  if (!rows) {
    return [`oeis/README.md has no table with the header ${TABLE_HEADER}.`];
  }

  const errors = [];
  const entries = listEntries();
  const listed = rows.map(([cell]) => (cell.match(/^\[(A\d{6})\]/) ?? [])[1]);

  if (listed.join(',') !== entries.join(',')) {
    errors.push(`The table lists ${listed.join(', ')} instead of the directories ${entries.join(', ')}, in that order.`);
  }

  for (const [entryCell, sequenceCell, textCell, bFileCell, programCell, ...rest] of rows) {
    const entry = (entryCell.match(/^\[(A\d{6})\]/) ?? [])[1];

    if (!entries.includes(entry)) {
      continue;
    }

    if (rest.length > 0 || programCell === undefined) {
      errors.push(`The row of ${entry} must have five cells.`);
      continue;
    }

    const status = readStatus(entry);
    const { text, bFile, program } = entryFiles(entry);
    const expected = [
      `[${entry}](${entryUrl(entry, status?.[1] === 'Proposed')})`,
      null,
      `[${text}](${entry}/${text})`,
      exists(entry, bFile) ? `[${bFile}](${entry}/${bFile})` : NO_FILE,
      exists(entry, program) ? `[${program}](${entry}/${program})` : NO_FILE,
    ];

    [entryCell, sequenceCell, textCell, bFileCell, programCell].forEach((cell, index) => {
      if (expected[index] !== null && cell !== expected[index]) {
        errors.push(`The row of ${entry} has ${cell} where ${expected[index]} belongs.`);
      }
    });

    if (!new RegExp(`^\\[[^\\]]+\\]\\(${entry}/\\)$`).test(sequenceCell)) {
      errors.push(`The sequence of ${entry} must link to its directory ${entry}/.`);
    }
  }

  return errors;
}

function readFilesSection(lines) {
  const start = lines.indexOf('## Files');
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));

  return lines
    .slice(start + 1, end === -1 ? lines.length : end)
    .map(line => (line.match(/^\| \[([^\]]+)\]\(([^)]+)\) \| ./) ?? []).slice(1))
    .filter(match => match.length > 0);
}

function checkEntryReadme(entry) {
  const errors = [];
  const lines = read(entry, 'README.md').split('\n');
  const status = readStatus(entry);
  const proposed = status?.[1] === 'Proposed';
  const sections = lines.filter(line => line.startsWith('## ')).map(line => line.slice(3));
  const expectedSections = [...SECTIONS, ...OPTIONAL_SECTIONS.filter(section => sections.includes(section))];
  const revision = (read(entry, entryFiles(entry).text).match(/^%I A\d{6}(?: [MN]\d{4})* #(\d+) /) ?? [])[1];

  if (lines[0] !== `# ${entry}`) {
    errors.push(`oeis/${entry}/README.md must start with the heading # ${entry}.`);
  }

  if (!lines[2]?.startsWith(`[${entry}](${entryUrl(entry, proposed)}): `)) {
    errors.push(`oeis/${entry}/README.md must open with [${entry}](${entryUrl(entry, proposed)}): and the name.`);
  }

  if (sections.join(',') !== expectedSections.join(',')) {
    errors.push(`oeis/${entry}/README.md has the sections ${sections.join(', ')} instead of ${expectedSections.join(', ')}.`);
  }

  if (!lines.join('\n').includes('## Contribution\n\n- ')) {
    errors.push(`The contribution of ${entry} must be a list.`);
  }

  if (!status) {
    errors.push(`The status of ${entry} must read "Approved|Proposed <day> <Month> <year>, revision #<n>[ of the draft]."`);
  } else {
    if (Boolean(status[4]) !== proposed) {
      errors.push(`The status of ${entry} says "of the draft" exactly when it is proposed.`);
    }

    if (status[3] !== revision) {
      errors.push(`The status of ${entry} names revision #${status[3]}, the %I line of ${entry}.txt #${revision}.`);
    }

    if (Number.isNaN(Date.parse(status[2]))) {
      errors.push(`The status of ${entry} has no valid date: ${status[2]}.`);
    }
  }

  const { text, bFile, program } = entryFiles(entry);
  const files = [text, bFile, program].filter(name => exists(entry, name));
  const listed = readFilesSection(lines);

  if (listed.map(([name]) => name).join(',') !== files.join(',')) {
    errors.push(`The files of ${entry} list ${listed.map(([name]) => name).join(', ')} instead of ${files.join(', ')}.`);
  }

  for (const [name, link] of listed) {
    if (name !== link) {
      errors.push(`The file ${name} of ${entry} links to ${link}.`);
    }
  }

  return errors;
}

function checkEntryText(entry) {
  const errors = [];
  const { text, bFile, program } = entryFiles(entry);
  const content = read(entry, text);
  const lines = parseEntryText(entry);
  const first = lines[0];

  if (!content.endsWith('\n') || content.endsWith('\n\n')) {
    errors.push(`${text} must end with exactly one newline.`);
  }

  if (first?.type !== 'I' || !/^(?:[MN]\d{4} )*#\d+ [A-Z][a-z]{2} \d{2} \d{4} \d{2}:\d{2}:\d{2}$/.test(first.value)) {
    errors.push(`${text} must start with a %I line: %I ${entry} [M....] #<revision> <Mon dd yyyy hh:mm:ss>.`);
  }

  let order = 0;

  for (const { type, entry: lineEntry, value, line } of lines) {
    if (!type || !LINE_ORDER.includes(type)) {
      errors.push(`${text} has a line that is not %<${LINE_ORDER}> A<number>: ${line}`);
      continue;
    }

    if (lineEntry !== entry) {
      errors.push(`${text} has a line of ${lineEntry}: ${line}`);
    }

    if (value !== value.trimEnd() || line.includes('\t')) {
      errors.push(`${text} has a line with stray whitespace: ${line}`);
    }

    if (LINE_ORDER.indexOf(type) < order) {
      errors.push(`${text} has %${type} after %${LINE_ORDER[order]}; the order is ${LINE_ORDER.split('').join(' ')}.`);
    }

    order = Math.max(order, LINE_ORDER.indexOf(type));
  }

  const values = type => lines.filter(line => line.type === type).map(line => line.value);
  const data = ['S', 'T', 'U'].flatMap(values).join('');

  if (data !== '') {
    for (const type of ['N', 'K', 'O', 'A']) {
      if (values(type).length !== 1) {
        errors.push(`${text} is a full entry and needs exactly one %${type} line.`);
      }
    }

    if (!/^-?\d+(,-?\d+)*$/.test(data)) {
      errors.push(`The data of ${text} are not a list of integers.`);
    }

    if (!/^-?\d+,\d+$/.test(values('O')[0] ?? '')) {
      errors.push(`The %O line of ${text} must be <offset>,<position>.`);
    }

    if (!/^[a-z]+(,[a-z]+)*$/.test(values('K')[0] ?? '')) {
      errors.push(`The %K line of ${text} must be a list of keywords.`);
    }

    if (!/^_[^_]+_, [A-Z][a-z]{2} \d{2} \d{4}$/.test(values('A')[0] ?? '')) {
      errors.push(`The %A line of ${text} must be _<Name>_, <Mon dd yyyy>.`);
    }

    if (exists(entry, bFile)) {
      const terms = readBFile(entry);
      const offset = (values('O')[0] ?? '').split(',')[0];
      const expected = data.split(',');

      if (terms[0]?.[0] !== offset) {
        errors.push(`${bFile} starts at n = ${terms[0]?.[0]}, the offset of ${text} is ${offset}.`);
      }

      if (
        terms
          .slice(0, expected.length)
          .map(([, term]) => term)
          .join(',') !== expected.join(',')
      ) {
        errors.push(`The first terms of ${bFile} differ from the data of ${text}.`);
      }
    }
  }

  for (const value of values('H')) {
    if (!new RegExp(`/${entry}/b${entry.slice(1)}(?:_\\d+)?\\.txt`).test(value)) {
      continue;
    }

    if (!exists(entry, bFile)) {
      errors.push(`${text} links to a b-file, and oeis/${entry} has no ${bFile}.`);
      continue;
    }

    const range = value.match(/Table of n, a\(n\) for n = (-?\d+)\.\.(-?\d+)/);
    const terms = readBFile(entry);

    if (range && (range[1] !== terms[0][0] || range[2] !== terms[terms.length - 1][0])) {
      errors.push(`${text} gives the b-file range ${range[1]}..${range[2]}, ${bFile} holds ${terms[0][0]}..${terms[terms.length - 1][0]}.`);
    }
  }

  if (values('o').some(value => value.startsWith('(PARI) ')) !== exists(entry, program)) {
    errors.push(`oeis/${entry} must have ${program} exactly when ${text} has a PARI program.`);
  }

  return errors;
}

function checkBFile(entry) {
  const { bFile } = entryFiles(entry);

  if (!exists(entry, bFile)) {
    return [];
  }

  const errors = [];
  const content = read(entry, bFile);

  if (!content.endsWith('\n') || content.endsWith('\n\n')) {
    errors.push(`${bFile} must end with exactly one newline.`);
  }

  content
    .replace(/\n$/, '')
    .split('\n')
    .forEach((line, index, lines) => {
      const match = line.match(/^(-?\d+) (-?\d+)$/);

      if (!match) {
        errors.push(`Line ${index + 1} of ${bFile} is not "n a(n)": ${line.slice(0, 80)}`);

        return;
      }

      if (index > 0 && Number(match[1]) !== Number(lines[index - 1].split(' ')[0]) + 1) {
        errors.push(`Line ${index + 1} of ${bFile} has n = ${match[1]} after n = ${lines[index - 1].split(' ')[0]}.`);
      }

      if (match[2].replace('-', '').length > MAX_TERM_DIGITS) {
        errors.push(`Line ${index + 1} of ${bFile} has a term of more than ${MAX_TERM_DIGITS} digits.`);
      }
    });

  return errors;
}

function checkProgram(entry) {
  const { program } = entryFiles(entry);

  if (!exists(entry, program)) {
    return [];
  }

  const comments = read(entry, program)
    .split('\n')
    .filter(line => line.startsWith('\\\\'));

  return comments.some(line => line.includes(`OEIS ${entry}`)) ? [] : [`The comments of ${program} must name OEIS ${entry}.`];
}

function checkDraftLinks() {
  const approved = listEntries().filter(entry => readStatus(entry)?.[1] === 'Approved');
  const { stdout, error } = spawnSync('git', ['ls-files'], { cwd: ROOT_DIRECTORY, encoding: 'utf-8' });

  if (error) {
    return [`git ls-files failed: ${error.message}`];
  }

  const errors = [];

  const files = stdout
    .split('\n')
    .filter(name => TEXT_EXTENSIONS.includes(path.extname(name)) && !SUBMITTED_DRAFTS.includes(name))
    .filter(name => fs.existsSync(path.join(ROOT_DIRECTORY, name)));

  for (const file of files) {
    const content = fs.readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8');

    for (const entry of approved) {
      if (content.includes(`oeis.org/draft/${entry}`)) {
        errors.push(`${file} links to the draft of ${entry}, which is approved.`);
      }
    }
  }

  return errors;
}

function runCheck(name, check) {
  process.stdout.write(`Checking ${name}... `);
  const errors = check();

  if (errors.length > 0) {
    console.error(`Failed!\n${errors.map(error => `  ${error}`).join('\n')}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function __main__() {
  const checks = [
    ['the layout of oeis/', checkLayout],
    ['the table of oeis/README.md', checkTable],
    ...listEntries().flatMap(entry => {
      const { text, bFile, program } = entryFiles(entry);

      return [
        [`oeis/${entry}/README.md`, () => checkEntryReadme(entry)],
        [`oeis/${entry}/${text}`, () => checkEntryText(entry)],
        ...(exists(entry, bFile) ? [[`oeis/${entry}/${bFile}`, () => checkBFile(entry)]] : []),
        ...(exists(entry, program) ? [[`oeis/${entry}/${program}`, () => checkProgram(entry)]] : []),
      ];
    }),
    ['links to the drafts of approved entries', checkDraftLinks],
  ];
  const passed = checks.map(([name, check]) => runCheck(name, check)).every(Boolean);

  if (passed) {
    console.log('All OEIS tests completed successfully.');
    process.exit(0);
  }

  console.error('Some OEIS tests failed.');
  process.exit(1);
}

__main__();
