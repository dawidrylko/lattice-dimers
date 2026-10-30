"""Run a command, then append wall time and peak RSS of the child to stderr.

ru_maxrss is in KiB on Linux and in bytes on macOS.

usage: python3 src/timed.py <cmd> [args...]
"""
import resource, subprocess, sys, time

t = time.time()
rc = subprocess.call(sys.argv[1:])
ru = resource.getrusage(resource.RUSAGE_CHILDREN)
mib = ru.ru_maxrss / (1 << 20 if sys.platform == 'darwin' else 1 << 10)
print(f'# cmd: {" ".join(sys.argv[1:])}\n# exit={rc} wall={time.time() - t:.1f}s '
      f'user={ru.ru_utime:.1f}s maxrss={mib:.0f}MiB', file=sys.stderr)
sys.exit(rc)
