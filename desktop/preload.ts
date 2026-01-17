/**
 * Electron预加载脚本
 * 为渲染进程提供安全的API接口
 */

import { contextBridge, ipcRenderer } from 'electron';

// 定义API接口
const electronAPI = {
  // 应用信息
  app: {
    getInfo: () => ipcRenderer.invoke('app-getInfo'),
    getPaths: () => ipcRenderer.invoke('app-getPaths'),
    quit: () => ipcRenderer.invoke('app-quit'),
    getVersion: () => process.env.npm_package_version || '1.0.0'
  },

  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    focus: () => ipcRenderer.invoke('window-focus'),
    blur: () => ipcRenderer.invoke('window-blur')
  },

  // 文件系统操作
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs-readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs-writeFile', filePath, content),
    exists: (filePath: string) => ipcRenderer.invoke('fs-exists', filePath),
    
    // 本地文件选择
    selectFile: (options?: Electron.OpenDialogOptions) => 
      ipcRenderer.invoke('dialog-selectFile', options),
    selectFiles: (options?: Electron.OpenDialogOptions) => 
      ipcRenderer.invoke('dialog-selectFiles', options),
    selectDirectory: (options?: Electron.OpenDialogOptions) => 
      ipcRenderer.invoke('dialog-selectDirectory', options),
    saveFile: (options?: Electron.SaveDialogOptions) => 
      ipcRenderer.invoke('dialog-saveFile', options)
  },

  // 系统通知
  notification: {
    show: (options: Electron.NotificationConstructorOptions) => 
      ipcRenderer.invoke('notification-show', options)
  },

  // 系统集成
  system: {
    openApp: (appName: string) => ipcRenderer.invoke('system-openApp', appName),
    openExternal: (url: string) => ipcRenderer.invoke('system-openExternal', url),
    showItemInFolder: (path: string) => ipcRenderer.invoke('system-showItemInFolder', path),
    getSystemInfo: () => ipcRenderer.invoke('system-getInfo'),
    
    // 剪贴板操作
    clipboard: {
      readText: () => ipcRenderer.invoke('clipboard-readText'),
      writeText: (text: string) => ipcRenderer.invoke('clipboard-writeText', text),
      readImage: () => ipcRenderer.invoke('clipboard-readImage'),
      writeImage: (imageData: any) => ipcRenderer.invoke('clipboard-writeImage', imageData)
    }
  },

  // 本地软件集成
  software: {
    detectInstalled: () => ipcRenderer.invoke('software-detectInstalled'),
    launch: (softwareId: string, params?: any) => 
      ipcRenderer.invoke('software-launch', softwareId, params),
    execute: (softwareId: string, action: string, params?: any) => 
      ipcRenderer.invoke('software-execute', softwareId, action, params),
    
    // 支持的软件列表
    getSupportedSoftware: () => ipcRenderer.invoke('software-getSupported')
  },

  // AI功能
  ai: {
    // 本地Whisper
    whisper: {
      recognize: (audioData: ArrayBuffer, options?: any) => 
        ipcRenderer.invoke('ai-whisper-recognize', audioData, options),
      isInstalled: () => ipcRenderer.invoke('ai-whisper-isInstalled'),
      install: () => ipcRenderer.invoke('ai-whisper-install')
    },

    // 本地图像处理
    image: {
      process: (imageData: ArrayBuffer, options: any) => 
        ipcRenderer.invoke('ai-image-process', imageData, options),
      resize: (imageData: ArrayBuffer, width: number, height: number) => 
        ipcRenderer.invoke('ai-image-resize', imageData, width, height),
      format: (imageData: ArrayBuffer, format: string) => 
        ipcRenderer.invoke('ai-image-format', imageData, format)
    },

    // 本地模型管理
    models: {
      list: () => ipcRenderer.invoke('ai-models-list'),
      download: (modelId: string) => ipcRenderer.invoke('ai-models-download', modelId),
      delete: (modelId: string) => ipcRenderer.invoke('ai-models-delete', modelId),
      update: (modelId: string) => ipcRenderer.invoke('ai-models-update', modelId)
    }
  },

  // 事件监听
  events: {
    // 菜单事件
    onMenuAction: (callback: (action: string, data?: any) => void) => {
      ipcRenderer.on('menu-action', (_, action, data) => callback(action, data));
    },
    
    // 项目事件
    onProjectOpened: (callback: (filePath: string) => void) => {
      ipcRenderer.on('project-opened', (_, filePath) => callback(filePath));
    },
    
    onFilesImported: (callback: (filePaths: string[]) => void) => {
      ipcRenderer.on('files-imported', (_, filePaths) => callback(filePaths));
    },

    // 更新事件
    onUpdateAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update-available', (_, info) => callback(info));
    },

    // 应用事件
    onAppFocus: (callback: () => void) => {
      ipcRenderer.on('app-focus', callback);
    },

    onAppBlur: (callback: () => void) => {
      ipcRenderer.on('app-blur', callback);
    },

    // 移除监听器
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  // 主题和样式
  theme: {
    getSystemTheme: () => ipcRenderer.invoke('theme-getSystem'),
    setTheme: (theme: 'light' | 'dark' | 'auto') => 
      ipcRenderer.invoke('theme-set', theme),
    getCurrentTheme: () => ipcRenderer.invoke('theme-getCurrent')
  },

  // 性能监控
  performance: {
    getMetrics: () => ipcRenderer.invoke('performance-getMetrics'),
    startProfiling: () => ipcRenderer.invoke('performance-startProfiling'),
    stopProfiling: () => ipcRenderer.invoke('performance-stopProfiling')
  },

  // 错误报告
  errorReporting: {
    report: (error: Error, context?: any) => 
      ipcRenderer.invoke('error-report', {
        message: error.message,
        stack: error.stack,
        context
      }),
    getCrashReports: () => ipcRenderer.invoke('error-getCrashReports')
  }
};

// 暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 类型声明，供TypeScript使用
export interface ElectronAPI {
  app: {
    getInfo: () => Promise<{
      version: string;
      name: string;
      platform: string;
      arch: string;
    }>;
    getPaths: () => Promise<{
      appData: string;
      logs: string;
      config: string;
    }>;
    quit: () => Promise<void>;
    getVersion: () => string;
  };

  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    focus: () => void;
    blur: () => void;
  };

  fs: {
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>;
    exists: (filePath: string) => Promise<boolean>;
    selectFile: (options?: Electron.OpenDialogOptions) => Promise<string | null>;
    selectFiles: (options?: Electron.OpenDialogOptions) => Promise<string[]>;
    selectDirectory: (options?: Electron.OpenDialogOptions) => Promise<string | null>;
    saveFile: (options?: Electron.SaveDialogOptions) => Promise<string | null>;
  };

  notification: {
    show: (options: Electron.NotificationConstructorOptions) => Promise<{ success: boolean }>;
  };

  system: {
    openApp: (appName: string) => Promise<{ success: boolean; message: string }>;
    openExternal: (url: string) => Promise<void>;
    showItemInFolder: (path: string) => Promise<void>;
    getSystemInfo: () => Promise<any>;
    clipboard: {
      readText: () => Promise<string>;
      writeText: (text: string) => Promise<void>;
      readImage: () => Promise<any>;
      writeImage: (imageData: any) => Promise<void>;
    };
  };

  software: {
    detectInstalled: () => Promise<any[]>;
    launch: (softwareId: string, params?: any) => Promise<any>;
    execute: (softwareId: string, action: string, params?: any) => Promise<any>;
    getSupportedSoftware: () => Promise<any[]>;
  };

  ai: {
    whisper: {
      recognize: (audioData: ArrayBuffer, options?: any) => Promise<any>;
      isInstalled: () => Promise<boolean>;
      install: () => Promise<boolean>;
    };
    image: {
      process: (imageData: ArrayBuffer, options: any) => Promise<any>;
      resize: (imageData: ArrayBuffer, width: number, height: number) => Promise<ArrayBuffer>;
      format: (imageData: ArrayBuffer, format: string) => Promise<ArrayBuffer>;
    };
    models: {
      list: () => Promise<any[]>;
      download: (modelId: string) => Promise<boolean>;
      delete: (modelId: string) => Promise<boolean>;
      update: (modelId: string) => Promise<boolean>;
    };
  };

  events: {
    onMenuAction: (callback: (action: string, data?: any) => void) => void;
    onProjectOpened: (callback: (filePath: string) => void) => void;
    onFilesImported: (callback: (filePaths: string[]) => void) => void;
    onUpdateAvailable: (callback: (info: any) => void) => void;
    onAppFocus: (callback: () => void) => void;
    onAppBlur: (callback: () => void) => void;
    removeAllListeners: (channel: string) => void;
  };

  theme: {
    getSystemTheme: () => Promise<'light' | 'dark'>;
    setTheme: (theme: 'light' | 'dark' | 'auto') => Promise<void>;
    getCurrentTheme: () => Promise<'light' | 'dark'>;
  };

  performance: {
    getMetrics: () => Promise<any>;
    startProfiling: () => Promise<void>;
    stopProfiling: () => Promise<any>;
  };

  errorReporting: {
    report: (error: Error, context?: any) => Promise<void>;
    getCrashReports: () => Promise<any[]>;
  };
}

// 在全局范围内声明类型
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}