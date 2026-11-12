use std::process::ExitCode;

use lattice_dimers_core::{Timer, parse_args};

const MAX_SHORTER_SIDE: u64 = 30;
const MAX_EXACT_COUNT: f64 = 9_007_199_254_740_991.0;
const FIRST_EXPONENT_COUNT: f64 = 1e21;
const USAGE: &str = "Usage: domino-rectangle-float -r <rowCount> -c <colCount>";

/// Fills the free cells of one row from col_index on, like searchTileArrangements of
/// js/solvers/domino-rectangle-float.js. The counts are doubles added in the order of the JavaScript solver, so a
/// count above 2^53 rounds to the same value.
fn search_tile_arrangements(
    current_row: &[f64],
    next_row: &mut [f64],
    col_count: usize,
    current_mask: usize,
    col_index: usize,
    next_mask: usize,
) {
    if col_index >= col_count {
        next_row[next_mask] += current_row[current_mask];
        return;
    }

    let current_bit = 1 << col_index;
    let next_bit = 1 << (col_index + 1);

    if current_mask & current_bit != 0 {
        search_tile_arrangements(current_row, next_row, col_count, current_mask, col_index + 1, next_mask);
    } else {
        search_tile_arrangements(current_row, next_row, col_count, current_mask, col_index + 1, next_mask | current_bit);
    }

    if col_index + 1 < col_count && current_mask & current_bit == 0 && current_mask & next_bit == 0 {
        search_tile_arrangements(current_row, next_row, col_count, current_mask, col_index + 2, next_mask);
    }
}

fn calculate_total_tiling_combinations(row_count: usize, col_count: usize) -> f64 {
    let (row_count, col_count) = (row_count.max(col_count), row_count.min(col_count));
    let mut current_row = vec![0.0; 1 << col_count];
    current_row[0] = 1.0;

    for _ in 0..row_count {
        let mut next_row = vec![0.0; 1 << col_count];

        for current_mask in 0..1 << col_count {
            search_tile_arrangements(&current_row, &mut next_row, col_count, current_mask, 0, 0);
        }

        current_row = next_row;
    }

    current_row[0]
}

/// Writes a count the way JavaScript writes a Number, the shortest digits that identify the double.
fn format_count(count: f64) -> String {
    if count.is_infinite() {
        "Infinity".to_string()
    } else if count >= FIRST_EXPONENT_COUNT {
        format!("{count:e}").replace('e', "e+")
    } else {
        format!("{count}")
    }
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
            "The shorter side of the board can be at most {MAX_SHORTER_SIDE}, because the rows are indexed with 32-bit integers."
        );
        return ExitCode::FAILURE;
    }

    let timer = Timer::start(&argv);
    let result = calculate_total_tiling_combinations(row_count as usize, col_count as usize);
    timer.stop();
    println!("{}", format_count(result));

    if result > MAX_EXACT_COUNT {
        eprintln!("Warning: the result is above 2^53, so it is not exact. Use domino-rectangle-bigint for this board.");
    }

    ExitCode::SUCCESS
}
