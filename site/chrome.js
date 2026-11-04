const { escapeHtml } = require('./notes');

const REPOSITORY_URL = 'https://github.com/dawidrylko/lattice-dimers';
const NOTE_LABELS = {
  research: 'Research',
  method: 'Method',
  dominoes: 'Dominoes',
  domicules: 'Domicules',
  cylinders: 'Cylinders',
  tori: 'Tori',
  diagonals: 'Diagonal pieces',
};

const THEME_CSS = `
:root {
  --bg: #ffffff; --fg: #111827; --muted: #6b7280; --border: #e5e7eb;
  --surface: #f9fafb; --accent: #4f7cac; --accent-fg: #ffffff;
  --h: #044cb6; --v: #5eaceb; --d: #ab3415; --a: #f09c17;
  --paper-h: #ffffff; --paper-v: #e8eef6; --ink: #334155;
  --sheet: #ffffff; --board: #f3f4f6; --edge: #1f2937; --label: #4b5563; --hit: #dc2626;
  --mute: #d1d5db; --seam: #c026d3; --seam-ends: #15803d;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1115; --fg: #e5e7eb; --muted: #9ca3af; --border: #262a33;
    --surface: #161a21; --accent: #7aa2cf; --accent-fg: #0f1115;
    --h: #5590f3; --v: #3b5d96; --d: #f0a53a; --a: #d9601e;
    --paper-h: #1f2530; --paper-v: #283142; --ink: #8b95a5;
    --sheet: #161a21; --board: #232833; --edge: #0b0d11; --label: #9ca3af; --hit: #f87171;
    --mute: #3a404c; --seam: #d946ef; --seam-ends: #4ade80;
  }
}
.sheet { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--sheet); }
.sheet .bg { fill: var(--sheet); }
.sheet .b { fill: var(--board); }
.sheet text { fill: var(--label); }
.sheet .blocks .h, .sheet .blocks .v, .sheet .blocks .d, .sheet .blocks .a { stroke: var(--edge); }
.sheet .blocks .h { fill: var(--h); } .sheet .blocks .v { fill: var(--v); } .sheet .blocks .d { fill: var(--d); } .sheet .blocks .a { fill: var(--a); }
.sheet .dimer .h { fill: var(--h); stroke: var(--h); } .sheet .dimer .v { fill: var(--v); stroke: var(--v); }
.sheet .dimer .d { fill: var(--d); stroke: var(--d); } .sheet .dimer .a { fill: var(--a); stroke: var(--a); }
.sheet .dimer .o { stroke: none; }
.sheet .dimer .e { fill: var(--edge); stroke: var(--edge); }
.sheet .dimer .r { stroke: var(--board); }
.sheet .engraving .h, .sheet .engraving .v, .sheet .engraving .cd, .sheet .engraving .ca { stroke: var(--ink); }
.sheet .engraving .h { fill: var(--paper-h); } .sheet .engraving .v { fill: var(--paper-v); }
:root { --ed: color-mix(in srgb, var(--d) 55%, var(--ink)); --ea: color-mix(in srgb, var(--a) 55%, var(--ink)); }
.sheet .engraving .cd { fill: color-mix(in srgb, var(--ed) 9%, var(--paper-h)); }
.sheet .engraving .ca { fill: color-mix(in srgb, var(--ea) 9%, var(--paper-h)); }
.sheet .engraving .d { stroke: var(--ed); } .sheet .engraving .a { stroke: var(--ea); }
.sheet svg { display: block; max-width: 100%; height: auto; }
.sheet .s, .sheet .m { stroke: var(--seam); }
.sheet .t, .sheet .u { stroke: var(--seam-ends); }
.sheet text.n { fill: var(--muted); }
:is(#gallery[data-highlight], .tiling.highlight) .sheet .blocks .h, :is(#gallery[data-highlight], .tiling.highlight) .sheet .blocks .v { fill: var(--mute); }
:is(#gallery[data-highlight], .tiling.highlight) .sheet .dimer .h, :is(#gallery[data-highlight], .tiling.highlight) .sheet .dimer .v { fill: var(--mute); stroke: var(--mute); }
:is(#gallery[data-highlight], .tiling.highlight) .sheet .engraving .h, :is(#gallery[data-highlight], .tiling.highlight) .sheet .engraving .v { fill: var(--sheet); stroke: var(--mute); }
`.trim();

const CHROME_CSS = `
.site-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 24px; margin-bottom: 20px; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
.brand { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 24px; font-weight: 700; line-height: 1.25; color: var(--fg); text-decoration: none; }
.brand img { width: 32px; height: 32px; }
.site-nav { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.site-nav a { color: var(--muted); text-decoration: none; }
.site-nav a:hover, .site-nav a[aria-current="page"] { color: var(--fg); }
.site-nav a[aria-current="page"] { text-decoration: underline 2px var(--accent); text-underline-offset: 6px; }
.site-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--muted); font: 13px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
.site-footer p { margin: 0 0 4px; }
.site-footer .site-provenance { margin: 0 0 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
`.trim();

/**
 * Renders the header every page shares: the site name and the site navigation.
 * @param {Object} options
 * @property {string} options.root The path from the page to the site root ('' or '../').
 * @property {string} options.current The slug of the page: 'home' or a note slug.
 * @property {{ slug: string }[]} options.notes The notes in reading order.
 * @returns {string} The HTML.
 */
function renderHeader({ root, current, notes }) {
  const home = root || './';
  const logo = `<img src="${root}dimer.svg" alt="" width="32" height="32">Lattice Dimers`;
  const brand = current === 'home' ? `<h1 class="brand">${logo}</h1>` : `<a class="brand" href="${home}">${logo}</a>`;
  const links = [
    { slug: 'home', href: home, label: 'Home' },
    ...notes.map(({ slug }) => ({ slug, href: `${root}notes/${slug}.html`, label: NOTE_LABELS[slug] || slug })),
  ];
  const nav = links
    .map(({ slug, href, label }) => `<a href="${href}"${slug === current ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`)
    .join('\n      ');

  return [
    '<header class="site-header">',
    `    ${brand}`,
    '    <nav class="site-nav" aria-label="Site">',
    `      ${nav}`,
    '    </nav>',
    '  </header>',
  ].join('\n');
}

/**
 * Renders the footer every page shares, after the page's own lines.
 * @param {string[]} [lines] HTML lines that belong to this page only, such as where a note was built from.
 * @returns {string} The HTML.
 */
function renderFooter(lines = []) {
  const links = [
    '© <a href="https://dawidrylko.com" rel="author">Dawid Ryłko</a>',
    `<a href="${REPOSITORY_URL}/blob/master/LICENSE">MIT License</a>`,
    `<a href="${REPOSITORY_URL}">GitHub</a>`,
    'Blog posts (PL): <a href="https://dawidrylko.com/domino-tiling/" hreflang="pl">Domino Tiling</a>, <a href="https://dawidrylko.com/domino-tiling-library/" hreflang="pl">Domino tiling library</a>',
  ];

  return [
    '<footer class="site-footer">',
    ...lines.map(line => `    <p class="site-provenance">${line}</p>`),
    `    <p class="site-links">${links.join(' · ')}</p>`,
    '  </footer>',
  ].join('\n');
}

module.exports = { THEME_CSS, CHROME_CSS, renderHeader, renderFooter };
