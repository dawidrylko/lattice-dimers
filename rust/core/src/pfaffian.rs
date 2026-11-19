use crate::modular::{pow_mod, LARGEST_PRIME_BOUND};

fn negate(value: u32, prime: u32) -> u32 {
    if value == 0 { 0 } else { prime - value }
}

/// Swaps the vertices k + 1 and j > k + 1 of a skew-symmetric matrix kept as its entries above the diagonal, from
/// row k on: the rows before it are already eliminated.
fn swap_with_next(matrix: &mut [u32], size: usize, k: usize, j: usize, prime: u32) {
    let next = k + 1;

    matrix.swap(k * size + next, k * size + j);

    for between in next + 1..j {
        let (above, beside) = (matrix[next * size + between], matrix[between * size + j]);

        matrix[next * size + between] = negate(beside, prime);
        matrix[between * size + j] = negate(above, prime);
    }

    matrix[next * size + j] = negate(matrix[next * size + j], prime);

    for after in j + 1..size {
        matrix.swap(next * size + after, j * size + after);
    }
}

/// Computes the Pfaffian of a skew-symmetric matrix modulo a prime below 2^31, like pfaffianModulo of
/// js/core/pfaffian.js. The matrix holds size rows of size residues below the prime. Only the entries above the
/// diagonal are read, the entry in row i and column j > i standing for its negative in row j and column i, and they
/// are overwritten.
///
/// The elimination takes the vertices two at a time. For the pair k and k + 1 it moves a vertex j with a nonzero
/// entry in row k to the place k + 1, which flips the sign, multiplies the Pfaffian by that entry and subtracts the
/// two rows from the rest: with f the row k divided by the entry and b the row k + 1, the entry in row i and column j
/// becomes a[i][j] - f[i] b[j] + f[j] b[i]. Only the columns where f or b is nonzero change, so a step costs the
/// square of their number, not of the size. On a board numbered along its shorter side these are the cells of a few
/// rows, and the whole elimination takes about cells x side^2 updates instead of cells^3 / 6.
pub fn pfaffian_modulo(matrix: &mut [u32], size: usize, prime: u32) -> u32 {
    assert_eq!(matrix.len(), size * size, "the matrix holds size x size entries");
    assert!(prime < LARGEST_PRIME_BOUND, "the prime is below 2^31");

    if !size.is_multiple_of(2) {
        return 0;
    }

    let p = u64::from(prime);
    let mut pfaffian = 1 % p;
    let mut support: Vec<usize> = Vec::with_capacity(size);
    let mut factors: Vec<u64> = Vec::with_capacity(size);
    let mut partners: Vec<u64> = Vec::with_capacity(size);

    for k in (0..size).step_by(2) {
        let Some(found) = (k + 1..size).find(|&j| matrix[k * size + j] != 0) else {
            return 0;
        };

        if found != k + 1 {
            swap_with_next(matrix, size, k, found, prime);
            pfaffian = (p - pfaffian) % p;
        }

        let pivot = u64::from(matrix[k * size + k + 1]);
        let inverse = pow_mod(pivot, p - 2, p);

        pfaffian = pfaffian * pivot % p;
        support.clear();
        factors.clear();
        partners.clear();

        for j in k + 2..size {
            let (above, below) = (matrix[k * size + j], matrix[(k + 1) * size + j]);

            if above != 0 || below != 0 {
                support.push(j);
                factors.push(u64::from(above) * inverse % p);
                partners.push(u64::from(below));
            }
        }

        for (position, &i) in support.iter().enumerate() {
            let (partner, negated_factor) = (partners[position], p - factors[position]);
            let row = &mut matrix[i * size..(i + 1) * size];

            for later in position + 1..support.len() {
                let cell = &mut row[support[later]];

                *cell = ((u64::from(*cell) + factors[later] * partner + negated_factor * partners[later]) % p) as u32;
            }
        }
    }

    pfaffian as u32
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modular::list_primes;

    fn entry(matrix: &[i64], size: usize, i: usize, j: usize) -> i64 {
        if i < j { matrix[i * size + j] } else { -matrix[j * size + i] }
    }

    fn expand(matrix: &[i64], size: usize, vertices: &[usize]) -> i64 {
        let Some((first, rest)) = vertices.split_first() else {
            return 1;
        };

        rest.iter()
            .enumerate()
            .map(|(position, partner)| {
                let others: Vec<usize> = rest.iter().copied().filter(|vertex| vertex != partner).collect();
                let sign = if position % 2 == 0 { 1 } else { -1 };

                sign * entry(matrix, size, *first, *partner) * expand(matrix, size, &others)
            })
            .sum()
    }

    fn residues_of(matrix: &[i64], prime: u32) -> Vec<u32> {
        matrix.iter().map(|value| value.rem_euclid(i64::from(prime)) as u32).collect()
    }

    fn pseudo_random(size: usize, seed: &mut u64, zero_every: u64) -> Vec<i64> {
        let mut matrix = vec![0; size * size];

        for i in 0..size {
            for j in i + 1..size {
                *seed = seed.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1_442_695_040_888_963_407);
                let draw = *seed >> 33;

                matrix[i * size + j] = if draw.is_multiple_of(zero_every) { 0 } else { (draw % 19) as i64 - 9 };
            }
        }

        matrix
    }

    #[test]
    fn expands_small_matrices() {
        let prime = list_primes(1)[0];

        assert_eq!(pfaffian_modulo(&mut [], 0, prime), 1);
        assert_eq!(pfaffian_modulo(&mut [0, 7, 0, 0], 2, prime), 7);
        assert_eq!(pfaffian_modulo(&mut [0, prime - 7, 0, 0], 2, prime), prime - 7);
        assert_eq!(pfaffian_modulo(&mut residues_of(&[0, 1, 2, 3, 0, 0, 4, 5, 0, 0, 0, 6, 0, 0, 0, 0], prime), 4, prime), 8);
    }

    #[test]
    fn gives_zero_for_an_odd_size_and_for_a_vertex_without_a_partner() {
        let prime = list_primes(1)[0];

        assert_eq!(pfaffian_modulo(&mut [0, 1, 1, 0, 0, 1, 0, 0, 0], 3, prime), 0);
        assert_eq!(pfaffian_modulo(&mut [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0], 4, prime), 0);
    }

    #[test]
    fn moves_a_partner_next_to_its_vertex() {
        let prime = list_primes(1)[0];
        let matrix = [0, 0, 0, 5, 0, 0, 3, 2, 0, 0, 0, 7, 0, 0, 0, 0];

        assert_eq!(expand(&matrix, 4, &[0, 1, 2, 3]), 15);
        assert_eq!(pfaffian_modulo(&mut residues_of(&matrix, prime), 4, prime), 15);
    }

    #[test]
    fn agrees_with_the_expansion_along_the_first_row() {
        let mut seed = 2026;

        for prime in [list_primes(2)[1], 7, 3] {
            for (size, zero_every) in [(2, 3), (4, 2), (6, 2), (6, 5), (8, 2), (8, 3), (8, 1_000), (10, 2)] {
                for _ in 0..20 {
                    let matrix = pseudo_random(size, &mut seed, zero_every);
                    let vertices: Vec<usize> = (0..size).collect();
                    let expected = expand(&matrix, size, &vertices).rem_euclid(i64::from(prime)) as u32;

                    assert_eq!(pfaffian_modulo(&mut residues_of(&matrix, prime), size, prime), expected, "{size} x {size} modulo {prime}: {matrix:?}");
                }
            }
        }
    }

    #[test]
    fn ignores_the_entries_on_and_below_the_diagonal() {
        let prime = list_primes(1)[0];
        let mut seed = 7;
        let matrix = pseudo_random(6, &mut seed, 4);
        let mut filled = residues_of(&matrix, prime);

        for i in 0..6 {
            for j in 0..=i {
                filled[i * 6 + j] = 12_345;
            }
        }

        assert_eq!(pfaffian_modulo(&mut filled, 6, prime), pfaffian_modulo(&mut residues_of(&matrix, prime), 6, prime));
    }

    #[test]
    #[should_panic(expected = "the prime is below 2^31")]
    fn rejects_a_prime_of_32_bits() {
        pfaffian_modulo(&mut [0, 1, 0, 0], 2, LARGEST_PRIME_BOUND);
    }
}
