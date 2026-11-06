const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..', '..');
const PYTHON_ROOT = path.join(ROOT_DIRECTORY, 'python');
const RUST_DIRECTORY = path.join(ROOT_DIRECTORY, 'rust');
const RUST_BINARY_DIRECTORY = path.join('solvers', 'src', 'bin');
const LAUNCHERS = {
  '.rs': file => [
    path.join(path.resolve(RUST_DIRECTORY, process.env.CARGO_TARGET_DIR || 'target'), 'release', path.basename(file, '.rs')),
  ],
  '.py': file => [
    process.env.PYTHON || 'python3',
    '-I',
    '-m',
    path.relative(PYTHON_ROOT, file).slice(0, -'.py'.length).split(path.sep).join('.'),
  ],
  '.js': file => [process.execPath, file],
};

function resolve(fileName) {
  return path.join(ROOT_DIRECTORY, fileName.includes('/') ? fileName : path.join('js', 'solvers', fileName));
}

/**
 * Lists the program and the arguments that start one implementation of a solver, before the solver's own arguments.
 * @param {string} fileName The root-relative file of the implementation, or the bare name of a file in js/solvers.
 * @returns {string[]} The program, then its arguments.
 */
function launch(fileName) {
  return LAUNCHERS[path.extname(fileName)](resolve(fileName));
}

function listRustSources(file, buildDirectories) {
  if (!fs.existsSync(file) || buildDirectories.includes(file)) {
    return [];
  }

  if (fs.statSync(file).isDirectory()) {
    return fs.readdirSync(file).flatMap(name => listRustSources(path.join(file, name), buildDirectories));
  }

  return file.endsWith('.rs') ? [file] : [];
}

/**
 * Finds when the sources of one Rust binary last changed: the newest modification time of its own file in
 * rust/solvers/src/bin and of every .rs file under rust/ outside that directory and outside the build directories,
 * read at every run of the binary.
 * The other files in rust/solvers/src/bin are the roots of other binaries, which cargo does not rebuild this one
 * for. Only .rs files count, because cargo rebuilds when a .rs file it compiles is newer than its last build, so
 * cargo build --release makes the binary current; a touched Cargo.toml or Cargo.lock is not rebuilt for, and a .rs
 * file under rust/ that no crate compiles would keep the binary refused. The times are those of this checkout, so a
 * $CARGO_TARGET_DIR shared with another checkout can hold a newer binary built from that checkout's sources.
 * @param {string} source The absolute path of the binary's own file in rust/solvers/src/bin.
 * @param {string} [directory] The rust/ directory.
 * @returns {number} The time in milliseconds since the epoch.
 */
function rustSourcesModifiedAt(source, directory = RUST_DIRECTORY) {
  const binaries = path.join(directory, RUST_BINARY_DIRECTORY);
  const buildDirectories = [path.join(directory, 'target'), path.resolve(directory, process.env.CARGO_TARGET_DIR || 'target')];
  const sources = listRustSources(directory, buildDirectories).filter(file => path.dirname(file) !== binaries || file === source);

  return Math.max(...sources.map(file => fs.statSync(file).mtimeMs));
}

function describeLanguages() {
  const names = Object.keys(LAUNCHERS);

  return `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;
}

/**
 * Generates the command string that runs one implementation of a solver: a .rs file as its release binary in
 * rust/target/release (or $CARGO_TARGET_DIR/release, relative to rust/), a .py file as a module of the lattice_dimers package with
 * python3 -I -m (or $PYTHON), a .js file with the running Node.js binary.
 * @param {string} fileName The root-relative file of the implementation, or the bare name of a file in js/solvers.
 * @param {Object} options Options including row and column counts.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @property {string} [options.lattice] The lattice of the cylinder and torus solvers.
 * @property {boolean} [options.torus] Whether a cylinder or torus board is a torus.
 * @property {boolean} [options.twisted] Whether a cylinder or torus board is counted with the seam sign.
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
 * Executes one implementation of a solver with the provided options and returns the output. A Rust binary that
 * was not built, or is older than the .rs files it is built from, fails instead of counting with code that is not the repository's.
 * @param {string} fileName The root-relative file of the implementation, or the bare name of a file in js/solvers.
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
      throw new Error(`${binary} does not exist; build it with cargo build --release in rust/.`);
    }

    if (path.extname(fileName) === '.rs' && fs.statSync(binary).mtimeMs < rustSourcesModifiedAt(resolve(fileName))) {
      throw new Error(`${binary} is older than the .rs files it is built from; rebuild it with cargo build --release in rust/.`);
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

module.exports = Object.assign(executeSolver, { generateCommand, launch, rustSourcesModifiedAt, LANGUAGES: Object.keys(LAUNCHERS).map(name => name.slice(1)) });
