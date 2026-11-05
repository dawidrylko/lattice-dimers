import sys
import time


def start_timer(argv):
    """Starts timing a count, like startTimer of js/core/timer.js: the returned function writes
    "time <milliseconds> ms" to standard error when the arguments include --time."""
    start = time.perf_counter()
    enabled = "--time" in argv

    def stop():
        if enabled:
            print(f"time {(time.perf_counter() - start) * 1000:.3f} ms", file=sys.stderr)

    return stop
