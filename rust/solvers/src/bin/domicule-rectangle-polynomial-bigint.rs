use std::process::ExitCode;

use lattice_dimers_core::{BigInt, Timer, parse_args};

const MAX_SHORTER_SIDE: u64 = 20;
const USAGE: &str = "Usage: domicule-rectangle-polynomial-bigint -r <rowCount> -c <colCount>";

/// Lists the moves of a free cell in column c, like the moves in calculateDiagonalPolynomial of
/// js/solvers/domicule-rectangle-polynomial-bigint.js: the bit its partner covers and the power of x the piece adds, for the
/// right, down-left, down and down-right neighbours.
fn list_moves(cols: usize, c: usize, has_below: bool) -> Vec<(usize, usize)> {
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

/// Adds a polynomial times x^diagonal to the polynomial of the target state, which starts at zero.
fn add(target: &mut Option<Vec<BigInt>>, polynomial: &[BigInt], diagonal: usize) {
    let sum = target.get_or_insert_with(|| vec![BigInt::zero(); polynomial.len()]);

    for (coefficient, addend) in sum[diagonal..].iter_mut().zip(polynomial) {
        *coefficient += addend;
    }
}

/// Counts the domicule tilings by the number of diagonal pieces with the transfer of
/// js/solvers/domicule-rectangle-polynomial-bigint.js: bit i of a state tells whether the cell i places ahead of the current
/// one is already covered, and a state holds a polynomial whose coefficient of x^k counts the partial tilings with k
/// diagonal pieces.
fn calculate_diagonal_polynomial(row_count: usize, col_count: usize) -> Vec<BigInt> {
    let rows = row_count.max(col_count);
    let cols = row_count.min(col_count);
    let degree = rows * cols / 2;
    let state_count = 1usize << (cols + 2);
    let mut current: Vec<Option<Vec<BigInt>>> = vec![None; state_count];
    let mut start = vec![BigInt::zero(); degree + 1];
    start[0] = BigInt::from_u64(1);
    current[0] = Some(start);

    for cell in 0..rows * cols {
        let moves = list_moves(cols, cell % cols, cell / cols + 1 < rows);
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

    let (Some(row_count), Some(col_count)) = (row_count, col_count) else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };

    if row_count.min(col_count) > MAX_SHORTER_SIDE {
        eprintln!(
            "The shorter side of the board can be at most {MAX_SHORTER_SIDE}; use domicule-rectangle-polynomial-modular.js for larger boards."
        );
        return ExitCode::FAILURE;
    }

    let timer = Timer::start(&argv);
    let coefficients = calculate_diagonal_polynomial(row_count as usize, col_count as usize);
    timer.stop();
    let text: Vec<String> = coefficients.iter().map(ToString::to_string).collect();
    println!("{}", text.join(","));
    ExitCode::SUCCESS
}
