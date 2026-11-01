const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SITE_DIRECTORY = path.resolve(process.env.SITE_DIRECTORY || path.join(__dirname, '..', 'dist', 'site'));
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
const CONFIRMATION_BOARDS = ['18x18', '16x16-diagonal'];
const NOTES = [
  { slug: 'research', cells: 2 },
  { slug: 'method', cells: 0 },
  { slug: 'a004003', cells: 6 },
  { slug: 'a239273', cells: 8 },
  { slug: 'torus', cells: 5 },
  { slug: 'diagonals', cells: 3 },
];
const NOTE_FAILURES = ['NO', 'DIFFERS FROM OEIS'];
const PAGE_CONTROLS = '#page-controls button, #page-controls input';
const siteTestCases = [
  { width: 1440, check: 'sheets' },
  { width: 1440, check: 'picker' },
  { width: 1440, check: 'confirmation' },
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
  { width: 375, check: 'sheets' },
  { width: 375, check: 'confirmation' },
  { width: 375, check: 'benchmark' },
  { width: 375, check: 'pieces' },
  { width: 375, check: 'landing' },
  { width: 375, check: 'notes' },
  { width: 375, check: 'chrome' },
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

async function checkSheets(page, baseUrl, width) {
  await loadSite(page, baseUrl, width, 'gallery/4x4/1');
  const problems = [];

  for (const board of SHEET_BOARDS) {
    const [, rowCount, colCount] = board.match(/^(\d+)x(\d+)/);
    const label = `${board.includes('-diagonal') ? 'Domicule' : 'Domino'} tilings of a ${rowCount} by ${colCount}`;
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
  await loadSite(page, baseUrl, width, `gallery/${board}/1`);
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
  await page.waitFor("document.querySelector('#sheet svg rect.d, #sheet svg rect.a')", 'the 20x20 domicule sample');
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

    if (initial.svg !== 'blocks' || initial.gallery !== 'blocks' || initial.pressed.join() !== 'blocks' || !initial.highlighted || !initial.themed) {
      problems.push(`an unknown saved style does not fall back to blocks: ${JSON.stringify(initial)}`);
    }

    for (const style of ['dimer', 'engraving']) {
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

  if (!torus.seam || torus.sublabels || !/^#1 \d+ horizontal, \d+ vertical \d+ diagonal pieces?: \d+ ↘, \d+ ↙ \d+ pieces? across a glued edge$/.test(torus.tip) || torus.clipped !== 100 || torus.clip !== '64x64' || torus.edges !== 100 || !torus.meta.startsWith('4×4 torus · 17,552 tilings')) {
    problems.push(`4x4 torus sheet: ${JSON.stringify({ ...torus, boards: undefined })}`);
  }

  await page.evaluate("document.querySelector('#pieces [data-pieces=domino]').click()");
  await page.waitFor("location.hash === '#gallery/4x4-torus/1' && document.querySelector('#sheet svg')?.getAttribute('aria-label').startsWith('Domino')", 'the 4x4 domino torus');
  const straight = await page.evaluate(READ_SHEET);

  if (straight.picker || straight.tip.includes('diagonal') || !straight.tip.includes('across a glued edge') || straight.surface !== 'torus') {
    problems.push(`domino torus shows the diagonal filter or counts: ${straight.tip}`);
  }

  const seamColor = await page.evaluate(`(() => {
    const probe = document.body.appendChild(document.createElement('i'));
    probe.style.color = 'var(--seam)';
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  })()`);

  if (straight.seamColor !== seamColor) {
    problems.push(`the glued edges are drawn in ${straight.seamColor}, not --seam ${seamColor}`);
  }

  await page.evaluate("document.querySelector('#surfaces [data-surface=rectangle]').click()");
  await page.waitFor("location.hash === '#gallery/4x4/1'", 'the switch back to the 4x4 rectangle');
  const rectangle = await page.evaluate(READ_SHEET);

  if (rectangle.seam || rectangle.clipped || rectangle.edges) {
    problems.push('the rectangle keeps the glued edges');
  }

  for (const [hash, meta] of [
    ['gallery/4x4-diagonal-torus/1?diagonals=4', '4×4 torus · 8,384 tilings with 4 diagonal pieces (of 17,552)'],
    ['gallery/4x4-diagonal-cylinder/1?diagonals=8', '4×4 cylinder · 16 tilings with 8 diagonal pieces (of 2,649)'],
  ]) {
    const filtered = await showBoard(page, hash, `the ${hash} sheet`);

    if (!filtered.meta.startsWith(meta) || !filtered.picker || !filtered.filter.shown || !filtered.tip.includes(`${hash.split('=')[1]} diagonal pieces`)) {
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
  ];

  if (state.oeis.join() !== introLinks.join()) {
    problems.push(`intro links ${state.oeis.join(', ')}`);
  }

  if (state.leftovers.length) {
    problems.push(`main page still has ${state.leftovers.join(', ')}`);
  }

  if (state.tabs.join() !== 'gallery,benchmark,benchmark-domicule') {
    problems.push(`tabs are ${state.tabs.join(', ')}`);
  }

  return problems;
}

async function checkNotes(page, baseUrl, width) {
  const problems = [];

  for (const { slug, cells } of NOTES) {
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
      charts: [...document.querySelectorAll('figure.chart')].map(figure => [...figure.querySelectorAll('svg')].filter(svg => getComputedStyle(svg).display !== 'none').length),
    }))()`);

    if (state.cells !== cells) {
      problems.push(`${slug} has ${state.cells} cells instead of ${cells}`);
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
    navBoxes: nav.map(link => Math.round(link.getBoundingClientRect().left) + ',' + Math.round(link.getBoundingClientRect().top)).join(' '),
    current: nav.filter(link => link.getAttribute('aria-current') === 'page').map(link => link.href),
    back: header ? [...header.querySelectorAll('a')].some(link => link.textContent.includes('←')) : false,
    footer: footer ? [...footer.querySelectorAll('.site-links a')].map(link => link.textContent.trim() + ' ' + link.href).join(' | ') : '',
    footerStyle: footer && [style(footer), getComputedStyle(footer).borderTop, style(footer.lastElementChild), getComputedStyle(footer.lastElementChild).margin].join(' '),
  };
})()`;

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

  if (home.current.join() !== homeUrl) {
    problems.push(`the main page marks ${home.current.join() || 'no link'} as current`);
  }

  for (const { slug } of NOTES) {
    const run = `run=${Date.now()}`;

    await page.send('Page.navigate', { url: `${baseUrl}/notes/${slug}.html?${run}` });
    await page.waitFor(`location.search === '?${run}' && document.readyState === 'complete'`, `the ${slug} note`);
    await page.settle();
    const note = await page.evaluate(READ_CHROME);

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

  for (const [tab, rows, otherTab] of [
    ['benchmark', 'benchmark-rows', 'benchmark-domicule'],
    ['benchmark-domicule', 'domicule-benchmark-rows', 'benchmark'],
  ]) {
    await loadSite(page, baseUrl, width, tab);
    await page.waitFor(`document.querySelectorAll('#${rows} tr').length > 0`, `the ${tab} rows`);
    await page.settle();
    const state = await page.evaluate(`(() => {
      const section = document.getElementById('${tab}');
      const wraps = [...section.querySelectorAll('.table-wrap')];
      const times = row => [...row.cells].slice(2, -1).map(cell => cell.textContent);
      return {
        shown: !section.hidden && document.getElementById('${otherTab}').hidden && document.getElementById('gallery').hidden,
        overflow: Math.max(...wraps.map(wrap => wrap.scrollWidth - wrap.clientWidth)),
        hidden: wraps.flatMap(wrap => {
          const box = wrap.getBoundingClientRect();
          return [...wrap.querySelectorAll('td')].filter(cell => {
            const rect = cell.getBoundingClientRect();
            return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
          });
        }).length,
        empty: wraps.filter(wrap => !wrap.querySelectorAll('tbody tr').length).map(wrap => wrap.querySelector('table').id),
        missing: wraps.flatMap((wrap, index) =>
          [...wrap.querySelectorAll('tbody tr')]
            .filter(row => row.cells[0].textContent !== '0×0')
            .filter(row => (index ? times(row).every(time => time === '-') : times(row).includes('-')))
            .map(row => row.cells[0].textContent),
        ),
        environment: section.querySelector('.environment').textContent,
      };
    })()`);

    if (!state.shown) {
      problems.push(`${tab} tab does not show only its own table`);
    }

    if (state.overflow > 0 || state.hidden) {
      problems.push(`${tab} scrolls ${state.overflow} px sideways with ${state.hidden} cells off screen`);
    }

    if (tab === 'benchmark-domicule' && (state.missing.length || state.empty.length)) {
      problems.push(`${tab} has no time for ${state.missing.join(', ')} and no rows in ${state.empty.join(', ')}`);
    }

    if (!state.environment.startsWith('Measured with Node.js')) {
      problems.push(`${tab} caption has no environment`);
    }
  }

  return problems;
}

const CHECKS = {
  sheets: { label: 'tiling sheets', run: checkSheets },
  picker: { label: 'board picker', run: checkPicker },
  confirmation: { label: '18x18 and 16x16 domicule confirmation', run: checkConfirmation },
  pieces: { label: 'straight and diagonal switch', run: checkPieces },
  styles: { label: 'sheet style switch', run: checkStyles },
  labels: { label: 'long tiling numbers', run: checkLongLabels },
  history: { label: 'random jump and back', run: checkHistory },
  surfaces: { label: 'cylinders and tori', run: checkSurfaces },
  diagonals: { label: 'diagonal filter and highlight', run: checkDiagonals },
  landing: { label: 'main page', run: checkLanding },
  notes: { label: 'notes', run: checkNotes },
  chrome: { label: 'shared header and footer', run: checkChrome },
  benchmark: { label: 'benchmark table', run: checkBenchmark },
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
