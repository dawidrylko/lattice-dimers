import json
import os
import re
import subprocess
import sys
import threading
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SPEC = ROOT / "spec"
REJECTION_TIMEOUT = 30
MEMORY_TIMEOUT = 120
MEMORY_LIMIT_BYTES = 256 * 2**20
PRECISION_ALGORITHM = "domino-rectangle-number"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


ALGORITHMS = load(SPEC / "algorithms.json")["algorithms"]
CLI = load(SPEC / "cli.json")
LIMITS = load(SPEC / "limits.json")
PYTHON_IDS = [algorithm for algorithm, files in ALGORITHMS.items() if "py" in files]


def module_of(algorithm):
    return "lattice_dimers.solvers." + algorithm.replace("-", "_")


def command_of(algorithm, args):
    return [sys.executable, "-I", "-m", module_of(algorithm), *map(str, args)]


def run(algorithm, args, timeout=None):
    return subprocess.run(command_of(algorithm, args), cwd=ROOT, capture_output=True, text=True, timeout=timeout)


def cases_of(algorithm):
    return load(SPEC / "cases" / f"{algorithm}.json")["testCases"]


def board_key_of(case):
    return "|".join(
        str(part)
        for part in (
            case["rowCount"],
            case["colCount"],
            case.get("lattice", ""),
            "true" if case.get("torus") else "false",
            "true" if case.get("twisted") else "false",
        )
    )


def board_args(case):
    args = ["-r", case["rowCount"], "-c", case["colCount"]]

    if case.get("lattice"):
        args += ["--lattice", case["lattice"]]

    if case.get("torus"):
        args.append("--torus")

    if case.get("twisted"):
        args.append("--twisted")

    return args


def keeps(algorithm, case, index):
    limit = LIMITS["algorithms"].get(algorithm)

    if limit is None:
        return True

    if "maxTorusSide" in limit:
        return not case.get("torus") or case["colCount"] <= limit["maxTorusSide"]

    if "maxSquareSide" in limit:
        return case["rowCount"] != case["colCount"] or case["rowCount"] <= limit["maxSquareSide"]

    held = {board_key_of(twin_case) for twin_case in cases_of(limit["firstCasesPlusBoardsOf"])}

    return index < LIMITS["firstCases"] or board_key_of(case) in held


def case_id(algorithm, case):
    parts = [algorithm, f"{case['rowCount']}x{case['colCount']}"]
    parts += [case[flag] for flag in ("lattice",) if case.get(flag)]
    parts += [flag for flag in ("torus", "twisted") if case.get(flag)]

    return "-".join(parts)


def test_every_algorithm_runs_at_least_one_known_count():
    assert PYTHON_IDS
    assert not [algorithm for algorithm in PYTHON_IDS if not any(case.values[0] == algorithm for case in listed_cases())]


def listed_cases():
    full = os.environ.get("FULL_CASES") == "1"

    return [
        pytest.param(algorithm, case, id=case_id(algorithm, case))
        for algorithm in PYTHON_IDS
        for index, case in enumerate(cases_of(algorithm))
        if full or keeps(algorithm, case, index)
    ]


def matches(algorithm, expected, actual):
    if algorithm.startswith("diagonal-pieces-"):
        return str(expected) == actual

    if isinstance(expected, int):
        return int(actual) == expected

    return int(expected) == int(actual)


def peak_memory_of(command):
    process = subprocess.Popen(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    timer = threading.Timer(MEMORY_TIMEOUT, process.kill)
    timer.start()

    try:
        output = process.stdout.read()
        _, status, usage = os.wait4(process.pid, 0)
    finally:
        timer.cancel()
        process.stdout.close()

    process.returncode = os.waitstatus_to_exitcode(status)
    scale = 1 if sys.platform == "darwin" else 1024

    return process.returncode, usage.ru_maxrss * scale, output.strip()


@pytest.mark.parametrize("algorithm, case", listed_cases())
def test_known_count(algorithm, case):
    result = run(algorithm, board_args(case))

    assert result.returncode == 0, result.stderr.strip()
    assert matches(algorithm, case["expectedResult"], result.stdout.strip()), (
        f"expected {case['expectedResult']}, got {result.stdout.strip()}"
    )


@pytest.mark.parametrize(
    "rejection",
    [
        pytest.param(rejection, id=f"{rejection['algorithm']}-{' '.join(rejection['args'])[:60]}")
        for rejection in CLI["rejections"]
        if "py" in ALGORITHMS[rejection["algorithm"]]
    ],
)
def test_rejection(rejection):
    result = run(rejection["algorithm"], rejection["args"], timeout=REJECTION_TIMEOUT)

    assert result.returncode != 0
    assert rejection["message"] in result.stderr, result.stderr.strip()[-300:]


@pytest.mark.parametrize(
    "case",
    [
        pytest.param(case, id=f"{case['algorithm']}-{case['rowCount']}x{case['colCount']}")
        for case in CLI["parity"]
        if "py" in ALGORITHMS[case["algorithm"]]
    ],
)
def test_parity(case):
    result = run(case["algorithm"], ["-r", case["rowCount"], "-c", case["colCount"]], timeout=REJECTION_TIMEOUT)

    assert result.returncode == 0, result.stderr.strip()
    assert result.stdout.strip() == str(case["expectedResult"])


@pytest.mark.parametrize(
    "case",
    [pytest.param(case, id=f"{case['rowCount']}x{case['colCount']}") for case in CLI["precision"]],
)
def test_precision_warning(case):
    result = run(PRECISION_ALGORITHM, ["-r", case["rowCount"], "-c", case["colCount"]], timeout=REJECTION_TIMEOUT)

    assert result.returncode == 0, result.stderr.strip()
    assert result.stdout.strip() == case["expected"]
    assert ("not exact" in result.stderr) == case["warns"]


@pytest.mark.parametrize(
    "case",
    [
        pytest.param(case, id=f"{case['algorithm']}-{' '.join(case['args'])}")
        for case in CLI["memory"]
        if "py" in ALGORITHMS[case["algorithm"]]
    ],
)
def test_memory(case):
    status, peak, output = peak_memory_of(command_of(case["algorithm"], case["args"]))

    assert status == 0
    assert output == case["expectedResult"]
    assert peak <= MEMORY_LIMIT_BYTES, f"peak {peak / 2**20:.0f} MiB of at most {MEMORY_LIMIT_BYTES / 2**20:.0f} MiB"


@pytest.mark.skipif("py" not in ALGORITHMS[CLI["timeSpan"]["algorithm"]], reason="no Python implementation")
def test_time_span():
    started = time.perf_counter()
    result = run(CLI["timeSpan"]["algorithm"], [*CLI["timeSpan"]["args"], "--time"])
    whole = (time.perf_counter() - started) * 1000
    match = re.search(r"^time ([\d.]+) ms$", result.stderr, re.MULTILINE)

    assert result.returncode == 0, result.stderr.strip()
    assert match, result.stderr.strip()
    assert whole / 2 <= float(match.group(1)) <= whole, f"reported {match.group(1)} ms of a {whole:.1f} ms process"


@pytest.mark.parametrize("algorithm", PYTHON_IDS)
def test_time_flag(algorithm):
    plain = run(algorithm, ["-r", 2, "-c", 2])
    timed = run(algorithm, ["-r", 2, "-c", 2, "--time"])

    assert plain.returncode == 0, plain.stderr.strip()
    assert timed.returncode == 0, timed.stderr.strip()
    assert timed.stdout == plain.stdout
    assert re.search(r"^time \d+\.\d{3} ms$", timed.stderr, re.MULTILINE), timed.stderr.strip()
