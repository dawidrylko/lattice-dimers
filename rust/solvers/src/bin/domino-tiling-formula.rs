use std::process::ExitCode;

use lattice_dimers_core::{BigInt, Timer, parse_args};

const USAGE: &str = "Usage: domino-tiling-formula -r <rowCount> -c <colCount>";
const SQUARE_BOARDS_ONLY: &str =
    "The formula covers 2n x 2n boards only (OEIS A004003); rowCount and colCount must be equal and even.";

/// Multiplies two polynomials given as coefficient arrays, from the constant term up.
fn multiply_polynomials(p: &[BigInt], q: &[BigInt]) -> Vec<BigInt> {
    let mut product = vec![BigInt::zero(); p.len() + q.len() - 1];

    for (i, a) in p.iter().enumerate() {
        for (j, b) in q.iter().enumerate() {
            product[i + j] = &product[i + j] + &(a * b);
        }
    }

    product
}

/// Subtracts two polynomials given as coefficient arrays, from the constant term up.
fn subtract_polynomials(p: &[BigInt], q: &[BigInt]) -> Vec<BigInt> {
    let zero = BigInt::zero();

    (0..p.len().max(q.len())).map(|i| p.get(i).unwrap_or(&zero) - q.get(i).unwrap_or(&zero)).collect()
}

/// Builds the monic polynomial whose roots are 4*cos(j*Pi/(2n+1))^2 for j = 1..n, like createRootPolynomial of
/// js/solvers/dominoTilingSolver-Formula.js: with z = x - 2 these are the roots of Q_n(z), where Q_0 = 1,
/// Q_1 = z + 1 and Q_k = z * Q_{k-1} - Q_{k-2}.
fn create_root_polynomial(n: usize) -> Vec<BigInt> {
    let z = [BigInt::from_i64(-2), BigInt::from_i64(1)];
    let mut previous = vec![BigInt::from_i64(1)];
    let mut current = vec![BigInt::from_i64(-1), BigInt::from_i64(1)];

    if n == 0 {
        return previous;
    }

    for _ in 2..=n {
        let next = subtract_polynomials(&multiply_polynomials(&z, &current), &previous);
        previous = std::mem::replace(&mut current, next);
    }

    current
}

/// Calculates the determinant of an integer matrix with fraction-free Bareiss elimination.
fn calculate_determinant(mut a: Vec<Vec<BigInt>>) -> BigInt {
    let size = a.len();
    let mut negative = false;
    let mut previous_pivot = BigInt::from_i64(1);

    if size == 0 {
        return BigInt::from_i64(1);
    }

    for k in 0..size - 1 {
        if a[k][k].is_zero() {
            let Some(pivot_row) = (k + 1..size).find(|&i| !a[i][k].is_zero()) else {
                return BigInt::zero();
            };

            a.swap(k, pivot_row);
            negative = !negative;
        }

        for i in k + 1..size {
            for j in k + 1..size {
                a[i][j] = &(&(&a[i][j] * &a[k][k]) - &(&a[i][k] * &a[k][j])) / &previous_pivot;
            }
        }

        previous_pivot = a[k][k].clone();
    }

    let last = a[size - 1][size - 1].clone();

    if negative { last.negated() } else { last }
}

/// Calculates the resultant of two polynomials of equal degree from their Sylvester matrix.
fn calculate_resultant(p: &[BigInt], q: &[BigInt]) -> BigInt {
    let degree = p.len() - 1;
    let size = 2 * degree;
    let sylvester_matrix = (0..size)
        .map(|i| {
            let mut row = vec![BigInt::zero(); size];
            let (polynomial, shift) = if i < degree { (p, i) } else { (q, i - degree) };

            for k in 0..=degree {
                row[shift + k] = polynomial[degree - k].clone();
            }

            row
        })
        .collect();

    calculate_determinant(sylvester_matrix)
}

fn calculate_total_tiling_combinations(row_count: usize) -> BigInt {
    let n = row_count / 2;
    let p = create_root_polynomial(n);
    let p_of_minus_x: Vec<BigInt> =
        p.iter().enumerate().map(|(i, coefficient)| if i % 2 == 1 { coefficient.negated() } else { coefficient.clone() }).collect();
    let resultant = calculate_resultant(&p, &p_of_minus_x);

    if n % 2 == 1 { resultant.negated() } else { resultant }
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

    if row_count != col_count || row_count % 2 != 0 {
        eprintln!("{SQUARE_BOARDS_ONLY}");
        return ExitCode::FAILURE;
    }

    let timer = Timer::start(&argv);
    let result = calculate_total_tiling_combinations(row_count as usize);
    timer.stop();
    println!("{result}");
    ExitCode::SUCCESS
}
