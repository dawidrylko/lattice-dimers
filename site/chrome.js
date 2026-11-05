const { escapeHtml } = require('./notes');

const REPOSITORY_URL = 'https://github.com/dawidrylko/lattice-dimers';
const NAV = [
  { slug: 'research', label: 'Research' },
  {
    label: 'Dominoes',
    items: [
      { slug: 'dominoes/rectangle', label: 'Rectangles' },
      { slug: 'dominoes/cylinder', label: 'Cylinders' },
      { slug: 'dominoes/torus', label: 'Tori' },
    ],
  },
  {
    label: 'Domicules',
    items: [
      { slug: 'domicules/rectangle', label: 'Rectangles' },
      { slug: 'domicules/cylinder', label: 'Cylinders' },
      { slug: 'domicules/torus', label: 'Tori' },
      { slug: 'domicules/diagonals', label: 'Diagonal pieces' },
    ],
  },
  {
    label: 'Triangular lattice',
    items: [
      { slug: 'triangular/cylinder', label: 'Cylinders' },
      { slug: 'triangular/torus', label: 'Tori' },
    ],
  },
];

const NOTE_REDIRECTS = {
  a004003: { to: 'dominoes/rectangle' },
  a239273: { to: 'domicules/rectangle' },
  dominoes: { to: 'dominoes/rectangle' },
  domicules: { to: 'domicules/rectangle' },
  method: {
    to: 'dominoes/rectangle',
    sections: {
      problem: '#the-problem',
      'domino-tilings': '#the-closed-form',
      'closed-form': '#the-closed-form',
      'transfer-by-rows': '#transfer-by-rows',
      numbering: '#numbering-tilings',
      sampling: '#sampling-with-coupling-from-the-past',
      'domicule-tilings': 'domicules/rectangle#transfer-by-cells',
      'transfer-by-cells': 'domicules/rectangle#transfer-by-cells',
      'counting-modulo-primes': 'domicules/rectangle#counting-modulo-primes',
      'sampling-with-a-markov-chain': 'domicules/rectangle#sampling-with-a-markov-chain',
      'numbering-by-diagonal-pieces': 'domicules/diagonals#numbering-by-diagonal-pieces',
      'cylinders-and-tori': 'domicules/torus#numbering',
      verification: '#verification',
      references: '#references',
    },
  },
  cylinders: {
    to: 'domicules/cylinder',
    sections: {
      'the-king-s-graph': '#the-counts',
      'the-square-lattice': 'dominoes/cylinder#the-counts',
      'the-triangular-lattice': 'triangular/cylinder#the-counts',
    },
  },
  tori: { to: 'domicules/torus', sections: { 'the-king-s-graph-on-the-2n-2n-torus-a401670': '#the-2n-2n-torus-a401670' } },
  torus: { to: 'domicules/torus', sections: { 'the-king-s-graph-on-the-2n-2n-torus-a401670': '#the-2n-2n-torus-a401670' } },
  diagonals: { to: 'domicules/diagonals' },
};

/**
 * Says where a section of a moved note now lives, as a path from notes/ with its fragment.
 * @param {string} from The old slug, such as 'method'.
 * @param {string} id The id of the section on the old page.
 * @returns {string} The new address, such as 'domicules/rectangle.html#transfer-by-cells'.
 */
function resolveRedirect(from, id) {
  const { to, sections = {} } = NOTE_REDIRECTS[from];
  const [page, fragment] = (sections[id] || `#${id}`).split('#');

  return `${page || to}.html#${fragment}`;
}

const NAV_SCRIPT = `(() => {
  const menus = [...document.querySelectorAll('.site-nav details')];
  const close = keep => menus.filter(menu => menu.open && menu !== keep).forEach(menu => { menu.open = false; });
  menus.forEach(menu => menu.addEventListener('toggle', () => menu.open && close(menu)));
  document.addEventListener('click', event => close(menus.find(menu => menu.contains(event.target))));
  document.addEventListener('focusin', event => close(menus.find(menu => menu.contains(event.target))));
  document.addEventListener('keydown', event => {
    const open = menus.find(menu => menu.open);
    if (event.key === 'Escape' && open) {
      open.open = false;
      open.querySelector('summary').focus();
    }
  });
})();`;

const THEME_CSS = `
:root {
  --bg: #ffffff; --fg: #111827; --muted: #6b7280; --border: #e5e7eb;
  --surface: #f9fafb; --accent: #4f7cac; --accent-fg: #ffffff;
  --h: #044cb6; --v: #5eaceb; --d: #ab3415; --a: #f09c17;
  --paper-h: #ffffff; --paper-v: #e8eef6; --ink: #334155;
  --sheet: #ffffff; --board: #f3f4f6; --edge: #1f2937; --label: #4b5563; --hit: #dc2626;
  --mute: #d1d5db; --seam: #c026d3; --seam-ends: #15803d;
  --menu-shadow: 0 4px 12px rgb(17 24 39 / 0.12);
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
    --menu-shadow: 0 4px 12px rgb(0 0 0 / 0.5);
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
.site-nav a, .site-nav summary { color: var(--muted); text-decoration: none; }
.site-nav a:hover, .site-nav a[aria-current="page"], .site-nav summary:hover, .site-nav summary[data-current], .site-nav details[open] summary { color: var(--fg); }
.site-nav a[aria-current="page"], .site-nav summary[data-current] { text-decoration: underline 2px var(--accent); text-underline-offset: 6px; }
.site-nav a:focus-visible, .site-nav summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 2px; }
.site-nav details { position: relative; }
.site-nav summary { cursor: pointer; list-style: none; }
.site-nav summary::-webkit-details-marker { display: none; }
.site-nav summary::after { content: ""; display: inline-block; margin-left: 6px; border: 4px solid transparent; border-top-color: currentColor; border-bottom-width: 0; vertical-align: middle; }
.site-nav details[open] summary::after { border-top-width: 0; border-bottom: 4px solid currentColor; }
.site-nav .menu { position: absolute; top: calc(100% + 6px); left: -12px; z-index: 10; display: flex; flex-direction: column; gap: 4px; min-width: max-content; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); box-shadow: var(--menu-shadow); }
.site-nav .menu a { padding: 2px 0; }
@media (max-width: 640px) {
  .site-nav { position: relative; }
  .site-nav details { position: static; }
  .site-nav .menu { left: 0; right: 0; min-width: 0; }
}
.site-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--muted); font: 13px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
.site-footer p { margin: 0 0 4px; }
.site-footer .site-provenance { margin: 0 0 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
`.trim();

/**
 * Renders the header every page shares: the site name and the site navigation, where the notes of one kind
 * of piece or lattice sit in a menu that opens from its label.
 * @param {Object} options
 * @property {string} options.root The path from the page to the site root ('', '../' or '../../').
 * @property {string} options.current The slug of the page: 'home' or a note slug.
 * @property {{ slug: string }[]} options.notes The notes in reading order.
 * @returns {string} The HTML.
 */
function renderHeader({ root, current, notes }) {
  const home = root || './';
  const logo = `<img src="${root}dimer.svg" alt="" width="32" height="32">Lattice Dimers`;
  const brand = current === 'home' ? `<h1 class="brand">${logo}</h1>` : `<a class="brand" href="${home}">${logo}</a>`;
  const listed = NAV.flatMap(entry => entry.items || [entry]).map(({ slug }) => slug);
  const unlisted = notes.map(({ slug }) => slug).filter(slug => !listed.includes(slug));
  const missing = listed.filter(slug => !notes.some(note => note.slug === slug));

  if (unlisted.length || missing.length) {
    throw new Error(`the site navigation misses ${unlisted.join(', ') || 'no note'} and names ${missing.join(', ') || 'no missing note'}`);
  }

  const link = (slug, href, label) => `<a href="${href}"${slug === current ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`;
  const note = ({ slug, label }) => link(slug, `${root}notes/${slug}.html`, label);
  const nav = [
    link('home', home, 'Home'),
    ...NAV.map(entry =>
      entry.items
        ? [
            '<details>',
            `        <summary${entry.items.some(({ slug }) => slug === current) ? ' data-current aria-current="true"' : ''}>${escapeHtml(entry.label)}</summary>`,
            `        <div class="menu">${entry.items.map(note).join('')}</div>`,
            '      </details>',
          ].join('\n')
        : note(entry),
    ),
  ].join('\n      ');

  return [
    '<header class="site-header">',
    `    ${brand}`,
    '    <nav class="site-nav" aria-label="Site">',
    `      ${nav}`,
    '    </nav>',
    `    <script>${NAV_SCRIPT}</script>`,
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

module.exports = { THEME_CSS, CHROME_CSS, NAV, NOTE_REDIRECTS, resolveRedirect, renderHeader, renderFooter };
