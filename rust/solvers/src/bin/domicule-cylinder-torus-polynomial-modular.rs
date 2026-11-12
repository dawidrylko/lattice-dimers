use std::ffi::{c_int, c_long};
use std::num::NonZero;
use std::process::ExitCode;
use std::thread;

use lattice_dimers_core::{Timer, combine_checked_residues, list_primes, parse_args, run_workers};

const MAX_CIRCUMFERENCE: u64 = 20;
const USAGE: &str = "Usage: domicule-cylinder-torus-polynomial-modular -r <rowCount> -c <circumference> [--torus] [-j <jobs>]\nThe circumference is at least 2, and a torus has at least 2 rows, unless the board has no cells.";

#[cfg(target_os = "macos")]
const SYSCONF_NAMES: Option<(c_int, c_int)> = Some((200, 29));
#[cfg(target_os = "linux")]
const SYSCONF_NAMES: Option<(c_int, c_int)> = Some((85, 30));
#[cfg(not(any(target_os = "macos", target_os = "linux")))]
const SYSCONF_NAMES: Option<(c_int, c_int)> = None;

unsafe extern "C" {
    fn sysconf(name: c_int) -> c_long;
}

/// Reads the memory of the machine in bytes, or 0 when it is not known, which leaves one worker thread.
fn physical_memory() -> u64 {
    let Some((pages, page_size)) = SYSCONF_NAMES else {
        return 0;
    };
    // SAFETY: sysconf takes an integer and only reads a system setting.
    let (pages, page_size) = unsafe { (sysconf(pages), sysconf(page_size)) };

    u64::try_from(pages).unwrap_or(0).saturating_mul(u64::try_from(page_size).unwrap_or(0))
}

#[derive(Clone, Copy)]
struct Board {
    rows: usize,
    cols: usize,
    torus: bool,
}

struct Move {
    bit: u32,
    diagonal: usize,
}

/// Lists the moves of a free cell in column c of a king's graph cylinder, like listMoves of
/// js/solvers/domicule-cylinder-torus-polynomial-modular.js: the bit its partner covers and whether the piece is diagonal.
/// A piece from column 0 to the last column of the next row is kept in the extra wrap_bit when cols >= 3.
fn list_moves(cols: usize, c: usize, has_below: bool, wrap_bit: u32) -> Vec<Move> {
    let at = |offset: usize, diagonal: usize| Move { bit: 1 << offset, diagonal };
    let mut moves = Vec::new();

    if c + 1 < cols {
        moves.push(at(1, 0));
    }

    if c == 0 {
        moves.push(at(cols - 1, 0));
    }

    if !has_below {
        return moves;
    }

    if c > 0 {
        moves.push(at(cols - 1, 1));
    } else if cols == 2 {
        moves.push(at(cols + 1, 1));
    } else {
        moves.push(Move { bit: wrap_bit, diagonal: 1 });
    }

    moves.push(at(cols, 0));
    moves.push(at(if c + 1 < cols { cols + 1 } else { 1 }, 1));

    moves
}

/// Counts the domicule tilings of a cylinder or a torus by the number of diagonal pieces modulo a prime, cell by cell,
/// like countModulo of js/solvers/domicule-cylinder-torus-polynomial-modular.js: a block of coefficients per state, where
/// entry k is the coefficient of x^k. Before cell p at most p pieces are placed, so only the coefficients up to x^p are
/// visited, and a table is cleared only in the states its last cell reached.
fn count_modulo(board: &Board, prime: u32) -> Vec<u32> {
    let Board { rows, cols, torus } = *board;
    let degree = rows * cols / 2;
    let width = degree + 1;
    let window_bits = cols + 2;
    let window_mask: u32 = (1 << window_bits) - 1;
    let wrap_bit: u32 = 1 << window_bits;
    let uses_wrap_bit = cols >= 3;
    let state_count: usize = 1 << (window_bits + usize::from(uses_wrap_bit));
    let top_bit: u32 = 1 << (window_bits - 1);
    let moves_below: Vec<Vec<Move>> = (0..cols).map(|c| list_moves(cols, c, true, wrap_bit)).collect();
    let moves_last: Vec<Vec<Move>> = (0..cols).map(|c| list_moves(cols, c, torus, wrap_bit)).collect();
    let mut current = vec![0u32; state_count * width];
    let mut next = vec![0u32; state_count * width];
    let mut reached = vec![false; state_count];
    let mut next_reached = vec![false; state_count];

    let shift = |state: u32, c: usize| -> u32 {
        let window = (state & window_mask) >> 1;

        if !uses_wrap_bit {
            window
        } else if c == cols - 3 {
            window | if state & wrap_bit != 0 { top_bit } else { 0 }
        } else {
            window | (state & wrap_bit)
        }
    };

    let mut run = |start: usize| -> Vec<u32> {
        current.fill(0);
        next.fill(0);
        reached.fill(false);
        next_reached.fill(false);
        current[start * width] = 1 % prime;
        reached[start] = true;

        for cell in 0..rows * cols {
            let c = cell % cols;
            let moves = if cell < (rows - 1) * cols { &moves_below[c] } else { &moves_last[c] };
            let placed = degree.min(cell);

            for state in 0..state_count {
                if next_reached[state] {
                    next[state * width..(state + 1) * width].fill(0);
                    next_reached[state] = false;
                }
            }

            let mut add = |source: usize, target: usize, diagonal: usize| {
                let length = (placed + 1).min(width - diagonal);
                let from = &current[source * width..source * width + length];
                let to = &mut next[target * width + diagonal..target * width + diagonal + length];
                next_reached[target] = true;

                for (into, &count) in to.iter_mut().zip(from) {
                    let sum = *into + count;
                    *into = if sum >= prime { sum - prime } else { sum };
                }
            };

            for (state, &seen) in reached.iter().enumerate() {
                if !seen {
                    continue;
                }

                let bits = state as u32;

                if bits & 1 != 0 {
                    add(state, shift(bits, c) as usize, 0);
                    continue;
                }

                for Move { bit, diagonal } in moves {
                    if bits & bit == 0 {
                        add(state, shift(bits + bit, c) as usize, *diagonal);
                    }
                }
            }

            std::mem::swap(&mut current, &mut next);
            std::mem::swap(&mut reached, &mut next_reached);
        }

        current[start * width..(start + 1) * width].to_vec()
    };

    if !torus {
        return if rows == 0 {
            let mut coefficients = vec![0u32; width];
            coefficients[0] = 1 % prime;
            coefficients
        } else {
            run(0)
        };
    }

    let rotate = |set: usize| ((set << 1) | (set >> (cols - 1))) & ((1 << cols) - 1);
    let mut total = vec![0u64; width];

    for start in 0..1usize << cols {
        let mut weight: u64 = 1;
        let mut rotation = rotate(start);

        while rotation > start {
            weight += 1;
            rotation = rotate(rotation);
        }

        if rotation != start {
            continue;
        }

        for (sum, count) in total.iter_mut().zip(run(start)) {
            *sum = (*sum + weight * u64::from(count)) % u64::from(prime);
        }
    }

    total.into_iter().map(|count| count as u32).collect()
}

/// Bounds log2 of the number of tilings, like calculateLog2Bound of js/solvers/domicule-cylinder-torus-polynomial-modular.js:
/// every piece is one of the at most m moves of its cell, so a cylinder has at most m^(N/2) tilings and a torus, with its
/// 2^cols start sets, at most 2^cols m^(N/2).
fn calculate_log2_bound(board: &Board) -> f64 {
    let wrap_bit = 1u32 << (board.cols + 2);
    let most = (0..board.cols)
        .map(|c| list_moves(board.cols, c, board.rows > 1 || board.torus, wrap_bit).len())
        .max()
        .unwrap_or(1);

    ((board.rows * board.cols) as f64 / 2.0) * (most as f64).log2() + if board.torus { board.cols as f64 } else { 0.0 }
}

/// Caps the number of worker threads so that their tables fit in half the memory, like capThreads of
/// js/solvers/domicule-cylinder-torus-polynomial-modular.js: each keeps two tables of a whole polynomial per state in
/// 32-bit counts and two tables of reached states.
fn cap_threads(jobs: u64, cols: usize, degree: usize, memory: u64) -> u64 {
    let bytes_per_worker = (1u128 << (cols + if cols >= 3 { 3 } else { 2 })) * (2 * 4 * (degree as u128 + 1) + 2);

    u64::try_from(u128::from(memory / 2) / bytes_per_worker).unwrap_or(u64::MAX).min(jobs).max(1)
}

/// Counts the tilings by the number of diagonal pieces exactly: every coefficient is at most the number of tilings,
/// so the bound sets the number of primes, and one more prime checks every coefficient. A torus is counted with its
/// shorter side as the circumference.
fn calculate_diagonal_polynomial(row_count: usize, col_count: usize, torus: bool, jobs: u64) -> Result<Vec<String>, String> {
    if row_count == 0 || col_count == 0 {
        return Ok(vec!["1".to_string()]);
    }

    let transpose = torus && row_count < col_count;
    let (rows, cols) = if transpose { (col_count, row_count) } else { (row_count, col_count) };
    let degree = rows * cols / 2;

    if !(rows * cols).is_multiple_of(2) {
        let mut zeros = Vec::new();
        zeros.try_reserve_exact(degree + 1).map_err(|_| "Invalid array length".to_string())?;
        zeros.resize(degree + 1, "0".to_string());
        return Ok(zeros);
    }

    let board = Board { rows, cols, torus };
    let prime_count = ((calculate_log2_bound(&board) + 1.0) / 30.0).ceil() as usize + 1;
    let primes = list_primes(prime_count);
    let threads = usize::try_from(cap_threads(jobs, cols, degree, physical_memory())).unwrap_or(usize::MAX);
    let residues = run_workers(&primes, threads, |prime| count_modulo(&board, *prime));

    (0..=degree)
        .map(|k| {
            let coefficient: Vec<u32> = residues.iter().map(|coefficients| coefficients[k]).collect();
            combine_checked_residues(&coefficient, &primes, false).map(|value| value.to_string())
        })
        .collect()
}

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    let options = parse_args(&argv, &[("-r", "rowCount"), ("-c", "colCount"), ("-j", "jobs")]);
    let torus = argv.iter().any(|arg| arg == "--torus");
    let jobs = match options.get("jobs") {
        None => Some(thread::available_parallelism().map_or(1, NonZero::get) as u64),
        Some(value) => *value,
    };
    let (row_count, col_count) = options
        .get("rowCount")
        .copied()
        .flatten()
        .zip(options.get("colCount").copied().flatten())
        .filter(|&(rows, cols)| rows == 0 || cols == 0 || (cols >= 2 && (!torus || rows >= 2)))
        .unzip();

    let (Some(row_count), Some(col_count), Some(jobs)) = (row_count, col_count, jobs.filter(|jobs| *jobs > 0)) else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };

    let circumference = col_count.min(if torus { row_count } else { u64::MAX });

    if circumference > MAX_CIRCUMFERENCE {
        eprintln!(
            "The circumference can be at most {MAX_CIRCUMFERENCE}, because every worker thread keeps the polynomial of every one of 2^(circumference + 3) states in memory (-j sets the number of threads)."
        );
        return ExitCode::FAILURE;
    }

    let threads = cap_threads(jobs, circumference as usize, (row_count * col_count / 2) as usize, physical_memory());

    if threads < jobs {
        eprintln!("Running {threads} worker threads instead of {jobs}, so that their tables fit in half the memory.");
    }

    let timer = Timer::start(&argv);

    match calculate_diagonal_polynomial(row_count as usize, col_count as usize, torus, jobs) {
        Ok(coefficients) => {
            timer.stop();
            println!("{}", coefficients.join(","));
            ExitCode::SUCCESS
        }
        Err(message) => {
            eprintln!("{message}");
            ExitCode::FAILURE
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const GIGABYTES: u64 = 1 << 30;

    #[test]
    fn caps_the_threads_like_the_javascript_solver() {
        assert_eq!(cap_threads(10, 20, 200, 16 * GIGABYTES), 1);
        assert_eq!(cap_threads(4, 6, 18, 16 * GIGABYTES), 4);
        assert_eq!(cap_threads(3, 20, 200, GIGABYTES), 1);
        assert_eq!(cap_threads(3, 20, 200, 0), 1);
    }

    #[test]
    fn reads_the_memory_of_the_machine() {
        assert!(physical_memory() > 0);
    }
}
