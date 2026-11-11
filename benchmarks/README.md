# Benchmarks

One command measures everything, in one container with pinned Node.js, Python and Rust ([`Dockerfile`](Dockerfile)):

```sh
pnpm -C js benchmark                           # every solver
pnpm -C js benchmark domino-rectangle-bigint   # one solver, in every language
pnpm -C js benchmark:compare <run directory> <run directory>
```

`pnpm -C js benchmark` ([`container.js`](container.js)) builds the image from the current commit and refuses uncommitted changes. It also refuses to start while the host load is above 2, unless given `--force-load`, and samples the host load every minute to `results/host-load-<commit>.txt`, because a container only sees the load of its own virtual machine.

Inside it, [`full.js`](full.js) runs every implementation of every solver 10 times on each board up to 20 × 20, cheapest board first. It estimates a board from the one before: the last growth seen, but at least the growth of the state count. Boards of the largest solvers would take years, so `--board-budget-hours <hours>` caps one board in one language. A board whose 10 runs would exceed it is not started, and `plan.json` records it with its estimate. Without it the command starts every board. A board that runs out of memory or time is recorded there too; any other failure, such as a wrong count, stops the run and leaves it incomplete. A rerun of the same commit and toolchains resumes, so a higher budget only adds boards. A resume keeps its directory after a change of Docker's memory, and `--force` accepts another machine.

## Batches

A measurement can take days, so it can run in parts from the same commit. `pnpm -C js benchmark <solver>` measures one solver, and `--stop-after-hours <hours>` starts no new board after that time. Stopping loses at most the board in progress, since a result file is written after its 10 runs. The next command continues in the same directory, and the run is complete once every board of every solver is measured or recorded in `plan.json`. A new commit starts a new directory, so keep a checkout at one commit for the whole measurement.

## Results

A run lives in `results/<commit>-node<version>-python<version>-rust<version>/`, so a comparison answers whether a change to the algorithms or an update of a toolchain improved anything or caused a regression. The site reads the newest run whose `environment.json` says `complete: true` and `dirty: false`.

Each result file holds two times per run. The time of the count is what the solver measures itself with `--time` ([`spec/contract.md`](../spec/contract.md)), and the site compares it. The process time adds the start of Node.js, Python or the binary. Modular solvers run with a fixed number of threads (`--jobs` of the command, 4 by default), since they would otherwise take it from the cores and memory of the machine.

## Instruction counts

`instructions.json` holds the instructions Cachegrind counts on one small board per implementation, three times with the median kept. Load barely moves them. On 2026-11-06 repeats were identical in Rust, differed by up to 2 % in Python without its first run, and by up to 12 % in JavaScript, whose JIT compiles in the background; wall times of the same solvers differed by up to 99 %. They are the signal for regressions in Rust and Python, and a weak one in JavaScript. They need the same image and architecture to compare, they run threads one at a time and do not model caches, so wall times remain the measure of real speed.

## Wall times

Wall times compare only on the same machine. Measured on an Apple M4 on 2026-11-06, the container does not isolate a run from the host: medians rose 44 to 79 % under a 10-core load. Close other work before a run, keep the machine on power and give Docker enough memory, since a board that does not fit is recorded as failed. `pnpm -C js benchmark:noise` shows how much noise is left on a machine: it builds the image and measures the same code twice ([`measureVariance.js`](measureVariance.js), 30 rounds each, about 30 minutes, in random order, the Modular boards with 4 threads). It prints the difference of the medians and the variation of each board. They are one sample of the noise, so take the largest as the floor: a smaller change between two runs is no evidence of a regression. The results stay in `results/noise-<commit>/`, outside git.

`--torus` and `--cylinder` of [`runner.js`](runner.js) count the king's graph unless `--lattice square` (or `triangular`) names another lattice; the lattice is part of the name of every result file of these groups. `pnpm -C js start` runs a few boards outside the container and never replaces a complete run.

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

## The run of 2026-11-07

[`results/ee071e57836d-node26.11.1-python3.14.5-rust1.99.1`](results/ee071e57836d-node26.11.1-python3.14.5-rust1.99.1) ran with `--board-budget-hours 1` and 4 threads on an Apple M4 with 16 GB, with Docker at 5 cores and 12 GB. It measured 413 boards in 12 hours of solver time. Resumed from the same commit with `--board-budget-hours 2` on 2026-11-07, it added 3 square torus boards in 7 more hours: Modular 16 × 16 in Python and JavaScript, and BigInt 14 × 14 in Python. The two Modular boards took longer than their estimates, the Python one 3.6 hours against 1.8, and the BigInt board took 1.3 hours against 1.4.

Its `plan.json` records the other 55 boards. Of these, 47 are over the budget. The other 8 failed. In 7 of them, three JavaScript BigInt series hit the default heap limit of Node.js, about 2 GB, which is not the memory of the machine, and the 4 larger boards after those three failures never started. The resumed run tried those three again, and they hit the same limit. The eighth, JavaScript `domicule-rectangle-polynomial-modular` 20 × 20, exceeded the time limit of one run, 24 minutes at this budget.

This run predates the rename of 2026-11-08, so its files and `plan.json` keep the former ids `diagonal-pieces-*` and `diagonal_pieces_*`. The site and `pnpm -C js benchmark:compare` read them under `domicule-rectangle-polynomial-*` through `FORMER_NAMES` in [`site/benchmarkRuns.js`](../site/benchmarkRuns.js), which can go once this run is replaced.

The cylinder and torus solvers by diagonal pieces, `domicule-cylinder-torus-polynomial-*`, came after this run. They are measured in a run of their own, `pnpm -C js benchmark domicule-cylinder-torus-polynomial-modular` and `pnpm -C js benchmark domicule-cylinder-torus-polynomial-bigint` from one commit, whose result files end in `-cylinder` or `-torus`. That run stays incomplete, since it leaves the other solvers out, so the site keeps this run for every other table and reads the newest clean run that measured these solvers for theirs (`findSeriesRun` in [`site/benchmarkRuns.js`](../site/benchmarkRuns.js)).

That run is [`results/df85625453d6-node26.11.1-python3.14.5-rust1.99.1`](results/df85625453d6-node26.11.1-python3.14.5-rust1.99.1), from 2026-11-08 and 2026-11-09 on the same Mac and container. The Modular solver ran without a board budget and was stopped by hand after the 18 × 18 cylinder and the 12 × 12 torus; the boards it had not reached are not in the run, and Rust on the 20 × 20 cylinder failed for memory. The BigInt solver ran with `--board-budget-hours 0.25` up to the 12 × 12 cylinder and the 10 × 10 torus, and `plan.json` records the larger boards as over budget.

The noise measured right before the run gave a largest difference of medians of 0.67 % and a largest variation of 3.67 %; `results/noise-*` stays outside git. With no container running, the host load read 1.5 to 2.1 before each solver, never the load below 1 that the steps above ask for, and during the runs it read 1.5 to 7.0 in the host load file. Spotlight was not turned off during the first part and was off during the resumed one. Time Machine was left as it was in both.

The language icons on the site are the Rust, Python and JavaScript marks of [simple-icons](https://simpleicons.org) 16.34.0, under CC0 1.0.
