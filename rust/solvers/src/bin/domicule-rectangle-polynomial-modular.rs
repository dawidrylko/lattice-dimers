use std::ffi::{c_int, c_long};
use std::num::NonZero;
use std::process::ExitCode;
use std::thread;

use lattice_dimers_core::{Timer, calculate_log2_bound, combine_checked_residues, list_primes, parse_args, run_workers};

const MAX_SHORTER_SIDE: u64 = 20;
const UNREACHED: u8 = 2;
const USAGE: &str = "Usage: domicule-rectangle-polynomial-modular -r <rowCount> -c <colCount> [-j <jobs>]";

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

/// Lists the bit and the diagonal flag of every partner a free cell in column c can cover, like the moves in
/// countModulo of js/solvers/domicule-rectangle-polynomial-modular.js: right, down-left, down and down-right.
fn list_moves(cols: usize, c: usize, has_below: bool) -> Vec<(usize, u8)> {
    let has_right = c + 1 < cols;
    let mut moves = Vec::new();

    if has_right {
        moves.push((1, 0));
    }

    if has_below && c > 0 {
        moves.push((cols - 1, 1));
    }

    if has_below {
        moves.push((cols, 0));
    }

    if has_below && has_right {
        moves.push((cols + 1, 1));
    }

    moves.into_iter().map(|(offset, diagonal)| (1 << offset, diagonal)).collect()
}

/// One table of half a polynomial per state, and the parity of the number of diagonal pieces of every state.
struct Tables {
    counts: Vec<u32>,
    parity: Vec<u8>,
}

/// Counts the domicule tilings by the number of diagonal pieces modulo a prime, with the transfer of countModulo in
/// js/solvers/domicule-rectangle-polynomial-modular.js. Every state keeps only the coefficients of x^k with k of its parity:
/// entry j of its block is the coefficient of x^(2j + parity). Each cell places at most one piece, so before cell p
/// only the coefficients up to x^p are visited, and a table is cleared only where the last cell that wrote it reached.
fn count_modulo(rows: usize, cols: usize, prime: u32) -> Result<Vec<u32>, String> {
    let degree = rows * cols / 2;
    let width = degree / 2 + 1;
    let state_count = 1usize << (cols + 2);
    let mut current = Tables { counts: vec![0u32; state_count * width], parity: vec![UNREACHED; state_count] };
    let mut next = Tables { counts: vec![0u32; state_count * width], parity: vec![UNREACHED; state_count] };
    current.counts[0] = 1 % prime;
    current.parity[0] = 0;

    for cell in 0..rows * cols {
        let moves = list_moves(cols, cell % cols, cell / cols + 1 < rows);
        let placed = (width - 1).min(cell / 2);

        for state in 0..state_count {
            if next.parity[state] != UNREACHED {
                let from = state * width;
                next.counts[from..from + (placed + 1).min(width)].fill(0);
                next.parity[state] = UNREACHED;
            }
        }

        for state in 0..state_count {
            if current.parity[state] == UNREACHED {
                continue;
            }

            if state & 1 != 0 {
                add(&current, &mut next, (state, state >> 1, 0), (width, placed, prime))?;
                continue;
            }

            for &(bit, diagonal) in &moves {
                if state & bit == 0 {
                    add(&current, &mut next, (state, (state + bit) >> 1, diagonal), (width, placed, prime))?;
                }
            }
        }

        std::mem::swap(&mut current, &mut next);
    }

    let mut coefficients = vec![0u32; degree + 1];

    if current.parity[0] != UNREACHED {
        let parity = usize::from(current.parity[0]);

        for k in (parity..=degree).step_by(2) {
            coefficients[k] = current.counts[(k - parity) / 2];
        }
    }

    Ok(coefficients)
}

/// Adds the block of one state to the block of the state it moves to. A diagonal piece flips the parity, and entry j
/// moves to entry j + 1 when the source was odd, since 2j + 1 + 1 = 2(j + 1). A count stays below the prime, so below
/// 2^31, and the sum fits in 32 bits.
fn add(current: &Tables, next: &mut Tables, (source, target, diagonal): (usize, usize, u8), (width, placed, prime): (usize, usize, u32)) -> Result<(), String> {
    let own = current.parity[source];
    let shift = usize::from(own & diagonal);

    if next.parity[target] == UNREACHED {
        next.parity[target] = own ^ diagonal;
    } else if next.parity[target] != own ^ diagonal {
        return Err("A state was reached with both parities of the number of diagonal pieces.".to_string());
    }

    let length = (placed + 1).min(width - shift);
    let from = &current.counts[source * width..source * width + length];
    let to = &mut next.counts[target * width + shift..target * width + shift + length];

    for (into, count) in to.iter_mut().zip(from) {
        let sum = *into + *count;
        *into = sum.min(sum.wrapping_sub(prime));
    }

    Ok(())
}

/// Caps the number of worker threads so that their tables fit in half the memory, like capThreads of
/// js/solvers/domicule-rectangle-polynomial-modular.js: each keeps two tables of half a polynomial per state in 32-bit
/// counts and two parity tables.
fn cap_threads(jobs: u64, cols: usize, degree: usize, memory: u64) -> u64 {
    let bytes_per_worker = (1u128 << (cols + 2)) * (2 * 4 * (degree as u128 / 2 + 1) + 2);

    u64::try_from(u128::from(memory / 2) / bytes_per_worker).unwrap_or(u64::MAX).min(jobs).max(1)
}

/// Counts the tilings by the number of diagonal pieces exactly: every coefficient is at most the number of tilings,
/// so the Kahn-Lovasz bound sets the number of primes, and one more prime checks every coefficient.
fn calculate_diagonal_polynomial(row_count: usize, col_count: usize, jobs: u64) -> Result<Vec<String>, String> {
    let rows = row_count.max(col_count);
    let cols = row_count.min(col_count);
    let degree = rows * cols / 2;

    if !(rows * cols).is_multiple_of(2) {
        let mut zeros = Vec::new();
        zeros.try_reserve_exact(degree + 1).map_err(|_| "Invalid array length".to_string())?;
        zeros.resize(degree + 1, "0".to_string());
        return Ok(zeros);
    }

    let prime_count = ((calculate_log2_bound(rows, cols) + 1.0) / 30.0).ceil() as usize + 1;
    let primes = list_primes(prime_count);
    let threads = usize::try_from(cap_threads(jobs, cols, degree, physical_memory())).unwrap_or(usize::MAX);
    let residues = run_workers(&primes, threads, |prime| count_modulo(rows, cols, *prime))
        .into_iter()
        .collect::<Result<Vec<_>, _>>()?;

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
        eprintln!(
            "The shorter side of the board can be at most {MAX_SHORTER_SIDE}, because every worker thread keeps half the polynomial of every state in memory (about 3.4 GB at 20 x 20; -j sets the number of threads)."
        );
        return ExitCode::FAILURE;
    }

    let (row_count, col_count) = (row_count as usize, col_count as usize);
    let threads = cap_threads(jobs, row_count.min(col_count), row_count * col_count / 2, physical_memory());

    if threads < jobs {
        eprintln!("Running {threads} worker threads instead of {jobs}, so that their tables fit in half the memory.");
    }

    let timer = Timer::start(&argv);

    match calculate_diagonal_polynomial(row_count, col_count, jobs) {
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
        assert_eq!(cap_threads(10, 20, 200, 16 * GIGABYTES), 2);
        assert_eq!(cap_threads(4, 6, 18, 16 * GIGABYTES), 4);
        assert_eq!(cap_threads(3, 20, 200, GIGABYTES), 1);
        assert_eq!(cap_threads(3, 20, 200, 0), 1);
    }

    #[test]
    fn reads_the_memory_of_the_machine() {
        assert!(physical_memory() > 0);
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn reads_the_memory_the_kernel_reports() {
        let meminfo = std::fs::read_to_string("/proc/meminfo").unwrap();
        let line = meminfo.lines().find(|line| line.starts_with("MemTotal:")).unwrap();
        let kilobytes: u64 = line.split_whitespace().nth(1).unwrap().parse().unwrap();

        assert_eq!(physical_memory() / 1024 / 1024, kilobytes / 1024);
    }
}
