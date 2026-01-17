import { Tray, Menu, MenuItem, app, nativeImage, BrowserWindow } from 'electron';
import path from 'path';
import { EventEmitter } from 'events';

export interface TrayMenuItem {
  id?: string;
  label?: string;
  type: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  enabled?: boolean;
  checked?: boolean;
  accelerator?: string;
  click?: () => void;
  submenu?: TrayMenuItem[];
}

export interface TrayNotification {
  title: string;
  body: string;
  icon?: string;
  actions?: Array<{
    type: string;
    text: string;
  }>;
}

export class TrayService extends EventEmitter {
  private tray: Tray | null = null;
  private contextMenu: Menu | null = null;
  private isQuitting: boolean = false;
  private notifications: Map<string, any> = new Map();
  private iconPath: string;
  private appPath: string;

  constructor() {
    super();
    this.iconPath = this.getIconPath();
    this.appPath = app.getAppPath();
    
    // 设置应用退出标志
    app.on('before-quit', () => {
      this.isQuitting = true;
    });
    
    // 处理应用图标点击
    app.on('activate', () => {
      this.showMainWindow();
    });
  }

  /**
   * 初始化系统托盘
   */
  public initialize(): void {
    try {
      // 创建托盘图标
      this.createTray();
      
      // 创建右键菜单
      this.createContextMenu();
      
      // 设置工具提示
      this.tray?.setToolTip('AI设计平台');
      
      console.log('系统托盘初始化成功');
    } catch (error) {
      console.error('系统托盘初始化失败:', error);
    }
  }

  /**
   * 获取图标路径
   */
  private getIconPath(): string {
    const isDev = process.env.NODE_ENV === 'development';
    const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    
    if (isDev) {
      return path.join(__dirname, '..', 'assets', iconName);
    } else {
      return path.join(process.resourcesPath, 'assets', iconName);
    }
  }

  /**
   * 创建托盘图标
   */
  private createTray(): void {
    try {
      let icon;
      
      // 根据平台创建图标
      if (process.platform === 'win32') {
        // Windows支持不同尺寸的图标
        const iconBuffer = nativeImage.createFromPath(this.iconPath);
        icon = new Tray(iconBuffer);
      } else {
        // macOS和Linux
        icon = new Tray(this.iconPath);
      }
      
      this.tray = icon;
      
      // 绑定点击事件
      this.tray.on('click', () => {
        this.showMainWindow();
      });
      
      // 绑定右键事件
      this.tray.on('right-click', () => {
        this.contextMenu?.popup();
      });
      
    } catch (error) {
      console.error('创建托盘图标失败:', error);
      throw error;
    }
  }

  /**
   * 创建右键菜单
   */
  private createContextMenu(): void {
    const menuItems: TrayMenuItem[] = [
      {
        id: 'show',
        label: '显示主窗口',
        type: 'normal',
        accelerator: 'CmdOrCtrl+Shift+O',
        click: () => this.showMainWindow()
      },
      { type: 'separator' },
      {
        id: 'ai-assistant',
        label: 'AI助手',
        type: 'normal',
        accelerator: 'CmdOrCtrl+Shift+A',
        click: () => this.emit('open-ai-assistant')
      },
      {
        id: 'software-connect',
        label: '软件连接',
        type: 'normal',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => this.emit('open-software-connect')
      },
      {
        id: 'workflows',
        label: '工作流',
        type: 'normal',
        accelerator: 'CmdOrCtrl+Shift+W',
        click: () => this.emit('open-workflows')
      },
      { type: 'separator' },
      {
        id: 'status',
        label: '状态',
        type: 'submenu',
        submenu: [
          {
            id: 'connection-status',
            label: '连接状态: 检查中...',
            type: 'normal',
            enabled: false
          },
          {
            id: 'software-status',
            label: '软件状态: 检查中...',
            type: 'normal',
            enabled: false
          },
          {
            id: 'subscription-status',
            label: '订阅状态: 检查中...',
            type: 'normal',
            enabled: false
          }
        ]
      },
      { type: 'separator' },
      {
        id: 'settings',
        label: '设置',
        type: 'normal',
        accelerator: 'CmdOrCtrl+,',
        click: () => this.emit('open-settings')
      },
      {
        id: 'help',
        label: '帮助',
        type: 'submenu',
        submenu: [
          {
            id: 'user-manual',
            label: '用户手册',
            type: 'normal',
            click: () => this.emit('open-user-manual')
          },
          {
            id: 'support',
            label: '技术支持',
            type: 'normal',
            click: () => this.emit('open-support')
          },
          {
            id: 'about',
            label: '关于',
            type: 'normal',
            click: () => this.showAboutDialog()
          }
        ]
      },
      { type: 'separator' },
      {
        id: 'auto-start',
        label: '开机自启动',
        type: 'checkbox',
        checked: this.getAutoStartStatus(),
        click: () => this.toggleAutoStart()
      },
      { type: 'separator' },
      {
        id: 'quit',
        label: '退出',
        type: 'normal',
        accelerator: 'CmdOrCtrl+Q',
        click: () => this.quit()
      }
    ];

    this.contextMenu = this.buildMenu(menuItems);
    this.tray?.setContextMenu(this.contextMenu);
  }

  /**
   * 构建菜单
   */
  private buildMenu(items: TrayMenuItem[]): Menu {
    const template = items.map(item => {
      if (item.type === 'separator') {
        return { type: 'separator' as const };
      }

      const menuItem: any = {
        id: item.id,
        label: item.label,
        type: item.type === 'submenu' ? 'submenu' : 'normal',
        enabled: item.enabled !== false,
        visible: true,
        accelerator: item.accelerator
      };

      if (item.type === 'checkbox' || item.type === 'radio') {
        menuItem.type = item.type;
        menuItem.checked = item.checked || false;
      }

      if (item.type === 'submenu' && item.submenu) {
        menuItem.submenu = this.buildMenu(item.submenu);
      }

      if (item.click) {
        menuItem.click = () => item.click?.();
      }

      return menuItem;
    });

    return Menu.buildFromTemplate(template);
  }

  /**
   * 显示主窗口
   */
  public showMainWindow(): void {
    const mainWindow = BrowserWindow.getAllWindows().find(window => window.title.includes('AI设计'));
    
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    } else {
      this.emit('show-main-window');
    }
  }

  /**
   * 更新状态菜单
   */
  public updateStatus(status: {
    connection?: 'connected' | 'disconnected' | 'connecting';
    software?: string[];
    subscription?: string;
  }): void {
    if (!this.contextMenu) return;

    const connectionStatusItem = this.contextMenu.getMenuItemById('connection-status');
    if (connectionStatusItem && status.connection) {
      const statusText = {
        connected: '已连接',
        disconnected: '未连接',
        connecting: '连接中'
      };
      connectionStatusItem.label = `连接状态: ${statusText[status.connection]}`;
    }

    const softwareStatusItem = this.contextMenu.getMenuItemById('software-status');
    if (softwareStatusItem && status.software) {
      const connectedCount = status.software.length;
      softwareStatusItem.label = `软件状态: ${connectedCount}个已连接`;
    }

    const subscriptionStatusItem = this.contextMenu.getMenuItemById('subscription-status');
    if (subscriptionStatusItem && status.subscription) {
      subscriptionStatusItem.label = `订阅状态: ${status.subscription}`;
    }
  }

  /**
   * 显示通知
   */
  public showNotification(notification: TrayNotification): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        // 检查通知权限
        if (!this.checkNotificationPermission()) {
          console.warn('通知权限未启用');
          resolve();
          return;
        }

        // 创建通知ID
        const notificationId = `notification_${Date.now()}`;

        // 根据平台显示通知
        if (process.platform === 'win32') {
          this.showWindowsNotification(notificationId, notification);
        } else if (process.platform === 'darwin') {
          this.showMacNotification(notificationId, notification);
        } else {
          this.showLinuxNotification(notificationId, notification);
        }

        resolve();
      } catch (error) {
        console.error('显示通知失败:', error);
        resolve();
      }
    });
  }

  /**
   * 检查通知权限
   */
  private checkNotificationPermission(): boolean {
    // 简化的通知权限检查
    return typeof Notification !== 'undefined';
  }

  /**
   * 显示通知 (通用方法)
   */
  private showNotificationInternal(
    id: string,
    notification: TrayNotification
  ): void {
    try {
      const electronNotification = new (window as any).Notification({
        title: notification.title,
        body: notification.body,
        icon: notification.icon ? path.join(this.appPath, notification.icon) : this.iconPath
      });

      this.notifications.set(id, electronNotification);
    } catch (error) {
      console.error('显示通知失败:', error);
    }
  }

  /**
   * Windows通知
   */
  private showWindowsNotification(
    id: string,
    notification: TrayNotification
  ): void {
    this.showNotificationInternal(id, notification);
  }

  /**
   * macOS通知
   */
  private showMacNotification(
    id: string,
    notification: TrayNotification
  ): void {
    this.showNotificationInternal(id, notification);
  }

  /**
   * Linux通知
   */
  private showLinuxNotification(
    id: string,
    notification: TrayNotification
  ): void {
    this.showNotificationInternal(id, notification);
  }

  /**
   * 清除所有通知
   */
  public clearAllNotifications(): void {
    for (const [id, notification] of this.notifications) {
      notification.close();
      this.notifications.delete(id);
    }
  }

  /**
   * 获取自启动状态
   */
  private getAutoStartStatus(): boolean {
    try {
      return app.getLoginItemSettings().openAtLogin;
    } catch (error) {
      console.error('获取自启动状态失败:', error);
      return false;
    }
  }

  /**
   * 切换自启动
   */
  private toggleAutoStart(): void {
    try {
      const currentStatus = this.getAutoStartStatus();
      const newStatus = !currentStatus;
      
      app.setLoginItemSettings({
        openAtLogin: newStatus,
        path: process.execPath
      });
      
      // 更新菜单项状态
      const autoStartItem = this.contextMenu?.getMenuItemById('auto-start');
      if (autoStartItem) {
        autoStartItem.checked = newStatus;
      }
      
      // 显示通知
      this.showNotification({
        title: '自启动设置',
        body: newStatus ? '已启用开机自启动' : '已禁用开机自启动'
      });
      
    } catch (error) {
      console.error('设置自启动失败:', error);
    }
  }

  /**
   * 显示关于对话框
   */
  private showAboutDialog(): void {
    const version = app.getVersion();
    
    // 这里可以创建一个关于窗口或显示原生对话框
    this.showNotification({
      title: '关于 AI设计平台',
      body: `版本: ${version}\n基于 Electron + React + TypeScript\n\n© 2025 AI设计平台`
    });
  }

  /**
   * 设置托盘图标（闪烁等状态）
   */
  public setTrayIcon(status: 'normal' | 'active' | 'error'): void {
    if (!this.tray) return;

    let iconPath: string;
    
    switch (status) {
      case 'active':
        iconPath = this.iconPath.replace(/(\.png|\.ico)$/, '_active$1');
        break;
      case 'error':
        iconPath = this.iconPath.replace(/(\.png|\.ico)$/, '_error$1');
        break;
      default:
        iconPath = this.iconPath;
        break;
    }

    try {
      const icon = nativeImage.createFromPath(iconPath);
      this.tray.setImage(icon);
    } catch (error) {
      console.warn('设置托盘图标失败:', error);
    }
  }

  /**
   * 更新工具提示
   */
  public updateToolTip(toolTip: string): void {
    this.tray?.setToolTip(toolTip);
  }

  /**
   * 销毁托盘
   */
  public destroy(): void {
    this.clearAllNotifications();
    this.tray?.destroy();
    this.tray = null;
    this.contextMenu = null;
  }

  /**
   * 退出应用
   */
  private quit(): void {
    if (this.isQuitting) return;
    
    // 显示确认对话框
    this.emit('quit-requested');
    
    // 或者直接退出
    // app.quit();
  }

  /**
   * 设置徽章（macOS）
   */
  public setBadge(count: number | string): void {
    if (process.platform === 'darwin') {
      app.setBadgeCount(typeof count === 'number' ? count : 0);
    }
  }

  /**
   * 震动通知（如果支持）
   */
  public beep(times: number = 1): void {
    // Electron没有直接的beep方法，这里可以扩展为其他通知方式
    console.log(`Beep ${times} time(s)`);
  }
}