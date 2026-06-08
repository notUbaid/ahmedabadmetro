const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('useEffect(') && !content.includes('import ') && !content.includes('React.useEffect')) {
    console.log(file, 'has useEffect but no import?');
  } else if (content.includes('useEffect(') && !content.match(/import.*useEffect.*from/)) {
    if (!content.includes('React.useEffect')) {
      console.log(file, 'has useEffect but missing from import list');
    }
  }
});
