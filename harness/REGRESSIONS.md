# Regressions

Every defect fixed in this repository, the check that fails if it comes back, and how that was shown. Each fix was undone in a scratch copy of the repository and the check was run on that copy: it failed, and it passes on the repository. "Undone as" names what was put back: the old lines, or the file from the fix's parent commit (`<commit>^`) where the fix replaced the file or its content. Checked on 1 November 2026; the runners and CI jobs are described in [README.md](README.md).

A new fix adds its row here with the check that guards it.

## Solvers and command line

| defect | fixed in | check that fails | undone as |
| --- | --- | --- | --- |
| the Python Formula solver failed to print a count of more than 4300 digits, which Rust and JavaScript print | `31284f3` | `pnpm test`, module test of `domino_tiling_formula.py` under a limit of 640 digits | no `sys.set_int_max_str_digits(0)` in `main` |
| the renderer refused the 0 × 0 board | `292965f` | `test:render`, command line `0x0` | `size > 0` in the size check |
| the Number solver refused the 0 × 0 board | `292965f` | `test`, Number solver on `0x0` | `size > 0` in `isValidSize` |
| the test data started at 1 × 2 instead of a(0) = 1 | `292965f` | `test`, data test "a(0)" | the 0 × 0 case removed |
| the Number test data held the float artifact 53060477521960020 for 12 × 12 | `292965f` | `test`, data test "Number count" | the old 12 × 12 case added back |
| `benchmarkRunner.js` ignored `-m` | `292965f` | `test`, benchmark surface tests | `-m` removed from the parser |
| a row was a mask of the column count, so 2 × 33 gave 0 | `9993875` | `test`, Number solver on 2 × 33 | rows along the given sides |
| the parser accepted `2abc` and `-2` | `9993875` | `test`, parser tests | `parseInt` |
| `testRunner.js -m abc` ran every test | `9993875` | `test`, rejection of `-m abc` | the `-m` check removed |
| `--random` on an odd board divided by zero | `63abcd4` | `test:render`, `3x3 --random` | the empty-board return removed |
| `-l 0` was accepted | `63abcd4` | `test:render`, `-l 0` | the limit check removed |
| a flag without a value gave `undefined` | `106bb36` | `test`, parser test for a missing value | the flag skipped when no value follows |
| integers beyond 2^53 were accepted | `106bb36` | `test`, parser test for 1e23 | `Number.isSafeInteger` removed |
| `-o abc` on a board without tilings passed | `106bb36` | `test:render`, `3x3 -o abc` | the empty board returned before `-o` was read |
| an odd board too large to count printed a range 1-0 | `106bb36` | `test:render`, `21x23` (new; 11 × 15 can be counted since `3d9cb08`) | the odd-board count of 0 removed |
| `--all` on 12 × 12 started writing 5.3e16 tilings | `1a1445b` | `test:render`, `8x8 --all` | the 100,000 cap removed |
| child processes ran the `node` on `PATH` | `1a1445b` | `test`, executor test | `node` instead of `process.execPath` |
| the renderer counted only boards up to 144 cells | `3d9cb08` | `test:render`, `2x100` | `rows × columns <= 144` |
| "1 tilings" | `3d9cb08` | `test:render`, `0x0` | always "tilings" |
| `-i` with `--random` and `--all` with `-l` were accepted | `3d9cb08` | `test:render`, the two `cannot be combined` cases | each check removed |
| no hint to swap `-r` and `-c` | `3d9cb08` | `test:render`, `2x30 -i 1` | the hint removed |
| the Number solver gave inexact counts above 2^53 silently | `3d9cb08` | `test`, precision warning on 12 × 12 | the warning removed |
| the size cap claimed "a row is stored as a 32-bit mask" | `3d9cb08` | `test`, rejection cases 3 and 4 (new) | the old message |
| the solver path resolved from the working directory | `3d9cb08` | `test`, executor test and directory test (new) | `path.join('src', 'solvers')` |
| the enumerator recursed once per domino and overflowed on 2 × 20000 | `0fd7e3d` | `test:render`, `2x20000` | `renderer/enumerator.js` from `0fd7e3d^` |
| counting 5 × 100000 crashed V8 | `0fd7e3d` | `test:render`, `2x100000` at 128 MB | the `try` around the count removed |
| `process.exit` after printing cut a piped result on macOS | `0fd7e3d` | `test`, exit test (new); job `macOS`, `test:render` `2x20000` | `process.exit(0)` after the last line; `process.exit(1)` for `process.exitCode = 1` in the renderer |
| a worker that exited without a result left exit code 0 and no output | `93f74fe` | `test`, rejection with `fixtures/exitingWorker.js` | the `exit` listener removed |
| the domicule BigInt solver accepted a shorter side of 30 | `93f74fe` | `test`, rejection of 30 × 30 | the cap raised to 30 |
| domicule styles changed the domino SVG | `106a9df` | `test:render`, domino output hash | diagonal styles in every sheet |
| no hint to turn a domicule board | `106a9df` | `test:render`, `2x20 --domicule` | the hint removed |
| usage lines named the paths before the move to `src/` | `4a11337` | `test`, usage tests (new) | `Usage: node domiculeTilingSolver-Modular.js` |
| the modular solver as a module had no worker count | `4a11337` | `test`, module tests (new) | the default of `jobs` removed |
| a bare argument named like an Object property, such as `constructor`, took the next argument as its value in `js/core/commandLineArgsParser.js` | #88 | `test`, parser test for a bare argument named like an Object property | `schema[currentArg]` in the flag check |
| a Rust binary left in `target/release` from older sources was run as the repository's code | #89 | `test`, executor test for a binary older than the `.rs` files under `rust/` (new) | the age check in `js/core/scriptExecutor.js` removed |
| the Python solver failed with a `TypeError` when `os.process_cpu_count()` gave `None`, on the command line and as a module without `jobs` | #89 | `test`, module test when the number of processors is unknown (new), which runs both | `or 1` removed from either default of `jobs`, each on its own |
| with two Rust binaries, an edit to the root of one in `rust/solvers/src/bin` made the executor refuse the other, which cargo does not rebuild for it | #92 | `test`, Rust source tests and the executor test for a binary older than only its own root (new) | `rustSourcesModifiedAt` taking every `.rs` file under `rust/` again (the source tests), or `fileName` passed for `resolve(fileName)` in `executeSolver` (the executor test) |

## Site

| defect | fixed in | check that fails | undone as |
| --- | --- | --- | --- |
| the domino rectangle table scrolled sideways at 721 to 739 px in Verdana, with the 12-digit count of 10 × 10 in full | `00ac79c` | `test:site`, benchmark table at 920 px | counts shortened from 13 digits |
| the domicule torus table scrolled 12 px sideways at 721 px in DejaVu Sans on CI, and the nine columns of the domino rectangle table up to 118 px at 721 to 919 px in Verdana | `fd3de8d` | `test:site`, benchmark table at 919 and 920 px | the 919 px media query back at 720 px |
| on a card the BigInt times of the domino rectangle table followed the Formula ones on the same line | `fd3de8d` | `test:site`, benchmark table at 375, 786 and 919 px | `#domino-benchmark td:nth-child(6)` removed |
| the highlight had a contrast of 3.61:1 on the dark sheet | `2581b18` | `test:site`, highlight contrast (new) | `--hit: #dc2626` in the dark palette |
| the highlight used a fixed colour | `2581b18` | `test:site`, sheet style switch | `#dc2626` instead of `var(--hit)` |
| a 49-digit count pushed the time columns off screen | `b485aa3` | `test:site`, benchmark table | `fmt` instead of `num` |
| missing times showed an em dash | `d09e393` | `test:site`, benchmark times (new) | `'—'` for a missing time |
| the benchmark did not turn into cards on narrow screens | `e75d200` | `test:site`, benchmark table at 375 px | the 919 px media query disabled |
| the pager worked before the 18 × 18 table was confirmed | `edb10cf` | `test:site`, diagonal filter confirmation, the table that still asks first since #79 replaced 18 × 18 by numbered samples | `locked = false` |
| the board picker and the sheet were wider than the page | `96b696f` | `test:site`, board picker, tiling sheets, and cylinders and tori at 375 px | `overflow-x: auto`; `max-width: none`; columns for a fixed width of 1040 px |
| benchmark headers too long for 786 px | `e23920e` | `test:site`, benchmark table, whose column names #80 pins | "(mean)" in every header |
| the domicule BigInt solver had no 18 × 18 and 20 × 20 timing | `8e8b177` | `test:site`, benchmark table | both files removed and the 20 × 20 requirement dropped |
| Random froze Safari by assigning `location.hash` | `08ebc4b` | `test:site`, random jump and back | `location.hash` in `go()` and in the tab links |
| an invalid page entry stayed in the field | `08ebc4b` | `test:site`, random jump and back | `go()` returns without updating the controls |
| the highlight did not find a shortened long number | `08ebc4b` | `test:site`, long tiling numbers | `textContent` instead of `data-label` |
| a label with `<&>` broke the SVG | `08ebc4b` | `test:render`, short label (new) and label width | `escapeXml` removed from the short and from the long label |
| code or math in a link label left an unresolved token | `4a11337` | `site:build` stops | the label rendered with its own tokens |
| KaTeX loaded without subresource integrity | `4a11337` | `test:site`, subresource integrity (new) | `integrity` removed |
| the noscript link pointed at a path that no longer exists | `4a11337` | `test:site`, links into the repository (new) | `tree/master/benchmark` |
| the site build read its files from the working directory | `3d9cb08` | CI builds the site from `$RUNNER_TEMP` (new) | scripts read by relative path |
| note pages were narrower than the main page | `4a11337` | `test:site`, shared header and footer | `max-width: 760px` |
| the chain length on the page was a literal | `106a9df` | `test:site`, text read from the code and the data (new) | "5,000" in the template with 4,000 sweeps in the code |
| a partial newer benchmark month replaced the full table | `96ece59` | `test`, benchmark run test (new) of `site/benchmarkRuns.js`, the only place the build gets its run from | the newest run instead of the newest complete one |
| the glued edge had the colour of the blue pieces | `a2f03dd` | `test:site`, glued-edge colours (new) | `--seam: #4f7cac`, the colour before the fix |
| the notebook drawings labelled their tilings at 5.4 px on a 375 px phone | #85 | `test:site`, notes, label size (new) | a build of `bf5b7fd`, the base of #85 |
| the notebook drawings had no accessible name | #85 | `test:site`, notes, drawing names (new) | a build of `bf5b7fd` |
| the notebook drawings stayed white in dark mode and greyed their pieces off the dark palette | #85 | `test:site`, notes, dark sheet and `--mute` (new) | a build of `bf5b7fd` |
| a notebook tile painted its background over the seam of the tile beside it | #85 | `test:site`, notes, covering tile background (new) | `.tiling .sheet .bg { fill: none; }` removed |
| the gallery named a rectangle sheet a board | #85 | `test:site`, tiling sheets, surface in the sheet name | a build of `bf5b7fd` |
| the front-page tilings were not square | `f3b5023` | `test:render`, sheet without labels and readme images | `svg.js` and `readme-images.js` from `f3b5023^` |
| a tab link in the intro of the main page navigated to its fragment, so it dropped the board the gallery showed | #101 | `test:site`, main page | `#intro-sections` taken out of the tab click handler in a built copy |

## Benchmarks

| defect | fixed in | check that fails | undone as |
| --- | --- | --- | --- |
| a run overwrote a month measured on another machine | `3d9cb08` | `test`, benchmark guard test | `checkDirectory` removed |
| `-o` past every case wrote `environment.json` first | `8298d43` | `test`, empty selection test (new) | the environment saved before the check |

## OEIS, Markdown and metadata

| defect | fixed in | check that fails | undone as |
| --- | --- | --- | --- |
| the examples of the README used 10 × 10 and 20 × 20 boards while the gallery opens on 8 × 8 | #101 | `test:metadata`, the board of the README examples | the README from before #101 |
| `\operatorname`, math in link text and `..` ranges in the OEIS READMEs | `b2eb8b7` | `test:markdown`, the three math checks | the READMEs from `b2eb8b7^` |
| relative links to `../pari/` after the move to `oeis/` | `b4e82fe` | `test:markdown`, relative links | a link to `../pari/A004003.gp` |
| `A401670.gp` defined a(n) differently from the entry | `eb30025` | `test:oeis`, `A401670.gp` | the file from `eb30025^` |
| `CITATION.cff` and `package.json` described an older repository | `310a1a2` | `test:metadata` | both files from `310a1a2^` |
| `package.json` could be published to npm | `1a1445b` | `test:metadata`, private (new) | `"private": true` removed |
| links to OEIS entries came in three forms | `f3b5023` | `test:markdown`, links to OEIS entries; `test:oeis`, the table | the old form `OEIS [A401670](../oeis/A401670/README.md)` in a note; `oeis/README.md` from `f3b5023^` |

## Research scripts

| defect | fixed in | check that fails | undone as |
| --- | --- | --- | --- |
| certified bounds lost their trailing zeros | `214b4b6` | `src/test_regressions.py` (new) | `mp.nstr` in `down` and `up` |
| `lean.py` ran with a 52-bit `np.longdouble` | `6ef3190` | `src/test_regressions.py` (new); also `lcert.py` | the assert of `lean.py` removed; the same for `lcert.py` |
| `bfile_check.py` assumed 1035 terms | `7b728c5` (#67) | `src/test_regressions.py` (new), which reads the expected length from the b-file | 45 antidiagonals instead of the length of the file |
| a local `P` shadowed `paths.P` in `zexact.py` | `9ddb2fb` (#33) | `src/test_paths.py` | `Z, P = zexact(...)` |
| `zexact.py` read the commit from the working directory | `9ddb2fb` (#33) | `src/test_paths.py` | `cwd=ROOT` removed |
| `e0_spectrum` inverted a singular eigenbasis | `9ddb2fb` (#33) | rerun of `src/lspec.py` in `Research` and `macOS` (new) | the restriction to the reachable states removed |
| `timed.py` printed KiB as MiB on macOS | `db0e7c8` (#59) | job `macOS`, `src/test_timed.py` (new) | `ru_maxrss / 1024` |
| the hidden-mode amplitudes were those whose rms stayed within 3 times the best fit, which left out B = 0 | `c4d74c2` | rerun of `src/errbar.py` (new) | the allowed range from that rule; the widening of today's range to B = 0 changes nothing while the range from the window w = 11 reaches below 0, so that line alone is not guarded |
| the hidden-mode term came from one fit window | `29efdc1` | rerun of `src/errbar.py` (new) | the range from the window w = 13..25 alone |
| `out/out_ltest.txt` predated the 24 × 24 counts | `f3deaa6` | rerun of `src/ltest.py` (new) | the output from `f3deaa6^` |
| float64 values compared through their decimal repr; median m printed with 6 digits | `9f9e989` | reruns of `replication/compare_eig.py` and `analyze_eig.py` (new) | `mpf(repr(val))` for the sector values; `nstr(m_gap, 6)`. The same change for `log_lambda` and for the bound values changes no output today, so those lines alone are not guarded |

## Limits of the checks, fixed here

| limit | check | shown by |
| --- | --- | --- |
| `git ls-files` failing outside a repository gave zero files and a pass | `test:markdown`, `test:oeis` | the runners in a copy without `.git` |
| reference-style links (`[A401670][a]`) were not read | `test:markdown`, links to OEIS entries, relative links, math in link text | a wrong reference link passes the old runner and fails the new one |
| a link to a draft's b-file (`oeis.org/A401670/b401670.txt`) counted as a link to the draft's page | `test:oeis`, links to approved entries and drafts | the old runner rejects it, the new one accepts it |
| the PARI comparison dropped spaces and split at `;` inside strings | `test:oeis`, `A<n>.gp` | `print1("a b")` in the entry against `print1("ab")` in the program |
| a copy of a constant was matched by its first 5 characters | `test:numbers`, summary files | 0.5755119110413253 for s in `.zenodo.json`: the old runner passes, the new one names every constant within 10% |

## Not guarded by CI

| fix | fixed in | why |
| --- | --- | --- |
| prose and bibliography of the king-entropy papers and notes: cited claims, numbers in the text, captions | `c45900a`, `5a572c7`, #36, #38, `dbe46b9`, `6780304`, `627d6b3`, #42, `ac8d3a7`, `0af7a6f`, `98d4ea5`, #46 to #50, #52 | the owner's ruling of 1 November 2026: no test |
| text of the release runbook `release/ZENODO.md` | #53, #54, `b100682`, `f61dafb`, `337eac7`, `5f1de97`, `16d3a6c` | instructions for a manual release, with no behaviour to test |
| README sentences about timings, archives and the build | `aff3cd4`, `1a1445b`, `8298d43`, `757bcd0`, `d26a943`, `b31a81a` | the README was rewritten in #72 and these sentences are gone |
| benchmark links with forward slashes on Windows | `96ece59` | the defect exists only on Windows; CI runs on Linux and macOS |

## Superseded

| fix | fixed in | reversed by |
| --- | --- | --- |
| the Pages workflow ran `pnpm test` and the layout test before deploying | `1a1445b`, `3d9cb08` | #29, which tests pull requests only and deploys without retesting |
| a page title of at most 62 characters | `d09e393` | `0bc02b5`, which leads the title with the king-entropy research (103 characters) |
