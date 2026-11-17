import sys

WIDTH = 4
USAGE = "Usage: b309117.py <first n> <last n>"


def list_transitions(width):
    def place(filled, cell, covered, next_states):
        if cell == width:
            next_states.append(covered)
            return

        bit = 1 << cell
        below = bit << 1

        if filled & bit:
            place(filled, cell + 1, covered, next_states)
            return

        if cell + 1 < width and not filled & below:
            place(filled | bit | below, cell + 2, covered, next_states)

        if not covered & bit:
            place(filled | bit, cell + 1, covered | bit, next_states)

        if cell + 1 < width and not covered & below:
            place(filled | bit, cell + 1, covered | below, next_states)

    transitions = []

    for state in range(1 << width):
        next_states = []
        place(state, 0, 0, next_states)
        transitions.append(next_states)

    return transitions


def main(argv):
    if len(argv) != 2 or not all(arg.isascii() and arg.isdigit() for arg in argv) or int(argv[0]) > int(argv[1]):
        print(USAGE, file=sys.stderr)
        return 2

    first, last = int(argv[0]), int(argv[1])
    transitions = list_transitions(WIDTH)
    counts = [1] + [0] * ((1 << WIDTH) - 1)

    for n in range(last + 1):
        if n >= first:
            print(n, counts[0])

        following = [0] * (1 << WIDTH)

        for state, count in enumerate(counts):
            if count:
                for covered in transitions[state]:
                    following[covered] += count

        counts = following

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
