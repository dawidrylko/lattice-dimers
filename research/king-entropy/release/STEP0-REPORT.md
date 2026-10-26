# Step 0 rerun report

Driver: `release/step0-rerun.sh`, branch `d/king-entropy-step0`.

## Machine

- `uname -m`: x86_64
- `nproc`: 4
- `free -g`: 15 GiB total, no swap
- Python 3.13.14, numpy 2.5.3, `np.finfo(np.longdouble).nmant` = 63
- `/tmp`: ext4 on `/dev/vda` (not tmpfs). `findmnt -no FSTYPE,SIZE -T /tmp`: `ext4 252G`. `df -h /tmp .`: `/dev/vda 252G 14G 26G 35% /` for both. `RW_DISK` was not set.

## Run

- Start: 2026-10-25T17:46:04Z (first job). End: 2026-10-26T18:13:57Z.
- Twelve runs at `DEADLINE=3000` under a 2 h limit. The 12th was killed while `runweight_24` was still running (started 2026-10-26T05:53:41Z). The job was then run again alone under a 5 h limit, and finally the remaining 16 jobs were run with `DEADLINE=0`.
- `logs/step0-progress.txt`: 144 `ok` lines, no `FAILED` lines.
- `runweight_24`, last line of `logs/time_runweight_3state_w24.txt`: `# exit=0 wall=5936.8s user=3858.6s maxrss=13634MiB`

## Diff

`git diff --stat origin/master -- research/king-entropy`, last line (before this report):

    204 files changed, 2052 insertions(+), 1692 deletions(-)
