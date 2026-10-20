"""Smoke test of the file layout: tm2, cylw, lean and zexact (the sweep scripts that write one JSON per
run), on the smallest inputs, run from a foreign working directory in a temporary git copy, must write
their file where src/paths.py says, with the commit recorded where the script records one.

usage: python3 src/test_paths.py      (a few seconds; exit status 1 if any check fails)
"""
import json, os, shutil, subprocess, sys, tempfile
from paths import ROOT, P

RUNS = [
    ('tm2.py king cyl 3 4', 'sec_king_cyl_3_4.json', False),
    ('cylw.py king cyl 4 0', 'eig_king_cyl_w4_p0.json', True),
    ('lean.py king free 4 - float64', 'lean_king_free_w4_p-_float64.json', True),
    ('zexact.py king free 2 4', 'zex_king_free_m2_K4.json', True),
]

tmp = tempfile.mkdtemp()
copy = os.path.join(tmp, 'king-entropy')
shutil.copytree(os.path.join(ROOT, 'src'), os.path.join(copy, 'src'), ignore=shutil.ignore_patterns('__pycache__'))
git = ['git', '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false']
for args in (['init', '-q'], ['add', '-A'], ['commit', '-q', '-m', 'copy']):
    subprocess.run(git + args, cwd=copy, check=True, capture_output=True)
fail = 0
for cmd, name, has_commit in RUNS:
    target = os.path.join(copy, os.path.relpath(P(name), ROOT))
    os.makedirs(os.path.dirname(target), exist_ok=True)
    r = subprocess.run([sys.executable, os.path.join(copy, 'src', cmd.split()[0]), *cmd.split()[1:]],
                       cwd=tmp, capture_output=True, text=True)
    ok = r.returncode == 0 and os.path.isfile(target) and not os.path.exists(os.path.join(tmp, name))
    ok = ok and (not has_commit or bool(json.load(open(target)).get('commit')))
    fail += not ok
    print(f'[{"PASS" if ok else "FAIL"}] {cmd} -> {os.path.relpath(target, copy)}' + ('' if ok else f'\n{r.stderr[-400:]}'))
shutil.rmtree(tmp)
print(f'{fail} failures')
sys.exit(1 if fail else 0)
