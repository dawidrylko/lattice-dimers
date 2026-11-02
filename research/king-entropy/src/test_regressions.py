"""Checks for fixed defects of the scripts that no rerun of a committed output covers: the bound
strings of bounds.py keep 12 decimals (214b4b6), lean.py and lcert.py refuse an np.longdouble that
is not x87 extended precision (6ef3190), and replication/bfile_check.py reads the number of
antidiagonals from the A239264 b-file kept in oeis/ (7b728c5). The scripts run unchanged: bounds.py
contributes only its formatting functions, and the precision guard runs in a temporary copy.

usage: python3 src/test_regressions.py      (a few seconds; exit status 1 if any check fails)
"""
import ast, os, shutil, subprocess, sys, tempfile
from mpmath import mpf
from paths import ROOT

REPOSITORY = os.path.dirname(os.path.dirname(ROOT))
REPLICATION = os.path.join(ROOT, 'replication')
FLOAT64_LONGDOUBLE = '''import numpy as np, os, runpy, sys
finfo = np.finfo
class Finfo:
    def __init__(self, t):
        self.info = finfo(t)
        self.nmant = 52 if np.dtype(t) == np.longdouble else self.info.nmant
    def __getattr__(self, name):
        return getattr(self.info, name)
np.finfo = Finfo
sys.argv = sys.argv[1:]
sys.path.insert(0, os.path.dirname(sys.argv[0]))
runpy.run_path(sys.argv[0], run_name='__main__')
'''


def bound_strings():
    tree = ast.parse(open(os.path.join(ROOT, 'src', 'bounds.py')).read())
    scope = {}
    exec('from mpmath import mp, mpf, floor, ceil', scope)
    defs = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in ('fixed', 'down', 'up')]
    exec(compile(ast.Module(body=defs, type_ignores=[]), 'bounds.py', 'exec'), scope)
    cases = [(scope['down'](mpf('0.5')), '0.500000000000'), (scope['up'](mpf('0.56551191104')), '0.565511911040'),
             (scope['down'](mpf('-1.25')), '-1.250000000000')]
    bad = [f'{got} instead of {want}' for got, want in cases if got != want]
    return not bad, 'down and up keep 12 decimals' + (f': {", ".join(bad)}' if bad else '')


def precision_guard(script, args):
    tmp = tempfile.mkdtemp()
    shutil.copytree(os.path.join(ROOT, 'src'), os.path.join(tmp, 'src'), ignore=shutil.ignore_patterns('__pycache__'))
    r = subprocess.run([sys.executable, '-c', FLOAT64_LONGDOUBLE, os.path.join(tmp, 'src', script), *args],
                       cwd=tmp, capture_output=True, text=True)
    shutil.rmtree(tmp)
    ok = r.returncode != 0 and 'x87 extended precision' in r.stderr
    return ok, f'{script} {" ".join(args)} stops on a 52-bit longdouble' + ('' if ok else f' (exit {r.returncode})')


def bfile_check():
    sys.path.insert(0, REPLICATION)
    from oeis_check import A, load_counts
    own = load_counts()
    tmp = tempfile.mkdtemp()
    shutil.copy(os.path.join(REPOSITORY, 'oeis', 'A239264', 'b239264.txt'), tmp)
    pos = [(n, d - n) for d in range(37) for n in range(d + 1)]
    with open(os.path.join(tmp, 'b239264_2.txt'), 'w') as f:
        f.write(''.join(f'{i} {A(own, n, k)}\n' for i, (n, k) in enumerate(pos)) + '\n' * 58)
    terms = sum(1 for line in open(os.path.join(tmp, 'b239264.txt')) if line.strip())
    diagonals = next(d for d in range(terms + 2) if d * (d + 1) // 2 >= terms)
    r = subprocess.run([sys.executable, os.path.join(REPLICATION, 'bfile_check.py'), tmp], capture_output=True, text=True)
    shutil.rmtree(tmp)
    ok = r.returncode == 0 and f'antidiagonals 0..{diagonals - 1}' in r.stdout and 'TOTAL MISMATCHES: 0' in r.stdout
    return ok, 'bfile_check.py on oeis/A239264/b239264.txt' + ('' if ok else f' (exit {r.returncode}): {r.stderr[-300:]}')


fail = 0
for ok, name in (bound_strings(), precision_guard('lean.py', ['king', 'free', '4', '-', 'longdouble']),
                 precision_guard('lcert.py', ['2', '4']), bfile_check()):
    fail += not ok
    print(f'[{"PASS" if ok else "FAIL"}] {name}')
print(f'{fail} failures')
sys.exit(1 if fail else 0)
