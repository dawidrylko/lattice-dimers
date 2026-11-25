use std::env;
use std::process;
use std::thread;

use lattice_dimers_core::{BigInt, combine_checked_residues, pfaffian_modulo, run_workers};

const USAGE: &str = "Usage: b399633 <first n> <last n>";
const STEPS: [(usize, usize); 3] = [(1, 0), (0, 1), (1, 1)];

fn pow_mod(base: u64, mut exponent: u64, modulus: u64) -> u64 {
    let mut result = 1 % modulus;
    let mut base = base % modulus;

    while exponent > 0 {
        if exponent & 1 == 1 {
            result = result * base % modulus;
        }

        base = base * base % modulus;
        exponent >>= 1;
    }

    result
}

fn is_prime(n: u64) -> bool {
    if n < 2 || n.is_multiple_of(2) {
        return n == 2;
    }

    let mut d = 3;

    while d * d <= n {
        if n.is_multiple_of(d) {
            return false;
        }

        d += 2;
    }

    true
}

fn list_primes_one_modulo(modulus: u64, count: usize) -> Vec<u32> {
    let mut primes = Vec::new();
    let mut q = ((1u64 << 31) - 2) / modulus * modulus + 1;

    while primes.len() < count {
        if is_prime(q) {
            primes.push(q as u32);
        }

        q -= modulus;
    }

    primes
}

fn primitive_root(prime: u64) -> u64 {
    let mut factors = Vec::new();
    let mut m = prime - 1;
    let mut q = 2;

    while q * q <= m {
        if m.is_multiple_of(q) {
            factors.push(q);

            while m.is_multiple_of(q) {
                m /= q;
            }
        }

        q += 1;
    }

    if m > 1 {
        factors.push(m);
    }

    (2..).find(|&g| factors.iter().all(|&q| pow_mod(g, (prime - 1) / q, prime) != 1)).unwrap()
}

fn determinant(a: &mut [u64], size: usize, prime: u64) -> u64 {
    let mut result = 1;

    for i in 0..size {
        let Some(pivot) = (i..size).find(|&row| a[row * size + i] != 0) else {
            return 0;
        };

        if pivot != i {
            for col in i..size {
                a.swap(i * size + col, pivot * size + col);
            }

            result = prime - result;
        }

        let pivot_value = a[i * size + i];
        let inverse = pow_mod(pivot_value, prime - 2, prime);
        result = result * pivot_value % prime;

        for row in i + 1..size {
            let lead = a[row * size + i];

            if lead == 0 {
                continue;
            }

            let factor = lead * inverse % prime;

            for col in i..size {
                let product = factor * a[i * size + col] % prime;
                let value = a[row * size + col];
                a[row * size + col] = if value >= product { value - product } else { value + prime - product };
            }
        }
    }

    result
}

fn pfaffian(side: usize, seam_x: bool, seam_y: usize, prime: u32) -> u32 {
    let p = u64::from(prime);
    let period = 2 * side;
    let root = pow_mod(primitive_root(p), (p - 1) / period as u64, p);
    let powers: Vec<u64> = (0..period).scan(1, |power, _| {
        let current = *power;
        *power = *power * root % p;
        Some(current)
    }).collect();
    let z = |exponent: i64| powers[exponent.rem_euclid(period as i64) as usize];

    let block = |exponent: i64| {
        let mut a = vec![0u64; side * side];

        for x in 0..side {
            for (step, (dx, dy)) in STEPS.into_iter().enumerate() {
                let x2 = x + dx;
                let flip = (step < 2 && x % 2 == 0) != (seam_x && x2 >= side);
                let x2 = x2 % side;
                let forward = z(-exponent * dy as i64);
                let backward = z(exponent * dy as i64);
                let (forward, backward) = if flip { (p - forward, backward) } else { (forward, p - backward) };
                a[x * side + x2] = (a[x * side + x2] + forward) % p;
                a[x2 * side + x] = (a[x2 * side + x] + backward) % p;
            }
        }

        a
    };

    let pair_sign = if (side * (side - 1) / 2) % 2 == 1 { p - 1 } else { 1 };
    let mut seen = vec![false; period];
    let mut order = Vec::new();
    let mut result = 1u64;

    for m in 0..side {
        let exponent = 2 * m + seam_y;

        if seen[exponent] {
            continue;
        }

        let partner = (period - exponent) % period;
        seen[exponent] = true;
        seen[partner] = true;

        if partner == exponent {
            order.push(exponent);
            let mut a: Vec<u32> = block(exponent as i64).into_iter().map(|value| value as u32).collect();
            let value = u64::from(pfaffian_modulo(&mut a, side, prime));
            result = result * pow_mod(side as u64, side as u64 / 2, p) % p * value % p;
        } else {
            order.push(exponent);
            order.push(partner);
            let value = determinant(&mut block(exponent as i64), side, p);
            result = result * pair_sign % p * pow_mod(side as u64, side as u64, p) % p * value % p;
        }
    }

    let mut vandermonde = 1u64;

    for i in 0..order.len() {
        for j in i + 1..order.len() {
            vandermonde = vandermonde * ((z(order[j] as i64) + p - z(order[i] as i64)) % p) % p;
        }
    }

    let denominator = pow_mod(vandermonde, side as u64, p);
    (result * pow_mod(denominator, p - 2, p) % p) as u32
}

fn count(n: usize, jobs: usize) -> BigInt {
    if n == 0 {
        return BigInt::from_u64(1);
    }

    let side = 2 * n;
    let bits = (side * side) as f64 * 720f64.log2() / 12.0 + 8.0;
    let primes = list_primes_one_modulo(2 * side as u64, (bits / 30.0) as usize + 2);
    let mut values = Vec::new();

    for seam_x in [false, true] {
        for seam_y in [0, 1] {
            let residues = run_workers(&primes, jobs, |&prime| pfaffian(side, seam_x, seam_y, prime));
            let value = combine_checked_residues(&residues, &primes, true).unwrap_or_else(|error| {
                eprintln!("The Pfaffian of n = {n} failed: {error}");
                process::exit(1);
            });
            values.push(value);
        }
    }

    let total = values.iter().fold(BigInt::zero(), |sum, value| &sum + value);
    let two = BigInt::from_u64(2);
    let best = values
        .iter()
        .map(|value| {
            let combination = &total - &(&two * value);
            if combination.is_negative() { combination.negated() } else { combination }
        })
        .max_by(|a, b| a.cmp_magnitude(b))
        .unwrap();

    &best / &two
}

fn read_range() -> (usize, usize) {
    let args: Vec<String> = env::args().skip(1).collect();
    let numbers: Vec<usize> = args
        .iter()
        .filter(|arg| !arg.is_empty() && arg.bytes().all(|byte| byte.is_ascii_digit()))
        .filter_map(|arg| arg.parse().ok())
        .collect();

    match numbers[..] {
        [first, last] if args.len() == 2 && first <= last => (first, last),
        _ => {
            eprintln!("{USAGE}");
            process::exit(2);
        }
    }
}

fn main() {
    let (first, last) = read_range();
    let jobs = thread::available_parallelism().map_or(1, |jobs| jobs.get());

    for n in first..=last {
        println!("{n} {}", count(n, jobs));
    }
}
