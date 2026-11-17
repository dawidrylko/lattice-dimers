use std::collections::BTreeMap;
use std::env;
use std::process;
use std::thread;

use lattice_dimers_core::{BigInt, calculate_log2_bound, combine_checked_residues, list_primes, run_workers};

const USAGE: &str = "Usage: b401673 <first n> <last n>";

fn evaluate(cols: usize, prime: u32, weight: u64) -> u32 {
    let size = 1usize << (cols + 1);
    let (mut current, mut next) = (vec![0u32; size], vec![0u32; size]);
    let moves: Vec<Vec<(usize, u64)>> = (0..cols)
        .map(|c| {
            let mut list = vec![(1 << cols, 1)];

            if c + 1 < cols {
                list.extend([(2, 1), (1 << (cols + 1), weight)]);
            }

            if c > 0 {
                list.push((1 << (cols - 1), weight));
            }

            list
        })
        .collect();
    current[0] = 1;

    for cell in 0..cols * cols {
        next.fill(0);

        for (state, &count) in current.iter().enumerate() {
            if count == 0 {
                continue;
            }

            if state & 1 == 1 {
                let sum = next[state >> 1] + count;
                next[state >> 1] = if sum >= prime { sum - prime } else { sum };
                continue;
            }

            for &(bit, factor) in &moves[cell % cols] {
                if state & bit == 0 {
                    let target = (state | bit) >> 1;
                    next[target] = ((u64::from(next[target]) + u64::from(count) * factor) % u64::from(prime)) as u32;
                }
            }
        }

        std::mem::swap(&mut current, &mut next);
    }

    current[0]
}

fn power(mut base: u64, mut exponent: u64, modulus: u64) -> u64 {
    let mut result = 1;

    while exponent > 0 {
        if exponent & 1 == 1 {
            result = result * base % modulus;
        }

        base = base * base % modulus;
        exponent >>= 1;
    }

    result
}

fn interpolate(values: &[u32], prime: u32) -> Vec<u32> {
    let p = u64::from(prime);
    let degree = values.len() - 1;
    let points: Vec<u64> = (0..=degree as u64).map(|j| j * j % p).collect();
    let mut master = vec![1u64];

    for &u in &points {
        let mut next = vec![0u64; master.len() + 1];

        for (i, &m) in master.iter().enumerate() {
            next[i + 1] = (next[i + 1] + m) % p;
            next[i] = (next[i] + p - u * m % p) % p;
        }

        master = next;
    }

    let mut result = vec![0u64; degree + 1];

    for (j, &u) in points.iter().enumerate() {
        let mut quotient = vec![0u64; degree + 1];
        quotient[degree] = master[degree + 1];

        for i in (1..=degree).rev() {
            quotient[i - 1] = (master[i] + u * quotient[i]) % p;
        }

        let denominator = quotient.iter().rev().fold(0, |sum, &q| (sum * u + q) % p);
        let factor = u64::from(values[j]) * power(denominator, p - 2, p) % p;

        for (r, &q) in result.iter_mut().zip(&quotient) {
            *r = (*r + factor * q) % p;
        }
    }

    result.into_iter().map(|r| r as u32).collect()
}

fn row_start(n: usize) -> usize {
    (n * (n + 1) * (2 * n + 1)) / 6 - n * n + n
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
    let mut terms = Vec::new();
    let mut n = 0;

    for i in first..=last {
        while row_start(n + 1) <= i {
            n += 1;
        }

        terms.push((n, i - row_start(n)));
    }

    let mut sides: Vec<usize> = terms.iter().map(|&(n, _)| n).filter(|&n| n > 0).collect();
    sides.dedup();
    let primes: BTreeMap<usize, Vec<u32>> = sides
        .iter()
        .map(|&n| (n, list_primes(((calculate_log2_bound(2 * n, 2 * n) + 1.0) / 30.0).ceil() as usize + 1)))
        .collect();
    let tasks: Vec<(usize, u32, u64)> = sides
        .iter()
        .flat_map(|&n| primes[&n].iter().flat_map(move |&prime| (0..=(n * n) as u64).map(move |weight| (n, prime, weight))))
        .collect();
    let results = run_workers(&tasks, jobs, |&(n, prime, weight)| evaluate(2 * n, prime, weight));
    let mut values: BTreeMap<(usize, u32), Vec<u32>> = BTreeMap::new();

    for (&(n, prime, _), value) in tasks.iter().zip(results) {
        values.entry((n, prime)).or_default().push(value);
    }

    let coefficients: BTreeMap<usize, Vec<Vec<u32>>> = sides
        .iter()
        .map(|&n| (n, primes[&n].iter().map(|&prime| interpolate(&values[&(n, prime)], prime)).collect()))
        .collect();

    for (i, &(n, k)) in (first..).zip(&terms) {
        let count = if n == 0 {
            BigInt::from_u64(1)
        } else {
            let residues: Vec<u32> = coefficients[&n].iter().map(|row| row[k]).collect();
            combine_checked_residues(&residues, &primes[&n], false).unwrap_or_else(|message| {
                eprintln!("{message}");
                process::exit(1);
            })
        };

        println!("{i} {count}");
    }
}
