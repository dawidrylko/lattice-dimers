use std::cmp::Ordering;
use std::env;
use std::process;
use std::thread;

use lattice_dimers_core::{BigInt, combine_checked_residues, list_primes, run_workers};

const USAGE: &str = "Usage: b402693 <first n> <last n>";

struct Edge {
    from: usize,
    to: usize,
    sign: i64,
}

fn list_edges(side: usize, flip: bool) -> Vec<Edge> {
    let mut edges = Vec::new();

    for x in 0..side {
        for y in 0..side {
            for (step, (dx, dy)) in [(1, 0), (0, 1), (1, 1)].into_iter().enumerate() {
                let (x2, y2) = (x + dx, y + dy);

                if x2 < side {
                    let sign = if step < 2 && x % 2 == 0 { -1 } else { 1 };
                    let sign = if flip && y2 >= side { -sign } else { sign };
                    edges.push(Edge { from: x * side + y, to: x2 * side + y2 % side, sign });
                }
            }
        }
    }

    edges
}

fn log2_determinant_bound(vertices: usize, edges: &[Edge]) -> f64 {
    let mut degrees = vec![0usize; vertices];

    for edge in edges {
        degrees[edge.from] += 1;
        degrees[edge.to] += 1;
    }

    degrees
        .iter()
        .filter(|&&degree| degree > 0)
        .map(|&degree| (2..=degree).map(|k| (k as f64).log2()).sum::<f64>() / degree as f64)
        .sum()
}

fn pow_mod(base: u64, mut exponent: u64, modulus: u64) -> u64 {
    let mut result = 1;
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

fn determinant(side: usize, edges: &[Edge], prime: u64) -> u64 {
    let size = side * side;
    let lower = side + 1;
    let width = 3 * lower + 2;
    let at = move |row: usize, col: usize| row * width + col + lower - row;
    let mut band = vec![0u64; size * width];

    for edge in edges {
        let sign = edge.sign.rem_euclid(prime as i64) as u64;
        band[at(edge.from, edge.to)] = (band[at(edge.from, edge.to)] + sign) % prime;
        band[at(edge.to, edge.from)] = (band[at(edge.to, edge.from)] + prime - sign) % prime;
    }

    let mut result = 1;

    for i in 0..size {
        let last = (size - 1).min(i + lower);
        let end = (size - 1).min(i + 2 * lower + 1);
        let Some(pivot) = (i..=last).find(|&row| band[at(row, i)] != 0) else {
            return 0;
        };

        if pivot != i {
            for col in i..=end {
                band.swap(at(i, col), at(pivot, col));
            }

            result = prime - result;
        }

        let pivot_value = band[at(i, i)];
        let inverse = pow_mod(pivot_value, prime - 2, prime);
        result = result * pivot_value % prime;

        for row in i + 1..=last {
            let lead = band[at(row, i)];

            if lead == 0 {
                continue;
            }

            let factor = lead * inverse % prime;
            let (above, below) = band.split_at_mut(row * width);
            let source = &above[at(i, i)..=at(i, end)];
            let target = &mut below[at(row, i) - row * width..=at(row, end) - row * width];

            for (value, &x) in target.iter_mut().zip(source) {
                if x != 0 {
                    let product = factor * x % prime;
                    *value = if *value >= product { *value - product } else { *value + prime - product };
                }
            }
        }
    }

    result
}

fn square_root(square: &BigInt) -> Option<BigInt> {
    if square.is_zero() {
        return Some(BigInt::zero());
    }

    let two = BigInt::from_u64(2);
    let digits = square.to_string().len();
    let mut root = (0..digits.div_ceil(2)).fold(BigInt::from_u64(1), |power, _| power.mul_small(10));

    loop {
        let next = &(&root + &(square / &root)) / &two;

        if next.cmp_magnitude(&root) != Ordering::Less {
            break;
        }

        root = next;
    }

    (&root * &root == *square).then_some(root)
}

fn count(n: usize, jobs: usize) -> BigInt {
    if n == 0 {
        return BigInt::from_u64(1);
    }

    let side = 2 * n;
    let mut square = BigInt::zero();

    for flip in [false, true] {
        let edges = list_edges(side, flip);
        let bits = log2_determinant_bound(side * side, &edges);
        let primes = list_primes((bits / 30.0) as usize + 2);
        let residues = run_workers(&primes, jobs, |&prime| determinant(side, &edges, u64::from(prime)) as u32);
        let value = combine_checked_residues(&residues, &primes, false).unwrap_or_else(|error| {
            eprintln!("The determinant of n = {n} failed: {error}");
            process::exit(1);
        });

        if value.cmp_magnitude(&square) == Ordering::Greater {
            square = value;
        }
    }

    square_root(&square).unwrap_or_else(|| {
        eprintln!("The determinant of n = {n} is not a square.");
        process::exit(1);
    })
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
