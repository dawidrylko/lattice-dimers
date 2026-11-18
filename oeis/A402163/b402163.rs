use std::collections::BTreeMap;
use std::env;
use std::process;
use std::thread;

use lattice_dimers_core::{BigInt, combine_checked_residues, list_primes, run_workers};

const USAGE: &str = "Usage: b402163 <first n> <last n>";

fn add(next: &mut [u32], target: usize, count: u32, prime: u32) {
    let sum = next[target] + count;
    next[target] = if sum >= prime { sum - prime } else { sum };
}

fn count_rows(cols: usize, rows: usize, start: usize, prime: u32) -> u32 {
    let corner = if cols >= 3 { 1usize << (cols + 2) } else { 0 };
    let top = 1usize << (cols + 1);
    let size = 4 * top;
    let moves: Vec<Vec<usize>> = (0..cols)
        .map(|c| {
            let mut bits = vec![1 << cols, 2];

            if c + 1 < cols {
                bits.push(1 << (cols + 1));
            }

            if c > 0 {
                bits.push(1 << (cols - 1));
            }

            if c == 0 {
                bits.extend([1 << (cols - 1), if corner > 0 { corner } else { 1 << (2 * cols - 1) }]);
            }

            bits
        })
        .collect();
    let (mut current, mut next) = (vec![0u32; size], vec![0u32; size]);
    current[start] = 1;

    for cell in 0..rows * cols {
        let c = cell % cols;
        next.fill(0);

        for (state, &count) in current.iter().enumerate() {
            if count == 0 {
                continue;
            }

            let flag = state & corner;
            let window = state - flag;

            if window & 1 == 1 {
                add(&mut next, flag + (window >> 1), count, prime);
                continue;
            }

            for &bit in &moves[c] {
                if bit == corner {
                    add(&mut next, corner + (window >> 1), count, prime);
                } else if window & bit == 0 {
                    add(&mut next, flag + ((window | bit) >> 1), count, prime);
                }
            }
        }

        if corner > 0 && c == cols - 3 {
            for state in corner..size {
                if next[state] != 0 {
                    next[state - corner + top] = next[state];
                    next[state] = 0;
                }
            }
        }

        std::mem::swap(&mut current, &mut next);
    }

    current[start]
}

fn log2_bound(cols: usize) -> f64 {
    if cols < 3 {
        return (cols * cols) as f64 / 2.0 * 5f64.log2();
    }

    let share = |degree: usize| (2..=degree).map(|k| (k as f64).log2()).sum::<f64>() / (2 * degree) as f64;

    cols as f64 * (2.0 * share(5) + (cols - 2) as f64 * share(8))
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
    let sides: Vec<usize> = (first.max(1)..=last).map(|n| 2 * n).collect();
    let primes: BTreeMap<usize, Vec<u32>> = sides
        .iter()
        .map(|&cols| (cols, list_primes(((log2_bound(cols) + 1.0) / 30.0).ceil() as usize + 1)))
        .collect();
    let tasks: Vec<(usize, u32)> = sides.iter().flat_map(|&cols| primes[&cols].iter().map(move |&prime| (cols, prime))).collect();
    let results = run_workers(&tasks, jobs, |&(cols, prime)| count_rows(cols, cols, 0, prime));
    let mut residues: BTreeMap<usize, Vec<u32>> = BTreeMap::new();

    for (&(cols, _), residue) in tasks.iter().zip(results) {
        residues.entry(cols).or_default().push(residue);
    }

    for n in first..=last {
        let count = if n == 0 {
            BigInt::from_u64(1)
        } else {
            combine_checked_residues(&residues[&(2 * n)], &primes[&(2 * n)], false).unwrap_or_else(|message| {
                eprintln!("{message}");
                process::exit(1);
            })
        };

        println!("{n} {count}");
    }
}
