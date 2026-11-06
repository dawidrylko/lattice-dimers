# Rust

The Rust implementations of the solvers, the first of the three languages of [`spec/contract.md`](../spec/contract.md).

| path | holds |
| --- | --- |
| [`core`](core/src/lib.rs) | the contract's argument parser, modular arithmetic, primes, the Kahn-Lovász bound, the Chinese remainder theorem, an integer of any size for it, for the exact determinant of `domino-rectangle-formula` and for the counts of `domino-rectangle-bigint`, `domicule-rectangle-bigint`, `diagonal-pieces-bigint` and `all-lattices-cylinder-torus-bigint`, and the worker threads |
| [`solvers/src/bin`](solvers/src/bin/all-lattices-cylinder-torus-modular.rs) | one binary per algorithm, named by its id, each with a `[[bin]]` entry in [`Cargo.toml`](Cargo.toml) |

## Quick start

Rust 1.99 ([`Cargo.toml`](Cargo.toml)). The commands run in this directory, and the solver prints 3263262629905, the domicule tilings of the 8 × 8 rectangle:

```sh
git clone https://github.com/dawidrylko/lattice-dimers.git
cd lattice-dimers/rust
cargo build --release
target/release/domicule-rectangle-modular -r 8 -c 8
cargo test --release
```

## Running and testing

```sh
target/release/all-lattices-cylinder-torus-modular -r 10 -c 10 --torus
```

`cargo test --release` runs the binaries on the boards of [`spec/cases`](../spec/cases/README.md), within [`spec/limits.json`](../spec/limits.json) unless `FULL_CASES=1`, and the unit tests of `core`. Its test data is read with `serde_json` and the peak memory with `libc`, both dependencies of the tests only. [`benchmarks/executor.js`](../benchmarks/executor.js) runs the binaries in `rust/target/release` (or `$CARGO_TARGET_DIR/release`, relative to `rust/`) and refuses a binary older than its own file in `solvers/src/bin` or a `.rs` file under `rust/` outside that directory and the build directories.
