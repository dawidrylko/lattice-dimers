import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
LIMITS = json.loads((ROOT / "spec" / "limits.json").read_text(encoding="utf-8"))["generators"]
GENERATORS = sorted((ROOT / "oeis").glob("A*/b*.py"))
LATER_RANGE = (3, 4)
REJECTED = [[], ["1"], ["3", "2"], ["x", "2"], ["+1", "2"], ["0", "1", "2"]]

pytestmark = pytest.mark.skipif(
    os.environ.get("GENERATOR_CHECKS") == "skip", reason="GENERATOR_CHECKS=skip: nothing the generators depend on changed"
)


def run(generator, args):
    return subprocess.run([sys.executable, "-I", str(generator), *args], cwd=ROOT, capture_output=True, text=True)


@pytest.mark.parametrize("generator", GENERATORS, ids=lambda generator: generator.stem)
def test_generator_prints_its_b_file(generator):
    entry = generator.parent.name
    lines = (generator.parent / f"b{entry[1:]}.txt").read_text(encoding="utf-8").splitlines(keepends=True)
    last = len(lines) - 1 if os.environ.get("FULL_CASES") == "1" else LIMITS[entry]["py"]
    result = run(generator, ["0", str(last)])

    assert result.returncode == 0, result.stderr
    assert result.stdout == "".join(lines[: last + 1]), f"{generator.name} 0 {last} does not print the first {last + 1} lines of its b-file"


@pytest.mark.parametrize("generator", GENERATORS, ids=lambda generator: generator.stem)
@pytest.mark.parametrize("n", [0, 1])
def test_generator_prints_one_term(generator, n):
    lines = (generator.parent / f"b{generator.parent.name[1:]}.txt").read_text(encoding="utf-8").splitlines(keepends=True)
    result = run(generator, [str(n), str(n)])

    assert result.returncode == 0, result.stderr
    assert result.stdout == lines[n], f"{generator.name} {n} {n} does not print line {n} of its b-file alone"


@pytest.mark.parametrize("generator", GENERATORS, ids=lambda generator: generator.stem)
def test_generator_prints_a_range_after_zero(generator):
    lines = (generator.parent / f"b{generator.parent.name[1:]}.txt").read_text(encoding="utf-8").splitlines(keepends=True)
    first, end = LATER_RANGE
    result = run(generator, [str(first), str(end)])

    assert result.returncode == 0, result.stderr
    assert result.stdout == "".join(lines[first : end + 1]), f"{generator.name} {first} {end} does not print lines {first} to {end} of its b-file"


@pytest.mark.parametrize("generator", GENERATORS, ids=lambda generator: generator.stem)
@pytest.mark.parametrize("args", REJECTED, ids=lambda args: " ".join(args) or "none")
def test_generator_rejects_a_wrong_range(generator, args):
    result = run(generator, args)

    assert (result.returncode, result.stdout) == (2, "")
    assert result.stderr.startswith("Usage: ")
