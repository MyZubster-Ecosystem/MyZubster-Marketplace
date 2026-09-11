const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const ignored = new Set(['.git', 'node_modules']);

function javascriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name)) return [];
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(target);
    return entry.isFile() && entry.name.endsWith('.js') ? [target] : [];
  });
}

const failures = [];
const files = javascriptFiles(root);

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) failures.push({ file: path.relative(root, file), error: result.stderr.trim() });
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`${failure.file}: ${failure.error}`);
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
