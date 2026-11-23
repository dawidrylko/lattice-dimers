# A402163

[OEIS A402163](https://oeis.org/A402163): number of domicule tilings of the $2n \times 2n$ cylinder.

## Contribution

- The new entry with the b-file of $n = 0, \dots, 11$, submitted 14 November 2026.

## Status

Approved 22 November 2026, revision #11.

## Files

| file | content |
| --- | --- |
| [A402163.txt](A402163.txt) | the full entry text as published, with the data on one `%S` line and without the keyword `new` |
| [b402163.txt](b402163.txt) | $n = 0, \dots, 11$, printed alike by the generators [`b402163.rs`](b402163.rs), [`b402163.py`](b402163.py) and [`b402163.js`](b402163.js); identical to the b-file the OEIS installed on 22 November 2026; its terms up to $n = 10$ are checked against [`spec/cases/any-lattice-cylinder-torus-modular.json`](../../spec/cases/any-lattice-cylinder-torus-modular.json) and $n = 11$ against [`zex_king_cyl_m22_K22.json`](../../research/king-entropy/data/zex/zex_king_cyl_m22_K22.json) |
| [A402163.gp](A402163.gp) | the program of the `%o` lines, with `T(h, w)` for the $h \times w$ cylinder |
| [b402163.rs](b402163.rs) | the generator of the b-file in Rust |
| [b402163.py](b402163.py) | the generator of the b-file in Python |
| [b402163.js](b402163.js) | the generator of the b-file in JavaScript |

## Notes

The three generators run the same method in Rust, Python and JavaScript, each in its own code. They count the cylinder cell by cell modulo primes, which is the entry of the power of the row transfer matrix of [`A402163.gp`](A402163.gp) from the empty row to the empty row taken one cell at a time, with the pieces across the seam. On the $2 \times 2$ cylinder those pieces are separate edges, as the entry counts them. They take as many primes below $2^{31}$ as the Kahn-Lovasz bound needs, $a(n) \le \prod_v (d_v!)^{1/(2 d_v)}$ with $d_v = 8$ inside and $5$ on the two free rows, and for $n = 1$, where the graph has multiple edges, $5^{2n^2}$; one more prime checks each term.

`rust/target/release/b402163 0 11` (after `cargo build --release` in `rust/`) prints the whole b-file in 49 s, `python3 -I oeis/A402163/b402163.py 0 11` (after `python3 -m pip install -e python`) in 256 s and `node oeis/A402163/b402163.js 0 11` in 171 s, all three on the 10 cores of an Apple M4 on 17 November 2026. So CI runs all three up to $n = 9$. These last terms are in [`spec/limits.json`](../../spec/limits.json), and `FULL_CASES=1` runs every term in all three.

The program is the one of [A401670](../A401670/A401670.gp) with one change: the cylinder count is the entry of the power of the row transfer matrix from the empty row to the empty row, where the torus count is its trace.

$a(0), \dots, a(7)$ come also from the row transfer in exact integers, `node js/solvers/any-lattice-cylinder-torus-bigint.js -r 14 -c 14 --lattice king` for $a(7)$ in 20 s on 14 November 2026; the $16 \times 16$ cylinder ran out of the 4 GB heap of Node.js. $a(2), \dots, a(11)$ agree between the modular solver of the site and `research/king-entropy/src/zexact.py`, two programs that go cell by cell modulo primes. For $a(11)$, `node js/solvers/any-lattice-cylinder-torus-modular.js -r 22 -c 22 --lattice king -j 4` took 290 s and printed the count of `zex_king_cyl_m22_K22.json`.

The b-file was uploaded as `b402163_1.txt` and installed as `b402163.txt` on approval (revision #11). An editor added $a(9)$ to the data, for which there was room, and dropped the keyword `more`, which an entry with a b-file does not take (revisions #5 to #7). Another removed the comment on how the terms were checked and the formula that pointed to the PARI program (revision #8). The entry was approved at revision #10.
