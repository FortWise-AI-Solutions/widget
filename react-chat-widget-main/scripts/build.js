const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building React Chat Widget...');

// Clean dist folder
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

try {
  // Build widget
  console.log('📦 Building widget...');
  execSync('npm run build:widget', { stdio: 'inherit' });

  // Build loader
  console.log('📦 Building loader...');
  execSync('npm run build:loader', { stdio: 'inherit' });

  // Copy demo files
  console.log('📄 Copying demo files...');
  fs.copyFileSync('public/demo.html', 'dist/demo.html');

  // Generate size report
  const widgetStats = fs.statSync('dist/chat-widget.iife.js');
  const loaderStats = fs.statSync('dist/loader.iife.js');
  const cssStats = fs.existsSync('dist/chat-widget.css') ? fs.statSync('dist/chat-widget.css') : null;

  console.log('\n📊 Build Complete!');
  console.log(`├── Widget JS: ${(widgetStats.size / 1024).toFixed(2)} KB`);
  console.log(`├── Loader JS: ${(loaderStats.size / 1024).toFixed(2)} KB`);
  if (cssStats) {
    console.log(`├── Widget CSS: ${(cssStats.size / 1024).toFixed(2)} KB`);
  }
  console.log(`└── Demo: dist/demo.html`);

  console.log('\n✅ Ready for CDN deployment!');
  console.log('📁 Files in dist/ folder:');
  fs.readdirSync('dist').forEach(file => {
    console.log(`   - ${file}`);
  });

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}