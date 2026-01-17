#!/usr/bin/env node

/**
 * 桌面端开发脚本
 * 启动开发环境，热重载支持
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

class DesktopDevServer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '../..');
    this.desktopDir = path.resolve(__dirname, '..');
    this.frontendDir = path.join(this.rootDir, 'frontend');
    this.backendDir = path.join(this.rootDir, 'backend');
    
    this.processes = [];
    this.isShuttingDown = false;
  }

  /**
   * 检查端口是否可用
   */
  checkPort(port) {
    return new Promise((resolve) => {
      const server = http.createServer();
      
      server.listen(port, () => {
        server.close(() => {
          resolve(true);
        });
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * 等待服务启动
   */
  async waitForService(url, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        http.get(url, (res) => {
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            retry();
          }
        }).on('error', retry);
      };
      
      const retry = () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`服务启动超时: ${url}`));
          return;
        }
        
        setTimeout(check, 1000);
      };
      
      check();
    });
  }

  /**
   * 启动前端开发服务器
   */
  async startFrontend() {
    console.log('🌐 启动前端开发服务器...');
    
    if (!fs.existsSync(this.frontendDir)) {
      throw new Error('前端目录不存在');
    }

    const frontend = spawn('npm', ['start'], {
      cwd: this.frontendDir,
      stdio: 'pipe'
    });

    frontend.stdout.on('data', (data) => {
      console.log(`[Frontend] ${data.toString().trim()}`);
    });

    frontend.stderr.on('data', (data) => {
      console.error(`[Frontend Error] ${data.toString().trim()}`);
    });

    frontend.on('error', (error) => {
      console.error('前端服务启动失败:', error);
    });

    frontend.on('close', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        console.error(`前端服务退出，代码: ${code}`);
      }
    });

    this.processes.push({
      name: 'frontend',
      process: frontend
    });

    // 等待前端服务启动
    try {
      await this.waitForService('http://localhost:3000');
      console.log('✅ 前端服务已启动 (http://localhost:3000)');
    } catch (error) {
      console.error('❌ 前端服务启动失败:', error.message);
    }
  }

  /**
   * 启动后端开发服务器
   */
  async startBackend() {
    console.log('🔧 启动后端开发服务器...');
    
    if (!fs.existsSync(this.backendDir)) {
      throw new Error('后端目录不存在');
    }

    const backend = spawn('npm', ['run', 'dev'], {
      cwd: this.backendDir,
      stdio: 'pipe'
    });

    backend.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    backend.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    backend.on('error', (error) => {
      console.error('后端服务启动失败:', error);
    });

    backend.on('close', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        console.error(`后端服务退出，代码: ${code}`);
      }
    });

    this.processes.push({
      name: 'backend',
      process: backend
    });

    // 等待后端服务启动
    try {
      await this.waitForService('http://localhost:3001');
      console.log('✅ 后端服务已启动 (http://localhost:3001)');
    } catch (error) {
      console.error('❌ 后端服务启动失败:', error.message);
    }
  }

  /**
   * 启动Electron开发模式
   */
  async startElectron() {
    console.log('💻 启动Electron应用...');
    
    // 先编译TypeScript
    console.log('🔧 编译TypeScript...');
    await this.runCommand('npx tsc -p tsconfig.main.json', this.desktopDir);

    // 启动Electron
    const electron = spawn('npx', ['electron', '.'], {
      cwd: this.desktopDir,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    electron.stdout.on('data', (data) => {
      console.log(`[Electron] ${data.toString().trim()}`);
    });

    electron.stderr.on('data', (data) => {
      console.error(`[Electron Error] ${data.toString().trim()}`);
    });

    electron.on('error', (error) => {
      console.error('Electron启动失败:', error);
    });

    electron.on('close', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        console.error(`Electron应用退出，代码: ${code}`);
      }
    });

    this.processes.push({
      name: 'electron',
      process: electron
    });

    console.log('✅ Electron应用已启动');
  }

  /**
   * 执行命令
   */
  runCommand(command, cwd) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { 
        shell: true, 
        cwd,
        stdio: 'pipe'
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`命令执行失败，退出码: ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  /**
   * 设置文件监听和热重载
   */
  setupWatchers() {
    console.log('👀 设置文件监听...');
    
    const { chokidar } = require('chokidar');
    
    // 监听桌面端源码变化
    const desktopWatcher = chokidar.watch(
      path.join(this.desktopDir, 'src/**/*.ts'),
      { ignoreInitial: true }
    );

    desktopWatcher.on('change', () => {
      console.log('🔄 检测到桌面端源码变化，重新编译...');
      this.runCommand('npx tsc -p tsconfig.main.json', this.desktopDir)
        .then(() => {
          console.log('✅ 桌面端重新编译完成');
          // 重启Electron
          this.restartElectron();
        })
        .catch(error => {
          console.error('❌ 桌面端编译失败:', error.message);
        });
    });

    console.log('✅ 文件监听已设置');
  }

  /**
   * 重启Electron应用
   */
  async restartElectron() {
    console.log('🔄 重启Electron应用...');
    
    // 找到Electron进程
    const electronProcess = this.processes.find(p => p.name === 'electron');
    
    if (electronProcess) {
      electronProcess.process.kill();
      this.processes = this.processes.filter(p => p.name !== 'electron');
      
      // 等待进程退出
      await new Promise(resolve => {
        setTimeout(resolve, 1000);
      });
      
      // 重新启动
      await this.startElectron();
    }
  }

  /**
   * 启动开发环境
   */
  async startDev() {
    console.log('🚀 启动AiDesign桌面端开发环境...\n');

    try {
      // 检查依赖
      await this.checkDependencies();

      // 启动前端和后端服务
      await Promise.all([
        this.startFrontend(),
        this.startBackend()
      ]);

      // 启动Electron
      await this.startElectron();

      // 设置文件监听
      this.setupWatchers();

      console.log('\n🎉 开发环境启动完成！');
      console.log('📱 前端: http://localhost:3000');
      console.log('🔧 后端: http://localhost:3001');
      console.log('💻 桌面应用: Electron窗口');
      console.log('\n按 Ctrl+C 退出开发环境');

    } catch (error) {
      console.error('❌ 开发环境启动失败:', error.message);
      this.shutdown();
      process.exit(1);
    }
  }

  /**
   * 检查依赖
   */
  async checkDependencies() {
    console.log('🔍 检查依赖...');
    
    const dependencies = ['chokidar'];
    
    for (const dep of dependencies) {
      try {
        require.resolve(dep);
      } catch {
        console.log(`📦 安装依赖: ${dep}`);
        await this.runCommand(`npm install ${dep}`, this.desktopDir);
      }
    }
    
    console.log('✅ 依赖检查完成');
  }

  /**
   * 优雅关闭所有进程
   */
  async shutdown() {
    console.log('\n🛑 正在关闭开发环境...');
    this.isShuttingDown = true;
    
    // 关闭所有子进程
    for (const { process, name } of this.processes) {
      console.log(`🔄 关闭 ${name}...`);
      
      process.kill('SIGTERM');
      
      // 等待进程退出
      await new Promise(resolve => {
        process.on('close', resolve);
        setTimeout(resolve, 5000); // 5秒超时
      });
    }
    
    console.log('✅ 开发环境已关闭');
  }

  /**
   * 设置退出处理
   */
  setupExitHandlers() {
    const shutdown = () => {
      this.shutdown().then(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGBREAK', shutdown);
  }
}

// 主函数
async function main() {
  const devServer = new DesktopDevServer();
  
  // 设置退出处理
  devServer.setupExitHandlers();
  
  // 启动开发环境
  await devServer.startDev();
}

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = DesktopDevServer;