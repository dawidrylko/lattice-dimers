const sub = (a, b) => { const n = Math.max(a.length, b.length), r = []; for (let i = 0; i < n; i++) r.push((a[i] || 0n) - (b[i] || 0n)); return r; };
const mulX = a => [0n, ...a];
const add = (a, b) => sub(a, b.map(c => -c));

function chebyU(m) {
  let f0 = [1n], f1 = [0n, 1n];
  if (m === 0) return f0;
  for (let k = 1; k < m; k++) [f0, f1] = [f1, sub(mulX(f1), f0)];
  return f1;
}

function lucasL(m) {
  let l0 = [2n], l1 = [0n, 1n];
  if (m === 0) return l0;
  for (let k = 1; k < m; k++) [l0, l1] = [l1, sub(mulX(l1), l0)];
  return l1;
}

function shift(a, s) {
  let r = [0n];
  for (let i = a.length - 1; i >= 0; i--) r = add(add(mulX(r), r.map(c => c * s)), [a[i]]);
  return r;
}

function resultant(p, q) {
  const m = p.length - 1, n = q.length - 1, N = m + n;
  if (N === 0) return 1n;
  const S = Array.from({ length: N }, () => new Array(N).fill(0n));
  for (let i = 0; i < n; i++) for (let j = 0; j <= m; j++) S[i][i + j] = p[m - j];
  for (let i = 0; i < m; i++) for (let j = 0; j <= n; j++) S[n + i][i + j] = q[n - j];
  let sign = 1n, prev = 1n;
  for (let k = 0; k < N - 1; k++) {
    if (S[k][k] === 0n) {
      const r = S.findIndex((row, i) => i > k && row[k] !== 0n);
      if (r < 0) return 0n;
      [S[k], S[r]] = [S[r], S[k]]; sign = -sign;
    }
    for (let i = k + 1; i < N; i++) for (let j = k + 1; j < N; j++) S[i][j] = (S[i][j] * S[k][k] - S[i][k] * S[k][j]) / prev;
    prev = S[k][k];
  }
  return sign * S[N - 1][N - 1];
}

function a(n) {
  const u = chebyU(2 * n), P = u.filter((_, i) => i % 2 === 0);
  const Q = add(shift(lucasL(n), 2n), [2n]);
  return resultant(P, Q);
}

const [from, to] = process.argv.slice(2).map(Number);
for (let n = from; n <= to; n++) console.log(n, a(n).toString());
