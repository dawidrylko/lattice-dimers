"""Check that src/timed.py reports peak RSS in MiB on this platform: a child that touches 256 MiB
must be reported between 200 and 2048 MiB (macOS gives ru_maxrss in bytes, Linux in KiB).

usage: python3 src/test_timed.py      (a few seconds; exit status 1 if the check fails)
"""
import os, re, subprocess, sys

child = 'b = bytearray(256 << 20); b[::4096] = b"x" * len(b[::4096])'
r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'timed.py'),
                    sys.executable, '-c', child], capture_output=True, text=True)
mib = int(re.search(r'maxrss=(\d+)MiB', r.stderr).group(1))
ok = r.returncode == 0 and 200 <= mib <= 2048
print(f'[{"PASS" if ok else "FAIL"}] 256 MiB child reported as {mib} MiB ({sys.platform})')
sys.exit(0 if ok else 1)
