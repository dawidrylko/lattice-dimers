# Benchmarks

One command measures everything, in one container with pinned Node.js, Python and Rust ([`Dockerfile`](Dockerfile)):

```sh
pnpm benchmark --budget-hours 24
pnpm benchmark:compare <run directory> <run directory>
```

`pnpm benchmark` ([`harness/benchmarkContainer.js`](../harness/benchmarkContainer.js)) builds the image from the current commit and refuses uncommitted changes. It also refuses to start while the host load is above 2, unless given `--force-load`, and samples the host load every minute to `results/host-load-<commit>.txt`, because a container only sees the load of its own virtual machine.

Inside it, [`harness/benchmarkFull.js`](../harness/benchmarkFull.js) runs every implementation of every solver 10 times on each board up to 20 × 20, cheapest board first. It estimates a board from the one before: the last growth seen, but at least the growth of the state count. A board whose 10 runs would exceed the budget is not started; `plan.json` records it with its estimate, and so does a board that runs out of memory. A rerun of the same commit and toolchains resumes, so a higher budget only adds boards.

## Results

A run lives in `results/<commit>-node<version>-python<version>-rust<version>/`, so a comparison answers whether a change to the algorithms or an update of a toolchain improved anything or caused a regression. The site reads the newest run whose `environment.json` says `complete: true` and `dirty: false`.

Each result file holds two times per run. The time of the count is what the solver measures itself with `--time` ([`spec/contract.md`](../spec/contract.md)), and the site compares it. The process time adds the start of Node.js, Python or the binary. Modular solvers run with a fixed number of threads (`--jobs`, 4 by default), since they would otherwise take it from the cores and memory of the machine.

## Instruction counts

`instructions.json` holds the instructions Cachegrind counts on one small board per implementation, three times with the median kept. Load barely moves them. On 2026-11-06 repeats were identical in Rust, differed by up to 2 % in Python without its first run, and by up to 12 % in JavaScript, whose JIT compiles in the background; wall times of the same solvers differed by up to 99 %. They are the signal for regressions in Rust and Python, and a weak one in JavaScript. They need the same image and architecture to compare, they run threads one at a time and do not model caches, so wall times remain the measure of real speed.

## Wall times

Wall times compare only on the same machine. Measured on an Apple M4 on 2026-11-06, the container does not isolate a run from the host: medians rose 44 to 79 % under a 10-core load. Close other work before a run, keep the machine on power and give Docker enough memory, since a board that does not fit is recorded as failed. [`measureVariance.js`](measureVariance.js) repeats a few boards to show the noise of a machine.

`--torus` and `--cylinder` of [`harness/benchmarkRunner.js`](../harness/benchmarkRunner.js) count the king's graph unless `--lattice square` (or `triangular`) names another lattice; the lattice is part of the name of every result file of these groups. `pnpm start` runs a few boards outside the container and never replaces a complete run.
