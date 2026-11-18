use std::collections::BTreeMap;
use std::env;
use std::process;
use std::thread;

use lattice_dimers_core::{BigInt, combine_checked_residues, list_primes, run_workers};

const USAGE: &str = "Usage: b401670 <first n> <last n>";

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

fn count_tilings(cols: usize, prime: u32, orbits: &[(usize, u64)]) -> u32 {
    let total = orbits
        .iter()
        .fold(0u64, |total, &(start, weight)| (total + weight * u64::from(count_rows(cols, cols, start, prime))) % u64::from(prime));

    total as u32
}

fn log2_bound(cols: usize) -> f64 {
    let cells = (cols * cols) as f64;

    if cols < 3 {
        return cells / 2.0 * 5f64.log2() + cols as f64;
    }

    let share = |degree: usize| (2..=degree).map(|k| (k as f64).log2()).sum::<f64>() / (2 * degree) as f64;

    cells * share(8)
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

fn list_orbits(cols: usize) -> Vec<(usize, u64)> {
    let full = (1usize << cols) - 1;
    let rotate = |set: usize| ((set << 1) | (set >> (cols - 1))) & full;
    let reflect = |set: usize| (0..cols).filter(|c| set >> c & 1 == 1).fold(0, |image, c| image | 1 << (cols - 1 - c));

    (0..=full)
        .filter_map(|set| {
            let mut images = std::collections::BTreeSet::new();
            let mut image = set;

            for _ in 0..cols {
                images.insert(image);
                images.insert(reflect(image));
                image = rotate(image);
            }

            (images.first() == Some(&set)).then_some((set, images.len() as u64))
        })
        .collect()
}

fn main() {
    let (first, last) = read_range();
    let jobs = thread::available_parallelism().map_or(1, |jobs| jobs.get());
    let sides: Vec<usize> = (first.max(1)..=last).map(|n| 2 * n).collect();
    let primes: BTreeMap<usize, Vec<u32>> = sides
        .iter()
        .map(|&cols| (cols, list_primes(((log2_bound(cols) + 1.0) / 30.0).ceil() as usize + 1)))
        .collect();
    let orbits: BTreeMap<usize, Vec<(usize, u64)>> = sides.iter().map(|&cols| (cols, list_orbits(cols))).collect();
    let mut tasks: Vec<(usize, u32, usize, usize)> = Vec::new();

    for &cols in &sides {
        let count = orbits[&cols].len();
        let chunk = count.div_ceil(jobs.min(count));

        for &prime in &primes[&cols] {
            for from in (0..count).step_by(chunk) {
                tasks.push((cols, prime, from, (from + chunk).min(count)));
            }
        }
    }

    let results = run_workers(&tasks, jobs, |&(cols, prime, from, to)| count_tilings(cols, prime, &orbits[&cols][from..to]));
    let mut sums: BTreeMap<(usize, u32), u64> = BTreeMap::new();

    for (&(cols, prime, _, _), residue) in tasks.iter().zip(results) {
        let sum = sums.entry((cols, prime)).or_default();
        *sum = (*sum + u64::from(residue)) % u64::from(prime);
    }

    for n in first..=last {
        let count = if n == 0 {
            BigInt::from_u64(1)
        } else {
            let primes = &primes[&(2 * n)];
            let residues: Vec<u32> = primes.iter().map(|&prime| sums[&(2 * n, prime)] as u32).collect();
            combine_checked_residues(&residues, primes, false).unwrap_or_else(|message| {
                eprintln!("{message}");
                process::exit(1);
            })
        };

        println!("{n} {count}");
    }
}
