use std::num::NonZero;
use std::process::ExitCode;
use std::thread;

use lattice_dimers_core::{BigInt, Timer, combine_checked_residues, list_primes, parse_args, run_workers};

const MAX_CIRCUMFERENCE: u64 = 24;
const USAGE: &str = "Usage: periodic-tiling-modular -r <rowCount> -c <circumference> [--torus] [--twisted] [--lattice king|triangular|square] [-j <jobs>]\nThe circumference is at least 2, and a torus has at least 2 rows.";

#[derive(Clone, Copy)]
struct Lattice {
    down_left: bool,
    down_right: bool,
}

#[derive(Clone, Copy)]
struct Board {
    rows: usize,
    cols: usize,
    lattice: Lattice,
    torus: bool,
    twisted: bool,
}

struct Move {
    bit: u32,
    crossing: bool,
}

fn lattice_of(name: &str) -> Option<Lattice> {
    match name {
        "square" => Some(Lattice { down_left: false, down_right: false }),
        "triangular" => Some(Lattice { down_left: false, down_right: true }),
        "king" => Some(Lattice { down_left: true, down_right: true }),
        _ => None,
    }
}

/// Lists the moves of a free cell in column c, like listMoves of js/solvers/periodicTilingSolver-Modular.js.
fn list_moves(cols: usize, c: usize, has_below: bool, lattice: Lattice, wrap_bit: u32) -> Vec<Move> {
    let at = |offset: usize, crossing: bool| Move { bit: 1 << offset, crossing };
    let mut moves = Vec::new();

    if c + 1 < cols {
        moves.push(at(1, false));
    }

    if c == 0 {
        moves.push(at(cols - 1, true));
    }

    if !has_below {
        return moves;
    }

    if lattice.down_left && c > 0 {
        moves.push(at(cols - 1, false));
    } else if lattice.down_left && cols == 2 {
        moves.push(at(cols + 1, true));
    } else if lattice.down_left {
        moves.push(Move { bit: wrap_bit, crossing: true });
    }

    moves.push(at(cols, false));

    if lattice.down_right && c + 1 < cols {
        moves.push(at(cols + 1, false));
    } else if lattice.down_right {
        moves.push(at(1, true));
    }

    moves
}

fn add(next: &mut [u32], target: u32, count: u32, negative: bool, prime: u32) {
    let value = if negative && count != 0 { prime - count } else { count };
    let sum = next[target as usize] + value;
    next[target as usize] = if sum >= prime { sum - prime } else { sum };
}

/// Counts the tilings of a cylinder or a torus modulo a prime, cell by cell, like countModulo of
/// js/solvers/periodicTilingSolver-Modular.js.
fn count_modulo(board: &Board, prime: u32) -> u32 {
    let Board { rows, cols, lattice, torus, twisted } = *board;
    let window_bits = cols + 2;
    let window_mask: u32 = (1 << window_bits) - 1;
    let wrap_bit: u32 = 1 << window_bits;
    let uses_wrap_bit = lattice.down_left && cols >= 3;
    let state_count: usize = 1 << (window_bits + usize::from(uses_wrap_bit));
    let top_bit: u32 = 1 << (window_bits - 1);
    let moves_below: Vec<Vec<Move>> = (0..cols).map(|c| list_moves(cols, c, true, lattice, wrap_bit)).collect();
    let moves_last: Vec<Vec<Move>> = (0..cols).map(|c| list_moves(cols, c, torus, lattice, wrap_bit)).collect();
    let mut current = vec![0u32; state_count];
    let mut next = vec![0u32; state_count];

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

    let mut run = |start: usize| -> u32 {
        current.fill(0);
        current[start] = 1 % prime;

        for cell in 0..rows * cols {
            let c = cell % cols;
            let moves = if cell < (rows - 1) * cols { &moves_below[c] } else { &moves_last[c] };

            next.fill(0);

            for (state, &count) in current.iter().enumerate() {
                if count == 0 {
                    continue;
                }

                let state = state as u32;

                if state & 1 != 0 {
                    add(&mut next, shift(state, c), count, false, prime);
                    continue;
                }

                for Move { bit, crossing } in moves {
                    if state & bit == 0 {
                        add(&mut next, shift(state + bit, c), count, twisted && *crossing, prime);
                    }
                }
            }

            std::mem::swap(&mut current, &mut next);
        }

        current[start]
    };

    if !torus {
        return if rows == 0 { 1 % prime } else { run(0) };
    }

    let rotate = |set: usize| ((set << 1) | (set >> (cols - 1))) & ((1 << cols) - 1);
    let reduce = !twisted || rows.is_multiple_of(2);
    let mut total: u64 = 0;

    for start in 0..1usize << cols {
        let mut weight: u64 = 1;

        if reduce {
            let mut rotation = rotate(start);

            while rotation > start {
                weight += 1;
                rotation = rotate(rotation);
            }

            if rotation != start {
                continue;
            }
        }

        total = (total + weight * u64::from(run(start))) % u64::from(prime);
    }

    total as u32
}

/// Bounds log2 of the number of tilings, like calculateLog2Bound of js/solvers/periodicTilingSolver-Modular.js.
fn calculate_log2_bound(board: &Board) -> f64 {
    let wrap_bit = 1u32 << (board.cols + 2);
    let most = (0..board.cols)
        .map(|c| list_moves(board.cols, c, board.rows > 1 || board.torus, board.lattice, wrap_bit).len())
        .max()
        .unwrap_or(1);

    ((board.rows * board.cols) as f64 / 2.0) * (most as f64).log2() + if board.torus { board.cols as f64 } else { 0.0 }
}

/// Counts the tilings exactly with the Chinese remainder theorem, like calculateTotalTilingCombinations of
/// js/solvers/periodicTilingSolver-Modular.js. The board is valid and within the circumference limit.
fn calculate_total_tiling_combinations(
    row_count: usize,
    col_count: usize,
    lattice: Lattice,
    torus: bool,
    twisted: bool,
    jobs: usize,
) -> Result<BigInt, String> {
    let transpose = torus && !twisted && row_count < col_count;
    let (rows, cols) = if transpose { (col_count, row_count) } else { (row_count, col_count) };

    if !(rows * cols).is_multiple_of(2) {
        return Ok(BigInt::zero());
    }

    let board = Board { rows, cols, lattice, torus, twisted };
    let prime_count = ((calculate_log2_bound(&board) + 2.0) / 30.0).ceil() as usize + 1;
    let primes = list_primes(prime_count);
    let residues = run_workers(&primes, jobs, |prime| count_modulo(&board, *prime));

    combine_checked_residues(&residues, &primes, twisted)
}

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    let options = parse_args(&argv, &[("-r", "rowCount"), ("-c", "colCount"), ("-j", "jobs")]);
    let lattice = match argv.iter().position(|arg| arg == "--lattice") {
        None => lattice_of("king"),
        Some(index) => argv.get(index + 1).and_then(|name| lattice_of(name)),
    };
    let torus = argv.iter().any(|arg| arg == "--torus");
    let twisted = argv.iter().any(|arg| arg == "--twisted");
    let jobs = match options.get("jobs") {
        None => Some(thread::available_parallelism().map_or(1, NonZero::get) as u64),
        Some(value) => *value,
    };
    let row_count = options.get("rowCount").copied().flatten().filter(|rows| *rows >= if torus { 2 } else { 0 });
    let col_count = options.get("colCount").copied().flatten().filter(|cols| *cols >= 2);

    let (Some(row_count), Some(col_count), Some(lattice), Some(jobs)) = (row_count, col_count, lattice, jobs.filter(|jobs| *jobs > 0))
    else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };

    if col_count.min(if torus && !twisted { row_count } else { u64::MAX }) > MAX_CIRCUMFERENCE {
        eprintln!(
            "The circumference can be at most {MAX_CIRCUMFERENCE}, because every worker thread keeps two tables of 2^(circumference + 3) states."
        );
        return ExitCode::FAILURE;
    }

    let jobs = usize::try_from(jobs).unwrap_or(usize::MAX);
    let timer = Timer::start(&argv);

    match calculate_total_tiling_combinations(row_count as usize, col_count as usize, lattice, torus, twisted, jobs) {
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
