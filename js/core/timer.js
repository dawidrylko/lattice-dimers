const TIME_FLAG = '--time';

/**
 * Starts timing a count. The returned function writes "time <milliseconds> ms" to standard error when the
 * arguments include --time, so a benchmark reads the time of the count apart from the start of the process.
 * @param {string[]} [argv] The arguments of the solver.
 * @returns {() => void} The function to call once the count is known, before it is printed.
 */
function startTimer(argv = process.argv.slice(2)) {
  const start = performance.now();

  return () => {
    if (argv.includes(TIME_FLAG)) {
      console.error(`time ${(performance.now() - start).toFixed(3)} ms`);
    }
  };
}

module.exports = { startTimer, TIME_FLAG };
