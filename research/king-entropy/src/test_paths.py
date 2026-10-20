"""Smoke test of the file layout: every script that writes JSON, on the smallest inputs, run from a
foreign working directory in a temporary copy, must write its file where src/paths.py says.

usage: python3 src/test_paths.py      (a few seconds; exit status 1 if any check fails)
"""
import os, shutil, subprocess, sys, tempfile
from paths import ROOT, P

RUNS = [
    ('tm2.py king cyl 3 4', 'sec_king_cyl_3_4.json'),
    ('cylw.py king cyl 4 0', 'eig_king_cyl_w4_p0.json'),
    ('lean.py king free 4 - float64', 'lean_king_free_w4_p-_float64.json'),
    ('zexact.py king free 2 4', 'zex_king_free_m2_K4.json'),
]

tmp = tempfile.mkdtemp()
copy = os.path.join(tmp, 'king-entropy')
shutil.copytree(os.path.join(ROOT, 'src'), os.path.join(copy, 'src'), ignore=shutil.ignore_patterns('__pycache__'))
fail = 0
for cmd, name in RUNS:
    target = os.path.join(copy, os.path.relpath(P(name), ROOT))
    os.makedirs(os.path.dirname(target), exist_ok=True)
    r = subprocess.run([sys.executable, os.path.join(copy, 'src', cmd.split()[0]), *cmd.split()[1:]],
                       cwd=tmp, capture_output=True, text=True)
    ok = r.returncode == 0 and os.path.isfile(target) and not os.path.exists(os.path.join(tmp, name))
    fail += not ok
    print(f'[{"PASS" if ok else "FAIL"}] {cmd} -> {os.path.relpath(target, copy)}' + ('' if ok else f'\n{r.stderr[-400:]}'))
shutil.rmtree(tmp)
print(f'{fail} failures')
sys.exit(1 if fail else 0)
