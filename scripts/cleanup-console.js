/**
 * Cleanup Console Script
 * 
 * This script cleans up console logs and optimizes the code for production.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// Function to clean console logs from a file
function cleanConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove console.log statements (keep console.error for production debugging)
    content = content.replace(/console\.log\([^)]*\);?\s*/g, '');
    content = content.replace(/console\.info\([^)]*\);?\s*/g, '');
    content = content.replace(/console\.warn\([^)]*\);?\s*/g, '');
    
    // Keep console.error for production debugging
    // content = content.replace(/console\.error\([^)]*\);?\s*/g, '');
    
    fs.writeFileSync(filePath, content);
    } catch (error) {
    }
}

// Function to recursively process directories
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      processDirectory(filePath);
    } else if (file.endsWith('.js') && !file.includes('test') && !file.includes('spec')) {
      cleanConsoleLogs(filePath);
    }
  });
}

// Start cleanup process
const projectRoot = __dirname;
processDirectory(projectRoot);

