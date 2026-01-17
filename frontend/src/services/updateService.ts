import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
  mandatory?: boolean;
  downloadUrl?: string;
}

export interface UpdateStatus {
  isChecking: boolean;
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  downloadProgress?: number;
  error?: string;
}

class WebUpdateService {
  private static instance: WebUpdateService;
  private checkInterval: NodeJS.Timeout | null = null;
  private currentVersion: string = '1.0.0';
  private updateUrl: string;
  private autoUpdateEnabled: boolean;
  private checkIntervalMs: number;

  private constructor() {
    this.currentVersion = this.getAppVersion();
    this.updateUrl = this.getUpdateUrl();
    this.autoUpdateEnabled = this.getAutoUpdateEnabled();
    this.checkIntervalMs = parseInt(import.meta.env.VITE_UPDATE_CHECK_INTERVAL || '3600000');
  }

  static getInstance(): WebUpdateService {
    if (!WebUpdateService.instance) {
      WebUpdateService.instance = new WebUpdateService();
    }
    return WebUpdateService.instance;
  }

  private getAppVersion(): string {
    return import.meta.env.VITE_APP_VERSION || '1.0.0';
  }

  private getUpdateUrl(): string {
    const repo = import.meta.env.VITE_GITHUB_REPO || 'your-username/ai-platform';
    return `https://api.github.com/repos/${repo}/releases/latest`;
  }

  private getAutoUpdateEnabled(): boolean {
    return import.meta.env.VITE_ENABLE_AUTO_UPDATE === 'true' && !import.meta.env.DEV;
  }

  private async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const response = await fetch(this.updateUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const release = await response.json();
      
      // 检查是否有新版本
      if (this.isNewerVersion(release.tag_name, this.currentVersion)) {
        return {
          version: release.tag_name.replace(/^v/, ''),
          releaseNotes: release.body,
          releaseDate: release.published_at,
          mandatory: release.prerelease === false,
          downloadUrl: release.html_url,
        };
      }

      return null;
    } catch (error) {
      console.error('检查更新失败:', error);
      throw error;
    }
  }

  private isNewerVersion(remoteVersion: string, currentVersion: string): boolean {
    const normalizeVersion = (version: string): string => {
      return version.replace(/^v/, '').replace(/-.+$/, '');
    };

    const remote = normalizeVersion(remoteVersion);
    const current = normalizeVersion(currentVersion);

    const [remoteMajor, remoteMinor, remotePatch] = remote.split('.').map(Number);
    const [currentMajor, currentMinor, currentPatch] = current.split('.').map(Number);

    if (remoteMajor > currentMajor) return true;
    if (remoteMajor < currentMajor) return false;

    if (remoteMinor > currentMinor) return true;
    if (remoteMinor < currentMinor) return false;

    if (remotePatch > currentPatch) return true;

    return false;
  }

  async forceCheckForUpdates(): Promise<UpdateInfo | null> {
    return this.checkForUpdates();
  }

  startPeriodicCheck(intervalMs: number = 60 * 60 * 1000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // 启动时检查一次
    this.checkForUpdates().catch(console.error);

    // 定期检查
    this.checkInterval = setInterval(() => {
      this.checkForUpdates().catch(console.error);
    }, intervalMs);
  }

  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  async downloadUpdate(updateInfo: UpdateInfo): Promise<void> {
    // Web应用通常不需要下载更新，而是引导用户刷新页面
    // 但可以在这里添加PWA缓存更新逻辑
    console.log('Web应用更新:', updateInfo);
  }

  showUpdateNotification(updateInfo: UpdateInfo): void {
    const message = `发现新版本 v${updateInfo.version}`;
    const description = updateInfo.releaseNotes?.split('\n')[0] || '点击查看更新详情';

    toast.info(message, {
      description,
      duration: 10000,
      action: {
        label: '查看更新',
        onClick: () => {
          window.open(updateInfo.downloadUrl, '_blank');
        },
      },
    });
  }

  showRefreshNotification(): void {
    toast.success('应用已更新', {
      description: '点击刷新页面以获取最新版本',
      duration: 8000,
      action: {
        label: '立即刷新',
        onClick: () => {
          window.location.reload();
        },
      },
    });
  }
}

// 导出单例实例
export const webUpdateService = WebUpdateService.getInstance();

// React Hook
export function useWebUpdate() {
  const [status, setStatus] = useState<UpdateStatus>({
    isChecking: false,
    updateAvailable: false,
    updateInfo: null,
  });

  const checkForUpdates = useCallback(async () => {
    setStatus(prev => ({ ...prev, isChecking: true, error: undefined }));

    try {
      const updateInfo = await webUpdateService.forceCheckForUpdates();
      
      setStatus({
        isChecking: false,
        updateAvailable: !!updateInfo,
        updateInfo,
      });

      if (updateInfo) {
        webUpdateService.showUpdateNotification(updateInfo);
      }

      return updateInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '检查更新失败';
      
      setStatus(prev => ({
        ...prev,
        isChecking: false,
        error: errorMessage,
      }));

      toast.error('检查更新失败', {
        description: errorMessage,
      });

      return null;
    }
  }, []);

  const refreshApp = useCallback(() => {
    webUpdateService.showRefreshNotification();
  }, []);

  const getCurrentVersion = useCallback(() => {
    return webUpdateService.getCurrentVersion();
  }, []);

  useEffect(() => {
    // 启动定期检查
    webUpdateService.startPeriodicCheck(30 * 60 * 1000); // 30分钟检查一次

    return () => {
      webUpdateService.stopPeriodicCheck();
    };
  }, []);

  return {
    status,
    checkForUpdates,
    refreshApp,
    getCurrentVersion,
  };
}

// PWA更新检测
export function usePWAUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // 新的service worker已经激活
        window.location.reload();
      });
    }

    const checkForPWAUpdate = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setIsUpdateAvailable(true);
                }
              });
            }
          });
        }
      }
    };

    checkForPWAUpdate();
  }, []);

  const installUpdate = useCallback(async () => {
    setIsInstalling(true);
    
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration && registration.waiting) {
          // 通知等待中的service worker跳过等待
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } catch (error) {
      console.error('安装PWA更新失败:', error);
      toast.error('安装更新失败');
    } finally {
      setIsInstalling(false);
    }
  }, []);

  return {
    isUpdateAvailable,
    isInstalling,
    installUpdate,
  };
}

// 导出通用更新检测Hook
export function useAppUpdate() {
  const webUpdate = useWebUpdate();
  const pwaUpdate = usePWAUpdate();
  const isPWA = 'serviceWorker' in navigator;

  return {
    ...webUpdate,
    isPWA,
    pwaUpdate,
    hasAnyUpdate: webUpdate.status.updateAvailable || pwaUpdate.isUpdateAvailable,
  };
}