# Benchmarks

[`harness/benchmarkRunner.js`](../harness/benchmarkRunner.js) runs every implementation of the solvers, in Rust, Python and JavaScript ([`spec/algorithms.json`](../spec/algorithms.json)), on the boards of [`spec/cases/`](../spec/cases/README.md) and writes one file per implementation and board to `results/<year-month>/`.

```sh
pnpm benchmark            # domino solvers: 1,000 runs up to 12 × 12, Formula 1,000 runs beyond, BigInt 10 runs up to 18 × 18 and 3 of 20 × 20
pnpm benchmark:domicule   # domicule solvers, 10 runs up to 20 × 20
pnpm benchmark:periodic   # king's graph tori, 10 runs up to 12 × 12 and 3 of 14 × 14; cylinders, 10 runs up to 16 × 16
pnpm benchmark:diagonal   # domicules by the number of diagonal pieces: 10 runs up to 18 × 18, Modular one run of 20 × 20
```

Each run starts a solver with `--time` ([`spec/contract.md`](../spec/contract.md)), so a result file holds two times per run: the time of the count, which the solver measures itself, and the time of the whole process, with the start of Node.js, Python or the binary. The first is what the site compares; the second shows what the start-up adds, which is most of the time on small boards. A file also gives the load average of the machine before the board ran, and a run checks every count it knows from `spec/cases/`.

A run writes `environment.json` (date, timing, commit, Node.js, Python and Rust versions, platform, CPU, cores, memory) next to the timings and refuses to mix machines, toolchains or kinds of timing in one month directory unless given `--force`. The [site](https://dawidrylko.github.io/lattice-dimers/#benchmark) shows the newest directory that holds the largest board of every implementation. The Rust binaries are built with `cargo build --release` and the Python package is installed with `pip install -e python` before a run.

The runs before November 2026 timed the JavaScript solvers as whole processes and have no time of the count. The runs of 2024 predate `environment.json`, and their files were written by hand: [`results/2024-03`](results/2024-03) records no machine, and [`results/2024-04`](results/2024-04) made 100,000 runs per board.
