const { spawnSync } = require('child_process');
const path = require('path');
const {
  enumerateTilings,
  renderSheet,
  renderAscii,
  canUnrank,
  createUnranker,
  unrankTiling,
  sampleRandomTiling,
  canUnrankDomicule,
  createDomiculeUnranker,
  unrankDomiculeTiling,
  createDiagonalUnranker,
  unrankDiagonalTiling,
  sampleDomiculeTiling,
  createPeriodicUnranker,
  unrankPeriodicTiling,
  listRankPrimes,
  rankTilingsModulo,
  combineRanks,
} = require('../src/renderer');
const { PERIODIC_LATTICES, countPeriodicDiagonals } = require('../src/renderer/periodic');
const periodicReference = require('../src/solvers/periodicTilingSolver-BigInt.js');
const crypto = require('crypto');
const { createRandom } = require('../src/renderer/cftp');
const fs = require('fs');
const { buildReadmeImages } = require('../site/readme-images');
const { renderChart, renderNote, drawTilings, formatTime, logCount } = require('../site/notes');
const {
  testCasesBigInt,
  testCasesDomicule,
  testCasesDomiculeRectangles,
  testCasesDiagonal,
  testCasesDiagonalModular,
} = require('../data');

const MAX_CELLS = 36;
const UNRANK_SAMPLE_SIZE = 1000;
const RANDOM_SEED = 2024;
const SAMPLES_PER_TILING = 200;
const CLI_TIMEOUT = 30000;
const labelWidthTestCases = [
  { rowCount: 16, colCount: 16, first: BigInt('125468628332598003063877133633598664929040628978461090301') },
  { rowCount: 14, colCount: 14, first: BigInt('8212337965975290675433764125340416032951') },
  { rowCount: 4, colCount: 4, label: 'tiling "a" <&> of a long sample' },
];
const rankTestCases = [
  { pieces: 'domino', rowCount: 6, colCount: 8 },
  { pieces: 'domino', rowCount: 7, colCount: 4 },
  { pieces: 'domino', rowCount: 3, colCount: 5 },
  { pieces: 'domicule', rowCount: 5, colCount: 4 },
  { pieces: 'domicule', rowCount: 6, colCount: 6 },
  { pieces: 'domicule', rowCount: 3, colCount: 5 },
  { pieces: 'domino', rowCount: 10, colCount: 10 },
  { pieces: 'domino', rowCount: 9, colCount: 12 },
  { pieces: 'domicule', rowCount: 8, colCount: 8 },
  { pieces: 'domicule', rowCount: 10, colCount: 10 },
];
const shortLabelTestCases = [{ rowCount: 4, colCount: 4, label: '"a" <&>' }];
const randomTestCases = [
  { rowCount: 2, colCount: 2, expectedResult: 2, criticalValue: 10.83 },
  { rowCount: 4, colCount: 4, expectedResult: 36, criticalValue: 66.62 },
];
const randomValidityTestCases = [
  { rowCount: 20, colCount: 20 },
  { rowCount: 30, colCount: 30 },
];
const DOMINO_OUTPUT_HASHES = {
  svg: '28291e2e1e9229d062c1864667bb9941b9b27eca17fac94e2577a4e4d22f1005',
  ascii: '3bbf6c1dc91ec1980e1b71fa58ff4796d0f87123a57ca282b46d71dd9677afc7',
};
const DOMICULE_FULL_CHECK_LIMIT = BigInt(5000);
const DOMICULE_REACH_SWEEPS = 20;
const DOMICULE_REACH_SAMPLES_PER_TILING = 30;
const domiculeReachTestCases = [
  { rowCount: 2, colCount: 3, expectedResult: 5 },
  { rowCount: 3, colCount: 4, expectedResult: 43 },
  { rowCount: 4, colCount: 5, expectedResult: 1563 },
  { rowCount: 5, colCount: 4, expectedResult: 1563 },
];
const domiculeShapeTestCases = [
  { rowCount: 2, colCount: 2, piece: { row: 0, col: 0, dr: 1, dc: 1 }, svg: 'class="d"', rotation: 'rotate(45 ', ascii: '\\ .\n. \\' },
  { rowCount: 2, colCount: 2, piece: { row: 0, col: 1, dr: 1, dc: -1 }, svg: 'class="a"', rotation: 'rotate(-45 ', ascii: '. /\n/ .' },
];
const styleTestCases = [
  { rowCount: 2, colCount: 4, style: 'blocks', markers: ['class="blocks"', '<rect class="h"', '<rect class="d"', 'rotate(45 ', '.a{fill'] },
  { rowCount: 2, colCount: 4, style: 'dimer', markers: ['class="dimer"', '<path class="h"', '<path class="r"', '<circle class="d o"', '<circle class="a o"', '.r{fill:none'] },
  { rowCount: 2, colCount: 4, style: 'engraving', markers: ['class="engraving"', '<rect class="h"', '<rect class="cd"', '<rect class="ca"', '<path class="d k"', '<path class="a k"'] },
];
const engravingContainmentTestCases = [
  { rowCount: 2, colCount: 2, tiling: [{ row: 0, col: 0, dr: 1, dc: 1 }, { row: 0, col: 1, dr: 1, dc: -1 }] },
  { rowCount: 4, colCount: 4 },
  { rowCount: 6, colCount: 6 },
];
const firstSegment = (sheet, kinds) => {
  const match = sheet.match(new RegExp(`<path class="${kinds}" d="M([\\d.]+) ([\\d.]+)L([\\d.]+) ([\\d.]+)`));

  return match ? { dx: Number(match[3]) - Number(match[1]), dy: Number(match[4]) - Number(match[2]) } : null;
};
const STYLE_GEOMETRY_CHECKS = {
  blocks: {
    'diagonal palette': sheet => sheet.includes('.d{fill:#ab3415}') && sheet.includes('.a{fill:#f09c17}'),
    'straight before diagonal': sheet => sheet.lastIndexOf('class="h"') < sheet.indexOf('class="d"'),
  },
  dimer: {
    'edges between cell centres': sheet => ['M20 20L36 20', 'M20 36L36 36', 'M52 20L68 36', 'M68 20L52 36'].every(edge => sheet.includes(`d="${edge}"`)),
    'two dots per piece': sheet => ['h', 'd', 'a'].every(kind => (sheet.match(new RegExp(`class="${kind} o"`, 'g')) || []).length === (kind === 'h' ? 4 : 2)),
    'ring in the board colour': sheet => sheet.includes('.r{fill:none;stroke:#f3f4f6'),
    'outline under every edge and dot': sheet =>
      (sheet.match(/<path class="e"/g) || []).length === 4 &&
      (sheet.match(/<circle class="e"/g) || []).length === 8 &&
      sheet.indexOf('<path class="e"') < sheet.indexOf('<path class="h"') &&
      sheet.includes('.e{fill:#1f2937;stroke:#1f2937}'),
  },
  engraving: {
    'hatch follows the piece': sheet => {
      const down = firstSegment(sheet, 'd k');
      const up = firstSegment(sheet, 'a k');
      return Boolean(down && up) && down.dx > 0 && down.dy > 0 && up.dx < 0 && up.dy > 0;
    },
  },
};
const STYLE_TEST_TILING = [
  { row: 0, col: 0, dr: 0, dc: 1 },
  { row: 1, col: 0, dr: 0, dc: 1 },
  { row: 0, col: 2, dr: 1, dc: 1 },
  { row: 0, col: 3, dr: 1, dc: -1 },
];
const DOMICULE_TEST_SWEEPS = 200;
const PERIODIC_FULL_CHECK_LIMIT = BigInt(20000);
const periodicUnrankTestCases = ['square', 'triangular', 'king'].flatMap(lattice =>
  [false, true].flatMap(torus =>
    [
      { rowCount: 2, colCount: 2 },
      { rowCount: 3, colCount: 2 },
      { rowCount: 2, colCount: 3 },
      { rowCount: 3, colCount: 4 },
      { rowCount: 4, colCount: 3 },
      { rowCount: 4, colCount: 4 },
      { rowCount: 6, colCount: 6 },
    ].map(board => ({ ...board, lattice, torus })),
  ),
);
const periodicDiagonalTestCases = [false, true].flatMap(torus =>
  [
    { rowCount: 2, colCount: 2 },
    { rowCount: 3, colCount: 2 },
    { rowCount: 2, colCount: 3 },
    { rowCount: 2, colCount: 4 },
    { rowCount: 3, colCount: 4 },
    { rowCount: 4, colCount: 3 },
    { rowCount: 4, colCount: 4 },
  ].map(board => ({ ...board, lattice: 'king', torus })),
);
const periodicSheetTestCases = [
  {
    rowCount: 2,
    colCount: 4,
    surface: 'cylinder',
    tiling: [{ row: 0, col: 3, dr: 0, dc: 1 }, { row: 0, col: 1, dr: 0, dc: 1 }, { row: 1, col: 0, dr: 0, dc: 1 }, { row: 1, col: 2, dr: 0, dc: 1 }],
    copies: { h: 5, v: 0 },
    edges: 2,
  },
  {
    rowCount: 2,
    colCount: 2,
    surface: 'torus',
    tiling: [{ row: 1, col: 0, dr: 1, dc: 0 }, { row: 1, col: 1, dr: 1, dc: 0 }],
    copies: { h: 0, v: 4 },
    edges: 4,
  },
  {
    rowCount: 2,
    colCount: 2,
    surface: 'torus',
    tiling: [{ row: 1, col: 1, dr: 1, dc: 1 }, { row: 1, col: 0, dr: 1, dc: 1 }],
    copies: { d: 6 },
    edges: 4,
  },
  {
    rowCount: 2,
    colCount: 2,
    surface: 'torus',
    tiling: [{ row: 1, col: 0, dr: 1, dc: -1 }, { row: 1, col: 1, dr: 1, dc: -1 }],
    copies: { a: 6 },
    edges: 4,
  },
  {
    rowCount: 2,
    colCount: 4,
    surface: 'cylinder',
    tiling: [{ row: 0, col: 0, dr: 1, dc: -1 }, { row: 0, col: 1, dr: 0, dc: 1 }, { row: 0, col: 3, dr: 1, dc: -1 }, { row: 1, col: 0, dr: 0, dc: 1 }],
    copies: { a: 3, h: 2 },
    edges: 2,
  },
];
const SEAM_PATHS = {
  s: 'M12 12V44M76 12V44',
  m: 'M9 28H15M73 28H79',
  t: 'M12 12H76M12 44H76',
  u: 'M42.5 9V15M42.5 41V47M45.5 9V15M45.5 41V47',
};
const sublabelTestCases = [
  { rowCount: 4, colCount: 4, choices: ['4 diagonal', '4 diag.', '4'], shown: '4 diagonal' },
  { rowCount: 2, colCount: 2, choices: ['2 diagonal', '2 diag.', '2'], shown: '2' },
  { rowCount: 1, colCount: 2, choices: ['wider than the board'], shown: 'wider than the board' },
];
const unlabelledTestCases = [
  { rowCount: 4, colCount: 4 },
  { rowCount: 6, colCount: 6, surface: 'torus' },
  { rowCount: 4, colCount: 4, sublabels: ['4 diagonal'] },
];
const diagonalUnrankTestCases = [
  { rowCount: 2, colCount: 2 },
  { rowCount: 3, colCount: 4 },
  { rowCount: 4, colCount: 3 },
  { rowCount: 2, colCount: 7 },
  { rowCount: 4, colCount: 4, order: true },
  { rowCount: 6, colCount: 6 },
].map(board => ({
  ...board,
  expectedResult: [...testCasesDiagonal, ...testCasesDiagonalModular].find(
    t => t.rowCount === board.rowCount && t.colCount === board.colCount,
  ).expectedResult,
}));
const domiculeRandomTestCases = [
  { rowCount: 2, colCount: 2, expectedResult: 3, criticalValue: 13.82 },
  { rowCount: 4, colCount: 4, expectedResult: 280, criticalValue: 357.8 },
];
const domiculeRandomValidityTestCases = [
  { rowCount: 1, colCount: 2 },
  { rowCount: 4, colCount: 5 },
  { rowCount: 5, colCount: 4 },
  { rowCount: 20, colCount: 20 },
  { rowCount: 30, colCount: 30 },
];
const cliTestCases = [
  { rowCount: 3, colCount: 3, args: ['--random', '--ascii'], status: 0, output: 'Nothing to render.' },
  { rowCount: 3, colCount: 3, args: ['-i', '1', '--ascii'], status: 0, output: 'Nothing to render.' },
  { rowCount: 11, colCount: 15, args: ['--ascii'], status: 0, output: 'Nothing to render.' },
  { rowCount: 21, colCount: 23, args: ['--ascii'], status: 0, output: 'Nothing to render.' },
  { rowCount: 3, colCount: 3, args: ['-o', 'abc', '--ascii'], status: 1, output: '-o expects' },
  { rowCount: 2, colCount: 2, args: ['-l', '0', '--ascii'], status: 1, output: 'Usage' },
  { rowCount: 8, colCount: 8, args: ['--all', '--ascii'], status: 1, output: '--all is only allowed' },
  { rowCount: 2, colCount: 2, args: ['--all', '--ascii'], status: 0, output: 'Rendered tilings 1-2.' },
  { rowCount: 2, colCount: 100, args: ['-l', '1', '--ascii'], status: 0, output: '573147844013817084101 tilings.' },
  { rowCount: 18, colCount: 18, args: ['-l', '1', '--ascii'], status: 0, output: 'tilings not counted (board too large).' },
  { rowCount: 0, colCount: 0, args: ['--ascii'], status: 0, output: 'Board 0x0: 1 tiling.' },
  { rowCount: 2, colCount: 2, args: ['-i', '1', '--random'], status: 1, output: 'cannot be combined' },
  { rowCount: 2, colCount: 2, args: ['--all', '-l', '1'], status: 1, output: 'cannot be combined' },
  { rowCount: 30, colCount: 2, args: ['-i', '1', '--ascii'], status: 0, output: 'Rendered tilings 1-1.' },
  { rowCount: 2, colCount: 30, args: ['-i', '1', '--ascii'], status: 1, output: 'use -r 30 -c 2 instead' },
  { rowCount: 2, colCount: 20000, args: ['-l', '1', '--ascii'], status: 0, output: 'Rendered tilings 1-1.' },
  { rowCount: 2, colCount: 2, args: ['--all', '--ascii', '--domicule'], status: 0, output: 'Rendered tilings 1-3.' },
  { rowCount: 4, colCount: 4, args: ['-i', '280', '--ascii', '--domicule'], status: 0, output: 'Board 4x4: 280 tilings.' },
  { rowCount: 3, colCount: 3, args: ['--ascii', '--domicule'], status: 0, output: 'Nothing to render.' },
  { rowCount: 20, colCount: 20, args: ['--ascii', '--domicule'], status: 1, output: 'use --random instead' },
  { rowCount: 2, colCount: 20, args: ['-i', '1', '--ascii', '--domicule'], status: 1, output: 'use -r 20 -c 2 instead' },
  { rowCount: 20, colCount: 20, args: ['--random', '--ascii', '--domicule'], status: 0, output: 'approximately uniformly' },
  {
    rowCount: 2,
    colCount: 100000,
    args: ['-l', '1', '--ascii'],
    env: { NODE_OPTIONS: '--max-old-space-size=128' },
    status: 0,
    output: 'tilings not counted (board too large).',
  },
];

function serializeTiling(tiling) {
  return tiling
    .map(({ row, col, horizontal }) => `${row},${col},${horizontal ? 'h' : 'v'}`)
    .join(';');
}

function serializeDomiculeTiling(tiling) {
  return tiling.map(({ row, col, dr, dc }) => `${row},${col},${dr},${dc}`).join(';');
}

function findDomiculeCoverageError(tiling, { rowCount, colCount }) {
  const covered = new Uint8Array(rowCount * colCount);

  for (const { row, col, dr, dc } of tiling) {
    if (![0, 1].includes(dr) || ![-1, 0, 1].includes(dc) || (dr === 0 && dc !== 1)) {
      return `invalid domicule direction ${dr},${dc} at ${row},${col}`;
    }

    for (const [r, c] of [
      [row, col],
      [row + dr, col + dc],
    ]) {
      if (r >= rowCount || c < 0 || c >= colCount) {
        return `domicule outside the board at ${r},${c}`;
      }

      if (covered[r * colCount + c]++) {
        return `overlapping domicules at ${r},${c}`;
      }
    }
  }

  return covered.every(Boolean) ? null : 'board not fully covered';
}

function findCoverageError(tiling, { rowCount, colCount }) {
  const covered = new Uint8Array(rowCount * colCount);

  for (const { row, col, horizontal } of tiling) {
    const cells = [
      [row, col],
      horizontal ? [row, col + 1] : [row + 1, col],
    ];

    for (const [r, c] of cells) {
      if (r >= rowCount || c >= colCount) {
        return `domino outside the board at ${r},${c}`;
      }

      if (covered[r * colCount + c]++) {
        return `overlapping dominoes at ${r},${c}`;
      }
    }
  }

  return covered.every(Boolean) ? null : 'board not fully covered';
}

function runTest(testCase) {
  const { expectedResult } = testCase;
  const unranker = createUnranker(testCase);
  const seen = new Set();
  let firstTiling = null;

  for (const tiling of enumerateTilings(testCase)) {
    const error = findCoverageError(tiling, testCase);

    if (error) {
      console.error(`Failed! Invalid tiling: ${error}`);

      return false;
    }

    const serialized = serializeTiling(tiling);
    const rank = BigInt(seen.size);

    if (serializeTiling(unrankTiling(unranker, rank)) !== serialized) {
      console.error(`Failed! Unranked tiling #${rank + BigInt(1)} differs from the enumerated one.`);

      return false;
    }

    seen.add(serialized);
    firstTiling = firstTiling || tiling;
  }

  if (unranker.total !== BigInt(seen.size)) {
    console.error(`Failed! Unranker total: ${unranker.total}, enumerated: ${seen.size}`);

    return false;
  }

  if (BigInt(seen.size) !== BigInt(expectedResult)) {
    console.error(`Failed! Expected: ${expectedResult}, Actual: ${seen.size}`);

    return false;
  }

  if (firstTiling) {
    const svg = renderSheet([firstTiling], 1, testCase);
    const ascii = renderAscii(firstTiling, testCase);

    if (!svg.startsWith('<svg') || ascii.includes('.')) {
      console.error('Failed! Rendering produced invalid output.');

      return false;
    }
  }

  console.log('Passed!');

  return true;
}

function runUnrankTest(testCase) {
  const { expectedResult } = testCase;
  const unranker = createUnranker(testCase);

  if (unranker.total !== BigInt(expectedResult)) {
    console.error(`Failed! Expected: ${expectedResult}, Actual: ${unranker.total}`);

    return false;
  }

  let rank = BigInt(0);

  for (const tiling of enumerateTilings(testCase)) {
    if (rank === BigInt(UNRANK_SAMPLE_SIZE)) {
      break;
    }

    if (serializeTiling(unrankTiling(unranker, rank)) !== serializeTiling(tiling)) {
      console.error(`Failed! Unranked tiling #${rank + BigInt(1)} differs from the enumerated one.`);

      return false;
    }

    rank++;
  }

  const lastTiling = unrankTiling(unranker, unranker.total - BigInt(1));
  const error = findCoverageError(lastTiling, testCase);

  if (error) {
    console.error(`Failed! Invalid last tiling: ${error}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runRankTest(testCase) {
  const domino = testCase.pieces === 'domino';
  const unranker = domino ? createUnranker(testCase) : createDomiculeUnranker(testCase);
  const unrank = domino ? unrankTiling : unrankDomiculeTiling;

  if (unranker.total === BigInt(0)) {
    const passed = listRankPrimes(unranker.total).length === 0;
    console.log(passed ? 'Passed!' : 'Failed! Primes listed for a board without tilings.');

    return passed;
  }

  const ranks = [...new Set([0, 1, 2, 3, 5, 7].map(i => (unranker.total * BigInt(i)) / BigInt(8)).concat(unranker.total - BigInt(1)))];
  const tilings = ranks.map(rank => unrank(unranker, rank));
  const primes = listRankPrimes(unranker.total);
  const results = primes.map(prime => rankTilingsModulo(testCase, tilings, prime));
  const totals = results.every(({ total }, j) => BigInt(total) === unranker.total % BigInt(primes[j]));
  const found = combineRanks(results.map(({ ranks: residues }) => residues), primes);

  if (!totals || found.some((rank, i) => rank !== ranks[i])) {
    console.error(`Failed! Ranks ${ranks.join(', ')} came back as ${found.join(', ')}${totals ? '' : ', and the totals differ'}.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runRandomUniformityTest(testCase) {
  const { expectedResult, criticalValue } = testCase;
  const random = createRandom(RANDOM_SEED);
  const sampleCount = expectedResult * SAMPLES_PER_TILING;
  const frequencies = new Map();

  for (let i = 0; i < sampleCount; i++) {
    const tiling = sampleRandomTiling(testCase, random);
    const error = findCoverageError(tiling, testCase);

    if (error) {
      console.error(`Failed! Invalid random tiling: ${error}`);

      return false;
    }

    const key = serializeTiling(tiling);
    frequencies.set(key, (frequencies.get(key) || 0) + 1);
  }

  const expected = sampleCount / expectedResult;
  const chiSquared = [...frequencies.values()].reduce(
    (sum, observed) => sum + (observed - expected) ** 2 / expected,
    (expectedResult - frequencies.size) * expected,
  );

  if (frequencies.size !== expectedResult || chiSquared > criticalValue) {
    console.error(
      `Failed! Distinct: ${frequencies.size}/${expectedResult}, chi-squared: ${chiSquared.toFixed(2)} (limit ${criticalValue})`,
    );

    return false;
  }

  console.log('Passed!');

  return true;
}

function runRandomValidityTest(testCase) {
  const tiling = sampleRandomTiling(testCase, createRandom(RANDOM_SEED));
  const error = findCoverageError(tiling, testCase);

  if (error) {
    console.error(`Failed! Invalid random tiling: ${error}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runDomiculeUnrankTest(testCase) {
  const unranker = createDomiculeUnranker(testCase);

  if (unranker.total !== BigInt(testCase.expectedResult)) {
    console.error(`Failed! Expected: ${testCase.expectedResult}, Actual: ${unranker.total}`);

    return false;
  }

  if (unranker.total === BigInt(0)) {
    console.log('Passed!');

    return true;
  }

  const ranks =
    unranker.total <= DOMICULE_FULL_CHECK_LIMIT
      ? Array.from({ length: Number(unranker.total) }, (_, i) => BigInt(i))
      : Array.from({ length: UNRANK_SAMPLE_SIZE }, (_, i) => (unranker.total * BigInt(i)) / BigInt(UNRANK_SAMPLE_SIZE));
  const seen = new Set();

  for (const rank of [...ranks, unranker.total - BigInt(1)]) {
    const tiling = unrankDomiculeTiling(unranker, rank);
    const error = findDomiculeCoverageError(tiling, testCase);

    if (error) {
      console.error(`Failed! Invalid tiling #${rank + BigInt(1)}: ${error}`);

      return false;
    }

    seen.add(serializeDomiculeTiling(tiling));
  }

  if (seen.size !== new Set([...ranks, unranker.total - BigInt(1)]).size) {
    console.error(`Failed! ${seen.size} distinct tilings for ${new Set(ranks).size} ranks.`);

    return false;
  }

  const svg = renderSheet([unrankDomiculeTiling(unranker, unranker.total - BigInt(1))], 1, testCase);
  const ascii = renderAscii(unrankDomiculeTiling(unranker, unranker.total - BigInt(1)), testCase);

  if (!svg.startsWith('<svg') || (testCase.rowCount * testCase.colCount && ascii.includes('.'))) {
    console.error('Failed! Rendering produced invalid output.');

    return false;
  }

  console.log('Passed!');

  return true;
}

function runDomiculeUniformityTest(testCase) {
  const { expectedResult, criticalValue } = testCase;
  const random = createRandom(RANDOM_SEED);
  const sampleCount = expectedResult * SAMPLES_PER_TILING;
  const frequencies = new Map();

  for (let i = 0; i < sampleCount; i++) {
    const tiling = sampleDomiculeTiling(testCase, random, DOMICULE_TEST_SWEEPS);
    const error = findDomiculeCoverageError(tiling, testCase);

    if (error) {
      console.error(`Failed! Invalid random tiling: ${error}`);

      return false;
    }

    const key = serializeDomiculeTiling(tiling);
    frequencies.set(key, (frequencies.get(key) || 0) + 1);
  }

  const expected = sampleCount / expectedResult;
  const chiSquared = [...frequencies.values()].reduce(
    (sum, observed) => sum + (observed - expected) ** 2 / expected,
    (expectedResult - frequencies.size) * expected,
  );

  if (frequencies.size !== expectedResult || chiSquared > criticalValue) {
    console.error(
      `Failed! Distinct: ${frequencies.size}/${expectedResult}, chi-squared: ${chiSquared.toFixed(2)} (limit ${criticalValue})`,
    );

    return false;
  }

  console.log('Passed!');

  return true;
}

function runDomiculeValidityTest(testCase) {
  const error = findDomiculeCoverageError(sampleDomiculeTiling(testCase, createRandom(RANDOM_SEED)), testCase);

  if (error) {
    console.error(`Failed! Invalid random tiling: ${error}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runDominoOutputTest() {
  const options = { rowCount: 4, colCount: 4 };
  const tilings = [...enumerateTilings(options)].slice(0, 12);
  const hash = text => crypto.createHash('sha256').update(text).digest('hex');
  const svg = hash(renderSheet(tilings, 1, options));
  const ascii = hash(tilings.map(tiling => renderAscii(tiling, options)).join('\n'));

  if (svg !== DOMINO_OUTPUT_HASHES.svg || ascii !== DOMINO_OUTPUT_HASHES.ascii) {
    console.error(`Failed! Domino output changed: svg ${svg}, ascii ${ascii}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runDomiculeShapeTest({ piece, svg, rotation, ascii, ...options }) {
  const sheet = renderSheet([[piece]], 1, options);
  const text = renderAscii([piece], options);

  if (!sheet.includes(svg) || !sheet.includes(rotation) || !sheet.includes('.d{fill') || text !== ascii) {
    console.error(`Failed! Diagonal ${piece.dc > 0 ? 'down-right' : 'down-left'} renders as ${JSON.stringify(text)}.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runStyleTest({ style, markers, ...options }) {
  const sheet = renderSheet([STYLE_TEST_TILING], 1, { ...options, style });
  const missing = [
    ...markers.filter(marker => !sheet.includes(marker)),
    ...Object.entries(STYLE_GEOMETRY_CHECKS[style]).filter(([, check]) => !check(sheet)).map(([name]) => name),
  ];
  const others = renderSheet.STYLES.filter(other => other !== style);

  if (missing.length || others.some(other => sheet.includes(`class="${other}"`))) {
    console.error(`Failed! The ${style} sheet lacks ${missing.join(', ') || 'nothing'} or names another style.`);

    return false;
  }

  if (style === renderSheet.STYLES[0] && renderSheet([STYLE_TEST_TILING], 1, options) !== sheet) {
    console.error(`Failed! A sheet without a style is not drawn as ${style}.`);

    return false;
  }

  try {
    renderSheet([STYLE_TEST_TILING], 1, { ...options, style: `${style}-unknown` });
    console.error('Failed! An unknown style was accepted.');

    return false;
  } catch (error) {
    if (!error.message.startsWith('Unknown style')) {
      throw error;
    }
  }

  console.log('Passed!');

  return true;
}

function readStrokeWidth(sheet, selector) {
  const rule = sheet.match(new RegExp(`${selector.replace(/[.,]/g, '\\$&')}\\{[^}]*stroke-width:([\\d.]+)`));

  return rule ? Number(rule[1]) : NaN;
}

function runEngravingContainmentTest({ tiling: fixed, ...options }) {
  const unranker = fixed ? null : createDomiculeUnranker(options);
  const tiling = fixed || unrankDomiculeTiling(unranker, unranker.total - BigInt(1));
  const sheet = renderSheet([tiling], 1, { ...options, style: 'engraving' });
  const outline = readStrokeWidth(sheet, '.cd,.ca');
  const widths = { hatch: readStrokeWidth(sheet, '.d,.a'), axis: readStrokeWidth(sheet, '.k') };
  const cells = [...sheet.matchAll(/<rect class="c([da])" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)].map(([, kind, x, y, size]) => {
    const left = Number(x) + outline / 2;
    const top = Number(y) + outline / 2;
    const inner = Number(size) - outline;
    return { kind, left, top, right: left + inner, bottom: top + inner };
  });
  const roundCaps = /\.d,\.a\{[^}]*stroke-linecap:round/.test(sheet);
  const escaped = [];
  const kinds = new Set(cells.map(cell => cell.kind));

  if (![outline, widths.hatch, widths.axis].every(Number.isFinite) || (fixed && kinds.size !== 2)) {
    console.error(`Failed! Engraving widths ${JSON.stringify({ outline, ...widths })} or cell kinds ${[...kinds]} are missing.`);

    return false;
  }

  for (const [, kinds, d] of sheet.matchAll(/<path class="([da](?: k)?)" d="([^"]+)"/g)) {
    const half = (kinds.endsWith('k') ? widths.axis : widths.hatch) / 2;
    const cap = roundCaps ? half : 0;
    const spread = half / Math.SQRT2;

    for (const [, x1, y1, x2, y2] of d.matchAll(/M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/g)) {
      const points = [[x1, y1], [x2, y2]].map(point => point.map(Number));
      const [[ax, ay], [bx, by]] = points;
      const length = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / length;
      const uy = (by - ay) / length;
      const ends = [[ax - ux * cap, ay - uy * cap], [bx + ux * cap, by + uy * cap]];
      const corners = ends.flatMap(([px, py]) => [[px + uy * half, py - ux * half], [px - uy * half, py + ux * half]]);
      const inside = cells.some(cell => corners.every(([px, py]) => px >= cell.left - 1e-6 && px <= cell.right + 1e-6 && py >= cell.top - 1e-6 && py <= cell.bottom + 1e-6));

      if (!inside) {
        escaped.push(`${kinds} M${x1} ${y1}L${x2} ${y2}`);
      }
    }
  }

  if (!cells.length || escaped.length) {
    console.error(`Failed! ${escaped.length} engraving strokes leave their cell, e.g. ${escaped[0]}.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runLabelWidthTest({ first, label: custom, ...options }) {
  const boardWidth = options.colCount * renderSheet.CELL_SIZE;
  const label = custom || `#${first}`;
  const escaped = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const sheet = renderSheet([[]], first || 1, { ...options, labels: custom && [custom] });
  const [, title, attribute, shown] = sheet.match(/<g><title>([^<]*)<\/title><text [^>]*data-label="([^"]*)"[^>]*>([^<]*)<\/text><\/g>/) || [];
  const visible = shown && shown.replace(/&(amp|lt|gt|quot);/g, '_');

  if (!shown || title !== escaped || attribute !== escaped || [...visible].length * renderSheet.LABEL_CHAR_WIDTH > boardWidth || !escaped.endsWith(shown.split('…').pop())) {
    console.error(`Failed! Label ${label} renders as ${JSON.stringify(shown)} with title ${JSON.stringify(title)}.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runShortLabelTest({ label, ...options }) {
  const escaped = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const sheet = renderSheet([[]], 1, { ...options, labels: [label] });
  const shown = (sheet.match(/<text [^>]*>([^<]*)<\/text>/) || [])[1];

  if (shown !== escaped || sheet.includes('<title>')) {
    console.error(`Failed! Label ${label} renders as ${JSON.stringify(shown)}.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runReadmeImagesTest() {
  const stale = Object.entries(buildReadmeImages()).filter(([file, svg]) => {
    const target = path.join(__dirname, '..', file);
    return !fs.existsSync(target) || fs.readFileSync(target, 'utf-8') !== svg;
  });

  if (stale.length) {
    console.error(`Failed! ${stale.map(([file]) => file).join(', ')} out of date with the renderer; run pnpm readme:images.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

const CHART = {
  title: 'test chart',
  x: { label: 'x', min: 0, max: 4, ticks: [0, 2, 4] },
  y: { label: 'y', min: 0, max: 1, ticks: [0, 1] },
  series: [
    { name: 'a <b>', color: 'var(--series-1)', points: [[0, 0.1], [4, 0.5]] },
    { name: 'c', color: 'var(--series-2)', points: [[0, 0.2], [4, 0.51]] },
  ],
};
const chartTestCases = [
  { name: 'a valid chart', series: CHART.series, expected: 'drawn' },
  { name: 'a value that is not a number', series: [{ ...CHART.series[0], points: [[0, NaN]] }], expected: 'outside its axes' },
  { name: 'a value above the axis', series: [{ ...CHART.series[0], points: [[0, 2]] }], expected: 'outside its axes' },
];

function runChartTests() {
  return chartTestCases.every(({ name, series, expected }, index) => {
    process.stdout.write(`Executing chart test ${index + 1} of ${chartTestCases.length} for ${name}... `);

    let actual;

    try {
      const html = renderChart({ ...CHART, series });
      const wide = html.match(/<svg class="wide".*?<\/svg>/s)[0];
      const narrow = html.match(/<svg class="narrow".*?<\/svg>/s)[0];
      const labels = svg => (svg.match(/fill="var\(--fg\)"/g) || []).length;
      const escaped = !html.includes('a <b>') && html.includes('a &lt;b&gt;');
      const apart = [...wide.matchAll(/<text x="\d+(?:\.\d)?" y="([\d.]+)" fill="var\(--fg\)"/g)].map(match => Number(match[1]));

      actual =
        labels(wide) === 2 && labels(narrow) === 0 && escaped && Math.abs(apart[0] - apart[1]) >= 16
          ? 'drawn'
          : `labels ${labels(wide)}/${labels(narrow)}, escaped ${escaped}, label rows ${apart.join(', ')}`;
    } catch (error) {
      actual = error.message.includes(expected) ? expected : error.message;
    }

    if (actual !== expected) {
      console.error(`Failed! Expected: ${expected}, Actual: ${actual}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

const notebookHelperTestCases = [
  { name: 'a missing time', actual: () => formatTime(null), expected: '-' },
  { name: 'a time in ms', actual: () => formatTime({ average: 26.4, runs: 10 }), expected: '26.40 ms' },
  { name: 'a single run in s', actual: () => formatTime({ average: 236580, runs: 1 }), expected: '236.58 s (one run)' },
  { name: 'the log of a 49-digit count', actual: () => Math.abs(logCount(`1${'0'.repeat(48)}`) / (48 * Math.LN10) - 1) < 1e-15, expected: true },
];

const figureCell = code => renderNote(['# Figure', '', '```js run', code, '```', ''].join('\n'), { resolveLink: target => target, context: {} });
const figureTestCases = [
  {
    name: 'a drawing with a caption',
    run: () => figureCell("figure('<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"20\"></svg>', 'a <b>', { highlight: true });").then(({ html }) => /<figure id="figure-\d+" class="tiling output highlight" style="--width: 40px"><svg/.test(html) && html.includes('<figcaption>a &lt;b&gt;</figcaption>')),
  },
  {
    name: 'something that is not a drawing',
    run: () => figureCell("figure('<script>alert(1)</script>');").then(() => false, error => error.message.includes('takes an SVG drawing')),
  },
  {
    name: 'a drawing whose style stays inside it',
    run: () =>
      figureCell("figure('<svg xmlns=\"http://www.w3.org/2000/svg\"><style>text{fill:red}.h,.v{stroke:blue}</style></svg>');").then(({ html }) => {
        const id = html.match(/<figure id="(figure-\d+)"/)[1];

        return html.includes(`<style>#${id} text{fill:red}#${id} .h,#${id} .v{stroke:blue}</style>`);
      }),
  },
  {
    name: 'the counts of every board drawTilings draws',
    run: async () =>
      [
        [{ pieces: 'domino', surface: 'rectangle' }, 36n],
        [{ pieces: 'domicule', surface: 'rectangle' }, 280n],
        [{ pieces: 'domino', surface: 'cylinder' }, 121n],
        [{ pieces: 'domicule', surface: 'cylinder' }, 2649n],
        [{ pieces: 'domino', surface: 'torus' }, 272n],
        [{ pieces: 'domicule', surface: 'torus' }, 17552n],
      ].every(([options, expected]) => drawTilings({ rowCount: 4, colCount: 4, ranks: [0], ...options }).total === expected),
  },
  {
    name: 'every domino tiling of the 4 x 4 board',
    run: async () => {
      const { svg, total } = drawTilings({ rowCount: 4, colCount: 4, ranks: 'all' });

      return total === 36n && svg.startsWith('<svg') && (svg.match(/>#\d+</g) || []).length === 36;
    },
  },
];

async function runFigureTests() {
  for (const [index, { name, run }] of figureTestCases.entries()) {
    process.stdout.write(`Executing figure test ${index + 1} of ${figureTestCases.length} for ${name}... `);

    if (!(await run())) {
      console.error('Failed!');

      return false;
    }

    console.log('Passed!');
  }

  return true;
}

function runNotebookHelperTests() {
  return notebookHelperTestCases.every(({ name, actual, expected }, index) => {
    process.stdout.write(`Executing notebook helper test ${index + 1} of ${notebookHelperTestCases.length} for ${name}... `);

    const value = actual();

    if (value !== expected) {
      console.error(`Failed! Expected: ${expected}, Actual: ${value}`);

      return false;
    }

    console.log('Passed!');

    return true;
  });
}

function runDomiculeReachTest(testCase) {
  const random = createRandom(RANDOM_SEED);
  const seen = new Set();
  const samples = testCase.expectedResult * DOMICULE_REACH_SAMPLES_PER_TILING;

  for (let i = 0; i < samples && seen.size < testCase.expectedResult; i++) {
    seen.add(serializeDomiculeTiling(sampleDomiculeTiling(testCase, random, DOMICULE_REACH_SWEEPS)));
  }

  if (seen.size !== testCase.expectedResult) {
    console.error(`Failed! The chain reached ${seen.size} of ${testCase.expectedResult} tilings.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runCliTest({ rowCount, colCount, args, env = {}, status, output }) {
  const result = spawnSync(
    process.execPath,
    ['src/dominoTilingRenderer.js', '-r', String(rowCount), '-c', String(colCount), ...args],
    { cwd: path.join(__dirname, '..'), encoding: 'utf-8', timeout: CLI_TIMEOUT, env: { ...process.env, ...env } },
  );

  if (result.status !== status || !`${result.stdout}${result.stderr}`.includes(output)) {
    console.error(`Failed! Exit code ${result.status}: ${(result.stderr || result.stdout).trim()}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function findPeriodicCoverageError(tiling, { rowCount, colCount, lattice, torus }) {
  const covered = new Array(rowCount * colCount).fill(0);
  const shifts = [0, ...[-1, 1].filter(dc => (dc < 0 ? PERIODIC_LATTICES[lattice].downLeft : PERIODIC_LATTICES[lattice].downRight))];

  for (const { row, col, dr, dc } of tiling) {
    if (!(dr === 0 && dc === 1) && !(dr === 1 && shifts.includes(dc))) {
      return `piece (${row}, ${col}) goes by (${dr}, ${dc})`;
    }

    if (!torus && row + dr >= rowCount) {
      return `piece (${row}, ${col}) leaves the cylinder`;
    }

    [
      [row, col],
      [(row + dr) % rowCount, (col + dc + colCount) % colCount],
    ].forEach(([r, c]) => covered[r * colCount + c]++);
  }

  const wrong = covered.findIndex(count => count !== 1);

  return wrong === -1 ? null : `cell ${wrong} covered ${covered[wrong]} times`;
}

function countDiagonalPieces(tiling) {
  return tiling.filter(piece => piece.dr !== 0 && piece.dc !== 0).length;
}

function runPeriodicDiagonalTest(testCase) {
  const surface = `${testCase.rowCount}x${testCase.colCount} ${testCase.torus ? 'torus' : 'cylinder'}`;
  const coefficients = countPeriodicDiagonals(testCase);
  const unranker = createPeriodicUnranker(testCase);
  const histogram = [];

  for (let rank = BigInt(0); rank < unranker.total; rank++) {
    const k = countDiagonalPieces(unrankPeriodicTiling(unranker, rank));
    histogram[k] = (histogram[k] ?? BigInt(0)) + BigInt(1);
  }

  const expected = Array.from(histogram, count => String(count ?? BigInt(0))).join();
  const squareCount = periodicReference.calculateTotalTilingCombinations({ ...testCase, lattice: 'square' });

  if (coefficients[0] !== squareCount) {
    console.error(`Failed! ${surface}: ${coefficients[0]} tilings without diagonal pieces, ${squareCount} on the square lattice`);

    return false;
  }

  if (coefficients.map(String).join() !== expected) {
    console.error(`Failed! ${surface}: counted ${coefficients.join()}, enumerated ${expected}`);

    return false;
  }

  for (let k = 0; k < coefficients.length; k++) {
    const filtered = createPeriodicUnranker({ ...testCase, diagonals: k });
    const all = new Set();

    if (filtered.total !== coefficients[k]) {
      console.error(`Failed! ${surface} with ${k} diagonal pieces: ${filtered.total} tilings, not ${coefficients[k]}`);

      return false;
    }

    for (let rank = BigInt(0); rank < filtered.total; rank++) {
      const tiling = unrankPeriodicTiling(filtered, rank);
      const error = findPeriodicCoverageError(tiling, testCase);

      if (error || countDiagonalPieces(tiling) !== k) {
        console.error(`Failed! ${surface} #${rank + BigInt(1)} with ${k} diagonal pieces: ${error || `${countDiagonalPieces(tiling)} diagonal pieces`}`);

        return false;
      }

      all.add(JSON.stringify(tiling));
    }

    if (BigInt(all.size) !== filtered.total) {
      console.error(`Failed! ${surface} with ${k} diagonal pieces: ${all.size} distinct tilings of ${filtered.total}`);

      return false;
    }
  }

  console.log('Passed!');

  return true;
}

function runPeriodicUnrankTest(testCase) {
  const unranker = createPeriodicUnranker(testCase);
  const expected = periodicReference.calculateTotalTilingCombinations(testCase);

  if (unranker.total !== expected) {
    console.error(`Failed! ${testCase.lattice} ${testCase.torus ? 'torus' : 'cylinder'}: expected ${expected}, actual ${unranker.total}`);

    return false;
  }

  const ranks =
    unranker.total <= PERIODIC_FULL_CHECK_LIMIT
      ? Array.from({ length: Number(unranker.total) }, (_, i) => BigInt(i))
      : [...Array.from({ length: UNRANK_SAMPLE_SIZE }, (_, i) => (unranker.total * BigInt(i)) / BigInt(UNRANK_SAMPLE_SIZE)), unranker.total - BigInt(1)];
  const seen = new Set();

  for (const rank of ranks) {
    const tiling = unrankPeriodicTiling(unranker, rank);
    const error = findPeriodicCoverageError(tiling, testCase);

    if (error) {
      console.error(`Failed! Invalid tiling #${rank + BigInt(1)}: ${error}`);

      return false;
    }

    seen.add(JSON.stringify(tiling));
  }

  if (seen.size !== new Set(ranks).size) {
    console.error(`Failed! ${seen.size} distinct tilings for ${new Set(ranks).size} ranks.`);

    return false;
  }

  try {
    unrankPeriodicTiling(unranker, unranker.total);
    console.error('Failed! A rank past the last tiling was accepted.');

    return false;
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
  }

  console.log('Passed!');

  return true;
}

function runSeamGeometryTest() {
  const sheet = renderSheet([[]], 1, { rowCount: 2, colCount: 4, surface: 'torus' });
  const wrong = Object.entries(SEAM_PATHS).filter(([className, d]) => !sheet.includes(`<path class="${className}" d="${d}"/>`));

  if (wrong.length) {
    console.error(`Failed! Glued edge marks differ for ${wrong.map(([className]) => className).join(', ')}.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runPeriodicSheetTest({ tiling, copies, edges, ...options }) {
  const sheet = renderSheet([tiling], 1, { ...options, sublabels: ['2'] });
  const nested = sheet.match(/<svg x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" viewBox="([^"]+)">/);
  const counts = Object.fromEntries(Object.keys(copies).map(kind => [kind, (sheet.match(new RegExp(`<rect class="${kind}"`, 'g')) || []).length]));
  const segments = className => ((sheet.match(new RegExp(`<path class="${className}" d="([^"]+)"`)) || [])[1] || '').split('M').length - 1;
  const seams = { sides: segments('s'), ends: segments('t'), sideTicks: segments('m'), endTicks: segments('u') };
  const torus = options.surface === 'torus';
  const plain = renderSheet([tiling], 1, { rowCount: options.rowCount, colCount: options.colCount });

  if (!nested || nested[5] !== `${nested[1]} ${nested[2]} ${nested[3]} ${nested[4]}`) {
    console.error('Failed! The pieces are not clipped to the board.');

    return false;
  }

  if (Object.keys(copies).some(kind => counts[kind] !== copies[kind])) {
    console.error(`Failed! Pieces drawn: ${JSON.stringify(counts)}, expected ${JSON.stringify(copies)}.`);

    return false;
  }

  if (
    seams.sides + seams.ends !== edges ||
    seams.sides !== 2 ||
    seams.ends !== (torus ? 2 : 0) ||
    seams.sideTicks !== 2 ||
    seams.endTicks !== (torus ? 4 : 0) ||
    !sheet.includes('.s,.t{fill:none') ||
    !sheet.includes('.t,.u{stroke:')
  ) {
    console.error(`Failed! Glued edges drawn: ${JSON.stringify(seams)}, expected ${edges} edges with one tick on each side and two on each end.`);

    return false;
  }

  if (!/<text class="n" x="[\d.]+" y="[\d.]+">2<\/text>/.test(sheet) || plain.includes('class="s"') || plain.includes('<svg x=')) {
    console.error('Failed! The second label line or the free board drawing is wrong.');

    return false;
  }

  console.log('Passed!');

  return true;
}

function runSublabelTest({ choices, shown, ...options }) {
  const sheet = renderSheet([[]], 1, { ...options, sublabels: [choices] });
  const sublabel = sheet.match(/<text class="n"[^>]*>([^<]*)<\/text>/);
  const title = sheet.match(/<title>([^<]*)<\/title><text class="n"/);

  if (!sublabel || (title ? title[1] : sublabel[1]) !== shown) {
    console.error(`Failed! The second label line reads ${sublabel ? sublabel[1] : 'nothing'}, expected ${shown}.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runUnlabelledTest(options) {
  const sheet = renderSheet([[]], 1, { ...options, labels: false, columns: 1 });
  const [, width, height] = sheet.match(/width="([\d.]+)" height="([\d.]+)"/);

  if (width !== height || sheet.includes('<text')) {
    console.error(`Failed! A sheet without labels is ${width} x ${height}${sheet.includes('<text') ? ' and has text' : ''}.`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function runDiagonalUnrankTest({ expectedResult, order, ...board }) {
  const coefficients = expectedResult.split(',').map(BigInt);
  const totals = coefficients.map((_, diagonals) => createDiagonalUnranker({ ...board, diagonals }).total);

  if (totals.join(',') !== coefficients.join(',')) {
    console.error(`Failed! Expected ${expectedResult}, actual ${totals.join(',')}`);

    return false;
  }

  for (let diagonals = 0; diagonals < coefficients.length; diagonals++) {
    const unranker = createDiagonalUnranker({ ...board, diagonals });

    for (const rank of unranker.total ? [BigInt(0), unranker.total - BigInt(1)] : []) {
      const tiling = unrankDiagonalTiling(unranker, rank);
      const count = tiling.filter(piece => piece.dr && piece.dc).length;
      const error = findDomiculeCoverageError(tiling, board);

      if (error || count !== diagonals) {
        console.error(`Failed! Tiling #${rank + BigInt(1)} with ${diagonals} diagonal pieces: ${error || `${count} diagonal pieces`}`);

        return false;
      }
    }
  }

  if (order) {
    const unranker = createDomiculeUnranker(board);
    const all = Array.from({ length: Number(unranker.total) }, (_, i) => JSON.stringify(unrankDomiculeTiling(unranker, BigInt(i))));
    const filtered = coefficients.flatMap((total, diagonals) => {
      const unrankerByCount = createDiagonalUnranker({ ...board, diagonals });
      return Array.from({ length: Number(total) }, (_, i) => JSON.stringify(unrankDiagonalTiling(unrankerByCount, BigInt(i))));
    });
    const byCount = coefficients.flatMap((_, diagonals) =>
      all.filter(tiling => JSON.parse(tiling).filter(piece => piece.dr && piece.dc).length === diagonals),
    );

    if (filtered.join('\n') !== byCount.join('\n')) {
      console.error('Failed! The numbering by diagonal pieces does not keep the order of the full numbering.');

      return false;
    }
  }

  console.log('Passed!');

  return true;
}

function runSuite(name, testCases, run) {
  return testCases.every((testCase, index) => {
    const { rowCount, colCount } = testCase;

    process.stdout.write(
      `Executing ${name} test ${index + 1} of ${testCases.length} for ${rowCount}x${colCount}... `,
    );

    return run(testCase);
  });
}

async function __main__() {
  const testCases = testCasesBigInt.filter(
    ({ rowCount, colCount }) => rowCount * colCount <= MAX_CELLS,
  );

  const unrankTestCases = testCasesBigInt.filter(
    ({ rowCount, colCount }) =>
      rowCount * colCount > MAX_CELLS && canUnrank({ rowCount, colCount }),
  );

  const domiculeTestCases = [...testCasesDomicule, ...testCasesDomiculeRectangles].filter(canUnrankDomicule);
  const total = [
    testCases,
    unrankTestCases,
    randomTestCases,
    randomValidityTestCases,
    domiculeTestCases,
    domiculeRandomTestCases,
    domiculeRandomValidityTestCases,
    domiculeReachTestCases,
    domiculeShapeTestCases,
    rankTestCases,
    periodicUnrankTestCases,
    periodicDiagonalTestCases,
    periodicSheetTestCases,
    sublabelTestCases,
    diagonalUnrankTestCases,
    styleTestCases,
    engravingContainmentTestCases,
    labelWidthTestCases,
    shortLabelTestCases,
    cliTestCases,
    chartTestCases,
  ].reduce(
    (sum, suite) => sum + suite.length,
    0,
  );

  console.log(`Starting renderer test execution with ${total} tests...`);

  const results = [
    runSuite('renderer', testCases, runTest),
    runSuite('unrank', unrankTestCases, runUnrankTest),
    runSuite('rank', rankTestCases, runRankTest),
    runSuite('random uniformity', randomTestCases, runRandomUniformityTest),
    runSuite('random validity', randomValidityTestCases, runRandomValidityTest),
    runSuite('domicule unrank', domiculeTestCases, runDomiculeUnrankTest),
    runSuite('domicule random uniformity', domiculeRandomTestCases, runDomiculeUniformityTest),
    runSuite('domicule random validity', domiculeRandomValidityTestCases, runDomiculeValidityTest),
    runSuite('domicule chain reach', domiculeReachTestCases, runDomiculeReachTest),
    runSuite('domicule shape', domiculeShapeTestCases, runDomiculeShapeTest),
    runSuite('periodic unrank', periodicUnrankTestCases, runPeriodicUnrankTest),
    runSuite('periodic diagonal pieces', periodicDiagonalTestCases, runPeriodicDiagonalTest),
    runSuite('periodic sheet', periodicSheetTestCases, runPeriodicSheetTest),
    runSuite('glued edge marks', [{ rowCount: 2, colCount: 4 }], runSeamGeometryTest),
    runSuite('second label line', sublabelTestCases, runSublabelTest),
    runSuite('sheet without labels', unlabelledTestCases, runUnlabelledTest),
    runSuite('diagonal unrank', diagonalUnrankTestCases, runDiagonalUnrankTest),
    runSuite('sheet style', styleTestCases, runStyleTest),
    runSuite('engraving containment', engravingContainmentTestCases, runEngravingContainmentTest),
    runSuite('domino output', [{ rowCount: 4, colCount: 4 }], runDominoOutputTest),
    runSuite('label width', labelWidthTestCases, runLabelWidthTest),
    runSuite('short label', shortLabelTestCases, runShortLabelTest),
    runSuite('readme images', [{ rowCount: 8, colCount: 8 }], runReadmeImagesTest),
    runSuite('command line', cliTestCases, runCliTest),
    runChartTests(),
    runNotebookHelperTests(),
    await runFigureTests(),
  ];

  if (results.every(Boolean)) {
    console.log('All renderer tests completed successfully.');
    process.exit(0);
  } else {
    console.error('Some renderer tests failed.');
    process.exit(1);
  }
}

__main__();
