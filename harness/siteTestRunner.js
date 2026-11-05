const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { DOMICULE_SWEEPS } = require('../js/renderer');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const SITE_DIRECTORY = path.resolve(process.env.SITE_DIRECTORY || path.join(ROOT_DIRECTORY, 'dist', 'site'));
const REPOSITORY_LINK = /https:\/\/github\.com\/dawidrylko\/lattice-dimers\/(?:tree|blob)\/master\/([^"'#?\s<>)]+)/g;
const EXTERNAL_RESOURCE = /<script\b[^>]*\bsrc="https?:[^>]*>|<link\b(?=[^>]*\brel="stylesheet")[^>]*\bhref="https?:[^>]*>/g;
const MIN_HIT_CONTRAST = 4.5;
const MIN_FIGURE_LABEL = 11;
const FIGURE_NAME = /^(Domino|Domicule) tiling number \d+( with \d+ diagonal pieces?)? of a \d+ by \d+ (rectangle|cylinder|torus)$/;
const MIN_SEAM_DISTANCE = 40;
const CHROME_CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};
const VIEWPORT_HEIGHT = 900;
const MOBILE_TABLE_WIDTH = 720;
const WIDE_FONT = 'Verdana, "DejaVu Sans", sans-serif';
const languageColumns = solver => ['Board', 'Tilings', `${solver}, Rust`, `${solver}, Python`, `${solver}, JavaScript`, 'BigInt, JavaScript', 'Runs'];
const languageIcons = solver => `${solver} #icon-rust | ${solver} #icon-python | ${solver} #icon-javascript | BigInt #icon-javascript`;
const LANGUAGE_TABLES = [
  ['domino/rectangle', 'domino-benchmark', 'DATA.benchmark', '36', 'Formula', 'FORMULA_LANGUAGES'],
  ['domino/cylinder', 'domino-cylinder-benchmark', "DATA.dominoPeriodicBenchmark.filter(r => r.surface === 'cylinder')", '121', 'Modular', 'MODULAR_LANGUAGES'],
  ['domino/torus', 'domino-torus-benchmark', "DATA.dominoPeriodicBenchmark.filter(r => r.surface === 'torus')", '272', 'Modular', 'MODULAR_LANGUAGES'],
  ['domicule/rectangle', 'domicule-benchmark', 'DATA.domiculeBenchmark', '280', 'Modular', 'MODULAR_LANGUAGES'],
  ['domicule/cylinder', 'cylinder-benchmark', "DATA.periodicBenchmark.filter(r => r.surface === 'cylinder')", '2,649', 'Modular', 'MODULAR_LANGUAGES'],
  ['domicule/torus', 'torus-benchmark', "DATA.periodicBenchmark.filter(r => r.surface === 'torus')", '17,552', 'Modular', 'MODULAR_LANGUAGES'],
];
const SHOWN_BENCHMARK = `(() => {
  const view = group => group.dataset.pieces + '/' + group.dataset.surface;
  const pressed = id => [...document.querySelectorAll('#' + id + ' button[aria-pressed="true"]')];
  return {
    shown: [...document.querySelectorAll('#benchmark .bench-group')].filter(group => !group.hidden).map(view).join(),
    pressed: pressed('benchmark-pieces').map(button => button.dataset.pieces).join() + '/' + pressed('benchmark-surfaces').map(button => button.dataset.surface).join(),
  };
})()`;
const WAIT_TIMEOUT = 20000;
const COMMAND_TIMEOUT = 30000;
const LAUNCH_TIMEOUT = 30000;
const KILL_TIMEOUT = 5000;
const SETTLE_LAYOUT = 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))';
const SHEET_BOARDS = [
  '2x2',
  '4x4',
  '6x6',
  '8x8',
  '10x10',
  '12x12',
  '20x20',
  '2x2-diagonal',
  '4x4-diagonal',
  '6x6-diagonal',
  '8x8-diagonal',
  '10x10-diagonal',
  '12x12-diagonal',
  '18x18-diagonal',
  '20x20-diagonal',
  '10x10-torus',
  '10x10-diagonal-cylinder',
  '10x10-diagonal-torus',
];
const CONFIRMATION_BOARDS = ['10x10-diagonal-torus?diagonals=20'];
const SAMPLE_BOARDS = ['18x18', '16x16-diagonal', '20x20'];
const NOTES = [
  { slug: 'research', cells: 2 },
  { slug: 'dominoes/rectangle', cells: 7, figures: 1, group: 'Dominoes' },
  { slug: 'dominoes/cylinder', cells: 4, figures: 1, group: 'Dominoes' },
  { slug: 'dominoes/torus', cells: 3, figures: 1, group: 'Dominoes' },
  { slug: 'domicules/rectangle', cells: 9, figures: 2, group: 'Domicules' },
  { slug: 'domicules/cylinder', cells: 4, figures: 1, group: 'Domicules' },
  { slug: 'domicules/torus', cells: 7, figures: 1, group: 'Domicules' },
  { slug: 'domicules/diagonals', cells: 6, figures: 1, group: 'Domicules' },
  { slug: 'triangular/cylinder', cells: 2, group: 'Triangular lattice' },
  { slug: 'triangular/torus', cells: 1, group: 'Triangular lattice' },
];
const NOTE_REDIRECTS = [
  ['a004003', 'dominoes/rectangle'],
  ['a239273', 'domicules/rectangle'],
  ['dominoes', 'dominoes/rectangle'],
  ['domicules', 'domicules/rectangle'],
  ['method', 'dominoes/rectangle'],
  ['cylinders', 'domicules/cylinder'],
  ['tori', 'domicules/torus'],
  ['torus', 'domicules/torus'],
  ['diagonals', 'domicules/diagonals'],
];
const MOVED_SECTIONS = [
  ['method', 'sampling', 'dominoes/rectangle', 'sampling-with-coupling-from-the-past'],
  ['method', 'transfer-by-cells', 'domicules/rectangle', 'transfer-by-cells'],
  ['cylinders', 'the-triangular-lattice', 'triangular/cylinder', 'the-counts'],
  ['torus', 'the-king-s-graph-on-the-2n-2n-torus-a401670', 'domicules/torus', 'the-2n-2n-torus-a401670'],
];
const MENU_GROUPS = ['Dominoes', 'Domicules', 'Triangular lattice'];
const NOTE_FAILURES = ['DIFFERS FROM OEIS'];
const PAGE_CONTROLS = '#page-controls button, #page-controls input';
const siteTestCases = [
  { width: 1440, check: 'sheets' },
  { width: 1440, check: 'picker' },
  { width: 1440, check: 'confirmation' },
  { width: 1440, check: 'samples' },
  { width: 1440, check: 'benchmark' },
  { width: 1440, check: 'pieces' },
  { width: 1440, check: 'styles' },
  { width: 1440, check: 'labels' },
  { width: 1440, check: 'history' },
  { width: 1440, check: 'surfaces' },
  { width: 1440, check: 'diagonals' },
  { width: 375, check: 'styles' },
  { width: 375, check: 'surfaces' },
  { width: 375, check: 'diagonals' },
  { width: 1440, check: 'landing' },
  { width: 1440, check: 'notes' },
  { width: 1440, check: 'chrome' },
  { width: 786, check: 'notes' },
  { width: 786, check: 'chrome' },
  { width: 786, check: 'sheets' },
  { width: 786, check: 'picker' },
  { width: 786, check: 'confirmation' },
  { width: 786, check: 'benchmark' },
  { width: 721, check: 'benchmark' },
  { width: 375, check: 'sheets' },
  { width: 375, check: 'confirmation' },
  { width: 375, check: 'samples' },
  { width: 375, check: 'benchmark' },
  { width: 375, check: 'pieces' },
  { width: 375, check: 'landing' },
  { width: 375, check: 'notes' },
  { width: 375, check: 'chrome' },
  { width: 1440, check: 'cells' },
  { width: 375, check: 'cells' },
  { width: 1440, check: 'palette' },
  { width: 1440, check: 'links' },
  { width: 1440, check: 'integrity' },
  { width: 1440, check: 'text' },
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function resolveSiteFile(url) {
  try {
    const { pathname } = new URL(url, 'http://127.0.0.1');
    const file = path.join(SITE_DIRECTORY, decodeURIComponent(pathname).replace(/\/$/, '/index.html'));
    const relative = path.relative(SITE_DIRECTORY, file);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return null;
    }

    return fs.statSync(file, { throwIfNoEntry: false })?.isFile() ? file : null;
  } catch {
    return null;
  }
}

function serveSite() {
  const server = http.createServer((request, response) => {
    const file = resolveSiteFile(request.url);

    if (!file) {
      response.writeHead(404).end();

      return;
    }

    response.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });

  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function stopChrome(chrome) {
  if (chrome.pid === undefined || chrome.exitCode !== null || chrome.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const force = setTimeout(() => chrome.kill('SIGKILL'), KILL_TIMEOUT);

    chrome.once('exit', () => {
      clearTimeout(force);
      resolve();
    });
    chrome.kill();
  });
}

function removeProfile(profile) {
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
}

function launchChrome() {
  const executable = process.env.CHROME_PATH || CHROME_CANDIDATES.find(candidate => fs.existsSync(candidate));

  if (!executable) {
    return Promise.reject(new Error('No Chrome found. Set CHROME_PATH to a Chrome or Chromium executable.'));
  }

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lattice-dimers-chrome-'));
  const chrome = spawn(
    executable,
    [
      '--headless=new',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  return new Promise((resolve, reject) => {
    let output = '';
    let settled = false;
    const fail = error => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      stopChrome(chrome).finally(() => {
        removeProfile(profile);
        reject(error);
      });
    };
    const timer = setTimeout(
      () => fail(new Error(`Chrome did not open DevTools within ${LAUNCH_TIMEOUT / 1000} s: ${output.trim()}`)),
      LAUNCH_TIMEOUT,
    );

    chrome.stderr.on('data', data => {
      output += data;
      const match = output.match(/DevTools listening on ws:\/\/([^/\s]+)\//);

      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ chrome, profile, host: match[1] });
      }
    });
    chrome.on('error', fail);
    chrome.on('exit', code => fail(new Error(`Chrome exited with code ${code}: ${output.trim()}`)));
  });
}

async function openPage(host) {
  const response = await fetch(`http://${host}/json/new?about:blank`, {
    method: 'PUT',
    signal: AbortSignal.timeout(COMMAND_TIMEOUT),
  });
  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let lastId = 0;

  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error('Could not connect to the DevTools page.'));
  });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);

    if (request) {
      pending.delete(message.id);
      return message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    }
  };
  socket.onclose = () => {
    pending.forEach(request => request.reject(new Error('The DevTools connection closed.')));
    pending.clear();
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      if (socket.readyState !== WebSocket.OPEN) {
        reject(new Error(`${method}: the DevTools connection is closed.`));

        return;
      }

      const id = ++lastId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} got no answer within ${COMMAND_TIMEOUT / 1000} s.`));
      }, COMMAND_TIMEOUT);

      pending.set(id, {
        resolve: value => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: error => {
          clearTimeout(timer);
          reject(error);
        },
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async expression => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception ? exceptionDetails.exception.description : exceptionDetails.text);
    }

    return result.value;
  };
  const waitFor = async (expression, description) => {
    const deadline = Date.now() + WAIT_TIMEOUT;
    let lastError = null;

    while (Date.now() < deadline) {
      const ready = await evaluate(expression).catch(error => {
        lastError = error;
        return false;
      });

      if (ready) {
        return;
      }

      await sleep(100);
    }

    throw new Error(`Timed out waiting for ${description}${lastError ? ` (${lastError.message})` : ''}.`);
  };
  const settle = () => evaluate(SETTLE_LAYOUT);

  return { socket, send, evaluate, waitFor, settle };
}

async function loadSite(page, baseUrl, width, hash) {
  const run = `run=${Date.now()}`;

  await page.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: 1,
    mobile: width < 640,
  });
  await page.send('Page.navigate', { url: `${baseUrl}/?${run}#${hash}` });
  await page.waitFor(
    `location.search === '?${run}' && document.readyState === 'complete' && typeof DATA !== 'undefined'`,
    'the page',
  );
}

async function accessibleNames(page, selector) {
  const { root } = await page.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await page.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
  const names = [];

  for (const nodeId of nodeIds) {
    const { nodes } = await page.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
    const name = nodes[0].name ? nodes[0].name.value : '';
    const description = nodes[0].description ? nodes[0].description.value : '';
    names.push(description && description !== name ? `${name} (${description})` : name);
  }

  return names;
}

async function checkSheets(page, baseUrl, width) {
  await loadSite(page, baseUrl, width, 'gallery/4x4/1');
  const problems = [];

  for (const board of SHEET_BOARDS) {
    const [, rowCount, colCount] = board.match(/^(\d+)x(\d+)/);
    const label = `${board.includes('-diagonal') ? 'Domicule' : 'Domino'} tilings of a ${rowCount} by ${colCount} ${(board.match(/cylinder|torus/) || ['rectangle'])[0]}`;
    await page.evaluate(`location.hash = 'gallery/${board}/1'`);
    await page.waitFor(
      `(document.querySelector('#sheet svg')?.getAttribute('aria-label') || '').includes('${label}')`,
      `the ${board} sheet`,
    );
    await page.settle();
    const overflow = await page.evaluate(
      "(() => { const sheet = document.getElementById('sheet'); return sheet.scrollWidth - sheet.clientWidth; })()",
    );

    if (overflow > 0) {
      problems.push(`${board} sheet scrolls ${overflow} px sideways`);
    }
  }

  return problems;
}

async function checkPicker(page, baseUrl, width) {
  await loadSite(page, baseUrl, width, 'gallery/4x4/1');
  await page.settle();
  const overflow = await page.evaluate(
    "(() => { const boards = document.getElementById('boards'); return boards.scrollWidth - boards.clientWidth; })()",
  );

  return overflow > 0 ? [`board picker overflows by ${overflow} px`] : [];
}

async function checkConfirmation(page, baseUrl, width) {
  const problems = [];

  for (const board of CONFIRMATION_BOARDS) {
    problems.push(...(await checkBoardConfirmation(page, baseUrl, width, board)).map(problem => `${board}: ${problem}`));
  }

  return problems;
}

async function checkBoardConfirmation(page, baseUrl, width, board) {
  await loadSite(page, baseUrl, width, `gallery/${board.includes('?') ? board.replace('?', '/1?') : `${board}/1`}`);
  await page.waitFor("!document.getElementById('notice').hidden", `the ${board} notice`);
  const state = await page.evaluate(`(async () => {
    const enabled = () => [...document.querySelectorAll('${PAGE_CONTROLS}')].filter(control => !control.disabled);
    const before = { meta: document.getElementById('gallery-meta').textContent, enabled: enabled().map(control => control.id || control.textContent.trim()) };
    document.querySelectorAll('${PAGE_CONTROLS}').forEach(control => control.click());
    await new Promise(resolve => setTimeout(resolve, 500));
    return { ...before, workerStarted: worker !== null, noticeShown: !document.getElementById('notice').hidden };
  })()`);
  const problems = [];

  if (state.meta.includes('showing')) {
    problems.push(`meta line shows a range before confirmation: "${state.meta}"`);
  }

  if (state.enabled.length) {
    problems.push(`controls active before confirmation: ${state.enabled.join(', ')}`);
  }

  if (state.workerStarted || !state.noticeShown) {
    problems.push('a control started building the counting table without confirmation');
  }

  return problems;
}

async function checkSamples(page, baseUrl, width) {
  const problems = [];
  await loadSite(page, baseUrl, width, 'gallery');
  await page.waitFor("document.querySelector('#sheet svg')", 'the default board');
  const chosen = await page.evaluate("[...document.querySelectorAll('#boards button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.id).join()");

  if (chosen !== '8x8') {
    problems.push(`the gallery opens on ${chosen}`);
  }

  for (const board of SAMPLE_BOARDS) {
    problems.push(...(await checkBoardSamples(page, baseUrl, width, board)).map(problem => `${board}: ${problem}`));
  }

  return problems;
}

async function checkBoardSamples(page, baseUrl, width, board) {
  const numbered = `(() => {
    const labels = [...document.querySelectorAll('#sheet text')].map(text => text.dataset.label || text.textContent);
    return labels.length === ${10} && labels.every(label => /^#[0-9]+$/.test(label)) ? labels.join() : '';
  })()`;
  await loadSite(page, baseUrl, width, `gallery/${board}/1`);
  await page.waitFor(numbered, `the numbered ${board} samples`);
  const state = await page.evaluate(`(() => {
    const total = BigInt(DATA.boards.find(b => b.id === '${board}').total);
    const labels = [...document.querySelectorAll('#sheet text')].map(text => text.dataset.label || text.textContent);
    return {
      labels: labels.join(),
      outOfRange: labels.filter(label => BigInt(label.slice(1)) < 1n || BigInt(label.slice(1)) > total),
      shown: !document.getElementById('page-controls').hidden,
      enabled: [...document.querySelectorAll('${PAGE_CONTROLS}')].filter(control => !control.disabled).map(control => control.id || control.textContent.trim()),
      notice: !document.getElementById('notice').hidden,
    };
  })()`);
  const problems = [];

  if (state.outOfRange.length) {
    problems.push(`numbers outside the board: ${state.outOfRange.join(', ')}`);
  }

  if (!state.shown || state.enabled.join() !== 'random' || state.notice) {
    problems.push(`toolbar shows ${JSON.stringify(state)}`);
  }

  await page.evaluate("document.getElementById('random').click()");
  await page.waitFor(`${numbered} && ${numbered} !== ${JSON.stringify(state.labels)}`, `new ${board} samples`);

  return problems;
}

async function checkPieces(page, baseUrl, width) {
  await loadSite(page, baseUrl, width, 'gallery/8x8/1');
  await page.waitFor("document.querySelector('#sheet svg')", 'the 8x8 sheet');
  const problems = [];
  const read = () =>
    page.evaluate(`(() => ({
      hash: location.hash,
      boards: [...document.querySelectorAll('#boards button')].filter(button => !button.hidden).map(button => button.dataset.id),
      legend: [...document.querySelectorAll('.legend > span')].filter(item => !item.hidden).length,
    }))()`);

  await page.evaluate("document.querySelector('#pieces [data-pieces=domicule]').click()");
  await page.waitFor("location.hash === '#gallery/8x8-diagonal/1'", 'the switch to 8x8 domicules');
  const diagonal = await read();

  if (!diagonal.boards.length || diagonal.boards.some(id => !id.endsWith('-diagonal'))) {
    problems.push(`domicule picker shows ${diagonal.boards.join(', ')}`);
  }

  if (diagonal.legend !== 4) {
    problems.push(`domicule legend shows ${diagonal.legend} pieces`);
  }

  await page.evaluate("location.hash = 'gallery/20x20-diagonal/1'");
  await page.waitFor("document.querySelector('#sheet svg .d, #sheet svg .a')", 'the 20x20 domicule sample');
  await page.evaluate("document.querySelector('#pieces [data-pieces=domino]').click()");
  await page.waitFor("location.hash === '#gallery/20x20/1'", 'the switch back to 20x20 dominoes');
  const straight = await read();

  if (straight.boards.some(id => id.endsWith('-diagonal')) || straight.legend !== 2) {
    problems.push(`domino view shows ${straight.boards.join(', ')} with ${straight.legend} legend entries`);
  }

  return problems;
}

async function checkStyles(page, baseUrl, width) {
  const hash = 'gallery/4x4-diagonal/1/5';
  const problems = [];
  const read = () =>
    page.evaluate(`(() => {
      const probe = document.body.appendChild(document.createElement('i'));
      probe.style.color = 'var(--h)';
      const expected = getComputedStyle(probe).color;
      probe.remove();
      const piece = document.querySelector('#sheet svg .h');
      const label = [...document.querySelectorAll('#sheet text')].find(text => text.textContent === '#5');
      return {
        svg: document.querySelector('#sheet svg').getAttribute('class'),
        gallery: document.getElementById('gallery').dataset.style,
        pressed: [...document.querySelectorAll('#styles button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.style),
        labels: document.querySelectorAll('#sheet text').length,
        highlighted: Boolean(label) && label.style.fill === 'var(--hit)',
        themed: getComputedStyle(piece)[document.querySelector('#sheet svg.blocks') ? 'fill' : 'stroke'] === expected,
      };
    })()`);
  const reload = async description => {
    await loadSite(page, baseUrl, width, hash);
    await page.waitFor("document.querySelector('#sheet svg')", description);
    return read();
  };

  try {
    await loadSite(page, baseUrl, width, hash);
    await page.evaluate("localStorage.setItem('lattice-dimers-style', 'bogus')");
    const initial = await reload('the 4x4 domicule sheet');

    if (initial.svg !== 'dimer' || initial.gallery !== 'dimer' || initial.pressed.join() !== 'dimer' || !initial.highlighted || !initial.themed) {
      problems.push(`an unknown saved style does not fall back to the dimer graph: ${JSON.stringify(initial)}`);
    }

    const order = await page.evaluate("[...document.querySelectorAll('#styles button')].map(b => b.dataset.style).join()");

    if (order !== 'dimer,blocks,engraving') {
      problems.push(`styles are listed as ${order}`);
    }

    for (const style of ['blocks', 'engraving']) {
      await page.evaluate(`document.querySelector('#styles [data-style=${style}]').click()`);
      const state = await read();

      if (state.svg !== style || state.gallery !== style || state.pressed.join() !== style || state.labels !== initial.labels || !state.highlighted) {
        problems.push(`after choosing ${style}: ${JSON.stringify(state)}`);
      }
    }

    const reloaded = await reload('the reloaded sheet');

    if (reloaded.svg !== 'engraving' || reloaded.pressed.join() !== 'engraving') {
      problems.push(`the chosen style did not survive a reload: ${JSON.stringify(reloaded)}`);
    }

    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });

    for (const style of ['blocks', 'dimer']) {
      await page.evaluate(`document.querySelector('#styles [data-style=${style}]').click()`);
      const dark = await read();

      if (!dark.themed) {
        problems.push(`the ${style} sheet ignores the dark palette: ${JSON.stringify(dark)}`);
      }
    }
  } finally {
    await page.send('Emulation.setEmulatedMedia', { features: [] });
    await page.evaluate("localStorage.removeItem('lattice-dimers-style')");
  }

  return problems;
}

async function checkLongLabels(page, baseUrl, width) {
  const board = '14x14-diagonal';
  const problems = [];
  await loadSite(page, baseUrl, width, `gallery/${board}/1`);
  const number = await page.evaluate(`String(BigInt(DATA.boards.find(b => b.id === '${board}').total) - BigInt(50))`);
  await page.evaluate(`goToTiling(DATA.boards.find(b => b.id === '${board}'), BigInt('${number}'))`);
  await page.waitFor(
    `[...document.querySelectorAll('#sheet text')].some(text => text.style.fill === 'var(--hit)')`,
    `the highlighted ${board} tiling`,
  );
  await page.settle();
  const state = await page.evaluate(`(() => {
    const texts = [...document.querySelectorAll('#sheet text')];
    const overlaps = ['text:not(.n)', 'text.n']
      .map(selector => [...document.querySelectorAll('#sheet ' + selector)].map(text => text.getBoundingClientRect()))
      .reduce((sum, boxes) => sum + boxes.filter((box, i) => i && Math.abs(box.top - boxes[i - 1].top) < 1 && box.left < boxes[i - 1].right).length, 0);
    const hit = texts.find(text => text.style.fill === 'var(--hit)');
    return { overlaps, hit: hit && (hit.dataset.label || hit.textContent), title: hit && hit.parentNode.querySelector('title')?.textContent };
  })()`);

  if (state.overlaps) {
    problems.push(`${state.overlaps} ${board} labels overlap their neighbours`);
  }

  if (state.hit !== `#${number}` || state.title !== `#${number}`) {
    problems.push(`#${number} is highlighted as ${JSON.stringify(state)}`);
  }

  return problems;
}

async function checkHistory(page, baseUrl, width) {
  const problems = [];
  await loadSite(page, baseUrl, width, 'gallery/10x10/1');
  await page.waitFor("document.querySelector('#sheet svg')", 'the 10x10 sheet');
  await page.evaluate("window.fragmentNavigations = 0; addEventListener('hashchange', () => window.fragmentNavigations++); document.getElementById('random').click()");
  await page.waitFor(
    "location.hash !== '#gallery/10x10/1' && [...document.querySelectorAll('#sheet text')].some(text => text.style.fill === 'var(--hit)')",
    'the random 10x10 tiling',
  );
  const random = await page.evaluate(`(() => {
    const [, , pageNumber, highlight] = location.hash.split('/');
    const hit = [...document.querySelectorAll('#sheet text')].find(text => text.style.fill === 'var(--hit)');
    return { hash: location.hash, fragmentNavigations, hit: hit && hit.textContent, highlight, pageNumber, input: document.getElementById('page').value.replace(/,/g, '') };
  })()`);

  if (random.fragmentNavigations) {
    problems.push(`Random navigated to a URL fragment ${random.fragmentNavigations} times`);
  }

  if (random.hit !== `#${random.highlight}` || random.input !== random.pageNumber) {
    problems.push(`Random shows ${JSON.stringify(random)}`);
  }

  await page.evaluate('history.back()');
  await page.waitFor(
    "location.hash === '#gallery/10x10/1' && document.getElementById('page').value === '1' && [...document.querySelectorAll('#sheet text')].some(text => text.textContent === '#1')",
    'the first 10x10 page after going back',
  );
  await page.evaluate("const field = document.getElementById('page'); field.value = 'abc'; field.dispatchEvent(new Event('change'))");
  const field = await page.evaluate("document.getElementById('page').value");

  if (field !== '1') {
    problems.push(`the page field keeps "${field}" after an invalid entry`);
  }

  await page.evaluate("fragmentNavigations = 0; document.querySelector('nav.tabs a[data-tab=benchmark]').click()");
  await page.waitFor("location.hash === '#benchmark' && !document.getElementById('benchmark').hidden", 'the benchmark tab');
  const tabs = await page.evaluate('fragmentNavigations');
  await page.evaluate('history.back()');
  await page.waitFor("location.hash === '#gallery/10x10/1' && !document.getElementById('gallery').hidden", 'the gallery after going back from a tab');

  if (tabs) {
    problems.push(`tab links navigated to a URL fragment ${tabs} times`);
  }

  return problems;
}

const READ_SHEET = `(() => ({
  hash: location.hash,
  aria: document.querySelector('#sheet svg')?.getAttribute('aria-label') || '',
  meta: document.getElementById('gallery-meta').textContent,
  boards: [...document.querySelectorAll('#boards button')].filter(button => !button.hidden).map(button => button.dataset.id),
  surface: document.querySelector('#surfaces [aria-pressed=true]')?.dataset.surface,
  seam: !document.querySelector('.legend .seam').hidden,
  seamEnds: !document.querySelector('.legend .seam-ends').hidden,
  ends: document.querySelectorAll('#sheet path.t').length,
  endsColor: (seam => seam && getComputedStyle(seam).stroke)(document.querySelector('#sheet path.t')),
  labelGap: (board => {
    const label = document.querySelector('#sheet text:not(.n)');
    return board && label ? Math.round((label.getBBox().y - (board.getBBox().y + board.getBBox().height)) * 10) / 10 : null;
  })(document.querySelector('#sheet rect.b')),
  picker: !document.getElementById('diagonal-picker').hidden,
  filter: { value: document.getElementById('diagonals').value, shown: !document.getElementById('diagonals').hidden, options: document.getElementById('diagonals').options.length },
  labels: document.querySelectorAll('#sheet text:not(.n)').length,
  sublabels: document.querySelectorAll('#sheet text.n').length,
  tip: (board => {
    if (!board) return '';
    const box = board.getBoundingClientRect();
    const tip = document.getElementById('tile-tip');
    document.getElementById('sheet').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 }));
    const text = tip.hidden ? '' : tip.innerText.replace(/\\s+/g, ' ');
    tip.hidden = true;
    return text;
  })(document.querySelector('#sheet rect.b')),
  seamColor: (seam => seam && getComputedStyle(seam).stroke)(document.querySelector('#sheet path.s')),
  clipped: document.querySelectorAll('#sheet svg svg').length,
  clip: (svg => svg && [svg.getAttribute('width'), svg.getAttribute('height')].join('x'))(document.querySelector('#sheet svg svg')),
  edges: document.querySelectorAll('#sheet path.s').length,
}))()`;

async function showBoard(page, hash, description) {
  const first = (BigInt(hash.split('?')[0].split('/')[2]) - BigInt(1)) * BigInt(100) + BigInt(1);
  await page.evaluate(`history.pushState(null, '', '#${hash}'); render()`);
  await page.waitFor(
    `location.hash === '#${hash}' && (label => label && (label.dataset.label || label.textContent) === '#${first}')(document.querySelector('#sheet text:not(.n)'))`,
    description,
  );
  await page.settle();

  return page.evaluate(READ_SHEET);
}

async function checkSurfaces(page, baseUrl, width) {
  const problems = [];
  await loadSite(page, baseUrl, width, 'gallery/4x4-diagonal/1');
  await page.waitFor("document.querySelector('#sheet svg')", 'the 4x4 domicule sheet');
  await page.evaluate("document.querySelector('#surfaces [data-surface=torus]').click()");
  await page.waitFor("location.hash === '#gallery/4x4-diagonal-torus/1' && document.querySelector('#sheet svg')?.getAttribute('aria-label').endsWith('4 by 4 torus')", 'the 4x4 domicule torus');
  await page.settle();
  const torus = await page.evaluate(READ_SHEET);

  if (torus.boards.join() !== [2, 4, 6, 8, 10].map(side => `${side}x${side}-diagonal-torus`).join() || torus.surface !== 'torus') {
    problems.push(`torus picker shows ${torus.boards.join(', ')} with ${torus.surface} pressed`);
  }

  if (!torus.seamEnds || torus.ends !== 100 || !(torus.labelGap >= 4 && torus.labelGap <= 7) || !torus.seam || torus.sublabels || !/^#1 \d+ horizontal, \d+ vertical \d+ diagonal pieces?: \d+ ↘, \d+ ↙ \d+ pieces? across a glued edge$/.test(torus.tip) || torus.clipped !== 100 || torus.clip !== '64x64' || torus.edges !== 100 || !torus.meta.startsWith('4×4 torus · 17,552 tilings')) {
    problems.push(`4x4 torus sheet: ${JSON.stringify({ ...torus, boards: undefined })}`);
  }

  const touch = await page.evaluate(`(() => {
    const box = document.querySelectorAll('#sheet rect.b')[13].getBoundingClientRect();
    const sheet = document.getElementById('sheet');
    const tip = document.getElementById('tile-tip');
    const at = { bubbles: true, pointerType: 'touch', clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
    sheet.dispatchEvent(new PointerEvent('pointerdown', at));
    sheet.dispatchEvent(new PointerEvent('pointerleave', at));
    const pinned = !tip.hidden && tip.querySelector('b').textContent;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    return { pinned, closed: tip.hidden };
  })()`);

  if (touch.pinned !== '#14' || !touch.closed) {
    problems.push(`a tapped tile: ${JSON.stringify(touch)}`);
  }

  await page.evaluate("document.querySelector('#pieces [data-pieces=domino]').click()");
  await page.waitFor("location.hash === '#gallery/4x4-torus/1' && document.querySelector('#sheet svg')?.getAttribute('aria-label').startsWith('Domino')", 'the 4x4 domino torus');
  const straight = await page.evaluate(READ_SHEET);

  if (straight.picker || straight.tip.includes('diagonal') || !straight.tip.includes('across a glued edge') || straight.surface !== 'torus') {
    problems.push(`domino torus shows the diagonal filter or counts: ${straight.tip}`);
  }

  const seamColors = await page.evaluate(`(() => {
    const probe = document.body.appendChild(document.createElement('i'));
    const resolve = name => { probe.style.color = 'var(' + name + ')'; return getComputedStyle(probe).color; };
    const colors = { sides: resolve('--seam'), ends: resolve('--seam-ends') };
    probe.remove();
    return colors;
  })()`);

  if (straight.seamColor !== seamColors.sides || straight.endsColor !== seamColors.ends || seamColors.sides === seamColors.ends) {
    problems.push(`the glued edges are drawn in ${straight.seamColor} and ${straight.endsColor}, not --seam ${seamColors.sides} and --seam-ends ${seamColors.ends}`);
  }

  await page.evaluate("document.querySelector('#surfaces [data-surface=rectangle]').click()");
  await page.waitFor("location.hash === '#gallery/4x4/1'", 'the switch back to the 4x4 rectangle');
  const rectangle = await page.evaluate(READ_SHEET);

  if (rectangle.seam || rectangle.seamEnds || rectangle.clipped || rectangle.edges || rectangle.ends) {
    problems.push('the rectangle keeps the glued edges');
  }

  for (const [hash, meta] of [
    ['gallery/4x4-diagonal-torus/1?diagonals=4', '4×4 torus · 8,384 tilings with 4 diagonal pieces (of 17,552)'],
    ['gallery/4x4-diagonal-cylinder/1?diagonals=8', '4×4 cylinder · 16 tilings with 8 diagonal pieces (of 2,649)'],
  ]) {
    const filtered = await showBoard(page, hash, `the ${hash} sheet`);

    const onTorus = hash.includes('torus');

    if (!filtered.meta.startsWith(meta) || !filtered.picker || !filtered.filter.shown || !filtered.tip.includes(`${hash.split('=')[1]} diagonal pieces`) || filtered.seamEnds !== onTorus || (filtered.ends > 0) !== onTorus) {
      problems.push(`${hash}: ${JSON.stringify(filtered)}`);
    }
  }

  if (width < 1440) {
    return problems;
  }

  const boards = await page.evaluate("JSON.stringify(DATA.boards.filter(b => b.surface !== 'rectangle').map(({ id, total }) => ({ id, total })))");

  for (const { id, total } of JSON.parse(boards)) {
    const pages = (BigInt(total) + BigInt(99)) / BigInt(100);
    const expected = Number(BigInt(total) - (pages - BigInt(1)) * BigInt(100));
    const last = await showBoard(page, `gallery/${id}/${pages}`, `the last page of ${id}`);

    if (last.labels !== expected) {
      problems.push(`the last page of ${id} shows ${last.labels} tilings, not ${expected} of ${total}`);
    }
  }

  return problems;
}

async function checkDiagonals(page, baseUrl, width) {
  const problems = [];
  await loadSite(page, baseUrl, width, 'gallery/6x6-diagonal/1?diagonals=4');
  await page.waitFor("document.querySelector('#sheet svg') && document.getElementById('gallery-meta').textContent.includes('showing')", 'the 6x6 sheet with 4 diagonal pieces');
  await page.settle();
  const filtered = await page.evaluate(READ_SHEET);

  if (
    !filtered.meta.startsWith('6×6 · 413,932 tilings with 4 diagonal pieces (of 3,037,561)') ||
    filtered.filter.value !== '4' ||
    filtered.filter.options !== 11 ||
    filtered.labels !== 100 ||
    !filtered.tip.includes('4 diagonal pieces')
  ) {
    problems.push(`6x6 with 4 diagonal pieces: ${JSON.stringify(filtered)}`);
  }

  await page.evaluate("document.getElementById('next').click()");
  await page.waitFor("location.hash === '#gallery/6x6-diagonal/2?diagonals=4' && document.querySelector('#sheet text:not(.n)')?.textContent === '#101'", 'the next 6x6 page with 4 diagonal pieces');
  await page.evaluate("document.querySelector('#boards [data-id=\"8x8-diagonal\"]').click()");
  await page.waitFor("location.hash === '#gallery/8x8-diagonal/1?diagonals=4' && document.getElementById('gallery-meta').textContent.includes('with 4 diagonal pieces')", 'the 8x8 board keeping the filter');

  for (const query of ['1', 'abc', '']) {
    const ignored = await showBoard(page, `gallery/6x6-diagonal/1?diagonals=${query}`, `the 6x6 sheet with ?diagonals=${query}`);

    if (!ignored.meta.startsWith('6×6 · 3,037,561 tilings · showing') || ignored.filter.value !== '') {
      problems.push(`?diagonals=${query} reads "${ignored.meta}" with the filter at "${ignored.filter.value}"`);
    }
  }

  const last = await showBoard(page, 'gallery/6x6-diagonal/4140?diagonals=4', 'the last 6x6 page with 4 diagonal pieces');

  if (last.labels !== 32 || !last.tip.includes('4 diagonal pieces')) {
    problems.push(`the last page with 4 diagonal pieces shows ${last.labels} tilings with ${last.tip}`);
  }

  const single = await showBoard(page, 'gallery/4x4-diagonal/1?diagonals=8', 'the only 4x4 tiling with 8 diagonal pieces');

  if (!single.meta.startsWith('4×4 · 1 tiling with 8 diagonal pieces (of 280)') || single.labels !== 1) {
    problems.push(`the 4x4 sheet with 8 diagonal pieces reads "${single.meta}" with ${single.labels} tilings`);
  }

  await showBoard(page, 'gallery/6x6-diagonal/1?diagonals=4', 'the 6x6 sheet with 4 diagonal pieces again');
  await page.evaluate("const select = document.getElementById('diagonals'); select.value = ''; select.dispatchEvent(new Event('change'))");
  await page.waitFor("location.hash === '#gallery/6x6-diagonal/1' && document.getElementById('gallery-meta').textContent.startsWith('6×6 · 3,037,561 tilings · showing')", 'the 6x6 sheet without the filter');
  await page.evaluate("if (!document.getElementById('highlight').checked) document.getElementById('highlight').click()");
  await page.settle();
  const colors = await page.evaluate(`(() => {
    const probe = document.body.appendChild(document.createElement('i'));
    const resolve = name => { probe.style.color = 'var(' + name + ')'; return getComputedStyle(probe).color; };
    const expected = { mute: resolve('--mute'), d: resolve('--d') };
    probe.remove();
    return {
      highlight: 'highlight' in document.getElementById('gallery').dataset,
      straight: getComputedStyle(document.querySelector('#sheet svg .h, #sheet svg .v')).fill,
      diagonal: getComputedStyle(document.querySelector('#sheet svg .d')).fill,
      expected,
    };
  })()`);

  if (!colors.highlight || colors.straight !== colors.expected.mute || colors.diagonal !== colors.expected.d) {
    problems.push(`highlighted diagonals: ${JSON.stringify(colors)}`);
  }

  await page.evaluate("document.getElementById('highlight').click()");

  for (const [board, filtered] of [['12x12-diagonal', false], ['4x4-diagonal-cylinder', true], ['10x10-diagonal-torus', true], ['2x2-diagonal', true]]) {
    const state = await showBoard(page, `gallery/${board}/1`, `the ${board} sheet`);

    if (!state.picker || state.filter.shown !== filtered || !/diagonal pieces?:/.test(state.tip)) {
      problems.push(`${board} filter: ${JSON.stringify(state.filter)}, tooltip ${state.tip}`);
    }
  }

  return problems;
}

async function checkLanding(page, baseUrl, width) {
  await loadSite(page, baseUrl, width, 'gallery/4x4/1');
  await page.settle();
  const state = await page.evaluate(`(() => ({
    oeis: [...document.querySelectorAll('.intro a')].map(link => link.getAttribute('href')),
    leftovers: ['.sequences', 'nav.notes', 'math', '.formula'].filter(selector => document.querySelector(selector)),
    tabs: [...document.querySelectorAll('nav.tabs a')].map(link => link.dataset.tab),
  }))()`);
  const problems = [];

  const introLinks = [
    'notes/research.html',
    'papers/king-entropy.pdf',
    'papers/king-entropy-log-convexity.pdf',
    'https://oeis.org/A004003',
    'https://oeis.org/A239273',
    'https://github.com/dawidrylko/lattice-dimers/tree/master/oeis',
  ];

  if (state.oeis.join() !== introLinks.join()) {
    problems.push(`intro links ${state.oeis.join(', ')}`);
  }

  if (state.leftovers.length) {
    problems.push(`main page still has ${state.leftovers.join(', ')}`);
  }

  if (state.tabs.join() !== 'gallery,benchmark') {
    problems.push(`tabs are ${state.tabs.join(', ')}`);
  }

  return problems;
}

async function checkNotes(page, baseUrl, width) {
  const problems = [];

  for (const { slug, cells, figures = 0 } of NOTES) {
    const run = `run=${Date.now()}`;

    await page.send('Emulation.setDeviceMetricsOverride', { width, height: VIEWPORT_HEIGHT, deviceScaleFactor: 1, mobile: width < 640 });
    await page.send('Page.navigate', { url: `${baseUrl}/notes/${slug}.html?${run}` });
    await page.waitFor(`location.search === '?${run}' && document.readyState === 'complete'`, `the ${slug} note`);
    await page.settle();
    const state = await page.evaluate(`(() => ({
      cells: document.querySelectorAll('.cell').length,
      outputs: [...document.querySelectorAll('.output td, pre.output')].map(cell => cell.textContent.trim()),
      sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      unresolved: /undefined|\\u0000/.test(document.querySelector('article').textContent),
      math: document.querySelectorAll('.math').length,
      katex: document.querySelectorAll('.katex').length,
      chartFont: [...document.querySelectorAll('figure.chart svg text')].map(text => getComputedStyle(text).fontFamily).filter(font => /monospace/.test(font)).length,
      figures: [...document.querySelectorAll('figure.tiling')].filter(figure => { const svgs = [...figure.querySelectorAll('svg:not(svg svg)')]; return svgs.length > 0 && svgs.every(svg => svg.getBoundingClientRect().width > 0 && svg.getBoundingClientRect().right <= document.documentElement.clientWidth + 0.5); }).length,
      charts: [...document.querySelectorAll('figure.chart')].map(figure => [...figure.querySelectorAll('svg')].filter(svg => getComputedStyle(svg).display !== 'none').length),
      label: Math.min(...[...document.querySelectorAll('figure.tiling svg text')].map(text => {
        const svg = text.closest('figure.tiling svg:not(svg svg)');

        return (parseFloat(getComputedStyle(text).fontSize) * svg.getBoundingClientRect().width) / svg.viewBox.baseVal.width;
      })),
      covering: [...document.querySelectorAll('figure.tiling .bg')].filter(bg => getComputedStyle(bg).fill !== 'none').length,
      unnamed: [...document.querySelectorAll('figure.tiling svg:not(svg svg)')].filter(svg => svg.getAttribute('role') !== 'img' || !${FIGURE_NAME}.test(svg.getAttribute('aria-label') || '')).length,
    }))()`);
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    const dark = await page.evaluate(`(() => {
      const probe = document.body.appendChild(document.createElement('i'));
      probe.style.color = 'var(--mute)';
      const mute = getComputedStyle(probe).color;
      probe.remove();

      return {
        backgrounds: [...document.querySelectorAll('figure.tiling')].filter(figure => { const sheet = figure.querySelector('.sheet'); return !sheet || ['rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)'].includes(getComputedStyle(sheet).backgroundColor); }).length,
        muted: [...document.querySelectorAll('figure.tiling.highlight .h, figure.tiling.highlight .v')].filter(piece => getComputedStyle(piece).fill !== mute).length,
      };
    })()`);
    await page.send('Emulation.setEmulatedMedia', { features: [] });

    if (figures && !(state.label >= MIN_FIGURE_LABEL)) {
      problems.push(`${slug} labels its tilings at ${state.label.toFixed(1)} px, under ${MIN_FIGURE_LABEL} px`);
    }

    if (state.covering) {
      problems.push(`${slug} paints ${state.covering} tiling backgrounds over the seam marks of the tiling beside them`);
    }

    if (state.unnamed) {
      problems.push(`${slug} has ${state.unnamed} tiling drawings without a name that says what they show`);
    }

    if (dark.backgrounds || dark.muted) {
      problems.push(`${slug} draws ${dark.backgrounds} drawings off the dark sheet and ${dark.muted} greyed pieces off the dark palette`);
    }

    if (state.cells !== cells) {
      problems.push(`${slug} has ${state.cells} cells instead of ${cells}`);
    }

    if (state.chartFont) {
      problems.push(`${slug} draws ${state.chartFont} chart labels in the monospace of a tiling drawing`);
    }

    if (state.figures !== figures) {
      problems.push(`${slug} shows ${state.figures} tiling drawings within the page instead of ${figures}`);
    }

    if (state.unresolved) {
      problems.push(`${slug} shows an unresolved token`);
    }

    if (state.math && !state.katex) {
      problems.push(`${slug} has ${state.math} formulas but KaTeX rendered none`);
    }

    if (state.outputs.some(text => NOTE_FAILURES.includes(text))) {
      problems.push(`${slug} reports a mismatch`);
    }

    if (state.sideways > 0) {
      problems.push(`${slug} scrolls ${state.sideways} px sideways`);
    }

    if (state.charts.some(count => count !== 1)) {
      problems.push(`${slug} shows ${state.charts.join(', ')} drawings per chart instead of 1`);
    }
  }

  for (const [from, to] of NOTE_REDIRECTS) {
    await page.send('Page.navigate', { url: `${baseUrl}/notes/${from}.html#running-time` });
    await page.waitFor(
      `location.pathname.endsWith('/notes/${to}.html') && location.hash === '#running-time' && document.readyState === 'complete'`,
      `the move from ${from}.html to ${to}.html`,
    );
  }

  for (const [from, id, to, fragment] of MOVED_SECTIONS) {
    await page.send('Page.navigate', { url: `${baseUrl}/notes/${from}.html#${id}` });
    await page.waitFor(
      `location.pathname.endsWith('/notes/${to}.html') && location.hash === '#${fragment}' && document.readyState === 'complete' && Boolean(document.getElementById('${fragment}'))`,
      `the move of the section ${from}.html#${id} to ${to}.html#${fragment}`,
    );
  }

  return problems;
}

const READ_CHROME = `(() => {
  const header = document.querySelector('main > header');
  const footer = document.querySelector('main > footer');
  const style = element => {
    const computed = element && getComputedStyle(element);
    return computed && [computed.fontSize, computed.fontWeight, computed.lineHeight, computed.color].join(' ');
  };
  const brand = header && header.firstElementChild;
  const nav = header ? [...header.querySelectorAll('nav a')] : [];
  return {
    brand: brand && brand.textContent.trim(),
    brandTag: brand && brand.tagName,
    headings: document.querySelectorAll('h1').length,
    brandStyle: style(brand),
    brandHome: brand && (brand.tagName === 'H1' ? location.origin + location.pathname : brand.href),
    logo: brand && brand.querySelector('img') ? brand.querySelector('img').getBoundingClientRect().width : 0,
    height: header ? Math.round(header.getBoundingClientRect().height) : 0,
    nav: nav.map(link => link.textContent.trim() + ' ' + link.href).join(' | '),
    navStyle: style(nav.find(link => !link.hasAttribute('aria-current'))),
    navBoxes: (header ? [...header.querySelectorAll('nav a, nav summary')] : [])
      .filter(item => !item.closest('details:not([open]) .menu'))
      .map(item => Math.round(item.getBoundingClientRect().left) + ',' + Math.round(item.getBoundingClientRect().top))
      .join(' '),
    current: nav.filter(link => link.getAttribute('aria-current') === 'page').map(link => link.href),
    marked: document.querySelectorAll('[aria-current="page"]').length,
    groups: header ? [...header.querySelectorAll('summary')].map(summary => summary.textContent.trim()).join(', ') : '',
    currentGroups: header ? [...header.querySelectorAll('summary[data-current][aria-current="true"]')].map(summary => summary.textContent.trim()) : [],
    linkGroup: (() => {
      const link = header && header.querySelector('nav [aria-current="page"]');
      const group = link && link.closest('details');
      return group ? group.querySelector('summary').textContent.trim() : '';
    })(),
    back: header ? [...header.querySelectorAll('a')].some(link => link.textContent.includes('←')) : false,
    footer: footer ? [...footer.querySelectorAll('.site-links a')].map(link => link.textContent.trim() + ' ' + link.href).join(' | ') : '',
    footerStyle: footer && [style(footer), getComputedStyle(footer).borderTop, style(footer.lastElementChild), getComputedStyle(footer.lastElementChild).margin].join(' '),
  };
})()`;

const READ_MENUS = `(() => {
  const header = document.querySelector('main > header');
  const focused = document.activeElement;
  return {
    height: Math.round(header.getBoundingClientRect().height),
    width: document.documentElement.clientWidth,
    menus: [...header.querySelectorAll('nav details')].map(details => {
      const summary = details.querySelector('summary').getBoundingClientRect();
      const menu = details.querySelector('.menu').getBoundingClientRect();
      const links = [...details.querySelectorAll('.menu a')];
      const top = links.length && document.elementFromPoint(links[0].getBoundingClientRect().left + 2, links[0].getBoundingClientRect().top + links[0].getBoundingClientRect().height / 2);
      return {
        label: details.querySelector('summary').textContent.trim(),
        open: details.open,
        summary: [summary.left + summary.width / 2, summary.top + summary.height / 2],
        left: menu.left,
        right: menu.right,
        onTop: Boolean(top && links[0].contains(top)),
        shadow: getComputedStyle(details.querySelector('.menu')).boxShadow,
        focus: details.contains(focused) ? focused.tagName + ' ' + focused.textContent.trim() : '',
      };
    }),
  };
})()`;

async function pressKey(page, key, code, keyCode) {
  const text = key === 'Enter' ? '\r' : undefined;

  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, ...(text && { text }) });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
}

async function clickAt(page, [x, y]) {
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
}

async function checkMenus(page, width) {
  const problems = [];
  const before = await page.evaluate(READ_MENUS);

  if (before.menus.some(menu => menu.open)) {
    problems.push(`at ${width} px a menu is open before anyone opens it`);
  }

  for (const [index, { label }] of before.menus.entries()) {
    await page.evaluate(`document.querySelectorAll('main > header nav summary')[${index}].focus()`);
    await pressKey(page, 'Enter', 'Enter', 13);
    await page.settle();
    const opened = await page.evaluate(READ_MENUS);
    const menu = opened.menus[index];

    if (!menu.open || opened.menus.filter(other => other.open).length !== 1) {
      problems.push(`at ${width} px Enter on ${label} leaves ${opened.menus.filter(other => other.open).map(other => other.label).join(', ') || 'no menu'} open`);
    }

    if (menu.left < 0 || menu.right > opened.width || !menu.onTop) {
      problems.push(`at ${width} px the ${label} menu spans ${Math.round(menu.left)} to ${Math.round(menu.right)} px of ${opened.width} or lies under the page`);
    }

    if (!/rgba?\(/.test(menu.shadow)) {
      problems.push(`at ${width} px the ${label} menu casts no shadow over the page: ${menu.shadow}`);
    }

    if (opened.height !== before.height) {
      problems.push(`at ${width} px opening ${label} moves the header from ${before.height} to ${opened.height} px`);
    }

    await pressKey(page, 'Tab', 'Tab', 9);
    const tabbed = await page.evaluate(READ_MENUS);

    if (!tabbed.menus[index].focus.startsWith('A ')) {
      problems.push(`at ${width} px Tab from ${label} goes to ${tabbed.menus[index].focus || 'outside the menu'} instead of its first link`);
    }

    await pressKey(page, 'Escape', 'Escape', 27);
    const closed = await page.evaluate(READ_MENUS);

    if (closed.menus[index].open || closed.menus[index].focus !== `SUMMARY ${label}`) {
      problems.push(`at ${width} px Escape leaves ${label} ${closed.menus[index].open ? 'open' : 'closed'} with the focus on ${closed.menus[index].focus || 'another element'}`);
    }
  }

  await clickAt(page, before.menus[0].summary);
  await clickAt(page, before.menus[1].summary);
  const switched = await page.evaluate(READ_MENUS);

  if (switched.menus.map(menu => menu.open).join() !== before.menus.map((menu, index) => index === 1).join()) {
    problems.push(`at ${width} px clicking ${before.menus[0].label} then ${before.menus[1].label} leaves ${switched.menus.filter(menu => menu.open).map(menu => menu.label).join(', ') || 'no menu'} open`);
  }

  await clickAt(page, [Math.round(switched.width / 2), Math.round(before.height + 400)]);
  const outside = await page.evaluate(READ_MENUS);

  if (outside.menus.some(menu => menu.open)) {
    problems.push(`at ${width} px a click outside leaves ${outside.menus.filter(menu => menu.open).map(menu => menu.label).join(', ')} open`);
  }

  return problems;
}

async function checkChrome(page, baseUrl, width) {
  const problems = [];
  await loadSite(page, baseUrl, width, 'gallery/4x4/1');
  await page.settle();
  const home = await page.evaluate(READ_CHROME);
  const homeUrl = `${baseUrl}/`;

  if (home.brand !== 'Lattice Dimers' || !home.logo || !home.nav || !home.footer) {
    problems.push(`the main page header or footer is incomplete: ${JSON.stringify(home)}`);
  }

  if (home.brandTag !== 'H1' || home.headings !== 1) {
    problems.push(`the main page has ${home.headings} h1 and its site name is a ${home.brandTag}`);
  }

  if (home.current.join() !== homeUrl || home.marked !== 1 || home.currentGroups.length) {
    problems.push(`the main page marks ${home.current.join() || 'no link'} and ${home.marked} elements as current, and the groups ${home.currentGroups.join(', ') || 'none'}`);
  }

  if (home.groups !== MENU_GROUPS.join(', ')) {
    problems.push(`the menu groups are ${home.groups} instead of ${MENU_GROUPS.join(', ')}`);
  }

  problems.push(...(await checkMenus(page, width)));

  for (const { slug, group = '' } of NOTES) {
    const run = `run=${Date.now()}`;

    await page.send('Page.navigate', { url: `${baseUrl}/notes/${slug}.html?${run}` });
    await page.waitFor(`location.search === '?${run}' && document.readyState === 'complete'`, `the ${slug} note`);
    await page.settle();
    const note = await page.evaluate(READ_CHROME);

    if (note.marked !== 1 || note.linkGroup !== group || note.currentGroups.join() !== group) {
      problems.push(`${slug} marks ${note.marked} elements as current, its link sits in ${note.linkGroup || 'no group'} and the marked groups are ${note.currentGroups.join(', ') || 'none'} instead of ${group || 'none'}`);
    }

    ['brand', 'brandStyle', 'logo', 'height', 'nav', 'navStyle', 'navBoxes', 'footer', 'footerStyle'].forEach(key => {
      if (note[key] !== home[key]) {
        problems.push(`${slug} ${key} is ${JSON.stringify(note[key])} instead of ${JSON.stringify(home[key])}`);
      }
    });

    if (note.brandTag !== 'A' || note.headings !== 1) {
      problems.push(`${slug} has ${note.headings} h1 and its site name is a ${note.brandTag}`);
    }

    if (note.brandHome !== homeUrl) {
      problems.push(`${slug} brand links to ${note.brandHome} instead of ${homeUrl}`);
    }

    if (note.current.join() !== `${baseUrl}/notes/${slug}.html`) {
      problems.push(`${slug} marks ${note.current.join() || 'no link'} as current`);
    }

    if (note.back) {
      problems.push(`${slug} still has a back link`);
    }
  }

  return problems;
}

async function checkBenchmark(page, baseUrl, width) {
  const problems = [];

  for (const [hash, view, rows, complete] of [
    ['benchmark', 'domino/rectangle', 'domino-benchmark-rows', null],
    ['benchmark/domino/cylinder', 'domino/cylinder', 'domino-cylinder-benchmark-rows', 'some'],
    ['benchmark/domino/torus', 'domino/torus', 'domino-torus-benchmark-rows', 'some'],
    ['benchmark/domicule/rectangle', 'domicule/rectangle', 'domicule-benchmark-rows', 'every'],
    ['benchmark/domicule/cylinder', 'domicule/cylinder', 'cylinder-benchmark-rows', 'some'],
    ['benchmark/domicule/torus', 'domicule/torus', 'torus-benchmark-rows', 'some'],
    ['benchmark/dominoes', 'domino/rectangle', 'domino-benchmark-rows', null],
    ['benchmark/domicules', 'domicule/rectangle', 'domicule-benchmark-rows', null],
    ['benchmark-domicule', 'domicule/rectangle', 'domicule-benchmark-rows', null],
    ['benchmark/cylinders', 'domicule/cylinder', 'cylinder-benchmark-rows', null],
    ['benchmark/tori', 'domicule/torus', 'torus-benchmark-rows', null],
    ['benchmark/diagonals', 'domicule/rectangle', 'domicule-benchmark-rows', null],
    ['benchmark/domino/hexagon', 'domino/rectangle', 'domino-benchmark-rows', null],
  ]) {
    await loadSite(page, baseUrl, width, hash);
    await page.waitFor(`document.querySelectorAll('#${rows} tr').length > 0`, `the ${view} rows`);
    await page.settle();
    const shown = await page.evaluate(SHOWN_BENCHMARK);
    const state = await page.evaluate(`(() => {
      const section = document.getElementById('benchmark');
      const wraps = [...section.querySelectorAll('.bench-group:not([hidden]) .table-wrap')];
      const times = row => [...row.cells].slice(2, -1).map(cell => cell.textContent);
      return {
        shown: !section.hidden && document.getElementById('gallery').hidden,
        overflow: Math.max(...wraps.map(wrap => wrap.scrollWidth - wrap.clientWidth)),
        hidden: wraps.flatMap(wrap => {
          const box = wrap.getBoundingClientRect();
          return [...wrap.querySelectorAll('td')].filter(cell => {
            const rect = cell.getBoundingClientRect();
            return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
          });
        }).length,
        empty: wraps.filter(wrap => !wrap.querySelectorAll('tbody tr').length).map(wrap => wrap.querySelector('table').id),
        missing: wraps.flatMap(wrap =>
          [...wrap.querySelectorAll('tbody tr')]
            .filter(row => row.cells[0].textContent !== '0×0')
            .filter(row => ('${complete}' === 'every' ? times(row).includes('-') : times(row).every(time => time === '-')))
            .map(row => row.cells[0].textContent),
        ),
        environment: section.querySelector('.environment').textContent,
        titles: section.querySelectorAll('.bench-group h2, .bench-group h3').length,
        older: section.textContent.split('benchmarks/results/').length !== 2 || /pnpm benchmark/.test(section.textContent),
        rule: getComputedStyle(section.querySelector('.run')).borderTopStyle,
        dashes: [...section.querySelectorAll('.bench-group:not([hidden])')].flatMap(group => {
          const table = group.querySelector('table');
          const bigint = [...table.tHead.rows[0].cells].findIndex(th => th.textContent.trim().startsWith('BigInt'));
          const cells = [...table.tBodies[0].rows].flatMap(row => [...row.cells].slice(2, -1).map((cell, i) => ({ dash: cell.textContent.trim() === '-', bigint: i + 2 === bigint })));
          const noted = [...group.querySelectorAll('.note')].some(note => note.textContent.startsWith('A dash under BigInt'));
          return [
            ...(cells.some(cell => cell.dash && !cell.bigint) ? [table.id + ' has a dash outside BigInt'] : []),
            ...(cells.some(cell => cell.dash) !== noted ? [table.id + (noted ? ' explains dashes it does not show' : ' shows a dash it does not explain')] : []),
          ];
        }),
        unnamed: wraps.filter(wrap => !wrap.querySelector('table').getAttribute('aria-label')).length,
      };
    })()`);

    if (state.dashes.length) {
      problems.push(`#${hash}: ${state.dashes.join(', ')}`);
    }

    if (state.older || state.rule !== 'none') {
      problems.push(`#${hash} lists older benchmark runs or rules off the run note (${state.rule})`);
    }

    if (state.titles || state.unnamed) {
      problems.push(`#${hash} shows ${state.titles} table headings and ${state.unnamed} tables without a name`);
    }

    if (!state.shown || shown.shown !== view || shown.pressed !== view) {
      problems.push(`#${hash} shows ${shown.shown} with ${shown.pressed} pressed instead of ${view}`);
    }

    if (state.overflow > 0 || state.hidden) {
      problems.push(`#${hash} scrolls ${state.overflow} px sideways with ${state.hidden} cells off screen`);
    }

    if (complete && (state.missing.length || state.empty.length)) {
      problems.push(`#${hash} has no time for ${state.missing.join(', ')} and no rows in ${state.empty.join(', ')}`);
    }

    if (!/^Run on \d{4}-\d{2}-\d{2} on .+ with Node\.js /.test(state.environment)) {
      problems.push(`#${hash} has no environment`);
    }
  }

  await loadSite(page, baseUrl, width, 'benchmark');
  const diagonals = await page.evaluate(`Boolean(document.getElementById('diagonal-benchmark'))`);

  if (diagonals) {
    problems.push('the benchmarks still show the diagonal pieces table');
  }

  for (const [view, id, source, tilings4x4, solver, languages] of LANGUAGE_TABLES) {
    const columnNames = languageColumns(solver);
    const columnIcons = languageIcons(solver);
    await loadSite(page, baseUrl, width, `benchmark/${view}`);
    await page.waitFor(`document.querySelectorAll('#${id}-rows tr').length > 0`, `the ${view} rows`);
    await page.settle();
    const columns = await page.evaluate(`(() => {
      const headers = [...document.querySelectorAll('#${id} thead th')].slice(2, -1);
      const rows = [...document.querySelectorAll('#${id}-rows tr')];
      const shown = icon => icon && icon.getAttribute('aria-hidden') === 'true' && icon.getBoundingClientRect().width > 0 ? icon.querySelector('use').getAttribute('href') : 'no icon';
      return {
        tilings4x4: rows.filter(row => row.cells[0].textContent === '4×4').map(row => row.cells[1].textContent.trim().replace(/^Tilings/, '')).join(),
        headerRows: document.querySelectorAll('#${id} thead tr').length,
        titles: headers.map(th => th.title).join(' | '),
        headers: headers.map(th => th.textContent.trim() + ' ' + shown(th.querySelector('svg.lang'))).join(' | '),
        values: [...rows[0].cells].slice(2, -1).map(cell => cell.textContent),
        cards: [...rows[0].cells].slice(2, -1).map(cell => (cell.dataset.text || '') + ' ' + shown(cell.querySelector(':scope > svg.lang'))).join(' | '),
        drifted: rows.flatMap(row => [...row.cells].slice(2, -1).map((cell, i) => {
          const icon = cell.querySelector(':scope > svg.lang');
          const first = rows[0].cells[i + 2].querySelector(':scope > svg.lang');
          const offset = (svg, td) => Math.round(svg.getBoundingClientRect().left - td.getBoundingClientRect().left);
          return icon && first && offset(icon, cell) !== offset(first, rows[0].cells[i + 2]) ? row.cells[0].textContent + ' ' + cell.dataset.label : null;
        })).filter(Boolean),
        labels: rows.map(row => [...row.cells].map(cell => cell.dataset.label).join(' | ')),
        split: rows.filter(row => new Set([...row.cells].slice(2, 6).map(cell => Math.round(cell.getBoundingClientRect().top))).size > 1).length,
        wrapped: rows.filter(row => [...row.cells].slice(2, 6).some(cell => cell.getBoundingClientRect().height > row.cells[0].getBoundingClientRect().height + 1)).length,
      };
    })()`);
    const names = await accessibleNames(page, `#${id} thead th`);
    const cells = await accessibleNames(page, `#${id}-rows tr:first-child td`);
    const solvers = names.slice(2, -1);
    const wrong = columns.labels.filter(row => row !== names.join(' | '));
    const cards = width <= MOBILE_TABLE_WIDTH;
    const unnamed = cells.slice(2, -1).filter((name, i) => name !== (cards ? `${solvers[i]} ${columns.values[i]}` : columns.values[i]));
    const cardIcons = cards ? columnIcons : columnIcons.replace(/#icon-\w+/g, 'no icon');

    if (columns.tilings4x4 !== tilings4x4) {
      problems.push(`#${id} counts ${columns.tilings4x4} tilings of the 4×4 board instead of ${tilings4x4}`);
    }

    if (columns.headerRows !== 1 || names.join(' | ') !== columnNames.join(' | ') || columns.titles !== solvers.join(' | ')) {
      problems.push(`#${id} has ${columns.headerRows} header rows named ${names.join(' | ')} with the titles ${columns.titles}`);
    }

    if (columns.headers !== columnIcons) {
      problems.push(`#${id} shows the solver headers ${columns.headers}`);
    }

    if (columns.cards !== cardIcons) {
      problems.push(`#${id} labels the solver cells ${columns.cards} at ${width} px`);
    }

    if (columns.drifted.length) {
      problems.push(`#${id} moves the card icon away from its label in ${columns.drifted.join(', ')}`);
    }

    if (!columns.labels.length || wrong.length || unnamed.length) {
      problems.push(`#${id} has ${wrong.length} of ${columns.labels.length} rows labelled unlike the headers, and the cells ${unnamed.join(', ')} named unlike their cards`);
    }

    if (columns.split) {
      problems.push(`#${id} spreads the four times of ${columns.split} rows over more than one line`);
    }

    if (columns.wrapped) {
      problems.push(`#${id} wraps a time onto a second line in ${columns.wrapped} rows`);
    }

    const wideOverflow = await page.evaluate(`(async () => {
      const style = document.head.appendChild(document.createElement('style'));
      style.textContent = '.bench { font-family: ${WIDE_FONT}; }';
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const wrap = document.getElementById('${id}').closest('.table-wrap');
      const overflow = wrap.scrollWidth - wrap.clientWidth;
      style.remove();
      return overflow;
    })()`);

    if (wideOverflow > 0) {
      problems.push(`#${id} scrolls ${wideOverflow} px sideways in ${WIDE_FONT}`);
    }

    const runsTitle = await page.evaluate(`(() => {
      const row = structuredClone(${source}.find(r => r.bigint && r.languages.rs));
      row.languages.rs.runs += 1;
      renderSolverRows('${id}', [row], ${languages});
      const runs = document.querySelector('#${id}-rows tr').lastElementChild.querySelector('span[title]');
      return runs ? runs.title : 'no tooltip';
    })()`);

    if (runsTitle !== columnNames.slice(2, -1).join(' / ')) {
      problems.push(`#${id} names the runs of different solvers ${runsTitle}`);
    }
  }

  await loadSite(page, baseUrl, width, 'benchmark');

  for (const [selector, hash, view] of [
    ['#benchmark-pieces button[data-pieces=domicule]', '#benchmark/domicule/rectangle', 'domicule/rectangle'],
    ['#benchmark-surfaces button[data-surface=cylinder]', '#benchmark/domicule/cylinder', 'domicule/cylinder'],
    ['#benchmark-surfaces button[data-surface=torus]', '#benchmark/domicule/torus', 'domicule/torus'],
    ['#benchmark-pieces button[data-pieces=domino]', '#benchmark/domino/torus', 'domino/torus'],
  ]) {
    await page.evaluate(`document.querySelector('${selector}').click()`);
    await page.waitFor(`location.hash === '${hash}'`, `the switch to ${view}`);
    await page.settle();
    const shown = await page.evaluate(SHOWN_BENCHMARK);

    if (shown.shown !== view || shown.pressed !== view) {
      problems.push(`${selector} shows ${shown.shown} with ${shown.pressed} pressed instead of ${view}`);
    }
  }

  const length = await page.evaluate('history.length');
  await page.evaluate(
    "document.querySelector('#benchmark-surfaces button[data-surface=torus]').click(); document.querySelector('#benchmark-pieces button[data-pieces=domino]').click(); document.querySelector('nav.tabs a[data-tab=benchmark]').click()",
  );
  await page.settle();
  const kept = await page.evaluate('({ hash: location.hash, added: history.length - ' + length + ' })');

  if (kept.hash !== '#benchmark/domino/torus' || kept.added) {
    problems.push(`clicking the pressed switches and the Benchmarks tab moved to ${kept.hash} and added ${kept.added} history entries`);
  }

  return problems;
}

async function checkBenchmarkCells(page, baseUrl, width) {
  const problems = [];
  await loadSite(page, baseUrl, width, 'benchmark');
  const pieces = await page.evaluate("[...document.querySelectorAll('#benchmark-pieces button')].map(button => button.dataset.pieces)");
  const surfaces = await page.evaluate("[...document.querySelectorAll('#benchmark-surfaces button')].map(button => button.dataset.surface)");
  const groups = await page.evaluate("[...document.querySelectorAll('#benchmark .bench-group')].map(group => group.dataset.pieces + '/' + group.dataset.surface).sort().join()");
  const views = pieces.flatMap(p => surfaces.map(surface => `${p}/${surface}`));

  if (groups !== [...views].sort().join()) {
    problems.push(`the benchmark switches give ${views.join(', ')} but the tables are ${groups}`);
  }

  for (const view of views) {
    const [p, surface] = view.split('/');
    await page.evaluate(
      `document.querySelector('#benchmark-pieces button[data-pieces=${p}]').click(); document.querySelector('#benchmark-surfaces button[data-surface=${surface}]').click()`,
    );
    await page.waitFor(
      `!document.querySelector('.bench-group[data-pieces=${p}][data-surface=${surface}]').hidden && document.querySelectorAll('#benchmark .bench-group:not([hidden]) tbody tr').length > 0`,
      `the ${view} rows`,
    );
    const times = await page.evaluate(
      "[...document.querySelectorAll('#benchmark .bench-group:not([hidden]) tbody tr')].flatMap(row => [...row.cells].slice(2, -1).map(cell => cell.textContent))",
    );
    const dashes = await page.evaluate(
      "[...document.querySelectorAll('#benchmark .bench-group:not([hidden]) tbody td')].map(cell => cell.textContent).filter(text => /[\\u2013\\u2014]/.test(text))",
    );
    const odd = [...new Set(times.filter(time => !/^(-|\d+\.\d{2} m?s)$/.test(time)))];

    if (odd.length || dashes.length) {
      problems.push(`the ${view} table shows ${[...odd, ...dashes].join(', ')}; a time reads 1.23 ms or 1.23 s, and a missing value -`);
    }
  }

  const headers = await page.evaluate(`(async () => {
    const solvers = [...document.querySelectorAll('#benchmark table thead th')].filter(th => /^(Formula|Modular|BigInt)/.test(th.textContent.trim()));
    const pages = {};
    const results = [];

    for (const th of solvers) {
      const link = th.querySelector('a.solver');
      const label = th.closest('table').id + ' ' + (th.getAttribute('aria-label') || th.textContent.trim());

      if (!link) {
        results.push({ label, problem: 'links nowhere' });
        continue;
      }

      const url = new URL(link.href);
      pages[url.pathname] = pages[url.pathname] || fetch(url.pathname).then(response => (response.ok ? response.text() : ''));
      const found = new DOMParser().parseFromString(await pages[url.pathname], 'text/html').getElementById(url.hash.slice(1));
      const shown = getComputedStyle(link).visibility === 'visible' && getComputedStyle(th.closest('thead')).clipPath === 'none';

      results.push({
        label,
        href: link.getAttribute('href'),
        problem: !found || !/^H[23]$/.test(found.tagName) ? 'links no section' : !th.getAttribute('aria-label') || th.getAttribute('aria-label') !== link.getAttribute('aria-label') ? 'names its header and link apart' : shown !== (link.tabIndex >= 0 && getComputedStyle(link).visibility === 'visible') ? 'can take the focus while hidden' : '',
      });
    }

    return results;
  })()`);
  const sections = {
    'domino-benchmark Formula': 'notes/dominoes/rectangle.html#the-closed-form',
    'domino-benchmark BigInt': 'notes/dominoes/rectangle.html#transfer-by-rows',
    'domicule-benchmark Modular': 'notes/domicules/rectangle.html#counting-modulo-primes',
    'domicule-benchmark BigInt': 'notes/domicules/rectangle.html#transfer-by-cells',
    'domino-cylinder-benchmark': 'notes/dominoes/cylinder.html#how-the-counts-are-made',
    'domino-torus-benchmark': 'notes/dominoes/torus.html#how-the-counts-are-made',
    'cylinder-benchmark': 'notes/domicules/cylinder.html#how-the-counts-are-made',
    'torus-benchmark': 'notes/domicules/torus.html#how-the-counts-are-made',
  };
  const expected = label => sections[label.replace(/, .*/, '')] || sections[label.split(' ')[0]];
  const wrong = headers.filter(({ label, href, problem }) => problem || href !== expected(label));

  if (headers.length !== 22 || wrong.length) {
    problems.push(
      `at ${width} px the benchmark tables have ${headers.length} solver headers, 22 expected, and these link wrong: ${wrong.map(({ label, href, problem }) => `${label} ${problem || `links ${href} instead of ${expected(label)}`}`).join('; ') || 'none'}`,
    );
  }

  return problems;
}

const READ_PALETTE = `(() => {
  const probe = document.body.appendChild(document.createElement('i'));
  const read = name => {
    probe.style.color = 'var(' + name + ')';
    return getComputedStyle(probe).color.match(/[\\d.]+/g).slice(0, 3).map(Number);
  };
  const palette = Object.fromEntries(['--hit', '--sheet', '--seam', '--seam-ends', '--h', '--v', '--d', '--a'].map(name => [name, read(name)]));
  probe.remove();
  return palette;
})()`;

function luminance(rgb) {
  const [r, g, b] = rgb.map(value => value / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);

  return (lighter + 0.05) / (darker + 0.05);
}

function toLab(rgb) {
  const [r, g, b] = rgb.map(value => value / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const f = t => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const [x, y, z] = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047,
    0.2126 * r + 0.7152 * g + 0.0722 * b,
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883,
  ].map(f);

  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function colorDistance(first, second) {
  const [a, b] = [toLab(first), toLab(second)];

  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

async function checkPalette(page, baseUrl, width) {
  const problems = [];
  await loadSite(page, baseUrl, width, 'gallery/4x4/1');

  try {
    for (const scheme of ['light', 'dark']) {
      await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
      const palette = await page.evaluate(READ_PALETTE);
      const hit = contrast(palette['--hit'], palette['--sheet']);

      if (hit < MIN_HIT_CONTRAST) {
        problems.push(`the highlighted label has a contrast of ${hit.toFixed(2)}:1 on the ${scheme} sheet, below ${MIN_HIT_CONTRAST}:1`);
      }

      for (const seam of ['--seam', '--seam-ends']) {
        for (const piece of ['--h', '--v', '--d', '--a']) {
          const distance = colorDistance(palette[seam], palette[piece]);

          if (distance < MIN_SEAM_DISTANCE) {
            problems.push(`${seam} is ${distance.toFixed(0)} from the ${piece} pieces in the ${scheme} palette, below ${MIN_SEAM_DISTANCE}`);
          }
        }
      }
    }
  } finally {
    await page.send('Emulation.setEmulatedMedia', { features: [] });
  }

  return problems;
}

function listSitePages(directory = SITE_DIRECTORY) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap(entry =>
      entry.isDirectory()
        ? listSitePages(path.join(directory, entry.name))
        : entry.name.endsWith('.html')
          ? [path.join(directory, entry.name)]
          : [],
    );
}

async function checkRepositoryLinks() {
  const links = listSitePages().flatMap(file =>
    [...new Set([...fs.readFileSync(file, 'utf-8').matchAll(REPOSITORY_LINK)].map(match => decodeURIComponent(match[1]).replace(/\/$/, '')))].map(
      target => ({ file, target }),
    ),
  );

  if (!links.length) {
    return ['no page links into github.com/dawidrylko/lattice-dimers/tree/master or blob/master'];
  }

  return links
    .filter(({ target }) => !fs.existsSync(path.join(ROOT_DIRECTORY, target)))
    .map(({ file, target }) => `${path.relative(SITE_DIRECTORY, file)} links to ${target}, which is not in the repository`);
}

async function checkIntegrity() {
  const resources = listSitePages().flatMap(file => (fs.readFileSync(file, 'utf-8').match(EXTERNAL_RESOURCE) || []).map(tag => ({ file, tag })));

  if (!resources.length) {
    return ['no page loads a script or a stylesheet from another host, so the check found nothing to read'];
  }

  return resources
    .filter(({ tag }) => !/\bintegrity="sha(256|384|512)-[^"]+"/.test(tag) || !/\bcrossorigin="anonymous"/.test(tag))
    .map(({ file, tag }) => `${path.relative(SITE_DIRECTORY, file)} loads ${tag.match(/(?:src|href)="([^"]+)"/)[1]} without a subresource integrity hash`);
}

async function checkGeneratedText() {
  const text = fs.readFileSync(path.join(SITE_DIRECTORY, 'index.html'), 'utf-8').replace(/<[^>]+>/g, '');
  const chain = `a Markov chain of ${DOMICULE_SWEEPS.toLocaleString('en-US')} steps per cell`;

  return [
    ...(text.includes(chain) ? [] : [`the main page does not say "${chain}", the chain length of js/renderer`]),
  ];
}

const CHECKS = {
  sheets: { label: 'tiling sheets', run: checkSheets },
  picker: { label: 'board picker', run: checkPicker },
  confirmation: { label: 'diagonal filter confirmation', run: checkConfirmation },
  samples: { label: 'numbered samples', run: checkSamples },
  pieces: { label: 'dominoes and domicules switch', run: checkPieces },
  styles: { label: 'sheet style switch', run: checkStyles },
  labels: { label: 'long tiling numbers', run: checkLongLabels },
  history: { label: 'random jump and back', run: checkHistory },
  surfaces: { label: 'cylinders and tori', run: checkSurfaces },
  diagonals: { label: 'diagonal filter and highlight', run: checkDiagonals },
  landing: { label: 'main page', run: checkLanding },
  notes: { label: 'notes', run: checkNotes },
  chrome: { label: 'shared header and footer', run: checkChrome },
  benchmark: { label: 'benchmark table', run: checkBenchmark },
  cells: { label: 'benchmark times', run: checkBenchmarkCells },
  palette: { label: 'highlight contrast and glued-edge colours', run: checkPalette },
  links: { label: 'links into the repository', run: checkRepositoryLinks },
  integrity: { label: 'subresource integrity', run: checkIntegrity },
  text: { label: 'text read from the code and the data', run: checkGeneratedText },
};

async function runTest(page, baseUrl, { width, check }) {
  const problems = await CHECKS[check].run(page, baseUrl, width);
  await page.settle();
  const sideways = await page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth');

  if (sideways > 0) {
    problems.push(`page scrolls ${sideways} px sideways`);
  }

  if (problems.length) {
    console.error(`Failed! ${problems.join('; ')}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

async function __main__() {
  if (!fs.existsSync(path.join(SITE_DIRECTORY, 'index.html'))) {
    console.error(`No site in ${SITE_DIRECTORY}. Run pnpm site:build first.`);
    process.exit(1);
  }

  const server = await serveSite();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let browser = null;
  let passed = true;

  try {
    browser = await launchChrome();
    const page = await openPage(browser.host);
    console.log(`Starting site test execution with ${siteTestCases.length} tests...`);

    for (const [index, testCase] of siteTestCases.entries()) {
      process.stdout.write(
        `Executing site test ${index + 1} of ${siteTestCases.length} for ${CHECKS[testCase.check].label} at ${testCase.width} px... `,
      );
      passed = (await runTest(page, baseUrl, testCase).catch(error => {
        console.error(`Failed! ${error.message}`);
        return false;
      })) && passed;
    }

    page.socket.close();
  } catch (error) {
    console.error(error.message);
    passed = false;
  } finally {
    if (browser) {
      await stopChrome(browser.chrome);
      removeProfile(browser.profile);
    }

    server.close();
  }

  if (passed) {
    console.log('All site tests completed successfully.');
    process.exit(0);
  } else {
    console.error('Some site tests failed.');
    process.exit(1);
  }
}

__main__();
