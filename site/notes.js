const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const NOTES_DIRECTORY = path.join(ROOT_DIRECTORY, 'notes');
const repositoryRequire = createRequire(path.join(ROOT_DIRECTORY, 'package.json'));
const AsyncFunction = (async () => {}).constructor;

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Renders inline Markdown: code spans, $math$, links and bold text.
 * Code and math are set aside as tokens first; a link label is rendered with the same
 * tokens, and the tokens are expanded until none is left.
 * @param {string} text The Markdown text of one paragraph, list item or table cell.
 * @param {function(string): string} resolveLink Maps a Markdown link target to the site URL.
 * @param {string[]} [tokens] The tokens of the enclosing call.
 * @returns {string} The HTML.
 */
function renderInline(text, resolveLink, tokens = null) {
  const shared = tokens || [];
  const keep = html => `\u0000${shared.push(html) - 1}\u0000`;
  const html = escapeHtml(
    text
      .replace(/`([^`]+)`/g, (_, code) => keep(`<code>${escapeHtml(code)}</code>`))
      .replace(/\$([^$\s](?:[^$\n]*?[^$\s])?)\$(?!\d)/g, (_, tex) => keep(`<span class="math" data-tex="${escapeHtml(tex)}">${escapeHtml(tex)}</span>`))
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) =>
        keep(`<a href="${escapeHtml(resolveLink(href))}">${renderInline(label, resolveLink, shared)}</a>`),
      ),
  )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\s][^*]*?)\*/g, '<em>$1</em>');

  if (tokens) {
    return html;
  }

  let expanded = html;

  while (expanded.includes('\u0000')) {
    expanded = expanded.replace(/\u0000(\d+)\u0000/g, (_, index) => shared[Number(index)]);
  }

  return expanded;
}

function renderTable(rows, resolveLink) {
  const cells = row =>
    row
      .replace(/^\||\|$/g, '')
      .split('|')
      .map(cell => cell.trim());
  const [head, separator, ...body] = rows;
  const align = cells(separator).map(cell => (cell.endsWith(':') ? ' class="r"' : ''));
  const alignment = i => align[i] || '';

  return [
    '<div class="table-wrap"><table>',
    `<thead><tr>${cells(head).map((cell, i) => `<th${alignment(i)}>${renderInline(cell, resolveLink)}</th>`).join('')}</tr></thead>`,
    `<tbody>${body.map(row => `<tr>${cells(row).map((cell, i) => `<td${alignment(i)}>${renderInline(cell, resolveLink)}</td>`).join('')}</tr>`).join('')}</tbody>`,
    '</table></div>',
  ].join('');
}

/**
 * Renders a line chart as inline SVG with one axis pair, a recessive grid, an optional dashed
 * reference line and a legend. It is drawn twice: a wide version with direct labels at the right
 * edge, pushed apart so they never overlap, and a narrow one without them for small screens,
 * where the legend names the lines; the page shows one of the two. Every marker carries a
 * <title> with its values, which the browser shows on hover. Colours are CSS variables of the
 * page, so the chart follows its light and dark theme. A point that is not finite or lies
 * outside the axes throws, so a wrong value stops the build instead of leaving the plot.
 * @param {Object} spec The chart.
 * @property {string} spec.title The accessible name of the chart.
 * @property {{ label: string, min: number, max: number, ticks: number[] }} spec.x The horizontal axis.
 * @property {{ label: string, min: number, max: number, ticks: number[] }} spec.y The vertical axis.
 * @property {{ name: string, color: string, points: number[][], markers?: number[][] }[]} spec.series The lines; markers default to the points.
 * @property {{ y: number }} [spec.reference] A horizontal reference line.
 * @property {function(number[]): string} [spec.describe] The hover text of a point.
 * @returns {string} The HTML.
 */
function renderChart({ title, x, y, series, reference, describe = ([px, py]) => `${px}, ${py}` }) {
  const inside = (value, { min, max }) => Number.isFinite(value) && value >= min && value <= max;

  series.forEach(({ name, points, markers = points }) =>
    [...points, ...markers].forEach(([px, py]) => {
      if (!inside(px, x) || !inside(py, y)) {
        throw new Error(`The chart "${title}" has a point of ${name} outside its axes: ${px}, ${py}.`);
      }
    }),
  );

  const draw = (width, height, labelled) => {
    const plot = { left: 56, right: width - (labelled ? 112 : 16), top: 12, bottom: height - 44 };
    const toX = value => plot.left + ((value - x.min) / (x.max - x.min)) * (plot.right - plot.left);
    const toY = value => plot.bottom - ((value - y.min) / (y.max - y.min)) * (plot.bottom - plot.top);
    const round = value => Math.round(value * 10) / 10;
    const labels = series
      .map(({ name, color, points }) => ({ name, color, at: toY(points.at(-1)[1]) }))
      .sort((a, b) => a.at - b.at);

    labels.forEach((label, i) => {
      label.y = Math.max(label.at, i > 0 ? labels[i - 1].y + 16 : plot.top + 4);
    });

    for (let i = labels.length - 1; i >= 0; i--) {
      labels[i].y = Math.min(labels[i].y, i < labels.length - 1 ? labels[i + 1].y - 16 : plot.bottom);
    }

    const parts = [
      ...y.ticks.map(tick => `<line x1="${plot.left}" x2="${plot.right}" y1="${round(toY(tick))}" y2="${round(toY(tick))}" stroke="var(--border)" stroke-width="1"/>`),
      ...y.ticks.map(tick => `<text x="${plot.left - 8}" y="${round(toY(tick)) + 4}" text-anchor="end">${escapeHtml(tick)}</text>`),
      ...x.ticks.map(tick => `<text x="${round(toX(tick))}" y="${plot.bottom + 18}" text-anchor="middle">${escapeHtml(tick)}</text>`),
      `<line x1="${plot.left}" x2="${plot.right}" y1="${plot.bottom}" y2="${plot.bottom}" stroke="var(--muted)" stroke-width="1"/>`,
      `<text x="${(plot.left + plot.right) / 2}" y="${height - 6}" text-anchor="middle">${escapeHtml(x.label)}</text>`,
      `<text x="14" y="${(plot.top + plot.bottom) / 2}" text-anchor="middle" transform="rotate(-90 14 ${(plot.top + plot.bottom) / 2})">${escapeHtml(y.label)}</text>`,
      ...(reference
        ? [`<line x1="${plot.left}" x2="${plot.right}" y1="${round(toY(reference.y))}" y2="${round(toY(reference.y))}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="4 4"/>`]
        : []),
      ...series.map(
        ({ color, points }) =>
          `<polyline fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${points.map(([px, py]) => `${round(toX(px))},${round(toY(py))}`).join(' ')}"/>`,
      ),
      ...series.flatMap(({ name, color, points, markers = points }) =>
        markers.map(
          point =>
            `<circle cx="${round(toX(point[0]))}" cy="${round(toY(point[1]))}" r="4" fill="${color}" stroke="var(--bg)" stroke-width="2"><title>${escapeHtml(`${name}: ${describe(point)}`)}</title></circle>`,
        ),
      ),
      ...(labelled
        ? labels.map(
            ({ name, color, at, y: labelY }) =>
              `<line x1="${plot.right + 6}" x2="${plot.right + 18}" y1="${round(at)}" y2="${round(labelY)}" stroke="${color}" stroke-width="2"/><text x="${plot.right + 22}" y="${round(labelY) + 4}" fill="var(--fg)">${escapeHtml(name)}</text>`,
          )
        : []),
    ];

    return `<svg class="${labelled ? 'wide' : 'narrow'}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}" font-size="13" fill="var(--muted)"><title>${escapeHtml(title)}</title>${parts.join('')}</svg>`;
  };

  return [
    '<figure class="chart output">',
    `<div class="legend">${series.map(({ name, color }) => `<span><i style="background: ${color}"></i>${escapeHtml(name)}</span>`).join('')}</div>`,
    draw(600, 320, true),
    draw(400, 300, false),
    '</figure>',
  ].join('');
}

let figureCount = 0;

/**
 * Prefixes every selector of a stylesheet, so the style of one drawing does not reach the rest of the page.
 * @param {string} css Rules without nesting, such as the renderer writes.
 * @param {string} scope The selector to put in front.
 * @returns {string} The scoped rules.
 */
function scopeStyle(css, scope) {
  return css.replace(/([^{}]+)\{/g, (_, selectors) => `${selectors.split(',').map(selector => `${scope} ${selector.trim()}`).join(',')}{`);
}

function createCellHelpers() {
  const outputs = [];
  const text = [];
  const flush = () => {
    if (text.length) {
      outputs.push(`<pre class="output">${escapeHtml(text.join('\n'))}</pre>`);
      text.length = 0;
    }
  };
  const helpers = {
    print: (...values) => text.push(values.map(String).join(' ')),
    table: (headers, rows) => {
      flush();
      outputs.push(
        [
          '<div class="table-wrap output"><table>',
          `<thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>`,
          `<tbody>${rows.map(row => `<tr>${row.map(cell => `<td${String(cell).length > 24 ? ' class="long"' : ''}>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`,
          '</table></div>',
        ].join(''),
      );
    },
    chart: spec => {
      flush();
      outputs.push(renderChart(spec));
    },
    figure: (svgs, caption, { highlight = false } = {}) => {
      const drawings = [].concat(svgs).map(svg => String(svg).trim());

      if (!drawings.length || drawings.some(drawing => !/^<svg[\s>]/.test(drawing))) {
        throw new Error('figure() takes an SVG drawing or a list of them.');
      }

      const id = `figure-${++figureCount}`;
      const rules = new Set();
      const bare = drawings.map(drawing =>
        drawing.replace(/<style>([\s\S]*?)<\/style>/g, (_, css) => {
          (css.match(/[^{}]+\{[^}]*\}/g) || []).forEach(rule => rules.add(rule));
          return '';
        }),
      );
      const style = rules.size ? `<style>${scopeStyle([...rules].join(''), `:where(#${id})`)}</style>` : '';
      const width = Number((drawings[0].match(/^<svg[^>]*\swidth="(\d+(?:\.\d+)?)"/) || [])[1]) || 0;
      const { PADDING } = repositoryRequire('./js/renderer').renderSheet;

      flush();
      outputs.push(
        `<figure id="${id}" class="tiling output${highlight ? ' highlight' : ''}" style="${width ? `--width: ${width}px; ` : ''}--pad: ${PADDING}px">${style}<div class="sheet">${bare.join('')}</div>${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`,
      );
    },
  };

  return { outputs, helpers, flush };
}

async function runCell(code, notebook) {
  const { outputs, helpers, flush } = createCellHelpers();
  const started = Date.now();

  await new AsyncFunction('require', 'print', 'table', 'chart', 'figure', 'nb', code)(
    repositoryRequire,
    helpers.print,
    helpers.table,
    helpers.chart,
    helpers.figure,
    notebook,
  );
  flush();

  return { outputs, seconds: (Date.now() - started) / 1000 };
}

/**
 * Renders a note: Markdown blocks, ```math blocks for KaTeX, and ```js run cells, which are
 * executed in order with a shared `nb` object and whose output is shown under the code.
 * @param {string} markdown The note.
 * @param {Object} options
 * @property {function(string): string} options.resolveLink Maps a Markdown link target to the site URL.
 * @property {Object} options.context Values the cells can read as nb.context.
 * @returns {Promise<{ title: string, description: string, html: string, toc: { id: string, title: string }[], cells: number }>} The rendered note.
 */
async function renderNote(markdown, { resolveLink, context }) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const notebook = { context };
  const html = [];
  const toc = [];
  let title = '';
  let description = '';
  let cells = 0;

  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*(\w*)\s*$/);

    if (fence) {
      const [, language, mode] = fence;
      const body = [];

      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) {
        body.push(lines[i]);
      }

      i++;
      const code = body.join('\n');

      if (language === 'math') {
        html.push(`<div class="math display" data-tex="${escapeHtml(code)}">${escapeHtml(code)}</div>`);
      } else if (language === 'js' && mode === 'run') {
        cells++;
        const { outputs, seconds } = await runCell(code, notebook);
        html.push(
          `<div class="cell"><div class="cell-label">In [${cells}]</div><pre class="code"><code>${escapeHtml(code)}</code></pre>` +
            `<div class="cell-label">Out [${cells}] <span>${seconds.toFixed(2)} s</span></div>${outputs.join('')}</div>`,
        );
      } else {
        html.push(`<pre class="code"><code>${escapeHtml(code)}</code></pre>`);
      }

      continue;
    }

    const heading = line.match(/^(#{1,3}) (.*)$/);

    if (heading) {
      const level = heading[1].length;
      const text = renderInline(heading[2], resolveLink);

      if (level === 1) {
        title = heading[2].replace(/`/g, '');
        html.push(`<h1>${text}</h1>`);
      } else {
        const id = slugify(heading[2]);

        if (level === 2) {
          toc.push({ id, title: text });
        }

        html.push(`<h${level} id="${id}">${text}</h${level}>`);
      }

      i++;
      continue;
    }

    if (line.startsWith('|')) {
      const rows = [];

      for (; i < lines.length && lines[i].startsWith('|'); i++) {
        rows.push(lines[i]);
      }

      html.push(renderTable(rows, resolveLink));
      continue;
    }

    const listItem = /^(-|\d+\.) (.*)$/;

    if (listItem.test(line)) {
      const ordered = /^\d+\./.test(line);
      const items = [];

      for (; i < lines.length && (listItem.test(lines[i]) || /^\s{2,}\S/.test(lines[i])); i++) {
        const match = lines[i].match(listItem);

        if (match) {
          items.push(match[2]);
        } else {
          items[items.length - 1] += ` ${lines[i].trim()}`;
        }
      }

      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>${items.map(item => `<li>${renderInline(item, resolveLink)}</li>`).join('')}</${tag}>`);
      continue;
    }

    if (line.startsWith('> ')) {
      const quote = [];

      for (; i < lines.length && lines[i].startsWith('> '); i++) {
        quote.push(lines[i].slice(2));
      }

      html.push(`<blockquote>${renderInline(quote.join(' '), resolveLink)}</blockquote>`);
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const paragraph = [];

    for (; i < lines.length && lines[i].trim() && !/^(#|```|\||> |-\s|\d+\.\s)/.test(lines[i]); i++) {
      paragraph.push(lines[i]);
    }

    const text = paragraph.join(' ');

    if (!description) {
      description = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*$]/g, '').slice(0, 300);
    }

    html.push(`<p>${renderInline(text, resolveLink)}</p>`);
  }

  const output = html.join('\n');

  if (output.includes('\u0000') || />undefined</.test(output)) {
    throw new Error(`Note "${title}" rendered an unresolved inline token.`);
  }

  return { title, description, html: output, toc, cells };
}

/**
 * Draws tilings of one board, as the gallery numbers them, in the dimer style, one SVG per tiling, each named for
 * screen readers by its pieces, board, surface and number.
 * @param {Object} options
 * @property {number} options.rowCount The height.
 * @property {number} options.colCount The width or circumference.
 * @property {string} [options.pieces] 'domino' or 'domicule'.
 * @property {string} [options.surface] 'rectangle', 'cylinder' or 'torus'.
 * @property {number} [options.diagonals] Only the domicule tilings of a rectangle with this many diagonal pieces, as the
 * gallery's Diagonal pieces filter numbers them; the label under each tiling then gives that number.
 * @property {number[]|'all'} options.ranks The 0-based numbers of the tilings to draw.
 * @returns {{ svgs: string[], total: bigint }} The drawings and the number of tilings they choose from.
 */
function drawTilings({ rowCount, colCount, pieces = 'domino', surface = 'rectangle', diagonals, ranks }) {
  if (!['domino', 'domicule'].includes(pieces) || !['rectangle', 'cylinder', 'torus'].includes(surface)) {
    throw new Error(`drawTilings() takes pieces domino or domicule and surface rectangle, cylinder or torus, not ${pieces} on a ${surface}.`);
  }

  if (diagonals !== undefined && (pieces !== 'domicule' || surface !== 'rectangle')) {
    throw new Error(`drawTilings() counts diagonal pieces of domicule tilings of a rectangle only, not ${pieces} on a ${surface}.`);
  }

  const renderer = repositoryRequire('./js/renderer');
  let unranker;
  let unrank;

  if (diagonals !== undefined) {
    unranker = renderer.createDiagonalUnranker({ rowCount, colCount, diagonals });
    unrank = renderer.unrankDiagonalTiling;
  } else if (surface !== 'rectangle') {
    unranker = renderer.createPeriodicUnranker({ rowCount, colCount, lattice: pieces === 'domino' ? 'square' : 'king', torus: surface === 'torus' });
    unrank = renderer.unrankPeriodicTiling;
  } else if (pieces === 'domino') {
    unranker = renderer.createUnranker({ rowCount, colCount });
    unrank = renderer.unrankTiling;
  } else {
    unranker = renderer.createDomiculeUnranker({ rowCount, colCount });
    unrank = renderer.unrankDomiculeTiling;
  }

  const chosen = ranks === 'all' ? Array.from({ length: Number(unranker.total) }, (_, i) => i) : ranks;
  const filter = diagonals === undefined ? '' : ` with ${diagonals} diagonal piece${diagonals === 1 ? '' : 's'}`;
  const svgs = chosen.map(rank => {
    const name = `${pieces === 'domicule' ? 'Domicule' : 'Domino'} tiling number ${rank + 1}${filter} of a ${rowCount} by ${colCount} ${surface}`;
    const svg = renderer.renderSheet([unrank(unranker, BigInt(rank))], 1, {
      rowCount,
      colCount,
      style: 'dimer',
      labels: [diagonals === undefined ? `#${rank + 1}` : `k = ${diagonals}`],
      ...(surface !== 'rectangle' && { surface }),
    });

    return svg.trim().replace(/^<svg /, `<svg role="img" aria-label="${escapeHtml(name)}" `);
  });

  return { svgs, total: unranker.total };
}

/**
 * The natural logarithm of an exact count, from its first 17 digits and its length.
 * @param {bigint|string} count The count.
 * @returns {number} log(count).
 */
function logCount(count) {
  const digits = String(count);
  const head = digits.slice(0, 17);

  return Math.log(Number(head)) + (digits.length - head.length) * Math.LN10;
}

/**
 * Formats the average time of a benchmark result for a notebook table.
 * @param {{ average: number, runs: number }|null} result The result of readAverageTime in site/build.js.
 * @returns {string} The time in ms or s, marked when it was measured once.
 */
function formatTime(result) {
  if (result === null) {
    return '-';
  }

  const time = result.average >= 1000 ? `${(result.average / 1000).toFixed(2)} s` : `${result.average.toFixed(2)} ms`;

  return result.runs === 1 ? `${time} (one run)` : time;
}

/**
 * Lists the notes in reading order: the numbered files of notes/ first, then the numbered files of each
 * group directory, groups in name order. A note's slug is its path without the numbers and the extension,
 * so notes/dominoes/02-cylinders.md is published as notes/dominoes/cylinders.html.
 * @returns {{ file: string, slug: string }[]} The notes, with paths relative to notes/.
 */
function listNotes() {
  const numbered = directory =>
    fs
      .readdirSync(path.join(NOTES_DIRECTORY, directory))
      .filter(file => /^\d+-.+\.md$/.test(file))
      .sort()
      .map(file => path.posix.join(directory, file));
  const groups = fs
    .readdirSync(NOTES_DIRECTORY, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  return [...numbered(''), ...groups.flatMap(numbered)].map(file => ({
    file,
    slug: file.replace(/(^|\/)\d+-/, '$1').replace(/\.md$/, ''),
  }));
}

module.exports = { renderNote, renderChart, listNotes, escapeHtml, drawTilings, formatTime, logCount, NOTES_DIRECTORY };
