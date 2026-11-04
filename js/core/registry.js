const path = require('path');
const registry = require('../../spec/algorithms.json');

/**
 * Lists the implementations of an algorithm in the order of the languages: Rust, Python, JavaScript.
 * @param {string} algorithm The id of the algorithm in spec/algorithms.json.
 * @returns {{language: string, file: string}[]} The language and the root-relative file of each implementation.
 */
function listImplementations(algorithm) {
  const entry = registry.algorithms[algorithm];

  if (!entry) {
    throw new Error(`${algorithm} is not an algorithm of spec/algorithms.json.`);
  }

  return Object.keys(registry.languages)
    .filter(language => Object.hasOwn(entry, language))
    .map(language => ({ language, file: entry[language] }));
}

/**
 * Names the JavaScript solver of an algorithm, as the runners and the site name it.
 * @param {string} algorithm The id of the algorithm in spec/algorithms.json.
 * @returns {string} The file name in js/solvers.
 */
function javaScriptFileOf(algorithm) {
  const implementation = listImplementations(algorithm).find(({ language }) => language === 'js');

  if (!implementation) {
    throw new Error(`${algorithm} has no JavaScript implementation in spec/algorithms.json.`);
  }

  return path.basename(implementation.file);
}

/**
 * Finds the algorithm of a JavaScript solver.
 * @param {string} fileName The file name in js/solvers.
 * @returns {string} The id of the algorithm in spec/algorithms.json.
 */
function algorithmOf(fileName) {
  const found = Object.entries(registry.algorithms).find(([, entry]) => entry.js === `js/solvers/${fileName}`);

  if (!found) {
    throw new Error(`js/solvers/${fileName} is not registered in spec/algorithms.json.`);
  }

  return found[0];
}

module.exports = { registry, listImplementations, javaScriptFileOf, algorithmOf };
