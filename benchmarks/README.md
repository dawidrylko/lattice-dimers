# Benchmarks

One command measures everything, in one container with pinned Node.js, Python and Rust ([`Dockerfile`](Dockerfile)):

```sh
pnpm benchmark                           # every solver
pnpm benchmark domino-rectangle-bigint   # one solver, in every language
pnpm benchmark:compare <run directory> <run directory>
```

`pnpm benchmark` ([`harness/benchmarkContainer.js`](../harness/benchmarkContainer.js)) builds the image from the current commit and refuses uncommitted changes. It also refuses to start while the host load is above 2, unless given `--force-load`, and samples the host load every minute to `results/host-load-<commit>.txt`, because a container only sees the load of its own virtual machine.

Inside it, [`harness/benchmarkFull.js`](../harness/benchmarkFull.js) runs every implementation of every solver 10 times on each board up to 20 × 20, cheapest board first. It estimates a board from the one before: the last growth seen, but at least the growth of the state count. Boards of the largest solvers would take years, so `--board-budget-hours <hours>` caps one board in one language. A board whose 10 runs would exceed it is not started, and `plan.json` records it with its estimate. Without it the command starts every board. A board that runs out of memory or time is recorded there too; any other failure, such as a wrong count, stops the run and leaves it incomplete. A rerun of the same commit and toolchains resumes, so a higher budget only adds boards. A resume keeps its directory after a change of Docker's memory, and `--force` accepts another machine.

## Batches

A measurement can take days, so it can run in parts from the same commit. `pnpm benchmark <solver>` measures one solver, and `--stop-after-hours <hours>` starts no new board after that time. Stopping loses at most the board in progress, since a result file is written after its 10 runs. The next command continues in the same directory, and the run is complete once every board of every solver is measured or recorded in `plan.json`. A new commit starts a new directory, so keep a checkout at one commit for the whole measurement.

## Results

A run lives in `results/<commit>-node<version>-python<version>-rust<version>/`, so a comparison answers whether a change to the algorithms or an update of a toolchain improved anything or caused a regression. The site reads the newest run whose `environment.json` says `complete: true` and `dirty: false`.

Each result file holds two times per run. The time of the count is what the solver measures itself with `--time` ([`spec/contract.md`](../spec/contract.md)), and the site compares it. The process time adds the start of Node.js, Python or the binary. Modular solvers run with a fixed number of threads (`--jobs` of the command, 4 by default), since they would otherwise take it from the cores and memory of the machine.

## Instruction counts

`instructions.json` holds the instructions Cachegrind counts on one small board per implementation, three times with the median kept. Load barely moves them. On 2026-11-06 repeats were identical in Rust, differed by up to 2 % in Python without its first run, and by up to 12 % in JavaScript, whose JIT compiles in the background; wall times of the same solvers differed by up to 99 %. They are the signal for regressions in Rust and Python, and a weak one in JavaScript. They need the same image and architecture to compare, they run threads one at a time and do not model caches, so wall times remain the measure of real speed.

## Wall times

Wall times compare only on the same machine. Measured on an Apple M4 on 2026-11-06, the container does not isolate a run from the host: medians rose 44 to 79 % under a 10-core load. Close other work before a run, keep the machine on power and give Docker enough memory, since a board that does not fit is recorded as failed. [`measureVariance.js`](measureVariance.js) repeats a few boards to show the noise of a machine.

`--torus` and `--cylinder` of [`harness/benchmarkRunner.js`](../harness/benchmarkRunner.js) count the king's graph unless `--lattice square` (or `triangular`) names another lattice; the lattice is part of the name of every result file of these groups. `pnpm start` runs a few boards outside the container and never replaces a complete run.

## Runs before this setup

The `results/<year-month>` directories predate the container and were measured on a machine doing other work.

The run of November 2026 shared the machine with other work, and its load averages show where: before the 14 × 14 tori they were 11 to 19 on 10 cores. Later on the same day, on the same machine and toolchains and also under load, the square lattice, the Rust and Python domicule timings and a new JavaScript Modular domicule run joined it at commit `0b26c25`. The domino squares up to 12 × 12, and the Formula solver in Rust, Python and JavaScript up to 20 × 20, then ran again with 10 runs each at `83d6b43`, with load averages of 7 to 10. The domino BigInt solver in Rust, Python and JavaScript then ran 10 times on every square up to 20 × 20 at `2e408a6`, with load averages of 2 to 5, the domicule BigInt solver in the same way at `7410247`, with load averages of 3 to 16, and the domino Number solver in Rust, Python and JavaScript 10 times on every square up to 10 × 10 at `fce2e23`, with load averages of 19 to 20, and the domicule diagonal BigInt solver in Rust, Python and JavaScript 10 times on every square up to 12 × 12 at `a78f97b`, with load averages of 17 to 18, and the cylinder and torus BigInt solver in Rust, Python and JavaScript 10 times on the king's graph tori up to 10 × 10 and on the cylinders and square lattice tori up to 12 × 12 at `98f5577`, with load averages of 5 to 25. The domicule diagonal Modular solver in Rust, Python and JavaScript then ran 10 times on every square up to 18 × 18 and once on 20 × 20 at `238e190`, which `environment.json` now names, with load averages of 3 to 28. Every other file of the month was measured at `9d96ff9`, and the solvers did not change between these commits in a way that touches their times. The runs before it timed the JavaScript solvers as whole processes and have no time of the count. The language icons on the site are the Rust, Python and JavaScript marks of [simple-icons](https://simpleicons.org) 16.34.0, under CC0 1.0. The runs of 2024 predate `environment.json`, and their files were written by hand: [`results/2024-03`](results/2024-03) records no machine, and [`results/2024-04`](results/2024-04) made 100,000 runs per board.
