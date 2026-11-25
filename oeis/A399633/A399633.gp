\\ Tilings of the 2n X 2n torus on the triangular lattice (OEIS A399633) = perfect matchings of C_2n X C_2n with the diagonal
\\ edges (x, y) - (x+1 mod 2n, y+1 mod 2n); for n = 1 parallel edges count as separate pieces. K is the Kasteleyn matrix of
\\ A402693.gp on the torus, with the edges across the first seam negated when f is odd and across the second when f >= 2.
\\ Half of a sum of the four Pfaffians with one of them negated counts each tiling once with a sign, and by Kasteleyn's
\\ theorem for the torus one of the four is +-a(n), so a(n) is the largest in absolute value. pf(A) is the Pfaffian,
\\ eliminating two rows at a time.
pf(A) = {
  my(n = #A, r = 1, j, a, x, y, p);
  forstep (i = 1, n, 2,
    j = i + 1;
    while (j <= n && !A[i, j], j++);
    if (j > n, return(0));
    if (j > i + 1, p = vector(n, k, k); p[i + 1] = j; p[j] = i + 1; A = vecextract(A, p, p); r = -r);
    a = A[i, i + 1]; r *= a;
    x = vector(n, k, if (k > i + 1, A[i, k] / a)); y = vector(n, k, if (k > i + 1, A[i + 1, k]));
    for (k = i + 2, n, for (l = i + 2, n, A[k, l] -= x[k]*y[l] - y[k]*x[l])));
  r
};
a(n) = {
  my(L = 2*n, P = vector(4), S, D = [1, 0; 0, 1; 1, 1]);
  if (n == 0, return(1));
  for (f = 0, 3,
    my(K = matrix(L^2, L^2));
    for (x = 0, L-1, for (y = 0, L-1, for (k = 1, 3,
      my(x2 = x + D[k, 1], y2 = y + D[k, 2], s);
      s = if (k < 3 && x % 2 == 0, -1, 1) * if (f % 2 && x2 == L, -1, 1) * if (f >= 2 && y2 == L, -1, 1);
      x2 %= L; y2 %= L;
      K[x*L + y + 1, x2*L + y2 + 1] += s;
      K[x2*L + y2 + 1, x*L + y + 1] -= s)));
    P[f + 1] = pf(K));
  S = vecsum(P);
  vecmax(vector(4, i, abs(S - 2*P[i]))) / 2
};
