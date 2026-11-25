# Lean proofs of the lower bound (pilot)

A Lean 4 and Mathlib formalization of part of the lower bound in [`proofs/lower-bound.md`](../proofs/lower-bound.md), for one strip width, w = 6. It builds with Lean v4.36.0 and Mathlib v4.36.0, and every theorem uses only the axioms `propext`, `Classical.choice` and `Quot.sound` (`Axioms.lean`). There is no `sorry` and no `native_decide`: every computation is checked by the kernel with `decide +kernel` or by `norm_num`.

## What is proved

| Module | Statement |
| --- | --- |
| `CollatzWielandt.lean` | §3 of the proof: for a nonnegative matrix A with c v ≤ A v, v ≤ C u and c ≥ 0, c^j v_i ≤ C (A^j u)_i (`cw_iterate`, `cw_lower`) |
| `Transfer.lean` | the row transfer T_w of the free king strip of width w: a state is the set of cells of the next row already covered from above, and a row is filled by horizontal, vertical and diagonal dominoes |
| `Certificate.lean` | written by `certificate.py 6`: v = T_6^24 e_0 in integers and c = 18345852/10^6 |
| `LowerBound.lean` | the kernel checks v = T^24 e_0 and 10^6 c v ≤ 10^6 T v entrywise; `transfer_growth`: c^j v_0 ≤ (T^(j+24))_{00} for every j |
| `Matchings.lean` | `pmCount K w`, the number of perfect matchings of the K x w king board by matching the first free cell; it gives 1, 3 and 280 on the 0 x 0, 2 x 2 and 4 x 4 boards (A239273), equals (T_w^K)_{00} for w = 2, 3, 4, 6 and K up to 8, 6, 5, 3, and satisfies pmCount(K, w)^k ≤ pmCount(K, wk) for w = 2, K ≤ 4 and for w = 6, K ≤ 2, with k ≤ 2 |
| `Entropy.lean` | `entropy_lower`: for any function Z satisfying `htr` and `hsup` (below) and every ε > 0 there is K_0 such that log Z(K, 6k) / (6kK) ≥ log(c)/6 − ε for K ≥ K_0 and k ≥ 1; `bound_lt_log_c_div_w`: log(c)/6 > 12/25, from exp(1) < 2.7182818286 in Mathlib |

Together, given `htr` and `hsup` below: log Z(K, 6k) / (6kK) > 12/25 − ε = 0.48 − ε on every board K x 6k with K ≥ K_0, from log(c)/6 = 0.484900583317..., against 0.484900586451 for w = 6 in `out/out_bounds.txt`. The passage to s itself (§5 of the proof, widths L that are not multiples of 6) is not formalized.

## What is assumed

`entropy_lower` takes two hypotheses about the counting function Z(K, L):

- `htr`: Z(K, 6) = (T_6^K)_{00}, the transfer identity of §2 (`proofs/upper-bound.md` §4 with z = 0). With Z = `pmCount`, the kernel checks this hypothesis only for K ≤ 3. The same identity at widths 2, 3 and 4 (K ≤ 8, 6, 5) tests the definition of `transfer`, not `htr`.
- `hsup`: Z(K, 6)^k ≤ Z(K, 6k), the superadditivity of §1 with r = 0, stated for every K. With Z = `pmCount`, checked only for K ≤ 2 and k ≤ 2. The check at width 2 (K ≤ 4) is the same inequality at another width.

That `pmCount` counts the perfect matchings of the king board is not formalized either: it rests on the values 1, 3 and 280 of A239273 and on its agreement with `transfer`.

So the pilot proves the analytic half of the argument and the certificate, and leaves the two combinatorial facts as hypotheses. Proving them for every K and w means defining perfect matchings of the king board in Mathlib's `SimpleGraph` and a bijection with transfer paths.

## Limits

The kernel check at w = 8 (256 states, n = 32) ran out of the 5.3 GiB of the Docker VM; w = 6 (64 states) takes about 25 s. The bounds for larger w in the paper stay with the float certificate of `src/bounds.py` and its audit.

## Build

```sh
lake exe cache get
lake build
lake env lean Axioms.lean
```

Lean is not installed on the host: the commands run in a container with elan (`ELAN_HOME` in a volume), or in the `Lean` job of CI. To write a certificate for another width, `python3 certificate.py <w> > KingEntropy/Certificate.lean`.
