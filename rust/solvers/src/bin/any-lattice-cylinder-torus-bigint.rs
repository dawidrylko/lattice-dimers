use std::process::ExitCode;

use lattice_dimers_core::{BigInt, Timer, parse_args};

const MAX_CIRCUMFERENCE: u64 = 20;
const USAGE: &str = "Usage: any-lattice-cylinder-torus-bigint -r <rowCount> -c <circumference> [--torus] [--twisted] [--lattice king|triangular|square]\nThe circumference is at least 2, and a torus has at least 2 rows.";

#[derive(Clone, Copy)]
struct Transition {
    next: u32,
    crossings: u32,
}

fn shifts_of(lattice: &str) -> Option<&'static [i64]> {
    match lattice {
        "square" => Some(&[0]),
        "triangular" => Some(&[0, 1]),
        "king" => Some(&[-1, 0, 1]),
        _ => None,
    }
}

/// Fills the free cells of one row from column c on, like fill in listRowTransitions of
/// js/solvers/any-lattice-cylinder-torus-bigint.js: a covered cell is skipped, two free cells take a horizontal piece, the
/// first and the last column take one across the seam, and a free cell sends a piece to the next row for every shift.
fn fill(cols: usize, shifts: &[i64], c: usize, filled: u32, next: u32, crossings: u32, transitions: &mut Vec<Transition>) {
    if c == cols {
        transitions.push(Transition { next, crossings });
        return;
    }

    if filled & (1 << c) != 0 {
        fill(cols, shifts, c + 1, filled, next, crossings, transitions);
        return;
    }

    if c + 1 < cols && filled & (1 << (c + 1)) == 0 {
        fill(cols, shifts, c + 2, filled | (1 << c) | (1 << (c + 1)), next, crossings, transitions);
    }

    if c == 0 && filled & (1 << (cols - 1)) == 0 {
        fill(cols, shifts, 1, filled | 1 | (1 << (cols - 1)), next, crossings + 1, transitions);
    }

    for &shift in shifts {
        let reached = c as i64 + shift;
        let target = reached.rem_euclid(cols as i64) as usize;

        if next & (1 << target) == 0 {
            let crossed = u32::from(reached != target as i64);
            fill(cols, shifts, c + 1, filled | (1 << c), next | (1 << target), crossings + crossed, transitions);
        }
    }
}

fn list_row_transitions(cols: usize, shifts: &[i64]) -> Vec<Vec<Transition>> {
    (0..1u32 << cols)
        .map(|covered| {
            let mut transitions = Vec::new();
            fill(cols, shifts, 0, covered, 0, 0, &mut transitions);
            transitions
        })
        .collect()
}

/// Runs the rows from one state back to itself. Both vectors are as long as the state space, and a state whose count is
/// zero has nothing to send on, where the JavaScript solver keeps only the states it reached.
fn run(transitions: &[Vec<Transition>], rows: usize, start: usize, twisted: bool) -> BigInt {
    let mut vector = vec![BigInt::zero(); transitions.len()];
    let mut next = vec![BigInt::zero(); transitions.len()];
    vector[start] = BigInt::from_u64(1);

    for _ in 0..rows {
        for (state, count) in vector.iter().enumerate() {
            if count.is_zero() {
                continue;
            }

            let negated = if twisted { count.negated() } else { BigInt::zero() };

            for transition in &transitions[state] {
                let sent = if twisted && transition.crossings % 2 == 1 { &negated } else { count };
                next[transition.next as usize] += sent;
            }
        }

        std::mem::swap(&mut vector, &mut next);
        next.fill(BigInt::zero());
    }

    vector.swap_remove(start)
}

fn calculate_total_tiling_combinations(rows: usize, cols: usize, shifts: &[i64], torus: bool, twisted: bool) -> BigInt {
    let transitions = list_row_transitions(cols, shifts);

    if !torus {
        return run(&transitions, rows, 0, twisted);
    }

    let mut total = BigInt::zero();

    for start in 0..transitions.len() {
        total += &run(&transitions, rows, start, twisted);
    }

    total
}

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    let options = parse_args(&argv, &[("-r", "rowCount"), ("-c", "colCount")]);
    let shifts = match argv.iter().position(|arg| arg == "--lattice") {
        None => shifts_of("king"),
        Some(index) => argv.get(index + 1).and_then(|name| shifts_of(name)),
    };
    let torus = argv.iter().any(|arg| arg == "--torus");
    let twisted = argv.iter().any(|arg| arg == "--twisted");
    let row_count = options.get("rowCount").copied().flatten().filter(|rows| *rows >= if torus { 2 } else { 0 });
    let col_count = options.get("colCount").copied().flatten().filter(|cols| *cols >= 2);

    let (Some(row_count), Some(col_count), Some(shifts)) = (row_count, col_count, shifts) else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };

    if col_count > MAX_CIRCUMFERENCE {
        eprintln!("The circumference can be at most {MAX_CIRCUMFERENCE}; use any-lattice-cylinder-torus-modular for larger boards.");
        return ExitCode::FAILURE;
    }

    let timer = Timer::start(&argv);
    let result = calculate_total_tiling_combinations(row_count as usize, col_count as usize, shifts, torus, twisted);
    timer.stop();
    println!("{result}");
    ExitCode::SUCCESS
}
