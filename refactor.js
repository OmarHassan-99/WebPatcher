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
      if (file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'frontend/src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Global Text Replacement
  content = content.replace(/text-gray-400/g, 'text-surface-500');
  content = content.replace(/text-gray-500/g, 'text-surface-400');
  content = content.replace(/text-white\/40/g, 'text-surface-500');
  content = content.replace(/text-white\/30/g, 'text-surface-400');
  content = content.replace(/text-white\/20/g, 'text-surface-300');
  content = content.replace(/text-white\/35/g, 'text-surface-500');
  
  // Refactor classes
  let classes = content.split('className="');
  for (let i = 1; i < classes.length; i++) {
     let closeQuote = classes[i].indexOf('"');
     if (closeQuote === -1) continue;
     let cls = classes[i].substring(0, closeQuote);
     let newCls = cls;
     
     // Backgrounds
     newCls = newCls.replace(/bg-surface-950/g, 'bg-surface-50');
     newCls = newCls.replace(/bg-surface-900/g, 'bg-white');
     newCls = newCls.replace(/bg-surface-800/g, 'bg-surface-100');
     
     // Borders
     newCls = newCls.replace(/border-white\/10/g, 'border-surface-200');
     newCls = newCls.replace(/border-white\/5/g, 'border-surface-200');
     newCls = newCls.replace(/border-surface-800/g, 'border-surface-200');
     newCls = newCls.replace(/border-surface-700/g, 'border-surface-300');
     
     // Text colors mapping
     if (!newCls.includes('bg-primary') && !newCls.includes('bg-red') && !newCls.includes('bg-green') && !newCls.includes('bg-blue') && !newCls.includes('hero-gradient-text')) {
         newCls = newCls.replace(/text-white/g, 'text-surface-900');
     }
     
     // Additional text colors mapping
     newCls = newCls.replace(/text-surface-400/g, 'text-surface-500');
     newCls = newCls.replace(/text-surface-300/g, 'text-surface-600');
     newCls = newCls.replace(/text-surface-200/g, 'text-surface-700');
     newCls = newCls.replace(/text-surface-100/g, 'text-surface-800');
     
     // Background fix
     newCls = newCls.replace(/bg-[#030014]/g, 'bg-surface-50');
     
     classes[i] = newCls + classes[i].substring(closeQuote);
  }
  content = classes.join('className="');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});
