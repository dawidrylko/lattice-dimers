use std::cmp::Ordering;
use std::ffi::{c_int, c_long};
use std::sync::Mutex;
use std::sync::atomic::{self, AtomicUsize};
use std::thread;

use crate::bigint::BigInt;

pub const LARGEST_PRIME_BOUND: u32 = 1 << 31;
pub const LARGEST_WIDE_PRIME_BOUND: u64 = 1 << 61;

fn is_prime(n: u32) -> bool {
    let n = u64::from(n);
    let mut d = 3;

    while d * d <= n {
        if n % d == 0 {
            return false;
        }

        d += 2;
    }

    true
}

/// Lists the given number of primes, starting from the largest one below 2^31, in decreasing order.
/// The sum of two residues then stays below 2^32 and fits a u32.
pub fn list_primes(count: usize) -> Vec<u32> {
    let mut primes = Vec::with_capacity(count);
    let mut n = LARGEST_PRIME_BOUND - 1;

    while primes.len() < count {
        if is_prime(n) {
            primes.push(n);
        }

        n -= 2;
    }

    primes
}

fn mul_mod(a: u64, b: u64, modulus: u64) -> u64 {
    (u128::from(a) * u128::from(b) % u128::from(modulus)) as u64
}

pub(crate) fn pow_mod(base: u64, mut exponent: u64, modulus: u64) -> u64 {
    let mut result = 1 % modulus;
    let mut base = base % modulus;

    while exponent > 0 {
        if exponent & 1 == 1 {
            result = result * base % modulus;
        }

        base = base * base % modulus;
        exponent >>= 1;
    }

    result
}

/// Raises to a power like pow_mod, for a modulus of any size.
fn pow_mod_wide(base: u64, mut exponent: u64, modulus: u64) -> u64 {
    let mut result = 1 % modulus;
    let mut base = base % modulus;

    while exponent > 0 {
        if exponent & 1 == 1 {
            result = mul_mod(result, base, modulus);
        }

        base = mul_mod(base, base, modulus);
        exponent >>= 1;
    }

    result
}

/// Tells whether an odd number above 37 is prime with the Miller-Rabin test on the first twelve primes as bases.
/// The least odd composite that passes all twelve is above 2^64 (OEIS A014233), so the test decides every u64.
fn is_wide_prime(n: u64) -> bool {
    let twos = (n - 1).trailing_zeros();
    let odd = (n - 1) >> twos;

    [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37].into_iter().all(|base| {
        let mut power = pow_mod_wide(base, odd, n);

        if power == 1 || power == n - 1 {
            return true;
        }

        for _ in 1..twos {
            power = mul_mod(power, power, n);

            if power == n - 1 {
                return true;
            }
        }

        false
    })
}

/// Finds the largest wide prime below an odd bound or below 2^61.
fn next_wide_prime(below: u64) -> u64 {
    let mut n = if below == LARGEST_WIDE_PRIME_BOUND { below - 1 } else { below - 2 };

    while !is_wide_prime(n) {
        n -= 2;
    }

    n
}

/// Lists the given number of wide primes, the primes below 2^61, starting from the largest one, 2^61 - 1, in
/// decreasing order. The sum of seven residues then stays below 2^64 and fits a u64, so a step of a solver adds
/// the counts that lead to a state and reduces the sum once (Residue); any-lattice-rectangle-modular adds one count at
/// a time and reduces each sum. Only the Rust solvers count modulo wide primes; the Python and JavaScript ones keep
/// the primes below 2^31 of list_primes.
pub fn list_wide_primes(count: usize) -> Vec<u64> {
    let mut primes = Vec::with_capacity(count);
    let mut below = LARGEST_WIDE_PRIME_BOUND;

    while primes.len() < count {
        below = next_wide_prime(below);
        primes.push(below);
    }

    primes
}

/// Reduces a sum of at most `terms` residues modulo a wide prime to the residue below the prime. The sum is below
/// 8 * prime, so at most three subtractions, of 4, 2 and 1 times the prime, bring it down, and a sum of fewer
/// residues skips the ones it cannot need.
#[inline(always)]
fn reduce_wide_sum(mut sum: u64, terms: usize, prime: u64) -> u64 {
    debug_assert!(terms < 8 && prime < LARGEST_WIDE_PRIME_BOUND && sum < 8 * prime);

    if terms > 4 && sum >= 4 * prime {
        sum -= 4 * prime;
    }

    if terms > 2 && sum >= 2 * prime {
        sum -= 2 * prime;
    }

    if terms > 1 && sum >= prime {
        sum -= prime;
    }

    sum
}

/// A count modulo a prime in a table of a solver: a u32 below a prime of list_primes or a u64 below a wide prime.
/// A step of a solver sums at most seven counts with `add_term` and ends every sum with `finish`. A u32 sum is
/// reduced after every term, since the sum of two residues is the most that 32 bits hold; a u64 sum is reduced
/// once, at the end. `negated` of a u32 zero is the prime itself, which only `add_term` takes.
pub trait Residue: Copy + Default + PartialEq + Send + Sync {
    fn from_u64(value: u64) -> Self;
    fn to_u64(self) -> u64;
    /// The count when bit is 1 and zero when it is 0.
    fn keep_if(self, bit: usize) -> Self;
    fn negated(self, prime: Self) -> Self;
    fn add_term(sum: Self, count: Self, prime: Self) -> Self;
    fn finish(sum: Self, terms: usize, prime: Self) -> Self;
}

impl Residue for u32 {
    #[inline(always)]
    fn from_u64(value: u64) -> Self {
        value as u32
    }

    #[inline(always)]
    fn to_u64(self) -> u64 {
        u64::from(self)
    }

    #[inline(always)]
    fn keep_if(self, bit: usize) -> Self {
        self & (bit as u32).wrapping_neg()
    }

    #[inline(always)]
    fn negated(self, prime: Self) -> Self {
        prime - self
    }

    #[inline(always)]
    fn add_term(sum: Self, count: Self, prime: Self) -> Self {
        let sum = sum + count;

        if sum >= prime { sum - prime } else { sum }
    }

    #[inline(always)]
    fn finish(sum: Self, _terms: usize, _prime: Self) -> Self {
        sum
    }
}

impl Residue for u64 {
    #[inline(always)]
    fn from_u64(value: u64) -> Self {
        value
    }

    #[inline(always)]
    fn to_u64(self) -> u64 {
        self
    }

    #[inline(always)]
    fn keep_if(self, bit: usize) -> Self {
        self & (bit as u64).wrapping_neg()
    }

    #[inline(always)]
    fn negated(self, prime: Self) -> Self {
        if self == 0 { 0 } else { prime - self }
    }

    #[inline(always)]
    fn add_term(sum: Self, count: Self, _prime: Self) -> Self {
        sum + count
    }

    #[inline(always)]
    fn finish(sum: Self, terms: usize, prime: Self) -> Self {
        reduce_wide_sum(sum, terms, prime)
    }
}

/// A prime of a run of a solver: one of list_primes, with counts of u32, or a wide one, with counts of u64.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Prime {
    Narrow(u32),
    Wide(u64),
}

impl Prime {
    pub fn value(self) -> u64 {
        match self {
            Prime::Narrow(prime) => u64::from(prime),
            Prime::Wide(prime) => prime,
        }
    }
}

/// How many runs modulo a prime of list_primes a thread leaves to every other thread when it takes a wide run.
const WIDE_SHARE: usize = 1;

struct Plan {
    remaining: usize,
    below: u64,
    narrow_taken: usize,
    check_taken: bool,
}

impl Plan {
    /// Takes the prime of the next run of a thread, and tells whether it is the check.
    fn take(&mut self, threads: usize, wide_fits: bool, narrow: &[u32]) -> Option<(Prime, bool)> {
        if wide_fits && self.remaining >= 2 + WIDE_SHARE * (threads - 1) {
            self.remaining -= 2;
            self.below = next_wide_prime(self.below);

            Some((Prime::Wide(self.below), false))
        } else if self.remaining > 0 {
            self.remaining -= 1;
            self.narrow_taken += 1;

            Some((Prime::Narrow(narrow[self.narrow_taken - 1]), false))
        } else if !self.check_taken {
            self.check_taken = true;

            Some((Prime::Narrow(narrow[self.narrow_taken]), true))
        } else {
            None
        }
    }
}

/// How long a run modulo a prime of list_primes takes in the plan of wide_runs_end_sooner.
const NARROW_TICKS: u64 = 10;

/// How long a wide run takes in that plan: almost as long as two of the others, so that a plan counts as ending
/// sooner only where wide runs spare a whole run.
const WIDE_TICKS: u64 = 19;

/// Tells whether the runs of count_modulo_primes end sooner with wide runs than without. It plays the plan of
/// Plan::take on `threads` threads, where a run modulo a prime of list_primes takes NARROW_TICKS and a wide run
/// WIDE_TICKS. Where the last run ends at the same tick either way, wide runs spare no run, and one that in fact
/// takes more than two of the others holds up the count: any-lattice-rectangle-modular took 3% longer on the
/// 20 x 20 board of the square lattice with 8 threads. The two other solvers of wide primes were 8% to 16% faster
/// on such boards, so only that one asks.
fn wide_runs_end_sooner(units: usize, threads: usize, narrow: &[u32]) -> bool {
    let end_of = |wide_fits: bool| {
        let mut plan = Plan { remaining: units, below: LARGEST_WIDE_PRIME_BOUND, narrow_taken: 0, check_taken: false };
        let mut free_at = vec![0u64; threads];
        let mut end = 0;

        loop {
            let thread = (0..threads).min_by_key(|thread| free_at[*thread]).expect("there is a thread");
            let Some((prime, _)) = plan.take(threads, wide_fits, narrow) else {
                break;
            };

            free_at[thread] += if matches!(prime, Prime::Wide(_)) { WIDE_TICKS } else { NARROW_TICKS };
            end = end.max(free_at[thread]);
        }

        end
    };

    end_of(true) < end_of(false)
}

/// Counts modulo primes on worker threads until their product covers a count of at most `bits` bits, and modulo
/// one more prime, the check. Returns the primes with the result of `work` for each, the check last.
///
/// A prime of list_primes adds at least 30 bits and a wide prime at least 60, so a wide run stands for two runs
/// of the other kind. It moves twice the bytes, so where memory sets the pace it also takes about twice the time
/// and saves nothing, and a long run on a slow core holds up the count. A thread therefore takes a wide run only
/// while every other thread keeps a run of the other kind (WIDE_SHARE): then no thread waits for it, and where
/// a wide run takes less than two of the others, the count is ready sooner.
///
/// A run keeps two tables of `counts` counts, and no run is wide unless the tables of wide runs on every thread
/// fit in half of `memory` (wide_tables_fit). A caller whose wide runs can take longer than two of the others
/// sets `sooner_only`: then no run is wide either unless the runs end sooner with wide runs than without
/// (wide_runs_end_sooner). The runs of the other kind take the primes of list_primes from the largest one, and
/// the check is the next of them, so without wide runs the primes are those of list_primes.
pub fn count_modulo_primes<T, F>(bits: f64, threads: usize, counts: u128, memory: u64, sooner_only: bool, work: F) -> (Vec<Prime>, Vec<T>)
where
    T: Send,
    F: Fn(Prime) -> T + Sync,
{
    let units = (bits / 30.0).ceil() as usize;
    let threads = threads.clamp(1, units + 1);
    let narrow = list_primes(units + 1);
    let wide_fits = wide_tables_fit(counts, threads, memory) && (!sooner_only || wide_runs_end_sooner(units, threads, &narrow));
    let plan = Mutex::new(Plan { remaining: units, below: LARGEST_WIDE_PRIME_BOUND, narrow_taken: 0, check_taken: false });
    let results: Mutex<Vec<(Prime, bool, T)>> = Mutex::new(Vec::new());

    thread::scope(|scope| {
        for _ in 0..threads {
            scope.spawn(|| {
                loop {
                    let taken = plan.lock().expect("a worker thread panicked").take(threads, wide_fits, &narrow);
                    let Some((prime, check)) = taken else {
                        break;
                    };
                    let result = work(prime);
                    results.lock().expect("a worker thread panicked").push((prime, check, result));
                }
            });
        }
    });

    let mut results = results.into_inner().expect("a worker thread panicked");
    results.sort_by_key(|(prime, check, _)| (*check, std::cmp::Reverse(prime.value())));

    results.into_iter().map(|(prime, _, result)| (prime, result)).unzip()
}

/// Rebuilds a count from its residues modulo the primes of count_modulo_primes and checks it against the last
/// one, like combine_checked_residues.
pub fn combine_planned_residues(residues: &[u64], primes: &[Prime], signed: bool) -> Result<BigInt, String> {
    let primes: Vec<u64> = primes.iter().map(|prime| prime.value()).collect();

    combine_checked_wide_residues(residues, &primes, signed)
}

#[cfg(target_os = "macos")]
const SYSCONF_NAMES: Option<(c_int, c_int)> = Some((200, 29));
#[cfg(target_os = "linux")]
const SYSCONF_NAMES: Option<(c_int, c_int)> = Some((85, 30));
#[cfg(not(any(target_os = "macos", target_os = "linux")))]
const SYSCONF_NAMES: Option<(c_int, c_int)> = None;

unsafe extern "C" {
    fn sysconf(name: c_int) -> c_long;
}

/// Reads the memory of the machine in bytes, or 0 when it is not known.
pub fn physical_memory() -> u64 {
    let Some((pages, page_size)) = SYSCONF_NAMES else {
        return 0;
    };
    // SAFETY: sysconf takes an integer and only reads a system setting.
    let (pages, page_size) = unsafe { (sysconf(pages), sysconf(page_size)) };

    u64::try_from(pages).unwrap_or(0).saturating_mul(u64::try_from(page_size).unwrap_or(0))
}

/// Tells whether the tables of wide runs on every thread fit in half the memory of the machine: each thread
/// keeps two tables of `counts` counts of u64.
pub fn wide_tables_fit(counts: u128, threads: usize, memory: u64) -> bool {
    counts.saturating_mul(16).saturating_mul(threads.max(1) as u128) <= u128::from(memory / 2)
}

/// Bounds log2 of the number of perfect matchings of the king's graph of a rows x cols board with the Kahn-Lovasz
/// theorem, like calculateLog2Bound of js/core/modular.js: a graph has at most Prod_v (d(v)!)^(1/(2 d(v))) perfect
/// matchings, where d(v) is the degree of the vertex v.
pub fn calculate_log2_bound(rows: usize, cols: usize) -> f64 {
    let mut bound = 0.0;

    for r in 0..rows {
        for c in 0..cols {
            let height = (r + 1).min(rows - 1) - r.saturating_sub(1) + 1;
            let width = (c + 1).min(cols - 1) - c.saturating_sub(1) + 1;
            let degree = height * width - 1;
            let log2_factorial: f64 = (2..=degree).map(|k| (k as f64).log2()).sum();

            if degree > 0 {
                bound += log2_factorial / (2 * degree) as f64;
            }
        }
    }

    bound
}

/// Rebuilds the non-negative integer below the product of the primes from its residues.
pub fn combine_residues(residues: &[u32], primes: &[u32]) -> BigInt {
    let mut result = BigInt::zero();
    let mut modulus = BigInt::from_u64(1);

    for (residue, prime) in residues.iter().zip(primes) {
        let p = u64::from(*prime);
        let difference = (u64::from(*residue) + p - u64::from(result.rem_euclid_small(*prime))) % p;
        let inverse = pow_mod(u64::from(modulus.rem_euclid_small(*prime)), p - 2, p);
        let digit = (difference * inverse % p) as u32;
        result = result.add_magnitude(&modulus.mul_small(digit));
        modulus = modulus.mul_small(*prime);
    }

    result
}

/// Rebuilds an integer from all primes but the last one and checks it against the last one. When the integer
/// may be negative, the product of the other primes must exceed twice its absolute value.
pub fn combine_checked_residues(residues: &[u32], primes: &[u32], signed: bool) -> Result<BigInt, String> {
    let (check_prime, primes) = primes.split_last().ok_or("There are no primes.")?;
    let (check_residue, residues) = residues.split_last().ok_or("There are no residues.")?;
    let modulus = primes.iter().fold(BigInt::from_u64(1), |product, prime| product.mul_small(*prime));
    let unsigned = combine_residues(residues, primes);
    let result = if signed && unsigned.mul_small(2).cmp_magnitude(&modulus) == Ordering::Greater {
        modulus.sub_magnitude(&unsigned).negated()
    } else {
        unsigned
    };

    if result.rem_euclid_small(*check_prime) != *check_residue {
        return Err(format!("The result does not match the residue modulo the check prime {check_prime}."));
    }

    Ok(result)
}

/// Rebuilds the non-negative integer below the product of the primes from its residues, like combine_residues,
/// for primes of any size below 2^63.
pub fn combine_wide_residues(residues: &[u64], primes: &[u64]) -> BigInt {
    let mut result = BigInt::zero();
    let mut modulus = BigInt::from_u64(1);

    for (residue, prime) in residues.iter().zip(primes) {
        let difference = (*residue + *prime - result.rem_euclid_wide(*prime)) % *prime;
        let inverse = pow_mod_wide(modulus.rem_euclid_wide(*prime), *prime - 2, *prime);
        let digit = mul_mod(difference, inverse, *prime);
        result = result.add_magnitude(&(&modulus * &BigInt::from_u64(digit)));
        modulus = &modulus * &BigInt::from_u64(*prime);
    }

    result
}

/// Rebuilds an integer from all primes but the last one and checks it against the last one, like
/// combine_checked_residues, for primes of any size below 2^63.
pub fn combine_checked_wide_residues(residues: &[u64], primes: &[u64], signed: bool) -> Result<BigInt, String> {
    let (check_prime, primes) = primes.split_last().ok_or("There are no primes.")?;
    let (check_residue, residues) = residues.split_last().ok_or("There are no residues.")?;
    let modulus = primes.iter().fold(BigInt::from_u64(1), |product, prime| &product * &BigInt::from_u64(*prime));
    let unsigned = combine_wide_residues(residues, primes);
    let result = if signed && unsigned.mul_small(2).cmp_magnitude(&modulus) == Ordering::Greater {
        modulus.sub_magnitude(&unsigned).negated()
    } else {
        unsigned
    };

    if result.rem_euclid_wide(*check_prime) != *check_residue {
        return Err(format!("The result does not match the residue modulo the check prime {check_prime}."));
    }

    Ok(result)
}

/// Runs work on every task in its own thread, at most jobs at a time, and returns the results in order.
pub fn run_workers<T, R, F>(tasks: &[T], jobs: usize, work: F) -> Vec<R>
where
    T: Sync,
    R: Send,
    F: Fn(&T) -> R + Sync,
{
    let next = AtomicUsize::new(0);
    let results: Mutex<Vec<Option<R>>> = Mutex::new(tasks.iter().map(|_| None).collect());

    thread::scope(|scope| {
        for _ in 0..jobs.min(tasks.len()) {
            scope.spawn(|| {
                loop {
                    let index = next.fetch_add(1, atomic::Ordering::Relaxed);
                    let Some(task) = tasks.get(index) else {
                        break;
                    };
                    let result = work(task);
                    results.lock().expect("a worker thread panicked")[index] = Some(result);
                }
            });
        }
    });

    results
        .into_inner()
        .expect("a worker thread panicked")
        .into_iter()
        .map(|result| result.expect("every task has a result"))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn residues_of(value: i64, primes: &[u32]) -> Vec<u32> {
        primes.iter().map(|prime| value.rem_euclid(i64::from(*prime)) as u32).collect()
    }

    #[test]
    fn bounds_the_king_graph_like_the_javascript_core() {
        assert_eq!(calculate_log2_bound(0, 0), 0.0);
        assert_eq!(calculate_log2_bound(1, 2), 0.0);
        assert!((calculate_log2_bound(2, 2) - 4.0 * (1.0 + 3f64.log2()) / 6.0).abs() < 1e-12);
        assert!(calculate_log2_bound(4, 4) >= 280f64.log2());
    }

    #[test]
    fn lists_the_largest_primes_below_two_to_the_31() {
        assert_eq!(list_primes(3), vec![2_147_483_647, 2_147_483_629, 2_147_483_587]);
    }

    #[test]
    fn lists_the_largest_primes_below_two_to_the_61() {
        assert_eq!(list_wide_primes(3), vec![(1 << 61) - 1, (1 << 61) - 31, (1 << 61) - 45]);
    }

    #[test]
    fn tells_primes_from_composites_like_trial_division() {
        let divides = |n: u64| (3..).step_by(2).take_while(|d| d * d <= n).any(|d| n.is_multiple_of(d));

        for n in (39..200_000).step_by(2) {
            assert_eq!(is_wide_prime(n), !divides(n), "{n}");
        }

        for strong_pseudoprime in [2_047, 1_373_653, 25_326_001, 3_215_031_751, 2_152_302_898_747, 3_474_749_660_383, 341_550_071_728_321, 3_825_123_056_546_413_051] {
            assert!(!is_wide_prime(strong_pseudoprime), "{strong_pseudoprime}");
        }
    }

    #[test]
    fn reduces_a_sum_of_up_to_seven_residues() {
        for prime in [list_wide_primes(1)[0], 41] {
            for terms in 1..8u64 {
                for residue in [0, 1, prime / 2, prime - 1] {
                    let sum = (terms - 1) * (prime - 1) + residue;

                    assert_eq!(u128::from(reduce_wide_sum(sum, terms as usize, prime)), u128::from(sum) % u128::from(prime), "{terms} terms, sum {sum} modulo {prime}");
                }
            }
        }
    }

    #[test]
    fn covers_the_bits_with_distinct_primes_and_a_separate_check() {
        for threads in [1, 2, 3, 4, 8, 12] {
            for units in 1..=24usize {
                for memory in [0, u64::MAX] {
                    let (primes, results) = count_modulo_primes(30.0 * units as f64, threads, 1, memory, units % 2 == 0, |prime| prime.value());
                    let (check, counted) = primes.split_last().unwrap();
                    let wide: Vec<u64> = counted.iter().filter_map(|prime| if let Prime::Wide(prime) = prime { Some(*prime) } else { None }).collect();
                    let narrow: Vec<u32> = primes.iter().filter_map(|prime| if let Prime::Narrow(prime) = prime { Some(*prime) } else { None }).collect();
                    let case = format!("{units} units on {threads} threads, memory {memory}");

                    assert_eq!(2 * wide.len() + counted.len() - wide.len(), units, "{case}");
                    assert!(counted.iter().map(|prime| (prime.value() as f64).log2()).sum::<f64>() >= 30.0 * units as f64, "{case}");
                    assert!(primes.iter().map(|prime| prime.value()).eq(results.iter().copied()), "{case}");
                    assert!(counted.windows(2).all(|pair| pair[0].value() > pair[1].value()), "{case}");
                    assert!(counted.iter().all(|prime| prime.value() > check.value()), "{case}");
                    assert_eq!(narrow, list_primes(narrow.len()), "{case}");
                    assert_eq!(narrow.last().map(|prime| Prime::Narrow(*prime)), Some(*check), "{case}");
                    assert_eq!(wide, list_wide_primes(wide.len()), "{case}");
                    assert!(memory > 0 || wide.is_empty(), "{case}");
                }
            }
        }

        let wide_in = |units: usize, threads: usize, sooner_only: bool| count_modulo_primes(30.0 * units as f64, threads, 1, u64::MAX, sooner_only, |_| ()).0.iter().filter(|prime| matches!(prime, Prime::Wide(_))).count();

        for (units, threads, wide, wide_when_sooner) in [(18, 1, 9, 9), (19, 1, 9, 9), (4, 2, 1, 1), (3, 2, 1, 0), (2, 2, 0, 0), (13, 4, 5, 5), (13, 8, 3, 0), (14, 8, 3, 0), (15, 10, 3, 0), (49, 8, 21, 21), (14, usize::MAX, 0, 0)] {
            assert_eq!(wide_in(units, threads, false), wide, "{units} units on {threads} threads");
            assert_eq!(wide_in(units, threads, true), wide_when_sooner, "{units} units on {threads} threads, sooner only");
        }

        assert_eq!(count_modulo_primes(0.0, 4, 1, u64::MAX, false, |_| ()).0, [Prime::Narrow(list_primes(1)[0])]);
    }

    #[test]
    fn rebuilds_a_count_from_runs_of_both_kinds() {
        let value = 1_234_567_890_123_456_789_012_345_678_901_234_567_i128;

        for threads in [1, 2, 3, 5] {
            for memory in [0, u64::MAX] {
                for (signed, value) in [(false, value), (true, value), (true, -value), (false, 0), (true, -1)] {
                    let (primes, residues) = count_modulo_primes(125.0, threads, 1, memory, threads % 2 == 0, |prime| value.rem_euclid(i128::from(prime.value())) as u64);
                    let case = format!("{value} on {threads} threads, memory {memory}");

                    assert_eq!(combine_planned_residues(&residues, &primes, signed).map(|n| n.to_string()), Ok(value.to_string()), "{case}");

                    let mut wrong = residues.clone();
                    wrong[0] = (wrong[0] + 1) % primes[0].value();

                    assert!(combine_planned_residues(&wrong, &primes, signed).unwrap_err().contains("check prime"), "{case}");
                }
            }
        }
    }

    #[test]
    fn reduces_every_sum_around_a_multiple_of_a_wide_prime() {
        for prime in [list_wide_primes(1)[0], list_wide_primes(4)[3], 1_000_003] {
            for terms in 1..=7usize {
                for multiple in 0..terms as u64 {
                    for offset in -2i64..=2 {
                        let Some(sum) = (multiple * prime).checked_add_signed(offset) else {
                            continue;
                        };

                        if sum <= terms as u64 * (prime - 1) {
                            assert_eq!(reduce_wide_sum(sum, terms, prime), sum % prime, "{sum} of {terms} terms modulo {prime}");
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn fits_wide_tables_in_half_the_memory() {
        const GIGABYTE: u64 = 1 << 30;

        assert!(wide_tables_fit(1 << 23, 4, GIGABYTE));
        assert!(!wide_tables_fit((1 << 23) + 1, 4, GIGABYTE));
        assert!(!wide_tables_fit(1, 1, 0));
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    #[test]
    fn reads_the_memory_of_the_machine() {
        assert!(physical_memory() > 0);
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn reads_the_memory_the_kernel_reports() {
        let meminfo = std::fs::read_to_string("/proc/meminfo").unwrap();
        let line = meminfo.lines().find(|line| line.starts_with("MemTotal:")).unwrap();
        let kilobytes: u64 = line.split_whitespace().nth(1).unwrap().parse().unwrap();

        assert_eq!(physical_memory() / 1024 / 1024, kilobytes / 1024);
    }

    #[test]
    fn counts_in_both_residue_sizes_alike() {
        fn sum<R: Residue>(counts: &[u64], negative: usize, prime: u64) -> u64 {
            let prime = R::from_u64(prime);
            let total = counts.iter().enumerate().fold(R::default(), |sum, (at, count)| {
                let count = R::from_u64(*count);

                R::add_term(sum, if at == negative { count.negated(prime) } else { count }, prime)
            });

            R::finish(total, counts.len(), prime).to_u64()
        }

        let prime = u64::from(list_primes(1)[0]);

        for negative in 0..8 {
            for counts in [[0; 7], [prime - 1; 7], [1, 0, prime - 1, 5, prime / 2, 0, 7]] {
                for terms in 1..=7 {
                    let expected = counts[..terms].iter().enumerate().fold(0, |sum, (at, count)| (sum + if at == negative { prime - count } else { *count }) % prime);

                    assert_eq!(sum::<u32>(&counts[..terms], negative, prime), expected, "{terms} terms of u32");
                    assert_eq!(sum::<u64>(&counts[..terms], negative, prime), expected, "{terms} terms of u64");
                }
            }
        }

        let wide = list_wide_primes(1)[0];

        assert_eq!(sum::<u64>(&[wide - 1; 7], 7, wide), wide - 7);
        assert_eq!(sum::<u64>(&[0; 7], 3, wide), 0);
        assert_eq!((5u64.keep_if(0), 5u64.keep_if(1), 5u32.keep_if(0), 5u32.keep_if(1)), (0, 5, 0, 5));
    }

    #[test]
    fn checks_the_last_wide_prime() {
        let primes = list_wide_primes(3);
        let residues_of = |value: i128| -> Vec<u64> { primes.iter().map(|prime| value.rem_euclid(i128::from(*prime)) as u64).collect() };
        let value = 1_234_567_890_123_456_789_012_345_678_i128;
        let mut wrong = residues_of(value);
        wrong[2] = (wrong[2] + 1) % primes[2];

        assert_eq!(combine_checked_wide_residues(&residues_of(value), &primes, false).map(|n| n.to_string()), Ok(value.to_string()));
        assert_eq!(combine_checked_wide_residues(&residues_of(-value), &primes, true).map(|n| n.to_string()), Ok((-value).to_string()));
        assert!(combine_checked_wide_residues(&wrong, &primes, false).unwrap_err().contains("check prime"));
    }

    #[test]
    fn rebuilds_a_product_of_wide_primes_minus_one() {
        let primes = list_wide_primes(4);
        let residues: Vec<u64> = primes.iter().map(|prime| prime - 1).collect();
        let product = primes.iter().fold(BigInt::from_u64(1), |value, prime| &value * &BigInt::from_u64(*prime));

        assert_eq!(combine_wide_residues(&residues, &primes), product.sub_magnitude(&BigInt::from_u64(1)));
    }

    #[test]
    fn checks_the_last_prime() {
        let primes = list_primes(3);
        let mut wrong = residues_of(12_345, &primes);
        wrong[2] = (wrong[2] + 1) % primes[2];

        assert_eq!(combine_checked_residues(&residues_of(12_345, &primes), &primes, false).map(|n| n.to_string()), Ok("12345".into()));
        assert_eq!(combine_checked_residues(&residues_of(-12_345, &primes), &primes, true).map(|n| n.to_string()), Ok("-12345".into()));
        assert!(combine_checked_residues(&wrong, &primes, false).unwrap_err().contains("check prime"));
    }

    #[test]
    fn rebuilds_a_product_of_primes_minus_one() {
        let primes = list_primes(4);
        let residues: Vec<u32> = primes.iter().map(|prime| prime - 1).collect();
        let product = primes.iter().fold(BigInt::from_u64(1), |value, prime| value.mul_small(*prime));

        assert_eq!(combine_residues(&residues, &primes), product.sub_magnitude(&BigInt::from_u64(1)));
    }

    #[test]
    fn keeps_the_order_of_the_tasks() {
        let tasks: Vec<u64> = (0..20).collect();

        assert_eq!(run_workers(&tasks, 3, |task| task * task), tasks.iter().map(|task| task * task).collect::<Vec<_>>());
    }
}
