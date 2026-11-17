use std::env;
use std::process;

use lattice_dimers_core::BigInt;

const USAGE: &str = "Usage: b402345 <first n> <last n>";

fn trimmed(mut polynomial: Vec<BigInt>) -> Vec<BigInt> {
    while polynomial.len() > 1 && polynomial.last().is_some_and(BigInt::is_zero) {
        polynomial.pop();
    }

    polynomial
}

fn combine(a: &[BigInt], b: &[BigInt], subtract: bool) -> Vec<BigInt> {
    let zero = BigInt::zero();
    let terms = (0..a.len().max(b.len())).map(|i| {
        let (x, y) = (a.get(i).unwrap_or(&zero), b.get(i).unwrap_or(&zero));
        if subtract { x - y } else { x + y }
    });

    trimmed(terms.collect())
}

fn times_x(a: &[BigInt]) -> Vec<BigInt> {
    std::iter::once(BigInt::zero()).chain(a.iter().cloned()).collect()
}

fn recurrence(first: Vec<BigInt>, m: usize) -> Vec<BigInt> {
    let (mut previous, mut current) = (first, vec![BigInt::zero(), BigInt::from_u64(1)]);

    if m == 0 {
        return previous;
    }

    for _ in 1..m {
        let next = combine(&times_x(&current), &previous, true);
        previous = current;
        current = next;
    }

    current
}

fn shifted(a: &[BigInt], s: i64) -> Vec<BigInt> {
    let s = BigInt::from_i64(s);
    let mut result = vec![BigInt::zero()];

    for coefficient in a.iter().rev() {
        let scaled: Vec<BigInt> = result.iter().map(|c| c * &s).collect();
        result = combine(&combine(&times_x(&result), &scaled, false), std::slice::from_ref(coefficient), false);
    }

    result
}

fn resultant(p: &[BigInt], q: &[BigInt]) -> BigInt {
    let (m, n) = (p.len() - 1, q.len() - 1);
    let size = m + n;

    if size == 0 {
        return BigInt::from_u64(1);
    }

    let mut matrix = vec![vec![BigInt::zero(); size]; size];

    for i in 0..n {
        for j in 0..=m {
            matrix[i][i + j] = p[m - j].clone();
        }
    }

    for i in 0..m {
        for j in 0..=n {
            matrix[n + i][i + j] = q[n - j].clone();
        }
    }

    let mut negative = false;
    let mut previous = BigInt::from_u64(1);

    for k in 0..size - 1 {
        if matrix[k][k].is_zero() {
            let Some(row) = (k + 1..size).find(|&row| !matrix[row][k].is_zero()) else {
                return BigInt::zero();
            };
            matrix.swap(k, row);
            negative = !negative;
        }

        for i in k + 1..size {
            for j in k + 1..size {
                let value = &(&matrix[i][j] * &matrix[k][k]) - &(&matrix[i][k] * &matrix[k][j]);
                matrix[i][j] = &value / &previous;
            }
        }

        previous = matrix[k][k].clone();
    }

    let last = matrix[size - 1][size - 1].clone();

    if negative { last.negated() } else { last }
}

fn count(n: usize) -> BigInt {
    let chebyshev = recurrence(vec![BigInt::from_u64(1)], 2 * n);
    let p: Vec<BigInt> = chebyshev.into_iter().step_by(2).collect();
    let lucas = recurrence(vec![BigInt::from_u64(2)], n);
    let q = combine(&shifted(&lucas, 2), &[BigInt::from_u64(2)], false);

    resultant(&p, &q)
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

    for n in first..=last {
        println!("{n} {}", count(n));
    }
}
