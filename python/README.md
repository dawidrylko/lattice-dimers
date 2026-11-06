# Python

The Python implementations of the solvers, the second of the three languages of [`spec/contract.md`](../spec/contract.md), as the package `lattice_dimers`.

| path | holds |
| --- | --- |
| [`lattice_dimers/core`](lattice_dimers/core/__init__.py) | the contract's argument parser, primes, the Kahn-Lovász bound, the Chinese remainder theorem and the worker threads |
| [`lattice_dimers/solvers`](lattice_dimers/solvers/all_lattices_cylinder_torus_modular.py) | one module per algorithm, named by its id with underscores |

## Quick start

Python 3.13 or newer and NumPy ([`pyproject.toml`](pyproject.toml)). The commands run at the root of the repository, and the solver prints 3263262629905, the domicule tilings of the 8 × 8 rectangle:

```sh
git clone https://github.com/dawidrylko/lattice-dimers.git
cd lattice-dimers
python3 -m pip install -e python
python3 -I -m lattice_dimers.solvers.domicule_rectangle_modular -r 8 -c 8
```

## Running and testing

```sh
python3 -I -m lattice_dimers.solvers.all_lattices_cylinder_torus_modular -r 10 -c 10 --torus
```

[`harness/testRunner.js`](../harness/testRunner.js) runs the modules with `python3 -I -m` (or the interpreter at `$PYTHON`) on the boards of [`spec/cases`](../spec/cases/README.md).
