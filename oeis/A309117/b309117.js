const WIDTH = 4;

function transitions(width) {
  const next = Array.from({ length: 1 << width }, () => []);
  const fill = (from, filled, cell, covered) => {
    if (cell === width) {
      next[from].push(covered);
      return;
    }
    const bit = 1 << cell;
    const below = bit << 1;
    if (filled & bit) {
      fill(from, filled, cell + 1, covered);
      return;
    }
    if (cell + 1 < width && !(filled & below)) fill(from, filled | bit | below, cell + 2, covered);
    if (!(covered & bit)) fill(from, filled | bit, cell + 1, covered | bit);
    if (cell + 1 < width && !(covered & below)) fill(from, filled | bit, cell + 1, covered | below);
  };
  for (let from = 0; from < 1 << width; from++) fill(from, from, 0, 0);
  return next;
}

const [from, to] = process.argv.slice(2).map(Number);
const next = transitions(WIDTH);
let counts = Array.from({ length: 1 << WIDTH }, (_, state) => (state === 0 ? 1n : 0n));
for (let n = 0; n <= to; n++) {
  if (n >= from) console.log(n, counts[0].toString());
  const following = Array(1 << WIDTH).fill(0n);
  counts.forEach((count, state) => {
    if (count) for (const covered of next[state]) following[covered] += count;
  });
  counts = following;
}
