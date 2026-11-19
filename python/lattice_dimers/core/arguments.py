import math
import re

from .timer import TIME_FLAG

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


def has_unknown_argument(args, value_flags, plain_flags=()):
    """Tells whether the arguments hold one that a solver does not take, like hasUnknownArgument of
    js/core/commandLineArgsParser.js: a flag of value_flags takes the next argument as its value, whatever it is,
    and a flag of plain_flags stands alone, as --time does for every solver."""
    i = 0

    while i < len(args):
        if args[i] in value_flags:
            i += 1
        elif args[i] not in plain_flags and args[i] != TIME_FLAG:
            return True

        i += 1

    return False
