const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const GITHUB_DISALLOWED_MACROS = ['operatorname', 'DeclareMathOperator', 'newcommand', 'renewcommand', 'def'];

function listMarkdownFiles() {
  const { stdout, error } = spawnSync('git', ['ls-files', '*.md'], { cwd: ROOT_DIRECTORY, encoding: 'utf-8' });

  if (error) {
    throw error;
  }

  return stdout.split('\n').filter(file => file && fs.existsSync(path.join(ROOT_DIRECTORY, file)));
}

function readProse(file) {
  return fs
    .readFileSync(path.join(ROOT_DIRECTORY, file), 'utf-8')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
}

function checkMathMacros(file) {
  const pattern = new RegExp(`\\\\(${GITHUB_DISALLOWED_MACROS.join('|')})(?![A-Za-z])`, 'g');

  return [...readProse(file).matchAll(pattern)].map(
    ([, macro]) => `${file} uses \\${macro}, which GitHub does not render in math; use \\mathrm or a plain symbol.`,
  );
}

function checkMathInLinks(file) {
  return [...readProse(file).matchAll(/\[([^\]\n]*\$[^\]\n]*)\]\([^)\s]+\)/g)].map(
    ([, text]) => `${file} has math in the link text "${text}", which GitHub shows as raw TeX; write it as plain text.`,
  );
}

function runCheck(name, files, check) {
  process.stdout.write(`Checking ${files.length} Markdown files for ${name}... `);
  const errors = files.flatMap(check);

  if (errors.length > 0) {
    console.error(`Failed!\n${errors.map(error => `  ${error}`).join('\n')}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

function __main__() {
  const files = listMarkdownFiles();
  const passed = [
    runCheck('math macros GitHub does not render', files, checkMathMacros),
    runCheck('math in link text', files, checkMathInLinks),
  ].every(Boolean);

  if (passed) {
    console.log('All Markdown tests completed successfully.');
    process.exit(0);
  }

  console.error('Some Markdown tests failed.');
  process.exit(1);
}

__main__();
