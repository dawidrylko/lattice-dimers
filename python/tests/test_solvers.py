import hashlib
import importlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

from lattice_dimers.core import list_primes, pfaffian_modulo

ROOT = Path(__file__).resolve().parents[2]
SPEC = ROOT / "spec"
DIGIT_LIMIT = 640
GIGABYTE = 2**30
MODULAR_DIAGONAL = "lattice_dimers.solvers.domicule_rectangle_polynomial_modular"
MODULAR_CYLINDER_TORUS_DIAGONAL = "lattice_dimers.solvers.domicule_cylinder_torus_polynomial_modular"
MODULAR_LATTICE_DIAGONAL = "lattice_dimers.solvers.any_lattice_rectangle_polynomial_modular"
MODULAR_LATTICE_CYLINDER_TORUS_DIAGONAL = "lattice_dimers.solvers.any_lattice_cylinder_torus_polynomial_modular"


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
    ("any-lattice-rectangle-modular", "calculate_total_tiling_combinations", board_of("any-lattice-rectangle-modular", 7, 6)),
    ("any-lattice-rectangle-polynomial-modular", "calculate_diagonal_polynomial", board_of("any-lattice-rectangle-polynomial-bigint", 5, 6)),
]


@pytest.mark.parametrize(
    "algorithm, method, case",
    [pytest.param(algorithm, method, case, id=f"{algorithm}-{case['rowCount']}x{case['colCount']}") for algorithm, method, case in SCRATCH_CASES],
)
def test_scratch_array_of_one_count(monkeypatch, algorithm, method, case):
    solver = importlib.import_module(module_of(algorithm))
    monkeypatch.setattr(solver, "SCRATCH_COUNTS", 1)

    lattice = {"lattice": case["lattice"]} if "lattice" in case else {}
    result = getattr(solver, method)(case["rowCount"], case["colCount"], jobs=2, **lattice)

    assert joined(result) == case["expectedResult"]


UNKNOWN_PROCESSOR_CASES = [
    ("any-lattice-cylinder-torus-modular", "calculate_total_tiling_combinations", board_of("any-lattice-cylinder-torus-bigint", 4, 4)),
    ("domicule-rectangle-modular", "calculate_total_tiling_combinations", board_of("domicule-rectangle-modular", 4, 4)),
    ("any-lattice-rectangle-modular", "calculate_total_tiling_combinations", board_of("any-lattice-rectangle-modular", 4, 4)),
    ("domicule-rectangle-polynomial-modular", "calculate_diagonal_polynomial", board_of("domicule-rectangle-polynomial-bigint", 4, 4)),
    ("any-lattice-rectangle-polynomial-modular", "calculate_diagonal_polynomial", board_of("any-lattice-rectangle-polynomial-bigint", 4, 4)),
    ("any-lattice-cylinder-torus-polynomial-modular", "calculate_diagonal_polynomial", board_of("any-lattice-cylinder-torus-polynomial-bigint", 4, 4)),
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
    surface = {"lattice": lattice, **({"torus": torus} if "torus" in case or algorithm.startswith("any-lattice-cylinder-torus-") else {})} if lattice else {}
    board = json.dumps({"row_count": case["rowCount"], "col_count": case["colCount"], **surface})
    args = ["-r", case["rowCount"], "-c", case["colCount"], *(["--lattice", lattice] if lattice else []), *(["--torus"] if torus else [])]
    result = run_script(script, module_of(algorithm), board, *args)
    expected = case["expectedResult"]

    assert result.returncode == 0, (result.stdout or result.stderr).strip()
    assert result.stdout.strip() == f"{expected}\n{expected}"


@pytest.mark.parametrize(
    "jobs, cols, degree, memory, expected",
    [
        pytest.param(10, 20, 200, 16 * GIGABYTE, 5, id="20x20-on-16GB"),
        pytest.param(4, 6, 18, 16 * GIGABYTE, 4, id="6x6-on-16GB"),
        pytest.param(3, 20, 200, GIGABYTE, 1, id="20x20-on-1GB"),
    ],
)
def test_cap_threads(jobs, cols, degree, memory, expected):
    cap_threads = importlib.import_module(MODULAR_DIAGONAL).cap_threads

    assert cap_threads(jobs, cols, degree, memory) == expected


CYLINDER_TORUS_CASES = [
    board_of("domicule-cylinder-torus-polynomial-bigint", 4, 6),
    board_of("domicule-cylinder-torus-polynomial-bigint", 5, 4),
]


@pytest.mark.parametrize(
    "case",
    [pytest.param(case, id=f"{case['rowCount']}x{case['colCount']}{'-torus' if case.get('torus') else ''}") for case in CYLINDER_TORUS_CASES],
)
def test_cylinder_torus_scratch_array_of_one_count(monkeypatch, case):
    solver = importlib.import_module(MODULAR_CYLINDER_TORUS_DIAGONAL)
    monkeypatch.setattr(solver, "SCRATCH_COUNTS", 1)
    monkeypatch.setattr(solver, "BATCH_COUNTS", 1)

    result = solver.calculate_diagonal_polynomial(case["rowCount"], case["colCount"], bool(case.get("torus")), 2)

    assert joined(result) == case["expectedResult"]


@pytest.mark.parametrize(
    "jobs, cols, degree, memory, expected",
    [
        pytest.param(10, 20, 200, 64 * GIGABYTE, 2, id="20x20-on-64GB"),
        pytest.param(4, 6, 18, 16 * GIGABYTE, 4, id="6x6-on-16GB"),
        pytest.param(3, 20, 200, GIGABYTE, 1, id="20x20-on-1GB"),
        pytest.param(9, 2, 31, 0, 1, id="unknown-memory"),
    ],
)
def test_cylinder_torus_cap_threads(jobs, cols, degree, memory, expected):
    cap_threads = importlib.import_module(MODULAR_CYLINDER_TORUS_DIAGONAL).cap_threads

    assert cap_threads(jobs, cols, degree, memory) == expected


def test_lattice_cap_threads():
    cap_threads = importlib.import_module(MODULAR_LATTICE_DIAGONAL).cap_threads

    assert cap_threads(10, 20, 200, 16 * GIGABYTE) == 5
    assert cap_threads(4, 6, 18, 16 * GIGABYTE) == 4
    assert cap_threads(3, 20, 200, GIGABYTE) == 1


LATTICE_CYLINDER_TORUS_CASES = [
    next(case for case in cases_of("any-lattice-cylinder-torus-polynomial-bigint") if (case["rowCount"], case["colCount"], bool(case.get("torus"))) == key and case["lattice"] == lattice)
    for lattice, key in [("triangular", (4, 3, False)), ("triangular", (4, 4, True)), ("square", (3, 4, True)), ("king", (3, 4, True)), ("king", (2, 3, True))]
]


@pytest.mark.parametrize(
    "case",
    [pytest.param(case, id=f"{case['lattice']}-{case['rowCount']}x{case['colCount']}{'-torus' if case.get('torus') else ''}") for case in LATTICE_CYLINDER_TORUS_CASES],
)
def test_lattice_cylinder_torus_scratch_array_of_one_count(monkeypatch, case):
    solver = importlib.import_module(MODULAR_LATTICE_CYLINDER_TORUS_DIAGONAL)
    monkeypatch.setattr(solver, "SCRATCH_COUNTS", 1)
    monkeypatch.setattr(solver, "BATCH_COUNTS", 1)

    result = solver.calculate_diagonal_polynomial(case["rowCount"], case["colCount"], case["lattice"], bool(case.get("torus")), 2)

    assert joined(result) == case["expectedResult"]


@pytest.mark.parametrize(
    "jobs, cols, degree, lattice, memory, expected",
    [
        pytest.param(10, 20, 200, "king", 64 * GIGABYTE, 2, id="king-20x20-on-64GB"),
        pytest.param(10, 20, 200, "triangular", 64 * GIGABYTE, 5, id="triangular-20x20-on-64GB"),
        pytest.param(10, 20, 200, "square", 64 * GIGABYTE, 5, id="square-20x20-on-64GB"),
        pytest.param(4, 6, 18, "king", 16 * GIGABYTE, 4, id="king-6x6-on-16GB"),
        pytest.param(3, 20, 200, "king", GIGABYTE, 1, id="king-20x20-on-1GB"),
        pytest.param(9, 2, 31, "triangular", 0, 1, id="unknown-memory"),
    ],
)
def test_lattice_cylinder_torus_cap_threads(jobs, cols, degree, lattice, memory, expected):
    cap_threads = importlib.import_module(MODULAR_LATTICE_CYLINDER_TORUS_DIAGONAL).cap_threads

    assert cap_threads(jobs, cols, degree, lattice, memory) == expected


def expand_pfaffian(matrix, vertices):
    if not vertices:
        return 1

    first, rest = vertices[0], vertices[1:]

    return sum(
        (1 if position % 2 == 0 else -1) * matrix[first][partner] * expand_pfaffian(matrix, [vertex for vertex in rest if vertex != partner])
        for position, partner in enumerate(rest)
    )


def draw_skew_matrix(size, draws, zero_every):
    matrix = [[0] * size for _ in range(size)]

    for i in range(size):
        for j in range(i + 1, size):
            draw = next(draws)
            matrix[i][j] = 0 if draw % zero_every == 0 else draw % 19 - 9
            matrix[j][i] = -matrix[i][j]

    return matrix


def list_draws(seed):
    while True:
        seed = (seed * 1103515245 + 12345) % 2**32
        yield seed >> 8


def upper_residues(matrix, prime):
    return np.triu(np.array(matrix, dtype=np.int64) % prime, k=1).astype(np.uint64)


def determinant_modulo(matrix, prime):
    rows = [[value % prime for value in row] for row in matrix]
    determinant = 1

    for column in range(len(rows)):
        pivot = next((row for row in range(column, len(rows)) if rows[row][column]), None)

        if pivot is None:
            return 0

        if pivot != column:
            rows[column], rows[pivot] = rows[pivot], rows[column]
            determinant = -determinant

        determinant = determinant * rows[column][column] % prime
        inverse = pow(rows[column][column], -1, prime)

        for row in range(column + 1, len(rows)):
            factor = rows[row][column] * inverse % prime
            rows[row] = [(value - factor * above) % prime for value, above in zip(rows[row], rows[column])]

    return determinant % prime


def test_pfaffian_of_small_matrices():
    prime = list_primes(1)[0]

    assert pfaffian_modulo(np.zeros((0, 0), dtype=np.uint64), prime) == 1
    assert pfaffian_modulo(np.array([[0, 7], [0, 0]], dtype=np.uint64), prime) == 7
    assert pfaffian_modulo(np.array([[0, prime - 7], [0, 0]], dtype=np.uint64), prime) == prime - 7
    assert pfaffian_modulo(np.array([[0, 1, 2, 3], [0, 0, 4, 5], [0, 0, 0, 6], [0, 0, 0, 0]], dtype=np.uint64), prime) == 8


def test_pfaffian_of_an_odd_size_and_of_a_vertex_without_a_partner():
    prime = list_primes(1)[0]

    assert pfaffian_modulo(np.array([[0, 1, 1], [0, 0, 1], [0, 0, 0]], dtype=np.uint64), prime) == 0
    assert pfaffian_modulo(np.array([[0, 0, 0, 0], [0, 0, 1, 1], [0, 0, 0, 1], [0, 0, 0, 0]], dtype=np.uint64), prime) == 0


def test_pfaffian_with_a_partner_moved_next_to_its_vertex():
    prime = list_primes(1)[0]
    matrix = [[0, 0, 0, 5], [0, 0, 3, 2], [0, -3, 0, 7], [-5, -2, -7, 0]]

    assert expand_pfaffian(matrix, [0, 1, 2, 3]) == 15
    assert pfaffian_modulo(upper_residues(matrix, prime), prime) == 15


@pytest.mark.parametrize("prime", [None, 7, 3])
def test_pfaffian_against_the_expansion_along_the_first_row(prime):
    prime = prime or list_primes(2)[1]
    draws = list_draws(2026 + prime)

    for size, zero_every in [(2, 3), (4, 2), (6, 2), (6, 5), (8, 2), (8, 3), (8, 1000), (10, 2), (24, 6)]:
        for _ in range(20 if size <= 10 else 1):
            matrix = draw_skew_matrix(size, draws, zero_every)

            if size <= 10:
                expected = expand_pfaffian(matrix, list(range(size))) % prime
                assert pfaffian_modulo(upper_residues(matrix, prime), prime) == expected, f"{size} x {size} modulo {prime}: {matrix}"
            else:
                squared = pfaffian_modulo(upper_residues(matrix, prime), prime) ** 2 % prime
                assert squared == determinant_modulo(matrix, prime), f"{size} x {size} modulo {prime}: {matrix}"


def test_pfaffian_ignores_the_entries_on_and_below_the_diagonal():
    prime = list_primes(1)[0]
    matrix = draw_skew_matrix(6, list_draws(7), 4)
    filled = upper_residues(matrix, prime)
    filled[np.tril_indices(6)] = 12345

    assert pfaffian_modulo(filled, prime) == pfaffian_modulo(upper_residues(matrix, prime), prime)


def test_pfaffian_rejects_a_prime_of_32_bits_and_a_matrix_that_is_not_square():
    with pytest.raises(ValueError, match="below 2147483648"):
        pfaffian_modulo(np.array([[0, 1], [0, 0]], dtype=np.uint64), 2**31)

    with pytest.raises(ValueError, match="must be square"):
        pfaffian_modulo(np.zeros((2, 4), dtype=np.uint64), list_primes(1)[0])

    with pytest.raises(ValueError, match="must be square"):
        pfaffian_modulo(np.zeros(4, dtype=np.uint64), list_primes(1)[0])


def test_pfaffian_solver_says_that_the_kings_graph_is_not_planar():
    solver = importlib.import_module(module_of("any-lattice-cylinder-torus-pfaffian"))

    with pytest.raises(ValueError, match="is not planar"):
        solver.calculate_total_tiling_combinations(4, 4, "king")


@pytest.mark.parametrize("lattice", ["square", "triangular"])
@pytest.mark.parametrize("torus", [False, True])
def test_pfaffian_solver_agrees_with_the_bigint_solver_from_0x0_to_8x8(lattice, torus):
    pfaffian = importlib.import_module(module_of("any-lattice-cylinder-torus-pfaffian"))
    bigint = importlib.import_module(module_of("any-lattice-cylinder-torus-bigint"))

    def expected_of(rows, cols):
        if not bigint.is_valid_board(rows, cols, torus):
            return "rejected"

        return bigint.calculate_total_tiling_combinations(rows, cols, lattice, torus)

    def actual_of(rows, cols):
        try:
            return pfaffian.calculate_total_tiling_combinations(rows, cols, lattice, torus, jobs=1)
        except ValueError as error:
            if "circumference must be at least 2" not in str(error):
                raise

            return "rejected"

    boards = [(rows, cols) for rows in range(9) for cols in range(9)]
    outcomes = [(rows, cols, actual_of(rows, cols), expected_of(rows, cols)) for rows, cols in boards]
    differences = [f"{rows}x{cols}: {actual} instead of {expected}" for rows, cols, actual, expected in outcomes if actual != expected]

    assert differences == []


@pytest.mark.parametrize("lattice", ["square", "triangular", "king"])
@pytest.mark.parametrize("torus", [False, True])
@pytest.mark.parametrize("twisted", [False, True])
def test_modular_solver_agrees_with_the_bigint_solver_from_0x0_to_7x7(lattice, torus, twisted):
    modular = importlib.import_module(module_of("any-lattice-cylinder-torus-modular"))
    bigint = importlib.import_module(module_of("any-lattice-cylinder-torus-bigint"))

    def expected_of(rows, cols):
        if not bigint.is_valid_board(rows, cols, torus):
            return "rejected"

        return bigint.calculate_total_tiling_combinations(rows, cols, lattice, torus, twisted)

    def actual_of(rows, cols):
        try:
            return modular.calculate_total_tiling_combinations(rows, cols, lattice, torus, twisted, jobs=1)
        except ValueError as error:
            if "circumference must be at least 2" not in str(error):
                raise

            return "rejected"

    boards = [(rows, cols) for rows in range(8) for cols in range(8)]
    outcomes = [(rows, cols, actual_of(rows, cols), expected_of(rows, cols)) for rows, cols in boards]
    differences = [f"{rows}x{cols}: {actual} instead of {expected}" for rows, cols, actual, expected in outcomes if actual != expected]

    assert differences == []


def test_modular_solver_agrees_with_the_bigint_solver_on_rectangles_from_0x0_to_9x9():
    modular = importlib.import_module(module_of("domicule-rectangle-modular"))
    bigint = importlib.import_module(module_of("domicule-rectangle-bigint"))
    boards = [(rows, cols) for rows in range(10) for cols in range(10)]
    outcomes = [
        (rows, cols, modular.calculate_total_tiling_combinations(rows, cols, jobs=1), bigint.calculate_total_tiling_combinations(rows, cols))
        for rows, cols in boards
    ]
    differences = [f"{rows}x{cols}: {actual} instead of {expected}" for rows, cols, actual, expected in outcomes if actual != expected]

    assert differences == []
