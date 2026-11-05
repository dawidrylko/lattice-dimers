# Rust

The Rust implementations of the solvers, the first of the three languages of [`spec/contract.md`](../spec/contract.md).

| path | holds |
| --- | --- |
| [`core`](core/src/lib.rs) | the contract's argument parser, modular arithmetic, primes, the Kahn-Lovász bound, the Chinese remainder theorem, an integer of any size for it and for the exact determinant of `domino-tiling-formula`, and the worker threads |
| [`solvers/src/bin`](solvers/src/bin/periodic-tiling-modular.rs) | one binary per algorithm, named by its id, each with a `[[bin]]` entry in [`Cargo.toml`](../Cargo.toml) at the root |

```sh
cargo build --release
target/release/periodic-tiling-modular -r 10 -c 10 --torus
cargo test
```

`cargo test` runs the tests of every package of the workspace. [`harness/testRunner.js`](../harness/testRunner.js) runs the binaries in `target/release` (or `$CARGO_TARGET_DIR/release`) on the boards of [`spec/cases`](../spec/cases/README.md), and refuses a binary older than its own file in `solvers/src/bin` or a `.rs` file under `rust/` outside that directory, since cargo rebuilds only the binaries whose sources changed; `pnpm test` builds them first.
