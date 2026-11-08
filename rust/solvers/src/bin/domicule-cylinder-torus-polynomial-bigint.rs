use std::process::ExitCode;

use lattice_dimers_core::{BigInt, Timer, parse_args};

const MAX_CIRCUMFERENCE: u64 = 20;
const USAGE: &str = "Usage: domicule-cylinder-torus-polynomial-bigint -r <rowCount> -c <circumference> [--torus]\nThe circumference is at least 2, and a torus has at least 2 rows.";

#[derive(Clone, Copy)]
struct Transition {
    next: usize,
    diagonals: usize,
}

/// Fills the free cells of one row from column c on, like fill in listRowTransitions of
/// js/solvers/domicule-cylinder-torus-polynomial-bigint.js: a covered cell is skipped, two free cells take a horizontal piece, the
/// first and the last column take one across the seam, and a free cell sends a piece to the next row straight or
/// diagonally, which counts the diagonal pieces.
fn fill(cols: usize, c: usize, filled: usize, next: usize, diagonals: usize, transitions: &mut Vec<Transition>) {
    if c == cols {
        transitions.push(Transition { next, diagonals });
        return;
    }

    if filled & (1 << c) != 0 {
        fill(cols, c + 1, filled, next, diagonals, transitions);
        return;
    }

    if c + 1 < cols && filled & (1 << (c + 1)) == 0 {
        fill(cols, c + 2, filled | (1 << c) | (1 << (c + 1)), next, diagonals, transitions);
    }

    if c == 0 && filled & (1 << (cols - 1)) == 0 {
        fill(cols, 1, filled | 1 | (1 << (cols - 1)), next, diagonals, transitions);
    }

    for shift in [-1i64, 0, 1] {
        let target = (c as i64 + shift).rem_euclid(cols as i64) as usize;

        if next & (1 << target) == 0 {
            fill(cols, c + 1, filled | (1 << c), next | (1 << target), diagonals + usize::from(shift != 0), transitions);
        }
    }
}

fn list_row_transitions(cols: usize) -> Vec<Vec<Transition>> {
    (0..1usize << cols)
        .map(|covered| {
            let mut transitions = Vec::new();
            fill(cols, 0, covered, 0, 0, &mut transitions);
            transitions
        })
        .collect()
}

fn zeros(length: usize) -> Result<Vec<BigInt>, String> {
    let mut polynomial = Vec::new();
    polynomial.try_reserve_exact(length).map_err(|_| "Invalid array length".to_string())?;
    polynomial.resize(length, BigInt::zero());
    Ok(polynomial)
}

/// Adds a polynomial times x^diagonals to the polynomial of the target state, which starts at zero. A power past the
/// degree is dropped, as no tiling reaches it.
fn add(target: &mut Option<Vec<BigInt>>, polynomial: &[BigInt], diagonals: usize) {
    let sum = target.get_or_insert_with(|| vec![BigInt::zero(); polynomial.len()]);

    for (coefficient, addend) in sum[diagonals.min(polynomial.len())..].iter_mut().zip(polynomial) {
        *coefficient += addend;
    }
}

/// Runs the rows from one start set back to the states it reaches, like run in
/// js/solvers/domicule-cylinder-torus-polynomial-bigint.js, and returns the polynomial of the start set itself.
fn run(transitions: &[Vec<Transition>], rows: usize, degree: usize, start: usize) -> Result<Vec<BigInt>, String> {
    let mut initial = zeros(degree + 1)?;
    initial[0] = BigInt::from_u64(1);
    let mut vector: Vec<Option<Vec<BigInt>>> = vec![None; transitions.len()];
    vector[start] = Some(initial);

    for _ in 0..rows {
        let mut next: Vec<Option<Vec<BigInt>>> = vec![None; transitions.len()];

        for (state, polynomial) in vector.iter().enumerate() {
            let Some(polynomial) = polynomial else {
                continue;
            };

            for transition in &transitions[state] {
                add(&mut next[transition.next], polynomial, transition.diagonals);
            }
        }

        vector = next;
    }

    match vector.swap_remove(start) {
        Some(polynomial) => Ok(polynomial),
        None => zeros(degree + 1),
    }
}

/// Counts the domicule tilings of a cylinder or a torus by the number of diagonal pieces with the row transfer of
/// js/solvers/domicule-cylinder-torus-polynomial-bigint.js: the coefficient of x^k in a state counts the partial tilings
/// with k diagonal pieces. A torus runs the smallest rotation of every start set, weighted by the number of its
/// rotations, and takes its shorter side as the circumference.
fn calculate_diagonal_polynomial(row_count: usize, col_count: usize, torus: bool) -> Result<Vec<BigInt>, String> {
    let transpose = torus && row_count < col_count;
    let (rows, cols) = if transpose { (col_count, row_count) } else { (row_count, col_count) };
    let degree = rows * cols / 2;

    if !(rows * cols).is_multiple_of(2) {
        return zeros(degree + 1);
    }

    let transitions = list_row_transitions(cols);

    if !torus {
        return run(&transitions, rows, degree, 0);
    }

    let rotate = |set: usize| ((set << 1) | (set >> (cols - 1))) & ((1 << cols) - 1);
    let mut total = zeros(degree + 1)?;

    for start in 0..1usize << cols {
        let mut weight: u32 = 1;
        let mut rotation = rotate(start);

        while rotation > start {
            weight += 1;
            rotation = rotate(rotation);
        }

        if rotation != start {
            continue;
        }

        for (sum, count) in total.iter_mut().zip(run(&transitions, rows, degree, start)?) {
            *sum += &count.mul_small(weight);
        }
    }

    Ok(total)
}

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    let options = parse_args(&argv, &[("-r", "rowCount"), ("-c", "colCount")]);
    let torus = argv.iter().any(|arg| arg == "--torus");
    let row_count = options.get("rowCount").copied().flatten().filter(|rows| *rows >= if torus { 2 } else { 0 });
    let col_count = options.get("colCount").copied().flatten().filter(|cols| *cols >= 2);

    let (Some(row_count), Some(col_count)) = (row_count, col_count) else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };

    if col_count.min(if torus { row_count } else { u64::MAX }) > MAX_CIRCUMFERENCE {
        eprintln!("The circumference can be at most {MAX_CIRCUMFERENCE}; use domicule-cylinder-torus-polynomial-modular.js for larger boards.");
        return ExitCode::FAILURE;
    }

    let timer = Timer::start(&argv);

    match calculate_diagonal_polynomial(row_count as usize, col_count as usize, torus) {
        Ok(coefficients) => {
            timer.stop();
            let text: Vec<String> = coefficients.iter().map(ToString::to_string).collect();
            println!("{}", text.join(","));
            ExitCode::SUCCESS
        }
        Err(message) => {
            eprintln!("{message}");
            ExitCode::FAILURE
        }
    }
}
