const SHARD = /^([1-9]\d*)\/([1-9]\d*)$/;

/**
 * Selects the site test cases of one shard. The cases are grouped by check and dealt out in turn, so that the
 * widths of one check land in different shards and the shards take about the same time.
 * @param {Array<{check: string}>} cases The site test cases in their order.
 * @param {string} [shard] The shard as "k/n", 1 <= k <= n; empty or undefined selects every case.
 * @returns {Array<{check: string}>} The cases of the shard, in their order.
 */
function selectShard(cases, shard) {
  if (shard === undefined || shard === '') {
    return cases;
  }

  const match = SHARD.exec(shard);

  if (!match || Number(match[1]) > Number(match[2])) {
    throw new Error(`SITE_TEST_SHARD must be k/n with 1 <= k <= n, not "${shard}".`);
  }

  const [index, count] = [Number(match[1]), Number(match[2])];
  const checks = [...new Set(cases.map(({ check }) => check))];
  const chosen = new Set(
    checks.flatMap(check => cases.filter(testCase => testCase.check === check)).filter((_, position) => position % count === index - 1),
  );

  return cases.filter(testCase => chosen.has(testCase));
}

module.exports = { selectShard };
