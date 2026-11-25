const TRI = [[1, 0], [0, 1], [1, 1]];

const mulmod = (a, b, p) => (a * b) % p;
function powmod(a, e, p) { let r = 1; a %= p; while (e > 0) { if (e & 1) r = mulmod(r, a, p); a = mulmod(a, a, p); e = Math.floor(e / 2); } return r; }
const invmod = (a, p) => powmod(a, p - 2, p);

function primitiveRoot(p) {
  const factors = [];
  let m = p - 1;
  for (let q = 2; q * q <= m; q++) if (m % q === 0) { factors.push(q); while (m % q === 0) m /= q; }
  if (m > 1) factors.push(m);
  for (let g = 2; ; g++) if (factors.every(q => powmod(g, (p - 1) / q, p) !== 1)) return g;
}

function primesOneModulo(modulus, count) {
  const out = [];
  for (let q = Math.floor((2 ** 26 - 2) / modulus) * modulus + 1; out.length < count; q -= modulus) {
    let ok = q > 2;
    for (let r = 2; r * r <= q; r++) if (q % r === 0) { ok = false; break; }
    if (ok) out.push(q);
  }
  return out;
}

function determinant(A, p) {
  const n = A.length;
  let d = 1;
  for (let i = 0; i < n; i++) {
    let r = i;
    while (r < n && !A[r][i]) r++;
    if (r === n) return 0;
    if (r !== i) { [A[r], A[i]] = [A[i], A[r]]; d = p - d; }
    d = mulmod(d, A[i][i], p);
    const inv = invmod(A[i][i], p);
    for (let k = i + 1; k < n; k++) if (A[k][i]) {
      const f = mulmod(A[k][i], inv, p);
      for (let c = i; c < n; c++) A[k][c] = (A[k][c] - mulmod(f, A[i][c], p) + p) % p;
    }
  }
  return d % p;
}

function pfaffian(A, p) {
  const n = A.length;
  let r = 1;
  for (let i = 0; i < n; i += 2) {
    let j = i + 1;
    while (j < n && !A[i][j]) j++;
    if (j === n) return 0;
    if (j !== i + 1) {
      [A[i + 1], A[j]] = [A[j], A[i + 1]];
      for (const row of A) [row[i + 1], row[j]] = [row[j], row[i + 1]];
      r = p - r;
    }
    const a = A[i][i + 1], inv = invmod(a, p);
    r = mulmod(r, a, p);
    const f = A.map((_, k) => k > i + 1 ? mulmod(A[i][k], inv, p) : 0);
    const g = A.map((_, k) => k > i + 1 ? mulmod((p - A[i + 1][k]) % p, inv, p) : 0);
    for (let x = i + 2; x < n; x++) for (let y = i + 2; y < n; y++) {
      const v = mulmod(f[y], A[x][i + 1], p) + mulmod(g[y], A[x][i], p);
      A[x][y] = (A[x][y] - v % p + p + mulmod(f[x], A[i + 1][y], p) + mulmod(g[x], A[i][y], p)) % p;
    }
  }
  return r % p;
}

function pfaffianModulo(L, s, t, p, w) {
  const z = e => powmod(w, ((e % (2 * L)) + 2 * L) % (2 * L), p);
  const block = e => {
    const A = Array.from({ length: L }, () => new Array(L).fill(0));
    for (let x = 0; x < L; x++) TRI.forEach(([dx, dy], k) => {
      const x2 = x + dx, sign = (k < 2 && x % 2 === 0 ? -1 : 1) * (s && x2 >= L ? -1 : 1), xx = x2 % L;
      A[x][xx] = (A[x][xx] + sign * z(-e * dy) + 2 * p) % p;
      A[xx][x] = (A[xx][x] - sign * z(e * dy) + 2 * p) % p;
    });
    return A;
  };
  const seen = new Set(), order = [];
  const pairSign = (L * (L - 1) / 2) % 2 ? p - 1 : 1;
  let result = 1;
  for (let m = 0; m < L; m++) {
    const e = 2 * m + t;
    if (seen.has(e)) continue;
    const e2 = (2 * L - e) % (2 * L);
    seen.add(e); seen.add(e2);
    if (e2 === e) {
      order.push(e);
      result = mulmod(result, mulmod(powmod(L, L / 2, p), pfaffian(block(e), p), p), p);
    } else {
      order.push(e, e2);
      result = mulmod(result, mulmod(pairSign, mulmod(powmod(L, L, p), determinant(block(e), p), p), p), p);
    }
  }
  let vandermonde = 1;
  for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) vandermonde = mulmod(vandermonde, (z(order[j]) - z(order[i]) + p) % p, p);
  return mulmod(result, invmod(powmod(vandermonde, L, p), p), p);
}

function combineSigned(residues, primes) {
  let r = 0n, m = 1n;
  residues.forEach((x, i) => {
    const P = BigInt(primes[i]);
    r += m * ((((BigInt(x) - r) % P + P) % P * BigInt(invmod(Number(m % P), primes[i]))) % P);
    m *= P;
  });
  return 2n * r > m ? r - m : r;
}

function count(n) {
  if (n === 0) return 1n;
  const L = 2 * n, bits = L * L * Math.log2(720) / 12 + 8;
  const primes = primesOneModulo(2 * L, Math.ceil(bits / 25) + 2);
  const check = primes.pop();
  const values = [];
  for (const s of [0, 1]) for (const t of [0, 1]) {
    const residues = [...primes, check].map(p => pfaffianModulo(L, s, t, p, powmod(primitiveRoot(p), (p - 1) / (2 * L), p)));
    const value = combineSigned(residues.slice(0, -1), primes);
    if (((value % BigInt(check)) + BigInt(check)) % BigInt(check) !== BigInt(residues.at(-1))) throw new Error(`check prime failed at n=${n}`);
    values.push(value);
  }
  const sum = values.reduce((a, b) => a + b, 0n);
  const abs = x => (x < 0n ? -x : x);
  return values.map(value => abs(sum - 2n * value) / 2n).reduce((a, b) => (b > a ? b : a));
}

const range = process.argv.slice(2);
if (range.length !== 2 || !range.every(arg => /^[0-9]+$/.test(arg)) || Number(range[0]) > Number(range[1])) {
  console.error('Usage: b399633.js <first n> <last n>');
  process.exit(2);
}
const [from, to] = range.map(Number);
for (let n = from; n <= to; n++) console.log(n, count(n).toString());
