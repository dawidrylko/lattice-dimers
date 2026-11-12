const fs = require('fs');
const path = require('path');
const { boardKeyOf } = require('../js/core/cases.js');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const EXTENSIONS = { rs: '.rs', py: '.py', js: '.js' };

function listFiles(directory) {
  const absolute = path.join(ROOT_DIRECTORY, directory);

  return fs.existsSync(absolute)
    ? fs
        .readdirSync(absolute, { withFileTypes: true })
        .filter(entry => entry.isFile() && !entry.name.startsWith('.') && entry.name !== '__init__.py')
        .map(entry => `${directory}/${entry.name}`)
    : [];
}

const HOLDS_THE_BOARDS_OF = {
  'any-lattice-cylinder-torus-modular': ['any-lattice-cylinder-torus-bigint'],
  'any-lattice-rectangle-modular': ['any-lattice-rectangle-bigint'],
  'domicule-cylinder-torus-polynomial-modular': ['domicule-cylinder-torus-polynomial-bigint'],
  'domicule-rectangle-polynomial-modular': ['domicule-rectangle-polynomial-bigint'],
  'domicule-rectangle-bigint': ['domicule-rectangle-modular'],
  'domicule-rectangle-modular': ['domicule-rectangle-bigint'],
  'domino-rectangle-bigint': ['domino-rectangle-formula', 'domino-rectangle-float'],
};

function familyOf(algorithm) {
  return algorithm.slice(0, algorithm.lastIndexOf('-'));
}

/**
 * Lists every board on which two twin algorithms hold different counts. Twins are the algorithms of one family,
 * whose ids differ only in the method, so they count the same boards.
 * @param {{algorithm: string, testCases: Object[]}[]} caseFiles The files of spec/cases.
 * @returns {string[]} One message per disagreement.
 */
function listTwinDisagreements(caseFiles) {
  const errors = [];
  const counts = new Map();

  for (const { algorithm, testCases } of caseFiles.filter(({ algorithm }) => typeof algorithm === 'string')) {
    for (const testCase of testCases ?? []) {
      const key = `${familyOf(algorithm)}|${boardKeyOf(testCase)}`;
      const known = counts.get(key);
      const count = String(testCase.expectedResult);

      if (!known) {
        counts.set(key, { algorithm, count });
      } else if (known.count !== count) {
        errors.push(
          `${known.algorithm} and ${algorithm} disagree on the ${testCase.rowCount} x ${testCase.colCount} board ${boardKeyOf(testCase)}: ${known.count} against ${count}.`,
        );
      }
    }
  }

  return errors;
}

/**
 * Lists every board of a twin that the algorithm which is to reach it does not hold, so no solver loses a board
 * its twin is checked on.
 * @param {{algorithm: string, testCases: Object[]}[]} caseFiles The files of spec/cases.
 * @returns {string[]} One message per missing board.
 */
function listMissingTwinBoards(caseFiles) {
  const boardsOf = algorithm => caseFiles.find(caseFile => caseFile.algorithm === algorithm)?.testCases ?? [];

  return Object.entries(HOLDS_THE_BOARDS_OF).flatMap(([algorithm, twins]) => {
    const held = new Set(boardsOf(algorithm).map(boardKeyOf));

    return twins.flatMap(twin =>
      boardsOf(twin)
        .filter(testCase => !held.has(boardKeyOf(testCase)))
        .map(testCase => `spec/cases/${algorithm}.json lacks the board ${boardKeyOf(testCase)} of ${twin}.`),
    );
  });
}

function readRepository() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT_DIRECTORY, 'spec', 'algorithms.json'), 'utf-8'));
  const casesDirectory = path.join(ROOT_DIRECTORY, 'spec', 'cases');

  return {
    registry,
    files: Object.values(registry.languages).flatMap(listFiles).sort(),
    caseFiles: fs
      .readdirSync(casesDirectory)
      .filter(name => name.endsWith('.json'))
      .sort()
      .map(name => ({ name, ...JSON.parse(fs.readFileSync(path.join(casesDirectory, name), 'utf-8')) })),
    knownLanguages: Object.keys(EXTENSIONS),
  };
}

/**
 * Lists every way spec/algorithms.json, the implementations on disk and spec/cases disagree.
 * @param {Object} repository The state to check.
 * @property {{languages: Object<string, string>, pendingPorts: number, algorithms: Object<string, Object<string, string>>}} repository.registry
 *   The contents of spec/algorithms.json.
 * @property {string[]} repository.files The root-relative files in the directories of the languages.
 * @property {{name: string, algorithm: string, testCases: Object[]}[]} repository.caseFiles The files of spec/cases.
 * @property {string[]} repository.knownLanguages The languages this check knows the file extension of.
 * @returns {string[]} One message per disagreement.
 */
function listPortErrors({ registry, files, caseFiles, knownLanguages }) {
  const errors = [];
  const registered = new Set();

  for (const language of Object.keys(registry.languages).filter(language => !knownLanguages.includes(language))) {
    errors.push(`spec/algorithms.json names ${language}, which harness/portCheck.js has no file extension for.`);
  }

  for (const [algorithm, entry] of Object.entries(registry.algorithms)) {
    for (const [language, file] of Object.entries(entry)) {
      const directory = registry.languages[language];

      if (!directory) {
        errors.push(`spec/algorithms.json gives ${algorithm} a ${language} implementation, but ${language} is not one of its languages.`);
        continue;
      }

      if (path.dirname(file) !== directory || path.extname(file) !== EXTENSIONS[language]) {
        errors.push(`spec/algorithms.json puts the ${language} implementation of ${algorithm} at ${file}, outside ${directory}/*${EXTENSIONS[language]}.`);
      }

      const stem = path.basename(file, EXTENSIONS[language]);
      const named = { rs: algorithm, py: algorithm.replaceAll('-', '_'), js: algorithm }[language];

      if (named && stem !== named) {
        errors.push(`spec/algorithms.json names the ${language} implementation of ${algorithm} ${path.basename(file)}, not ${named}${EXTENSIONS[language]}.`);
      }

      if (!files.includes(file)) {
        errors.push(`spec/algorithms.json names ${file} for ${algorithm}, which does not exist.`);
      }

      registered.add(file);
    }

    if (!Object.hasOwn(entry, 'js')) {
      errors.push(`${algorithm} has no js implementation; the runners and the site still reach every algorithm through it.`);
    }
  }

  const pending = Object.values(registry.algorithms).reduce(
    (count, entry) => count + Object.keys(registry.languages).filter(language => !Object.hasOwn(entry, language)).length,
    0,
  );

  if (pending > registry.pendingPorts) {
    errors.push(
      `${pending} implementations are missing, but spec/algorithms.json allows ${registry.pendingPorts} pending ports; an algorithm added from now on comes with all three.`,
    );
  }

  if (pending < registry.pendingPorts) {
    errors.push(`${pending} implementations are missing; lower pendingPorts in spec/algorithms.json from ${registry.pendingPorts} to ${pending}.`);
  }

  for (const file of files.filter(file => !registered.has(file))) {
    errors.push(`${file} is not registered in spec/algorithms.json.`);
  }

  for (const { name, algorithm, testCases } of caseFiles) {
    if (name !== `${algorithm}.json`) {
      errors.push(`spec/cases/${name} holds the cases of ${algorithm}; the file of an algorithm is named <id>.json.`);
    }

    if (!Object.hasOwn(registry.algorithms, name.slice(0, -'.json'.length))) {
      errors.push(`spec/cases/${name} is not named after an algorithm of spec/algorithms.json, so no test runs it.`);
    }

    if (!Array.isArray(testCases) || !testCases.length) {
      errors.push(`spec/cases/${name} holds no test cases.`);
    }

    const keys = (testCases ?? []).map(boardKeyOf);

    for (const key of new Set(keys.filter((key, index) => keys.indexOf(key) !== index))) {
      errors.push(`spec/cases/${name} holds the board ${key} more than once.`);
    }
  }

  const checked = new Set(caseFiles.map(({ name }) => name));

  for (const algorithm of Object.keys(registry.algorithms).filter(algorithm => !checked.has(`${algorithm}.json`))) {
    errors.push(`${algorithm} has no file in spec/cases.`);
  }

  errors.push(...listTwinDisagreements(caseFiles), ...listMissingTwinBoards(caseFiles));

  return errors;
}

module.exports = { readRepository, listPortErrors };
