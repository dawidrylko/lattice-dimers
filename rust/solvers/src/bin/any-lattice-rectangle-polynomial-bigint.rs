use std::process::ExitCode;

use lattice_dimers_core::{BigInt, Timer, parse_args};

const MAX_SHORTER_SIDE: u64 = 20;
const USAGE: &str =
    "Usage: any-lattice-rectangle-polynomial-bigint -r <rowCount> -c <colCount> [--lattice king|triangular|square]";

/// Lists the moves of a free cell in column c, like listMoves of
/// js/solvers/any-lattice-rectangle-polynomial-bigint.js: the bit its partner covers and the power of x the piece adds,
/// for the right, down-left, down and down-right neighbours the lattice has. On two columns the down-left neighbour is
/// the next cell, as the right neighbour is, so the power of x is kept with the move.
fn list_moves(cols: usize, c: usize, has_below: bool, (down_left, down_right): (bool, bool)) -> Vec<(usize, usize)> {
    let has_right = c + 1 < cols;
    let mut moves = Vec::new();

    if has_right {
        moves.push((1, 0));
    }

    if down_left && has_below && c > 0 {
        moves.push((cols - 1, 1));
    }

    if has_below {
        moves.push((cols, 0));
    }

    if down_right && has_below && has_right {
        moves.push((cols + 1, 1));
    }

    moves.into_iter().map(|(offset, diagonal)| (1 << offset, diagonal)).collect()
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

/// Adds a polynomial times x^diagonal to the polynomial of the target state, which starts at zero.
fn add(target: &mut Option<Vec<BigInt>>, polynomial: &[BigInt], diagonal: usize) {
    let sum = target.get_or_insert_with(|| vec![BigInt::zero(); polynomial.len()]);

    for (coefficient, addend) in sum[diagonal..].iter_mut().zip(polynomial) {
        *coefficient += addend;
    }
}

/// Counts the tilings of a rectangle on a lattice by the number of diagonal pieces with the transfer of
/// js/solvers/any-lattice-rectangle-polynomial-bigint.js: bit i of a state tells whether the cell i places ahead of the current
/// one is already covered, and a state holds a polynomial whose coefficient of x^k counts the partial tilings with k
/// diagonal pieces.
fn calculate_diagonal_polynomial(row_count: usize, col_count: usize, lattice: (bool, bool)) -> Vec<BigInt> {
    let rows = row_count.max(col_count);
    let cols = row_count.min(col_count);
    let degree = rows * cols / 2;
    let state_count = 1usize << (cols + 1);
    let mut current: Vec<Option<Vec<BigInt>>> = vec![None; state_count];
    let mut start = vec![BigInt::zero(); degree + 1];
    start[0] = BigInt::from_u64(1);
    current[0] = Some(start);

    for cell in 0..rows * cols {
        let moves = list_moves(cols, cell % cols, cell / cols + 1 < rows, lattice);
        let mut next: Vec<Option<Vec<BigInt>>> = vec![None; state_count];

        for (state, polynomial) in current.iter().enumerate() {
            let Some(polynomial) = polynomial else {
                continue;
            };

            if state & 1 != 0 {
                add(&mut next[state >> 1], polynomial, 0);
                continue;
            }

            for &(offset, diagonal) in &moves {
                if state & offset == 0 {
                    add(&mut next[(state + offset) >> 1], polynomial, diagonal);
                }
            }
        }

        current = next;
    }

    current.swap_remove(0).unwrap_or_else(|| vec![BigInt::zero(); degree + 1])
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
            "The shorter side of the board can be at most {MAX_SHORTER_SIDE}; use any-lattice-rectangle-polynomial-modular.js for larger boards."
        );
        return ExitCode::FAILURE;
    }

    let timer = Timer::start(&argv);
    let coefficients = calculate_diagonal_polynomial(row_count as usize, col_count as usize, lattice);
    timer.stop();
    let text: Vec<String> = coefficients.iter().map(ToString::to_string).collect();
    println!("{}", text.join(","));
    ExitCode::SUCCESS
}
