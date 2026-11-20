# Benchmarks

One command measures every solver on the square lattice, the triangular lattice and the king's graph, in one container with pinned Node.js, Python and Rust ([`Dockerfile`](Dockerfile)). The triangular lattice joined the full run after the run of 2026-11-16, so that run has no time of it.

```sh
pnpm -C js benchmark                           # every solver
pnpm -C js benchmark domino-rectangle-bigint   # one solver, in every language
pnpm -C js benchmark:compare <run directory> <run directory>
```

`pnpm -C js benchmark` ([`container.js`](container.js)) builds the image from the current commit and refuses uncommitted changes. It also refuses to start while the host load is above 2, unless given `--force-load`, and samples the host load every minute to `results/host-load-<commit>.txt`, because a container only sees the load of its own virtual machine.

Inside it, [`full.js`](full.js) runs every implementation of every solver 10 times on each board up to 20 × 20 of the square lattice, the triangular lattice and the king's graph, cheapest board first. It estimates a board from the one before: the last growth seen, but at least the growth of the state count, or, on the triangular lattice, the largest growth between two boards measured for its series on 2026-11-20. Boards of the largest solvers would take years, so `--board-budget-hours <hours>` caps one board in one language. A board whose 10 runs would exceed it is not started, and `plan.json` records it with its estimate. Without it the command starts every board. A board that runs out of memory or time is recorded there too; any other failure, such as a wrong count, stops the run and leaves it incomplete. A rerun of the same commit and toolchains resumes, so a higher budget only adds boards. A resume keeps its directory after a change of Docker's memory, and `--force` accepts another machine.

## Batches

A measurement can take days, so it can run in parts from the same commit. `pnpm -C js benchmark <solver>` measures one solver, and `--stop-after-hours <hours>` starts no new board after that time. Stopping loses at most the board in progress, since a result file is written after its 10 runs. The next command continues in the same directory, and the run is complete once every board of every solver is measured or recorded in `plan.json`. A new commit starts a new directory, so keep a checkout at one commit for the whole measurement.

## Results

A run lives in `results/<commit>-node<version>-python<version>-rust<version>/`, so a comparison answers whether a change to the algorithms or an update of a toolchain improved anything or caused a regression. The site reads the newest run whose `environment.json` says `complete: true` and `dirty: false`. Every table of the Benchmarks tab lists every square board from 0 × 0 to 20 × 20, while the notebooks show only the boards the run measured. Where a solver has no time, the cell shows a dash. Its tooltip gives the reason `plan.json` records, says that the run predates the 0 × 0 board or did not reach the board, or, on the triangular lattice, that no run has measured it yet.

Each result file holds two times per run. The time of the count is what the solver measures itself with `--time` ([`spec/contract.md`](../spec/contract.md)), and the site compares it. The process time adds the start of Node.js, Python or the binary. Modular solvers and the Pfaffian solver run with a fixed number of threads (`--jobs` of the command, 4 by default), since they would otherwise take it from the cores and memory of the machine.

## Instruction counts

`instructions.json` holds the instructions Cachegrind counts on one small board per implementation, three times with the median kept. Load barely moves them. On 2026-11-06 repeats were identical in Rust, differed by up to 2 % in Python without its first run, and by up to 12 % in JavaScript, whose JIT compiles in the background; wall times of the same solvers differed by up to 99 %. They are the signal for regressions in Rust and Python, and a weak one in JavaScript. They need the same image and architecture to compare, they run threads one at a time and do not model caches, so wall times remain the measure of real speed.

## Wall times

Wall times compare only on the same machine. Measured on an Apple M4 on 2026-11-06, the container does not isolate a run from the host: medians rose 44 to 79 % under a 10-core load. Close other work before a run, keep the machine on power and give Docker enough memory, since a board that does not fit is recorded as failed. `pnpm -C js benchmark:noise` shows how much noise is left on a machine: it builds the image and measures the same code twice ([`measureVariance.js`](measureVariance.js), 30 rounds each, about 30 minutes, in random order, the Modular boards with 4 threads). It prints the difference of the medians and the variation of each board. They are one sample of the noise, so take the largest as the floor: a smaller change between two runs is no evidence of a regression. The results stay in `results/noise-<commit>/`, outside git.

`--torus` and `--cylinder` of [`runner.js`](runner.js) count the king's graph unless `--lattice square` (or `triangular`) names another lattice; the lattice is part of the name of every result file of these groups. With `--lattice triangular`, `--rectangle` measures `any-lattice-rectangle-*`, and `--diagonal`, `--diagonal-cylinder` and `--diagonal-torus` measure `any-lattice-rectangle-polynomial-*` and `any-lattice-cylinder-torus-polynomial-*`; their result files end in `-triangular-rectangle`, `-triangular-cylinder` or `-triangular-torus`. The king's graph and the square lattice have solvers of their own for these boards, so the full run measures the `any-lattice-rectangle-*` and `any-lattice-*-polynomial-*` solvers on the triangular lattice only. `pnpm -C js start` runs a few boards outside the container and never replaces a complete run.

## The triangular lattice in the full run

The full run has 42 series of the triangular lattice, 14 per language: the rectangles with `any-lattice-rectangle-*`, the cylinders and the tori with `any-lattice-cylinder-torus-*`, the Pfaffian solver included, and the three surfaces by diagonal pieces with the `polynomial` solvers. No run has measured them yet, so the six tables of the triangular lattice on the site show dashes until one does.

On 2026-11-20 each series was run once per board on an Apple M4, outside the container and with other programs open, with 4 threads for the Modular and Pfaffian solvers, up to the first board above 6 seconds. From these times and the estimates of `full.js`, a run with `--board-budget-hours 2` measures about 400 of the 462 new boards and takes 14 to 18 hours longer. The lower figure prices a board that was not timed at the last growth seen in its series, but at least 4.4 times the board before; the higher prices it at the growth floor of its series and splits into about 6 hours in Rust, 5 in Python and 7 in JavaScript. The same times gave the growth floors of the triangular lattice in `full.js`.

## Preparing a Mac

Wall times need a machine with nothing else to do, and cutting the network alone does not give that:

1. Give Docker about 12 GB of memory in the settings of Docker Desktop.
2. Close every other program, agent sessions included.
3. Connect the power supply and turn off Low Power Mode. Keep the lid of a laptop open: a closed lid can put it to sleep.
4. Pause Time Machine and turn off Spotlight indexing with `sudo mdutil -a -i off`; `sudo mdutil -a -i on` restores it after the run.
5. Wait until `uptime` shows a load below 1.
6. Run `pnpm -C js benchmark:noise` alone, then `pnpm -C js benchmark <solver>` for each solver, never both at once and all from one commit.

macOS can still start its own background work on an idle machine, which is why the host load is recorded with the results.

## A Linux machine later

This setup is a stopgap. The final environment will be a dedicated Linux machine with fixed frequency and isolated cores, which a Mac cannot offer. At current hardware prices that part of the experiment is postponed.

## The run of 2026-11-16

[`results/9c2c0e92a821-node26.11.1-python3.14.5-rust1.99.1`](results/9c2c0e92a821-node26.11.1-python3.14.5-rust1.99.1) ran with `--board-budget-hours 2` and 4 threads on an Apple M4 with 16 GB, with Docker at 5 cores and 12 GB. Started on 2026-11-15 and finished on 2026-11-16, it measured 532 boards, the 0 × 0 boards included, in 27.1 hours of solver time and 27.9 hours on the clock, the build of the image included.

Its `plan.json` records 95 more boards. Of these, 84 are over the budget. The other 11 failed, all of them in four JavaScript BigInt series that hit the default heap limit of Node.js, about 2 GB, which is not the memory of the machine: `domicule-rectangle-polynomial-bigint` from 18 × 18, the cylinders of `domicule-cylinder-torus-polynomial-bigint` from 14 × 14, and the cylinders of `any-lattice-cylinder-torus-bigint` on the king's graph from 14 × 14 and on the square lattice at 20 × 20. A failure closes the larger boards of its series, so some of them never started.

It replaces the run of 2026-11-07 from `ee071e5`, which had the same toolchains. On the 171 boards both runs measured with a median above 100 ms, the median of the ratio of the new median to the old one is 0.995, and 80 % of the ratios lie between 0.876 and 1.010. The largest gains are in the rectangle solvers, which got narrower tables and a new thread cap: Rust `domicule-rectangle-polynomial-modular` on 20 × 20 takes 0.54 of its former time, JavaScript `domicule-rectangle-bigint` 0.66 to 0.74 on 14 × 14, 18 × 18 and 20 × 20, and Rust `domicule-rectangle-modular` 0.74 to 0.77 from 16 × 16. Besides the 0 × 0 boards, the new run measured three boards the old one had not: JavaScript `domicule-rectangle-polynomial-modular` on 20 × 20, whose runs had passed the time limit, and the 14 × 14 cylinder of `domicule-cylinder-torus-polynomial-bigint` in Rust and Python, which the old run had left out as over its own budget of 0.25 hours. It lost one, the 18 × 18 cylinder of Python `domicule-cylinder-torus-polynomial-modular`, whose 10 runs were estimated at 2.31 hours.

The noise measured right before the run gave a largest difference of medians of 0.8 % and a largest variation of 3.55 %; `results/noise-*` stays outside git. With no container running, the host load read 1.9 to 2.2 before each solver, never the load below 1 that the steps above ask for, and during the runs it read 1.5 to 7.5 in the host load file. Spotlight was off and the automatic backups of Time Machine were paused for the whole run.

The language icons on the site are the Rust, Python and JavaScript marks of [simple-icons](https://simpleicons.org) 16.34.0, under CC0 1.0.
