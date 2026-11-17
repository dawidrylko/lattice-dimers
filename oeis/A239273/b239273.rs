use std::env;
use std::process;
use std::thread;

use lattice_dimers_core::{BigInt, calculate_log2_bound, combine_checked_residues, list_primes, run_workers};

const USAGE: &str = "Usage: b239273 <first n> <last n>";

fn add(next: &mut [u32], target: usize, count: u32, prime: u32) {
    let sum = next[target] + count;
    next[target] = if sum >= prime { sum - prime } else { sum };
}

fn count_strips(cols: usize, rows: usize, prime: u32) -> Vec<u32> {
    let size = 1usize << (cols + 1);
    let (mut current, mut next) = (vec![0u32; size], vec![0u32; size]);
    let mut counts = Vec::with_capacity(rows);
    current[0] = 1;

    for _ in 0..rows {
        for c in 0..cols {
            let mut bits = vec![1usize << cols];

            if c + 1 < cols {
                bits.extend([2, 1 << (cols + 1)]);
            }

            if c > 0 {
                bits.push(1 << (cols - 1));
            }

            next.fill(0);

            for (state, &count) in current.iter().enumerate() {
                if count == 0 {
                    continue;
                }

                if state & 1 == 1 {
                    add(&mut next, state >> 1, count, prime);
                    continue;
                }

                for &bit in &bits {
                    if state & bit == 0 {
                        add(&mut next, (state | bit) >> 1, count, prime);
                    }
                }
            }

            std::mem::swap(&mut current, &mut next);
        }

        counts.push(current[0]);
    }

    counts
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
    let sides: Vec<usize> = (first.max(1)..=last).map(|n| 2 * n).collect();
    let primes: Vec<Vec<u32>> = sides
        .iter()
        .map(|&side| list_primes(((calculate_log2_bound(side, side) + 1.0) / 30.0).ceil() as usize + 1))
        .collect();
    let tasks: Vec<(usize, u32)> = sides.iter().zip(&primes).flat_map(|(&side, primes)| primes.iter().map(move |&prime| (side, prime))).collect();
    let jobs = thread::available_parallelism().map_or(1, |jobs| jobs.get());
    let results = run_workers(&tasks, jobs, |&(side, prime)| count_strips(side, side, prime)[side - 1]);
    let mut results = results.into_iter();

    for n in first..=last {
        let count = if n == 0 {
            BigInt::from_u64(1)
        } else {
            let primes = &primes[n - first.max(1)];
            let residues: Vec<u32> = results.by_ref().take(primes.len()).collect();
            combine_checked_residues(&residues, primes, false).unwrap_or_else(|message| {
                eprintln!("{message}");
                process::exit(1);
            })
        };

        println!("{n} {count}");
    }
}
