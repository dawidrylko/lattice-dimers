# Solver contract

Every algorithm is to be kept in three languages, Rust first, Python second and JavaScript third. A change to an algorithm lands in Rust, and the Python and JavaScript implementations follow it in the same pull request. Today `periodic-tiling-modular` has all three and every other algorithm only its JavaScript implementation; [`algorithms.json`](algorithms.json) shows which languages each one has. The BigInt solvers stay the reference of their Modular twins in every language; "reference" never names the Rust implementation.

## Layout

| directory | language | holds |
| --- | --- | --- |
| [`rust/core`](../rust/core/src/lib.rs) | Rust | the library every Rust solver uses: this contract's argument parser, modular arithmetic, primes and the Chinese remainder theorem |
| [`rust/solvers/src/bin`](../rust/solvers/src/bin/periodic-tiling-modular.rs) | Rust | one binary per algorithm, named by its id: `periodic-tiling-modular.rs` |
| [`python/lattice_dimers/core`](../python/lattice_dimers/core/__init__.py) | Python | the same library as `rust/core` |
| [`python/lattice_dimers/solvers`](../python/lattice_dimers/solvers/periodic_tiling_modular.py) | Python | one module per algorithm, named by its id with underscores: `periodic_tiling_modular.py` |
| [`js/core`](../js/core) | JavaScript | the same library, the executor and the loader of [`cases/`](cases/README.md) |
| [`js/solvers`](../js/solvers) | JavaScript | one script per algorithm, under its historical name: `periodicTilingSolver-Modular.js` |

The Rust workspace manifest is [`Cargo.toml`](../Cargo.toml) at the root of the repository, with one `[[bin]]` entry per file in `rust/solvers/src/bin`. `rust/core` has no dependencies. It carries its own integer type for the Chinese remainder theorem. The Python package is described by [`python/pyproject.toml`](../python/pyproject.toml) and installed with `pip install -e python`. It depends on NumPy, which moves a block of states of a cell step at once. A worker thread keeps the two tables of 32-bit counts of the JavaScript solver, and while twice the circumference times the number of states stays within 2^20, up to a circumference of 12 on the king's lattice and 13 on the others, also the sources and targets of every block. A Modular solver runs one worker thread per prime in every language, at most `-j` at a time. Shared code never sits next to the solvers: a solver directory holds solvers only, so that [`harness/portCheck.js`](../harness/portCheck.js) can treat every file in it as an implementation.

## Arguments

An implementation takes `-r <rowCount> -c <colCount>`, and where the algorithm has them `--lattice king|triangular|square`, `--torus`, `--twisted` and `-j <jobs>`, each meaning what it means in the JavaScript solver.

## Output

One line on standard output: the count in decimal, or for the diagonal solvers the counts with 0, 1, 2 and more diagonal pieces separated by commas. Nothing else goes to standard output.

## Errors and limits

An implementation rejects arguments it cannot use, and a board it cannot count, with a usage line that starts with `Usage:` or another message on standard error and a nonzero exit code, never with a wrong count. The limits of the JavaScript solvers are the limits of every language: a Python implementation with unbounded integers and a Rust one with 64-bit words reject the same boards, so a count never depends on the language that made it. The rejection tests of [`harness/testRunner.js`](../harness/testRunner.js) that name an algorithm run through every implementation it has, and its memory test holds every implementation of `periodic-tiling-modular` to 256 MB on a 2 × 18 cylinder. A note on standard error with exit code 0, such as the number of worker threads a diagonal solver actually runs, is allowed and ignored by the runners.

## Running

[`js/core/scriptExecutor.js`](../js/core/scriptExecutor.js) runs a Rust implementation as the release binary of the same name in `target/release` (or `$CARGO_TARGET_DIR/release`), built with `cargo build --release`, and fails the test when it was not built or is older than a `.rs` file under `rust/`; a Python one as a module of the installed package with `python3 -I -m` (or the interpreter at `$PYTHON`); a JavaScript one with the running Node.js.

## The registry

[`algorithms.json`](algorithms.json) maps each language to its solver directory and each algorithm id to the file of every implementation it has. A language an algorithm lacks is a pending port. The files of [`cases/`](cases/README.md) name the algorithms they check by id, so every implementation of an algorithm runs on the same boards.

`pnpm test` fails when the registry names a language the executor cannot run, an implementation outside its language's directory or one that does not exist; when a file in a solver directory is not registered; when a file in `cases/` is not loaded by [`js/core/cases.js`](../js/core/cases.js) or names an unknown algorithm; when a Rust binary is not named by its id or a Python module by its id with underscores; when an algorithm has no JavaScript implementation, because the runners and the site still reach every algorithm through it; and when an algorithm is checked by no file in `cases/`. `pendingPorts` in the registry is the number of implementations still missing, and the test fails when the count differs from it: a new algorithm with fewer than three implementations has to raise it, visibly in the diff, and every port has to lower it. An algorithm added from now on is to come with all three implementations, so the number only falls.

## Benchmarks

The benchmarks are to compare the languages on the same boards. That needs each implementation to report the time of its count apart from the start of its process, which none does yet, so [`harness/benchmarkRunner.js`](../harness/benchmarkRunner.js) still times the JavaScript solvers as whole processes.
