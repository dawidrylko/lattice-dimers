import sys

USAGE = "Usage: b402345.py <first n> <last n>"


def trimmed(polynomial):
    while len(polynomial) > 1 and polynomial[-1] == 0:
        polynomial.pop()

    return polynomial


def combine(a, b, sign=1):
    length = max(len(a), len(b))
    a = a + [0] * (length - len(a))
    b = b + [0] * (length - len(b))

    return trimmed([x + sign * y for x, y in zip(a, b)])


def recurrence(first, m):
    previous, current = first, [0, 1]

    if m == 0:
        return previous

    for _ in range(1, m):
        previous, current = current, combine([0] + current, previous, -1)

    return current


def shifted(a, s):
    result = [0]

    for coefficient in reversed(a):
        result = combine(combine([0] + result, [c * s for c in result]), [coefficient])

    return result


def resultant(p, q):
    m, n = len(p) - 1, len(q) - 1
    size = m + n

    if size == 0:
        return 1

    matrix = [[0] * size for _ in range(size)]

    for i in range(n):
        for j in range(m + 1):
            matrix[i][i + j] = p[m - j]

    for i in range(m):
        for j in range(n + 1):
            matrix[n + i][i + j] = q[n - j]

    sign, previous = 1, 1

    for k in range(size - 1):
        if matrix[k][k] == 0:
            row = next((row for row in range(k + 1, size) if matrix[row][k]), None)

            if row is None:
                return 0

            matrix[k], matrix[row] = matrix[row], matrix[k]
            sign = -sign

        pivot = matrix[k][k]

        for i in range(k + 1, size):
            lead = matrix[i][k]

            for j in range(k + 1, size):
                quotient, remainder = divmod(matrix[i][j] * pivot - lead * matrix[k][j], previous)

                if remainder:
                    raise ArithmeticError(f"A fraction-free step does not divide at k = {k}.")

                matrix[i][j] = quotient

        previous = pivot

    return sign * matrix[size - 1][size - 1]


def count(n):
    p = recurrence([1], 2 * n)[::2]
    q = combine(shifted(recurrence([2], n), 2), [2])

    return resultant(p, q)


def main(argv):
    if len(argv) != 2 or not all(arg.isascii() and arg.isdigit() for arg in argv) or int(argv[0]) > int(argv[1]):
        print(USAGE, file=sys.stderr)
        return 2

    for n in range(int(argv[0]), int(argv[1]) + 1):
        print(n, count(n))

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
