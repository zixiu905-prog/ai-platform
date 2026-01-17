import { BrowserWindow, Menu, MenuItem, shell, dialog, app } from 'electron';
import { join } from 'path';
import { ConfigService } from '../services/configService';

export interface WindowOptions {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  frame?: boolean;
  alwaysOnTop?: boolean;
}

export class WindowManager {
  private static instance: WindowManager;
  private windows: Map<string, BrowserWindow> = new Map();
  private configService: ConfigService;
  
  private constructor() {
    this.configService = ConfigService.getInstance();
  }
  
  static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }
  
  /**
   * 创建主窗口
   */
  createMainWindow(options?: WindowOptions): BrowserWindow {
    const config = this.configService.get('window');
    
    const mainWindow = new BrowserWindow({
      width: options?.width || config.width,
      height: options?.height || config.height,
      minWidth: options?.minWidth || 800,
      minHeight: options?.minHeight || 600,
      resizable: options?.resizable !== false,
      frame: options?.frame !== false,
      alwaysOnTop: options?.alwaysOnTop || config.alwaysOnTop,
      show: false,
      autoHideMenuBar: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload.js'),
        webSecurity: process.env.NODE_ENV !== 'development',
        additionalArguments: [
          `--window-type=main`,
          `--app-version=${app.getVersion()}`
        ]
      },
      backgroundColor: '#0a0e1a',
      icon: this.getAppIcon()
    });
    
    // 恢复窗口位置
    if (config.x && config.y) {
      mainWindow.setPosition(config.x, config.y);
    }
    
    // 如果之前是最大化状态，恢复最大化
    if (config.maximized) {
      mainWindow.maximize();
    }
    
    this.setupMainWindow(mainWindow);
    this.windows.set('main', mainWindow);
    
    return mainWindow;
  }
  
  /**
   * 创建项目窗口
   */
  createProjectWindow(projectPath: string, options?: WindowOptions): BrowserWindow {
    const projectWindow = new BrowserWindow({
      width: options?.width || 1200,
      height: options?.height || 800,
      minWidth: options?.minWidth || 600,
      minHeight: options?.minHeight || 400,
      parent: this.windows.get('main'),
      resizable: options?.resizable !== false,
      frame: options?.frame !== false,
      alwaysOnTop: options?.alwaysOnTop || false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload.js'),
        additionalArguments: [
          `--window-type=project`,
          `--project-path=${projectPath}`
        ]
      },
      backgroundColor: '#0a0e1a',
      title: `项目 - ${projectPath.split(/[/\\]/).pop() || 'Unknown'}`
    });
    
    this.setupProjectWindow(projectWindow, projectPath);
    this.windows.set(`project-${projectPath}`, projectWindow);
    
    return projectWindow;
  }
  
  /**
   * 创建设置窗口
   */
  createSettingsWindow(): BrowserWindow {
    if (this.windows.has('settings')) {
      const existingWindow = this.windows.get('settings')!;
      existingWindow.focus();
      return existingWindow;
    }
    
    const settingsWindow = new BrowserWindow({
      width: 800,
      height: 600,
      minWidth: 600,
      minHeight: 400,
      resizable: false,
      parent: this.windows.get('main'),
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload.js'),
        additionalArguments: [
          `--window-type=settings`
        ]
      },
      backgroundColor: '#0a0e1a',
      title: '设置'
    });
    
    this.setupSettingsWindow(settingsWindow);
    this.windows.set('settings', settingsWindow);
    
    return settingsWindow;
  }
  
  /**
   * 创建AI聊天窗口
   */
  createAIChatWindow(): BrowserWindow {
    if (this.windows.has('ai-chat')) {
      const existingWindow = this.windows.get('ai-chat')!;
      existingWindow.focus();
      return existingWindow;
    }
    
    const chatWindow = new BrowserWindow({
      width: 400,
      height: 600,
      minWidth: 300,
      minHeight: 400,
      resizable: true,
      alwaysOnTop: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload.js'),
        additionalArguments: [
          `--window-type=ai-chat`
        ]
      },
      backgroundColor: '#0a0e1a',
      title: 'AI助手'
    });
    
    this.setupAIChatWindow(chatWindow);
    this.windows.set('ai-chat', chatWindow);
    
    return chatWindow;
  }
  
  /**
   * 获取窗口
   */
  getWindow(id: string): BrowserWindow | undefined {
    return this.windows.get(id);
  }
  
  /**
   * 获取主窗口
   */
  getMainWindow(): BrowserWindow | undefined {
    return this.windows.get('main');
  }
  
  /**
   * 关闭窗口
   */
  closeWindow(id: string): void {
    const window = this.windows.get(id);
    if (window && !window.isDestroyed()) {
      window.close();
    }
  }
  
  /**
   * 关闭所有窗口
   */
  closeAllWindows(): void {
    for (const [id, window] of this.windows) {
      if (id !== 'main' && !window.isDestroyed()) {
        window.close();
      }
    }
  }
  
  /**
   * 获取所有窗口
   */
  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values()).filter(window => !window.isDestroyed());
  }
  
  private setupMainWindow(window: BrowserWindow): void {
    // 加载内容
    this.loadWindowContent(window, 'main');
    
    // 事件监听
    window.once('ready-to-show', () => {
      window.show();
    });
    
    window.on('closed', () => {
      this.windows.delete('main');
    });
    
    // 窗口状态保存
    this.setupWindowPersistence(window, 'main');
  }
  
  private setupProjectWindow(window: BrowserWindow, projectPath: string): void {
    this.loadWindowContent(window, 'project');
    
    window.once('ready-to-show', () => {
      window.show();
    });
    
    window.on('closed', () => {
      this.windows.delete(`project-${projectPath}`);
    });
  }
  
  private setupSettingsWindow(window: BrowserWindow): void {
    this.loadWindowContent(window, 'settings');
    
    window.once('ready-to-show', () => {
      window.show();
    });
    
    window.on('closed', () => {
      this.windows.delete('settings');
    });
  }
  
  private setupAIChatWindow(window: BrowserWindow): void {
    this.loadWindowContent(window, 'ai-chat');
    
    window.once('ready-to-show', () => {
      window.show();
    });
    
    window.on('closed', () => {
      this.windows.delete('ai-chat');
    });
    
    // 保持窗口在右下角
    window.on('show', () => {
      const { width, height } = window.getBounds();
      const { width: screenWidth, height: screenHeight } = require('electron').screen.getPrimaryDisplay().workAreaSize;
      
      window.setPosition(
        screenWidth - width - 20,
        screenHeight - height - 20
      );
    });
  }
  
  private loadWindowContent(window: BrowserWindow, windowType: string): void {
    const isDev = process.env.NODE_ENV === 'development';
    let url: string;
    
    if (isDev) {
      url = 'http://localhost:5173';
    } else {
      url = `file://${join(__dirname, '../renderer/index.html')}`;
    }
    
    // 根据窗口类型添加查询参数
    const params = new URLSearchParams();
    params.append('windowType', windowType);
    
    window.loadURL(`${url}?${params.toString()}`);
  }
  
  private setupWindowPersistence(window: BrowserWindow, windowType: string): void {
    // 只对主窗口保存状态
    if (windowType !== 'main') return;
    
    const saveWindowState = () => {
      if (window.isDestroyed()) return;

      const bounds = window.getBounds();
      const config = {
        ...bounds,
        maximized: window.isMaximized(),
        alwaysOnTop: window.isAlwaysOnTop()
      };

      this.configService.set('window', config);
    };
    
    window.on('resize', saveWindowState);
    window.on('move', saveWindowState);
    window.on('maximize', () => {
      this.configService.update('window', { maximized: true });
    });
    window.on('unmaximize', () => {
      this.configService.update('window', { maximized: false });
    });
  }
  
  private getAppIcon(): string {
    // TODO: 添加应用图标路径
    if (process.platform === 'win32') {
      return join(__dirname, '../../assets/icon.ico');
    } else if (process.platform === 'darwin') {
      return join(__dirname, '../../assets/icon.icns');
    } else {
      return join(__dirname, '../../assets/icon.png');
    }
  }
}