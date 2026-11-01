# Benchmarks

[`benchmarkRunner.js`](benchmarkRunner.js) times the solvers in [`src/solvers`](../src/README.md) on the boards of [`data/`](../data/README.md) and writes one file per solver and board to `results/<year-month>/`.

```sh
pnpm benchmark            # domino solvers
pnpm benchmark:domicule   # domicule solvers, 10 runs up to 16 × 16 and one run of 18 × 18 and 20 × 20
pnpm benchmark:periodic   # king's graph tori up to 14 × 14 and cylinders up to 16 × 16
pnpm benchmark:diagonal   # domicules by the number of diagonal pieces, 10 runs up to 16 × 16 and one run of 18 × 18 and 20 × 20
```

A run writes `environment.json` (date, Node.js version, platform, CPU, cores, memory) next to the timings and refuses to mix machines or Node.js versions in one month directory unless given `--force`. The [site](https://dawidrylko.github.io/lattice-dimers/#benchmark) shows the newest directory that holds the largest board of every solver.

The runs of 2024 predate `environment.json`, and their files were written by hand: [`results/2024-03`](results/2024-03) records no machine, and [`results/2024-04`](results/2024-04) made 100,000 runs per board.
