# Python

The Python implementations of the solvers, the second of the three languages of [`spec/contract.md`](../spec/contract.md), as the package `lattice_dimers`.

| path | holds |
| --- | --- |
| [`lattice_dimers/core`](lattice_dimers/core/__init__.py) | the contract's argument parser, primes, the Kahn-Lovász bound, the Chinese remainder theorem and the worker threads |
| [`lattice_dimers/solvers`](lattice_dimers/solvers/periodic_tiling_modular.py) | one module per algorithm, named by its id with underscores |

```sh
python3 -m pip install -e python
python3 -I -m lattice_dimers.solvers.periodic_tiling_modular -r 10 -c 10 --torus
```

The package needs Python 3.13 or newer and NumPy ([`pyproject.toml`](pyproject.toml)). [`harness/testRunner.js`](../harness/testRunner.js) runs the modules with `python3 -I -m` (or the interpreter at `$PYTHON`) on the boards of [`spec/cases`](../spec/cases/README.md).
