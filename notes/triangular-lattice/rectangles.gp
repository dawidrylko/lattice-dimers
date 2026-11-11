\\ Tilings of the 2n X 2n board on the triangular lattice = perfect matchings of the grid graph with the diagonal
\\ edges (x, y) - (x+1, y+1). K is a Kasteleyn matrix: the edges (1, 0) and (0, 1) from a cell with even x carry
\\ the sign -1, every other edge +1, and every triangular face then has an odd number of clockwise edges, so
\\ det(K) = Pf(K)^2 is the square of the number of tilings.
a(n) = {
  my(L = 2*n, K = matrix(L^2, L^2), D = [1, 0; 0, 1; 1, 1]);
  if (n == 0, return(1));
  for (x = 0, L-1, for (y = 0, L-1, for (k = 1, 3,
    my(x2 = x + D[k, 1], y2 = y + D[k, 2], s);
    if (x2 < L && y2 < L,
      s = if (k < 3 && x % 2 == 0, -1, 1);
      K[x*L + y + 1, x2*L + y2 + 1] = s;
      K[x2*L + y2 + 1, x*L + y + 1] = -s))));
  sqrtint(matdet(K))
};
