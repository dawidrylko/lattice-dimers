"""Re-run the first-round scripts from a clean export of HEAD and compare with the committed outputs.

usage: python3 repro.py > out_repro.txt        (about 10 minutes)

First checks that the code commits recorded with the first-round outputs (`commit` fields of
eig_*.json, out_estimate.txt, and the provenance in CW-NOTE.md and PROOF-upper.md) exist in this
repository. Then checks that the current code reproduces the committed numbers. It works in a
temporary copy (the scripts rewrite their JSON outputs), strips wall-clock timings and commit
tags, compares.
"""
import hashlib, json, re, subprocess, sys, tempfile, pathlib

CITED = '102b7e5 76fc5e1 73a0628 ee63b57 0357d17 0cf6903 106661e b08b04a 8dc1359 73289ea a32a0fe'.split()
missing = [c for c in CITED if subprocess.run(['git', 'cat-file', '-e', c + '^{commit}'], capture_output=True).returncode]
head = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
print(f'HEAD {head}; recorded code commits missing from the repository: {len(missing)} of {len(CITED)}: {" ".join(missing) or "none"}')


def clean(text):
    text = re.sub(r'\(\d+s\)', '', text)            # per-width timings in bounds.py
    text = re.sub(r'@[0-9a-f]{7}', '@<sha>', text)    # commit tags
    return text


tmp = pathlib.Path(tempfile.mkdtemp())
subprocess.run(f'git archive HEAD . | tar -x -C {tmp}', shell=True, check=True)


def run(cmd, cwd=tmp):
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True, check=True).stdout


ok_all = not missing


def compare(name, new, old):
    global ok_all
    ok = clean(new) == clean(old)
    ok_all &= ok
    print(f'[{"SAME" if ok else "DIFF"}] {name}  (sha1 {hashlib.sha1(clean(new).encode()).hexdigest()[:12]})', flush=True)


compare('python3 estimate.py  vs out_estimate.txt', run('python3 estimate.py'), (tmp / 'out_estimate.txt').read_text())
compare('python3 cw.py        vs out_cw.txt', run('python3 cw.py'), (tmp / 'out_cw.txt').read_text())
sub = tmp / 'b16'
sub.mkdir()
run(f'cp {tmp}/*.py {tmp}/*.json {sub}/')
new = run('python3 bounds.py 16', cwd=sub)
old = (tmp / 'out_bounds.txt').read_text()
rows = lambda t, sect: [l for l in t[t.index(sect):].split('\n')[2:] if re.match(r'^ ?\d+  ', l) and int(l.split()[0]) <= 16]
for sect in ('== Fekete', '== open-strip'):
    compare(f'python3 bounds.py 16 vs out_bounds.txt, section "{sect[3:]}", w <= 16',
            '\n'.join(rows(new, sect)[:15]), '\n'.join(rows(old, sect)[:15]))
orig = json.loads((tmp / 'eig_king_cyl_w20_p0.json').read_text())
run('python3 cylw.py king cyl 20 0')
rep = json.loads((tmp / 'eig_king_cyl_w20_p0.json').read_text())
same = rep['history'] == orig['history'] and rep['log_lambda'] == orig['log_lambda']
ok_all &= same
print(f'[{"SAME" if same else "DIFF"}] python3 cylw.py king cyl 20 0 vs eig_king_cyl_w20_p0.json: all {len(rep["history"])}'
      f' iterates bit-identical, log lambda = {rep["log_lambda"]!r}')
print(f'\nall reproduced: {ok_all}')
sys.exit(0 if ok_all else 1)
