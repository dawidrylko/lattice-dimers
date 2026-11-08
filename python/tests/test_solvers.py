import hashlib
import importlib
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SPEC = ROOT / "spec"
DIGIT_LIMIT = 640
GIGABYTE = 2**30
MODULAR_DIAGONAL = "lattice_dimers.solvers.domicule_rectangle_polynomial_modular"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def cases_of(algorithm):
    return load(SPEC / "cases" / f"{algorithm}.json")["testCases"]


def module_of(algorithm):
    return "lattice_dimers.solvers." + algorithm.replace("-", "_")


def board_of(algorithm, rows, cols):
    return next(case for case in cases_of(algorithm) if case["rowCount"] == rows and case["colCount"] == cols)


def run_script(script, *args):
    return subprocess.run([sys.executable, "-I", "-c", script, *map(str, args)], cwd=ROOT, capture_output=True, text=True)


def joined(result):
    return ",".join(map(str, result)) if isinstance(result, list) else str(result)


LONG_COUNTS = load(SPEC / "cli.json")["longCounts"]


@pytest.mark.parametrize(
    "case",
    [pytest.param(case, id=f"{case['algorithm']}-{'x'.join(case['args'][1::2])}") for case in LONG_COUNTS],
)
def test_long_count_under_digit_limit(case):
    script = "\n".join(
        [
            "import runpy, sys",
            f"sys.set_int_max_str_digits({DIGIT_LIMIT})",
            "sys.argv = sys.argv[1:]",
            'runpy.run_module(sys.argv[0], run_name="__main__", alter_sys=True)',
        ]
    )
    result = run_script(script, module_of(case["algorithm"]), *case["args"])
    printed = result.stdout.strip()

    assert result.returncode == 0, (result.stdout or result.stderr).strip()[-200:]
    assert len(printed) == case["digits"] > DIGIT_LIMIT
    assert hashlib.sha256(printed.encode()).hexdigest() == case["sha256"]


def test_long_coefficient_under_digit_limit():
    long = "1" + "0" * 700
    script = "\n".join(
        [
            "import importlib, sys",
            f"sys.set_int_max_str_digits({DIGIT_LIMIT})",
            "module = importlib.import_module(sys.argv[1])",
            "module.combine_checked_residues = lambda *_: 10 ** 700",
            'sys.exit(module.main(["-r", "2", "-c", "2"]))',
        ]
    )
    result = run_script(script, MODULAR_DIAGONAL)

    assert result.returncode == 0, (result.stdout or result.stderr).strip()[-200:]
    assert result.stdout.strip() == ",".join([long, long, long])


SCRATCH_CASES = [
    ("domicule-rectangle-modular", "calculate_total_tiling_combinations", board_of("domicule-rectangle-modular", 7, 6)),
    ("domicule-rectangle-polynomial-modular", "calculate_diagonal_polynomial", board_of("domicule-rectangle-polynomial-bigint", 5, 6)),
]


@pytest.mark.parametrize(
    "algorithm, method, case",
    [pytest.param(algorithm, method, case, id=f"{algorithm}-{case['rowCount']}x{case['colCount']}") for algorithm, method, case in SCRATCH_CASES],
)
def test_scratch_array_of_one_count(monkeypatch, algorithm, method, case):
    solver = importlib.import_module(module_of(algorithm))
    monkeypatch.setattr(solver, "SCRATCH_COUNTS", 1)

    result = getattr(solver, method)(case["rowCount"], case["colCount"], 2)

    assert joined(result) == case["expectedResult"]


UNKNOWN_PROCESSOR_CASES = [
    ("all-lattices-cylinder-torus-modular", "calculate_total_tiling_combinations", board_of("all-lattices-cylinder-torus-bigint", 4, 4)),
    ("domicule-rectangle-modular", "calculate_total_tiling_combinations", board_of("domicule-rectangle-modular", 4, 4)),
    ("domicule-rectangle-polynomial-modular", "calculate_diagonal_polynomial", board_of("domicule-rectangle-polynomial-bigint", 4, 4)),
]


@pytest.mark.parametrize(
    "algorithm, method, case",
    [pytest.param(algorithm, method, case, id=algorithm) for algorithm, method, case in UNKNOWN_PROCESSOR_CASES],
)
def test_unknown_processor_count(algorithm, method, case):
    script = "\n".join(
        [
            "import importlib, json, os, runpy, sys",
            "os.process_cpu_count = lambda: None",
            "module = sys.argv[1]",
            f"result = importlib.import_module(module).{method}(**json.loads(sys.argv[2]))",
            'print(",".join(map(str, result)) if isinstance(result, list) else result, flush=True)',
            "sys.argv = [module] + sys.argv[3:]",
            'runpy.run_module(module, run_name="__main__", alter_sys=True)',
        ]
    )
    lattice = case.get("lattice")
    torus = bool(case.get("torus"))
    surface = {"lattice": lattice, "torus": torus} if lattice else {}
    board = json.dumps({"row_count": case["rowCount"], "col_count": case["colCount"], **surface})
    args = ["-r", case["rowCount"], "-c", case["colCount"], *(["--lattice", lattice] if lattice else []), *(["--torus"] if torus else [])]
    result = run_script(script, module_of(algorithm), board, *args)
    expected = case["expectedResult"]

    assert result.returncode == 0, (result.stdout or result.stderr).strip()
    assert result.stdout.strip() == f"{expected}\n{expected}"


@pytest.mark.parametrize(
    "jobs, cols, degree, memory, expected",
    [
        pytest.param(10, 20, 200, 16 * GIGABYTE, 2, id="20x20-on-16GB"),
        pytest.param(4, 6, 18, 16 * GIGABYTE, 4, id="6x6-on-16GB"),
        pytest.param(3, 20, 200, GIGABYTE, 1, id="20x20-on-1GB"),
    ],
)
def test_cap_threads(jobs, cols, degree, memory, expected):
    cap_threads = importlib.import_module(MODULAR_DIAGONAL).cap_threads

    assert cap_threads(jobs, cols, degree, memory) == expected
