const sub = (a, b) => { const n = Math.max(a.length, b.length), r = []; for (let i = 0; i < n; i++) r.push((a[i] || 0n) - (b[i] || 0n)); return r; };
const mulX = a => [0n, ...a];

function chebyU(m) {
  let f0 = [1n], f1 = [0n, 1n];
  if (m === 0) return f0;
  for (let k = 1; k < m; k++) [f0, f1] = [f1, sub(mulX(f1), f0)];
  return f1;
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
  const P = chebyU(2 * n).filter((_, i) => i % 2 === 0);
  const Q = P.map((c, i) => (i % 2 ? -c : c));
  const r = resultant(P, Q);
  return n % 2 ? -r : r;
}

const range = process.argv.slice(2);
if (range.length !== 2 || !range.every(arg => /^[0-9]+$/.test(arg)) || Number(range[0]) > Number(range[1])) {
  console.error('Usage: b004003.js <first n> <last n>');
  process.exit(2);
}
const [from, to] = range.map(Number);
for (let n = from; n <= to; n++) console.log(n, a(n).toString());
