const fs = require('fs');
const path = require('path');

const OEIS_DIRECTORY = __dirname;
const ENTRY_PATTERN = /^A\d{6}$/;
const ACCOUNT = 'Dawid Ryłko';
const FORMER_ACCOUNTS = ['Dawid Rylko'];
const DATA_WIDTH = 290;
const SHARED_DEFINITION = 60;
const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
const TYPED_SIGNATURE = '~~~~';
const SIGNATURE = new RegExp(`\\s+(?:-\\s+_[^_]+_, ${MONTH} \\d{2} \\d{4}|(?:-\\s+)?${TYPED_SIGNATURE})$`);
const TYPED_SIGNATURE_LINE_END = new RegExp(`\\s-\\s${TYPED_SIGNATURE}$`);
const SIGNED_ACCOUNT = `_${ACCOUNT}_, ${MONTH} \\d{2} \\d{4}`;
const SYSTEM_KEYWORDS = ['new', 'changed', 'allocated', 'recycled'];
const PROSE = ['N', 'C', 'D', 'H', 'F', 'Y', 'E'];
const CODE = ['o', 'p', 't'];
const SECTION_TYPES = {
  NAME: 'N',
  DATA: 'S',
  OFFSET: 'O',
  COMMENTS: 'C',
  REFERENCES: 'D',
  LINKS: 'H',
  FORMULA: 'F',
  EXAMPLE: 'e',
  MAPLE: 'p',
  MATHEMATICA: 't',
  PROG: 'o',
  CROSSREFS: 'Y',
  KEYWORD: 'K',
  AUTHOR: 'A',
  EXTENSIONS: 'E',
};
const LINE_ORDER = 'ISTUNCDHFeptoYKOAE';
const MATHWORLD = [
  { page: 'PerfectMatching', label: 'Perfect Matching', trigger: /perfect matching|domicule|dimer covering/i },
  { page: 'KingGraph', label: 'King Graph', trigger: /king'?s graph/i },
];
const DOI_LINK = /<a href="https:\/\/doi\.org\/([^"]+)">([^<]*)<\/a>/i;
const OPEN_DOI = /^10\.(?:5281\/zenodo|48550\/arxiv)\./i;
const ARXIV_LINK = /href="https?:\/\/arxiv\.org\/abs\//i;
const SIZE = '(?:\\d+|\\d*[hknmw])';
const BOARD_SIZES = [
  new RegExp(`(?:^|[\\s(])${SIZE} x ${SIZE}(?=$|[\\s,.;:)])`, 'g'),
  new RegExp(`(?:^|[\\s(])${SIZE}[xX]${SIZE}(?=$|[\\s,.;:)-])`, 'g'),
  new RegExp(`(?:^|[\\s(])${SIZE}(?: by |-by-)${SIZE}(?=$|[\\s,.;:)])`, 'g'),
];
const ARITHMETIC = /\b(?:divid|multipl|replac|substitut)\w*[^.;]*$/i;
const NUMERIC_ROW = /^\s*-?\d+(?:,\s*-?\d+)*(?:[,;]|,\s*\.\.\.)?\s*$/;
const AUTHOR_SUFFIX = /^(?:Jr\.?|Sr\.?|II|III|IV|(?:\p{Lu}\.\s*)+)$/u;
const PERSON = /^(?:\p{Lu}[\p{L}'’.-]*\s+){1,3}\p{Lu}[\p{L}'’-]+(?:, (?:Jr\.?|Sr\.?|II|III|IV))?$/u;
const NON_ASCII_MATH = /[×−–—≤≥≠…→←↔∞·²³√π∑∏∫≈±‘’“” ]/;
const MISSPELLED =
  /\b(?:behaviour\w*|colour\w*|generalis\w*|labell(?:ed|ing)|neighbour\w*|non-(?:composite|decreasing|empty|increasing|negative|positive|prime|square|squarefree|trivial|unit|zero)|nil-potent|cube-free|square-free|semi-prime|sub-matrix|proven|zeroes|zeroeth|occuring|ocurring|recurence|reccurrence|recuring|reccurring|cancelation|dependant|independant|dissectable|[nmij]th|\d+-(?:th|st|nd|rd))\b/i;
const ONLINE_ONLY = /https?:\/\/|doi\.org|\barXiv\b|\bZenodo\b|Electronic Journal of Combinatorics|Elec(?:tron)?\. J\. Comb|Journal of Integer Sequences|J\. Integer Seq/i;
const PROVENANCE =
  /\bagree between\b|\bmodulo primes\b|\bChinese remainder\b|\bexact integers\b|\b(?:computed|checked|verified|recounted) (?:with|against)\b|\bcome from (?:a|the) transfer matrix\b|\bcomputed a\(\d+\)/i;
const NOT_FUTURE_PROOF =
  /\bthe Zenodo (?:preprint|paper|report|record)\b|\b(?:our|my) (?:preprint|paper|article|report)\b|\bonly the \d+ (?:digits|terms)\b|\bthe \d+ (?:digits|terms) (?:listed|shown|given)\b|\bfix(?:es)? only the first\b|\b(?:truncated to|listed up to) the digits\b|\bdigits valid for the whole\b/i;

function said(entry, revision, editor, date, ...quotes) {
  return `${entry} #${revision}, ${editor}, ${date}: ${quotes.map(quote => `"${quote}"`).join('; ')}`;
}

function noted(entry, under, editor, date, ...quotes) {
  return `${entry}, Discussion note under #${under}, ${editor}, ${date}: ${quotes.map(quote => `"${quote}"`).join('; ')}`;
}

function edit(entry, revision, editor, date, description) {
  return `${entry} #${revision}, ${editor}, ${date}: ${description}`;
}

const RULES = [
  {
    id: 'data-fill',
    field: 'DATA',
    text: `DATA holds every term that fits in about ${DATA_WIDTH} characters, counted with the spaces the OEIS shows; the next term of the b-file must not fit. ${DATA_WIDTH} is where Michel Marcus left A402163 (#5, 287 characters); Alois P. Heinz wrote 260 on A309117 (#8), the figure of the Style Sheet, which an editor passes while a term still fits.`,
    source: [
      said('A402163', 5, 'Michel Marcus', '2026-11-14', 'there was room for another term : added'),
      noted('A401988', 6, 'Michel Marcus', '2026-11-11', 'data wants more terms'),
      said('A309117', 8, 'Alois P. Heinz', '2019-07-13', '<=260 char in data section usually'),
      'SS "How many terms do we need?": "about 260 characters including spaces and commas"',
    ],
    check(info) {
      if (!info.full || info.table || info.keywords.has('cons') || !info.bFile) {
        return [];
      }

      const next = termAt(info, info.offset + info.data.length);

      if (next === undefined) {
        return [];
      }

      const wider = displayWidth([...info.data, next]);

      return wider <= DATA_WIDTH
        ? [finding(info.of('S')[0], `DATA is ${displayWidth(info.data)} characters wide and a(${info.offset + info.data.length}) still fits (${wider}): add it.`)]
        : [];
    },
  },
  {
    id: 'data-rows',
    field: 'DATA',
    text: `The DATA of a triangle or an array ends on a row boundary. A further whole row that would still fit in about ${DATA_WIDTH} characters gives advice: no editor has asked for one.`,
    source: [edit('A401673', 5, 'Alois P. Heinz', '2026-11-02', 'the rest of row n=4 appended')],
    check(info) {
      if (!info.full || !info.table) {
        return [];
      }

      const length = rowLength(info);

      if (!length) {
        return [];
      }

      let total = 0;
      let row = info.offset;

      while (total < info.data.length) {
        const size = length(row);

        if (!Number.isInteger(size) || size < 1) {
          return [];
        }

        total += size;
        row++;
      }

      if (total !== info.data.length) {
        return [finding(info.of('S')[0], `DATA stops inside row ${row - 1}, which ends after term ${total}; DATA has ${info.data.length}.`)];
      }

      if (!info.bFile) {
        return [];
      }

      const nextRow = Array.from({ length: length(row) }, (unused, index) => termAt(info, info.offset + total + index));

      return nextRow.every(term => term !== undefined) && displayWidth([...info.data, ...nextRow]) <= DATA_WIDTH
        ? [finding(info.of('S')[0], `Row ${row} still fits in DATA (${displayWidth([...info.data, ...nextRow])} characters): consider adding it.`, 'advice')]
        : [];
    },
  },
  {
    id: 'keyword-more-bfile',
    field: 'KEYWORD',
    text: 'No keyword more when the entry links a b-file: the b-file already gives more terms.',
    source: [said('A402163', 6, 'Michel Marcus', '2026-11-14', 'no keyword more more, since we have a bfile')],
    check(info) {
      return info.keywords.has('more') && info.bFileLink ? [finding(info.of('K')[0], 'Keyword more next to a b-file link: drop more.')] : [];
    },
  },
  {
    id: 'keyword-system',
    field: 'KEYWORD',
    text: 'The keywords new, changed, allocated and recycled are set by the OEIS and are not stored in oeis/.',
    source: ['oeis/README.md, "Files"', 'KW (https://oeis.org/eishelp2.html#RK)'],
    check(info) {
      if (info.mode !== 'repo') {
        return [];
      }

      const system = [...info.keywords].filter(keyword => SYSTEM_KEYWORDS.includes(keyword));

      return system.length > 0 ? [finding(info.of('K')[0], `The OEIS sets ${system.join(', ')} by itself: leave it out of the copy.`)] : [];
    },
  },
  {
    id: 'keyword-consistency',
    field: 'KEYWORD',
    text: 'nonn or sign by the signs of the terms, cons for a decimal expansion, tabl or tabf for a triangle or an array read by rows or antidiagonals.',
    source: [
      'KW (https://oeis.org/eishelp2.html#RK)',
      'the live A239264 carries tabl, an array read by antidiagonals (read 2026-11-17)',
      'the live A401673 carries tabf, an irregular triangle (read 2026-11-17)',
    ],
    check(info) {
      if (!info.full) {
        return [];
      }

      const line = info.of('K')[0];
      const negative = knownTerms(info).some(term => term.startsWith('-'));
      const findings = [];

      if (negative && info.keywords.has('nonn')) {
        findings.push(finding(line, 'A negative term with keyword nonn: use sign.'));
      }

      if (!negative && info.keywords.has('sign')) {
        findings.push(finding(line, 'No negative term but keyword sign: use nonn.'));
      }

      if (!info.keywords.has('nonn') && !info.keywords.has('sign')) {
        findings.push(finding(line, 'Neither nonn nor sign.'));
      }

      if (/^Decimal expansion/i.test(info.name) && !info.keywords.has('cons')) {
        findings.push(finding(line, 'A decimal expansion without keyword cons.'));
      }

      if (/read by (?:rows|antidiagonals)/i.test(info.name) && !info.table) {
        findings.push(finding(line, 'A table read by rows or antidiagonals without tabl or tabf.'));
      }

      return findings;
    },
  },
  {
    id: 'name-period',
    field: 'NAME',
    text: 'The NAME ends with a period.',
    source: [edit('A309117', 5, 'Michel Marcus', '2019-07-13', 'a period added after the name')],
    check(info) {
      const line = info.of('N')[0];

      return line && !/[.?!]$/.test(line.value) ? [finding(line, 'End the name with a period.')] : [];
    },
  },
  {
    id: 'name-index',
    field: 'NAME',
    text: 'The NAME says what n is.',
    source: [said('A309117', 9, 'Alois P. Heinz', '2019-07-13', 'The width is 4.  I guess you should write in name that the length is n.')],
    check(info) {
      const line = info.of('N')[0];

      if (!line || !info.full || info.keywords.has('cons')) {
        return [];
      }

      return /(?:^|[^A-Za-z])\d*n(?:[^A-Za-z]|$)/.test(line.value) ? [] : [finding(line, 'The name does not mention n: say what the index counts.')];
    },
  },
  {
    id: 'capital-x',
    field: 'NAME, COMMENTS, FORMULA, EXAMPLE, CROSSREFS',
    text: 'Board sizes are written n X n, with a capital X between spaces, not n x n, nXn, n by n or n-by-n.',
    source: ['SS "Style for the name of a sequence"', 'A239264, "k X n grid"'],
    check(info) {
      return info
        .of('N', 'C', 'F', 'e', 'Y')
        .filter(line =>
          BOARD_SIZES.some(pattern =>
            [...line.value.matchAll(pattern)].some(match => !ARITHMETIC.test(line.value.slice(0, match.index + match[0].search(/\S/)))),
          ),
        )
        .map(line => finding(line, 'Write the size with a capital X between spaces: n X n.'));
    },
  },
  {
    id: 'line-period',
    field: 'COMMENTS, FORMULA, CROSSREFS',
    text: 'A comment, formula or cross-reference line ends with a period, before its signature if it has one. A block of lines that opens with ": (Start)" ends its last line with ". (End)" or with "(End)" alone.',
    source: [edit('A309117', 5, 'Michel Marcus', '2019-07-13', 'periods added after the g.f. and the crossrefs')],
    check(info) {
      const lines = info.of('C', 'F', 'Y');

      return lines
        .filter((line, index) => {
          const value = line.value.replace(SIGNATURE, '');
          const continued = value.endsWith(':') && lines[index + 1]?.type === line.type;
          const opensBlock = /:\s*\(Start\)$/.test(value);
          const body = value.replace(/\s*\(End\)$/, '');

          return body !== '' && !body.endsWith('.') && !continued && !opensBlock;
        })
        .map(line => finding(line, 'End the line with a period.'));
    },
  },
  {
    id: 'crossrefs-form',
    field: 'CROSSREFS',
    text: 'CROSSREFS names A-numbers only: "Cf. A000001, A000002 (what it is)." or a sentence such as "Row sums give A000003."; no link, no repetition, not the entry itself.',
    source: [edit('A309117', 5, 'Michel Marcus', '2019-07-13', '"A011900" became "Cf. A011900."'), 'SS "Crossrefs"'],
    check(info) {
      const findings = [];
      const seen = new Set();

      for (const line of info.of('Y')) {
        if (/<a\s/i.test(line.value)) {
          findings.push(finding(line, 'A link in CROSSREFS: move it to LINKS.'));
        }

        if (/^(?:A\d{6}[,.\s]*)+$/.test(line.value)) {
          findings.push(finding(line, 'A bare list of A-numbers: write it as "Cf. A000001, A000002."'));
        } else if (/^Cf\b/.test(line.value)) {
          const items = line.value
            .replace(/^Cf\.\s*/, '')
            .replace(/\.$/, '')
            .split(/, (?![^(]*\))/);

          if (!/^Cf\. /.test(line.value) || items.some(item => !/^A\d{6}(?: \([^)]+\))?$/.test(item))) {
            findings.push(finding(line, 'Write the list as "Cf. A000001, A000002 (what it is)." with a comma and a space between the A-numbers.'));
          }
        } else if (!/A\d{6}/.test(line.value)) {
          findings.push(finding(line, 'A cross-reference line without an A-number.'));
        }

        for (const [number] of line.value.matchAll(/A\d{6}/g)) {
          if (number === info.entry) {
            findings.push(finding(line, `CROSSREFS names the entry itself, ${number}.`));
          } else if (seen.has(number)) {
            findings.push(finding(line, `${number} appears twice in CROSSREFS.`));
          }

          seen.add(number);
        }
      }

      return findings;
    },
  },
  {
    id: 'crossrefs-reverse',
    field: 'CROSSREFS',
    text: 'An entry named in a CROSSREFS sentence, as in "Row sums give A239273.", names this entry back in its own CROSSREFS, as "Row sums of A401673."; a Cf. list needs no reply. A missing reply is a defect for an entry with a copy in oeis/ and advice for any other, such as a general sequence like A000012.',
    source: [
      edit('A239273', 46, 'Alois P. Heinz', '2026-11-02', '"Row sums of A401673." added, after A401673 said "Row sums give A239273."'),
      edit('A004003', 169, 'Dawid Ryłko', '2026-11-11', '"Column k=0 of A401673." added, after A401673 said "Column k=0 gives A004003."'),
      'the live A239264 does not name A401670, which lists it in a Cf. line (read 2026-11-17)',
    ],
    check(info) {
      const findings = [];

      for (const line of info.of('Y').filter(item => !/^Cf\b/.test(item.value))) {
        for (const target of new Set(line.value.match(/A\d{6}/g) ?? [])) {
          if (target === info.entry) {
            continue;
          }

          const other = info.others.find(item => item.entry === target);
          const known = other && (other.live || describe(other.text, { entry: target }).full);

          if (!known) {
            if (info.mode !== 'repo') {
              findings.push(
                finding(line, `${target} has no full copy here: check that its CROSSREFS name ${info.entry} back, or pass its text with --related.`, 'note'),
              );
            }

            continue;
          }

          if (!parseEntry(other.text).some(item => item.type === 'Y' && item.value.includes(info.entry))) {
            findings.push(
              finding(
                line,
                `${target} does not name ${info.entry} back: add the converse sentence to the CROSSREFS of ${target}.`,
                listEntries().includes(target) ? undefined : 'advice',
              ),
            );
          }
        }
      }

      return findings;
    },
  },
  {
    id: 'links-period',
    field: 'LINKS',
    text: 'A link line other than the b-file ends with a period after the closing </a>.',
    source: [edit('A239273', 50, 'Andrew Howroyd', '2026-11-11', 'periods added after "King Graph</a>" and "King\'s graph</a>"')],
    check(info) {
      return info
        .of('H')
        .filter(line => line !== info.bFileLink && /<\/a>$/.test(line.value))
        .map(line => finding(line, 'End the link line with a period after </a>.'));
    },
  },
  {
    id: 'links-https',
    field: 'LINKS',
    text: 'Links use https, DOIs go through https://doi.org/ (not dx.doi.org) and arXiv through https://arxiv.org/abs/<id> (not arXiv.org or math.CO/).',
    source: [
      edit('A004003', 149, 'Michel Marcus', '2026-02-11', 'http://dx.doi.org became https://doi.org'),
      edit('A004003', 148, 'Michel Marcus', '2026-02-11', 'http://arXiv.org/abs/math.CO/ became https://arxiv.org/abs/math/'),
      edit('A309117', 13, 'Sean A. Irvine', '2026-05-30', 'global edit 3122, https'),
      edit('A004003', 162, 'Michel Marcus', '2026-10-15', 'three links moved to https'),
    ],
    check(info) {
      const findings = [];

      for (const line of info.of('H', 'C', 'D', 'F')) {
        for (const [, url] of line.value.matchAll(/href="([^"]+)"/g)) {
          if (/^http:\/\//.test(url)) {
            findings.push(finding(line, `Use https: ${url}`));
          }

          if (/dx\.doi\.org/.test(url)) {
            findings.push(finding(line, `Link the DOI as https://doi.org/...: ${url}`));
          }

          if (/arXiv\.org|arxiv\.org\/abs\/[a-z-]+\.[A-Z]{2}\//.test(url)) {
            findings.push(finding(line, `Link arXiv as https://arxiv.org/abs/<id>: ${url}`));
          }
        }
      }

      return findings;
    },
  },
  {
    id: 'links-arxiv-label',
    field: 'LINKS',
    text: 'An arXiv link names its identifier outside the address, as ", arXiv:<id> [<class>], <year>." after </a> or as the link text.',
    source: [edit('A004003', 66, 'Michel Marcus', '2015', '", arXiv:math/0610925 [math.CO], 2006." added after the title')],
    check(info) {
      return info
        .of('H')
        .filter(line => {
          const match = line.value.match(/href="https?:\/\/arxiv\.org\/abs\/([^"]+)"/i);

          if (!match) {
            return false;
          }

          const id = match[1].replace(/^math\.[A-Z]{2}\//, 'math/').replace(/v\d+$/, '');

          return !line.value.replace(/href="[^"]*"/g, '').includes(`arXiv:${id}`);
        })
        .map(line => finding(line, 'Name the arXiv identifier after the title: ", arXiv:<id> [<class>], <year>."'));
    },
  },
  {
    id: 'links-authors',
    field: 'LINKS',
    text: 'A list of three or more authors before a link joins the last one with "and". Two names give a note, since the second can be a title.',
    source: [edit('A004003', 140, 'Michel Marcus', '2025', '"and" added before the last of five and of three authors')],
    check(info) {
      return info
        .of('H')
        .filter(line => {
          const authors = linkAuthors(line.value);

          return !/ and /.test(authors) && leadingPeople(authors).length > 1;
        })
        .map(line =>
          leadingPeople(linkAuthors(line.value)).length > 2
            ? finding(line, 'Join the last author with "and".')
            : finding(line, 'If both names before the link are authors, join them with "and"; a title before the link is fine.', 'note'),
        );
    },
  },
  {
    id: 'links-order',
    field: 'LINKS',
    text: "LINKS starts with the b-file, then goes alphabetically by the first author's last name, and ends with the index entries.",
    source: [noted('A401988', 6, 'Michel Marcus', '2026-11-11', '3rd link should be 2nd position'), 'SS "Links"'],
    check(info) {
      if (!info.full) {
        return [];
      }

      const lines = info.of('H');
      const findings = [];

      if (info.bFileLink && lines[0] !== info.bFileLink) {
        findings.push(finding(info.bFileLink, 'Put the b-file link first.'));
      }

      const ranked = lines.filter(line => line !== info.bFileLink);
      const isIndex = line => /href="\/index\//.test(line.value);
      const firstIndex = ranked.findIndex(isIndex);

      if (firstIndex !== -1 && ranked.slice(firstIndex).some(line => !isIndex(line))) {
        findings.push(finding(ranked[firstIndex], 'Put the index entries last.'));
      }

      const sorted = ranked.filter(line => !isIndex(line));

      for (let index = 1; index < sorted.length; index++) {
        if (sortKey(sorted[index]) < sortKey(sorted[index - 1])) {
          findings.push(finding(sorted[index], `Order the links by the first author's last name: ${lastName(sorted[index].value)} comes before ${lastName(sorted[index - 1].value)}.`));
        }
      }

      return findings;
    },
  },
  {
    id: 'links-rec-index',
    field: 'LINKS',
    text: 'An entry with a rational g.f. or a linear recurrence with constant coefficients has the index entry "<a href="/index/Rec#order_NN">Index entries for linear recurrences with constant coefficients</a>, signature (c_1,...,c_k).", NN the order in two digits, and the signature holds on the known terms.',
    source: [edit('A309117', 17, 'Alois P. Heinz', '2026-11-11', 'order_08, signature (2,9,-4,-21,-4,9,2,-1) added')],
    check(info) {
      if (!info.full) {
        return [];
      }

      const index = info.of('H').find(line => line.value.includes('/index/Rec#order_'));
      const rational = info.of('F').find(line => /^G\.f\.: [-+*/^()\d\sxz]+\.$/.test(line.value.replace(SIGNATURE, '')));

      if (rational && !index) {
        return [finding(rational, 'A rational g.f. without the index entry of linear recurrences with constant coefficients and its signature.')];
      }

      if (!index) {
        return [];
      }

      const match = index.value.match(
        /^<a href="\/index\/Rec#order_(\d+)">Index entries for linear recurrences with constant coefficients<\/a>, signature \((-?\d+(?:,-?\d+)*)\)\.$/,
      );

      if (!match) {
        return [finding(index, 'Write the index entry as <a href="/index/Rec#order_NN">Index entries for linear recurrences with constant coefficients</a>, signature (c_1,...,c_k).')];
      }

      const findings = [];
      const signature = match[2].split(',').map(BigInt);

      if (match[1].length < 2 || Number(match[1]) !== signature.length) {
        findings.push(finding(index, `The order is ${signature.length}: write order_${String(signature.length).padStart(2, '0')}.`));
      }

      const terms = knownTerms(info).map(BigInt);

      for (let n = Math.max(signature.length, Math.floor(terms.length / 2)); n < terms.length; n++) {
        if (signature.reduce((sum, coefficient, k) => sum + coefficient * terms[n - 1 - k], 0n) !== terms[n]) {
          findings.push(finding(index, `The signature fails at a(${info.offset + n}).`));
          break;
        }
      }

      return findings;
    },
  },
  {
    id: 'links-placeholder',
    field: 'LINKS',
    text: 'No placeholder text in a link.',
    source: [edit('A004003', 123, 'N. J. A. Sloane', '2021', '"TITLE FOR LINK" replaced')],
    check(info) {
      return info
        .of('H')
        .filter(line => /TITLE FOR LINK/i.test(line.value))
        .map(line => finding(line, 'Replace the placeholder with the title.'));
    },
  },
  {
    id: 'links-title-truncated',
    field: 'LINKS',
    text: 'A link names the full title of the work, never one cut short with "...".',
    source: [
      edit(
        'A004003',
        151,
        'Michel Marcus',
        '2026-02-11',
        '"Combinatorial approaches and conjectures ..." became "Combinatorial Approaches and Conjectures for 2-Divisibility Problems Concerning Domino Tilings of Polyominoes"',
      ),
    ],
    check(info) {
      return info
        .of('H')
        .filter(line => /<a [^>]*>[^<]*(?:\.\.\.|…)\s*<\/a>/.test(line.value))
        .map(line => finding(line, 'Write the full title of the work in the link.'));
    },
  },
  {
    id: 'links-notes-canonical',
    field: 'LINKS',
    text: 'A link into the notebooks names the page itself, not an address that redirects.',
    source: [edit('A401670', 4, 'Jason Yuen', '2026-11-03', 'notes/torus.html became notes/tori.html')],
    check(info) {
      if (!info.notes) {
        return [];
      }

      const findings = [];

      for (const line of info.of('H', 'C')) {
        for (const [, slug] of line.value.matchAll(/dawidrylko\.github\.io\/lattice-dimers\/notes\/([a-z0-9/-]+)\.html/g)) {
          if (info.notes.redirects[slug]) {
            findings.push(finding(line, `notes/${slug}.html redirects to notes/${info.notes.redirects[slug]}.html: link that page.`));
          } else if (!info.notes.pages.includes(slug)) {
            findings.push(finding(line, `notes/${slug}.html is not a page of the site.`));
          }
        }
      }

      return findings;
    },
  },
  {
    id: 'links-mathworld',
    field: 'LINKS',
    level: 'advice',
    text: "An entry on perfect matchings links Eric Weisstein's World of Mathematics, Perfect Matching; an entry on the king's graph also King Graph.",
    source: [
      edit('A401988', 10, 'Andrew Howroyd', '2026-11-11', 'Perfect Matching added'),
      edit('A239264', 41, 'Andrew Howroyd', '2026-11-11', 'King Graph and Perfect Matching added'),
      edit('A239273', 50, 'Andrew Howroyd', '2026-11-11', 'Perfect Matching added'),
    ],
    check(info) {
      if (!info.full) {
        return [];
      }

      const prose = info
        .of('N', 'C')
        .map(line => line.value)
        .join(' ');

      return MATHWORLD.filter(({ trigger }) => trigger.test(prose))
        .filter(({ page }) => !info.of('H').some(line => line.value.includes(`https://mathworld.wolfram.com/${page}.html`)))
        .map(({ page, label }) => finding(info.of('N')[0], `Add Eric Weisstein's World of Mathematics, <a href="https://mathworld.wolfram.com/${page}.html">${label}</a>.`));
    },
  },
  {
    id: 'links-arxiv-version',
    field: 'LINKS',
    level: 'advice',
    text: 'A DOI link to an article that is not open access has a line for its arXiv version beside it, which links https://arxiv.org/abs/<id> and gives the same title as its link text or just before the link, or an arXiv link on the line of the DOI itself. The script cannot tell the authors from the title before a link, so a title that ends that text counts. Offline the script cannot see whether the article is open or on arXiv, so it advises. A Zenodo or arXiv DOI is open and needs none, and a copy that holds only some lines of an entry is not checked.',
    source: [
      edit('A401988', 13, 'Vaclav Kotesovec', '2026-11-17', 'the arXiv version of Fendley, Moessner and Sondhi added beside the line of its DOI'),
      noted('A401988', 13, 'Vaclav Kotesovec', '2026-11-17', 'The article is not open access, so I am including a link to the arXiv version.'),
    ],
    check(info) {
      if (!info.full) {
        return [];
      }

      const lines = info.of('H');
      const versions = lines.filter(line => ARXIV_LINK.test(line.value));

      return lines
        .filter(line => {
          const doi = line.value.match(DOI_LINK);

          return doi && !OPEN_DOI.test(doi[1]) && !versions.some(version => namesTitle(version.value, plainTitle(doi[2])));
        })
        .map(line =>
          finding(
            line,
            'If the article is not open access (its DOI page shows that) and is on arXiv (search arxiv.org by its title), add its arXiv version beside this line: "<authors>, <a href="https://arxiv.org/abs/<id>"><same title></a>, arXiv:<id> [<class>], <year>."',
          ),
        );
    },
  },
  {
    id: 'bfile-link-text',
    field: 'LINKS',
    text: 'The b-file link reads "Table of n, a(n) for n = a..b", "Rows n = a..b of triangle, flattened" for a triangle read by rows, "Antidiagonals n = a..b, flattened" for an array read by antidiagonals.',
    source: [
      edit('A239264', 27, 'Dawid Ryłko', '2026-10-15', 'the link line of #26, which came with b239264_2.txt, read "Table of n, a(n) for n = 0..1034"; #27 set it back to "Antidiagonals n = 0..44, flattened"'),
    ],
    check(info) {
      if (!info.bFileLink || !info.name) {
        return [];
      }

      const text = (info.bFileLink.value.match(/">([^<]*)<\/a>/) ?? [])[1] ?? '';
      const [pattern, wording] = /read by antidiagonals/i.test(info.name)
        ? [/^Antidiagonals n = \d+\.\.\d+, flattened$/, 'Antidiagonals n = a..b, flattened']
        : /read by rows/i.test(info.name)
          ? [/^Rows n = \d+\.\.\d+ of (?:triangle|irregular triangle), flattened$/, 'Rows n = a..b of triangle, flattened']
          : [/^Table of n, a\(n\) for n = -?\d+\.\.\d+$/, 'Table of n, a(n) for n = a..b'];

      return pattern.test(text) ? [] : [finding(info.bFileLink, `The b-file link should read "${wording}", not "${text}".`)];
    },
  },
  {
    id: 'bfile-link-author',
    field: 'LINKS',
    text: 'The b-file link is credited to the one person who made the file; terms taken from an earlier file are credited after </a>, as "(terms 0..36 from Alois P. Heinz)".',
    source: [
      noted(
        'A239264',
        28,
        'Sean A. Irvine',
        '2026-10-20',
        'Did Alois directly assist in creating these new rows of the b-file? If not, the new b-file should be "Dawid Rylko ..." rather than "Alois P. Heinz and Dawid Rylko"',
      ),
      said('A004003', 156, 'Alois P. Heinz', '2026-03-10', 'Table of n, a(n) for n=1..12000 (terms 1..500 from Jon E. Schoenfield, terms 501..1000 from Chai Wah Wu)'),
    ],
    check(info) {
      if (!info.bFileLink) {
        return [];
      }

      const findings = [];
      const authors = linkAuthors(info.bFileLink.value);
      const after = info.bFileLink.value.split('</a>').slice(1).join('</a>');
      const credit = '(?:(?:first \\d+ terms|terms -?\\d+\\.\\.\\d+|antidiagonals \\d+\\.\\.\\d+|rows \\d+\\.\\.\\d+) from [^,()]+)';

      if (/ and |, /.test(authors)) {
        findings.push(finding(info.bFileLink, `Credit the b-file to the one person who made it, not "${authors}"; earlier terms go in a parenthesis after </a>.`));
      }

      if (after !== '' && !new RegExp(`^ \\(${credit}(?:, ${credit})*\\)$`).test(after)) {
        findings.push(finding(info.bFileLink, `After </a> only a credit such as "(terms 0..36 from Alois P. Heinz)" may follow: "${after}".`));
      }

      return findings;
    },
  },
  {
    id: 'bfile-installed-name',
    field: 'LINKS',
    text: 'Once an entry is approved, its b-file link names b<n>.txt, the name the OEIS server installs the upload under.',
    source: [said('A401673', 9, 'OEIS Server', '2026-11-09', 'Installed first b-file as b401673.txt.')],
    check(info) {
      return info.mode === 'repo' && info.status === 'Approved' && info.bFileLink && /\/b\d{6}_\d+\.txt"/.test(info.bFileLink.value)
        ? [finding(info.bFileLink, `The approved entry links b${info.entry.slice(1)}.txt.`)]
        : [];
    },
  },
  {
    id: 'bfile-credit-kept',
    field: 'LINKS',
    text: 'A new upload keeps the credit that stood after </a> in the b-file line; check the line after every upload.',
    source: [edit('A239264', 36, 'Dawid Ryłko', '2026-11-01', 'the link line of #35, which came with b239264_3.txt, had no credit "(antidiagonals 0..36 from Alois P. Heinz)"; #36 put it back')],
    check(info) {
      if (!info.previous || !info.bFileLink) {
        return [];
      }

      const previous = describe(info.previous, { entry: info.entry });
      const credits = previous.bFileLink ? [...previous.bFileLink.value.matchAll(/\(([^()]* from [^()]+)\)/g)].map(match => match[1]) : [];

      return credits.filter(credit => !info.bFileLink.value.includes(credit)).map(credit => finding(info.bFileLink, `The credit "(${credit})" of the earlier b-file line is gone.`));
    },
  },
  {
    id: 'extensions-unneeded',
    field: 'EXTENSIONS',
    text: "No EXTENSIONS line for terms that are only in the b-file, nor anywhere in one's own new entry.",
    source: [said('A239273', 35, 'Stefano Spezia', '2026-10-15', 'No extension when adding or updating a bfile'), 'SS "Extensions"'],
    check(info) {
      const findings = [];

      for (const line of info.of('E')) {
        const range = line.value.match(/a\((\d+)\)\s*-\s*a\((\d+)\)|a\((\d+)\)/);
        const last = range ? Number(range[2] ?? range[3]) : null;

        if (info.full && info.own) {
          findings.push(finding(line, "One's own new entry has no EXTENSIONS."));
        } else if (last !== null && (!info.full || last > info.offset + info.data.length - 1) && /\bfrom\b/.test(line.value)) {
          findings.push(finding(line, `a(${last}) is not in DATA: terms only in the b-file need no EXTENSIONS.`));
        }
      }

      return findings;
    },
  },
  {
    id: 'signature-name',
    field: 'all',
    text: `The account name is "${ACCOUNT}"; outside LINKS and AUTHOR it appears only as the signature "_${ACCOUNT}_, Mon dd yyyy" that ~~~~ writes.`,
    source: [
      noted('A004003', 161, 'Michel Marcus', '2026-10-15', 'you must sign with ~~~~', 'you must use same name as you registered'),
      edit('A239273', 48, 'Alois P. Heinz', '2026-11-11', '"Dawid Rylko" became "Dawid Ryłko" in the b-file link'),
    ],
    check(info) {
      const findings = [];
      const signed = new RegExp(SIGNED_ACCOUNT, 'g');

      for (const line of info.lines) {
        for (const former of FORMER_ACCOUNTS) {
          if (line.value.includes(former)) {
            findings.push(finding(line, `"${former}" is the former account name: the account is "${ACCOUNT}".`));
          }
        }

        if (!['H', 'A'].includes(line.type) && line.value.replace(signed, '').includes(ACCOUNT)) {
          findings.push(finding(line, `Sign with ~~~~, which writes "_${ACCOUNT}_, Mon dd yyyy".`));
        }
      }

      return findings;
    },
  },
  {
    id: 'signature-dash',
    field: 'COMMENTS, FORMULA, EXAMPLE',
    text: `A comment, formula or example line signed in the edit form ends with " - ${TYPED_SIGNATURE}": the four tildes write only "_Name_, Mon dd yyyy", so the dash before them is typed. A block of lines opens with "From ${TYPED_SIGNATURE}: (Start)" instead.`,
    source: ['SS "Signing your name when you contribute to an existing sequence": in comments, examples and formulae the signature is typically preceded by " - ", and a block of several lines opens with "From ~~~~: (Start)"'],
    check(info) {
      return info
        .of('C', 'F', 'e')
        .filter(line => line.value.includes(TYPED_SIGNATURE) && !TYPED_SIGNATURE_LINE_END.test(line.value) && !line.value.startsWith(`From ${TYPED_SIGNATURE}:`))
        .map(line => finding(line, `Type " - ${TYPED_SIGNATURE}": the four tildes write the name and the date, not the dash.`));
    },
  },
  {
    id: 'signature-own-draft',
    field: 'COMMENTS, FORMULA, PROG, EXAMPLE',
    text: "Lines of one's own entry are not signed while it is a draft.",
    source: ['SS "Programs": "Code should be signed unless it was written by the sequence author as part of the original submission."'],
    check(info) {
      if (!info.full || !info.own || info.status !== 'Proposed') {
        return [];
      }

      const signed = new RegExp(`${SIGNED_ACCOUNT}|${TYPED_SIGNATURE}`);

      return info.lines.filter(line => line.type !== 'A' && signed.test(line.value)).map(line => finding(line, "Drop the signature: the whole draft is the author's."));
    },
  },
  {
    id: 'double-space',
    field: 'all but EXAMPLE',
    text: 'No double space in the text, nor inside a program line after its indentation. The Style Sheet allows two spaces after a sentence, but an editor removed exactly those.',
    source: [edit('A004003', 165, 'Jason Yuen', '2026-10-17', 'double spaces removed in LINKS and MATHEMATICA')],
    check(info) {
      return info.lines
        .filter(line => (PROSE.includes(line.type) && line.value.includes('  ')) || (CODE.includes(line.type) && line.value.trimStart().includes('  ')))
        .map(line => finding(line, 'A double space.'));
    },
  },
  {
    id: 'formula-ie',
    field: 'FORMULA',
    text: 'In a formula an explanation follows "; i.e.," not ", i.e.,".',
    source: [edit('A004003', 167, 'Sean A. Irvine', '2026-10-21', '", i.e.," became "; i.e.,"')],
    check(info) {
      return info
        .of('F')
        .filter(line => line.value.includes(', i.e.,'))
        .map(line => finding(line, 'Write "; i.e.," in a formula.'));
    },
  },
  {
    id: 'formula-commentary',
    field: 'FORMULA',
    text: 'A FORMULA line states the formula; how it compares with another line is not part of it.',
    source: [edit('A004003', 167, 'Sean A. Irvine', '2026-10-21', '"Unlike the resultant formula of Apr 13 2020, this gives a(n) directly ..." removed')],
    check(info) {
      return info
        .of('F')
        .filter(line => /\bunlike\b/i.test(line.value))
        .map(line => finding(line, 'Drop the comparison with other formulas.'));
    },
  },
  {
    id: 'formula-program',
    field: 'FORMULA',
    text: 'A FORMULA stands on its own: a(n) defined through the program ("see PARI program") is the program, which PROG already holds.',
    source: [edit('A402163', 8, 'Andrew Howroyd', '2026-11-16', '"a(n) = (M_{2n}^(2n))[0,0], where M_w is the row transfer matrix ... (see PARI program)." removed')],
    check(info) {
      return info
        .of('F')
        .filter(line => /\bsee (?:the )?(?:[A-Za-z]+ )?program\b|\bsee PROG\b/i.test(line.value))
        .map(line => finding(line, 'A formula that points to the program: describe the method in a PROG comment instead.'));
    },
  },
  {
    id: 'comment-provenance',
    field: 'COMMENTS',
    text: 'COMMENTS do not tell how the terms were computed or cross-checked (which programs agree, primes, the Chinese remainder theorem); that belongs to the linked notebook.',
    source: [edit('A402163', 8, 'Andrew Howroyd', '2026-11-16', '"Terms a(0)-a(7) agree between two transfer-matrix programs, ... so the Chinese remainder theorem gives the exact count." removed')],
    check(info) {
      return info
        .of('C')
        .filter(line => PROVENANCE.test(line.value))
        .map(line => finding(line, 'How the terms were computed or checked: leave it to the notebook the entry links.'));
    },
  },
  {
    id: 'comment-future-proof',
    field: 'COMMENTS, FORMULA',
    text: 'Wording stays true when more terms or digits or another reference are added: a source is cited as "Ryłko (2026)", never as "the Zenodo preprint", and no sentence depends on how many terms or digits are listed.',
    source: [
      noted(
        'A401669',
        4,
        'Sean A. Irvine',
        '2026-11-08',
        'you want to write in a style that it is more future proof, so that is someone later did add more digits your comments would remain valid',
      ),
    ],
    check(info) {
      return info
        .of('C', 'F')
        .filter(line => NOT_FUTURE_PROOF.test(line.value))
        .map(line => finding(line, 'Cite by author and year and drop what depends on the number of listed terms or digits.'));
    },
  },
  {
    id: 'program-shared',
    field: 'PROG',
    level: 'advice',
    text: 'A program shared with a related entry lives in one entry, the lower A-number; the other gets a pointer line such as "a(n) = T(2*n, 2*n); \\\\ T(h, w) defined in A239264."',
    source: [
      said(
        'A239273',
        37,
        'Andrew Howroyd',
        '2026-10-15',
        "Let's keep the program just in A239264. (If you ever improve you only need to edit 1 place and if duplicated it is hard for readers to be certain they are the same.",
      ),
    ],
    check(info) {
      const own = pariDefinitions(info.lines);
      const findings = [];

      for (const other of info.others) {
        if (other.entry >= info.entry) {
          continue;
        }

        const theirs = pariDefinitions(parseEntry(other.text));

        for (const definition of own.filter(item => item.length >= SHARED_DEFINITION && theirs.includes(item))) {
          const name = definition.match(/^[A-Za-z_]\w*/)?.[0] ?? definition.slice(0, 20);
          const line = info.of('o').find(item => item.value.replace(/\s+/g, '').startsWith(`${name}(`)) ?? info.of('o')[0];

          findings.push(finding(line, `${name} is already defined in ${other.entry}: keep it there and point to it, "\\\\ ${name} defined in ${other.entry}."`));
        }
      }

      return findings;
    },
  },
  {
    id: 'example-aligned',
    field: 'EXAMPLE',
    text: 'Rows of numbers in EXAMPLE, a triangle or an array, are aligned on the right: in every column the numbers end at the same position. In rows that end with a semicolon, a row wrapped onto the next line, the first part ending with a comma, is left out.',
    source: [edit('A401673', 6, 'Alois P. Heinz', '2026-11-02', 'the rows of "Triangle begins:" right-aligned by column')],
    check(info) {
      const blocks = [];
      let block = [];

      for (const line of info.lines) {
        if (line.type === 'e' && NUMERIC_ROW.test(line.value)) {
          block.push(line);
        } else {
          blocks.push(block);
          block = [];
        }
      }

      blocks.push(block);

      const groups = blocks.flatMap(rows => {
        if (!rows.some(row => /;\s*$/.test(row.value))) {
          return [rows];
        }

        const parts = [];
        let part = [];
        let wrapped = false;

        for (const row of rows) {
          const continued = wrapped;

          wrapped = /,\s*$/.test(row.value);

          if (wrapped || continued) {
            parts.push(part);
            part = [];
          } else {
            part.push(row);
          }
        }

        return [...parts, part];
      });

      return groups
        .filter(rows => rows.length > 1)
        .flatMap(rows => {
          const ends = rows.map(row => [...row.value.matchAll(/-?\d+/g)].map(match => match.index + match[0].length));

          for (let index = 1; index < rows.length; index++) {
            const column = ends[index].findIndex((end, position) => ends.slice(0, index).some(above => above[position] !== undefined && above[position] !== end));

            if (column !== -1) {
              return [finding(rows[index], `Column ${column + 1} ends at position ${ends[index][column]} here but elsewhere in the rows above: align the rows on the right.`)];
            }
          }

          return [];
        });
    },
  },
  {
    id: 'non-ascii',
    field: 'all',
    text: 'Mathematical text is ASCII: X, -, <=, ..., ->, sqrt, Pi; names keep their own letters.',
    source: ['SS "Non-ASCII characters": "Don\'t use non-ASCII characters in mathematical text!", titles and names excepted'],
    check(info) {
      return info
        .of(...PROSE.filter(type => type !== 'D'), 'e', ...CODE)
        .filter(line => NON_ASCII_MATH.test(withoutTitles(line)))
        .map(line => finding(line, `A non-ASCII symbol: ${withoutTitles(line).match(NON_ASCII_MATH)[0]}`));
    },
  },
  {
    id: 'spelling',
    field: 'all but REFERENCES and titles',
    text: 'The spellings of the Style Sheet: US English (behavior, color, neighbor, labeled), nonnegative and the other non- words closed, proved, zeros, n-th.',
    source: ['SS "Spelling and notation"'],
    check(info) {
      return info
        .of('N', 'C', 'H', 'F', 'e', 'Y', 'E')
        .filter(line => MISSPELLED.test(withoutTitles(line)))
        .map(line => finding(line, `Spelling of the Style Sheet: ${withoutTitles(line).match(MISSPELLED)[0]}`));
    },
  },
  {
    id: 'common-mistakes',
    field: 'NAME, COMMENTS',
    text: 'No "counts the number of".',
    source: ['SS "Common mistakes in English"'],
    check(info) {
      return info
        .of('N', 'C')
        .filter(line => /\bcounts the number of\b/i.test(line.value))
        .map(line => finding(line, '"counts the number of": write "counts" or "is the number of".'));
    },
  },
  {
    id: 'references-online',
    field: 'REFERENCES',
    text: 'A reference that is online is in LINKS: a URL, a DOI, arXiv, Zenodo, or a journal that exists only online. It may stay in REFERENCES too, which the Style Sheet calls "perfectly normal", once a LINKS line names its first author.',
    source: [said('A004003', 73, 'Michel Marcus', '2016', 'Moved refs to links'), 'SS "References": "References to books, journal papers, and other material not found online."'],
    check(info) {
      return info
        .of('D')
        .filter(line => {
          const surname = line.value.split(',')[0].trim().split(/\s+/).pop();

          return ONLINE_ONLY.test(line.value) && !info.of('H').some(link => linkAuthors(link.value).includes(surname));
        })
        .map(line => finding(line, 'An online reference without its LINKS line: add it to LINKS with its link.'));
    },
  },
];

const APPROVED_AS_IS = 'approved with it, and the copy keeps the published text';
const SYNCED_AFTER_APPROVAL = 'the copy of a draft is synced only after approval';
const ACCEPTED = [
  {
    entry: 'A239273',
    rule: 'signature-name',
    match: '_Dawid Rylko_',
    reason: 'the published PROG line still signs "_Dawid Rylko_" (#41); Alois P. Heinz renamed only the b-file link (#48)',
  },
  {
    entry: 'A401670',
    rule: 'comment-provenance',
    match: 'agree between two transfer-matrix programs',
    reason: `${APPROVED_AS_IS} (#6, Sean A. Irvine, 2026-11-09), before Andrew Howroyd removed the same comment from A402163`,
  },
  {
    entry: 'A401670',
    rule: 'formula-program',
    match: 'trace(M_{2n}^(2n))',
    reason: `${APPROVED_AS_IS} (#6, Sean A. Irvine, 2026-11-09), before Andrew Howroyd removed the same formula from A402163`,
  },
  {
    entry: 'A401670',
    rule: 'links-notes-canonical',
    match: 'notes/tori.html',
    reason: "the published link names notes/tori.html, Jason Yuen's fix (#4); the notebook has since moved to notes/domicules/tori.html, to which tori.html redirects",
  },
  {
    entry: 'A401673',
    rule: 'comment-provenance',
    match: 'come from a transfer matrix in exact integers',
    reason: `${APPROVED_AS_IS} (#8, Sean A. Irvine, 2026-11-09), before Andrew Howroyd removed the same comment from A402163`,
  },
  {
    entry: 'A401673',
    rule: 'links-notes-canonical',
    match: 'notes/diagonals.html',
    reason: 'the published link names notes/diagonals.html, which redirects to notes/domicules/rectangles-by-diagonal-pieces.html',
  },
  {
    entry: 'A401988',
    rule: 'comment-provenance',
    match: 'A transfer matrix in exact integers gives the same terms.',
    reason: `the sentence is still in the live draft (#12); ${SYNCED_AFTER_APPROVAL}`,
  },
  {
    entry: 'A402163',
    rule: 'comment-provenance',
    match: 'agree between two transfer-matrix programs',
    reason: `Andrew Howroyd removed the comment from the live draft (#8); ${SYNCED_AFTER_APPROVAL}`,
  },
  {
    entry: 'A402163',
    rule: 'formula-program',
    match: '(M_{2n}^(2n))[0,0]',
    reason: `Andrew Howroyd removed the formula from the live draft (#8); ${SYNCED_AFTER_APPROVAL}`,
  },
];

function leadingPeople(authors) {
  const people = [];

  for (const part of authors.split(', ')) {
    if (AUTHOR_SUFFIX.test(part) && people.length > 0) {
      people[people.length - 1] += `, ${part}`;
    } else if (PERSON.test(part)) {
      people.push(part);
    } else {
      break;
    }
  }

  return people;
}

function withoutTitles(line) {
  return line.type === 'H' ? line.value.replace(/<a [^>]*>[\s\S]*?<\/a>/g, '<a></a>') : line.value;
}

function finding(line, message, level) {
  return { line: line?.number ?? null, text: line ? `%${line.type} ${line.value}` : null, message, ...(level ? { level } : {}) };
}

function displayWidth(terms) {
  return terms.join(', ').length;
}

function termAt(info, n) {
  if (info.bFile) {
    return info.bFile.find(([index]) => Number(index) === n)?.[1];
  }

  return info.data[n - info.offset];
}

function knownTerms(info) {
  return info.bFile ? info.bFile.map(([, term]) => term) : info.data;
}

function rowLength(info) {
  const range = info.name.match(/\b([01]) <= k <= ([^,.;]+?)(?=[,.;]|$)/);

  if (range) {
    return row => {
      const upper = evaluate(range[2], row);

      return upper === null ? NaN : upper - Number(range[1]) + 1;
    };
  }

  if (/read by antidiagonals/i.test(info.name) || info.keywords.has('tabl')) {
    return row => row - info.offset + 1;
  }

  return null;
}

function evaluate(expression, n) {
  const source = expression.replace(/\s+/g, '');
  const tokens = source.match(/floor|\d+|n|[-+*/^()]/g) ?? [];

  if (tokens.join('') !== source) {
    return null;
  }

  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const atom = () => {
    const token = take();

    if (token === 'floor' && take() === '(') {
      const value = Math.floor(sum());

      return take() === ')' ? value : NaN;
    }

    if (token === '(') {
      const value = sum();

      return take() === ')' ? value : NaN;
    }

    return token === 'n' ? n : /^\d+$/.test(token ?? '') ? Number(token) : NaN;
  };
  const unary = () => (peek() === '-' ? (take(), -unary()) : atom());
  const power = () => {
    const base = unary();

    return peek() === '^' ? (take(), base ** power()) : base;
  };
  const product = () => {
    let value = power();

    while (['*', '/', 'n', '(', 'floor'].includes(peek())) {
      const operator = peek() === '*' || peek() === '/' ? take() : '*';
      const factor = power();

      value = operator === '/' ? value / factor : value * factor;
    }

    return value;
  };
  const sum = () => {
    let value = product();

    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const term = product();

      value = operator === '+' ? value + term : value - term;
    }

    return value;
  };
  const value = sum();

  return position === tokens.length && Number.isInteger(value) ? value : null;
}

function plainTitle(text) {
  return decodeHtml(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function namesTitle(value, title) {
  const lead = plainTitle(linkAuthors(value));

  return lead.endsWith(` ${title}`) || [...value.matchAll(/<a [^>]*>([^<]*)<\/a>/g)].some(([, text]) => plainTitle(text) === title);
}

function linkAuthors(value) {
  return value.split('<a ')[0].replace(/,\s*$/, '').trim();
}

function lastName(value) {
  const authors = linkAuthors(value);
  const world = authors.match(/^(.*)'s World of Mathematics$/);
  const first = (world ? world[1] : authors).split(/, | and /)[0].trim();

  return (
    first
      .split(/\s+/)
      .filter(part => !/^(?:Jr\.?|Sr\.?|II|III)$/.test(part))
      .pop() ?? ''
  );
}

function sortKey(line) {
  return lastName(line.value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .toLowerCase();
}

function splitDefinitions(program) {
  const definitions = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < program.length; i++) {
    const character = program[i];

    if (character === '"') {
      let end = i + 1;

      while (end < program.length && program[end] !== '"') {
        end += program[end] === '\\' ? 2 : 1;
      }

      current += program.slice(i, end + 1);
      i = end;
    } else if (program.startsWith('\\\\', i)) {
      i = program.indexOf('\n', i) === -1 ? program.length : program.indexOf('\n', i) - 1;
    } else if (program.startsWith('/*', i)) {
      i = program.indexOf('*/', i) === -1 ? program.length : program.indexOf('*/', i) + 1;
    } else if (character === ';' && depth === 0) {
      definitions.push(current);
      current = '';
    } else if (!/\s/.test(character)) {
      depth += '({['.includes(character) ? 1 : ')}]'.includes(character) ? -1 : 0;
      current += character;
    }
  }

  return [...definitions, current].filter(Boolean);
}

function pariDefinitions(lines) {
  const programs = lines.filter(line => line.type === 'o').map(line => line.value);
  const blocks = [];
  let block = null;

  for (const line of programs) {
    if (/^\([A-Za-z][^)]*\) /.test(line)) {
      block = line.startsWith('(PARI) ') ? [line.slice('(PARI) '.length)] : null;

      if (block) {
        blocks.push(block);
      }
    } else if (block) {
      block.push(line);
    }
  }

  return blocks.flatMap(lines => splitDefinitions(lines.join('\n')));
}

function parseEntry(text) {
  return text
    .replace(/\n+$/, '')
    .split('\n')
    .map((line, index) => {
      const match = line.match(/^%(\w) (A\d{6})(?: (.*))?$/);

      return match ? { type: match[1], entry: match[2], value: match[3] ?? '', number: index + 1 } : null;
    })
    .filter(Boolean);
}

function describe(text, options = {}) {
  const lines = parseEntry(text);
  const entry = options.entry ?? lines[0]?.entry;
  const of = (...types) => lines.filter(line => types.includes(line.type));
  const data = of('S', 'T', 'U')
    .map(line => line.value)
    .join('')
    .split(',')
    .filter(Boolean);
  const keywords = new Set((of('K')[0]?.value ?? '').split(',').filter(Boolean));
  const bFilePattern = new RegExp(`href="/${entry}/b${entry?.slice(1)}(?:_\\d+)?\\.txt"`);

  return {
    entry,
    lines,
    of,
    data,
    full: data.length > 0,
    keywords,
    table: keywords.has('tabl') || keywords.has('tabf'),
    offset: Number((of('O')[0]?.value ?? '0').split(',')[0]),
    name: of('N')[0]?.value ?? '',
    own: (of('A')[0]?.value ?? '').startsWith(`_${ACCOUNT}_`),
    bFileLink: of('H').find(line => bFilePattern.test(line.value)) ?? null,
    mode: options.mode ?? 'repo',
    status: options.status ?? null,
    bFile: options.bFile ?? null,
    previous: options.previous ?? null,
    others: options.others ?? [],
    notes: options.notes ?? null,
  };
}

function lintEntry(text, options = {}) {
  const info = describe(text, options);

  return RULES.flatMap(rule => rule.check(info).map(result => ({ entry: info.entry, rule: rule.id, level: rule.level ?? 'defect', ...result })));
}

function listEntries() {
  return fs
    .readdirSync(OEIS_DIRECTORY)
    .filter(name => ENTRY_PATTERN.test(name))
    .sort();
}

function readEntryText(entry) {
  return fs.readFileSync(path.join(OEIS_DIRECTORY, entry, `${entry}.txt`), 'utf-8');
}

function readStatus(entry) {
  const readme = fs.readFileSync(path.join(OEIS_DIRECTORY, entry, 'README.md'), 'utf-8');

  return (readme.match(/## Status\n\n(Approved|Proposed) /) ?? [])[1] ?? null;
}

function parseBFile(text) {
  return text
    .replace(/\n+$/, '')
    .split('\n')
    .filter(line => line.trim() !== '' && !line.startsWith('#'))
    .map(line => line.trim().split(/\s+/));
}

function readBFile(entry) {
  const file = path.join(OEIS_DIRECTORY, entry, `b${entry.slice(1)}.txt`);

  return fs.existsSync(file) ? parseBFile(fs.readFileSync(file, 'utf-8')) : null;
}

function readNotes() {
  const { NAV, NOTE_REDIRECTS } = require('../site/chrome');
  const pages = NAV.flatMap(group => [group, ...(group.items ?? [])])
    .map(item => item.slug)
    .filter(Boolean);
  const redirects = Object.fromEntries(Object.entries(NOTE_REDIRECTS).map(([from, { to }]) => [from, to]));

  return { pages, redirects };
}

function repoOptions(entry, notes = readNotes()) {
  const inRepository = listEntries().includes(entry);

  return {
    entry,
    mode: 'repo',
    status: inRepository ? readStatus(entry) : null,
    bFile: inRepository ? readBFile(entry) : null,
    others: listEntries()
      .filter(other => other !== entry)
      .map(other => ({ entry: other, text: readEntryText(other) })),
    notes,
  };
}

function lintRepository() {
  const notes = readNotes();

  return listEntries().flatMap(entry => lintEntry(readEntryText(entry), repoOptions(entry, notes)));
}

function decodeHtml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);|&#x([0-9a-f]+);/gi, (match, decimal, hex) => {
      const code = decimal ? Number(decimal) : parseInt(hex, 16);

      return code === 160 ? ' ' : String.fromCodePoint(code);
    })
    .replace(/&amp;/g, '&');
}

function parseDraftPage(html, entry) {
  const marker = html.indexOf('All edits since published version');

  if (marker === -1) {
    return null;
  }

  const values = {};

  for (const [, name, body] of html.slice(marker).matchAll(/<div class=sectname>([^<]+)<\/div>\s*<div class=sectbody>([\s\S]*?)<\/div>/g)) {
    const type = SECTION_TYPES[name.trim()];

    if (!type || values[type]) {
      continue;
    }

    values[type] = [...body.matchAll(/<p class="diffs"><tt>([\s\S]*?)<\/tt><\/p>/g)]
      .map(([, cell]) =>
        decodeHtml(
          cell
            .replace(/(\s<\/ins>)<ins>\s+<\/ins>/g, '$1')
            .replace(/<del>[\s\S]*?<\/del>/g, '')
            .replace(/<a href="\/wiki\/User:[^"]*">([^<]*)<\/a>/g, '_$1_')
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<[^>]+>/g, ''),
        ).trimEnd(),
      )
      .flatMap(value => value.split('\n'))
      .filter(value => value.trim() !== '');
  }

  for (const type of ['S', 'K', 'O']) {
    if (values[type]) {
      values[type] = [values[type].join('').replace(/\s+/g, '')];
    }
  }

  return LINE_ORDER.split('')
    .flatMap(type => (values[type] ?? []).map(value => `%${type} ${entry} ${value}`))
    .join('\n')
    .concat('\n');
}

function acceptedFor(result, accepted = ACCEPTED) {
  return accepted.find(item => item.entry === result.entry && item.rule === result.rule && (result.text ?? '').includes(item.match)) ?? null;
}

function classify(result, accepted = ACCEPTED) {
  return acceptedFor(result, accepted) ? 'accepted' : result.level;
}

function formatFindings(results, accepted = ACCEPTED) {
  return results.map(result => {
    const known = acceptedFor(result, accepted);

    return `${result.entry} ${classify(result, accepted)} [${result.rule}] line ${result.line ?? '-'}: ${result.message}${known ? ` (${known.reason})` : ''}`;
  });
}

function summarize(results, accepted = ACCEPTED) {
  const count = level => results.filter(result => classify(result, accepted) === level).length;

  return `${count('defect')} defect(s), ${count('advice')} advice, ${count('note')} note(s), ${count('accepted')} accepted, against ${RULES.length} rules.`;
}

async function readDraftHtml(entry, file) {
  if (file) {
    return fs.readFileSync(file === '-' ? 0 : file, 'utf-8');
  }

  const url = `https://oeis.org/draft/${entry}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) }).catch(error => {
    throw new Error(`${url} could not be fetched (${error.cause?.message ?? error.message}); save the page with curl and pass the file.`);
  });

  if (!response.ok) {
    throw new Error(`${url} answered HTTP ${response.status}`);
  }

  return response.text();
}

function readRelated(files) {
  const lines = files.flatMap(file => parseEntry(fs.readFileSync(file, 'utf-8')));
  const entries = [...new Set(lines.map(line => line.entry))];

  return entries.map(entry => ({
    entry,
    live: true,
    text: lines
      .filter(line => line.entry === entry)
      .map(line => `%${line.type} ${line.entry} ${line.value}`)
      .join('\n'),
  }));
}

function parseArguments(argv) {
  const flags = { print: false, related: [] };
  const positional = [];

  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--print') {
      flags.print = true;
    } else if (argv[index] === '--related') {
      if (!argv[index + 1] || argv[index + 1].startsWith('--')) {
        flags.invalid = true;
      } else {
        flags.related.push(argv[++index]);
      }
    } else {
      positional.push(argv[index]);
    }
  }

  return { flags, positional };
}

function withoutSystemKeywords(text) {
  return text.replace(/^(%K A\d{6} )(.*)$/m, (line, prefix, value) =>
    prefix.concat(
      value
        .split(',')
        .filter(keyword => !SYSTEM_KEYWORDS.includes(keyword))
        .join(','),
    ),
  );
}

const USAGE = [
  'Usage:',
  '  node oeis/editorRules.js [A<number>]',
  '  node oeis/editorRules.js --draft A<number> [draft page .html | -] [--related <file>]... [--print]',
  '  node oeis/editorRules.js --file <entry text> [b-file] [--related <file>]... [--print]',
  '  node oeis/editorRules.js --rules',
].join('\n');

async function lintDraft(mode, target, extra, flags) {
  let text;
  let entry;
  let bFile;

  if (mode === '--draft') {
    entry = target;

    if (!ENTRY_PATTERN.test(entry ?? '')) {
      console.error(USAGE);

      return 2;
    }

    text = parseDraftPage(await readDraftHtml(entry, extra), entry);

    if (!text) {
      console.error(`No "All edits since published version" block on the draft page of ${entry}.`);

      return 2;
    }
  } else {
    if (!target) {
      console.error(USAGE);

      return 2;
    }

    text = fs.readFileSync(target, 'utf-8');
    entry = parseEntry(text)[0]?.entry;

    if (!entry) {
      console.error(`${target} holds no line of the form "%<type> A<number> <text>".`);

      return 2;
    }

    bFile = extra ? parseBFile(fs.readFileSync(extra, 'utf-8')) : undefined;
  }

  if (flags.print) {
    process.stdout.write(withoutSystemKeywords(text));
  }

  const repository = repoOptions(entry);
  const related = readRelated(flags.related);
  const options = {
    ...repository,
    mode: 'draft',
    status: 'Proposed',
    previous: listEntries().includes(entry) ? readEntryText(entry) : null,
    others: [...repository.others.filter(other => !related.some(item => item.entry === other.entry)), ...related],
  };

  if (bFile) {
    options.bFile = bFile;
  }

  const results = lintEntry(text, options);
  const report = flags.print ? console.error : console.log;

  formatFindings(results, []).forEach(line => report(line));

  if (!options.bFile) {
    report(`No b-file for ${entry}: data-fill and data-rows could not look past DATA; pass the b-file with --file <entry text> <b-file>.`);
  }

  report(summarize(results, []));

  return results.some(result => result.level === 'defect') ? 1 : 0;
}

async function main(argv) {
  const { flags, positional } = parseArguments(argv);
  const [mode, target, extra] = positional;

  if (flags.invalid) {
    console.error(`--related needs the path of a saved entry text.\n${USAGE}`);

    return 2;
  }

  if (mode === '--rules') {
    RULES.forEach(rule => console.log(`${rule.id} (${rule.field}${rule.level ? `, ${rule.level}` : ''}): ${rule.text}\n  source: ${rule.source.join('; ')}`));

    return 0;
  }

  if (mode === '--draft' || mode === '--file') {
    return lintDraft(mode, target, extra, flags);
  }

  if (mode !== undefined && (!ENTRY_PATTERN.test(mode) || target !== undefined)) {
    console.error(USAGE);

    return 2;
  }

  if (mode !== undefined && !listEntries().includes(mode)) {
    console.error(`No entry ${mode} in oeis/: the entries are ${listEntries().join(', ')}.`);

    return 2;
  }

  const results = lintRepository().filter(result => !mode || result.entry === mode);

  formatFindings(results).forEach(line => console.log(line));
  console.log(summarize(results));

  return results.some(result => classify(result) === 'defect') ? 1 : 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    code => {
      process.exitCode = code;
    },
    error => {
      console.error(error.message);
      process.exitCode = 2;
    },
  );
}

module.exports = {
  ACCEPTED,
  DATA_WIDTH,
  RULES,
  classify,
  decodeHtml,
  describe,
  evaluate,
  lintEntry,
  lintRepository,
  parseBFile,
  parseDraftPage,
  parseEntry,
  readNotes,
  repoOptions,
  splitDefinitions,
};
