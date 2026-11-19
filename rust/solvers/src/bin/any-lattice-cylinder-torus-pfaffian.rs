use std::cmp::Ordering;
use std::num::NonZero;
use std::process::ExitCode;
use std::thread;

use lattice_dimers_core::{BigInt, Timer, combine_checked_residues, has_unknown_argument, list_primes, parse_args, pfaffian_modulo, run_workers};

const MAX_CELLS: u64 = 1600;
const STEPS: [(usize, usize); 3] = [(1, 0), (0, 1), (1, 1)];
const USAGE: &str = "Usage: any-lattice-cylinder-torus-pfaffian -r <rowCount> -c <circumference> --lattice square|triangular [--torus] [-j <jobs>]\nThe circumference is at least 2, and a torus has at least 2 rows, unless the board has no cells.";
const NOT_PLANAR: &str = "The king's graph is not planar, so a Pfaffian does not count its tilings. Pass --lattice square or --lattice triangular.";

#[derive(Clone, Copy)]
struct Board {
    rows: usize,
    cols: usize,
    diagonal: bool,
    torus: bool,
}

/// Numbers the cell in row x and column y, like numberCells of js/solvers/any-lattice-cylinder-torus-pfaffian.js: the
/// cells of one line along the shorter side together, and where the lines go around a seam, taken from both ends in
/// turn, so the last line is next to the first.
fn number_of(board: &Board, x: usize, y: usize) -> usize {
    let fold = |line: usize, count: usize| if 2 * line < count { 2 * line } else { 2 * (count - 1 - line) + 1 };

    if board.cols > board.rows {
        fold(y, board.cols) * board.rows + x
    } else if board.torus {
        fold(x, board.rows) * board.cols + y
    } else {
        x * board.cols + y
    }
}

/// Writes the entries above the diagonal of the Kasteleyn matrix of the board modulo a prime, like fillMatrix of
/// js/solvers/any-lattice-cylinder-torus-pfaffian.js. The cell in row x and column y has an edge to the cells at
/// (x + 1, y) and (x, y + 1) and, with a diagonal, (x + 1, y + 1). The entry of an edge is -1 for the first two steps
/// out of a cell whose alternating coordinate is even and 1 otherwise, and its negative in the other direction. The
/// alternating coordinate is the row when the number of rows is even and the column otherwise, so the pattern of
/// period 2 closes across a seam. An edge across the row seam changes sign with flip_rows and one across the column
/// seam with flip_columns. Two edges between the same cells add.
fn fill_matrix(board: &Board, flip_rows: bool, flip_columns: bool, prime: u32, matrix: &mut [u32]) {
    let Board { rows, cols, diagonal, torus } = *board;
    let size = rows * cols;
    let alternates_by_row = rows.is_multiple_of(2);

    matrix.fill(0);

    for x in 0..rows {
        for y in 0..cols {
            let even = if alternates_by_row { x } else { y }.is_multiple_of(2);

            for &(dx, dy) in &STEPS[..if diagonal { 3 } else { 2 }] {
                if x + dx >= rows && !torus {
                    continue;
                }

                let (from, to) = (number_of(board, x, y), number_of(board, (x + dx) % rows, (y + dy) % cols));
                let negative = (even && dx + dy == 1) ^ (flip_rows && x + dx >= rows) ^ (flip_columns && y + dy >= cols) ^ (from > to);
                let cell = from.min(to) * size + from.max(to);

                matrix[cell] = (matrix[cell] + if negative { prime - 1 } else { 1 }) % prime;
            }
        }
    }
}

/// Counts modulo a prime, like countModulo of js/solvers/any-lattice-cylinder-torus-pfaffian.js. A cylinder gives its
/// two Pfaffians, with and without the sign on the column seam. A torus gives the four values (S - 2 p) / 2, where p
/// runs over its four Pfaffians and S is their sum.
fn count_modulo(board: &Board, prime: u32) -> Vec<u32> {
    let size = board.rows * board.cols;
    let p = u64::from(prime);
    let mut matrix = vec![0u32; size * size];
    let mut pfaffian = |flip_rows: bool, flip_columns: bool| {
        fill_matrix(board, flip_rows, flip_columns, prime, &mut matrix);
        u64::from(pfaffian_modulo(&mut matrix, size, prime))
    };

    if !board.torus {
        return vec![pfaffian(false, false) as u32, pfaffian(false, true) as u32];
    }

    let pfaffians = [pfaffian(false, false), pfaffian(true, false), pfaffian(false, true), pfaffian(true, true)];
    let sum = pfaffians.iter().sum::<u64>() % p;
    let half = p.div_ceil(2);

    pfaffians.iter().map(|value| ((sum + 2 * (p - value)) % p * half % p) as u32).collect()
}

/// Bounds log2 of the number of tilings, like calculateLog2Bound of js/solvers/any-lattice-cylinder-torus-pfaffian.js.
fn calculate_log2_bound(board: &Board) -> f64 {
    let below = if board.rows == 1 && !board.torus { 0 } else { 1 + usize::from(board.diagonal) };
    let starts = if board.torus { board.rows.min(board.cols) } else { 0 };

    ((board.rows * board.cols) as f64 / 2.0) * ((2 + below) as f64).log2() + starts as f64
}

/// Counts the tilings exactly, like calculateTotalTilingCombinations of
/// js/solvers/any-lattice-cylinder-torus-pfaffian.js. The board is valid and within the limit on its cells.
fn calculate_total_tiling_combinations(rows: usize, cols: usize, diagonal: bool, torus: bool, jobs: usize) -> Result<BigInt, String> {
    if rows == 0 || cols == 0 {
        return Ok(BigInt::from_u64(1));
    }

    if !(rows * cols).is_multiple_of(2) {
        return Ok(BigInt::zero());
    }

    let board = Board { rows, cols, diagonal, torus };
    let prime_count = ((calculate_log2_bound(&board) + 2.0) / 30.0).ceil() as usize + 1;
    let primes = list_primes(prime_count);
    let residues = run_workers(&primes, jobs, |prime| count_modulo(&board, *prime));
    let mut largest = BigInt::zero();

    for candidate in 0..residues[0].len() {
        let column: Vec<u32> = residues.iter().map(|values| values[candidate]).collect();
        let value = combine_checked_residues(&column, &primes, true)?;

        if value.cmp_magnitude(&largest) == Ordering::Greater {
            largest = if value.is_negative() { value.negated() } else { value };
        }
    }

    Ok(largest)
}

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    let options = parse_args(&argv, &[("-r", "rowCount"), ("-c", "colCount"), ("-j", "jobs")]);
    let lattice = match argv.iter().position(|arg| arg == "--lattice") {
        None => Some("king"),
        Some(index) => argv.get(index + 1).map(String::as_str).filter(|name| ["square", "triangular", "king"].contains(name)),
    };
    let torus = argv.iter().any(|arg| arg == "--torus");
    let jobs = match options.get("jobs") {
        None => Some(thread::available_parallelism().map_or(1, NonZero::get) as u64),
        Some(value) => *value,
    };
    let (row_count, col_count) = options
        .get("rowCount")
        .copied()
        .flatten()
        .zip(options.get("colCount").copied().flatten())
        .filter(|&(rows, cols)| rows == 0 || cols == 0 || (cols >= 2 && (!torus || rows >= 2)))
        .unzip();

    let (Some(row_count), Some(col_count), Some(lattice), Some(jobs), false) = (row_count, col_count, lattice, jobs.filter(|jobs| *jobs > 0), has_unknown_argument(&argv, &["-r", "-c", "-j", "--lattice"], &["--torus"]))
    else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };

    if lattice == "king" {
        eprintln!("{NOT_PLANAR}");
        return ExitCode::FAILURE;
    }

    if row_count.saturating_mul(col_count) > MAX_CELLS {
        eprintln!("The board can have at most {MAX_CELLS} cells, because every worker thread keeps a matrix of cells x cells entries.");
        return ExitCode::FAILURE;
    }

    let jobs = usize::try_from(jobs).unwrap_or(usize::MAX);
    let timer = Timer::start(&argv);

    match calculate_total_tiling_combinations(row_count as usize, col_count as usize, lattice == "triangular", torus, jobs) {
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
