use std::array;
use std::num::NonZero;
use std::process::ExitCode;
use std::thread;

use lattice_dimers_core::{BigInt, Timer, combine_checked_residues, has_unknown_argument, list_primes, parse_args, run_workers};

const MAX_CIRCUMFERENCE: u64 = 24;
const USAGE: &str = "Usage: any-lattice-cylinder-torus-modular -r <rowCount> -c <circumference> [--torus] [--twisted] [--lattice king|triangular|square] [-j <jobs>]\nThe circumference is at least 2, and a torus has at least 2 rows, unless the board has no cells.";

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

/// One way into a next state, like a term of listBlocks in js/solvers/any-lattice-cylinder-torus-modular.js: the
/// count of the state that leads to it lies `shift` entries below the next state in the current table. A move onto
/// the next cell sets bit 0 of the next state, so it has only odd next states (`odd_only`), and a piece across the
/// seam of a twisted board is subtracted (`negative`).
#[derive(Clone, Copy)]
struct Term {
    shift: usize,
    odd_only: bool,
    negative: bool,
}

/// A term over one block of next entries. The entry at place p reads `counts[2 * p + bit]`, where bit is bit 0
/// of its state; an odd-only term reads `counts[2 * p]`, and only when that bit is 1.
#[derive(Clone, Copy)]
struct Source<'a> {
    counts: &'a [u32],
    odd_only: bool,
    negative: bool,
}

fn lattice_of(name: &str) -> Option<Lattice> {
    match name {
        "square" => Some(Lattice { down_left: false, down_right: false }),
        "triangular" => Some(Lattice { down_left: false, down_right: true }),
        "king" => Some(Lattice { down_left: true, down_right: true }),
        _ => None,
    }
}

/// Lists the moves of a free cell in column c, like listMoves of js/solvers/any-lattice-cylinder-torus-modular.js.
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

/// Lists the terms of the cell step of column c for every block of the next table, like listBlocks of
/// js/solvers/any-lattice-cylinder-torus-modular.js. The top bits of an entry decide its terms, so the table is at
/// most sixteen blocks of entries with the same terms.
fn list_blocks(cols: usize, c: usize, moves: &[Move], twisted: bool, uses_wrap_bit: bool) -> Vec<Vec<Term>> {
    let entry_bits = cols + usize::from(uses_wrap_bit);
    let block_bits = entry_bits.min(3 + usize::from(uses_wrap_bit));
    let joins = uses_wrap_bit && c == cols - 2;

    (0..1usize << block_bits)
        .map(|block| {
            let entry = block << (entry_bits - block_bits);
            let is_set = |bit: usize| entry >> bit & 1 == 1;
            let held = uses_wrap_bit && is_set(cols);
            let open = joins || !is_set(cols - 1);
            let base = if held { 1 << cols } else { 0 };
            let mut terms = Vec::new();

            if joins && held {
                return terms;
            }

            if open {
                terms.push(Term { shift: base, odd_only: false, negative: false });
            }

            for &Move { bit, crossing } in moves {
                let offset = bit.trailing_zeros() as usize;
                let negative = twisted && crossing;

                if offset == cols + 2 && held && open {
                    terms.push(Term { shift: 2 << cols, odd_only: false, negative });
                } else if offset == 1 && open {
                    terms.push(Term { shift: base + 1, odd_only: true, negative });
                } else if offset > 1 && offset < cols + 2 && is_set(offset - 2) && (offset == cols + 1 || open) {
                    terms.push(Term { shift: base + (1 << (offset - 1)), odd_only: false, negative });
                }
            }

            terms
        })
        .collect()
}

fn add(sum: u32, count: u32, prime: u32) -> u32 {
    let sum = sum + count;

    if sum >= prime { sum - prime } else { sum }
}

/// Sums the terms of one next entry: `place` is its place in the block and `bit` is bit 0 of its state.
#[inline(always)]
fn sum_sources<const N: usize>(sources: &[Source; N], place: usize, bit: usize, prime: u32) -> u32 {
    let mut sum = 0;

    for source in sources {
        let count = if source.odd_only { source.counts[2 * place] & (bit as u32).wrapping_neg() } else { source.counts[2 * place + bit] };

        sum = add(sum, if source.negative { prime - count } else { count }, prime);
    }

    sum
}

/// Fills one block of the next table, which starts at the entry `from`. Two neighbouring entries have opposite
/// bits 0, so the number of set bits is counted once per pair.
fn fill_block<const N: usize>(block: &mut [u32], current: &[u32], from: usize, terms: &[Term], parity: u32, prime: u32) {
    let sources: [Source; N] = array::from_fn(|at| {
        let Term { shift, odd_only, negative } = terms[at];
        let start = 2 * from + usize::from(odd_only) - shift;

        Source { counts: &current[start..start + 2 * block.len()], odd_only, negative }
    });
    let bit_of = |place: usize| ((parity + (from + place).count_ones()) & 1) as usize;

    if let [slot] = block {
        *slot = sum_sources(&sources, 0, bit_of(0), prime);
        return;
    }

    for (pair, slots) in block.as_chunks_mut::<2>().0.iter_mut().enumerate() {
        let bit = bit_of(2 * pair);

        slots[0] = sum_sources(&sources, 2 * pair, bit, prime);
        slots[1] = sum_sources(&sources, 2 * pair + 1, 1 - bit, prime);
    }
}

/// Counts the tilings of a cylinder or a torus modulo a prime, cell by cell, like countModulo of
/// js/solvers/any-lattice-cylinder-torus-modular.js: the tables hold one count of u32 per value of the window bits
/// 1 to cols and, on the king's graph with cols >= 3, of the one bit that stands for the extra bit and the top
/// window bit. A board with an odd number of cells counts 0 without a run. A torus runs one start per class of
/// rotations and, on the square lattice and the king's graph, of mirror images.
fn count_modulo(board: &Board, prime: u32) -> u32 {
    let Board { rows, cols, lattice, torus, twisted } = *board;

    if !(rows * cols).is_multiple_of(2) {
        return 0;
    }

    let wrap_bit: u32 = 1 << (cols + 2);
    let uses_wrap_bit = lattice.down_left && cols >= 3;
    let entry_bits = cols + usize::from(uses_wrap_bit);
    let block_size = (1usize << entry_bits) >> entry_bits.min(3 + usize::from(uses_wrap_bit));
    let list = |has_below: bool| -> Vec<Vec<Vec<Term>>> {
        (0..cols).map(|c| list_blocks(cols, c, &list_moves(cols, c, has_below, lattice, wrap_bit), twisted, uses_wrap_bit)).collect()
    };
    let blocks_below = list(true);
    let blocks_last = list(torus);
    let mut current = vec![0u32; 1 << entry_bits];
    let mut next = vec![0u32; 1 << entry_bits];

    let mut run = |start: usize| -> u32 {
        current.fill(0);
        current[start >> 1] = 1 % prime;

        for cell in 0..rows * cols {
            let blocks = if cell < (rows - 1) * cols { &blocks_below[cell % cols] } else { &blocks_last[cell % cols] };
            let parity = (cell as u32 + 1 + start.count_ones()) & 1;

            for (block, (slots, terms)) in next.chunks_exact_mut(block_size).zip(blocks).enumerate() {
                let from = block * block_size;

                match terms.len() {
                    0 => slots.fill(0),
                    1 => fill_block::<1>(slots, &current, from, terms, parity, prime),
                    2 => fill_block::<2>(slots, &current, from, terms, parity, prime),
                    3 => fill_block::<3>(slots, &current, from, terms, parity, prime),
                    4 => fill_block::<4>(slots, &current, from, terms, parity, prime),
                    5 => fill_block::<5>(slots, &current, from, terms, parity, prime),
                    count => unreachable!("a block has at most five terms, not {count}"),
                }
            }

            std::mem::swap(&mut current, &mut next);
        }

        current[start >> 1]
    };

    if !torus {
        return if rows == 0 { 1 % prime } else { run(0) };
    }

    let rotate = |set: usize| ((set << 1) | (set >> (cols - 1))) & ((1 << cols) - 1);
    let rotates = !twisted || rows.is_multiple_of(2);
    let mirrors = lattice.down_left == lattice.down_right;
    let mut total: u64 = 0;

    for start in 0..1usize << cols {
        let mut weight: u64 = 1;

        if rotates {
            let mut rotation = rotate(start);

            while rotation > start {
                weight += 1;
                rotation = rotate(rotation);
            }

            if rotation != start {
                continue;
            }
        }

        if mirrors {
            let mirrored = start.reverse_bits() >> (usize::BITS as usize - cols);
            let mut least = mirrored;
            let mut rotation = rotate(mirrored);

            while rotates && rotation != mirrored {
                least = least.min(rotation);
                rotation = rotate(rotation);
            }

            if least < start {
                continue;
            }

            if least > start {
                weight *= 2;
            }
        }

        total = (total + weight * u64::from(run(start))) % u64::from(prime);
    }

    total as u32
}

/// Bounds log2 of the number of tilings, like calculateLog2Bound of js/solvers/any-lattice-cylinder-torus-modular.js.
fn calculate_log2_bound(board: &Board) -> f64 {
    let wrap_bit = 1u32 << (board.cols + 2);
    let most = (0..board.cols)
        .map(|c| list_moves(board.cols, c, board.rows > 1 || board.torus, board.lattice, wrap_bit).len())
        .max()
        .unwrap_or(1);

    ((board.rows * board.cols) as f64 / 2.0) * (most as f64).log2() + if board.torus { board.cols as f64 } else { 0.0 }
}

/// Counts the tilings exactly with the Chinese remainder theorem, like calculateTotalTilingCombinations of
/// js/solvers/any-lattice-cylinder-torus-modular.js. The board is valid and within the circumference limit.
fn calculate_total_tiling_combinations(
    row_count: usize,
    col_count: usize,
    lattice: Lattice,
    torus: bool,
    twisted: bool,
    jobs: usize,
) -> Result<BigInt, String> {
    if row_count == 0 || col_count == 0 {
        return Ok(BigInt::from_u64(1));
    }

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
    let (row_count, col_count) = options
        .get("rowCount")
        .copied()
        .flatten()
        .zip(options.get("colCount").copied().flatten())
        .filter(|&(rows, cols)| rows == 0 || cols == 0 || (cols >= 2 && (!torus || rows >= 2)))
        .unzip();

    let (Some(row_count), Some(col_count), Some(lattice), Some(jobs), false) = (row_count, col_count, lattice, jobs.filter(|jobs| *jobs > 0), has_unknown_argument(&argv, &["-r", "-c", "-j", "--lattice"], &["--torus", "--twisted"]))
    else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };

    if col_count.min(if torus && !twisted { row_count } else { u64::MAX }) > MAX_CIRCUMFERENCE {
        eprintln!(
            "The circumference can be at most {MAX_CIRCUMFERENCE}, because every worker thread keeps two tables whose size doubles with every unit of the circumference."
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_zero_on_a_torus_with_an_odd_number_of_cells() {
        let prime = list_primes(1)[0];

        for name in ["square", "triangular", "king"] {
            let lattice = lattice_of(name).unwrap();

            for (rows, cols) in [(3, 3), (5, 3), (3, 5)] {
                for twisted in [false, true] {
                    assert_eq!(count_modulo(&Board { rows, cols, lattice, torus: true, twisted }, prime), 0, "{rows}x{cols} {name} twisted={twisted}");
                }
            }
        }
    }
}
