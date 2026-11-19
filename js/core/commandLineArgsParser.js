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
 * Tells whether the arguments hold one that a solver does not take, so that the solver answers with its usage
 * line and not with the count of another board.
 * @param {string[]} args The command line arguments.
 * @param {string[]} valueFlags The flags that take the next argument as their value, whatever it is.
 * @param {string[]} [plainFlags] The flags that stand alone. Every solver takes --time as well.
 * @returns {boolean} Whether an argument is neither one of these flags nor the value of one.
 */
function hasUnknownArgument(args, valueFlags, plainFlags = []) {
  for (let i = 0; i < args.length; i++) {
    if (valueFlags.includes(args[i])) {
      i++;
    } else if (!plainFlags.includes(args[i]) && args[i] !== TIME_FLAG) {
      return true;
    }
  }

  return false;
}

module.exports = { parseCommandLineArguments, hasUnknownArgument };
