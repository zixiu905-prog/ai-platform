import { autoUpdater } from 'electron-updater';
import { app, dialog, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

export interface ReleaseNoteInfo {
  version?: string;
  notes?: string;
}

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: Date;
  mandatory?: boolean;
  downloaded?: boolean;
}

export class UpdateService extends EventEmitter {
  private mainWindow: BrowserWindow | null = null;
  private updateInfo: UpdateInfo | null = null;
  private isCheckingForUpdates = false;
  private updateAvailable = false;

  constructor() {
    super();
    this.setupAutoUpdater();
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private setupAutoUpdater() {
    // 配置自动更新器
    (autoUpdater as any).checkForUpdatesAndNotify = async () => {
      return this.checkForUpdates();
    };
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // 检查更新开始
    autoUpdater.on('checking-for-update', () => {
      this.isCheckingForUpdates = true;
      this.emit('checking-for-update');
      this.mainWindow?.webContents.send('update-checking');
    });

    // 发现更新
    autoUpdater.on('update-available', (info: any) => {
      this.updateAvailable = true;
      this.updateInfo = {
        version: info.version,
        releaseNotes: Array.isArray(info.releaseNotes) ? info.releaseNotes.map((n: any) => n.notes).join('\n') : info.releaseNotes as string,
        releaseDate: new Date(info.releaseDate || Date.now()),
        mandatory: (info as any).mandatory || false
      };
      
      this.isCheckingForUpdates = false;
      this.emit('update-available', this.updateInfo);
      this.mainWindow?.webContents.send('update-available', this.updateInfo);
    });

    // 没有更新
    autoUpdater.on('update-not-available', (info) => {
      this.updateAvailable = false;
      this.isCheckingForUpdates = false;
      this.emit('update-not-available', info);
      this.mainWindow?.webContents.send('update-not-available', info);
    });

    // 下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      const progress = {
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total
      };
      
      this.emit('download-progress', progress);
      this.mainWindow?.webContents.send('update-download-progress', progress);
    });

    // 下载完成
    autoUpdater.on('update-downloaded', (info) => {
      if (this.updateInfo) {
        this.updateInfo.downloaded = true;
      }
      
      this.emit('update-downloaded', info);
      this.mainWindow?.webContents.send('update-downloaded', info);
      
      // 询问是否立即安装
      this.showUpdateInstallDialog();
    });

    // 错误处理
    autoUpdater.on('error', (error) => {
      this.isCheckingForUpdates = false;
      this.emit('error', error);
      this.mainWindow?.webContents.send('update-error', error.message);
    });
  }

  // 检查更新
  async checkForUpdates(): Promise<void> {
    if (this.isCheckingForUpdates) {
      throw new Error('Already checking for updates');
    }

    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('Check for updates failed:', error);
      throw error;
    }
  }

  // 下载更新
  async downloadUpdate(): Promise<void> {
    if (!this.updateAvailable) {
      throw new Error('No update available');
    }

    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Download update failed:', error);
      throw error;
    }
  }

  // 安装更新
  installUpdate(): void {
    if (!this.updateInfo?.downloaded) {
      throw new Error('Update not downloaded yet');
    }

    autoUpdater.quitAndInstall();
  }

  // 立即重启并安装
  quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }

  // 获取当前更新状态
  getUpdateStatus() {
    return {
      isCheckingForUpdates: this.isCheckingForUpdates,
      updateAvailable: this.updateAvailable,
      updateInfo: this.updateInfo
    };
  }

  // 显示更新安装对话框
  private async showUpdateInstallDialog(): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '更新已下载',
      message: `新版本 ${this.updateInfo?.version} 已下载完成`,
      detail: '是否立即重启应用并安装更新？',
      buttons: [
        '立即重启',
        '稍后安装',
        '跳过此版本'
      ],
      defaultId: 0,
      cancelId: 1
    });

    switch (result.response) {
      case 0: // 立即重启
        this.quitAndInstall();
        break;
      case 1: // 稍后安装
        // 不做任何操作，应用退出时自动安装
        break;
      case 2: // 跳过此版本
        // 记录跳过的版本
        this.skipVersion(this.updateInfo?.version);
        break;
    }
  }

  // 跳过版本
  private skipVersion(version?: string): void {
    if (version) {
      // TODO: 保存跳过的版本到本地存储
      console.log(`Skipped version: ${version}`);
    }
  }

  // 设置更新检查间隔（毫秒）
  setUpdateCheckInterval(interval: number): void {
    // 可以使用 setInterval 定期检查更新
    setInterval(() => {
      if (!this.isCheckingForUpdates) {
        this.checkForUpdates().catch(console.error);
      }
    }, interval);
  }

  // 启动时检查更新
  async checkForUpdatesOnStartup(): Promise<void> {
    try {
      // 延迟几秒后检查，避免启动时卡顿
      setTimeout(async () => {
        try {
          await this.checkForUpdates();
        } catch (error) {
          console.error('Startup update check failed:', error);
        }
      }, 5000);
    } catch (error) {
      console.error('Failed to schedule startup update check:', error);
    }
  }

  // 强制检查更新（忽略用户设置）
  async forceCheckForUpdates(): Promise<void> {
    this.isCheckingForUpdates = false;
    await this.checkForUpdates();
  }
}

// 创建全局更新服务实例
export const updateService = new UpdateService();