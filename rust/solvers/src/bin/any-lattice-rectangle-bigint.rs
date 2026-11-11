use std::process::ExitCode;

use lattice_dimers_core::{BigInt, Timer, parse_args};

const MAX_SHORTER_SIDE: u64 = 29;
const USAGE: &str = "Usage: any-lattice-rectangle-bigint -r <rowCount> -c <colCount> [--lattice king|triangular|square]";

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

/// Counts the tilings of a rectangle on a lattice with the broken-profile method of
/// js/solvers/any-lattice-rectangle-bigint.js. Bit i of a state tells whether the cell i places ahead of the
/// current one is already covered, and a state has cols + 2 bits.
fn calculate_total_tiling_combinations(row_count: usize, col_count: usize, lattice: (bool, bool)) -> BigInt {
    let rows = row_count.max(col_count);
    let cols = row_count.min(col_count);
    let state_count = 1usize << (cols + 2);
    let mut current = vec![BigInt::zero(); state_count];
    current[0] = BigInt::from_u64(1);

    for cell in 0..rows * cols {
        let offsets = list_offsets(cols, cell % cols, cell / cols + 1 < rows, lattice);
        let mut next = vec![BigInt::zero(); state_count];

        for (state, count) in current.iter().enumerate() {
            if count.is_zero() {
                continue;
            }

            if state & 1 != 0 {
                next[state >> 1] += count;
                continue;
            }

            for &offset in &offsets {
                if state & offset == 0 {
                    next[(state + offset) >> 1] += count;
                }
            }
        }

        current = next;
    }

    current.swap_remove(0)
}

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    let options = parse_args(&argv, &[("-r", "rowCount"), ("-c", "colCount")]);
    let row_count = options.get("rowCount").copied().flatten();
    let col_count = options.get("colCount").copied().flatten();

    let (Some(row_count), Some(col_count), Some(lattice)) = (row_count, col_count, read_lattice(&argv)) else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };

    if row_count.min(col_count) > MAX_SHORTER_SIDE {
        eprintln!(
            "The shorter side of the board can be at most {MAX_SHORTER_SIDE}, because a JavaScript array holds fewer than 2^32 states."
        );
        return ExitCode::FAILURE;
    }

    let timer = Timer::start(&argv);
    let result = calculate_total_tiling_combinations(row_count as usize, col_count as usize, lattice);
    timer.stop();
    println!("{result}");
    ExitCode::SUCCESS
}
