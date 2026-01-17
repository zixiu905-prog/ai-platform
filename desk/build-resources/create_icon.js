const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

async function createIcons() {
  console.log('Creating icons...');
  
  // Create 512x512 icon
  const size = 512;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#1890ff');
  gradient.addColorStop(0.5, '#096dd9');
  gradient.addColorStop(1, '#0050b3');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Add rounded corners effect
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 100);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Add AI text
  ctx.font = 'bold 200px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 10;
  ctx.fillText('AI', size / 2, size / 2);

  // Save PNG
  const pngBuffer = canvas.toBuffer('image/png');
  fs.writeFileSync('icon.png', pngBuffer);
  console.log('✓ Created icon.png');

  // For Windows, we'll use electron-builder's icon generation
  // It can convert PNG to ICO automatically
  
  // For macOS, we need .icns format
  // In a real environment, you'd use iconutil (macOS only)
  // For now, we'll create a placeholder
  
  console.log('✓ Icon creation complete');
  console.log('Note: electron-builder will automatically handle icon conversion during build');
}

createIcons().catch(console.error);
