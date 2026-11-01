const enumerateTilings = require('./enumerator');
const renderSheet = require('./svg');
const renderAscii = require('./ascii');
const writeSvgSheets = require('./sheets');
const takeRange = require('./range');
const { canCount, countTilings } = require('./count');
const { canUnrank, createUnranker, unrankTiling } = require('./unrank');
const { sampleRandomTiling } = require('./cftp');
const {
  canUnrankDomicule,
  createDomiculeUnranker,
  unrankDomiculeTiling,
  createDiagonalUnranker,
  unrankDiagonalTiling,
  sampleDomiculeTiling,
  DEFAULT_SWEEPS: DOMICULE_SWEEPS,
} = require('./domicule');
const { canUnrankPeriodic, createPeriodicUnranker, unrankPeriodicTiling } = require('./periodic');

module.exports = {
  enumerateTilings,
  renderSheet,
  renderAscii,
  writeSvgSheets,
  takeRange,
  canCount,
  countTilings,
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
  DOMICULE_SWEEPS,
  canUnrankPeriodic,
  createPeriodicUnranker,
  unrankPeriodicTiling,
};
