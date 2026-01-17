/**
 * Electron主进程
 * 负责应用程序生命周期管理、窗口创建、系统集成
 */

import { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeImage, NativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// 导入管理器
import { windowManager } from './src/windowManager';
import { ipcManager } from './src/ipcManager';
import { fileManager } from './src/fileManager';
import { softwareManager } from './src/softwareManager';
import { aiManager } from './src/aiManager';
import { systemManager } from './src/systemManager';

// 应用配置
const isDev = process.env.NODE_ENV === 'development';
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

class AiDesignDesktop {
  private mainWindow: BrowserWindow | null = null;
  private appDataPath: string;
  private logPath: string;
  private configPath: string;

  constructor() {
    this.appDataPath = app.getPath('userData');
    this.logPath = path.join(this.appDataPath, 'logs');
    this.configPath = path.join(this.appDataPath, 'config.json');
    
    // 设置全局应用引用
    (global as any).app = app;
    
    this.ensureDirectories();
  }

  /**
   * 确保必要的目录存在
   */
  private ensureDirectories(): void {
    const dirs = [this.logPath, path.join(this.appDataPath, 'temp'), path.join(this.appDataPath, 'cache')];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 创建主窗口
   */
  private createMainWindow(): void {
    // 使用窗口管理器创建主窗口
    this.mainWindow = windowManager.createMainWindow();

    // 设置菜单
    this.setupMenu();

    // 应用事件处理
    this.setupAppEvents();
  }

  /**
   * 获取应用图标
   */
  private getAppIcon(): string {
    if (isWindows) {
      return path.join(__dirname, 'assets/icon.ico');
    } else {
      return path.join(__dirname, 'assets/icon.png');
    }
  }

  /**
   * 设置应用菜单
   */
  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [];

    // macOS 应用菜单
    if (isMac) {
      template.push({
        label: app.getName(),
        submenu: [
          { role: 'about', label: '关于 AiDesign' },
          { type: 'separator' },
          { role: 'services', label: '服务' },
          { type: 'separator' },
          { role: 'hide', label: '隐藏 AiDesign' },
          { role: 'hideOthers', label: '隐藏其他' },
          { role: 'unhide', label: '显示全部' },
          { type: 'separator' },
          { role: 'quit', label: '退出 AiDesign' }
        ]
      });
    }

    // 文件菜单
    template.push({
      label: '文件',
      submenu: [
        {
          label: '新建项目',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            this.mainWindow?.webContents.send('menu-new-project');
          }
        },
        {
          label: '打开项目',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            this.showOpenProjectDialog();
          }
        },
        {
          label: '保存项目',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            this.mainWindow?.webContents.send('menu-save-project');
          }
        },
        {
          label: '另存为',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            this.mainWindow?.webContents.send('menu-save-project-as');
          }
        },
        { type: 'separator' },
        {
          label: '导入文件',
          click: () => {
            this.showImportDialog();
          }
        },
        {
          label: '导出项目',
          click: () => {
            this.mainWindow?.webContents.send('menu-export-project');
          }
        },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit' as const, label: '退出' }])
      ]
    });

    // 编辑菜单
    template.push({
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    });

    // 视图菜单
    template.push({
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    });

    // 窗口菜单
    template.push({
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭' },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const, label: '置于最前' },
          { role: 'window' as const, label: '窗口' }
        ] : [])
      ]
    });

    // 帮助菜单
    template.push({
      label: '帮助',
      submenu: [
        {
          label: '用户手册',
          click: () => {
            shell.openExternal('https://docs.aidesign.ai');
          }
        },
        {
          label: '快捷键',
          click: () => {
            this.mainWindow?.webContents.send('menu-show-shortcuts');
          }
        },
        { type: 'separator' },
        {
          label: '检查更新',
          click: () => {
            this.checkForUpdates();
          }
        },
        {
          label: '反馈问题',
          click: () => {
            shell.openExternal('https://github.com/aidesign/issues');
          }
        },
        { type: 'separator' },
        { role: 'about', label: '关于' }
      ]
    });

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  /**
   * 显示打开项目对话框
   */
  private async showOpenProjectDialog(): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showOpenDialog(this.mainWindow, {
      title: '打开项目',
      filters: [
        { name: 'AI设计项目', extensions: ['aiproject'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.mainWindow.webContents.send('project-opened', result.filePaths[0]);
    }
  }

  /**
   * 显示导入对话框
   */
  private async showImportDialog(): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showOpenDialog(this.mainWindow, {
      title: '导入文件',
      filters: [
        { name: '支持的文件', extensions: ['png', 'jpg', 'jpeg', 'svg', 'psd', 'sketch'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.mainWindow.webContents.send('files-imported', result.filePaths);
    }
  }

  /**
   * 检查更新
   */
  private async checkForUpdates(): Promise<void> {
    // TODO: 实现自动更新功能
    this.mainWindow?.webContents.send('update-check', {
      version: app.getVersion(),
      hasUpdate: false,
      message: '当前已是最新版本'
    });
  }

  /**
   * 设置应用事件
   */
  private setupAppEvents(): void {
    // 窗口关闭事件
    this.mainWindow?.on('closed', () => {
      this.mainWindow = null;
    });

    // 处理外部链接
    this.mainWindow?.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // 应用窗口激活
    app.on('activate', () => {
      if (!this.mainWindow) {
        this.createMainWindow();
      } else {
        this.mainWindow.show();
      }
    });
  }

  /**
   * 初始化应用
   */
  public async initialize(): Promise<void> {
    // 设置用户代理
    app.userAgentFallback = `${app.getName()}/${app.getVersion()} (${process.platform})`;

    // 单实例锁定
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });

    // 应用事件
    app.whenReady().then(() => {
      this.createMainWindow();
      
      // IPC管理器会自动设置所有处理器
      // ipcManager已在单例初始化时设置好了
    });

    app.on('window-all-closed', () => {
      if (!isMac) {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (!this.mainWindow) {
        this.createMainWindow();
      }
    });

    // 安全设置
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: 'deny' };
      });
    });

    // 清理临时文件和应用退出处理
    app.on('before-quit', async () => {
      try {
        await fileManager.cleanupTempFiles();
        windowManager.closeAllWindows();
      } catch (error) {
        console.error('应用退出清理失败:', error);
      }
    });
  }
}

// 创建应用实例
const aiDesignDesktop = new AiDesignDesktop();

// 启动应用
aiDesignDesktop.initialize().catch(console.error);

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});