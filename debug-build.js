// Debug build and file serving
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=== BUILD DEBUG ===');

const distPath = path.resolve(__dirname, 'dist', 'public');
console.log('1. Dist path:', distPath);
console.log('2. Dist exists:', fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
  console.log('3. Dist contents:', fs.readdirSync(distPath));
  
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    console.log('4. Assets contents:', fs.readdirSync(assetsPath));
    
    const jsFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith('.js'));
    console.log('5. JS files found:', jsFiles);
    
    if (jsFiles.length > 0) {
      const jsFile = jsFiles[0];
      const jsPath = path.join(assetsPath, jsFile);
      const content = fs.readFileSync(jsPath, 'utf8');
      
      console.log('6. First JS file:', jsFile);
      console.log('7. File size:', content.length, 'characters');
      console.log('8. First 200 characters:');
      console.log(content.substring(0, 200));
      console.log('9. Contains HTML?', content.includes('<!DOCTYPE html>'));
      console.log('10. Contains "import"?', content.includes('import'));
      console.log('11. Contains "function"?', content.includes('function'));
    }
  }
}

// Check index.html
const indexPath = path.join(distPath, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  console.log('12. Index.html script src:', indexContent.match(/src="([^"]*\.js)"/)?.[1] || 'Not found');
}