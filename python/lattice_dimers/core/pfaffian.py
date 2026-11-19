import numpy as np

from .modular import LARGEST_PRIME_BOUND


def pfaffian_modulo(matrix, prime):
    """Computes the Pfaffian of a skew-symmetric matrix modulo a prime below 2^31, like pfaffianModulo of
    js/core/pfaffian.js. The matrix is a square NumPy array of 64-bit unsigned residues below the prime. Only the
    entries above the diagonal are read, the entry in row i and column j > i standing for its negative in row j and
    column i, and the array is overwritten.

    The elimination takes the vertices two at a time. For the pair k and k + 1 it moves a vertex j with a nonzero
    entry in row k to the place k + 1, which flips the sign, multiplies the Pfaffian by that entry and subtracts the
    two rows from the rest: with f the row k divided by the entry and b the row k + 1, the entry in row i and column j
    becomes a[i][j] - f[i] b[j] + f[j] b[i]. Only the columns where f or b is nonzero change, so a step costs the
    square of their number, not of the size.

    NumPy moves a block of entries at once, so the array holds both halves of the matrix and a step updates the block
    of the columns that change on both sides of the diagonal. Where those columns fill at least half of the window
    from the first to the last of them, the step updates the window through a view of the array, and otherwise it
    gathers the columns. Two products of residues below 2^31 and an entry fit an unsigned 64-bit sum."""
    if matrix.ndim != 2 or matrix.shape[0] != matrix.shape[1] or not prime < LARGEST_PRIME_BOUND:
        raise ValueError(f"The matrix must be square and the prime must be below {LARGEST_PRIME_BOUND}.")

    size = len(matrix)

    if size % 2 == 1:
        return 0

    modulus = np.uint64(prime)
    below = np.tri(size, k=-1, dtype=bool)
    mirrored = matrix.T[below]
    np.subtract(modulus, mirrored, out=mirrored)
    mirrored %= modulus
    matrix[below] = mirrored
    np.fill_diagonal(matrix, 0)
    pfaffian = 1 % prime

    for k in range(0, size, 2):
        candidates = np.flatnonzero(matrix[k, k + 1 :])

        if candidates.size == 0:
            return 0

        found = k + 1 + int(candidates[0])

        if found != k + 1:
            matrix[[k + 1, found], k:] = matrix[[found, k + 1], k:]
            matrix[k:, [k + 1, found]] = matrix[k:, [found, k + 1]]
            pfaffian = -pfaffian % prime

        pivot = int(matrix[k, k + 1])
        pfaffian = pfaffian * pivot % prime
        touched = np.flatnonzero(matrix[k, k + 2 :] | matrix[k + 1, k + 2 :])

        if touched.size == 0:
            continue

        inverse = np.uint64(pow(pivot, -1, prime))
        first, last = k + 2 + int(touched[0]), k + 3 + int(touched[-1])

        if 2 * touched.size >= last - first:
            factors = matrix[k, first:last] * inverse % modulus
            partners = matrix[k + 1, first:last]
            block = matrix[first:last, first:last]
            block += np.outer(partners, factors)
            block += np.outer(modulus - factors, partners)
            block %= modulus
        else:
            support = k + 2 + touched
            factors = matrix[k, support] * inverse % modulus
            partners = matrix[k + 1, support]
            block = np.ix_(support, support)
            matrix[block] = (matrix[block] + np.outer(partners, factors) + np.outer(modulus - factors, partners)) % modulus

    return pfaffian
