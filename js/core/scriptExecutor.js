const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..', '..');

function resolve(fileName) {
  return path.join(ROOT_DIRECTORY, fileName.includes('/') ? fileName : path.join('js', 'solvers', fileName));
}

/**
 * Lists the program and the arguments that start a JavaScript solver, before the solver's own arguments.
 * @param {string} fileName The root-relative file of the solver, or the bare name of a file in js/solvers.
 * @returns {string[]} The program, then its arguments.
 */
function launch(fileName) {
  return [process.execPath, resolve(fileName)];
}

/**
 * Generates the command string that runs a JavaScript solver with the running Node.js binary.
 * @param {string} fileName The root-relative file of the solver, or the bare name of a file in js/solvers.
 * @param {Object} options Options including row and column counts.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @property {string} [options.lattice] The lattice of the cylinder and torus solvers.
 * @property {boolean} [options.torus] Whether a cylinder or torus board is a torus.
 * @property {boolean} [options.twisted] Whether a cylinder or torus board is counted with the seam sign.
 * @returns {string} The generated command string.
 * @throws {Error} When the file is not a .js file.
 */
function generateCommand(fileName, { rowCount, colCount, lattice, torus, twisted }) {
  if (path.extname(fileName) !== '.js') {
    throw new Error(`${fileName} is not a .js implementation.`);
  }

  const flags = [lattice ? ` --lattice ${lattice}` : '', torus ? ' --torus' : '', twisted ? ' --twisted' : ''].join('');

  return `${launch(fileName).map(part => `"${part}"`).join(' ')} -r ${rowCount} -c ${colCount}${flags}`;
}

/**
 * Executes a JavaScript solver with the provided options and returns the output.
 * @param {string} fileName The root-relative file of the solver, or the bare name of a file in js/solvers.
 * @param {Object} options Options to pass to the solver.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {string} The trimmed output of the solver.
 */
function executeSolver(fileName, options) {
  try {
    const output = execSync(generateCommand(fileName, options), {
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    return output.trim();
  } catch (error) {
    throw new Error(`Execution failed: ${error.message}`);
  }
}

module.exports = Object.assign(executeSolver, { generateCommand, launch });
