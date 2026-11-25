\\ Tilings of the 2n X 2n torus on the triangular lattice (OEIS A399633) = perfect matchings of C_2n X C_2n with the diagonal
\\ (x, y) - (x+1 mod 2n, y+1 mod 2n); for n = 1 parallel edges count as separate pieces. K is the Kasteleyn matrix of
\\ A402693.gp on the torus, with the edges across the first seam negated when f is odd and across the second when f >= 2.
\\ a(n) is half the sum of the four |Pf(K)| = sqrtint(|det(K)|), as observed for n <= 40 (see README.md).
a(n) = {
  my(L = 2*n, t = 0, D = [1, 0; 0, 1; 1, 1]);
  if (n == 0, return(1));
  for (f = 0, 3,
    my(K = matrix(L^2, L^2));
    for (x = 0, L-1, for (y = 0, L-1, for (k = 1, 3,
      my(x2 = x + D[k, 1], y2 = y + D[k, 2], s);
      s = if (k < 3 && x % 2 == 0, -1, 1) * if (f % 2 && x2 == L, -1, 1) * if (f >= 2 && y2 == L, -1, 1);
      x2 %= L; y2 %= L;
      K[x*L + y + 1, x2*L + y2 + 1] += s;
      K[x2*L + y2 + 1, x*L + y + 1] -= s)));
    t += sqrtint(abs(matdet(K))));
  t / 2
};
