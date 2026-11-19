use std::array;
use std::num::NonZero;
use std::process::ExitCode;
use std::thread;

use lattice_dimers_core::{BigInt, Timer, calculate_log2_bound, combine_checked_residues, list_primes, parse_args, run_workers};

const MAX_SHORTER_SIDE: u64 = 30;
const USAGE: &str = "Usage: domicule-rectangle-modular -r <rowCount> -c <colCount> [-j <jobs>]";

/// One way into a next state, like a term of listBlocks in js/solvers/domicule-rectangle-modular.js: the count of
/// the state that leads to it lies `shift` entries below the next state in the current table. A move onto the next
/// cell sets bit 0 of the next state, so it has only odd next states (`odd_only`).
#[derive(Clone, Copy)]
struct Term {
    shift: usize,
    odd_only: bool,
}

/// A term over one block of next entries. The entry at place p reads `counts[2 * p + bit]`, where bit is bit 0
/// of its state; an odd-only term reads `counts[2 * p]`, and only when that bit is 1.
#[derive(Clone, Copy)]
struct Source<'a> {
    counts: &'a [u32],
    odd_only: bool,
}

/// Lists the offsets of the cells a free cell in column c can cover with its partner, like listOffsets of
/// js/solvers/domicule-rectangle-modular.js: right, down-left, down and down-right.
fn list_offsets(cols: usize, c: usize, has_below: bool) -> Vec<usize> {
    let has_right = c + 1 < cols;
    let mut offsets = Vec::new();

    if has_right {
        offsets.push(1);
    }

    if has_below && c > 0 {
        offsets.push(cols - 1);
    }

    if has_below {
        offsets.push(cols);
    }

    if has_below && has_right {
        offsets.push(cols + 1);
    }

    offsets
}

/// Lists the terms of the cell step of column c for every block of the next table, like listBlocks of
/// js/solvers/domicule-rectangle-modular.js. The top three bits of an entry decide its terms, so the table is at
/// most eight blocks of entries with the same terms.
fn list_blocks(cols: usize, c: usize, has_below: bool) -> Vec<Vec<Term>> {
    let offsets = list_offsets(cols, c, has_below);
    let block_bits = cols.min(3);

    (0..1usize << block_bits)
        .map(|block| {
            let entry = block << (cols - block_bits);
            let is_set = |bit: usize| entry >> bit & 1 == 1;
            let top = is_set(cols - 1);
            let mut terms = Vec::new();

            if !top {
                terms.push(Term { shift: 0, odd_only: false });
            }

            for &offset in &offsets {
                if offset == 1 && !top {
                    terms.push(Term { shift: 1, odd_only: true });
                } else if offset > 1 && is_set(offset - 2) && (offset == cols + 1 || !top) {
                    terms.push(Term { shift: 1 << (offset - 1), odd_only: false });
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

        sum = add(sum, count, prime);
    }

    sum
}

/// Fills one block of the next table, which starts at the entry `from`. Two neighbouring entries have opposite
/// bits 0, so the number of set bits is counted once per pair.
fn fill_block<const N: usize>(block: &mut [u32], current: &[u32], from: usize, terms: &[Term], parity: u32, prime: u32) {
    let sources: [Source; N] = array::from_fn(|at| {
        let Term { shift, odd_only } = terms[at];
        let start = 2 * from + usize::from(odd_only) - shift;

        Source { counts: &current[start..start + 2 * block.len()], odd_only }
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

/// Counts the domicule tilings modulo a prime with the broken-profile dynamic programming of countModulo in
/// js/solvers/domicule-rectangle-modular.js. Bit i of a state tells whether the cell i places ahead of the current
/// one is already covered, and the top bit of its cols + 2 is clear before every cell step. After k cells a live
/// state has k set bits modulo 2, so its bit 0 follows from the others and the tables hold 2^cols counts of u32,
/// one per value of bits 1 to cols. A step fills every next entry from the entries that lead to it, so it neither
/// clears a table nor tests a count.
fn count_modulo(rows: usize, cols: usize, prime: u32) -> u32 {
    let state_count = 1usize << cols;
    let block_size = state_count >> cols.min(3);
    let blocks_below: Vec<_> = (0..cols).map(|c| list_blocks(cols, c, true)).collect();
    let blocks_last: Vec<_> = (0..cols).map(|c| list_blocks(cols, c, false)).collect();
    let mut current = vec![0u32; state_count];
    let mut next = vec![0u32; state_count];
    current[0] = 1 % prime;

    for cell in 0..rows * cols {
        let blocks = if cell / cols + 1 < rows { &blocks_below[cell % cols] } else { &blocks_last[cell % cols] };
        let parity = (cell as u32 + 1) & 1;

        for (block, (slots, terms)) in next.chunks_exact_mut(block_size).zip(blocks).enumerate() {
            let from = block * block_size;

            match terms.len() {
                0 => slots.fill(0),
                1 => fill_block::<1>(slots, &current, from, terms, parity, prime),
                2 => fill_block::<2>(slots, &current, from, terms, parity, prime),
                3 => fill_block::<3>(slots, &current, from, terms, parity, prime),
                4 => fill_block::<4>(slots, &current, from, terms, parity, prime),
                count => unreachable!("a block has at most four terms, not {count}"),
            }
        }

        std::mem::swap(&mut current, &mut next);
    }

    current[0]
}

/// Counts the tilings exactly, like calculateTotalTilingCombinations of js/solvers/domicule-rectangle-modular.js:
/// enough primes for the Kahn-Lovasz bound, plus one more prime that the result is checked against.
fn calculate_total_tiling_combinations(row_count: usize, col_count: usize, jobs: usize) -> Result<BigInt, String> {
    let rows = row_count.max(col_count);
    let cols = row_count.min(col_count);

    if !(rows * cols).is_multiple_of(2) {
        return Ok(BigInt::zero());
    }

    let prime_count = ((calculate_log2_bound(rows, cols) + 1.0) / 30.0).ceil() as usize + 1;
    let primes = list_primes(prime_count);
    let residues = run_workers(&primes, jobs, |prime| count_modulo(rows, cols, *prime));

    combine_checked_residues(&residues, &primes, false)
}

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    let options = parse_args(&argv, &[("-r", "rowCount"), ("-c", "colCount"), ("-j", "jobs")]);
    let jobs = match options.get("jobs") {
        None => Some(thread::available_parallelism().map_or(1, NonZero::get) as u64),
        Some(value) => *value,
    };
    let row_count = options.get("rowCount").copied().flatten();
    let col_count = options.get("colCount").copied().flatten();

    let (Some(row_count), Some(col_count), Some(jobs)) = (row_count, col_count, jobs.filter(|jobs| *jobs > 0)) else {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    };

    if row_count.min(col_count) > MAX_SHORTER_SIDE {
        eprintln!("The shorter side of the board can be at most {MAX_SHORTER_SIDE}, because the states are indexed with 32-bit integers.");
        return ExitCode::FAILURE;
    }

    let jobs = usize::try_from(jobs).unwrap_or(usize::MAX);
    let timer = Timer::start(&argv);

    match calculate_total_tiling_combinations(row_count as usize, col_count as usize, jobs) {
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
