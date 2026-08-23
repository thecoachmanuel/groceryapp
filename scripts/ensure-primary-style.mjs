import fs from 'fs';
import path from 'path';

const updated = [];

function checkFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Replace instances of bg-primary on header containers that lack explicit style backgroundColor
  // e.g. <SafeAreaView edges={['top']} className="bg-primary ..."> -> add style={{ backgroundColor: '#53B175' }}
  content = content.replace(/<SafeAreaView([^>]*?)className="([^"]*?bg-primary[^"]*?)"(?!\s*style=)/g, (match, p1, p2) => {
    return `<SafeAreaView${p1}className="${p2}" style={{ backgroundColor: '#53B175' }}`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    updated.push(filePath);
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
    } else if (/\.(tsx|jsx)$/.test(item.name)) {
      checkFile(full);
    }
  }
}

walk('./app');
walk('./components');
console.log(`Updated ${updated.length} files with explicit #53B175 background style:`);
updated.forEach(f => console.log('  -', f));
