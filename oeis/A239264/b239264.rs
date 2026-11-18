use std::collections::BTreeMap;
use std::env;
use std::process;
use std::thread;

use lattice_dimers_core::{BigInt, calculate_log2_bound, combine_checked_residues, list_primes, run_workers};

const USAGE: &str = "Usage: b239264 <first n> <last n>";

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

fn board(n: usize) -> (usize, usize) {
    let mut d = 0;

    while (d + 1) * (d + 2) / 2 <= n {
        d += 1;
    }

    let h = n - d * (d + 1) / 2;

    (h.min(d - h), h.max(d - h))
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
    let boards: Vec<(usize, usize)> = (first..=last).map(board).collect();
    let mut longest = BTreeMap::new();

    for &(cols, rows) in &boards {
        if cols > 0 && (cols * rows) % 2 == 0 {
            let entry = longest.entry(cols).or_insert(rows);
            *entry = rows.max(*entry);
        }
    }

    let primes: BTreeMap<usize, Vec<u32>> = longest
        .iter()
        .map(|(&cols, &rows)| (cols, list_primes(((calculate_log2_bound(rows, cols) + 1.0) / 30.0).ceil() as usize + 1)))
        .collect();
    let tasks: Vec<(usize, usize, u32)> = longest.iter().flat_map(|(&cols, &rows)| primes[&cols].iter().map(move |&prime| (cols, rows, prime))).collect();
    let jobs = thread::available_parallelism().map_or(1, |jobs| jobs.get());
    let results = run_workers(&tasks, jobs, |&(cols, rows, prime)| count_strips(cols, rows, prime));
    let mut residues: BTreeMap<usize, Vec<Vec<u32>>> = BTreeMap::new();

    for (&(cols, _, _), counts) in tasks.iter().zip(results) {
        residues.entry(cols).or_default().push(counts);
    }

    for (n, &(cols, rows)) in (first..).zip(&boards) {
        let count = if cols == 0 {
            BigInt::from_u64(1)
        } else if (cols * rows) % 2 == 1 {
            BigInt::zero()
        } else {
            let row: Vec<u32> = residues[&cols].iter().map(|counts| counts[rows - 1]).collect();
            combine_checked_residues(&row, &primes[&cols], false).unwrap_or_else(|message| {
                eprintln!("{message}");
                process::exit(1);
            })
        };

        println!("{n} {count}");
    }
}
