const fs = require('fs');
const path = require('path');

// Define source and destination directories
const sourceDir = path.join(__dirname, 'assets', 'templates');
const destDir = path.join(__dirname, 'build', 'templates');

// Ensure the destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy all template files from assets to build
const templateFiles = fs.readdirSync(sourceDir);
templateFiles.forEach(file => {
  if (file.endsWith('.html')) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);

    // Read the source file
    const content = fs.readFileSync(sourcePath, 'utf8');

    // Write to the destination file
    fs.writeFileSync(destPath, content);

    console.log(`Copied ${file} from assets/templates to build/templates`);
  }
});

console.log('All template files copied successfully!');
