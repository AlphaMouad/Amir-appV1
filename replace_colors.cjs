const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Fonts
  content = content.replace(/font-outfit/g, 'font-playfair');
  content = content.replace(/font-inter/g, 'font-montserrat');
  
  // Colors (Mapping Indigo/Purple to AMG Gold/Ebony)
  content = content.replace(/indigo-200/g, 'stone-300'); 
  content = content.replace(/indigo-300/g, 'amber-200');
  content = content.replace(/indigo-400/g, 'amber-400');
  content = content.replace(/indigo-500/g, 'amber-600');
  content = content.replace(/indigo-600/g, 'amber-700');
  content = content.replace(/indigo-900/g, 'stone-900');
  
  content = content.replace(/violet-300/g, 'amber-300');
  content = content.replace(/violet-600/g, 'stone-800');
  
  if (original !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walk('C:/Users/aser/Desktop/Amir-appV1/src');
