use std::env;
use std::process;

use lattice_dimers_core::BigInt;

const USAGE: &str = "Usage: b004003 <first n> <last n>";

fn chebyshev(m: usize) -> Vec<BigInt> {
    let (mut previous, mut current) = (vec![BigInt::from_u64(1)], vec![BigInt::zero(), BigInt::from_u64(1)]);

    if m == 0 {
        return previous;
    }

    for _ in 1..m {
        let zero = BigInt::zero();
        let next = (0..=current.len())
            .map(|i| {
                let raised = if i == 0 { &zero } else { &current[i - 1] };
                raised - previous.get(i).unwrap_or(&zero)
            })
            .collect();
        previous = current;
        current = next;
    }

    current
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
    let p: Vec<BigInt> = chebyshev(2 * n).into_iter().step_by(2).collect();
    let q: Vec<BigInt> = p.iter().enumerate().map(|(i, c)| if i % 2 == 1 { c.negated() } else { c.clone() }).collect();
    let result = resultant(&p, &q);

    if n % 2 == 1 { result.negated() } else { result }
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
