import { contextBridge, ipcRenderer } from 'electron';

// 定义API接口
export interface ElectronAPI {
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
    openAIChat: () => Promise<void>;
  };

  // 应用信息
  app: {
    version: () => Promise<string>;
    platform: () => Promise<string>;
  };

  // Shell操作
  shell: {
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  };

  // API调用
  api: {
    init: () => Promise<{ success: boolean; error?: string }>;
    post: (endpoint: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    get: (endpoint: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  };

  // 软件集成
  software: {
    scan: () => Promise<{ success: boolean; data?: any; error?: string }>;
    launch: (softwareName: string, filePath?: string) => Promise<{ success: boolean; error?: string }>;
    executeCommand: (softwareName: string, command: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    status: (softwareName?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    byCategory: (category: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    rescan: (deepScan?: boolean) => Promise<{ success: boolean; data?: any; error?: string }>;
    deepScan: () => Promise<{ success: boolean; data?: any; error?: string }>;
    intelligentSearch: (softwareName?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    updates: {
      checkAll: (options?: { checkCriticalOnly?: boolean }) => Promise<{ success: boolean; data?: any; error?: string }>;
      check: (softwareKey: string, options?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      download: (softwareKey: string, downloadUrl: string, savePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      install: (softwareKey: string, installerPath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      getStats: () => Promise<{ success: boolean; data?: any; error?: string }>;
      clearCache: () => Promise<{ success: boolean; error?: string }>;
    };
    backup: {
      create: (softwareName: string, path: string, options?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      restore: (backupId: string, restorePath?: string, options?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      getAll: () => Promise<{ success: boolean; data?: any; error?: string }>;
      getBySoftware: (softwareName: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      delete: (backupId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      export: (backupId: string, exportPath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      cleanup: (maxAge?: number) => Promise<{ success: boolean; data?: any; error?: string }>;
      getStats: () => Promise<{ success: boolean; data?: any; error?: string }>;
    };
    pathLock: {
      lock: (softwareName: string, path: string, lockType?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      unlock: (softwareName: string, path: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      getAll: () => Promise<{ success: boolean; data?: any; error?: string }>;
      verify: () => Promise<{ success: boolean; data?: any; error?: string }>;
      clearAll: () => Promise<{ success: boolean; error?: string }>;
      export: () => Promise<{ success: boolean; data?: any; error?: string }>;
      import: (locksData: string) => Promise<{ success: boolean; error?: string }>;
    };
    validatePath: (softwareName: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    pathValidation: {
      validate: (softwareName: string, path: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      validateMultiple: (softwarePaths: Array<{softwareName: string, path: string}>) => Promise<{ success: boolean; data?: any; error?: string }>;
      getRepairOperations: (issues: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
      executeRepair: (operation: any, context: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      getRepairHistory: () => Promise<{ success: boolean; data?: any; error?: string }>;
      clearCache: () => Promise<{ success: boolean; error?: string }>;
    };
  };

  // Photoshop自动化
  photoshop: {
    detectInstallation: () => Promise<{ success: boolean; data?: any; error?: string }>;
    setPath: (path: string) => Promise<{ success: boolean; error?: string }>;
    batchProcess: (config: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    layerOperation: (filePath: string, operations: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
    applyFilters: (filePath: string, filters: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
    batchExport: (filePath: string, exportConfigs: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
    getDocumentInfo: (filePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
    stopProcessing: () => Promise<{ success: boolean; error?: string }>;
  };

  // AutoCAD自动化
  autocad: {
    detectInstallation: () => Promise<{ success: boolean; data?: any; error?: string }>;
    setPath: (path: string) => Promise<{ success: boolean; error?: string }>;
    batchProcess: (config: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    manageLayers: (filePath: string, standard: string, customStandard?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    autoDimension: (filePath: string, dimensionType: string, standard: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    batchConvert: (inputFiles: string[], outputFormat: string, outputFolder: string, options?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    getDocumentInfo: (filePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
    stopProcessing: () => Promise<{ success: boolean; error?: string }>;
  };

  // Blender自动化
  blender: {
    detectInstallation: () => Promise<{ success: boolean; data?: any; error?: string }>;
    setPath: (path: string) => Promise<{ success: boolean; error?: string }>;
    batchProcess: (config: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    optimizeModel: (filePath: string, optimizationLevel: string, targetPolygons?: number) => Promise<{ success: boolean; data?: any; error?: string }>;
    manageMaterials: (filePath: string, materialType: string, customMaterial?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    batchRender: (inputFiles: string[], renderSettings: any, outputFolder: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    editKeyframes: (filePath: string, edits: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
    getModelInfo: (filePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
    stopProcessing: () => Promise<{ success: boolean; error?: string }>;
  };

  // 数据交换
  dataExchange: {
    createPackage: (config: any, sourceFilePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    importPackage: (packageId: string, targetFilePath: string, config: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    batch: (configs: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
    history: () => Promise<{ success: boolean; data?: any; error?: string }>;
    cleanup: () => Promise<{ success: boolean; error?: string }>;
  };

  // 图像生成
  imageGeneration: {
    generate: (config: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    generateBatch: (configs: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
    generateVariations: (baseImageUrl: string, count: number, variations?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    optimizePrompt: (prompt: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    cancelTask: (taskId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getTask: (taskId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getActiveTasks: () => Promise<{ success: boolean; data?: any; error?: string }>;
    save: (taskId: string, filename?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    deleteHistory: (historyId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    toggleFavorite: (historyId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getStats: () => Promise<{ success: boolean; data?: any; error?: string }>;
  };

  // 语音识别
  speech: {
    startRecording: () => Promise<{ success: boolean; error?: string }>;
    stopRecording: () => Promise<{ success: boolean; error?: string }>;
    startRealtime: () => Promise<{ success: boolean; error?: string }>;
    recognizeFile: (filePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
    getCommands: () => Promise<{ success: boolean; data?: any; error?: string }>;
    addCommand: (command: any) => Promise<{ success: boolean; error?: string }>;
    removeCommand: (commandId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    toggleCommand: (commandId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getHistory: (limit?: number) => Promise<{ success: boolean; data?: any; error?: string }>;
    clearHistory: () => Promise<{ success: boolean; error?: string }>;
    updateConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
    getConfig: () => Promise<{ success: boolean; data?: any; error?: string }>;
  };

  // 离线服务
  offline: {
    cacheData: (data: any) => Promise<{ success: boolean; error?: string }>;
    getCached: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    installModel: (model: any) => Promise<{ success: boolean; error?: string }>;
    loadModel: (modelId: string) => Promise<{ success: boolean; error?: string }>;
    unloadModel: (modelId: string) => Promise<{ success: boolean; error?: string }>;
    inference: (modelId: string, input: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    availability: () => Promise<{ success: boolean; data?: any; error?: string }>;
    sync: () => Promise<{ success: boolean; error?: string }>;
    stats: () => Promise<{ success: boolean; data?: any; error?: string }>;
  };

  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

// 暴露受保护的API到渲染进程
const electronAPI: ElectronAPI = {
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog-open-file'),
    saveFile: (defaultPath?: string) => ipcRenderer.invoke('dialog-save-file', defaultPath)
  },

  file: {
    read: (filePath: string) => ipcRenderer.invoke('file-read', filePath),
    write: (filePath: string, content: string) => ipcRenderer.invoke('file-write', filePath, content)
  },

  store: {
    get: (key: string) => ipcRenderer.invoke('store-get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store-delete', key)
  },

  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    openAIChat: () => ipcRenderer.invoke('window-openAIChat')
  },

  app: {
    version: () => ipcRenderer.invoke('app-version'),
    platform: () => ipcRenderer.invoke('platform')
  },

  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell-open-external', url)
  },

  api: {
    init: () => ipcRenderer.invoke('api-init'),
    post: (endpoint: string, data: any) => ipcRenderer.invoke('api-post', endpoint, data),
    get: (endpoint: string) => ipcRenderer.invoke('api-get', endpoint)
  },

  software: {
    scan: () => ipcRenderer.invoke('software-scan'),
    launch: (softwareName: string, filePath?: string) => ipcRenderer.invoke('software-launch', softwareName, filePath),
    executeCommand: (softwareName: string, command: any) => ipcRenderer.invoke('software-execute-command', softwareName, command),
    status: (softwareName?: string) => ipcRenderer.invoke('software-status', softwareName),
    byCategory: (category: string) => ipcRenderer.invoke('software-by-category', category),
    rescan: (deepScan?: boolean) => ipcRenderer.invoke('software-rescan', deepScan),
    deepScan: () => ipcRenderer.invoke('software-deep-scan'),
    intelligentSearch: (softwareName?: string) => ipcRenderer.invoke('software-intelligent-search', softwareName),
    updates: {
      checkAll: (options?: { checkCriticalOnly?: boolean }) => ipcRenderer.invoke('software-check-updates', options),
      check: (softwareKey: string, options?: any) => ipcRenderer.invoke('software-check-update', softwareKey, options),
      download: (softwareKey: string, downloadUrl: string, savePath: string) => ipcRenderer.invoke('software-download-update', softwareKey, downloadUrl, savePath),
      install: (softwareKey: string, installerPath: string) => ipcRenderer.invoke('software-install-update', softwareKey, installerPath),
      getStats: () => ipcRenderer.invoke('software-update-stats'),
      clearCache: () => ipcRenderer.invoke('software-clear-update-cache')
    },
    pathLock: {
      lock: (softwareName: string, path: string, lockType?: string) => ipcRenderer.invoke('software-lock-path', softwareName, path, lockType),
      unlock: (softwareName: string, path: string) => ipcRenderer.invoke('software-unlock-path', softwareName, path),
      getAll: () => ipcRenderer.invoke('software-get-locks'),
      verify: () => ipcRenderer.invoke('software-verify-locks'),
      clearAll: () => ipcRenderer.invoke('software-clear-all-locks'),
      export: () => ipcRenderer.invoke('software-export-locks'),
      import: (locksData: string) => ipcRenderer.invoke('software-import-locks', locksData)
    },
    validatePath: (softwareName: string) => ipcRenderer.invoke('software-validate-path', softwareName),
    pathValidation: {
      validate: (softwareName: string, path: string) => ipcRenderer.invoke('software-validate-path', softwareName, path),
      validateMultiple: (softwarePaths: Array<{softwareName: string, path: string}>) => ipcRenderer.invoke('software-validate-multiple', softwarePaths),
      getRepairOperations: (issues: any[]) => ipcRenderer.invoke('software-get-repair-operations', issues),
      executeRepair: (operation: any, context: any) => ipcRenderer.invoke('software-execute-repair', operation, context),
      getRepairHistory: () => ipcRenderer.invoke('software-get-repair-history'),
      clearCache: () => ipcRenderer.invoke('software-clear-validation-cache')
    },
    backup: {
      create: (softwareName: string, path: string, options?: any) => ipcRenderer.invoke('software-create-backup', softwareName, path, options),
      restore: (backupId: string, restorePath?: string, options?: any) => ipcRenderer.invoke('software-restore-backup', backupId, restorePath, options),
      getAll: () => ipcRenderer.invoke('software-get-backups'),
      getBySoftware: (softwareName: string) => ipcRenderer.invoke('software-get-backups-by-software', softwareName),
      delete: (backupId: string) => ipcRenderer.invoke('software-delete-backup', backupId),
      export: (backupId: string, exportPath: string) => ipcRenderer.invoke('software-export-backup', backupId, exportPath),
      cleanup: (maxAge?: number) => ipcRenderer.invoke('software-cleanup-backups', maxAge),
      getStats: () => ipcRenderer.invoke('software-get-backup-stats')
    }
  },

  // Photoshop自动化
  photoshop: {
    detectInstallation: () => ipcRenderer.invoke('photoshop-detect-installation'),
    setPath: (path: string) => ipcRenderer.invoke('photoshop-set-path', path),
    batchProcess: (config: any) => ipcRenderer.invoke('photoshop-batch-process', config),
    layerOperation: (filePath: string, operations: any[]) => ipcRenderer.invoke('photoshop-layer-operation', filePath, operations),
    applyFilters: (filePath: string, filters: any[]) => ipcRenderer.invoke('photoshop-apply-filters', filePath, filters),
    batchExport: (filePath: string, exportConfigs: any[]) => ipcRenderer.invoke('photoshop-batch-export', filePath, exportConfigs),
    getDocumentInfo: (filePath: string) => ipcRenderer.invoke('photoshop-get-document-info', filePath),
    getStatus: () => ipcRenderer.invoke('photoshop-get-status'),
    stopProcessing: () => ipcRenderer.invoke('photoshop-stop-processing')
  },

  // AutoCAD自动化
  autocad: {
    detectInstallation: () => ipcRenderer.invoke('autocad-detect-installation'),
    setPath: (path: string) => ipcRenderer.invoke('autocad-set-path', path),
    batchProcess: (config: any) => ipcRenderer.invoke('autocad-batch-process', config),
    manageLayers: (filePath: string, standard: string, customStandard?: any) => ipcRenderer.invoke('autocad-manage-layers', filePath, standard, customStandard),
    autoDimension: (filePath: string, dimensionType: string, standard: string) => ipcRenderer.invoke('autocad-auto-dimension', filePath, dimensionType, standard),
    batchConvert: (inputFiles: string[], outputFormat: string, outputFolder: string, options?: any) => ipcRenderer.invoke('autocad-batch-convert', inputFiles, outputFormat, outputFolder, options),
    getDocumentInfo: (filePath: string) => ipcRenderer.invoke('autocad-get-document-info', filePath),
    getStatus: () => ipcRenderer.invoke('autocad-get-status'),
    stopProcessing: () => ipcRenderer.invoke('autocad-stop-processing')
  },

  // Blender自动化
  blender: {
    detectInstallation: () => ipcRenderer.invoke('blender-detect-installation'),
    setPath: (path: string) => ipcRenderer.invoke('blender-set-path', path),
    batchProcess: (config: any) => ipcRenderer.invoke('blender-batch-process', config),
    optimizeModel: (filePath: string, optimizationLevel: string, targetPolygons?: number) => ipcRenderer.invoke('blender-optimize-model', filePath, optimizationLevel, targetPolygons),
    manageMaterials: (filePath: string, materialType: string, customMaterial?: any) => ipcRenderer.invoke('blender-manage-materials', filePath, materialType, customMaterial),
    batchRender: (inputFiles: string[], renderSettings: any, outputFolder: string) => ipcRenderer.invoke('blender-batch-render', inputFiles, renderSettings, outputFolder),
    editKeyframes: (filePath: string, edits: any[]) => ipcRenderer.invoke('blender-edit-keyframes', filePath, edits),
    getModelInfo: (filePath: string) => ipcRenderer.invoke('blender-get-model-info', filePath),
    getStatus: () => ipcRenderer.invoke('blender-get-status'),
    stopProcessing: () => ipcRenderer.invoke('blender-stop-processing')
  },

  // 数据交换
  dataExchange: {
    createPackage: (config: any, sourceFilePath: string) => ipcRenderer.invoke('data-exchange-create-package', config, sourceFilePath),
    importPackage: (packageId: string, targetFilePath: string, config: any) => ipcRenderer.invoke('data-exchange-import-package', packageId, targetFilePath, config),
    batch: (configs: any[]) => ipcRenderer.invoke('data-exchange-batch', configs),
    history: () => ipcRenderer.invoke('data-exchange-history'),
    cleanup: () => ipcRenderer.invoke('data-exchange-cleanup')
  },

  // 图像生成
  imageGeneration: {
    generate: (config: any) => ipcRenderer.invoke('image-generate', config),
    generateBatch: (configs: any[]) => ipcRenderer.invoke('image-generate-batch', configs),
    generateVariations: (baseImageUrl: string, count: number, variations?: any) => ipcRenderer.invoke('image-generate-variations', baseImageUrl, count, variations),
    optimizePrompt: (prompt: string) => ipcRenderer.invoke('image-optimize-prompt', prompt),
    cancelTask: (taskId: string) => ipcRenderer.invoke('image-cancel-task', taskId),
    getTask: (taskId: string) => ipcRenderer.invoke('image-get-task', taskId),
    getActiveTasks: () => ipcRenderer.invoke('image-get-active-tasks'),
    save: (taskId: string, filename?: string) => ipcRenderer.invoke('image-save', taskId, filename),
    deleteHistory: (historyId: string) => ipcRenderer.invoke('image-delete-history', historyId),
    toggleFavorite: (historyId: string) => ipcRenderer.invoke('image-toggle-favorite', historyId),
    getStats: () => ipcRenderer.invoke('image-get-stats')
  },

  // 语音识别
  speech: {
    startRecording: () => ipcRenderer.invoke('speech-start-recording'),
    stopRecording: () => ipcRenderer.invoke('speech-stop-recording'),
    startRealtime: () => ipcRenderer.invoke('speech-start-realtime'),
    recognizeFile: (filePath: string) => ipcRenderer.invoke('speech-recognize-file', filePath),
    getStatus: () => ipcRenderer.invoke('speech-get-status'),
    getCommands: () => ipcRenderer.invoke('speech-get-commands'),
    addCommand: (command: any) => ipcRenderer.invoke('speech-add-command', command),
    removeCommand: (commandId: string) => ipcRenderer.invoke('speech-remove-command', commandId),
    toggleCommand: (commandId: string) => ipcRenderer.invoke('speech-toggle-command', commandId),
    getHistory: (limit?: number) => ipcRenderer.invoke('speech-get-history', limit),
    clearHistory: () => ipcRenderer.invoke('speech-clear-history'),
    updateConfig: (config: any) => ipcRenderer.invoke('speech-update-config', config),
    getConfig: () => ipcRenderer.invoke('speech-get-config')
  },

  offline: {
    cacheData: (data: any) => ipcRenderer.invoke('offline-cache-data', data),
    getCached: (id: string) => ipcRenderer.invoke('offline-get-cached', id),
    installModel: (model: any) => ipcRenderer.invoke('offline-install-model', model),
    loadModel: (modelId: string) => ipcRenderer.invoke('offline-load-model', modelId),
    unloadModel: (modelId: string) => ipcRenderer.invoke('offline-unload-model', modelId),
    inference: (modelId: string, input: any) => ipcRenderer.invoke('offline-inference', modelId, input),
    availability: () => ipcRenderer.invoke('offline-availability'),
    sync: () => ipcRenderer.invoke('offline-sync'),
    stats: () => ipcRenderer.invoke('offline-stats')
  },

  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.off(channel, callback);
  },

  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  }
};

// 将API暴露到全局window对象
contextBridge.exposeInMainWorld('electronAPI', electronAPI);