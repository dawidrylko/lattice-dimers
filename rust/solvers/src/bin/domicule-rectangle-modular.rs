use std::array;
use std::num::NonZero;
use std::process::ExitCode;
use std::thread;

use lattice_dimers_core::{BigInt, Prime, Residue, Timer, calculate_log2_bound, combine_planned_residues, count_modulo_primes, has_unusable_argument, parse_args, physical_memory};

const MAX_SHORTER_SIDE: u64 = 30;
const USAGE: &str = "Usage: domicule-rectangle-modular -r <rowCount> -c <colCount> [-j <jobs>]";

/// One way into a next state, like a term of listBlocks in js/solvers/domicule-rectangle-modular.js: the count of
/// the state that leads to it lies `shift` entries below the next state in the current table. A move onto the next
/// cell sets bit 0 of the next state, so it has only odd next states (`odd_only`). A term that closes a crossing is
/// subtracted when the tilings count with their crossing sign (`negative`).
#[derive(Clone, Copy)]
struct Term {
    shift: usize,
    odd_only: bool,
    negative: bool,
}

/// A term over one block of next entries. The entry at place p reads `counts[2 * p + bit]`, where bit is bit 0
/// of its state; an odd-only term reads `counts[2 * p]`, and only when that bit is 1.
#[derive(Clone, Copy)]
struct Source<'a, R> {
    counts: &'a [R],
    odd_only: bool,
    negative: bool,
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
/// most eight blocks of entries with the same terms. With `crossing_sign` the down-left move is negative where
/// bit cols - 2 of the entry is set: the cell below the one that moves is then covered already, which only the
/// down-right move of the cell to the left does, so the two diagonal pieces cross.
fn list_blocks(cols: usize, c: usize, has_below: bool, crossing_sign: bool) -> Vec<Vec<Term>> {
    let offsets = list_offsets(cols, c, has_below);
    let block_bits = cols.min(3);

    (0..1usize << block_bits)
        .map(|block| {
            let entry = block << (cols - block_bits);
            let is_set = |bit: usize| entry >> bit & 1 == 1;
            let top = is_set(cols - 1);
            let mut terms = Vec::new();

            if !top {
                terms.push(Term { shift: 0, odd_only: false, negative: false });
            }

            for &offset in &offsets {
                let negative = crossing_sign && c > 0 && offset == cols - 1 && is_set(cols - 2);

                if offset == 1 && !top {
                    terms.push(Term { shift: 1, odd_only: true, negative });
                } else if offset > 1 && is_set(offset - 2) && (offset == cols + 1 || !top) {
                    terms.push(Term { shift: 1 << (offset - 1), odd_only: false, negative });
                }
            }

            terms
        })
        .collect()
}

/// Sums the terms of one next entry: `place` is its place in the block and `bit` is bit 0 of its state. Only a
/// SIGNED sum looks at the sign of a term, so the plain count pays nothing for it.
#[inline(always)]
fn sum_sources<R: Residue, const N: usize, const SIGNED: bool>(sources: &[Source<R>; N], place: usize, bit: usize, prime: R) -> R {
    let mut sum = R::default();

    for source in sources {
        let count = if source.odd_only { source.counts[2 * place].keep_if(bit) } else { source.counts[2 * place + bit] };

        sum = R::add_term(sum, if SIGNED && source.negative { count.negated(prime) } else { count }, prime);
    }

    R::finish(sum, N, prime)
}

/// Fills one block of the next table, which starts at the entry `from`. Two neighbouring entries have opposite
/// bits 0, so the number of set bits is counted once per pair.
fn fill_block<R: Residue, const N: usize, const SIGNED: bool>(block: &mut [R], current: &[R], from: usize, terms: &[Term], parity: u32, prime: R) {
    let sources: [Source<R>; N] = array::from_fn(|at| {
        let Term { shift, odd_only, negative } = terms[at];
        let start = 2 * from + usize::from(odd_only) - shift;

        Source { counts: &current[start..start + 2 * block.len()], odd_only, negative }
    });
    let bit_of = |place: usize| ((parity + (from + place).count_ones()) & 1) as usize;

    if let [slot] = block {
        *slot = sum_sources::<R, N, SIGNED>(&sources, 0, bit_of(0), prime);
        return;
    }

    for (pair, slots) in block.as_chunks_mut::<2>().0.iter_mut().enumerate() {
        let bit = bit_of(2 * pair);

        slots[0] = sum_sources::<R, N, SIGNED>(&sources, 2 * pair, bit, prime);
        slots[1] = sum_sources::<R, N, SIGNED>(&sources, 2 * pair + 1, 1 - bit, prime);
    }
}

/// Counts the domicule tilings modulo a prime with the broken-profile dynamic programming of countModulo in
/// js/solvers/domicule-rectangle-modular.js. Bit i of a state tells whether the cell i places ahead of the current
/// one is already covered, and the top bit of its cols + 2 is clear before every cell step. After k cells a live
/// state has k set bits modulo 2, so its bit 0 follows from the others and the tables hold 2^cols counts, one per
/// value of bits 1 to cols, of u32 below a prime of list_primes or of u64 below a wide prime. A step fills every
/// next entry from the entries that lead to it, so it neither clears a table nor tests a count.
///
/// With CROSSING_SIGN a tiling counts with its crossing sign, (-1)^k for the k unit squares in which two diagonal
/// pieces cross. Under a suitable orientation the Pfaffian of the board is plus or minus that sum (Wildeboer and
/// Seidel, cited in research/king-entropy/paper/king-entropy.tex), which the test below checks with the orientation
/// that docs/glossary.md names. No solver prints the sum.
fn count_modulo<R: Residue, const CROSSING_SIGN: bool>(rows: usize, cols: usize, prime: R) -> R {
    let state_count = 1usize << cols;
    let block_size = state_count >> cols.min(3);
    let blocks_below: Vec<_> = (0..cols).map(|c| list_blocks(cols, c, true, CROSSING_SIGN)).collect();
    let blocks_last: Vec<_> = (0..cols).map(|c| list_blocks(cols, c, false, CROSSING_SIGN)).collect();
    let mut current = vec![R::default(); state_count];
    let mut next = vec![R::default(); state_count];
    current[0] = R::from_u64(1 % prime.to_u64());

    for cell in 0..rows * cols {
        let blocks = if cell / cols + 1 < rows { &blocks_below[cell % cols] } else { &blocks_last[cell % cols] };
        let parity = (cell as u32 + 1) & 1;

        for (block, (slots, terms)) in next.chunks_exact_mut(block_size).zip(blocks).enumerate() {
            let from = block * block_size;

            match terms.len() {
                0 => slots.fill(R::default()),
                1 => fill_block::<R, 1, CROSSING_SIGN>(slots, &current, from, terms, parity, prime),
                2 => fill_block::<R, 2, CROSSING_SIGN>(slots, &current, from, terms, parity, prime),
                3 => fill_block::<R, 3, CROSSING_SIGN>(slots, &current, from, terms, parity, prime),
                4 => fill_block::<R, 4, CROSSING_SIGN>(slots, &current, from, terms, parity, prime),
                count => unreachable!("a block has at most four terms, not {count}"),
            }
        }

        std::mem::swap(&mut current, &mut next);
    }

    current[0]
}

/// Counts the tilings exactly, like calculateTotalTilingCombinations of js/solvers/domicule-rectangle-modular.js:
/// enough primes for the Kahn-Lovasz bound, plus one more prime that the result is checked against. The primes
/// are those of count_modulo_primes, so some runs count modulo a wide prime.
fn calculate_total_tiling_combinations(row_count: usize, col_count: usize, jobs: usize) -> Result<BigInt, String> {
    let rows = row_count.max(col_count);
    let cols = row_count.min(col_count);

    if !(rows * cols).is_multiple_of(2) {
        return Ok(BigInt::zero());
    }

    let (primes, residues) = count_modulo_primes(calculate_log2_bound(rows, cols) + 1.0, jobs, 1 << cols, physical_memory(), |prime| match prime {
        Prime::Narrow(prime) => u64::from(count_modulo::<u32, false>(rows, cols, prime)),
        Prime::Wide(prime) => count_modulo::<u64, false>(rows, cols, prime),
    });

    combine_planned_residues(&residues, &primes, false)
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

    let (Some(row_count), Some(col_count), Some(jobs), false) = (row_count, col_count, jobs.filter(|jobs| *jobs > 0), has_unusable_argument(&argv, &["-r", "-c", "-j"], &[])) else {
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

#[cfg(test)]
mod tests {
    use lattice_dimers_core::{combine_checked_residues, combine_checked_wide_residues, list_primes, list_wide_primes, pfaffian_modulo};

    use super::*;

    fn king_pfaffian_modulo(rows: usize, cols: usize, prime: u32) -> u32 {
        let size = rows * cols;
        let mut matrix = vec![0; size * size];

        for x in 0..rows {
            for y in 0..cols {
                let straight = if x % 2 == 0 { prime - 1 } else { 1 };
                let steps = [(x + 1, Some(y), straight), (x, Some(y + 1), straight), (x + 1, Some(y + 1), 1), (x + 1, y.checked_sub(1), 1)];

                for (u, v, entry) in steps {
                    if let Some(v) = v.filter(|v| u < rows && *v < cols) {
                        matrix[(x * cols + y) * size + u * cols + v] = entry;
                    }
                }
            }
        }

        pfaffian_modulo(&mut matrix, size, prime)
    }

    #[test]
    fn counts_alike_in_both_residue_sizes() {
        let prime = list_primes(1)[0];
        let wide_prime = list_wide_primes(2)[1];

        for (rows, cols, expected) in [(2, 2, 3), (4, 3, 43), (8, 8, 3_263_262_629_905u64), (9, 8, 185_175_369_431_551), (40, 3, 0), (7, 5, 0)] {
            for crossing_sign in [false, true] {
                let (narrow, wide) = if crossing_sign {
                    (count_modulo::<u32, true>(rows, cols, prime), count_modulo::<u64, true>(rows, cols, u64::from(prime)))
                } else {
                    (count_modulo::<u32, false>(rows, cols, prime), count_modulo::<u64, false>(rows, cols, u64::from(prime)))
                };

                assert_eq!(u64::from(narrow), wide, "{rows}x{cols} crossing sign {crossing_sign}");
            }

            if expected > 0 {
                assert_eq!(count_modulo::<u64, false>(rows, cols, wide_prime), expected, "{rows}x{cols} modulo a wide prime");
                assert_eq!(u64::from(count_modulo::<u32, false>(rows, cols, prime)), expected % u64::from(prime), "{rows}x{cols}");
            }
        }
    }

    #[test]
    fn crossing_sign_sum_is_plus_or_minus_the_pfaffian_of_the_king_board() {
        let primes = list_primes(5);
        let wide_primes = list_wide_primes(3);
        let boards = [
            (2, 2, "1"),
            (5, 2, "1"),
            (4, 3, "15"),
            (4, 4, "92"),
            (5, 4, "427"),
            (6, 6, "223775"),
            (8, 7, "1554683369"),
            (8, 8, "57770908609"),
            (10, 10, "609997767152613273"),
            (12, 12, "426367341321684015743692783"),
        ];

        for (rows, cols, expected) in boards {
            let sums: Vec<u32> = primes.iter().map(|prime| count_modulo::<u32, true>(rows, cols, *prime)).collect();
            let wide_sums: Vec<u64> = wide_primes.iter().map(|prime| count_modulo::<u64, true>(rows, cols, *prime)).collect();
            let pfaffians: Vec<u32> = primes.iter().map(|prime| king_pfaffian_modulo(rows, cols, *prime)).collect();
            let sum = combine_checked_residues(&sums, &primes, true).unwrap().to_string();
            let wide_sum = combine_checked_wide_residues(&wide_sums, &wide_primes, true).unwrap().to_string();
            let pfaffian = combine_checked_residues(&pfaffians, &primes, true).unwrap().to_string();

            assert_eq!(sum, expected, "{rows}x{cols}");
            assert_eq!(wide_sum, expected, "{rows}x{cols} modulo wide primes");
            assert_eq!(pfaffian.trim_start_matches('-'), expected, "the Pfaffian of {rows}x{cols}");
        }
    }
}
