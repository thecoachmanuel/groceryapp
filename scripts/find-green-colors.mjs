import fs from 'fs';
import path from 'path';

function searchInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match any hex color
  const hexMatches = content.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g) || [];
  const uniqueHexes = Array.from(new Set(hexMatches));
  
  const greenHexes = uniqueHexes.filter(h => {
    const clean = h.replace('#', '');
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      // Check if predominantly green
      return g > 120 && g > r && g > b && clean.toLowerCase() !== '53b175';
    }
    return false;
  });

  if (greenHexes.length > 0) {
    console.log(`${filePath}: ${greenHexes.join(', ')}`);
  }
}

function walkDir(dir) {
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', '.git', '.expo', 'dist', 'artifacts'].includes(item.name)) {
        walkDir(full);
      }
    } else if (/\.(tsx|ts|js|jsx|json|css)$/.test(item.name)) {
      searchInFile(full);
    }
  }
}

walkDir('.');
