/**
 * Console Cleanup Script
 * 
 * Removes console.log statements from production code
 * Run this before production deployment
 */

const fs = require('fs');
const path = require('path');

const removeConsoleLogs = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove console.log statements
    content = content.replace(/console\.log\([^)]*\);?\s*/g, '');
    content = content.replace(/console\.warn\([^)]*\);?\s*/g, '');
    content = content.replace(/console\.error\([^)]*\);?\s*/g, '');
    
    // Remove empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Cleaned: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
  }
};

const processDirectory = (dir) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      processDirectory(filePath);
    } else if (file.endsWith('.js') && !file.includes('test') && !file.includes('debug')) {
      removeConsoleLogs(filePath);
    }
  });
};

// Start processing from src directory
const srcPath = path.join(__dirname, '../src');
if (fs.existsSync(srcPath)) {
  console.log('🧹 Cleaning console.log statements from production code...');
  processDirectory(srcPath);
  console.log('✅ Console cleanup completed!');
} else {
  console.log('❌ src directory not found');
}
