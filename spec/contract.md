# Solver contract

Every algorithm is to be kept in three languages, Rust first, Python second and JavaScript third. A change to an algorithm lands in Rust, and the Python and JavaScript implementations follow it in the same pull request. Today `periodic-tiling-modular` and `domicule-tiling-modular` have all three and every other algorithm only its JavaScript implementation; [`algorithms.json`](algorithms.json) shows which languages each one has. The BigInt solvers stay the reference of their Modular twins in every language; "reference" never names the Rust implementation.

## Layout

| directory | language | holds |
| --- | --- | --- |
| [`rust/core`](../rust/core/src/lib.rs) | Rust | the library every Rust solver uses: this contract's argument parser, modular arithmetic, primes, the Kahn-Lovász bound and the Chinese remainder theorem |
| [`rust/solvers/src/bin`](../rust/solvers/src/bin/periodic-tiling-modular.rs) | Rust | one binary per algorithm, named by its id: `periodic-tiling-modular.rs` |
| [`python/lattice_dimers/core`](../python/lattice_dimers/core/__init__.py) | Python | the same library as `rust/core` |
| [`python/lattice_dimers/solvers`](../python/lattice_dimers/solvers/periodic_tiling_modular.py) | Python | one module per algorithm, named by its id with underscores: `periodic_tiling_modular.py` |
| [`js/core`](../js/core) | JavaScript | the same library, the executor and the loader of [`cases/`](cases/README.md) |
| [`js/solvers`](../js/solvers) | JavaScript | one script per algorithm, under its historical name: `periodicTilingSolver-Modular.js` |

The Rust workspace manifest is [`Cargo.toml`](../Cargo.toml) at the root of the repository, with one `[[bin]]` entry per file in `rust/solvers/src/bin`. `rust/core` has no dependencies. It carries its own integer type for the Chinese remainder theorem. The Python package is described by [`python/pyproject.toml`](../python/pyproject.toml) and installed with `pip install -e python`. It depends on NumPy, which moves every state of a cell step at once, through views of the table rather than lists of indices. A worker thread keeps two tables of 32-bit counts, as the JavaScript solver does. On a torus each table has one column per start of a batch. A batch takes as many starts as fit in 2^20 counts, and at least one. So a narrow torus runs many starts in one pass, and a board of 2^20 states or more runs one start at a time. A Modular solver runs one worker thread per prime in every language, at most `-j` at a time. Shared code never sits next to the solvers: a solver directory holds solvers only, so that [`harness/portCheck.js`](../harness/portCheck.js) can treat every file in it as an implementation.

## Arguments

An implementation takes `-r <rowCount> -c <colCount>`, and where the algorithm has them `--lattice king|triangular|square`, `--torus`, `--twisted` and `-j <jobs>`, each meaning what it means in the JavaScript solver. Every implementation takes `--time`.

## Output

One line on standard output: the count in decimal, or for the diagonal solvers the counts with 0, 1, 2 and more diagonal pieces separated by commas. Nothing else goes to standard output. With `--time` an implementation also writes `time <milliseconds> ms` to standard error, with three decimals: the time from the end of the argument checks to the moment the count is known, on a monotonic clock. It covers the worker threads and the Chinese remainder theorem, and leaves out the start of the process and the loading of the program (`js/core/timer.js`, `rust/core/src/timer.rs`, `python/lattice_dimers/core/timer.py`).

## Errors and limits

An implementation rejects arguments it cannot use, and a board it cannot count, with a usage line that starts with `Usage:` or another message on standard error and a nonzero exit code, never with a wrong count. The limits of the JavaScript solvers are the limits of every language: a Python implementation with unbounded integers and a Rust one with 64-bit words reject the same boards, so a count never depends on the language that made it. The rejection tests of [`harness/testRunner.js`](../harness/testRunner.js) that name an algorithm run through every implementation it has, and its memory test holds every implementation of `periodic-tiling-modular` to 256 MB on a 2 × 18 cylinder. A note on standard error with exit code 0, such as the number of worker threads a diagonal solver actually runs, is allowed and ignored by the runners.

## Running

[`js/core/scriptExecutor.js`](../js/core/scriptExecutor.js) runs a Rust implementation as the release binary of the same name in `target/release` (or `$CARGO_TARGET_DIR/release`), built with `cargo build --release`, and fails the test when it was not built or is older than a `.rs` file it is built from: its own file in `rust/solvers/src/bin` or any `.rs` file under `rust/` outside that directory; a Python one as a module of the installed package with `python3 -I -m` (or the interpreter at `$PYTHON`); a JavaScript one with the running Node.js.

## The registry

[`algorithms.json`](algorithms.json) maps each language to its solver directory and each algorithm id to the file of every implementation it has. A language an algorithm lacks is a pending port. The files of [`cases/`](cases/README.md) name the algorithms they check by id, so every implementation of an algorithm runs on the same boards.

`pnpm test` fails when the registry names a language the executor cannot run, an implementation outside its language's directory or one that does not exist; when a file in a solver directory is not registered; when a file in `cases/` is not loaded by [`js/core/cases.js`](../js/core/cases.js) or names an unknown algorithm; when a Rust binary is not named by its id or a Python module by its id with underscores; when an algorithm has no JavaScript implementation, because the runners and the site still reach every algorithm through it; and when an algorithm is checked by no file in `cases/`. `pendingPorts` in the registry is the number of implementations still missing, and the test fails when the count differs from it: a new algorithm with fewer than three implementations has to raise it, visibly in the diff, and every port has to lower it. An algorithm added from now on is to come with all three implementations, so the number only falls.

## Benchmarks

The benchmarks compare the languages on the same boards. [`harness/benchmarkRunner.js`](../harness/benchmarkRunner.js) runs every implementation of an algorithm with `--time` and records two times per run: the time of the count the implementation reports, and the time of its whole process. The site shows the first and gives the second in a tooltip ([`benchmarks/README.md`](../benchmarks/README.md)).
