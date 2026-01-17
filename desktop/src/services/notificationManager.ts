import { EventEmitter } from 'events';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  timeout?: number;
  actions?: Array<{
    action: string;
    title: string;
  }>;
  onClick?: () => void;
  onClose?: () => void;
}

export interface SystemNotification {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  timeout?: number;
  actions?: Array<{
    action: string;
    title: string;
  }>;
  onClick?: () => void;
}

export class NotificationManager extends EventEmitter {
  private notifications: Map<string, SystemNotification> = new Map();
  private static instance: NotificationManager;

  private constructor() {
    super();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * 显示系统通知
   */
  async showNotification(options: NotificationOptions): Promise<string> {
    const id = this.generateId();
    const notification: SystemNotification = {
      id,
      title: options.title,
      body: options.body,
      timestamp: new Date(),
      read: false,
      type: this.getNotificationType(options.icon),
      timeout: options.timeout || 5000,
      actions: options.actions,
      onClick: options.onClick
    };

    // 保存通知到内存
    this.notifications.set(id, notification);

    try {
      // 发送到主进程显示系统通知
      if (window.electronAPI?.notifications) {
        await window.electronAPI.notifications.show({
          id,
          title: options.title,
          body: options.body,
          icon: options.icon,
          tag: options.tag,
          timeout: options.timeout,
          actions: options.actions
        });
      }

      // 触发事件
      this.emit('notification', notification);

      // 设置自动移除
      if (notification.timeout && notification.timeout > 0) {
        setTimeout(() => {
          this.removeNotification(id);
        }, notification.timeout);
      }

      return id;
    } catch (error) {
      console.error('显示通知失败:', error);
      throw error;
    }
  }

  /**
   * 显示成功通知
   */
  async showSuccess(title: string, body: string, options?: Partial<NotificationOptions>): Promise<string> {
    return this.showNotification({
      title,
      body,
      icon: 'success',
      ...options
    });
  }

  /**
   * 显示错误通知
   */
  async showError(title: string, body: string, options?: Partial<NotificationOptions>): Promise<string> {
    return this.showNotification({
      title,
      body,
      icon: 'error',
      timeout: 8000,
      ...options
    });
  }

  /**
   * 显示警告通知
   */
  async showWarning(title: string, body: string, options?: Partial<NotificationOptions>): Promise<string> {
    return this.showNotification({
      title,
      body,
      icon: 'warning',
      timeout: 6000,
      ...options
    });
  }

  /**
   * 显示信息通知
   */
  async showInfo(title: string, body: string, options?: Partial<NotificationOptions>): Promise<string> {
    return this.showNotification({
      title,
      body,
      icon: 'info',
      ...options
    });
  }

  /**
   * 获取所有通知
   */
  getAllNotifications(): SystemNotification[] {
    return Array.from(this.notifications.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 获取未读通知
   */
  getUnreadNotifications(): SystemNotification[] {
    return this.getAllNotifications().filter(n => !n.read);
  }

  /**
   * 标记通知为已读
   */
  markAsRead(id: string): boolean {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      this.emit('notificationRead', notification);
      return true;
    }
    return false;
  }

  /**
   * 标记所有通知为已读
   */
  markAllAsRead(): void {
    for (const notification of this.notifications.values()) {
      notification.read = true;
    }
    this.emit('allNotificationsRead');
  }

  /**
   * 移除通知
   */
  removeNotification(id: string): boolean {
    const removed = this.notifications.delete(id);
    if (removed) {
      this.emit('notificationRemoved', id);
    }
    return removed;
  }

  /**
   * 清空所有通知
   */
  clearAllNotifications(): void {
    this.notifications.clear();
    this.emit('allNotificationsCleared');
  }

  /**
   * 获取通知数量
   */
  getNotificationCount(): number {
    return this.notifications.size;
  }

  /**
   * 获取未读通知数量
   */
  getUnreadCount(): number {
    return this.getUnreadNotifications().length;
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      if (window.electronAPI?.notifications) {
        return await window.electronAPI.notifications.requestPermission();
      } else {
        // Web环境下的权限请求
        return await Notification.requestPermission();
      }
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return 'denied';
    }
  }

  /**
   * 检查通知权限状态
   */
  async checkPermission(): Promise<NotificationPermission> {
    try {
      if (window.electronAPI?.notifications) {
        return await window.electronAPI.notifications.checkPermission();
      } else {
        return Notification.permission;
      }
    } catch (error) {
      console.error('检查通知权限失败:', error);
      return 'denied';
    }
  }

  /**
   * 设置通知点击处理器
   */
  onNotificationClick(callback: (notification: SystemNotification) => void): void {
    this.on('notification', callback);
  }

  /**
   * 监听主进程的通知点击事件
   */
  setupMainProcessListeners(): void {
    if (window.electronAPI?.notifications) {
      window.electronAPI.notifications.onClicked((id: string) => {
        const notification = this.notifications.get(id);
        if (notification && notification.onClick) {
          notification.onClick();
        }
        this.emit('notificationClicked', notification);
      });
    }
  }

  /**
   * 发送进度通知
   */
  async showProgress(title: string, current: number, total: number): Promise<string> {
    const progress = Math.round((current / total) * 100);
    return this.showNotification({
      title,
      body: `进度: ${progress}% (${current}/${total})`,
      icon: 'info',
      timeout: 2000
    });
  }

  /**
   * 发送文件操作完成通知
   */
  async showFileOperationComplete(operation: string, fileName: string, success: boolean): Promise<string> {
    const title = success ? '文件操作完成' : '文件操作失败';
    const body = `${operation} "${fileName}" ${success ? '成功' : '失败'}`;
    const icon = success ? 'success' : 'error';

    return this.showNotification({
      title,
      body,
      icon,
      timeout: 4000
    });
  }

  /**
   * 发送系统状态通知
   */
  async showSystemStatus(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<string> {
    return this.showNotification({
      title: `系统状态: ${title}`,
      body: message,
      icon: type,
      timeout: 5000
    });
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getNotificationType(icon?: string): 'info' | 'success' | 'warning' | 'error' {
    if (!icon) return 'info';
    
    switch (icon.toLowerCase()) {
      case 'success':
      case 'check':
      case 'done':
        return 'success';
      case 'error':
      case 'cross':
      case 'close':
        return 'error';
      case 'warning':
      case 'alert':
      case 'exclamation':
        return 'warning';
      default:
        return 'info';
    }
  }
}

// 导出单例实例
export const notificationManager = NotificationManager.getInstance();