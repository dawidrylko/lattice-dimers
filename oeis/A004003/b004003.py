import sys

USAGE = "Usage: b004003.py <first n> <last n>"


def chebyshev(m):
    previous, current = [1], [0, 1]

    if m == 0:
        return previous

    for _ in range(1, m):
        length = len(current) + 1
        raised = [0] + current
        lowered = previous + [0] * (length - len(previous))
        previous, current = current, [x - y for x, y in zip(raised, lowered)]

    return current


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
    p = chebyshev(2 * n)[::2]
    q = [-c if i % 2 else c for i, c in enumerate(p)]

    return (-1) ** n * resultant(p, q)


def main(argv):
    if len(argv) != 2 or not all(arg.isascii() and arg.isdigit() for arg in argv) or int(argv[0]) > int(argv[1]):
        print(USAGE, file=sys.stderr)
        return 2

    for n in range(int(argv[0]), int(argv[1]) + 1):
        print(n, count(n))

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
