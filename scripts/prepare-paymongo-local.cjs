// Copy only public website assets. Backend files and secrets stay outside
// the Hosting emulator's public root (its deployment ignore list isn't enough).
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, process.argv[2] || '.cache/paymongo-site');
fs.mkdirSync(output, { recursive: true });
for (const entry of fs.readdirSync(root)) {
  if (entry.endsWith('.html') || entry === 'manifest.webmanifest') {
    fs.copyFileSync(path.join(root, entry), path.join(output, entry));
  }
}
for (const directory of ['assets', 'css', 'js', 'data']) {
  fs.cpSync(path.join(root, directory), path.join(output, directory), {
    recursive: true, filter: source => !path.basename(source).startsWith('.')
  });
}
console.log('Website prepared (public files only).');
