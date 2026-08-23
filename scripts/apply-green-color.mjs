import fs from 'fs';
import path from 'path';

const filesChanged = [];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Replace #16A34A and #16a34a with #53B175
  content = content.replace(/#16A34A/g, '#53B175');
  content = content.replace(/#16a34a/g, '#53B175');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesChanged.push(filePath);
  }
}

function walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', '.git', '.expo', 'dist', 'artifacts'].includes(item.name)) {
        walk(full);
      }
    } else if (/\.(tsx|ts|js|jsx|json|css|html)$/.test(item.name)) {
      processFile(full);
    }
  }
}

walk('.');
console.log(`Updated ${filesChanged.length} files:`);
filesChanged.forEach(f => console.log('  -', f));
