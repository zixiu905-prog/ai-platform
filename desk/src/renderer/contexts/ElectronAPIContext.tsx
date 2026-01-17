import React, { createContext, useContext, useEffect, useState } from 'react';

interface ElectronAPIType {
  // 文件操作
  dialog: {
    openFile: () => Promise<{ filePath: string; fileName: string } | null>;
    saveFile: (defaultPath?: string) => Promise<string | null>;
  };
  
  file: {
    read: (filePath: string) => Promise<string>;
    write: (filePath: string, content: string) => Promise<boolean>;
  };

  // 存储操作
  store: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };

  // 窗口控制
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };

  // 应用信息
  app: {
    version: () => Promise<string>;
    platform: () => Promise<string>;
  };

  // Shell操作
  shell: {
    openExternal: (url: string) => Promise<void>;
  };

  // API调用
  api: {
    init: () => Promise<void>;
    post: (endpoint: string, data: any) => Promise<any>;
    get: (endpoint: string) => Promise<any>;
  };

  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

const ElectronAPIContext = createContext<ElectronAPIType | null>(null);

export const ElectronAPIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [api, setApi] = useState<ElectronAPIType | null>(null);

  useEffect(() => {
    if (window.electronAPI) {
      setApi(window.electronAPI as unknown as ElectronAPIType);
      console.log('✅ ElectronAPI 已加载');
    } else {
      console.warn('⚠️ ElectronAPI 未找到，某些功能可能不可用');
    }
  }, []);

  return (
    <ElectronAPIContext.Provider value={api}>
      {children}
    </ElectronAPIContext.Provider>
  );
};

export const useElectronAPI = (): ElectronAPIType => {
  const api = useContext(ElectronAPIContext);
  
  if (!api) {
    throw new Error('useElectronAPI must be used within ElectronAPIProvider');
  }
  
  return api;
};

// Hook for checking if running in Electron environment
export const useIsElectron = (): boolean => {
  return !!window.electronAPI;
};

export default ElectronAPIContext;