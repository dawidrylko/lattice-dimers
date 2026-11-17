const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const { splitDefinitions } = require('../oeis/editorRules');
const { GATE_STEP, readGateInputs, readGateScript, runGateScript } = require('./workflow');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const OEIS_DIRECTORY = path.join(ROOT_DIRECTORY, 'oeis');
const ENTRY_PATTERN = /^A\d{6}$/;
const ROOT_FILES = ['README.md', 'buildBFiles.js', 'editorRules.js'];
const TABLE_HEADER = '| entry | sequence | entry text | b-file | PARI/GP |';
const NO_FILE = '—';
const SECTIONS = ['Contribution', 'Status', 'Files'];
const OPTIONAL_SECTIONS = ['Notes'];
const LINE_ORDER = 'ISTUNCDHFeptoYKOAE';
const MAX_TERM_DIGITS = 1000;
const TEXT_EXTENSIONS = ['.md', '.txt', '.js', '.json', '.html', '.tex', '.bib', '.cff'];
const SUBMITTED_DRAFTS = ['research/king-entropy/release/oeis-draft.txt'];
const GENERATOR_LANGUAGES = ['rs', 'py', 'js'];
const GENERATOR_LIMITS = JSON.parse(fs.readFileSync(path.join(ROOT_DIRECTORY, 'spec', 'limits.json'), 'utf-8')).generators;

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
    generators: GENERATOR_LANGUAGES.map(language => `b${number}.${language}`),
    generator: `b${number}.js`,
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
    const { text, bFile, program, generators } = entryFiles(entry);
    const allowed = ['README.md', text, bFile, program, ...generators];
    const present = generators.filter(name => exists(entry, name));

    for (const name of fs.readdirSync(path.join(OEIS_DIRECTORY, entry)).filter(name => !name.startsWith('.'))) {
      if (!allowed.includes(name)) {
        errors.push(`oeis/${entry}/${name} is not one of ${allowed.join(', ')}.`);
      }
    }

    if (present.length > 0 && present.length < generators.length) {
      errors.push(`oeis/${entry} has the generators ${present.join(', ')}; a generator comes in all three languages, ${generators.join(', ')}.`);
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
  const listed = rows.map(([cell]) => (cell.match(/^\[OEIS (A\d{6})\]/) ?? [])[1]);

  if (listed.join(',') !== entries.join(',')) {
    errors.push(`The table lists ${listed.join(', ')} instead of the directories ${entries.join(', ')}, in that order.`);
  }

  for (const [entryCell, sequenceCell, textCell, bFileCell, programCell, ...rest] of rows) {
    const entry = (entryCell.match(/^\[OEIS (A\d{6})\]/) ?? [])[1];

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
      `[OEIS ${entry}](${entryUrl(entry, status?.[1] === 'Proposed')})`,
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

  if (!lines[2]?.startsWith(`[OEIS ${entry}](${entryUrl(entry, proposed)}): `)) {
    errors.push(`oeis/${entry}/README.md must open with [OEIS ${entry}](${entryUrl(entry, proposed)}): and the name.`);
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

  const { text, bFile, program, generators } = entryFiles(entry);
  const files = [text, bFile, program, ...generators].filter(name => exists(entry, name));
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

  const errors = [];
  const comments = read(entry, program)
    .split('\n')
    .filter(line => line.startsWith('\\\\'));

  if (!comments.some(line => line.includes(`OEIS ${entry}`))) {
    errors.push(`The comments of ${program} must name OEIS ${entry}.`);
  }

  const lines = parseEntryText(entry)
    .filter(line => line.type === 'o')
    .map(line => line.value);
  const start = lines.findIndex(line => line.startsWith('(PARI) '));
  const end = lines.findIndex((line, index) => index > start && /^\([A-Za-z]/.test(line));
  const entryProgram = lines
    .slice(start, end === -1 ? lines.length : end)
    .join('\n')
    .replace(/^\(PARI\) /, '');
  const definitions = splitDefinitions(read(entry, program));

  for (const definition of splitDefinitions(entryProgram)) {
    if (!definitions.includes(definition)) {
      errors.push(`${program} lacks the definition ${definition.slice(0, 60)}... of the PARI program in ${entryFiles(entry).text}.`);
    }
  }

  return errors;
}

function checkBFileFacts(entry) {
  const { text, bFile } = entryFiles(entry);
  const errors = [];
  const terms = readBFile(entry);
  const first = terms[0][0];
  const last = terms[terms.length - 1][0];
  const row = read(entry, 'README.md')
    .split('\n')
    .find(line => line.startsWith(`| [${bFile}](${bFile}) | `));
  const description = row?.split(' | ')[1] ?? '';
  const ranges = parseEntryText(entry)
    .filter(line => line.type === 'H' && line.value.includes(`/${entry}/b${entry.slice(1)}`))
    .map(line => line.value.match(/(Antidiagonals|Rows) n = (\d+)\.\.(\d+)/))
    .filter(Boolean);
  const count = description.match(/(\d+) terms/);
  const indices = description.match(/^\$n = (-?\d+), \\dots, (-?\d+)\$/);
  const blocks = description.match(/^(antidiagonals|rows) (\d+)\.\.(\d+)/);

  if (!count && !indices) {
    errors.push(`The ${bFile} row of oeis/${entry}/README.md must give $n = a, \\dots, b$ or the number of terms.`);
  }

  if (count && Number(count[1]) !== terms.length) {
    errors.push(`oeis/${entry}/README.md says ${count[1]} terms, ${bFile} has ${terms.length}.`);
  }

  if (indices && (indices[1] !== first || indices[2] !== last)) {
    errors.push(`oeis/${entry}/README.md says n = ${indices[1]}..${indices[2]}, ${bFile} holds ${first}..${last}.`);
  }

  for (const [, kind, from, to] of ranges) {
    if (!blocks || blocks[1] !== kind.toLowerCase() || blocks[2] !== from || blocks[3] !== to) {
      errors.push(`${text} describes the b-file as ${kind.toLowerCase()} ${from}..${to}, oeis/${entry}/README.md does not.`);
    }

    if (kind === 'Antidiagonals' && ((Number(to) + 1) * (Number(to) + 2)) / 2 !== terms.length) {
      errors.push(`Antidiagonals ${from}..${to} hold ${((Number(to) + 1) * (Number(to) + 2)) / 2} terms, ${bFile} has ${terms.length}.`);
    }
  }

  return errors;
}

function checkDraftLinks() {
  const approved = listEntries().filter(entry => readStatus(entry)?.[1] === 'Approved');
  const proposed = listEntries().filter(entry => readStatus(entry)?.[1] === 'Proposed');
  const { stdout, stderr, status, error } = spawnSync('git', ['ls-files'], { cwd: ROOT_DIRECTORY, encoding: 'utf-8' });

  if (error || status !== 0) {
    return [`git ls-files failed: ${error ? error.message : stderr.trim()}`];
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

    for (const entry of proposed) {
      if (new RegExp(`oeis\\.org/${entry}(?!/)`).test(content)) {
        errors.push(`${file} links to the page of ${entry}, which is still a draft at oeis.org/draft/${entry}.`);
      }
    }
  }

  return errors;
}

const REJECTED_RANGES = [[], ['1'], ['3', '2'], ['x', '2'], ['+1', '2'], ['0', '1', '2']];
const GENERATOR_SETUP = [
  'spec/limits.json',
  'rust/Cargo.toml',
  'rust/Cargo.lock',
  'rust/tests/generators.rs',
  'python/pyproject.toml',
  'python/tests/test_generators.py',
  'js/package.json',
  'js/.nvmrc',
  'harness/oeis.test.js',
  '.github/workflows/ci.yml',
];
const SKIP_GENERATORS = process.env.GENERATOR_CHECKS === 'skip';

function readBFileLines(entry) {
  return read(entry, entryFiles(entry).bFile).replace(/\n$/, '').split('\n');
}

function listGeneratorEntries() {
  return listEntries().filter(entry => entryFiles(entry).generators.every(name => exists(entry, name)));
}

function checkGeneratorWiring() {
  const errors = [];
  const entries = listGeneratorEntries();
  const cargo = fs.readFileSync(path.join(ROOT_DIRECTORY, 'rust', 'Cargo.toml'), 'utf-8');
  const rustTest = fs.readFileSync(path.join(ROOT_DIRECTORY, 'rust', 'tests', 'generators.rs'), 'utf-8');
  const limited = Object.keys(GENERATOR_LIMITS ?? {});

  if (limited.join(',') !== entries.join(',')) {
    errors.push(`The generators of spec/limits.json are ${limited.join(', ')} instead of ${entries.join(', ')}.`);
  }

  for (const entry of entries) {
    const number = entry.slice(1);
    const lastIndex = readBFileLines(entry).length - 1;
    const limits = GENERATOR_LIMITS?.[entry] ?? {};
    const valid = Object.values(limits).every(last => Number.isInteger(last) && last >= 0 && last <= lastIndex);

    if (Object.keys(limits).join(',') !== GENERATOR_LANGUAGES.join(',') || !valid) {
      errors.push(`spec/limits.json must give ${entry} a last term from 0 to ${lastIndex} for each of ${GENERATOR_LANGUAGES.join(', ')}.`);
    }

    if (!cargo.includes(`[[bin]]\nname = "b${number}"\npath = "../oeis/${entry}/b${number}.rs"\n`)) {
      errors.push(`rust/Cargo.toml has no [[bin]] b${number} with the path ../oeis/${entry}/b${number}.rs.`);
    }

    if (!rustTest.includes(`check("${entry}", env!("CARGO_BIN_EXE_b${number}"))`)) {
      errors.push(`rust/tests/generators.rs does not check b${number}.`);
    }
  }

  return errors;
}

function resolvePythonImport(file, dots, name) {
  const base = dots ? path.join(path.dirname(file), ...Array(dots.length - 1).fill('..')) : 'python';
  const target = path.join(base, ...name.split('.').filter(Boolean));

  return fs.existsSync(path.join(ROOT_DIRECTORY, target)) ? path.join(target, '__init__.py') : `${target}.py`;
}

function followImports(start, importsOf) {
  const files = new Set([start]);
  const pending = [start];

  while (pending.length > 0) {
    const file = pending.pop();

    for (const imported of importsOf(file, fs.readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8'))) {
      if (!files.has(imported)) {
        files.add(imported);
        pending.push(imported);
      }
    }
  }

  return [...files];
}

function listGeneratorInputs(entry) {
  const { bFile, generators } = entryFiles(entry);
  const [rust, python, javascript] = generators.map(name => path.join('oeis', entry, name));
  const inputs = [path.join('oeis', entry, bFile), ...generators.map(name => path.join('oeis', entry, name))];

  if (/\blattice_dimers_core\b/.test(fs.readFileSync(path.join(ROOT_DIRECTORY, rust), 'utf-8'))) {
    inputs.push(...fs.readdirSync(path.join(ROOT_DIRECTORY, 'rust', 'core', 'src')).map(name => path.join('rust', 'core', 'src', name)));
  }

  inputs.push(
    ...followImports(python, (file, content) =>
      [...content.matchAll(/^(?:from|import) (\.*)((?:lattice_dimers)?[\w.]*)/gm)]
        .filter(([, dots, name]) => dots || name.startsWith('lattice_dimers'))
        .flatMap(([, dots, name]) => [
          resolvePythonImport(file, dots, name),
          ...(dots ? [] : [path.join('python', 'lattice_dimers', '__init__.py')]),
        ]),
    ),
    ...followImports(javascript, (file, content) =>
      [...content.matchAll(/require\('(\.{1,2}\/[^']+)'\)/g)].map(([, target]) =>
        path.relative(ROOT_DIRECTORY, require.resolve(path.join(ROOT_DIRECTORY, path.dirname(file), target))),
      ),
    ),
  );

  return inputs.map(input => input.split(path.sep).join('/'));
}

function checkGeneratorGate() {
  const source = readGateInputs();

  if (!source) {
    return ['.github/workflows/ci.yml has no GENERATOR_INPUTS pattern.'];
  }

  const pattern = new RegExp(source);
  const inputs = new Set([...GENERATOR_SETUP, ...listGeneratorEntries().flatMap(listGeneratorInputs)]);

  return [...inputs]
    .filter(input => !pattern.test(input))
    .map(input => `The GENERATOR_INPUTS pattern of .github/workflows/ci.yml does not match ${input}, which the generators depend on.`);
}

function checkGateScript() {
  const inputs = readGateInputs();
  const script = readGateScript();

  if (!inputs || !script) {
    return [`.github/workflows/ci.yml has no step "${GATE_STEP}" with GENERATOR_INPUTS and a run script.`];
  }

  const others = Array.from({ length: 3000 }, (_, index) => `zz/a-changed-file-that-no-generator-reads-${String(index).padStart(4, '0')}.txt`);
  const cases = [
    ['a changed generator', ['oeis/A309117/b309117.rs'], false],
    ['a changed entry README', ['oeis/A309117/README.md'], true],
    ['a changed generator among 3000 other changed files', ['oeis/A309117/b309117.rs', ...others], false],
    ['a file of rust/core/ moved out of it', ['rust/core/src/modular.rs -> zz/modular.rs'], false],
  ];
  const errors = cases
    .filter(([, changes, skip]) => {
      const result = runGateScript(script, inputs, changes);

      return result.status !== 0 || result.skip !== skip;
    })
    .map(([name, , skip]) => `The step "${GATE_STEP}" of .github/workflows/ci.yml does not ${skip ? 'skip' : 'run'} the generators for ${name}.`);

  if (runGateScript(script, inputs, null).status === 0) {
    errors.push(`The step "${GATE_STEP}" of .github/workflows/ci.yml does not fail on a commit without the parent it compares with.`);
  }

  const failsWith = (result, message) => result.status !== 0 && !result.skip && result.stderr.includes(message);

  if (!failsWith(runGateScript(script, inputs, ['oeis/A309117/README.md'], { merge: false }), 'no second parent')) {
    errors.push(`The step "${GATE_STEP}" of .github/workflows/ci.yml does not fail on a commit that is not a merge commit.`);
  }

  if (!failsWith(runGateScript(script, '(', ['oeis/A309117/README.md']), 'grep failed with status 2')) {
    errors.push(`The step "${GATE_STEP}" of .github/workflows/ci.yml does not fail when grep cannot read the GENERATOR_INPUTS pattern.`);
  }

  return errors;
}

function checkGenerator(entry) {
  const { bFile, generator } = entryFiles(entry);
  const lines = readBFileLines(entry);
  const last = process.env.FULL_CASES === '1' ? lines.length - 1 : GENERATOR_LIMITS?.[entry]?.js;
  const run = args => spawnSync(process.execPath, [path.join(OEIS_DIRECTORY, entry, generator), ...args], { encoding: 'utf-8' });

  if (!Number.isInteger(last)) {
    return [`spec/limits.json gives no last term of ${entry} for js.`];
  }

  const { status, stdout, stderr } = run(['0', String(last)]);

  if (status !== 0) {
    return [`oeis/${entry}/${generator} failed: ${stderr.trim()}`];
  }

  const errors = [];

  if (stdout !== lines.slice(0, last + 1).join('\n') + '\n') {
    errors.push(`oeis/${entry}/${generator} 0 ${last} does not print the first ${last + 1} lines of ${bFile}.`);
  }

  for (const args of REJECTED_RANGES) {
    const rejected = run(args);

    if (rejected.status !== 2 || rejected.stdout !== '' || !rejected.stderr.startsWith('Usage: ')) {
      errors.push(`oeis/${entry}/${generator} ${args.join(' ')} does not exit with 2 and print its usage.`);
    }
  }

  return errors;
}

const checks = [
  ['the layout of oeis/', checkLayout],
  ['the table of oeis/README.md', checkTable],
  ['the generators in spec/limits.json, rust/Cargo.toml and rust/tests', checkGeneratorWiring],
  ['the files the generators depend on in the GENERATOR_INPUTS pattern of CI', checkGeneratorGate],
  ['the step of CI that selects the generator checks, on merge commits', checkGateScript],
  ...listEntries().flatMap(entry => {
    const { text, bFile, program } = entryFiles(entry);

    return [
      [`oeis/${entry}/README.md`, () => checkEntryReadme(entry)],
      [`oeis/${entry}/${text}`, () => checkEntryText(entry)],
      ...(exists(entry, bFile) ? [[`oeis/${entry}/${bFile}`, () => [...checkBFile(entry), ...checkBFileFacts(entry)]]] : []),
      ...(exists(entry, program) ? [[`oeis/${entry}/${program}`, () => checkProgram(entry)]] : []),
    ];
  }),
  ['links to approved entries and drafts', checkDraftLinks],
];

for (const [name, check] of checks) {
  test(name, () => {
    assert.deepEqual(check(), []);
  });
}

for (const entry of listGeneratorEntries()) {
  const skip = SKIP_GENERATORS && 'GENERATOR_CHECKS=skip: nothing the generators depend on changed';

  test(`oeis/${entry}/${entryFiles(entry).generator}`, { skip }, () => {
    assert.deepEqual(checkGenerator(entry), []);
  });
}
