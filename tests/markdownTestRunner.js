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

function checkMathRanges(file) {
  return [...readProse(file).matchAll(/\$([^$\n]+)\$/g)]
    .filter(([, math]) => math.includes('..'))
    .map(([, math]) => `${file} writes a range as ".." in the math "${math}", which GitHub renders with a gap; use \\dots.`);
}

function checkOeisLinks(file) {
  const prose = readProse(file);
  const labels = [...prose.matchAll(/\[([^\]\n]*)\]\(https:\/\/oeis\.org\/(?:draft\/)?(A\d{6})\)/g)]
    .filter(([, label, entry]) => label !== `OEIS ${entry}`)
    .map(([link, , entry]) => `${file} links ${link}; a link to an OEIS entry reads [OEIS ${entry}](...).`);
  const outside = [...prose.matchAll(/OEIS \[A\d{6}\]\([^)]*\)|\[OEIS A\d{6}\]\((?!https:\/\/oeis\.org\/)[^)]*\)/g)].map(
    ([link]) => `${file} has ${link}; [OEIS A<n>] links to the entry on oeis.org, and the word OEIS belongs inside the link.`,
  );

  return [...labels, ...outside];
}

function decodeTarget(target) {
  try {
    return decodeURIComponent(target.split('#')[0]);
  } catch {
    return null;
  }
}

function checkRelativeLinks(file) {
  return [...readProse(file).matchAll(/\]\(([^)\s]+)\)/g)]
    .map(([, target]) => target)
    .filter(target => !/^([a-z]+:|#)/i.test(target))
    .filter(target => {
      const decoded = decodeTarget(target);

      return decoded === null || !fs.existsSync(path.join(ROOT_DIRECTORY, path.dirname(file), decoded));
    })
    .map(target => `${file} links to ${target}, which does not exist.`);
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
    runCheck('ranges written as .. in math', files, checkMathRanges),
    runCheck('relative links to missing files', files, checkRelativeLinks),
    runCheck('links to OEIS entries', files, checkOeisLinks),
  ].every(Boolean);

  if (passed) {
    console.log('All Markdown tests completed successfully.');
    process.exit(0);
  }

  console.error('Some Markdown tests failed.');
  process.exit(1);
}

__main__();
