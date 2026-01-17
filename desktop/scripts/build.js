#!/usr/bin/env node

/**
 * 桌面端构建脚本
 * 自动化编译和打包流程
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DesktopBuilder {
  constructor() {
    this.rootDir = path.resolve(__dirname, '../..');
    this.desktopDir = path.resolve(__dirname, '..');
    this.frontendDir = path.join(this.rootDir, 'frontend');
    this.backendDir = path.join(this.rootDir, 'backend');
  }

  /**
   * 执行命令
   */
  async runCommand(command, cwd = this.desktopDir, verbose = true) {
    console.log(`🔧 执行命令: ${command}`);
    console.log(`📁 工作目录: ${cwd}`);

    return new Promise((resolve, reject) => {
      const child = spawn(command, { 
        shell: true, 
        cwd,
        stdio: verbose ? 'inherit' : 'pipe'
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`命令执行失败，退出码: ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 构建前端
   */
  async buildFrontend() {
    console.log('🌐 开始构建前端应用...');
    
    if (!fs.existsSync(this.frontendDir)) {
      throw new Error('前端目录不存在');
    }

    // 进入前端目录并构建
    await this.runCommand('npm install', this.frontendDir);
    await this.runCommand('npm run build', this.frontendDir);
    
    console.log('✅ 前端构建完成');
  }

  /**
   * 构建后端
   */
  async buildBackend() {
    console.log('🔧 开始构建后端应用...');
    
    if (!fs.existsSync(this.backendDir)) {
      throw new Error('后端目录不存在');
    }

    // 进入后端目录并构建
    await this.runCommand('npm install', this.backendDir);
    await this.runCommand('npm run build', this.backendDir);
    
    console.log('✅ 后端构建完成');
  }

  /**
   * 构建桌面端TypeScript
   */
  async compileDesktop() {
    console.log('💻 开始编译桌面端TypeScript...');
    
    // 安装依赖
    await this.runCommand('npm install', this.desktopDir);
    
    // 编译TypeScript
    await this.runCommand('npx tsc -p tsconfig.main.json');
    
    console.log('✅ 桌面端编译完成');
  }

  /**
   * 复制必要文件
   */
  async copyAssets() {
    console.log('📦 复制资源文件...');
    
    // 确保dist目录存在
    const distDir = path.join(this.desktopDir, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // 复制前端构建文件
    const frontendBuildDir = path.join(this.frontendDir, 'build');
    const rendererDir = path.join(distDir, 'renderer');
    
    if (fs.existsSync(frontendBuildDir)) {
      if (fs.existsSync(rendererDir)) {
        this.runCommand(`rm -rf "${rendererDir}"`);
      }
      this.runCommand(`cp -r "${frontendBuildDir}" "${rendererDir}"`);
      console.log('✅ 前端文件复制完成');
    }

    // 复制后端构建文件
    const backendBuildDir = path.join(this.backendDir, 'dist');
    const backendDistDir = path.join(distDir, 'backend');
    
    if (fs.existsSync(backendBuildDir)) {
      if (fs.existsSync(backendDistDir)) {
        this.runCommand(`rm -rf "${backendDistDir}"`);
      }
      this.runCommand(`cp -r "${backendBuildDir}" "${backendDistDir}"`);
      console.log('✅ 后端文件复制完成');
    }

    // 复制图标和资源
    const assetsDir = path.join(this.desktopDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      this.runCommand(`cp -r "${assetsDir}" "${distDir}"`);
      console.log('✅ 资源文件复制完成');
    }
  }

  /**
   * 创建打包版本
   */
  async createPackage(target = 'all') {
    console.log(`📦 开始创建 ${target} 打包...`);
    
    switch (target) {
      case 'win':
        await this.runCommand('npm run dist:win');
        break;
      case 'mac':
        await this.runCommand('npm run dist:mac');
        break;
      case 'linux':
        await this.runCommand('npm run dist:linux');
        break;
      case 'all':
        await this.runCommand('npm run dist');
        break;
      default:
        throw new Error(`不支持的打包目标: ${target}`);
    }
    
    console.log('✅ 打包完成');
  }

  /**
   * 检查环境
   */
  checkEnvironment() {
    console.log('🔍 检查构建环境...');
    
    // 检查Node.js版本
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      throw new Error(`需要Node.js 16或更高版本，当前版本: ${nodeVersion}`);
    }
    
    // 检查必要命令
    const commands = ['npm', 'npx', 'tsc'];
    for (const cmd of commands) {
      try {
        execSync(`which ${cmd}`, { stdio: 'pipe' });
      } catch {
        throw new Error(`缺少必要命令: ${cmd}`);
      }
    }
    
    console.log('✅ 环境检查通过');
  }

  /**
   * 清理构建文件
   */
  async clean() {
    console.log('🧹 清理构建文件...');
    
    const dirsToClean = [
      path.join(this.desktopDir, 'dist'),
      path.join(this.desktopDir, 'release'),
      path.join(this.frontendDir, 'build'),
      path.join(this.backendDir, 'dist')
    ];
    
    for (const dir of dirsToClean) {
      if (fs.existsSync(dir)) {
        this.runCommand(`rm -rf "${dir}"`, undefined, false);
      }
    }
    
    console.log('✅ 清理完成');
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
🖥️  AiDesign桌面端构建工具

用法: node scripts/build.js [命令] [选项]

命令:
  build           构建所有组件（前端+后端+桌面端）
  package         构建并打包应用
  frontend        仅构建前端
  backend         仅构建后端
  desktop         仅编译桌面端
  clean           清理所有构建文件
  check           检查构建环境

打包选项:
  --target <os>   指定打包目标 (win|mac|linux|all)
                  默认: all

示例:
  node scripts/build.js build                    # 构建所有组件
  node scripts/build.js package                  # 构建并打包所有平台
  node scripts/build.js package --target win      # 仅打包Windows版本
  node scripts/build.js frontend                 # 仅构建前端
  node scripts/build.js clean                    # 清理构建文件
    `);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const builder = new DesktopBuilder();

  try {
    if (!command || command === 'help' || command === '--help') {
      builder.showHelp();
      return;
    }

    // 检查环境
    builder.checkEnvironment();

    switch (command) {
      case 'check':
        console.log('✅ 环境检查完成');
        break;

      case 'clean':
        await builder.clean();
        break;

      case 'frontend':
        await builder.buildFrontend();
        break;

      case 'backend':
        await builder.buildBackend();
        break;

      case 'desktop':
        await builder.compileDesktop();
        break;

      case 'build':
        await Promise.all([
          builder.buildFrontend(),
          builder.buildBackend(),
          builder.compileDesktop()
        ]);
        await builder.copyAssets();
        console.log('🎉 所有组件构建完成！');
        break;

      case 'package':
        // 先构建
        await Promise.all([
          builder.buildFrontend(),
          builder.buildBackend(),
          builder.compileDesktop()
        ]);
        await builder.copyAssets();
        
        // 获取打包目标
        const targetIndex = args.indexOf('--target');
        const target = targetIndex !== -1 ? args[targetIndex + 1] : 'all';
        
        await builder.createPackage(target);
        console.log('🎉 应用打包完成！');
        break;

      default:
        console.error(`❌ 未知命令: ${command}`);
        builder.showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = DesktopBuilder;