const fs = require('fs');
const { isMainThread } = require('worker_threads');

if (isMainThread) {
  process.on('exit', () => {
    fs.writeSync(2, `peak ${process.resourceUsage().maxRSS * 1024}\n`);
  });
}
