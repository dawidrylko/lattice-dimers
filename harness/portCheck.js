const fs = require('fs');
const path = require('path');
const { LANGUAGES } = require('../js/core/scriptExecutor.js');

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
      .map(name => ({ name, algorithms: JSON.parse(fs.readFileSync(path.join(casesDirectory, name), 'utf-8')).algorithms })),
    loadedCaseFiles: [
      ...fs.readFileSync(path.join(ROOT_DIRECTORY, 'js', 'core', 'cases.js'), 'utf-8').matchAll(/load\('([^']+\.json)'\)/g),
    ].map(([, name]) => name),
    runnableLanguages: LANGUAGES,
  };
}

/**
 * Lists every way spec/algorithms.json, the implementations on disk and spec/cases disagree.
 * @param {Object} repository The state to check.
 * @property {{languages: Object<string, string>, pendingPorts: number, algorithms: Object<string, Object<string, string>>}} repository.registry
 *   The contents of spec/algorithms.json.
 * @property {string[]} repository.files The root-relative files in the directories of the languages.
 * @property {{name: string, algorithms: string[]}[]} repository.caseFiles The files of spec/cases with the algorithms each checks.
 * @property {string[]} repository.loadedCaseFiles The files of spec/cases that js/core/cases.js loads.
 * @property {string[]} repository.runnableLanguages The languages the executor can run.
 * @returns {string[]} One message per disagreement.
 */
function listPortErrors({ registry, files, caseFiles, loadedCaseFiles, runnableLanguages }) {
  const errors = [];
  const registered = new Set();

  for (const language of Object.keys(registry.languages).filter(language => !runnableLanguages.includes(language))) {
    errors.push(`spec/algorithms.json names ${language}, which js/core/scriptExecutor.js cannot run.`);
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

  for (const { name } of caseFiles.filter(({ name }) => !loadedCaseFiles.includes(name))) {
    errors.push(`spec/cases/${name} is not loaded by js/core/cases.js, so no test runs it.`);
  }

  const loaded = caseFiles.filter(({ name }) => loadedCaseFiles.includes(name));

  for (const { name, algorithms } of loaded) {
    for (const algorithm of algorithms.filter(algorithm => !Object.hasOwn(registry.algorithms, algorithm))) {
      errors.push(`spec/cases/${name} checks ${algorithm}, which is not an algorithm of spec/algorithms.json.`);
    }
  }

  const checked = new Set(loaded.flatMap(({ algorithms }) => algorithms));

  for (const algorithm of Object.keys(registry.algorithms).filter(algorithm => !checked.has(algorithm))) {
    errors.push(`${algorithm} is checked by no file in spec/cases.`);
  }

  return errors;
}

module.exports = { readRepository, listPortErrors };
