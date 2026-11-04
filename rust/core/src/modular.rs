use std::cmp::Ordering;
use std::sync::Mutex;
use std::sync::atomic::{self, AtomicUsize};
use std::thread;

use crate::bigint::BigInt;

pub const LARGEST_PRIME_BOUND: u32 = 1 << 31;

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

fn pow_mod(base: u64, mut exponent: u64, modulus: u64) -> u64 {
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
    fn lists_the_largest_primes_below_two_to_the_31() {
        assert_eq!(list_primes(3), vec![2_147_483_647, 2_147_483_629, 2_147_483_587]);
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
