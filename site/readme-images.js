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
const SHOWCASE = { rowCount: 10, colCount: 10 };

function sampleRanks(total) {
  const step = total / BigInt(SAMPLES + 1);

  return Array.from({ length: SAMPLES }, (_, i) => step * BigInt(i + 1));
}

function formatRank(rank) {
  return `#${(rank + BigInt(1)).toLocaleString('en-US')}`;
}

function buildShowcase() {
  const domicules = createDomiculeUnranker(SHOWCASE);
  const torus = createPeriodicUnranker({ ...SHOWCASE, lattice: 'king', torus: true });
  const options = { ...SHOWCASE, labels: false, columns: 1 };

  return {
    '.github/assets/showcase-domino.svg': renderSheet([sampleRandomTiling(SHOWCASE, createRandom(SHOWCASE_SEED))], 1, options),
    '.github/assets/showcase-domicule.svg': renderSheet([unrankDomiculeTiling(domicules, domicules.total / BigInt(3))], 1, options),
    '.github/assets/showcase-torus.svg': renderSheet([unrankPeriodicTiling(torus, torus.total / BigInt(3))], 1, {
      ...options,
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
