import sys


def side_counts(rows, cols, limit=2):
    states = {(0, 0): 1}
    for cell in range(rows * cols):
        r, c = divmod(cell, cols)
        nxt = {}

        def add(mask, side, ways):
            if side <= limit:
                key = (mask >> 1, side)
                nxt[key] = nxt.get(key, 0) + ways

        for (mask, side), ways in states.items():
            if mask & 1:
                add(mask, side, ways)
                continue
            taken = mask | 1
            for offset, is_side, ok in (
                (1, 1, c < cols - 1),
                (cols - 1, 0, c > 0 and r < rows - 1),
                (cols, 1, r < rows - 1),
                (cols + 1, 0, c < cols - 1 and r < rows - 1),
            ):
                if ok and not (taken >> offset) & 1:
                    add(taken | (1 << offset), side + is_side, ways)
        states = nxt
    counts = [0] * (limit + 1)
    for (mask, side), ways in states.items():
        if mask == 0:
            counts[side] += ways
    return counts


def main():
    top = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    failures = 0
    for m in range(1, top + 1):
        for n in range(1, top + 1):
            expected = [1, 0, m * n * (m + n + 2) // 2]
            got = side_counts(2 * m, 2 * n)
            if got != expected:
                failures += 1
                print(f"{2 * m}x{2 * n}: {got}, expected {expected}")
    print(f"{top * top} boards up to {2 * top}x{2 * top}, {failures} failures")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
