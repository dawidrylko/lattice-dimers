const fs = require('fs');
const os = require('os');
const path = require('path');
const { filesInt, testCasesInt, filesBigInt, testCasesBigInt, filesDomicule, testCasesDomicule } = require('../data');
const { DOMICULE_SWEEPS } = require('../src/renderer');
const domiculeModular = require('../src/solvers/domiculeTilingSolver-Modular.js');
const { renderNote, listNotes, NOTES_DIRECTORY } = require('./notes');
const { CHROME_CSS, renderHeader, renderFooter } = require('./chrome');

const SITE_URL = 'https://dawidrylko.github.io/lattice-dimers/';
const REPOSITORY_TREE_URL = 'https://github.com/dawidrylko/lattice-dimers/tree/master';
const ROOT_DIRECTORY = path.join(__dirname, '..');
const OUTPUT_DIRECTORY = path.join(ROOT_DIRECTORY, 'dist', 'site');
const BENCHMARK_ROOT = 'benchmarks/results';
const RESULT_FILE = /_(\d+)x(\d+)\.txt$/;
const BENCHMARK_RUNS = listBenchmarkRuns();
const BENCHMARK_RUN = findLatestCompleteRun();
const BENCHMARK_DIRECTORY = path.join(ROOT_DIRECTORY, BENCHMARK_ROOT, BENCHMARK_RUN);
const BROWSER_SCRIPTS = ['src/renderer/svg.js'];
const WORKER_SCRIPTS = ['src/renderer/unrank.js', 'src/renderer/cftp.js', 'src/renderer/domicule.js', 'site/worker.js'];
const ASSETS = {
  'dimer.svg': '.github/assets/dimer.svg',
  'apple-touch-icon.png': '.github/assets/apple-touch-icon.png',
  'og-image.png': '.github/assets/og-image.png',
  'papers/king-entropy.pdf': 'research/king-entropy/paper/king-entropy.pdf',
  'papers/king-entropy-log-convexity.pdf': 'research/king-entropy/paper/king-entropy-log-convexity.pdf',
};
const RESEARCH_DATA = 'research/king-entropy/data';
const PAPERS = [
  { title: "The dimer entropy of the king's graph", file: 'papers/king-entropy.pdf' },
  { title: "Log-convexity of strip dimer counts on the king's graph", file: 'papers/king-entropy-log-convexity.pdf' },
];
const AUTHOR = {
  '@type': 'Person',
  name: 'Dawid Ryłko',
  url: 'https://dawidrylko.com',
};
const GALLERY_BOARDS = [
  { rowCount: 2, colCount: 2 },
  { rowCount: 4, colCount: 4 },
  { rowCount: 6, colCount: 6 },
  { rowCount: 8, colCount: 8 },
  { rowCount: 10, colCount: 10 },
  { rowCount: 12, colCount: 12 },
  { rowCount: 14, colCount: 14, memory: '60 MB' },
  { rowCount: 16, colCount: 16, memory: '250 MB' },
  { rowCount: 18, colCount: 18, memory: '1.1 GB', confirm: true },
  { rowCount: 20, colCount: 20, mode: 'random' },
];
const DOMICULE_BOARDS = [
  { rowCount: 2, colCount: 2 },
  { rowCount: 4, colCount: 4 },
  { rowCount: 6, colCount: 6 },
  { rowCount: 8, colCount: 8 },
  { rowCount: 10, colCount: 10 },
  { rowCount: 12, colCount: 12 },
  { rowCount: 14, colCount: 14, memory: '200 MB' },
  { rowCount: 16, colCount: 16, memory: '1 GB', confirm: true },
  { rowCount: 18, colCount: 18, mode: 'random' },
  { rowCount: 20, colCount: 20, mode: 'random' },
];
const DEFAULT_BOARD = '4x4';
const REPOSITORY_BLOB_URL = 'https://github.com/dawidrylko/lattice-dimers/blob/master';
const NOTE_PROVENANCE = {
  research: 'every output on this page was read from the committed research data, checked or computed during that build.',
};
const NOTE_SUMMARIES = {
  research: "The entropy per site of the king's graph dimers: an estimate with error bar 6·10⁻¹⁶, rigorous bounds, the surface and corner free energies, and the asymptotics of A239273.",
  method: 'How the tilings are counted, numbered and sampled, and how every number is checked.',
  a004003: 'Notebook: domino tilings by three methods, the resultant and the running time.',
  a239273: 'Notebook: domicule tilings up to 20 × 20, the modular solver and the Markov chain.',
};

function listBenchmarkRuns() {
  return fs
    .readdirSync(path.join(ROOT_DIRECTORY, BENCHMARK_ROOT))
    .filter(name => /^\d{4}-\d{2}$/.test(name))
    .sort()
    .reverse();
}

function resultFileName(fileName, { rowCount, colCount }) {
  return `${fileName}_${rowCount}x${colCount}.txt`;
}

function isCompleteRun(run) {
  const lastInt = testCasesInt[testCasesInt.length - 1];
  const lastBigInt = testCasesBigInt[testCasesBigInt.length - 1];
  const requiredFiles = [
    'environment.json',
    ...filesInt.map(fileName => resultFileName(fileName, lastInt)),
    ...filesBigInt.map(fileName => resultFileName(fileName, lastBigInt)),
    ...filesDomicule.map(fileName => resultFileName(fileName, { rowCount: 16, colCount: 16 })),
    ...filesDomicule.map(fileName => resultFileName(fileName, { rowCount: 20, colCount: 20 })),
  ];

  return requiredFiles.every(file => fs.existsSync(path.join(ROOT_DIRECTORY, BENCHMARK_ROOT, run, file)));
}

function findLatestCompleteRun() {
  const run = BENCHMARK_RUNS.find(isCompleteRun);

  if (!run) {
    throw new Error(
      `No complete benchmarks/results/YYYY-MM directory: one needs environment.json and every solver's largest board.`,
    );
  }

  return run;
}

function describeRun(run) {
  const directory = path.join(ROOT_DIRECTORY, BENCHMARK_ROOT, run);
  const environment = readEnvironment(directory) || {};
  const runs = fs
    .readdirSync(directory)
    .filter(fileName => RESULT_FILE.test(fileName))
    .map(fileName => readAverageTime(directory, fileName).runs);
  const most = Math.max(...runs);
  const month = new Date(`${run}-01T00:00:00Z`).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return [
    environment.date || month,
    `${runs.every(count => count === most) ? '' : 'up to '}${most.toLocaleString('en-US')} runs per board`,
    environment.node && `Node.js ${environment.node}`,
    environment.cpu || 'machine not recorded',
  ]
    .filter(Boolean)
    .join(', ');
}

function buildOlderBenchmarks() {
  const links = BENCHMARK_RUNS.filter(run => run !== BENCHMARK_RUN).map(
    run => `<a href="${REPOSITORY_TREE_URL}/${BENCHMARK_ROOT}/${run}">${BENCHMARK_ROOT}/${run}</a> (${describeRun(run)})`,
  );

  if (!links.length) {
    return '';
  }

  const list = links.length === 1 ? links[0] : `${links.slice(0, -1).join(', ')} and ${links[links.length - 1]}`;

  return `Other measurements are kept in ${list}.`;
}

function countTilings(board) {
  const testCase = testCasesBigInt.find(
    t => t.rowCount === board.rowCount && t.colCount === board.colCount,
  );

  if (!testCase) {
    throw new Error(`No expected result in data/ for ${board.rowCount}x${board.colCount}.`);
  }

  return testCase.expectedResult;
}

const domiculeCounts = new Map();

/**
 * Counts the domicule tilings of a board once per build: from data/ when the term is
 * known there, otherwise with the modular solver. The gallery and the notebooks share the result.
 * @param {Object} board The board.
 * @returns {Promise<string>} The number of tilings.
 */
function countDomiculeTilings({ rowCount, colCount }) {
  const key = `${rowCount}x${colCount}`;

  if (!domiculeCounts.has(key)) {
    const known = testCasesDomicule.find(t => t.rowCount === rowCount && t.colCount === colCount);

    domiculeCounts.set(
      key,
      known
        ? Promise.resolve(known.expectedResult)
        : domiculeModular
            .calculateTotalTilingCombinations({ rowCount, colCount, jobs: os.availableParallelism() })
            .then(String),
    );
  }

  return domiculeCounts.get(key);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function readAverageTime(directory, fileName) {
  const file = path.join(directory, fileName);

  if (!fs.existsSync(file)) {
    return null;
  }

  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  const match = lines[0].match(/Average Execution Time: ([\d.]+) ms/);

  return {
    average: match ? Number(match[1]) : null,
    runs: lines.filter(line => /^\d+\. Execution Time/.test(line)).length,
  };
}

function buildBenchmark() {
  const tilingsBySize = new Map(
    testCasesBigInt.map(t => [`${t.rowCount}x${t.colCount}`, t.expectedResult]),
  );
  const sizes = fs
    .readdirSync(BENCHMARK_DIRECTORY)
    .map(fileName => fileName.match(RESULT_FILE))
    .filter(Boolean)
    .map(([, rowCount, colCount]) => ({
      rowCount: Number(rowCount),
      colCount: Number(colCount),
    }))
    .filter(
      (size, index, all) =>
        all.findIndex(
          s => s.rowCount === size.rowCount && s.colCount === size.colCount,
        ) === index,
    )
    .sort((a, b) => a.rowCount * a.colCount - b.rowCount * b.colCount);

  return sizes.map(({ rowCount, colCount }) => {
    const suffix = `_${rowCount}x${colCount}.txt`;
    return {
      rowCount,
      colCount,
      tilings: tilingsBySize.get(`${rowCount}x${colCount}`) ?? null,
      number: readAverageTime(BENCHMARK_DIRECTORY, `dominoTilingSolver.js${suffix}`),
      bigint: readAverageTime(BENCHMARK_DIRECTORY, `dominoTilingSolver-BigInt.js${suffix}`),
      formula: readAverageTime(BENCHMARK_DIRECTORY, `dominoTilingSolver-Formula.js${suffix}`),
    };
  });
}

function buildDomiculeBenchmark(totals) {
  const prefix = 'domiculeTilingSolver-';

  return fs
    .readdirSync(BENCHMARK_DIRECTORY)
    .filter(fileName => fileName.startsWith(prefix))
    .map(fileName => fileName.match(RESULT_FILE))
    .filter(Boolean)
    .map(([, rowCount, colCount]) => `${rowCount}x${colCount}`)
    .filter((size, index, all) => all.indexOf(size) === index)
    .map(size => size.split('x').map(Number))
    .sort(([a], [b]) => a - b)
    .map(([rowCount, colCount]) => {
      const suffix = `_${rowCount}x${colCount}.txt`;
      return {
        rowCount,
        colCount,
        tilings: totals.get(`${rowCount}x${colCount}`) ?? null,
        bigint: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}BigInt.js${suffix}`),
        modular: readAverageTime(BENCHMARK_DIRECTORY, `${prefix}Modular.js${suffix}`),
      };
    });
}

function readEnvironment(directory) {
  const file = path.join(directory, 'environment.json');

  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null;
}

/**
 * Rounds a decimal string to nearest at a given number of decimals, exactly (no floating point).
 * @param {string} value The decimal, such as '0.56551191104132531763'.
 * @param {number} digits The number of decimals to keep.
 * @returns {string} The rounded decimal.
 */
function roundDecimal(value, digits) {
  const [whole, fraction = ''] = value.split('.');
  const scaled = BigInt(whole + fraction.padEnd(digits + 1, '0').slice(0, digits + 1));
  const rounded = String((scaled + BigInt(5)) / BigInt(10)).padStart(digits + 1, '0');

  return `${rounded.slice(0, -digits)}.${rounded.slice(-digits)}`;
}

/**
 * Reads the headline results of research/king-entropy from its committed data, so the main page
 * quotes the same numbers as the paper and the research note.
 * @returns {{ s: string, ds: string, lower: string, upper: string }} The estimate of s, its error bar and the proved bounds.
 */
function readResearchResults() {
  const read = file => JSON.parse(fs.readFileSync(path.join(ROOT_DIRECTORY, RESEARCH_DATA, file), 'utf-8'));
  const { s, err } = read('errbar.json').recommended;
  const widest = table => table[Math.max(...Object.keys(table).map(Number))];
  const [mantissa, exponent] = Number(err).toExponential(0).split('e');
  const superscript = [...exponent].map(c => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)] || '').join('');

  return {
    s: roundDecimal(s, 16),
    ds: `${mantissa}·10${superscript}`,
    lower: String(widest(read('bounds.json').lower)).slice(0, 14),
    upper: widest(read('runweight_3state.json')).upper,
  };
}

function buildJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}#website`,
        url: SITE_URL,
        name: 'Lattice Dimers',
        inLanguage: 'en',
        author: AUTHOR,
      },
      {
        '@type': 'SoftwareSourceCode',
        name: 'Lattice Dimers',
        description:
          "Code and data on dimers of the square lattice and the king's graph: transfer-matrix scripts, certificates and data for the entropy per site of the king's graph dimers, and exact counts, numbering and sampling of domino tilings (OEIS A004003) and domicule tilings (OEIS A239264, A239273): a resultant form of the product formula, transfer-matrix solvers, a modular solver with the Chinese remainder theorem, PARI/GP programs and notebooks.",
        codeRepository: 'https://github.com/dawidrylko/lattice-dimers',
        programmingLanguage: ['JavaScript', 'Python'],
        runtimePlatform: 'Node.js',
        license: 'https://opensource.org/licenses/MIT',
        keywords: "dimer model, king's graph, entropy per site, transfer matrix, domino tiling, domicule tiling, perfect matchings, OEIS A004003, OEIS A239264, OEIS A239273, combinatorics",
        author: AUTHOR,
        isBasedOn: 'https://oeis.org/A004003',
        subjectOf: {
          '@type': 'BlogPosting',
          url: 'https://dawidrylko.com/domino-tiling/',
          inLanguage: 'pl',
          author: AUTHOR,
        },
      },
      ...PAPERS.map(paper => ({
        '@type': 'ScholarlyArticle',
        headline: paper.title,
        url: `${SITE_URL}${paper.file}`,
        ...(paper.identifier && { identifier: paper.identifier }),
        encodingFormat: 'application/pdf',
        datePublished: '2026-10',
        inLanguage: 'en',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        about: "perfect matchings of the king's graph",
        isBasedOn: 'https://oeis.org/A239264',
        author: AUTHOR,
      })),
    ],
  };
}

function buildSitemap(notes) {
  const today = new Date().toISOString().slice(0, 10);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...['', ...notes.map(({ slug }) => `notes/${slug}.html`)].map(
      page => `  <url><loc>${SITE_URL}${page}</loc><lastmod>${today}</lastmod></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');
}

function resolveNoteLink(target, notes) {
  if (/^[a-z]+:/.test(target) || target.startsWith('#')) {
    return target;
  }

  const note = notes.find(({ file }) => file === target);

  if (note) {
    return `${note.slug}.html`;
  }

  const file = path.posix.normalize(path.posix.join('notes', target));

  return `${path.extname(file) ? REPOSITORY_BLOB_URL : REPOSITORY_TREE_URL}/${file}`;
}

async function buildNotes(notes, context) {
  const template = fs.readFileSync(path.join(__dirname, 'note-template.html'), 'utf-8');
  const directory = path.join(OUTPUT_DIRECTORY, 'notes');
  const today = new Date().toISOString().slice(0, 10);
  const rendered = [];

  fs.mkdirSync(directory, { recursive: true });

  for (const note of notes) {
    const markdown = fs.readFileSync(path.join(NOTES_DIRECTORY, note.file), 'utf-8');
    const { title, description, html, toc, cells } = await renderNote(markdown, {
      resolveLink: target => resolveNoteLink(target, notes),
      context,
    });
    rendered.push({ ...note, title });
    const tocHtml = toc.length > 2 ? `<nav class="toc" aria-label="Contents"><strong>Contents</strong><ol>${toc.map(item => `<li><a href="#${item.id}">${item.title}</a></li>`).join('')}</ol></nav>` : '';
    const page = template
      .replace(/__TITLE__/g, () => escapeHtml(title))
      .replace(/__DESCRIPTION__/g, () => escapeHtml(NOTE_SUMMARIES[note.slug] || description))
      .replace(/__URL__/g, `${SITE_URL}notes/${note.slug}.html`)
      .replace(/__SITE_URL__/g, SITE_URL)
      .replace('__CONTENT__', () => html.replace('</h1>', `</h1>\n${tocHtml}`))
      .replace('__CHROME_CSS__', () => CHROME_CSS)
      .replace('__SITE_HEADER__', () => renderHeader({ root: '../', current: note.slug, notes }))
      .replace('__SITE_FOOTER__', () =>
        renderFooter([
          `Built from <a href="${REPOSITORY_BLOB_URL}/notes/${note.file}">notes/${note.file}</a> on ${today}; ${NOTE_PROVENANCE[note.slug] || 'every output on this page was computed during that build.'}`,
        ]),
      );

    fs.writeFileSync(path.join(directory, `${note.slug}.html`), page);
    console.log(`Note saved: ${path.relative(ROOT_DIRECTORY, path.join(directory, `${note.slug}.html`))} (${cells} cells)`);
  }

  return rendered;
}

async function __main__() {
  fs.rmSync(OUTPUT_DIRECTORY, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  const domiculeBoards = [];

  for (const board of DOMICULE_BOARDS) {
    domiculeBoards.push({
      id: `${board.rowCount}x${board.colCount}-diagonal`,
      pieces: 'domicule',
      mode: 'pages',
      ...board,
      total: await countDomiculeTilings(board),
    });
  }

  const domiculeTotals = new Map([
    ...testCasesDomicule.map(t => [`${t.rowCount}x${t.colCount}`, t.expectedResult]),
    ...domiculeBoards.map(b => [`${b.rowCount}x${b.colCount}`, b.total]),
  ]);
  const data = {
    defaultBoard: DEFAULT_BOARD,
    boards: [
      ...GALLERY_BOARDS.map(board => ({
        id: `${board.rowCount}x${board.colCount}`,
        pieces: 'domino',
        mode: 'pages',
        ...board,
        total: countTilings(board),
      })),
      ...domiculeBoards,
    ],
    benchmark: buildBenchmark(),
    domiculeBenchmark: buildDomiculeBenchmark(domiculeTotals),
    environment: readEnvironment(BENCHMARK_DIRECTORY),
  };
  const notes = listNotes();
  await buildNotes(notes, {
    root: ROOT_DIRECTORY,
    benchmark: data.benchmark,
    benchmarkRun: `${BENCHMARK_ROOT}/${BENCHMARK_RUN}`,
    domiculeBenchmark: data.domiculeBenchmark,
    countDomicule: board => countDomiculeTilings(board).then(BigInt),
    roundDecimal,
  });
  const readScripts = files => files.map(file => fs.readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8')).join('\n');
  const scripts = readScripts(BROWSER_SCRIPTS);
  const workerSource = readScripts(WORKER_SCRIPTS);
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf-8');
  const research = readResearchResults();
  const html = template
    .replaceAll('__RESEARCH_S__', research.s)
    .replaceAll('__RESEARCH_DS__', research.ds)
    .replaceAll('__RESEARCH_LOWER__', research.lower)
    .replaceAll('__RESEARCH_UPPER__', research.upper)
    .replace('__SCRIPTS__', () => scripts)
    .replace('__DATA__', () => JSON.stringify(data))
    .replace('__WORKER__', () => JSON.stringify(workerSource).replace(/</g, '\\u003c'))
    .replace('__JSON_LD__', () => JSON.stringify(buildJsonLd()).replace(/</g, '\\u003c'))
    .replace(/__SITE_URL__/g, SITE_URL)
    .replace(/__BENCHMARK_DIRECTORY__/g, `${BENCHMARK_ROOT}/${BENCHMARK_RUN}`)
    .replace('__OLDER_BENCHMARKS__', () => buildOlderBenchmarks())
    .replace(/__DOMICULE_SWEEPS__/g, DOMICULE_SWEEPS.toLocaleString('en-US'))
    .replace('__CHROME_CSS__', () => CHROME_CSS)
    .replace('__SITE_HEADER__', () => renderHeader({ root: '', current: 'home', notes }))
    .replace('__SITE_FOOTER__', () => renderFooter());

  Object.entries(ASSETS).forEach(([name, source]) => {
    fs.mkdirSync(path.dirname(path.join(OUTPUT_DIRECTORY, name)), { recursive: true });
    fs.copyFileSync(path.join(ROOT_DIRECTORY, source), path.join(OUTPUT_DIRECTORY, name));
  });
  fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'index.html'), html);
  fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'sitemap.xml'), buildSitemap(notes));
  console.log(`Site saved: ${path.relative(ROOT_DIRECTORY, path.join(OUTPUT_DIRECTORY, 'index.html'))}`);
}

__main__().catch(error => {
  console.error(error);
  process.exit(1);
});
