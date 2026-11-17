const fs = require('fs');
const path = require('path');

const WORKFLOW = path.join(__dirname, '..', '.github', 'workflows', 'ci.yml');
const indent = line => line.length - line.trimStart().length;

function readLines() {
  return fs.readFileSync(WORKFLOW, 'utf-8').split('\n');
}

/**
 * Reads the run script of a named step of the CI workflow, without its indentation.
 * @param {string} name The name of the step.
 * @returns {string|null} The script, or null when no step of that name has a block run script.
 */
function readStepScript(name) {
  const lines = readLines();
  const start = lines.findIndex(line => line.trim() === `- name: ${name}`);
  const run = lines.findIndex((line, index) => start !== -1 && index > start && line.trim() === 'run: |');

  if (run === -1) {
    return null;
  }

  const end = lines.findIndex((line, index) => index > run && line.trim() !== '' && indent(line) <= indent(lines[run]));
  const body = lines.slice(run + 1, end === -1 ? lines.length : end);
  const margin = Math.min(...body.filter(line => line.trim() !== '').map(indent));

  return body.map(line => line.slice(margin)).join('\n');
}

/**
 * Lists the jobs of the CI workflow with the text of each.
 * @returns {Map<string, string>} The text of each job by its id, in the order of the workflow.
 */
function readJobs() {
  const lines = readLines();
  const start = lines.indexOf('jobs:');
  const jobs = new Map();
  let id = null;

  for (const line of lines.slice(start + 1)) {
    const key = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line);

    if (key) {
      id = key[1];
      jobs.set(id, '');
    } else if (id && (line.trim() === '' || indent(line) > 2)) {
      jobs.set(id, `${jobs.get(id)}${line}\n`);
    } else if (line.trim() !== '') {
      id = null;
    }
  }

  return jobs;
}

module.exports = { WORKFLOW, readLines, readStepScript, readJobs };
