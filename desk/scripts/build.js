#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始构建AI智能体平台桌面应用...');

// 检查环境
function checkEnvironment() {
  console.log('📋 检查构建环境...');
  
  const requiredDirs = [
    'src',
    'src/main',
    'src/renderer',
    'package.json'
  ];
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      console.error(`❌ 缺少必要文件/目录: ${dir}`);
      process.exit(1);
    }
  }
  
  console.log('✅ 环境检查通过');
}

// 构建前端
function buildFrontend() {
  console.log('🏗️ 构建前端应用...');
  
  try {
    process.chdir('../frontend');
    execSync('npm ci', { stdio: 'inherit' });
    execSync('npm run build', { stdio: 'inherit' });
    process.chdir('../desk');
    console.log('✅ 前端构建完成');
  } catch (error) {
    console.error('❌ 前端构建失败:', error.message);
    process.exit(1);
  }
}

// 构建TypeScript
function buildTypeScript() {
  console.log('🔨 编译TypeScript...');
  
  try {
    execSync('npx tsc -p tsconfig.electron.json', { stdio: 'inherit' });
    console.log('✅ TypeScript编译完成');
  } catch (error) {
    console.error('❌ TypeScript编译失败:', error.message);
    process.exit(1);
  }
}

// 构建渲染进程
function buildRenderer() {
  console.log('🎨 构建渲染进程...');
  
  try {
    // 使用Vite构建渲染进程
    execSync('npx vite build --config vite.renderer.config.ts', { stdio: 'inherit' });
    console.log('✅ 渲染进程构建完成');
  } catch (error) {
    console.error('❌ 渲染进程构建失败:', error.message);
    process.exit(1);
  }
}

// 复制资源文件
function copyAssets() {
  console.log('📁 复制资源文件...');
  
  const assetsDir = 'build-resources';
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // 创建默认图标文件（如果不存在）
  const defaultIcon = path.join(assetsDir, 'icon.png');
  if (!fs.existsSync(defaultIcon)) {
    console.log('⚠️ 创建默认图标占位符');
    // 这里应该放置实际的图标文件
  }
  
  console.log('✅ 资源文件复制完成');
}

// 打包应用
function packageApp() {
  console.log('📦 打包应用...');
  
  try {
    const platform = process.env.PLATFORM || 'all';
    const arch = process.env.ARCH || 'x64';
    
    let command = 'npx electron-builder';
    
    if (platform !== 'all') {
      command += ` --${platform}`;
    }
    
    if (arch !== 'x64') {
      command += ` --${arch}`;
    }
    
    if (process.env.PUBLISH === 'true') {
      command += ' --publish always';
    }
    
    console.log(`执行命令: ${command}`);
    execSync(command, { stdio: 'inherit' });
    
    console.log('✅ 应用打包完成');
  } catch (error) {
    console.error('❌ 应用打包失败:', error.message);
    process.exit(1);
  }
}

// 生成构建信息
function generateBuildInfo() {
  console.log('📄 生成构建信息...');
  
  const buildInfo = {
    version: require('./package.json').version,
    buildTime: new Date().toISOString(),
    gitCommit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
    gitBranch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
  
  fs.writeFileSync(
    path.join('dist', 'build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );
  
  console.log('✅ 构建信息生成完成');
}

// 主流程
async function main() {
  try {
    checkEnvironment();
    buildFrontend();
    buildTypeScript();
    buildRenderer();
    copyAssets();
    packageApp();
    generateBuildInfo();
    
    console.log('🎉 桌面应用构建完成！');
    console.log('📂 输出目录: dist/');
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
  }
}

main();