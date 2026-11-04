from concurrent.futures import ThreadPoolExecutor

LARGEST_PRIME_BOUND = 2**31


def list_primes(count):
    """Lists the given number of primes, starting from the largest one below 2^31, in decreasing order."""
    def is_prime(n):
        d = 3

        while d * d <= n:
            if n % d == 0:
                return False

            d += 2

        return True

    primes = []
    n = LARGEST_PRIME_BOUND - 1

    while len(primes) < count:
        if is_prime(n):
            primes.append(n)

        n -= 2

    return primes


def combine_residues(residues, primes):
    """Rebuilds the non-negative integer below the product of the primes from its residues."""
    result = 0
    modulus = 1

    for residue, prime in zip(residues, primes):
        difference = (residue - result) % prime
        result += modulus * (difference * pow(modulus % prime, -1, prime) % prime)
        modulus *= prime

    return result


def combine_checked_residues(residues, primes, signed=False):
    """Rebuilds an integer from all primes but the last one and checks it against the last one."""
    modulus = 1

    for prime in primes[:-1]:
        modulus *= prime

    unsigned = combine_residues(residues[:-1], primes[:-1])
    result = unsigned - modulus if signed and 2 * unsigned > modulus else unsigned

    if result % primes[-1] != residues[-1]:
        raise ValueError(f"The result does not match the residue modulo the check prime {primes[-1]}.")

    return result


def run_workers(work, tasks, jobs):
    """Runs work on every task in its own thread, at most jobs at a time, and returns the results in order."""
    with ThreadPoolExecutor(max_workers=min(jobs, len(tasks))) as executor:
        return list(executor.map(work, tasks))
