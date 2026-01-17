/**
 * IPC通信管理器
 * 处理主进程和渲染进程之间的所有通信
 */

import { ipcMain, dialog, shell, app, BrowserWindow, Notification } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { windowManager } from './windowManager';
import { fileManager } from './fileManager';
import { softwareManager } from './softwareManager';
import { aiManager } from './aiManager';
import { systemManager } from './systemManager';

export interface IPCRequest {
  channel: string;
  requestId?: string;
  data?: any;
  timestamp: number;
}

export interface IPCResponse {
  success: boolean;
  data?: any;
  error?: string;
  requestId?: string;
}

export class IPCManager {
  private static instance: IPCManager;

  constructor() {
    this.setupHandlers();
  }

  public static getInstance(): IPCManager {
    if (!IPCManager.instance) {
      IPCManager.instance = new IPCManager();
    }
    return IPCManager.instance;
  }

  /**
   * 设置所有IPC处理器
   */
  private setupHandlers(): void {
    // 应用信息处理器
    this.setupAppHandlers();
    
    // 窗口管理处理器
    this.setupWindowHandlers();
    
    // 文件系统处理器
    this.setupFileSystemHandlers();
    
    // 对话框处理器
    this.setupDialogHandlers();
    
    // 系统集成处理器
    this.setupSystemHandlers();
    
    // 软件集成处理器
    this.setupSoftwareHandlers();
    
    // AI功能处理器
    this.setupAIHandlers();
    
    // 网络处理器
    this.setupNetworkHandlers();
    
    // 通知处理器
    this.setupNotificationHandlers();
  }

  /**
   * 应用信息处理器
   */
  private setupAppHandlers(): void {
    // 获取应用信息
    ipcMain.handle('app-getInfo', () => ({
      version: app.getVersion(),
      name: app.getName(),
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome
    }));

    // 获取应用路径
    ipcMain.handle('app-getPaths', () => ({
      appData: app.getPath('userData'),
      documents: app.getPath('documents'),
      downloads: app.getPath('downloads'),
      pictures: app.getPath('pictures'),
      videos: app.getPath('videos'),
      music: app.getPath('music'),
      desktop: app.getPath('desktop'),
      temp: app.getPath('temp'),
      home: app.getPath('home'),
      logs: path.join(app.getPath('userData'), 'logs'),
      config: path.join(app.getPath('userData'), 'config.json')
    }));

    // 退出应用
    ipcMain.handle('app-quit', () => {
      app.quit();
    });

    // 重启应用
    ipcMain.handle('app-restart', () => {
      app.relaunch();
      app.exit();
    });

    // 设置应用徽章
    ipcMain.handle('app-setBadge', (_, count: number) => {
      app.setBadgeCount(count);
    });

    // 获取应用版本
    ipcMain.handle('app-getVersion', () => {
      return app.getVersion();
    });
  }

  /**
   * 窗口管理处理器
   */
  private setupWindowHandlers(): void {
    // 获取所有窗口
    ipcMain.handle('window-getAll', () => {
      return windowManager.getAllWindowIds();
    });

    // 获取当前窗口
    ipcMain.handle('window-getCurrent', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      return (window as any)?.id || null;
    });

    // 创建新窗口
    ipcMain.handle('window-create', (_, config: any) => {
      const window = windowManager.createWindow(config);
      return window.id;
    });

    // 关闭窗口
    ipcMain.handle('window-close', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.close();
    });

    // 最小化窗口
    ipcMain.handle('window-minimize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.minimize();
    });

    // 最大化/还原窗口
    ipcMain.handle('window-maximize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize();
        } else {
          window.maximize();
        }
      }
    });

    // 显示/隐藏窗口
    ipcMain.handle('window-show', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.show();
    });

    ipcMain.handle('window-hide', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.hide();
    });

    // 设置窗口标题
    ipcMain.handle('window-setTitle', (event, title: string) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.setTitle(title);
    });

    // 设置窗口大小
    ipcMain.handle('window-setSize', (event, width: number, height: number) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.setSize(width, height);
    });

    // 设置窗口位置
    ipcMain.handle('window-setPosition', (event, x: number, y: number) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.setPosition(x, y);
    });

    // 设置窗口置顶
    ipcMain.handle('window-setAlwaysOnTop', (event, alwaysOnTop: boolean) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.setAlwaysOnTop(alwaysOnTop);
    });

    // 设置窗口全屏
    ipcMain.handle('window-setFullScreen', (event, fullScreen: boolean) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.setFullScreen(fullScreen);
    });

    // 获取窗口状态
    ipcMain.handle('window-getState', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        return {
          isMinimized: window.isMinimized(),
          isMaximized: window.isMaximized(),
          isFullScreen: window.isFullScreen(),
          isVisible: window.isVisible(),
          isFocused: window.isFocused(),
          bounds: window.getBounds()
        };
      }
      return null;
    });
  }

  /**
   * 文件系统处理器
   */
  private setupFileSystemHandlers(): void {
    // 读取文件
    ipcMain.handle('fs-readFile', async (_, filePath: string, encoding: string = 'utf8') => {
      try {
        const content = fs.readFileSync(filePath, { encoding: encoding as BufferEncoding });
        return { success: true, data: content };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 写入文件
    ipcMain.handle('fs-writeFile', async (_, filePath: string, content: any, encoding: string = 'utf8') => {
      try {
        // 确保目录存在
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, content, { encoding: encoding as BufferEncoding });
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 检查文件是否存在
    ipcMain.handle('fs-exists', (_, filePath: string) => {
      return fs.existsSync(filePath);
    });

    // 获取文件信息
    ipcMain.handle('fs-stat', async (_, filePath: string) => {
      try {
        const stat = fs.statSync(filePath);
        return {
          success: true,
          data: {
            isFile: stat.isFile(),
            isDirectory: stat.isDirectory(),
            size: stat.size,
            mtime: stat.mtime,
            ctime: stat.ctime
          }
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 列出目录内容
    ipcMain.handle('fs-readdir', async (_, dirPath: string) => {
      try {
        const files = fs.readdirSync(dirPath);
        const fileList = files.map(file => {
          const fullPath = path.join(dirPath, file);
          const stat = fs.statSync(fullPath);
          return {
            name: file,
            path: fullPath,
            isFile: stat.isFile(),
            isDirectory: stat.isDirectory(),
            size: stat.size,
            mtime: stat.mtime
          };
        });
        return { success: true, data: fileList };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 创建目录
    ipcMain.handle('fs-mkdir', async (_, dirPath: string, recursive: boolean = true) => {
      try {
        fs.mkdirSync(dirPath, { recursive });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 删除文件或目录
    ipcMain.handle('fs-unlink', async (_, targetPath: string, recursive: boolean = false) => {
      try {
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory() && recursive) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        } else if (stat.isDirectory()) {
          fs.rmdirSync(targetPath);
        } else {
          fs.unlinkSync(targetPath);
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 复制文件
    ipcMain.handle('fs-copy', async (_, sourcePath: string, destPath: string) => {
      try {
        fs.copyFileSync(sourcePath, destPath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 移动文件
    ipcMain.handle('fs-move', async (_, sourcePath: string, destPath: string) => {
      try {
        fs.renameSync(sourcePath, destPath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  /**
   * 对话框处理器
   */
  private setupDialogHandlers(): void {
    // 选择文件
    ipcMain.handle('dialog-selectFile', async (event, options: any) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return null;

      const result = await dialog.showOpenDialog(window, {
        properties: ['openFile'],
        ...options
      });

      return result.canceled ? null : result.filePaths[0];
    });

    // 选择多个文件
    ipcMain.handle('dialog-selectFiles', async (event, options: any) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return [];

      const result = await dialog.showOpenDialog(window, {
        properties: ['openFile', 'multiSelections'],
        ...options
      });

      return result.canceled ? [] : result.filePaths;
    });

    // 选择目录
    ipcMain.handle('dialog-selectDirectory', async (event, options: any) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return null;

      const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory'],
        ...options
      });

      return result.canceled ? null : result.filePaths[0];
    });

    // 保存文件对话框
    ipcMain.handle('dialog-saveFile', async (event, options: any) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return null;

      const result = await dialog.showSaveDialog(window, options);
      return result.canceled ? null : result.filePath;
    });

    // 消息框
    ipcMain.handle('dialog-showMessageBox', async (event, options: any) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return { response: 0 };

      const result = await dialog.showMessageBox(window, options);
      return result;
    });

    // 错误框
    ipcMain.handle('dialog-showErrorBox', async (_, title: string, content: string) => {
      dialog.showErrorBox(title, content);
      return { success: true };
    });
  }

  /**
   * 系统集成处理器
   */
  private setupSystemHandlers(): void {
    // 打开外部链接
    ipcMain.handle('system-openExternal', async (_, url: string) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 在文件夹中显示
    ipcMain.handle('system-showItemInFolder', async (_, fullPath: string) => {
      try {
        shell.showItemInFolder(fullPath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 获取系统信息
    ipcMain.handle('system-getInfo', async () => {
      return systemManager.getSystemInfo();
    });

    // 剪贴板操作
    ipcMain.handle('system-clipboard-readText', async () => {
      return systemManager.readClipboardText();
    });

    ipcMain.handle('system-clipboard-writeText', async (_, text: string) => {
      return systemManager.writeClipboardText(text);
    });

    // 屏幕信息
    ipcMain.handle('system-getDisplays', async () => {
      return systemManager.getDisplays();
    });
  }

  /**
   * 软件集成处理器
   */
  private setupSoftwareHandlers(): void {
    // 获取已安装的软件列表
    ipcMain.handle('software-detectInstalled', async () => {
      return softwareManager.getInstalledSoftware();
    });

    // 获取支持的软件列表
    ipcMain.handle('software-getSupported', async () => {
      return softwareManager.getSupportedSoftware();
    });

    // 启动软件
    ipcMain.handle('software-launch', async (_, softwareId: string, params?: any) => {
      return softwareManager.launchSoftware(softwareId, params);
    });

    // 执行软件操作
    ipcMain.handle('software-execute', async (_, softwareId: string, action: string, params?: any) => {
      return softwareManager.executeSoftwareAction(softwareId, action, params);
    });

    // 获取软件状态
    ipcMain.handle('software-getStatus', async (_, softwareId: string) => {
      return softwareManager.getSoftwareStatus(softwareId);
    });
  }

  /**
   * AI功能处理器
   */
  private setupAIHandlers(): void {
    // Whisper语音识别
    ipcMain.handle('ai-whisper-recognize', async (_, audioData: ArrayBuffer, options?: any) => {
      return aiManager.recognizeSpeech(audioData, options);
    });

    // 检查Whisper安装状态
    ipcMain.handle('ai-whisper-isInstalled', async () => {
      return aiManager.isWhisperInstalled();
    });

    // 图像处理
    ipcMain.handle('ai-image-process', async (_, imageData: ArrayBuffer, options: any) => {
      return aiManager.processImage(imageData, options);
    });

    // 图像尺寸调整
    ipcMain.handle('ai-image-resize', async (_, imageData: ArrayBuffer, width: number, height: number) => {
      return aiManager.resizeImage(imageData, width, height);
    });

    // 模型管理
    ipcMain.handle('ai-models-list', async () => {
      return aiManager.listModels();
    });

    ipcMain.handle('ai-models-download', async (_, modelId: string) => {
      return aiManager.downloadModel(modelId);
    });
  }

  /**
   * 网络处理器
   */
  private setupNetworkHandlers(): void {
    // 检查网络连接
    ipcMain.handle('network-checkConnection', async () => {
      // TODO: 实现网络连接检查
      return { online: true, latency: 50 };
    });

    // HTTP请求
    ipcMain.handle('network-request', async (_, options: any) => {
      // TODO: 实现HTTP请求代理
      return { success: false, error: 'Not implemented' };
    });
  }

  /**
   * 通知处理器
   */
  private setupNotificationHandlers(): void {
    // 显示系统通知
    ipcMain.handle('notification-show', (_, options: any) => {
      try {
        const notification = new Notification(options);
        notification.show();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 请求通知权限
    ipcMain.handle('notification-requestPermission', async () => {
      return 'granted';
    });

    // 检查通知权限
    ipcMain.handle('notification-getPermission', () => {
      return Notification.isSupported();
    });
  }

  /**
   * 发送消息到所有窗口
   */
  public broadcast(channel: string, data?: any): void {
    const windows = windowManager.getAllWindows();
    windows.forEach(window => {
      window.webContents.send(channel, data);
    });
  }

  /**
   * 发送消息到指定窗口
   */
  public sendToWindow(windowId: string, channel: string, data?: any): void {
    const window = windowManager.getWindow(windowId);
    if (window) {
      window.webContents.send(channel, data);
    }
  }
}

// 导出单例实例
export const ipcManager = IPCManager.getInstance();