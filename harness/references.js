const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const SNAPSHOT_FILE = path.join(__dirname, 'references.json');
const NAME = String.raw`(?:\p{Lu}\.[ -])+\p{Lu}[\p{L}'-]+`;
const AUTHORS = new RegExp(String.raw`^(${NAME}(?:, ${NAME})*(?: and ${NAME})?)\. (.+)$`, 'u');
const DOI_ITEM =
  /^(?<bib>.+?, (?:[A-Z][a-z]+ )?(?<year>\d{4})\.)(?: (?<locator>.+?\.))? \[doi:(?<doi>[^\]\s]+)\]\((?<url>https:\/\/doi\.org\/[^)\s]+)\)(?:, \[arXiv:(?<arxiv>[^\]\s]+)\]\(https:\/\/arxiv\.org\/abs\/(?<arxivUrl>[^)\s]+)\))?$/;
const OEIS_LINK = String.raw`\[OEIS A\d{6}\]\(https:\/\/oeis\.org\/A\d{6}\)`;
const OEIS_ITEM = new RegExp(
  String.raw`^OEIS Foundation Inc\. The On-Line Encyclopedia of Integer Sequences, (entry|entries) (${OEIS_LINK}(?:, ${OEIS_LINK})*(?: and ${OEIS_LINK})?)\. \[oeis\.org\]\(https:\/\/oeis\.org\)$`,
);
const CITATION = /\[(\d+(?:, \d+)*)\](?![(\[])/g;

function listReferenceFiles() {
  const { stdout, stderr, status, error } = spawnSync('git', ['ls-files', '*.md'], { cwd: ROOT_DIRECTORY, encoding: 'utf-8' });

  if (error || status !== 0) {
    throw error || new Error(`git ls-files failed: ${stderr.trim()}`);
  }

  return stdout
    .split('\n')
    .filter(file => file && fs.existsSync(path.join(ROOT_DIRECTORY, file)))
    .filter(file => /^## References$/m.test(readFile(file)));
}

function readFile(file) {
  return fs.readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8');
}

function splitNote(text) {
  const start = text.search(/^## References$/m);
  const rest = text.slice(start).split('\n').slice(1);
  const end = rest.findIndex(line => /^#{1,3} /.test(line));

  const section = end === -1 ? rest : rest.slice(0, end);
  const first = section.findIndex(line => line.trim() !== '');
  const last = section.findLastIndex(line => line.trim() !== '');

  return { body: text.slice(0, start), lines: first === -1 ? [] : section.slice(first, last + 1) };
}

function stripCode(body) {
  return body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$[^$\n]+\$/g, '');
}

function listCitations(body) {
  return [...stripCode(body).matchAll(CITATION)].flatMap(([, numbers]) => numbers.split(', ').map(Number));
}

function parseItems(file, lines) {
  const errors = [];
  const items = lines.map((line, index) => {
    const match = line.match(/^(\d+)\. (.+)$/);

    if (!match) {
      errors.push(
        line.trim() === ''
          ? `${file} has a blank line between references ${index} and ${index + 1}, which splits the list on the site.`
          : `${file} has "${line}" in References, which is not an item of a numbered list.`,
      );
      return null;
    }

    if (Number(match[1]) !== index + 1) {
      errors.push(`${file} numbers reference ${index + 1} as ${match[1]}.`);
    }

    return match[2];
  });

  return { items: items.filter(item => item !== null), errors };
}

function normalize(text) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/\*/g, '')
    .replace(/^the /i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function initials(given) {
  return given
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map(part => `${part[0]}.`);
}

function checkAuthors(where, authorText, record) {
  if (record.authors.length === 0) {
    return [];
  }

  const expected = record.authors.map(({ given, family }) => [...initials(given), family].join(' '));

  return authorText.split(/, | and /).join('|') === expected.join('|')
    ? []
    : [`${where} names the authors "${authorText}"; the DOI record has ${expected.join(', ')}.`];
}

function checkVenue(where, rest, record) {
  const text = normalize(rest);
  const chapter = record.type === 'book-chapter' ? record.title.match(/^(\d+) (.+)$/) : null;
  const title = chapter ? chapter[2] : record.title;
  const errors = [];

  if (!text.startsWith(`${normalize(title)}. `)) {
    errors.push(`${where} gives the title "${rest.split('. ')[0]}"; the DOI record has "${title}".`);
  }

  if (record.type === 'journal-article') {
    const place = `${record.volume}${record.issue ? `(${record.issue})` : ''}:${record.page ?? record.number}`;

    if (!text.includes(normalize(`${record.container} ${place}, `))) {
      errors.push(`${where} does not cite the journal as "*${record.container}* ${place}", as the DOI record has it.`);
    }
  }

  if (chapter) {
    for (const part of [`chapter ${chapter[1]} of `, normalize(record.container), `pp. ${record.page}, `]) {
      if (!text.includes(part)) {
        errors.push(`${where} does not have "${part}", which the DOI record of the chapter has.`);
      }
    }
  }

  return errors;
}

function checkDoiItem(where, groups, snapshot) {
  const { bib, year, doi, url, arxiv, arxivUrl } = groups;
  const record = snapshot[doi.toLowerCase()];
  const errors = [];
  let target = null;

  try {
    target = decodeURIComponent(url.slice('https://doi.org/'.length));
  } catch {
    target = null;
  }

  if (target !== doi) {
    errors.push(`${where} links doi:${doi} to ${url}, which is another DOI.`);
  }

  if (arxiv !== undefined && arxiv !== arxivUrl) {
    errors.push(`${where} links arXiv:${arxiv} to arxiv.org/abs/${arxivUrl}.`);
  }

  if (!record) {
    return [...errors, `${where} cites doi:${doi}, which is not in harness/references.json; run node harness/references.js --update.`];
  }

  if (Number(year) !== record.year) {
    errors.push(`${where} gives the year ${year}; the DOI record has ${record.year}.`);
  }

  const authors = bib.match(AUTHORS);

  if (!authors) {
    return [...errors, `${where} does not start with its authors written as "A. B. Name, C. Name and D. Name. ".`];
  }

  return [...errors, ...checkAuthors(where, authors[1], record), ...checkVenue(where, authors[2], record)];
}

function checkItem(where, item, snapshot) {
  const oeis = item.match(OEIS_ITEM);

  if (oeis) {
    const count = oeis[2].split('](').length - 1;

    return (oeis[1] === 'entry') === (count === 1) ? [] : [`${where} writes "${oeis[1]}" before ${count} OEIS entries.`];
  }

  const match = item.match(DOI_ITEM);

  if (!match) {
    const raw = item.match(/\]\(https:\/\/doi\.org\/[^)\s]*\([^)\s]*\)/);

    return [
      raw
        ? `${where} links a DOI with ( or ) in its address; write them as %28 and %29, since a Markdown link ends at the first ).`
        : `${where} "${item.slice(0, 80)}" has no DOI; a reference reads "Authors. Title. Venue, year." with its locator and ends in [doi:<DOI>](https://doi.org/<DOI>), or is the OEIS reference.`,
    ];
  }

  return checkDoiItem(where, match.groups, snapshot);
}

function checkFile(file, snapshot) {
  const { body, lines } = splitNote(readFile(file));
  const { items, errors } = parseItems(file, lines);
  const citations = listCitations(body);
  const order = [...new Set(citations)];
  const numbers = items.map((_, index) => index + 1);
  const headings = stripCode(body)
    .split('\n')
    .filter(line => /^#{1,6} /.test(line) && line.match(CITATION))
    .map(line => `${file} cites in the heading "${line}"; a citation belongs in the text, since the site links the headings from its contents.`);

  return [
    ...errors,
    ...headings,
    ...items.flatMap((item, index) => checkItem(`${file} reference ${index + 1}`, item, snapshot)),
    ...order.filter(number => number < 1 || number > items.length).map(number => `${file} cites [${number}], which is not in its References.`),
    ...numbers.filter(number => !order.includes(number)).map(number => `${file} never cites reference ${number}.`),
    ...(order.every((number, index) => number === index + 1)
      ? []
      : [`${file} cites its references first in the order ${order.join(', ')}; number them in the order of their first citation.`]),
  ];
}

function listDoiEntries(files) {
  return files.flatMap(file =>
    parseItems(file, splitNote(readFile(file)).lines)
      .items.map(item => item.match(DOI_ITEM))
      .filter(Boolean)
      .map(({ groups }) => ({ file, doi: groups.doi, bib: groups.bib })),
  );
}

function checkConsistency(files) {
  const byDoi = new Map();

  for (const entry of listDoiEntries(files)) {
    const key = entry.doi.toLowerCase();

    byDoi.set(key, [...(byDoi.get(key) ?? []), entry]);
  }

  return [...byDoi.values()].flatMap(([first, ...others]) =>
    others
      .filter(({ doi, bib }) => doi !== first.doi || bib !== first.bib)
      .map(({ file, doi, bib }) => `${file} cites doi:${doi} as "${bib}", ${first.file} cites doi:${first.doi} as "${first.bib}"; one work reads the same everywhere.`),
  );
}

function checkSnapshot(files, snapshot) {
  const cited = new Set(listDoiEntries(files).map(({ doi }) => doi.toLowerCase()));

  return Object.keys(snapshot)
    .filter(doi => !cited.has(doi))
    .map(doi => `harness/references.json keeps doi:${doi}, which no note cites; run node harness/references.js --update.`);
}

function readSnapshot() {
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
}

function fetchRecord(doi) {
  const { stdout, status, stderr } = spawnSync(
    'curl',
    ['-sSfL', '--max-time', '60', '-H', 'Accept: application/vnd.citationstyles.csl+json', `https://doi.org/${encodeURIComponent(doi).replace(/%2F/g, '/')}`],
    { encoding: 'utf-8' },
  );

  if (status !== 0) {
    throw new Error(`doi.org did not answer for ${doi}: ${stderr.trim()}`);
  }

  const csl = JSON.parse(stdout);
  const container = [csl['container-title']].flat()[0];

  return {
    type: csl.type,
    authors: (csl.author ?? []).map(({ given, family }) => ({ given, family })),
    title: csl.title,
    ...(container ? { container } : {}),
    ...(csl.volume ? { volume: csl.volume } : {}),
    ...(csl.issue ? { issue: csl.issue } : {}),
    ...(csl.page ? { page: csl.page } : {}),
    ...(csl['article-number'] ? { number: csl['article-number'] } : {}),
    year: csl.issued['date-parts'][0][0],
  };
}

function updateSnapshot() {
  const dois = [...new Set(listDoiEntries(listReferenceFiles()).map(({ doi }) => doi.toLowerCase()))].sort();
  const snapshot = Object.fromEntries(dois.map(doi => [doi, fetchRecord(doi)]));

  fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`harness/references.json: ${dois.length} DOI records from doi.org`);
}

module.exports = { CITATION, checkConsistency, checkFile, checkSnapshot, listReferenceFiles, readSnapshot, splitNote, stripCode };

if (require.main === module) {
  if (process.argv[2] !== '--update') {
    console.error('usage: node harness/references.js --update');
    process.exit(2);
  }

  updateSnapshot();
}
