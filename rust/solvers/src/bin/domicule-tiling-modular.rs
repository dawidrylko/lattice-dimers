use std::num::NonZero;
use std::process::ExitCode;
use std::thread;

use lattice_dimers_core::{BigInt, Timer, calculate_log2_bound, combine_checked_residues, list_primes, parse_args, run_workers};

const MAX_SHORTER_SIDE: u64 = 30;
const USAGE: &str = "Usage: domicule-tiling-modular -r <rowCount> -c <colCount> [-j <jobs>]";

/// Lists the bits a free cell in column c can cover with its partner, like the offsets in countModulo of
/// js/solvers/domiculeTilingSolver-Modular.js: right, down-left, down and down-right.
fn list_offsets(cols: usize, c: usize, has_below: bool) -> Vec<usize> {
    let has_right = c + 1 < cols;
    let mut offsets = Vec::new();

    if has_right {
        offsets.push(1);
    }

    if has_below && c > 0 {
        offsets.push(cols - 1);
    }

    if has_below {
        offsets.push(cols);
    }

    if has_below && has_right {
        offsets.push(cols + 1);
    }

    offsets.into_iter().map(|offset| 1 << offset).collect()
}

fn add(next: &mut [u32], target: usize, count: u32, prime: u32) {
    let sum = next[target] + count;
    next[target] = if sum >= prime { sum - prime } else { sum };
}

/// Counts the domicule tilings modulo a prime with the broken-profile dynamic programming of countModulo in
/// js/solvers/domiculeTilingSolver-Modular.js. Bit i of a state tells whether the cell i places ahead of the
/// current one is already covered; a state has cols + 2 bits, and the counts are kept in tables of u32.
fn count_modulo(rows: usize, cols: usize, prime: u32) -> u32 {
    let state_count = 1usize << (cols + 2);
    let mut current = vec![0u32; state_count];
    let mut next = vec![0u32; state_count];
    current[0] = 1 % prime;

    for cell in 0..rows * cols {
        let offsets = list_offsets(cols, cell % cols, cell / cols + 1 < rows);

        next.fill(0);

        for (state, &count) in current.iter().enumerate() {
            if count == 0 {
                continue;
            }

            if state & 1 != 0 {
                add(&mut next, state >> 1, count, prime);
                continue;
            }

            for &offset in &offsets {
                if state & offset == 0 {
                    add(&mut next, (state + offset) >> 1, count, prime);
                }
            }
        }

        std::mem::swap(&mut current, &mut next);
    }

    current[0]
}

/// Counts the tilings exactly, like calculateTotalTilingCombinations of js/solvers/domiculeTilingSolver-Modular.js:
/// enough primes for the Kahn-Lovasz bound, plus one more prime that the result is checked against.
fn calculate_total_tiling_combinations(row_count: usize, col_count: usize, jobs: usize) -> Result<BigInt, String> {
    let rows = row_count.max(col_count);
    let cols = row_count.min(col_count);

    if !(rows * cols).is_multiple_of(2) {
        return Ok(BigInt::zero());
    }

    let prime_count = ((calculate_log2_bound(rows, cols) + 1.0) / 30.0).ceil() as usize + 1;
    let primes = list_primes(prime_count);
    let residues = run_workers(&primes, jobs, |prime| count_modulo(rows, cols, *prime));

    combine_checked_residues(&residues, &primes, false)
}

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    let options = parse_args(&argv, &[("-r", "rowCount"), ("-c", "colCount"), ("-j", "jobs")]);
    let jobs = match options.get("jobs") {
        None => Some(thread::available_parallelism().map_or(1, NonZero::get) as u64),
        Some(value) => *value,
    };
    let row_count = options.get("rowCount").copied().flatten();
    let col_count = options.get("colCount").copied().flatten();

    let (Some(row_count), Some(col_count), Some(jobs)) = (row_count, col_count, jobs.filter(|jobs| *jobs > 0)) else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };

    if row_count.min(col_count) > MAX_SHORTER_SIDE {
        eprintln!("The shorter side of the board can be at most {MAX_SHORTER_SIDE}, because the states are indexed with 32-bit integers.");
        return ExitCode::FAILURE;
    }

    let jobs = usize::try_from(jobs).unwrap_or(usize::MAX);
    let timer = Timer::start(&argv);

    match calculate_total_tiling_combinations(row_count as usize, col_count as usize, jobs) {
        Ok(result) => {
            timer.stop();
            println!("{result}");
            ExitCode::SUCCESS
        }
        Err(message) => {
            eprintln!("{message}");
            ExitCode::FAILURE
        }
    }
}
