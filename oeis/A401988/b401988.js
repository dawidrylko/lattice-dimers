const O = [[[-1, -1], [1, 1]], [[-1, -1], [1, 1]], [[1, 1], [1, 1]]];
const TRI = [[1, 0], [0, 1], [1, 1]];

function edges(L) {
  const out = [];
  for (let x = 0; x < L; x++) for (let y = 0; y < L; y++) TRI.forEach(([dx, dy], k) => {
    const x2 = x + dx, y2 = y + dy;
    if (x2 < L && y2 < L) out.push([x * L + y, x2 * L + y2, O[k][x % 2][y % 2]]);
  });
  return out;
}

const mulmod = (a, b, p) => Number((BigInt(a) * BigInt(b)) % BigInt(p));
function powmod(a, e, p) { let r = 1; a %= p; while (e > 0) { if (e & 1) r = mulmod(r, a, p); a = mulmod(a, a, p); e = Math.floor(e / 2); } return r; }

function detBand(L, E, p) {
  const n = L * L, bl = L + 1, W = 3 * bl + 2;
  const A = Array.from({ length: n }, () => new Float64Array(W));
  const off = r => r - bl;
  const set = (r, c, v) => { A[r][c - off(r)] = ((v % p) + p) % p; };
  for (const [u, v, s] of E) { set(u, v, s); set(v, u, -s); }
  let d = 1;
  for (let i = 0; i < n; i++) {
    const last = Math.min(n - 1, i + bl);
    let piv = -1;
    for (let r = i; r <= last; r++) if (A[r][i - off(r)]) { piv = r; break; }
    if (piv < 0) return 0;
    const cmax = Math.min(n - 1, i + 2 * bl + 1);
    if (piv !== i) {
      const a = A[piv], b = A[i], tmp = new Float64Array(W);
      for (let c = i; c <= cmax; c++) { const ia = c - off(piv), ib = c - off(i); tmp[ib] = ia < W ? a[ia] : 0; }
      for (let c = i; c <= cmax; c++) { const ia = c - off(piv), ib = c - off(i); if (ia < W) a[ia] = ib < W ? b[ib] : 0; }
      for (let c = i; c <= cmax; c++) { const ib = c - off(i); b[ib] = tmp[ib]; }
      d = p - d;
    }
    const Ri = A[i], piv0 = Ri[i - off(i)];
    d = mulmod(d, piv0, p);
    const inv = powmod(piv0, p - 2, p);
    for (let r = i + 1; r <= last; r++) {
      const Rr = A[r], ir = i - off(r);
      if (!Rr[ir]) continue;
      const f = (Rr[ir] * inv) % p;
      for (let c = i; c <= cmax; c++) {
        const x = Ri[c - off(i)];
        if (x) { const j = c - off(r); Rr[j] = (Rr[j] - (f * x) % p + p) % p; }
      }
    }
  }
  return d % p;
}

function primesBelow(start, count) {
  const out = [];
  for (let q = start - 1; out.length < count; q--) {
    let ok = q > 1;
    for (let r = 2; r * r <= q; r++) if (q % r === 0) { ok = false; break; }
    if (ok) out.push(q);
  }
  return out;
}
function isqrt(n) { if (n < 2n) return n; let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2) + 1); for (;;) { const y = (x + n / x) / 2n; if (y >= x) return x; x = y; } }

const [from, to] = process.argv.slice(2).map(Number);
for (let n = from; n <= to; n++) {
  const L = 2 * n;
  if (L === 0) { console.log(n, '1'); continue; }
  const E = edges(L), bits = L * L * Math.log2(3) + 8;
  const ps = primesBelow(2 ** 26, Math.ceil(bits / 25) + 2);
  let r = 0n, m = 1n;
  for (const p of ps) {
    const x = BigInt(detBand(L, E, p)), P = BigInt(p);
    const t = (((x - r) % P + P) % P * BigInt(powmod(Number(m % P), p - 2, p))) % P;
    r += m * t; m *= P;
  }
  const s = isqrt(r);
  if (s * s !== r) throw new Error(`det not a square at n=${n}`);
  console.log(n, s.toString());
}
