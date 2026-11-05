const fs = require('fs');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const NAME = 'Lattice Dimers';

function read(file) {
  return fs.readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8');
}

function readCitation() {
  const lines = read('CITATION.cff').split('\n');
  const title = (lines.find(line => line.startsWith('title: ')) ?? '').slice('title: '.length).replace(/^"|"$/g, '');
  const block = key => {
    const start = lines.findIndex(line => line.startsWith(`${key}:`));
    const end = lines.findIndex((line, index) => index > start && /^\S/.test(line));

    return start === -1 ? [] : lines.slice(start + 1, end === -1 ? lines.length : end);
  };
  const abstract = block('abstract')
    .map(line => line.trim())
    .join(' ');
  const keywords = block('keywords').map(line => line.replace(/^\s*- /, '').replace(/^"|"$/g, ''));

  return { title, abstract, keywords };
}

function readReadmeAbstract() {
  const lines = read('README.md').split('\n');
  const badges = lines.findLastIndex(line => line.startsWith('[!['));

  return lines.slice(badges + 1).find(line => line.trim() !== '') ?? '';
}

function listEntries() {
  return fs
    .readdirSync(path.join(ROOT_DIRECTORY, 'oeis'))
    .filter(name => /^A\d{6}$/.test(name))
    .sort();
}

function checkCitation() {
  const { title, abstract } = readCitation();
  const heading = read('README.md').split('\n')[0];
  const errors = [];

  if (!heading.startsWith('# ') || !heading.endsWith(NAME)) {
    errors.push(`The heading of README.md must end with ${NAME}.`);
  }

  if (!title.startsWith(`${NAME}: `)) {
    errors.push(`The title of CITATION.cff must start with "${NAME}: ", the name in README.md.`);
  }

  if (abstract !== readReadmeAbstract()) {
    errors.push('The abstract of CITATION.cff must be the first paragraph of README.md.');
  }

  return errors;
}

function checkPackage() {
  const subtitle = readCitation().title.slice(`${NAME}: `.length);
  const expected = `${subtitle.charAt(0).toUpperCase()}${subtitle.slice(1)}: `;
  const { description } = JSON.parse(read('package.json'));

  return description.startsWith(expected) ? [] : [`The description in package.json must start with "${expected}", the title of CITATION.cff.`];
}

function checkPrivate() {
  return JSON.parse(read('package.json')).private === true ? [] : ['package.json must stay private, so pnpm publish cannot release it to npm.'];
}

function checkKeywords() {
  const entries = listEntries();
  const citation = readCitation()
    .keywords.filter(keyword => /^OEIS A\d{6}$/.test(keyword))
    .map(keyword => keyword.slice('OEIS '.length));
  const packageKeywords = JSON.parse(read('package.json'))
    .keywords.filter(keyword => /^a\d{6}$/.test(keyword))
    .map(keyword => keyword.toUpperCase());
  const errors = [];

  for (const [file, listed] of [
    ['CITATION.cff', citation],
    ['package.json', packageKeywords],
  ]) {
    if ([...listed].sort().join(',') !== entries.join(',')) {
      errors.push(`The OEIS keywords of ${file} are ${listed.join(', ')}, the entries in oeis/ are ${entries.join(', ')}.`);
    }
  }

  return errors;
}

function checkSiteMenu() {
  const { listNotes } = require('../site/notes');
  const { NAV, renderHeader } = require('../site/chrome');
  const notes = listNotes();
  const slugs = notes.map(({ slug }) => slug);
  const listed = NAV.flatMap(entry => entry.items || [entry]).map(({ slug }) => slug);
  const errors = [];

  notes.forEach(({ file, slug }) => {
    if (slug !== file.replace(/\d+-/g, '').replace(/\.md$/, '')) {
      errors.push(`notes/${file} is published as ${slug}.html`);
    }
  });

  if ([...slugs].sort().join() !== [...listed].sort().join()) {
    errors.push(`the notes are ${slugs.join(', ')} and the menu lists ${listed.join(', ')}`);
  }

  [notes.slice(1), [...notes, { file: 'dominoes/09-strip.md', slug: 'dominoes/strip' }]].forEach(wrong => {
    try {
      renderHeader({ root: '', current: 'home', notes: wrong });
      errors.push(`the header accepts the notes ${wrong.map(({ slug }) => slug).join(', ')}`);
    } catch (error) {
      if (!/the site navigation misses/.test(error.message)) {
        errors.push(`the header fails on the notes ${wrong.map(({ slug }) => slug).join(', ')} with ${error.message}`);
      }
    }
  });

  return errors;
}

function checkOeisLinks() {
  const { listNotes } = require('../site/notes');
  const { NOTE_REDIRECTS, resolveRedirect } = require('../site/chrome');
  const slugs = listNotes().map(({ slug }) => slug);
  const errors = [];

  listEntries().forEach(entry => {
    fs.readdirSync(path.join(ROOT_DIRECTORY, 'oeis', entry))
      .filter(file => file.endsWith('.txt'))
      .forEach(file => {
        for (const [, slug] of read(`oeis/${entry}/${file}`).matchAll(/lattice-dimers\/notes\/([a-z0-9/-]+)\.html/g)) {
          const redirect = NOTE_REDIRECTS[slug];

          if (!slugs.includes(slug) && !(redirect && slugs.includes(redirect.to))) {
            errors.push(`oeis/${entry}/${file} links notes/${slug}.html, which is neither a note nor a redirect to one`);
          }
        }
      });
  });

  Object.entries(NOTE_REDIRECTS).forEach(([from, { sections = {} }]) => {
    Object.keys(sections).forEach(id => {
      const target = resolveRedirect(from, id).split('.html')[0];

      if (!slugs.includes(target)) {
        errors.push(`notes/${from}.html#${id} redirects to ${target}.html, which is no note`);
      }
    });
  });

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
  const passed = [
    runCheck('the title and abstract of CITATION.cff against README.md', checkCitation),
    runCheck('the description of package.json against CITATION.cff', checkPackage),
    runCheck('that package.json is private', checkPrivate),
    runCheck('the OEIS keywords against oeis/', checkKeywords),
    runCheck('the notes against the site menu', checkSiteMenu),
    runCheck('the links of oeis/ to the notes and the redirects', checkOeisLinks),
  ].every(Boolean);

  if (passed) {
    console.log('All metadata tests completed successfully.');
    process.exit(0);
  }

  console.error('Some metadata tests failed.');
  process.exit(1);
}

__main__();
