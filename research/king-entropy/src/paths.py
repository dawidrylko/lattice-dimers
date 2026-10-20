"""Where each committed file lives, by name, so the scripts run from any directory.

Paths are absolute under research/king-entropy/: P('bounds.json') is data/bounds.json there,
P('eig_king_cyl_w20_p0.json') data/eig/eig_king_cyl_w20_p0.json, P('out_cw.txt') out/out_cw.txt,
log_* and time_* go to logs/, scripts to src/.
G(pattern) lists the matching file names (without directory), sorted.
"""
import glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GROUPS = ('eig', 'sec', 'zex', 'lean')


def where(name):
    if name.endswith('.json'):
        head = name.split('_', 1)[0]
        return os.path.join('data', head) if head in GROUPS else 'data'
    if name.endswith('.py'):
        return 'src'
    if name.startswith('out_'):
        return 'out'
    if name.startswith(('log_', 'time_')):
        return 'logs'
    raise ValueError(f'no directory for {name}')


def P(name):
    return os.path.join(ROOT, where(name), name)


def G(pattern):
    return sorted(os.path.basename(f) for f in glob.glob(P(pattern)))
