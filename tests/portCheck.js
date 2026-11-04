const fs = require('fs');
const path = require('path');
const { LANGUAGES } = require('../src/helpers/scriptExecutor.js');

const ROOT_DIRECTORY = path.join(__dirname, '..');

function readRepository() {
  const dataDirectory = path.join(ROOT_DIRECTORY, 'data');

  return {
    implementations: fs
      .readdirSync(path.join(ROOT_DIRECTORY, 'src', 'solvers'), { withFileTypes: true })
      .filter(entry => entry.isFile() && !entry.name.startsWith('.'))
      .map(entry => entry.name)
      .sort(),
    dataFiles: fs
      .readdirSync(dataDirectory)
      .filter(name => name.endsWith('.json'))
      .sort()
      .map(name => ({ name, files: JSON.parse(fs.readFileSync(path.join(dataDirectory, name), 'utf-8')).files })),
    loadedDataFiles: [...fs.readFileSync(path.join(dataDirectory, 'index.js'), 'utf-8').matchAll(/require\('\.\/([^']+\.json)'\)/g)].map(
      ([, name]) => name,
    ),
    runnableLanguages: LANGUAGES,
    ports: JSON.parse(fs.readFileSync(path.join(ROOT_DIRECTORY, 'src', 'ports.json'), 'utf-8')),
  };
}

function splitName(fileName) {
  const extension = path.extname(fileName);

  return { algorithm: path.basename(fileName, extension), language: extension.slice(1) };
}

/**
 * Lists every way the implementations in src/solvers, the files of data/ and src/ports.json disagree.
 * @param {Object} repository The state to check.
 * @property {string[]} repository.implementations The file names in src/solvers.
 * @property {{name: string, files: string[]}[]} repository.dataFiles The files of data/ with the solvers each checks.
 * @property {{languages: string[], pending: Object<string, string[]>}} repository.ports The contents of src/ports.json.
 * @property {string[]} repository.loadedDataFiles The files of data/ that data/index.js loads.
 * @property {string[]} repository.runnableLanguages The languages the executor can run.
 * @returns {string[]} One message per disagreement.
 */
function listPortErrors({ implementations, dataFiles, ports, loadedDataFiles, runnableLanguages }) {
  const { languages, pending } = ports;
  const errors = [];
  const byAlgorithm = new Map();

  for (const language of languages.filter(language => !runnableLanguages.includes(language))) {
    errors.push(`src/ports.json names ${language}, which src/helpers/scriptExecutor.js cannot run.`);
  }

  for (const { name } of dataFiles.filter(({ name }) => !loadedDataFiles.includes(name))) {
    errors.push(`data/${name} is not loaded by data/index.js, so no test runs it.`);
  }

  for (const fileName of implementations) {
    const { algorithm, language } = splitName(fileName);

    if (!languages.includes(language)) {
      const names = languages.map(name => `.${name}`);

      errors.push(`src/solvers/${fileName} is not a ${names.slice(0, -1).join(', ')} or ${names.at(-1)} implementation.`);
      continue;
    }

    byAlgorithm.set(algorithm, [...(byAlgorithm.get(algorithm) ?? []), language]);
  }

  for (const [algorithm, missing] of Object.entries(pending)) {
    if (!byAlgorithm.has(algorithm)) {
      errors.push(`src/ports.json lists ${algorithm}, which has no implementation in src/solvers.`);
    }

    for (const language of missing.filter(language => !languages.includes(language))) {
      errors.push(`src/ports.json lists ${algorithm}.${language}, but ${language} is not one of ${languages.join(', ')}.`);
    }
  }

  for (const [algorithm, present] of byAlgorithm) {
    const declared = pending[algorithm] ?? [];

    for (const language of languages) {
      if (!present.includes(language) && !declared.includes(language)) {
        errors.push(`${algorithm} has no ${language} implementation, and src/ports.json does not list it as pending.`);
      }

      if (present.includes(language) && declared.includes(language)) {
        errors.push(`src/ports.json lists ${algorithm}.${language} as pending, but src/solvers/${algorithm}.${language} exists.`);
      }
    }
  }

  const checked = new Set(dataFiles.filter(({ name }) => loadedDataFiles.includes(name)).flatMap(({ files }) => files));

  for (const { name, files } of dataFiles) {
    for (const fileName of files) {
      const { algorithm } = splitName(fileName);

      if (!implementations.includes(fileName)) {
        errors.push(`data/${name} checks ${fileName}, which is not in src/solvers.`);
        continue;
      }

      for (const language of byAlgorithm.get(algorithm) ?? []) {
        if (!files.includes(`${algorithm}.${language}`)) {
          errors.push(`data/${name} checks ${fileName} but not ${algorithm}.${language}.`);
        }
      }
    }
  }

  for (const fileName of implementations.filter(fileName => languages.includes(splitName(fileName).language))) {
    if (!checked.has(fileName)) {
      errors.push(`src/solvers/${fileName} is checked by no file in data/.`);
    }
  }

  return [...new Set(errors)];
}

module.exports = { readRepository, listPortErrors };
