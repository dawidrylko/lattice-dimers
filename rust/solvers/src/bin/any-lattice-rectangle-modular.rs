use std::num::NonZero;
use std::process::ExitCode;
use std::thread;

use lattice_dimers_core::{BigInt, Prime, Residue, Timer, calculate_log2_bound, combine_planned_residues, count_modulo_primes, has_unusable_argument, parse_args, physical_memory};

const MAX_SHORTER_SIDE: u64 = 30;
const USAGE: &str = "Usage: any-lattice-rectangle-modular -r <rowCount> -c <colCount> [-j <jobs>] [--lattice king|triangular|square]";

/// Lists the bits a free cell in column c can cover with its partner, like listOffsets of
/// js/solvers/any-lattice-rectangle-bigint.js: right and down, down-left on the king's graph, down-right on the
/// triangular lattice and the king's graph.
fn list_offsets(cols: usize, c: usize, has_below: bool, (down_left, down_right): (bool, bool)) -> Vec<usize> {
    let has_right = c + 1 < cols;
    let mut offsets = Vec::new();

    if has_right {
        offsets.push(1);
    }

    if down_left && has_below && c > 0 {
        offsets.push(cols - 1);
    }

    if has_below {
        offsets.push(cols);
    }

    if down_right && has_below && has_right {
        offsets.push(cols + 1);
    }

    offsets.into_iter().map(|offset| 1 << offset).collect()
}

/// Says which diagonals a lattice has, down-left and down-right, like LATTICES in
/// js/solvers/any-lattice-rectangle-bigint.js.
fn diagonals_of(lattice: &str) -> Option<(bool, bool)> {
    match lattice {
        "square" => Some((false, false)),
        "triangular" => Some((false, true)),
        "king" => Some((true, true)),
        _ => None,
    }
}

/// Reads --lattice, king when it is absent, None when it names no lattice.
fn read_lattice(argv: &[String]) -> Option<(bool, bool)> {
    match argv.iter().position(|arg| arg == "--lattice") {
        None => diagonals_of("king"),
        Some(index) => argv.get(index + 1).and_then(|name| diagonals_of(name)),
    }
}

#[inline(always)]
fn add<R: Residue>(next: &mut [R], target: usize, count: R, prime: R) {
    next[target] = R::finish(R::add_term(next[target], count, prime), 2, prime);
}

/// Counts the tilings modulo a prime with the broken-profile dynamic programming of countModulo in
/// js/solvers/any-lattice-rectangle-modular.js. Bit i of a state tells whether the cell i places ahead of the
/// current one is already covered. A state has cols + 2 bits, but the top one is clear before every cell step,
/// since a step shifts the state right after setting at most that bit, so the tables hold the 2^(cols + 1) states
/// below it, in counts of u32 below a prime of list_primes or of u64 below a wide prime.
fn count_modulo<R: Residue>(rows: usize, cols: usize, prime: R, lattice: (bool, bool)) -> R {
    let state_count = 1usize << (cols + 1);
    let mut current = vec![R::default(); state_count];
    let mut next = vec![R::default(); state_count];
    current[0] = R::from_u64(1 % prime.to_u64());

    for cell in 0..rows * cols {
        let offsets = list_offsets(cols, cell % cols, cell / cols + 1 < rows, lattice);

        next.fill(R::default());

        for (state, &count) in current.iter().enumerate() {
            if count == R::default() {
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

/// Counts the tilings exactly, like calculateTotalTilingCombinations of js/solvers/any-lattice-rectangle-modular.js:
/// enough primes for the Kahn-Lovasz bound of the king's graph, which also bounds the triangular and the square
/// lattice, plus one more prime that the result is checked against. The primes are those of
/// count_modulo_primes, so some runs count modulo a wide prime.
fn calculate_total_tiling_combinations(row_count: usize, col_count: usize, lattice: (bool, bool), jobs: usize) -> Result<BigInt, String> {
    let rows = row_count.max(col_count);
    let cols = row_count.min(col_count);

    if !(rows * cols).is_multiple_of(2) {
        return Ok(BigInt::zero());
    }

    let (primes, residues) = count_modulo_primes(calculate_log2_bound(rows, cols) + 1.0, jobs, 1 << (cols + 1), physical_memory(), |prime| match prime {
        Prime::Narrow(prime) => u64::from(count_modulo(rows, cols, prime, lattice)),
        Prime::Wide(prime) => count_modulo(rows, cols, prime, lattice),
    });

    combine_planned_residues(&residues, &primes, false)
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

    let (Some(row_count), Some(col_count), Some(jobs), Some(lattice), false) = (row_count, col_count, jobs.filter(|jobs| *jobs > 0), read_lattice(&argv), has_unusable_argument(&argv, &["-r", "-c", "-j", "--lattice"], &[])) else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };

    if row_count.min(col_count) > MAX_SHORTER_SIDE {
        eprintln!("The shorter side of the board can be at most {MAX_SHORTER_SIDE}, because the states are indexed with 32-bit integers.");
        return ExitCode::FAILURE;
    }

    let jobs = usize::try_from(jobs).unwrap_or(usize::MAX);
    let timer = Timer::start(&argv);

    match calculate_total_tiling_combinations(row_count as usize, col_count as usize, lattice, jobs) {
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

#[cfg(test)]
mod tests {
    use lattice_dimers_core::{list_primes, list_wide_primes};

    use super::*;

    #[test]
    fn counts_alike_in_both_residue_sizes() {
        let prime = list_primes(1)[0];
        let wide_prime = list_wide_primes(2)[1];
        let boards = [("square", 2, 2, 2), ("square", 8, 8, 12_988_816u64), ("king", 4, 3, 43), ("king", 8, 8, 3_263_262_629_905), ("king", 9, 8, 185_175_369_431_551), ("triangular", 2, 2, 2), ("triangular", 6, 5, 6475)];

        for (name, rows, cols, expected) in boards {
            let lattice = diagonals_of(name).unwrap();

            assert_eq!(count_modulo(rows, cols, wide_prime, lattice), expected, "{rows}x{cols} {name} modulo a wide prime");
            assert_eq!(u64::from(count_modulo(rows, cols, prime, lattice)), expected % u64::from(prime), "{rows}x{cols} {name}");
        }

        for name in ["square", "triangular", "king"] {
            let lattice = diagonals_of(name).unwrap();

            for (rows, cols) in [(1, 2), (3, 2), (5, 4), (6, 5), (7, 6), (30, 3), (12, 9), (11, 10), (5, 3)] {
                assert_eq!(u64::from(count_modulo(rows, cols, prime, lattice)), count_modulo(rows, cols, u64::from(prime), lattice), "{rows}x{cols} {name}");
            }
        }
    }
}
