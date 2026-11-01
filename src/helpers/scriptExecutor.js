const { execSync } = require('child_process');
const path = require('path');

const SOLVER_DIRECTORY = path.join(__dirname, '..', 'solvers');

/**
 * Generates a command string for executing a node script with the same Node.js binary as the current process.
 * @param {string} fileName The file name of the solver in src/solvers.
 * @param {Object} options Options including row and column counts.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @property {string} [options.lattice] The lattice of the periodic solvers.
 * @property {boolean} [options.torus] Whether a periodic board is a torus.
 * @property {boolean} [options.twisted] Whether a periodic board is counted with the seam sign.
 * @returns {string} The generated command string.
 */
function generateNodeCommand(fileName, { rowCount, colCount, lattice, torus, twisted }) {
  const flags = [lattice ? ` --lattice ${lattice}` : '', torus ? ' --torus' : '', twisted ? ' --twisted' : ''].join('');

  return `"${process.execPath}" "${path.join(SOLVER_DIRECTORY, fileName)}" -r ${rowCount} -c ${colCount}${flags}`;
}

/**
 * Executes a node script with the provided options and returns the output.
 * @param {string} fileName The file name of the node script.
 * @param {Object} options Options to pass to the script.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {string} The trimmed output of the script execution.
 */
function executeNodeScript(fileName, options) {
  try {
    const command = generateNodeCommand(fileName, options);
    const output = execSync(command, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    return output.trim();
  } catch (error) {
    throw new Error(`Execution failed: ${error.message}`);
  }
}

module.exports = Object.assign(executeNodeScript, { generateNodeCommand });
