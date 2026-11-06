# Specification

What the solvers count, apart from the language that counts it. Every implementation in Rust, Python and JavaScript is checked against this directory, and none of them is the source of another.

| file | contents |
| --- | --- |
| [`contract.md`](contract.md) | the arguments, output, errors and limits every implementation keeps, and where each language keeps its code |
| [`algorithms.json`](algorithms.json) | the registry: every algorithm by id, with the file of each implementation it has |
| [`cases/`](cases/README.md) | the known counts every implementation and program is checked against |
| [`limits.json`](limits.json) | which boards a short test run takes, in every language |
| [`cli.json`](cli.json) | the arguments every implementation rejects and the outputs it prints outside the known counts |
