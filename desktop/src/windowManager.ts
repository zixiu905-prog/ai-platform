/**
 * 窗口管理器
 * 负责创建、管理和控制所有应用窗口
 */

import { BrowserWindow, screen, Menu, nativeImage, NativeImage, Rectangle } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface WindowConfig {
  id: string;
  title: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  alwaysOnTop?: boolean;
  frame?: boolean;
  transparent?: boolean;
  skipTaskbar?: boolean;
  parent?: BrowserWindow;
  modal?: boolean;
  webPreferences?: Electron.WebPreferences;
}

export interface AppState {
  windows: Map<string, BrowserWindow>;
  activeWindow: string | null;
  windowStates: Map<string, any>;
}

export class WindowManager {
  private static instance: WindowManager;
  private appState: AppState;
  private configPath: string;

  constructor() {
    this.appState = {
      windows: new Map(),
      activeWindow: null,
      windowStates: new Map()
    };

    // 配置文件路径
    const userDataPath = (global as any).app?.getPath('userData') || './';
    this.configPath = path.join(userDataPath, 'window-states.json');
    
    this.loadWindowStates();
  }

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  /**
   * 创建新窗口
   */
  public createWindow(config: WindowConfig): BrowserWindow {
    const windowConfig: Electron.BrowserWindowConstructorOptions = {
      width: config.width,
      height: config.height,
      minWidth: config.minWidth || 400,
      minHeight: config.minHeight || 300,
      resizable: config.resizable !== false,
      alwaysOnTop: config.alwaysOnTop || false,
      frame: config.frame !== false,
      transparent: config.transparent || false,
      skipTaskbar: config.skipTaskbar || false,
      parent: config.parent,
      modal: config.modal || false,
      show: false, // 初始不显示，等待ready-to-show事件
      title: config.title,
      icon: this.getAppIcon(),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
        webSecurity: process.env.NODE_ENV !== 'development',
        additionalArguments: [
          `--window-id=${config.id}`,
          `--window-title=${config.title}`
        ],
        ...config.webPreferences
      }
    };

    const window = new BrowserWindow(windowConfig);

    // 恢复窗口状态
    this.restoreWindowState(config.id, window);

    // 设置窗口ID属性
    (window as any).id = config.id;

    // 加载页面内容
    this.loadWindowContent(window);

    // 设置窗口事件监听
    this.setupWindowEvents(window, config.id);

    // 存储窗口引用
    this.appState.windows.set(config.id, window);
    this.appState.activeWindow = config.id;

    return window;
  }

  /**
   * 创建主窗口
   */
  public createMainWindow(): BrowserWindow {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    const config: WindowConfig = {
      id: 'main',
      title: 'AiDesign - AI设计平台',
      width: Math.min(1400, screenWidth - 100),
      height: Math.min(900, screenHeight - 100),
      minWidth: 1200,
      minHeight: 700
    };

    return this.createWindow(config);
  }

  /**
   * 创建模态对话框
   */
  public createDialog(parent: BrowserWindow, config: {
    id: string;
    title: string;
    width: number;
    height: number;
    url?: string;
  }): BrowserWindow {
    return this.createWindow({
      id: config.id,
      title: config.title,
      width: config.width,
      height: config.height,
      parent,
      modal: true,
      resizable: false,
      frame: true
    });
  }

  /**
   * 创建浮动面板
   */
  public createFloatingPanel(config: {
    id: string;
    title: string;
    width: number;
    height: number;
    x?: number;
    y?: number;
  }): BrowserWindow {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    return this.createWindow({
      id: config.id,
      title: config.title,
      width: config.width,
      height: config.height,
      x: config.x || screenWidth - config.width - 20,
      y: config.y || 100,
      alwaysOnTop: true,
      frame: false,
      resizable: true,
      skipTaskbar: true,
      transparent: false
    });
  }

  /**
   * 获取窗口
   */
  public getWindow(id: string): BrowserWindow | undefined {
    return this.appState.windows.get(id);
  }

  /**
   * 获取当前活动窗口
   */
  public getActiveWindow(): BrowserWindow | undefined {
    if (this.appState.activeWindow) {
      return this.appState.windows.get(this.appState.activeWindow);
    }
    return BrowserWindow.getFocusedWindow() || undefined;
  }

  /**
   * 关闭窗口
   */
  public closeWindow(id: string): void {
    const window = this.appState.windows.get(id);
    if (window) {
      // 保存窗口状态
      this.saveWindowState(id, window);
      
      // 关闭窗口
      window.close();
      
      // 从状态中移除
      this.appState.windows.delete(id);
      
      // 更新活动窗口
      if (this.appState.activeWindow === id) {
        this.appState.activeWindow = null;
        // 找到下一个可用窗口
        for (const [windowId] of this.appState.windows) {
          this.appState.activeWindow = windowId;
          break;
        }
      }
    }
  }

  /**
   * 关闭所有窗口
   */
  public closeAllWindows(): void {
    for (const [id, window] of this.appState.windows) {
      this.saveWindowState(id, window);
      window.close();
    }
    this.appState.windows.clear();
    this.appState.activeWindow = null;
  }

  /**
   * 显示窗口
   */
  public showWindow(id: string): void {
    const window = this.appState.windows.get(id);
    if (window) {
      window.show();
      window.focus();
      this.appState.activeWindow = id;
    }
  }

  /**
   * 隐藏窗口
   */
  public hideWindow(id: string): void {
    const window = this.appState.windows.get(id);
    if (window) {
      window.hide();
    }
  }

  /**
   * 最小化窗口
   */
  public minimizeWindow(id: string): void {
    const window = this.appState.windows.get(id);
    if (window) {
      window.minimize();
    }
  }

  /**
   * 最大化/还原窗口
   */
  public maximizeWindow(id: string): void {
    const window = this.appState.windows.get(id);
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  }

  /**
   * 置顶窗口
   */
  public setAlwaysOnTop(id: string, alwaysOnTop: boolean): void {
    const window = this.appState.windows.get(id);
    if (window) {
      window.setAlwaysOnTop(alwaysOnTop);
    }
  }

  /**
   * 设置窗口全屏
   */
  public setFullScreen(id: string, fullScreen: boolean): void {
    const window = this.appState.windows.get(id);
    if (window) {
      window.setFullScreen(fullScreen);
    }
  }

  /**
   * 获取所有窗口ID
   */
  public getAllWindowIds(): string[] {
    return Array.from(this.appState.windows.keys());
  }

  /**
   * 获取窗口列表
   */
  public getAllWindows(): BrowserWindow[] {
    return Array.from(this.appState.windows.values());
  }

  /**
   * 加载窗口内容
   */
  private loadWindowContent(window: BrowserWindow): void {
    const url = (window.webContents as any).url;
    if (url) {
      if (url.startsWith('http')) {
        window.loadURL(url);
      } else {
        window.loadFile(url);
      }
    }
  }

  /**
   * 设置窗口事件监听
   */
  private setupWindowEvents(window: BrowserWindow, windowId: string): void {
    // 窗口准备显示
    window.once('ready-to-show', () => {
      window.show();
      window.focus();
    });

    // 窗口关闭
    window.on('closed', () => {
      this.appState.windows.delete(windowId);
      if (this.appState.activeWindow === windowId) {
        this.appState.activeWindow = null;
      }
    });

    // 窗口获得焦点
    window.on('focus', () => {
      this.appState.activeWindow = windowId;
    });

    // 窗口移动和大小改变
    window.on('moved', () => {
      this.saveWindowState(windowId, window);
    });

    window.on('resized', () => {
      this.saveWindowState(windowId, window);
    });

    // 窗口状态改变
    window.on('maximize', () => {
      this.saveWindowState(windowId, window);
    });

    window.on('unmaximize', () => {
      this.saveWindowState(windowId, window);
    });

    window.on('enter-full-screen', () => {
      this.saveWindowState(windowId, window);
    });

    window.on('leave-full-screen', () => {
      this.saveWindowState(windowId, window);
    });
  }

  /**
   * 保存窗口状态
   */
  private saveWindowState(windowId: string, window: BrowserWindow): void {
    const bounds = window.getBounds();
    const state = {
      bounds,
      isMaximized: window.isMaximized(),
      isFullScreen: window.isFullScreen(),
      isVisible: window.isVisible()
    };

    this.appState.windowStates.set(windowId, state);
    this.saveWindowStates();
  }

  /**
   * 恢复窗口状态
   */
  private restoreWindowState(windowId: string, window: BrowserWindow): void {
    const savedState = this.appState.windowStates.get(windowId);
    if (savedState) {
      const { bounds, isMaximized, isFullScreen } = savedState;

      // 确保窗口在屏幕范围内
      const validBounds = this.ensureBoundsInScreen(bounds);
      
      window.setBounds(validBounds);
      
      if (isFullScreen) {
        window.setFullScreen(true);
      } else if (isMaximized) {
        window.maximize();
      }
    }
  }

  /**
   * 确保窗口边界在屏幕范围内
   */
  private ensureBoundsInScreen(bounds: Rectangle): Rectangle {
    const displays = screen.getAllDisplays();
    let isValid = false;

    for (const display of displays) {
      const { x, y, width, height } = bounds;
      const { x: dx, y: dy, width: dw, height: dh } = display.workArea;

      if (x >= dx && y >= dy && 
          x + width <= dx + dw && 
          y + height <= dy + dh) {
        isValid = true;
        break;
      }
    }

    if (!isValid) {
      // 如果窗口超出屏幕范围，使用主显示器
      const primaryDisplay = screen.getPrimaryDisplay();
      const { workArea } = primaryDisplay;
      
      return {
        x: workArea.x + 50,
        y: workArea.y + 50,
        width: Math.min(bounds.width, workArea.width - 100),
        height: Math.min(bounds.height, workArea.height - 100)
      };
    }

    return bounds;
  }

  /**
   * 获取应用图标
   */
  private getAppIcon(): string | NativeImage | undefined {
    const iconPath = path.join(__dirname, '../assets/icon.png');
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
    return undefined;
  }

  /**
   * 保存窗口状态到文件
   */
  private saveWindowStates(): void {
    try {
      const states = {};
      for (const [id, state] of this.appState.windowStates) {
        (states as any)[id] = state;
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(states, null, 2));
    } catch (error) {
      console.error('保存窗口状态失败:', error);
    }
  }

  /**
   * 从文件加载窗口状态
   */
  private loadWindowStates(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const states = JSON.parse(data);
        
        for (const [id, state] of Object.entries(states)) {
          this.appState.windowStates.set(id, state);
        }
      }
    } catch (error) {
      console.error('加载窗口状态失败:', error);
    }
  }
}

// 导出单例实例
export const windowManager = WindowManager.getInstance();