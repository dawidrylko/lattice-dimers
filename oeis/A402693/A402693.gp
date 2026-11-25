\\ Tilings of the 2n X 2n cylinder on the triangular lattice (OEIS A402693) = perfect matchings of P_2n X C_2n with the diagonal
\\ edges (x, y) - (x+1, y+1 mod 2n); for n = 1 the two edges of C_2 count as separate pieces. K is the Kasteleyn matrix of
\\ A401988.gp on the cylinder, with the edges across the seam negated when f = 1. The cylinder is planar, so one of the
\\ two Pfaffians is the number of tilings up to sign and the other the difference between the tilings with an even and an
\\ odd number of pieces across the seam; det(K) = Pf(K)^2, and the larger determinant is a(n)^2.
a(n) = {
  my(L = 2*n, d = 0, D = [1, 0; 0, 1; 1, 1]);
  if (n == 0, return(1));
  for (f = 0, 1,
    my(K = matrix(L^2, L^2));
    for (x = 0, L-1, for (y = 0, L-1, for (k = 1, 3,
      my(x2 = x + D[k, 1], y2 = y + D[k, 2], s);
      if (x2 < L,
        s = if (k < 3 && x % 2 == 0, -1, 1) * if (f && y2 == L, -1, 1);
        y2 %= L;
        K[x*L + y + 1, x2*L + y2 + 1] += s;
        K[x2*L + y2 + 1, x*L + y + 1] -= s))));
    d = max(d, abs(matdet(K))));
  sqrtint(d)
};
