\\ Domicule tilings of an h X w board by the number of diagonal pieces: P(h, w) is a polynomial
\\ in x, whose coefficient of x^k counts the tilings with k pieces joining cells that share only a corner.
\\ The dynamic programming of A239273.gp, with a piece to the down-left or down-right neighbour weighted by x.
\\ The number of diagonal pieces is even, so row(n) lists the tilings of the 2n X 2n board with 0, 2, ..., 2n^2 of them.
P(h, w) = {
  my(S = 2^(w+2), v = vector(S), u);
  if (h*w == 0, return(1));
  v[1] = 1;
  for (p = 0, h*w-1,
    my(r = p\w, c = p%w, d = [], e = []);
    if (c+1 < w, d = concat(d, 1); e = concat(e, 1));
    if (r+1 < h,
      if (c > 0, d = concat(d, w-1); e = concat(e, x));
      d = concat(d, w); e = concat(e, 1);
      if (c+1 < w, d = concat(d, w+1); e = concat(e, x)));
    u = vector(S);
    for (s = 0, S-1,
      my(y = v[s+1]);
      if (y,
        if (bitand(s, 1),
          u[(s>>1) + 1] += y,
          for (i = 1, #d, if (!bittest(s, d[i]), my(t = (s + 2^d[i])>>1); u[t+1] += e[i]*y)))));
    v = u);
  v[1]
};
row(n) = my(q = P(2*n, 2*n)); vector(n^2+1, k, polcoef(q, 2*(k-1)));
