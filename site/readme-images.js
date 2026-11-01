const fs = require('fs');
const path = require('path');
const {
  renderSheet,
  sampleRandomTiling,
  createDomiculeUnranker,
  unrankDomiculeTiling,
  createPeriodicUnranker,
  unrankPeriodicTiling,
} = require('../src/renderer');
const { createRandom } = require('../src/renderer/cftp');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const BOARD = { rowCount: 8, colCount: 8 };
const SAMPLES = 4;
const SHOWCASE_SEED = 2024;
const SHOWCASE_DOMINO = { rowCount: 16, colCount: 16 };
const SHOWCASE_DOMICULE = { rowCount: 12, colCount: 12 };
const SHOWCASE_TORUS = { rowCount: 8, colCount: 8 };

function sampleRanks(total) {
  const step = total / BigInt(SAMPLES + 1);

  return Array.from({ length: SAMPLES }, (_, i) => step * BigInt(i + 1));
}

function formatRank(rank) {
  return `#${(rank + BigInt(1)).toLocaleString('en-US')}`;
}

function buildShowcase() {
  const domino = sampleRandomTiling(SHOWCASE_DOMINO, createRandom(SHOWCASE_SEED));
  const domicules = createDomiculeUnranker(SHOWCASE_DOMICULE);
  const domiculeRank = domicules.total / BigInt(3);
  const torus = createPeriodicUnranker({ ...SHOWCASE_TORUS, lattice: 'king', torus: true });
  const torusRank = torus.total / BigInt(3);

  return {
    '.github/assets/showcase-domino.svg': renderSheet([domino], 1, { ...SHOWCASE_DOMINO, labels: [''], columns: 1 }),
    '.github/assets/showcase-domicule.svg': renderSheet([unrankDomiculeTiling(domicules, domiculeRank)], 1, {
      ...SHOWCASE_DOMICULE,
      labels: [''],
      columns: 1,
    }),
    '.github/assets/showcase-torus.svg': renderSheet([unrankPeriodicTiling(torus, torusRank)], 1, {
      ...SHOWCASE_TORUS,
      labels: [''],
      columns: 1,
      surface: 'torus',
    }),
  };
}

function buildReadmeImages() {
  const unranker = createDomiculeUnranker(BOARD);
  const ranks = sampleRanks(unranker.total);
  const tilings = ranks.map(rank => unrankDomiculeTiling(unranker, rank));
  const labels = ranks.map(formatRank);

  return {
    ...buildShowcase(),
    ...Object.fromEntries(
      renderSheet.STYLES.map(style => [
        `.github/assets/gallery-${style}.svg`,
        renderSheet(tilings, 1, { ...BOARD, style, labels, columns: SAMPLES }),
      ]),
    ),
  };
}

if (require.main === module) {
  Object.entries(buildReadmeImages()).forEach(([file, svg]) => {
    fs.writeFileSync(path.join(ROOT_DIRECTORY, file), svg);
    console.log(`Image saved: ${file}`);
  });
}

module.exports = { buildReadmeImages };
