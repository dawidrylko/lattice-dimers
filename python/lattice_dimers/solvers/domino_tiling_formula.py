import sys

from lattice_dimers.core import parse_args, start_timer

USAGE = "Usage: python3 -m lattice_dimers.solvers.domino_tiling_formula -r <rowCount> -c <colCount>"
SQUARE_BOARDS_ONLY = (
    "The formula covers 2n x 2n boards only (OEIS A004003); rowCount and colCount must be equal and even."
)


def multiply_polynomials(p, q):
    """Multiplies two polynomials given as coefficient lists, from the constant term up."""
    product = [0] * (len(p) + len(q) - 1)

    for i, a in enumerate(p):
        for j, b in enumerate(q):
            product[i + j] += a * b

    return product


def subtract_polynomials(p, q):
    """Subtracts two polynomials given as coefficient lists, from the constant term up."""
    return [(p[i] if i < len(p) else 0) - (q[i] if i < len(q) else 0) for i in range(max(len(p), len(q)))]


def create_root_polynomial(n):
    """Builds the monic polynomial whose roots are 4*cos(j*Pi/(2n+1))^2 for j = 1..n, like createRootPolynomial of
    js/solvers/dominoTilingSolver-Formula.js: with z = x - 2 these are the roots of Q_n(z), where Q_0 = 1,
    Q_1 = z + 1 and Q_k = z * Q_{k-1} - Q_{k-2}."""
    z = [-2, 1]
    previous = [1]
    current = [-1, 1]

    if n == 0:
        return previous

    for _ in range(2, n + 1):
        previous, current = current, subtract_polynomials(multiply_polynomials(z, current), previous)

    return current


def calculate_determinant(matrix):
    """Calculates the determinant of an integer matrix with fraction-free Bareiss elimination."""
    a = [row[:] for row in matrix]
    size = len(a)
    sign = 1
    previous_pivot = 1

    for k in range(size - 1):
        if a[k][k] == 0:
            pivot_row = next((i for i in range(k + 1, size) if a[i][k] != 0), None)

            if pivot_row is None:
                return 0

            a[k], a[pivot_row] = a[pivot_row], a[k]
            sign = -sign

        for i in range(k + 1, size):
            for j in range(k + 1, size):
                a[i][j] = (a[i][j] * a[k][k] - a[i][k] * a[k][j]) // previous_pivot

        previous_pivot = a[k][k]

    return 1 if size == 0 else sign * a[size - 1][size - 1]


def calculate_resultant(p, q):
    """Calculates the resultant of two polynomials of equal degree from their Sylvester matrix."""
    degree = len(p) - 1
    size = 2 * degree
    sylvester_matrix = []

    for i in range(size):
        row = [0] * size
        polynomial, shift = (p, i) if i < degree else (q, i - degree)

        for k in range(degree + 1):
            row[shift + k] = polynomial[degree - k]

        sylvester_matrix.append(row)

    return calculate_determinant(sylvester_matrix)


def calculate_total_tiling_combinations(row_count):
    n = row_count // 2
    p = create_root_polynomial(n)
    p_of_minus_x = [-coefficient if i % 2 else coefficient for i, coefficient in enumerate(p)]
    resultant = calculate_resultant(p, p_of_minus_x)

    return -resultant if n % 2 else resultant


def is_valid_size(size):
    return isinstance(size, int) and size >= 0


def main(argv):
    options = parse_args(argv, {"-r": "rowCount", "-c": "colCount"})
    row_count = options.get("rowCount")
    col_count = options.get("colCount")

    if not is_valid_size(row_count) or not is_valid_size(col_count):
        print(USAGE, file=sys.stderr)
        return 1

    if row_count != col_count or row_count % 2 != 0:
        print(SQUARE_BOARDS_ONLY, file=sys.stderr)
        return 1

    stop_timer = start_timer(argv)
    result = calculate_total_tiling_combinations(row_count)
    stop_timer()
    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
