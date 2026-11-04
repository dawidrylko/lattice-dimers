import math
import re

MAX_SAFE_INTEGER = 2**53 - 1
DIGITS = re.compile(r"[0-9]+")


def parse_args(args, schema):
    """Parses command line arguments like js/core/commandLineArgsParser.js: a flag of the schema takes the next
    argument when it is a safe non-negative integer written in ASCII digits, and NaN otherwise."""
    options = {}
    i = 0

    while i < len(args):
        if args[i] in schema:
            value = args[i + 1] if i + 1 < len(args) else None
            digits = (value.lstrip("0") or "0") if value is not None and DIGITS.fullmatch(value) else None
            valid = digits is not None and len(digits) <= 16 and int(digits) <= MAX_SAFE_INTEGER
            options[schema[args[i]]] = int(digits) if valid else math.nan
            i += 1

        i += 1

    return options
