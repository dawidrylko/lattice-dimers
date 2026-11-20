const { TIME_FLAG } = require('./timer');

/**
 * Parses command line arguments based on a provided schema.
 * @param {string[]} args The command line arguments.
 * @param {Object} schema The schema defining argument mappings.
 * @returns {Object} Parsed options with their corresponding values, NaN for a missing value or one that is not a safe non-negative integer.
 */
function parseCommandLineArguments(args, schema) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const currentArg = args[i];
    const nextArg = args[i + 1];

    if (Object.hasOwn(schema, currentArg)) {
      options[schema[currentArg]] =
        nextArg !== void 0 && /^\d+$/.test(nextArg) && Number.isSafeInteger(Number(nextArg))
          ? Number(nextArg)
          : NaN;
      i++;
    }
  }

  return options;
}

/**
 * Tells whether the arguments hold one that a solver cannot use, so that the solver answers with its usage
 * line and not with the count of another board.
 * @param {string[]} args The command line arguments.
 * @param {string[]} valueFlags The flags that take the next argument as their value, whatever it is.
 * @param {string[]} [plainFlags] The flags that stand alone, and may repeat. Every solver takes --time as well.
 * @returns {boolean} Whether an argument is neither one of these flags nor the value of one, or a flag with a
 * value comes a second time.
 */
function hasUnusableArgument(args, valueFlags, plainFlags = []) {
  const seen = new Set();

  for (let i = 0; i < args.length; i++) {
    if (valueFlags.includes(args[i])) {
      if (seen.has(args[i])) {
        return true;
      }

      seen.add(args[i]);
      i++;
    } else if (!plainFlags.includes(args[i]) && args[i] !== TIME_FLAG) {
      return true;
    }
  }

  return false;
}

/**
 * Tells whether the arguments hold one that a script which is no solver does not know, so that the script answers
 * with its usage line and does not run something other than what was asked. Such a script has no --time.
 * @param {string[]} args The command line arguments.
 * @param {string[]} valueFlags The flags that take the next argument as their value and may come once.
 * @param {string[]} [plainFlags] The flags that stand alone, and may repeat.
 * @returns {boolean} Whether a solver with these flags could not use an argument, --time is among the arguments,
 * or the last argument is a flag with a value, which then has none.
 */
function hasUnknownArgument(args, valueFlags, plainFlags = []) {
  return hasUnusableArgument(args, valueFlags, plainFlags) || args.includes(TIME_FLAG) || valueFlags.includes(args.at(-1));
}

module.exports = { parseCommandLineArguments, hasUnusableArgument, hasUnknownArgument };
