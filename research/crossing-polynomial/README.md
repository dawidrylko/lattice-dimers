# The crossing polynomial in powers of 1 + t

This note proves that the crossing polynomial of every induced subgraph of the king's graph, on a rectangle and on a cylinder or torus whose periods are even and at least 4, has nonnegative integer coefficients in powers of $1 + t$. In particular its value at $t = -1$, the sum of the tilings with the crossing sign, is never negative. The proof is a bijection that replaces the two crossing diagonal pieces of a unit square by a pair of straight pieces chosen by a checkerboard rule.

Status: a theorem with a proof, unpublished. [`check.py`](check.py) tests it by brute force on small boards (section Computer checks).

## Literature

We did not find the identity, the bijection, the nonnegativity of the sum with the crossing sign on the king's graph, or the nonnegative coefficients in $1 + t$ in 20 web searches, opening the abstracts or the text of about ten of the sources they found (November 2026). That is all the search can say; it does not show that the result is new, and an elementary bijection like this one may well be known. The closest work we found is Wildeboer and Seidel [1]. They weigh each dimer covering of the square lattice with diagonal bonds by $(-1)$ to the number of crossings, relate a crossing pair and a parallel pair of dimers by a local move, and give an orientation whose Pfaffian is this signed sum up to sign. They say nothing about the sign of the sum, have no crossing polynomial and no checkerboard rule. Norine [2] and Tesler [3] give the sign of a perfect matching through the parity of its crossings in a drawing; for [2] and [3] we read the abstracts and search summaries, not the full text.

## Definitions

A board has the cells $(r, c)$ with $0 \le r < R$ and $0 \le c < C$. On a rectangle no coordinate is periodic. A cylinder of circumference $W$ has $C = W$ columns taken modulo $W$; a torus also takes the $R$ rows modulo $R$. A period is the circumference of a cylinder, or a side of a torus.

**Assumption P.** Every period is even and at least 4.

The king's graph $G$ of the board joins two different cells when each coordinate differs by at most 1, modulo the period where there is one. With periods at least 3 the steps $+1$ and $-1$ along a periodic direction reach different cells, so $G$ has no loops and no multiple edges. $H$ is a finite induced subgraph of $G$, and a tiling of $H$ is a perfect matching of $H$.

The unit square $q = (r, c)$ has the cells $a = (r, c)$, $b = (r, c+1)$, $d = (r+1, c)$ and $e = (r+1, c+1)$, four different cells because the periods are at least 3. Its diagonals are $ae$ and $bd$, its horizontal pair $h(q)$ is $ab, de$ and its vertical pair $v(q)$ is $ad, be$. A square of $H$ is a unit square whose four cells lie in $H$; since $H$ is induced, its diagonals and both pairs are edges of $H$. A unit square across a seam is counted like any other.

For a tiling $T$ of $H$, $x(T)$ is the number of squares of $H$ with both diagonals in $T$, the squares in which two diagonal pieces cross. The crossing polynomial is

```math
Z_H(t) = \sum_T t^{x(T)},
```

so $Z_H(1)$ counts the tilings and $Z_H(-1)$ is their sum with the crossing sign $(-1)^{x(T)}$. A tiling $T_0$ is crossing-free when $x(T_0) = 0$.

The checkerboard assignment gives the square $(r, c)$ the type $f(q) = h$ when $r + c$ is even and $f(q) = v$ when it is odd. It is well defined on a cylinder and a torus, since adding an even period to $r$ or $c$ keeps the parity of $r + c$. A square $q$ of $H$ is designated in $T_0$ when both edges of the pair $f(q)$ lie in $T_0$; $D(T_0)$ is the number of designated squares, and

```math
A_H(y) = \sum_{T_0 \text{ crossing-free}} y^{D(T_0)}.
```

## Lemma 1: each diagonal belongs to one square

Every diagonal edge of $G$ is a diagonal of exactly one unit square.

The edge $\{(r, c), (r+1, c+1)\}$ is the diagonal $ae$ of the square $(r, c)$, and $\{(r, c+1), (r+1, c)\}$ is its diagonal $bd$. If the same edge were a diagonal of another square, one of its cells would lie from the other both at $+1$ and at $-1$ along one direction, so the period would divide 2. Assumption P excludes that, and on a rectangle it cannot happen at all.

Hence the squares in which one tiling $T$ crosses are pairwise disjoint: a cell shared by two such squares $q$ and $q'$ is covered by one edge of $T$, that edge is then a diagonal of both, and $q = q'$ by Lemma 1.

## Lemma 2: designated squares are disjoint

In every tiling $T_0$, two different designated squares $q$ and $q'$ share no cell.

Suppose they share the cell $z$, covered by the edge $\varepsilon$ of $T_0$. The pair $f(q)$ lies in $T_0$ and covers the four cells of $q$, so $\varepsilon$ belongs to $f(q)$, and likewise to $f(q')$. Horizontal pairs have horizontal edges and vertical pairs vertical ones, so $f(q) = f(q')$.

If $f(q) = f(q') = h$, the edge $\varepsilon = \{(\rho, \gamma), (\rho, \gamma+1)\}$ lies in the horizontal pairs of only two squares, $(\rho, \gamma)$ and $(\rho-1, \gamma)$, since any other would need a period dividing 2. So $q$ and $q'$ are these two squares. Their coordinate sums differ by 1, also across the row seam of a torus, where $R - 1$ and $0$ have different parities because $R$ is even. So $f$ gives them different types, against $f(q) = f(q') = h$.

If $f(q) = f(q') = v$ the argument is the same with columns: the vertical edge $\{(\rho, \gamma), (\rho+1, \gamma)\}$ lies only in the vertical pairs of $(\rho, \gamma-1)$ and $(\rho, \gamma)$, whose types differ, also across the column seam, because $W$ is even.

## Theorem

Under Assumption P, for every finite induced subgraph $H$ of the king's graph,

```math
Z_H(t) = A_H(1 + t).
```

*Proof.* The map $\Phi$ takes a tiling $T$ to the pair $(T_0, S)$, where $S$ is the set of squares in which $T$ crosses and $T_0$ is $T$ with the two diagonals of each $q \in S$ replaced by the pair $f(q)$.

1. $T_0$ is a tiling of $H$. The squares of $S$ are disjoint (the corollary of Lemma 1), and in each of them the two removed and the two added edges cover the same four cells. The added edges are edges of $H$ because $H$ is induced.
2. $T_0$ is crossing-free. The added edges are horizontal or vertical, so a square with both diagonals in $T_0$ had them already in $T$ and lies in $S$; but the diagonals of the squares of $S$ were removed.
3. Every $q \in S$ is designated in $T_0$, since its pair $f(q)$ was added.

The map $\Psi$ takes a pair $(T_0, S)$ with $T_0$ crossing-free and $S$ a set of squares designated in $T_0$, and replaces the pair $f(q)$ of each $q \in S$ by the two diagonals of $q$.

4. The result $T$ is a tiling of $H$, because the squares of $S$ are disjoint (Lemma 2) and each replacement covers the same four cells.
5. The squares in which $T$ crosses are exactly those of $S$. Each $q \in S$ has both diagonals in $T$. A square $p$ with both diagonals in $T$ has at least one of them added, because $T_0$ was crossing-free; an added edge is a diagonal of some $q \in S$, so $p = q$ by Lemma 1.

The two maps are inverse to each other. For $\Phi(T) = (T_0, S)$ the edges of the pairs $f(q)$, $q \in S$, are exactly the edges $\Phi$ added, since in $T$ the diagonals covered the cells of $q$; so $\Psi$ gives back $T$. For $T = \Psi(T_0, S)$ the set of crossing squares is $S$ by step 5, so $\Phi(T)$ removes the diagonals of the squares of $S$, restores their pairs and returns $(T_0, S)$.

So $\Phi$ is a bijection from the tilings of $H$ onto the pairs $(T_0, S)$ with $T_0$ crossing-free and $S$ a subset of the squares designated in $T_0$, and $x(T) = |S|$. Hence

```math
Z_H(t) = \sum_T t^{x(T)} = \sum_{T_0} \sum_{S} t^{|S|} = \sum_{T_0} (1 + t)^{D(T_0)} = A_H(1 + t). \qquad \blacksquare
```

## Corollaries

Let $N_d$ be the number of crossing-free tilings with $d$ designated squares. Then

```math
Z_H(t) = \sum_d N_d (1 + t)^d,
```

so $Z_H$ has nonnegative integer coefficients in $u = 1 + t$, and the sum with the crossing sign is $Z_H(-1) = N_0 \ge 0$. If $H$ has a tiling, $A_H$ is a nonzero polynomial with nonnegative coefficients and $Z_H(t) > 0$ for every real $t > -1$. Without a tiling, for instance with an odd number of cells, $Z_H$ is identically 0.

On a rectangle the sum with the crossing sign of the whole board is, up to sign, the Pfaffian of the orientation of Wildeboer and Seidel [1] (see crossing sign in the [glossary](../../docs/glossary.md#signs)). The test in `js/test/core.test.js` computes that sum and that Pfaffian on ten boards from 2 × 2 to 12 × 12, and the sum is positive on each of them. By the theorem the sum is $N_0 \ge 0$, the number of crossing-free tilings with no designated square, on every rectangle and on every cylinder and torus whose periods are even and at least 4.

The coefficients $N_d$ also give lower bounds: for every $t \ge -1$ and every $k$, $\sum_{d \le k} N_d (1 + t)^d \le Z_H(t)$.

## Where the proof uses the assumptions

- $H$ induced: steps 1 and 4, where the pair $f(q)$ and the diagonals of $q$ have to be edges of $H$.
- Periods at least 3: no multiple edges, four different cells in a square, Lemma 1, and the two squares through a given edge in Lemma 2.
- Periods even: $f$ is well defined, and neighbours across a seam get different types in Lemma 2. An even period that is at least 3 is at least 4.

A period of 2 is excluded because the squares $(r, 0)$ and $(r, 1)$ of a cylinder of circumference 2 have the same four cells.

## Odd periods

On a cylinder of odd circumference $W \ge 3$ and height at least 3 the checkerboard rule fails at the column seam, and so does every other assignment of $h$ and $v$ to the squares. Take two rows of squares with no two stacked squares of type $h$ and no two side-by-side squares of type $v$. A row of $W$ squares around the cylinder with no two neighbours of type $v$ has at most $(W - 1)/2$ of them, so at least $(W + 1)/2$ of type $h$; the two rows then have more than $W$ squares of type $h$ in $W$ columns, and two of them are stacked. On a block of six cells around such a pair, three rows by two columns for two stacked $h$ and two rows by three columns for two side-by-side $v$, the identity fails (section `ng` of `check.py` for $W = 3$, 5 and 7; for $W \ge 5$ the block is the same graph whatever $W$ is).

Cylinders of height 2, with a single row of squares, are covered for every circumference $W \ge 3$ by the assignment $f \equiv h$: a horizontal edge lies in the horizontal pairs of two squares only when they are stacked, and a single row has no stacked squares, so Lemma 2 holds and the rest of the proof goes through unchanged.

Cylinders of odd circumference and height at least 3, and tori with an odd period, are open. On the induced subgraphs of section `odd`, `check.py` finds no negative value of $Z_H(-1)$. It also confirms there, without a proof here, that with the checkerboard rule designated squares conflict across the seam at most in pairs and $Z_H(t) = \sum_{T_0} (1 + t)^{a(T_0)} (1 + 2t)^{b(T_0)}$, with $a(T_0)$ the designated squares in no conflict and $b(T_0)$ the conflicting pairs. Since $1 + 2t = 2u - 1$, this formula alone does not give nonnegative coefficients in $u$.

## Computer checks

[`check.py`](check.py) needs only the Python standard library and shares no code with the solvers. It enumerates the tilings of each induced subgraph by brute force and checks Lemma 1, Lemma 2 on every crossing-free tiling, that $\Phi$ lands in the right pairs and that $\Psi$ inverts it, that the number of tilings equals $\sum_{T_0} 2^{D(T_0)}$, and that $Z_H(t)$ and $A_H(1 + t)$ agree coefficient by coefficient. Every output in [`out/`](out) ends with `TOTAL failures 0`.

| section | what it covers | output |
| --- | --- | --- |
| `even-a` | all induced subgraphs with an even number of cells of the rectangles 3 × 4 and 4 × 4, the cylinders of circumference 4 and height 3 and 4 and the 4 × 4 torus, and random ones of the rectangles 4 × 5 and 5 × 6 and of the cylinders of circumference 6: 109,600 subgraphs | [`out/check-even-a.txt`](out/check-even-a.txt) |
| `even-b` | 500 random induced subgraphs of the tori 4 × 6, 6 × 4 and 6 × 6 with each cell removed with probability 0.4 or 0.5 | [`out/check-even-b.txt`](out/check-even-b.txt) |
| `full` | 15 full boards: rectangles up to 4 × 6 and 2 × 16, cylinders of circumference 4, 6 and 8, the 4 × 4 torus | [`out/check-full.txt`](out/check-full.txt) |
| `odd` | cylinders of odd circumference: height 2 with $f \equiv h$, and the pair formula above at heights 3 and 4 | [`out/check-odd.txt`](out/check-odd.txt) |
| `ng` | every assignment of $h$ and $v$ to two rows of squares of circumference 3, 5 and 7 has two stacked $h$ or two side-by-side $v$, and the six-cell blocks where the identity fails | [`out/check-ng.txt`](out/check-ng.txt) |

Each section runs in about a minute or less with two worker processes and little memory:

```sh
python3 check.py even-a 2 > out/check-even-a.txt
```

and the same for `even-b`, `full`, `odd` and `ng`. The Research job of the continuous integration reruns `full`, `ng`, `odd` and `even-b` and compares them with the outputs here. The full boards also agree with the solvers: the rectangles 3 × 4 and 4 × 4 give the sums 15 and 92 with the crossing sign that `js/test/core.test.js` expects.

## References

1. J. Wildeboer and A. Seidel. Entanglement studies of resonating valence bonds on the frustrated square lattice. *Physical Review B* 101(22):224406, 2020. [doi:10.1103/PhysRevB.101.224406](https://doi.org/10.1103/PhysRevB.101.224406), [arXiv:1711.10717](https://arxiv.org/abs/1711.10717)
2. S. Norine. Pfaffian graphs, T-joins and crossing numbers. *Combinatorica* 28(1):89-98, 2008. [doi:10.1007/s00493-008-2150-2](https://doi.org/10.1007/s00493-008-2150-2)
3. G. Tesler. Matchings in graphs on non-orientable surfaces. *Journal of Combinatorial Theory, Series B* 78(2):198-231, 2000. [doi:10.1006/jctb.1999.1941](https://doi.org/10.1006/jctb.1999.1941)
