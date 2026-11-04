const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..', '..');
const SOLVER_DIRECTORY = path.join(ROOT_DIRECTORY, 'src', 'solvers');
const LAUNCHERS = {
  '.rs': fileName => [
    path.join(path.resolve(ROOT_DIRECTORY, process.env.CARGO_TARGET_DIR || 'target'), 'release', path.basename(fileName, '.rs')),
  ],
  '.py': fileName => [process.env.PYTHON || 'python3', '-I', path.join(SOLVER_DIRECTORY, fileName)],
  '.js': fileName => [process.execPath, path.join(SOLVER_DIRECTORY, fileName)],
};

function launch(fileName) {
  return LAUNCHERS[path.extname(fileName)](fileName);
}

function describeLanguages() {
  const names = Object.keys(LAUNCHERS);

  return `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;
}

/**
 * Generates the command string that runs one implementation of a solver: a .rs file as its release binary in
 * target/release (or $CARGO_TARGET_DIR/release), a .py file with python3 -I (or $PYTHON), a .js file with the
 * running Node.js binary.
 * @param {string} fileName The file name of the implementation in src/solvers.
 * @param {Object} options Options including row and column counts.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @property {string} [options.lattice] The lattice of the periodic solvers.
 * @property {boolean} [options.torus] Whether a periodic board is a torus.
 * @property {boolean} [options.twisted] Whether a periodic board is counted with the seam sign.
 * @returns {string} The generated command string.
 * @throws {Error} When the file name has no extension of a known language.
 */
function generateCommand(fileName, { rowCount, colCount, lattice, torus, twisted }) {
  if (!Object.hasOwn(LAUNCHERS, path.extname(fileName))) {
    throw new Error(`${fileName} is not a ${describeLanguages()} implementation.`);
  }

  const flags = [lattice ? ` --lattice ${lattice}` : '', torus ? ' --torus' : '', twisted ? ' --twisted' : ''].join('');

  return `${launch(fileName).map(part => `"${part}"`).join(' ')} -r ${rowCount} -c ${colCount}${flags}`;
}

/**
 * Executes one implementation of a solver with the provided options and returns the output.
 * @param {string} fileName The file name of the implementation in src/solvers.
 * @param {Object} options Options to pass to the solver.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {string} The trimmed output of the solver.
 */
function executeSolver(fileName, options) {
  try {
    const command = generateCommand(fileName, options);
    const [binary] = launch(fileName);

    if (path.extname(fileName) === '.rs' && !fs.existsSync(binary)) {
      throw new Error(`${binary} does not exist; build it with cargo build --release.`);
    }

    const output = execSync(command, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    return output.trim();
  } catch (error) {
    throw new Error(`Execution failed: ${error.message}`);
  }
}

module.exports = Object.assign(executeSolver, { generateCommand, LANGUAGES: Object.keys(LAUNCHERS).map(name => name.slice(1)) });
