\\ Domicule tilings of the h X w cylinder = perfect matchings of the king's graph P_h X C_w (strong product);
\\ for w = 2 its multiple edges are counted as separate pieces; a(n) is OEIS A402163.
\\ R(w, c, f, t) lists the ways to finish a row whose filled cells are f from column c on, as the sets t
\\ of next-row cells they cover: a free cell is matched with its right neighbour (or, in column 0,
\\ with the last column across the seam), or with the cell below, below-left or below-right.
\\ M(w)[f+1, t+1] counts the transitions from f to t, and the cylinder count is the entry of M(w)^h from the empty row to the empty row.
R(w, c, f, t) = {
  my(v = []);
  if (c == w, return([t]));
  if (bittest(f, c), return(R(w, c+1, f, t)));
  if (c+1 < w && !bittest(f, c+1), v = concat(v, R(w, c+2, f + 2^c + 2^(c+1), t)));
  if (c == 0 && !bittest(f, w-1), v = concat(v, R(w, 1, f + 1 + 2^(w-1), t)));
  for (d = -1, 1, my(j = (c+d) % w); if (!bittest(t, j), v = concat(v, R(w, c+1, f + 2^c, t + 2^j))));
  v
};
M(w) = {
  my(A = matrix(2^w, 2^w));
  for (f = 0, 2^w-1, my(v = R(w, 0, f, 0)); for (i = 1, #v, A[f+1, v[i]+1]++));
  A
};
T(h, w) = (M(w)^h)[1, 1];
a(n) = (M(2*n)^(2*n))[1, 1];
