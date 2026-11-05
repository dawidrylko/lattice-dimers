# Benchmarks

[`harness/benchmarkRunner.js`](../harness/benchmarkRunner.js) runs every implementation of the solvers, in Rust, Python and JavaScript ([`spec/algorithms.json`](../spec/algorithms.json)), on the boards of [`spec/cases/`](../spec/cases/README.md) and writes one file per implementation and board to `results/<year-month>/`.

```sh
pnpm benchmark            # domino solvers: 10 runs of every board, up to 10 × 10 for Number and 20 × 20 for Formula and BigInt
pnpm benchmark:domicule   # domicule solvers, 10 runs up to 20 × 20
pnpm benchmark:periodic   # king's graph tori, 10 runs up to 10 × 10, Modular 10 runs of 12 × 12 and 3 of 14 × 14; cylinders, 10 runs up to 16 × 16; then the same surfaces on the square lattice (dominoes): tori, 10 runs up to 12 × 12 and Modular 3 of 14 × 14, cylinders, 10 runs up to 16 × 16
pnpm benchmark:diagonal   # domicules by the number of diagonal pieces: 10 runs up to 18 × 18, Modular one run of 20 × 20
pnpm benchmark:all        # every group above, cylinders and tori first, after cargo build --release, plus one BigInt run of the 12 × 12 torus
```

`pnpm benchmark:all` takes hours. It is meant for an idle machine, with nothing else running, so that the load averages in the files stay low.

`--torus` and `--cylinder` count the king's graph unless `--lattice square` (or `triangular`) names another lattice; the lattice is part of the name of every result file of these groups.

Each run starts a solver with `--time` ([`spec/contract.md`](../spec/contract.md)). A result file thus holds two times per run. The time of the count is what the solver measures itself, and the site compares it. The process time adds the start of Node.js, Python or the binary, which is most of the time on small boards. A file also gives the load average of the machine before the board ran. A run stops at any count that differs from `spec/cases/` where that holds the board.

A run writes `environment.json` next to the timings: date, timing, commit, whether the code differed from it, Node.js, Python and Rust versions, platform, CPU, cores and memory. The Rust version is that of the `rustc` on `PATH`, and a run of a Rust or Python implementation stops when it cannot read it. A run refuses to mix machines, toolchains or kinds of timing in one month directory unless given `--force`. The [site](https://dawidrylko.github.io/lattice-dimers/#benchmark) shows the newest directory that holds the largest board of every implementation. The Rust binaries are built with `cargo build --release` and the Python package is installed with `pip install -e python` before a run.

The run of November 2026 shared the machine with other work, and its load averages show where: before the 14 × 14 tori they were 11 to 19 on 10 cores. Later on the same day, on the same machine and toolchains and also under load, the square lattice, the Rust and Python domicule timings and a new JavaScript Modular domicule run joined it at commit `0b26c25`. The domino squares up to 12 × 12, and the Formula solver in Rust, Python and JavaScript up to 20 × 20, then ran again with 10 runs each at `83d6b43`, with load averages of 7 to 10, and BigInt 10 times on the 20 × 20 board at `cf814b1`, which `environment.json` now names, starting at a load average of 11; every other file of the month was measured at `9d96ff9`, and the solvers did not change between these commits in a way that touches their times. The runs before it timed the JavaScript solvers as whole processes and have no time of the count. The language icons on the site are the Rust, Python and JavaScript marks of [simple-icons](https://simpleicons.org) 16.34.0, under CC0 1.0. The runs of 2024 predate `environment.json`, and their files were written by hand: [`results/2024-03`](results/2024-03) records no machine, and [`results/2024-04`](results/2024-04) made 100,000 runs per board.
