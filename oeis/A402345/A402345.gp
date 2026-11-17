\\ Domino tilings of the 2n X 2n cylinder (OEIS A402345), the perfect matchings of P_2n X C_2n, as a resultant;
\\ for n = 1 the two edges of C_2 count as separate pieces.
\\ P is the polynomial of A004003.gp, with the roots 4*cos(j*Pi/(2n+1))^2 for j = 1..n;
\\ Q(x) = 2*T(n, (x+2)/2) + 2 has the roots -4*sin((2k-1)*Pi/(2n))^2 for k = 1..n, the antiperiodic seam of the Kasteleyn matrix.
a(n) = my(P = substpol(polchebyshev(2*n, 2, x/2), x^2, x)); polresultant(P, subst(2*polchebyshev(n, 1, x/2) + 2, x, x + 2));
