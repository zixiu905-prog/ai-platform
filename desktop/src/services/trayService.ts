import { app, Tray, Menu, BrowserWindow, nativeImage, NativeImage } from 'electron';
import path from 'path';
import { EventEmitter } from 'events';
import { notificationManager } from './notificationManager';

export interface TrayOptions {
  showNotification?: boolean;
  startMinimized?: boolean;
  autoStart?: boolean;
  shortcuts?: TrayShortcut[];
}

export interface TrayShortcut {
  id: string;
  label: string;
  accelerator: string;
  action: () => void;
  icon?: string;
  enabled?: boolean;
}

export interface TrayStatus {
  type: 'idle' | 'working' | 'success' | 'error' | 'warning';
  message: string;
  progress?: number;
  timestamp: number;
}

export interface TrayNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  actions?: Array<{
    id: string;
    text: string;
    action: () => void;
  }>;
  timeout?: number;
}

export class TrayService extends EventEmitter {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private status: TrayStatus = {
    type: 'idle',
    message: 'AiDesign',
    timestamp: Date.now()
  };
  private shortcuts: Map<string, TrayShortcut> = new Map();
  private notifications: TrayNotification[] = [];
  private isQuitting = false;
  private contextMenu: Menu | null = null;

  constructor() {
    super();
    this.setupAppEventHandlers();
  }

  /**
   * 初始化系统托盘
   */
  async initialize(options: TrayOptions = {}): Promise<void> {
    try {
      // 创建托盘图标
      await this.createTrayIcon();
      
      // 设置快捷方式
      if (options.shortcuts) {
        options.shortcuts.forEach(shortcut => {
          this.addShortcut(shortcut);
        });
      }
      
      // 创建上下文菜单
      this.createContextMenu();
      
      console.log('系统托盘初始化完成');
      this.emit('initialized');
    } catch (error) {
      console.error('系统托盘初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建托盘图标
   */
  private async createTrayIcon(): Promise<void> {
    const iconPath = this.getStatusIconPath(this.status.type);
    const icon = nativeImage.createFromPath(iconPath);
    
    // 调整图标大小
    icon.setTemplateImage(true);
    
    this.tray = new Tray(icon);
    this.tray.setToolTip(this.getTooltipText());
    
    // 设置托盘点击事件
    this.tray.on('click', () => {
      this.handleTrayClick();
    });
    
    this.tray.on('right-click', () => {
      this.handleTrayRightClick();
    });
  }

  /**
   * 获取状态图标路径
   */
  private getStatusIconPath(status: string): string {
    const iconDir = path.join(__dirname, '../../assets/icons/tray');
    
    switch (status) {
      case 'working':
        return path.join(iconDir, 'tray-working.png');
      case 'success':
        return path.join(iconDir, 'tray-success.png');
      case 'error':
        return path.join(iconDir, 'tray-error.png');
      case 'warning':
        return path.join(iconDir, 'tray-warning.png');
      default:
        return path.join(iconDir, 'tray-idle.png');
    }
  }

  /**
   * 获取提示文本
   */
  private getTooltipText(): string {
    const { type, message, progress } = this.status;
    let tooltip = message;
    
    if (progress !== undefined) {
      tooltip += ` (${Math.round(progress)}%)`;
    }
    
    return tooltip;
  }

  /**
   * 处理托盘点击
   */
  private handleTrayClick(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    }
  }

  /**
   * 处理托盘右键点击
   */
  private handleTrayRightClick(): void {
    if (this.contextMenu) {
      this.tray?.popUpContextMenu(this.contextMenu);
    }
  }

  /**
   * 创建上下文菜单
   */
  private createContextMenu(): void {
    const menuTemplate = [
      {
        label: '显示主窗口',
        accelerator: 'CmdOrCtrl+Shift+T',
        click: () => {
          this.mainWindow?.show();
          this.mainWindow?.focus();
        }
      },
      { type: 'separator' },
      {
        label: '快速操作',
        submenu: this.getQuickActionsSubmenu()
      },
      { type: 'separator' },
      {
        label: '状态',
        submenu: this.getStatusSubmenu()
      },
      { type: 'separator' },
      {
        label: '通知设置',
        submenu: this.getNotificationSubmenu()
      },
      { type: 'separator' },
      {
        label: '关于',
        click: () => {
          this.showAboutDialog();
        }
      },
      {
        label: '设置',
        click: () => {
          this.showSettingsDialog();
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          this.quit();
        }
      }
    ];

    this.contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray?.setContextMenu(this.contextMenu);
  }

  /**
   * 获取快速操作子菜单
   */
  private getQuickActionsSubmenu(): any[] {
    const actions = [];
    
    for (const [id, shortcut] of this.shortcuts) {
      if (shortcut.enabled !== false) {
        actions.push({
          label: shortcut.label,
          accelerator: shortcut.accelerator,
          click: shortcut.action
        });
      }
    }
    
    if (actions.length === 0) {
      actions.push({
        label: '无快捷操作',
        enabled: false
      });
    }
    
    return actions;
  }

  /**
   * 获取状态子菜单
   */
  private getStatusSubmenu(): any[] {
    return [
      {
        label: '当前状态',
        submenu: [
          {
            label: '状态类型',
            submenu: [
              {
                label: '空闲',
                type: 'radio',
                checked: this.status.type === 'idle',
                click: () => this.setStatus({ type: 'idle', message: '空闲' })
              },
              {
                label: '工作中',
                type: 'radio',
                checked: this.status.type === 'working',
                click: () => this.setStatus({ type: 'working', message: '正在工作' })
              },
              {
                label: '成功',
                type: 'radio',
                checked: this.status.type === 'success',
                click: () => this.setStatus({ type: 'success', message: '操作成功' })
              },
              {
                label: '错误',
                type: 'radio',
                checked: this.status.type === 'error',
                click: () => this.setStatus({ type: 'error', message: '发生错误' })
              },
              {
                label: '警告',
                type: 'radio',
                checked: this.status.type === 'warning',
                click: () => this.setStatus({ type: 'warning', message: '警告信息' })
              }
            ]
          }
        ]
      },
      {
        label: '清除状态',
        click: () => this.setStatus({ type: 'idle', message: 'AiDesign' })
      }
    ];
  }

  /**
   * 获取通知设置子菜单
   */
  private getNotificationSubmenu(): any[] {
    return [
      {
        label: '启用通知',
        type: 'checkbox',
        checked: true,
        click: (item: any) => {
          this.setNotificationEnabled(item.checked);
        }
      },
      {
        label: '显示进度通知',
        type: 'checkbox',
        checked: true,
        click: (item: any) => {
          this.setProgressNotificationsEnabled(item.checked);
        }
      },
      {
        label: '清空通知历史',
        click: () => {
          this.clearNotifications();
        }
      }
    ];
  }

  /**
   * 设置主窗口
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    
    window.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        window.hide();
      }
    });
  }

  /**
   * 添加快捷方式
   */
  addShortcut(shortcut: TrayShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
    this.refreshContextMenu();
  }

  /**
   * 移除快捷方式
   */
  removeShortcut(id: string): void {
    this.shortcuts.delete(id);
    this.refreshContextMenu();
  }

  /**
   * 设置状态
   */
  setStatus(status: Partial<TrayStatus>): void {
    this.status = {
      ...this.status,
      ...status,
      timestamp: Date.now()
    };

    // 更新托盘图标
    if (this.tray) {
      const iconPath = this.getStatusIconPath(this.status.type);
      const icon = nativeImage.createFromPath(iconPath);
      icon.setTemplateImage(true);
      this.tray.setImage(icon);
      this.tray.setToolTip(this.getTooltipText());
    }

    // 发出状态变更事件
    this.emit('status-changed', this.status);
  }

  /**
   * 显示通知
   */
  showNotification(notification: TrayNotification): void {
    // 添加到通知历史
    this.notifications.push(notification);
    
    // 使用系统通知服务
    notificationManager.showNotification(
      notification.title,
      notification.body,
      {
        icon: notification.icon,
        actions: notification.actions?.map(action => action.text),
        timeout: notification.timeout
      }
    );

    // 发出通知事件
    this.emit('notification', notification);
  }

  /**
   * 设置进度
   */
  setProgress(progress: number): void {
    this.setStatus({
      ...this.status,
      progress: Math.max(0, Math.min(100, progress))
    });

    // 更新应用进度条
    if (this.mainWindow) {
      this.mainWindow.setProgressBar(progress >= 0 && progress <= 100 ? progress / 100 : -1);
    }

    // 发出进度变更事件
    this.emit('progress-changed', progress);
  }

  /**
   * 刷新上下文菜单
   */
  private refreshContextMenu(): void {
    this.createContextMenu();
  }

  /**
   * 设置通知启用状态
   */
  private setNotificationEnabled(enabled: boolean): void {
    // 这里应该保存到配置文件
    console.log('通知已', enabled ? '启用' : '禁用');
  }

  /**
   * 设置进度通知启用状态
   */
  private setProgressNotificationsEnabled(enabled: boolean): void {
    // 这里应该保存到配置文件
    console.log('进度通知已', enabled ? '启用' : '禁用');
  }

  /**
   * 清空通知历史
   */
  private clearNotifications(): void {
    this.notifications = [];
    this.emit('notifications-cleared');
  }

  /**
   * 显示关于对话框
   */
  private showAboutDialog(): void {
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
      // 发送显示关于页面的事件到渲染进程
      this.mainWindow.webContents.send('show-about');
    }
  }

  /**
   * 显示设置对话框
   */
  private showSettingsDialog(): void {
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
      // 发送显示设置页面的事件到渲染进程
      this.mainWindow.webContents.send('show-settings');
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): TrayStatus {
    return { ...this.status };
  }

  /**
   * 获取通知历史
   */
  getNotifications(): TrayNotification[] {
    return [...this.notifications];
  }

  /**
   * 获取快捷方式列表
   */
  getShortcuts(): TrayShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * 设置应用事件处理器
   */
  private setupAppEventHandlers(): void {
    app.on('before-quit', () => {
      this.isQuitting = true;
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.quit();
      }
    });

    // macOS 特殊处理
    if (process.platform === 'darwin') {
      app.on('activate', () => {
        if (this.mainWindow) {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      });
    }
  }

  /**
   * 退出应用
   */
  private quit(): void {
    this.isQuitting = true;
    
    if (process.platform === 'darwin') {
      // macOS 上需要手动关闭窗口
      if (this.mainWindow) {
        this.mainWindow.close();
      }
    }
    
    app.quit();
  }

  /**
   * 销毁托盘
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    
    this.removeAllListeners();
  }
}

export const trayService = new TrayService();