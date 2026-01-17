import { app, BrowserWindow, Menu, ipcMain, shell, dialog, protocol } from 'electron';
import { join } from 'path';
import Store from 'electron-store';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { updateService } from './services/updateService';
import { SoftwareIntegrationService } from './services/softwareIntegrationService';
import { TrayService } from './services/trayService';
import { OfflineService } from './services/offlineService';
import { SoftwareUpdateService } from './services/softwareUpdateService';
import { PathLockService } from './services/pathLockService';
import { PathValidationService } from './services/pathValidationService';
import { PathBackupService } from './services/pathBackupService';
import { PhotoshopAutomationService } from './services/photoshopAutomationService';
import { AutoCADAutomationService } from './services/autocadAutomationService';
import { BlenderAutomationService } from './services/blenderAutomationService';
import { DataExchangeService } from './services/dataExchangeService';
import { ImageGenerationService } from './services/imageGenerationService';
import { SpeechRecognitionService } from './services/speechRecognitionService';
import { WebSocketManager } from './services/websocketClientService';
import { taskProcessorService } from './services/taskProcessorService';
import { statusTrackingService } from './services/statusTrackingService';
import { WindowManager } from './managers/windowManager';

// 应用配置存储
const store = new Store();
const softwareIntegrationService = new SoftwareIntegrationService();
const trayService = new TrayService();
const offlineService = new OfflineService();
const softwareUpdateService = new SoftwareUpdateService();
const pathLockService = new PathLockService();
const pathValidationService = new PathValidationService();
const pathBackupService = new PathBackupService();
const photoshopAutomationService = new PhotoshopAutomationService();
const autocadAutomationService = new AutoCADAutomationService();
const blenderAutomationService = new BlenderAutomationService();
const dataExchangeService = new DataExchangeService();
const imageGenerationService = new ImageGenerationService('47ada820-238e-4d72-81bc-580bea836be4');
const speechRecognitionService = new SpeechRecognitionService({});
const webSocketManager = WebSocketManager.getInstance();

class DesktopApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev = process.env.NODE_ENV === 'development';
  private windowManager: WindowManager;

  constructor() {
    this.windowManager = WindowManager.getInstance();
    this.init();
  }

  private init() {
    // 设置用户模型ID (Windows单实例)
    app.setAppUserModelId('com.aiplatform.desktop');

    // 应用事件监听
    app.whenReady().then(() => {
      // 注册自定义协议（必须在app ready之后）
      this.registerProtocols();

      this.createMainWindow();
      this.setupMenu();
      this.setupIPC();
      this.setupUpdateService();
      this.setupWebSocket();
      this.setupTrayService();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        trayService.destroy();
        app.quit();
      }
    });

    app.on('web-contents-created', (_, contents) => {
      // 安全设置
      contents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: 'deny' };
      });
    });
  }

  private registerProtocols() {
    // 注册应用文件协议
    protocol.registerFileProtocol('app', (request, callback) => {
      const url = request.url.substr(6);
      try {
        return callback({ path: join(__dirname, '../renderer', url) });
      } catch (error) {
        console.error('Protocol registration error:', error);
      }
    });
  }

  private createMainWindow() {
    // 创建主窗口
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      show: false,
      autoHideMenuBar: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
        webSecurity: !this.isDev,
        additionalArguments: [
          `--local-storage-path=${store.path}`,
          `--app-version=${app.getVersion()}`
        ]
      },
      icon: this.getAppIcon(),
      backgroundColor: '#0a0e1a'
    });

    // 加载应用
    this.loadMainWindow();

    // 窗口事件
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      if (this.isDev) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 状态恢复
    this.restoreWindowState();

    // 设置服务的窗口引用
    updateService.setMainWindow(this.mainWindow);
  }

  private loadMainWindow() {
    const startUrl = this.isDev 
      ? 'http://localhost:5173' 
      : `file://${join(__dirname, '../../frontend/dist/index.html')}`;

    this.mainWindow?.loadURL(startUrl);
  }

  private setupMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: '文件',
        submenu: [
          {
            label: '新建项目',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow?.webContents.send('menu-new-project');
            }
          },
          {
            label: '打开文件',
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              this.openFileDialog();
            }
          },
          {
            type: 'separator' as const
          },
          {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: '编辑',
        submenu: [
          { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
          { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
          { type: 'separator' },
          { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
          { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
          { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
          { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
        ]
      },
      {
        label: '视图',
        submenu: [
          { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
          { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
          { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
          { type: 'separator' },
          { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
          { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
          { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
          { type: 'separator' },
          { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
        ]
      },
      {
        label: 'AI助手',
        submenu: [
          {
            label: '智能推荐',
            accelerator: 'CmdOrCtrl+Shift+A',
            click: () => {
              this.mainWindow?.webContents.send('menu-ai-recommend');
            }
          },
          {
            label: '代码分析',
            accelerator: 'CmdOrCtrl+Shift+C',
            click: () => {
              this.mainWindow?.webContents.send('menu-code-analysis');
            }
          },
          {
            label: '智能客服',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => {
              this.mainWindow?.webContents.send('menu-customer-service');
            }
          }
        ]
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '检查更新',
            click: async () => {
              try {
                await updateService.forceCheckForUpdates();
                this.mainWindow?.webContents.send('menu-update-check');
              } catch (error) {
                dialog.showErrorBox('更新检查失败', error.message);
              }
            }
          },
          {
            type: 'separator' as const
          },
          {
            label: '关于',
            click: () => {
              this.showAboutDialog();
            }
          },
          {
            label: '帮助文档',
            click: () => {
              shell.openExternal('https://docs.aiplatform.com');
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPC() {
    // 文件操作
    ipcMain.handle('dialog-open-file', async () => {
      return this.openFileDialog();
    });

    ipcMain.handle('dialog-save-file', async (_, defaultPath?: string) => {
      return this.saveFileDialog(defaultPath);
    });

    ipcMain.handle('file-read', async (_, filePath: string) => {
      try {
        return readFileSync(filePath, 'utf-8');
      } catch (error) {
        throw new Error(`无法读取文件: ${filePath}`);
      }
    });

    ipcMain.handle('file-write', async (_, filePath: string, content: string) => {
      try {
        writeFileSync(filePath, content, 'utf-8');
        return true;
      } catch (error) {
        throw new Error(`无法写入文件: ${filePath}`);
      }
    });

    // 存储操作
    ipcMain.handle('store-get', (_, key: string) => {
      return store.get(key);
    });

    ipcMain.handle('store-set', (_, key: string, value: any) => {
      store.set(key, value);
    });

    ipcMain.handle('store-delete', (_, key: string) => {
      store.delete(key);
    });

    // 窗口控制
    ipcMain.handle('window-minimize', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('window-maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.handle('window-close', () => {
      this.mainWindow?.close();
    });

    ipcMain.handle('window-openAIChat', () => {
      this.windowManager?.createAIChatWindow();
      return Promise.resolve();
    });

    // 应用信息
    ipcMain.handle('app-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('platform', () => {
      return process.platform;
    });

    // 更新服务IPC
    ipcMain.handle('update-check', async () => {
      try {
        await updateService.checkForUpdates();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('update-download', async () => {
      try {
        await updateService.downloadUpdate();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('update-install', () => {
      try {
        updateService.installUpdate();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('update-status', () => {
      return updateService.getUpdateStatus();
    });

    ipcMain.handle('update-force-check', async () => {
      try {
        await updateService.forceCheckForUpdates();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 软件集成服务IPC
    ipcMain.handle('software-scan', async () => {
      try {
        const softwareList = await softwareIntegrationService.scanInstalledSoftware();
        return { success: true, data: softwareList };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-launch', async (_, softwareName: string, filePath?: string) => {
      try {
        const result = await softwareIntegrationService.launchSoftware(softwareName, filePath);
        return { success: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-execute-command', async (_, softwareName: string, command: any) => {
      try {
        const result = await softwareIntegrationService.executeSoftwareCommand(softwareName, command);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-status', (_, softwareName?: string) => {
      try {
        if (softwareName) {
          const status = softwareIntegrationService.getSoftwareStatus(softwareName);
          return { success: true, data: status };
        } else {
          const allSoftware = softwareIntegrationService.getAllInstalledSoftware();
          return { success: true, data: allSoftware };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-by-category', (_, category: string) => {
      try {
        const software = softwareIntegrationService.getSoftwareByCategory(category as any);
        return { success: true, data: software };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-rescan', async (_, deepScan: boolean = false) => {
      try {
        const softwareList = await softwareIntegrationService.rescanSoftware(deepScan);
        return { success: true, data: softwareList };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-deep-scan', async () => {
      try {
        const softwareList = await softwareIntegrationService.scanInstalledSoftware(true);
        return { success: true, data: softwareList };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-lock-path', async (_, softwareName: string, path: string, lockType: string = 'readonly') => {
      try {
        const result = await pathLockService.lockPath(softwareName, path, lockType as any);
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-unlock-path', async (_, softwareName: string, path: string) => {
      try {
        const result = await pathLockService.unlockPath(softwareName, path);
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-get-locks', async () => {
      try {
        const locks = pathLockService.getAllLocks();
        return { success: true, data: locks };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-verify-locks', async () => {
      try {
        const result = await pathLockService.verifyAllLocks();
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-clear-all-locks', async () => {
      try {
        await pathLockService.clearAllLocks();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-export-locks', async () => {
      try {
        const locksData = pathLockService.exportLocks();
        return { success: true, data: locksData };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-import-locks', async (_, locksData: string) => {
      try {
        await pathLockService.importLocks(locksData);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 路径验证相关IPC
    ipcMain.handle('software-validate-path', async (_, softwareName: string, path: string) => {
      try {
        const result = await pathValidationService.validateSoftwarePath(softwareName, path);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-validate-multiple', async (_, softwarePaths: Array<{softwareName: string, path: string}>) => {
      try {
        const results = await pathValidationService.validateMultiplePaths(softwarePaths);
        return { success: true, data: results };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-get-repair-operations', async (_, issues: any[]) => {
      try {
        const operations = pathValidationService.getRepairOperations(issues);
        return { success: true, data: operations };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-execute-repair', async (_, operation: any, context: any) => {
      try {
        const result = await pathValidationService.executeRepair(operation, context);
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-get-repair-history', async () => {
      try {
        const history = pathValidationService.getRepairHistory();
        return { success: true, data: history };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-clear-validation-cache', async () => {
      try {
        pathValidationService.clearValidationCache();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 路径备份和恢复相关IPC
    ipcMain.handle('software-create-backup', async (_, softwareName: string, path: string, options?: any) => {
      try {
        const backup = await pathBackupService.createBackup(softwareName, path, options);
        return { success: true, data: backup };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-restore-backup', async (_, backupId: string, restorePath?: string, options?: any) => {
      try {
        const result = await pathBackupService.restoreBackup(backupId, restorePath, options);
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-get-backups', async () => {
      try {
        const backups = pathBackupService.getAllBackups();
        return { success: true, data: backups };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-get-backups-by-software', async (_, softwareName: string) => {
      try {
        const backups = pathBackupService.getBackupsBySoftware(softwareName);
        return { success: true, data: backups };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-delete-backup', async (_, backupId: string) => {
      try {
        const success = await pathBackupService.deleteBackup(backupId);
        return { success, data: { deleted: success } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-export-backup', async (_, backupId: string, exportPath: string) => {
      try {
        const success = await pathBackupService.exportBackup(backupId, exportPath);
        return { success, data: { exported: success } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-cleanup-backups', async (_, maxAge?: number) => {
      try {
        const deletedCount = await pathBackupService.cleanupOldBackups(maxAge);
        return { success: true, data: { deletedCount } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-get-backup-stats', async () => {
      try {
        const stats = pathBackupService.getBackupStats();
        return { success: true, data: stats };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-validate-path', async (_, softwareName: string) => {
      try {
        const softwareInfo = softwareIntegrationService.getSoftwareStatus(softwareName);
        if (softwareInfo && softwareInfo.path) {
          const isValid = existsSync(softwareInfo.path);
          return { success: true, data: { valid: isValid, path: softwareInfo.path } };
        }
        return { success: false, error: 'Software not found' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-intelligent-search', async (_, softwareName?: string) => {
      try {
        const searchResults = await softwareIntegrationService.performIntelligentPathSearch(softwareName);
        return { success: true, data: searchResults };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 软件更新相关IPC
    ipcMain.handle('software-check-updates', async (_, options?: { checkCriticalOnly?: boolean }) => {
      try {
        const updates = await softwareUpdateService.checkAllUpdates(options);
        return { success: true, data: updates };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-check-update', async (_, softwareKey: string, options?: any) => {
      try {
        const update = await softwareUpdateService.checkSoftwareUpdate(softwareKey, options);
        return { success: true, data: update };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-download-update', async (_, softwareKey: string, downloadUrl: string, savePath: string) => {
      try {
        const success = await softwareUpdateService.downloadUpdate(softwareKey, downloadUrl, savePath);
        return { success, data: { downloaded: success } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-install-update', async (_, softwareKey: string, installerPath: string) => {
      try {
        const success = await softwareUpdateService.installUpdate(softwareKey, installerPath);
        return { success, data: { installed: success } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-update-stats', () => {
      try {
        const stats = softwareUpdateService.getUpdateStats();
        return { success: true, data: stats };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('software-clear-update-cache', () => {
      try {
        softwareUpdateService.clearCache();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 离线服务IPC
    ipcMain.handle('offline-cache-data', async (_, data: any) => {
      try {
        const result = await offlineService.cacheData(data);
        return { success: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('offline-get-cached', (_, id: string) => {
      try {
        const result = offlineService.getCachedData(id);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('offline-install-model', async (_, model: any) => {
      try {
        const result = await offlineService.installOfflineModel(model);
        return { success: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('offline-load-model', async (_, modelId: string) => {
      try {
        const result = await offlineService.loadOfflineModel(modelId);
        return { success: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('offline-unload-model', async (_, modelId: string) => {
      try {
        const result = await offlineService.unloadOfflineModel(modelId);
        return { success: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('offline-inference', async (_, modelId: string, input: any) => {
      try {
        const result = await offlineService.offlineInference(modelId, input);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('offline-availability', () => {
      try {
        const result = offlineService.checkOfflineAvailability();
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('offline-sync', async () => {
      try {
        const result = await offlineService.syncToCloud();
        return { success: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('offline-stats', () => {
      try {
        const result = offlineService.getCacheStats();
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Photoshop自动化服务IPC
    ipcMain.handle('photoshop-detect-installation', async () => {
      try {
        const path = await photoshopAutomationService.detectPhotoshopInstallation();
        return { success: true, data: { path, detected: !!path } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('photoshop-set-path', async (_, path: string) => {
      try {
        photoshopAutomationService.setPhotoshopPath(path);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('photoshop-batch-process', async (_, config: any) => {
      try {
        const result = await photoshopAutomationService.batchProcess(config);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('photoshop-layer-operation', async (_, filePath: string, operations: any[]) => {
      try {
        const result = await photoshopAutomationService.smartLayerOperation(filePath, operations);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('photoshop-apply-filters', async (_, filePath: string, filters: any[]) => {
      try {
        const result = await photoshopAutomationService.applyIntelligentFilters(filePath, filters);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('photoshop-batch-export', async (_, filePath: string, exportConfigs: any[]) => {
      try {
        const result = await photoshopAutomationService.batchExport(filePath, exportConfigs);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('photoshop-get-document-info', async (_, filePath: string) => {
      try {
        const result = await photoshopAutomationService.getDocumentInfo(filePath);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('photoshop-get-status', () => {
      try {
        const status = photoshopAutomationService.getProcessingStatus();
        return { success: true, data: status };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('photoshop-stop-processing', () => {
      try {
        photoshopAutomationService.stopProcessing();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // AutoCAD自动化服务IPC
    ipcMain.handle('autocad-detect-installation', async () => {
      try {
        const path = await autocadAutomationService.detectAutoCADInstallation();
        return { success: true, data: { path, detected: !!path } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('autocad-set-path', async (_, path: string) => {
      try {
        autocadAutomationService.setAutoCADPath(path);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('autocad-batch-process', async (_, config: any) => {
      try {
        const result = await autocadAutomationService.batchProcess(config);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('autocad-manage-layers', async (_, filePath: string, standard: string, customStandard?: any) => {
      try {
        const result = await autocadAutomationService.manageLayers(filePath, standard as any, customStandard);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('autocad-auto-dimension', async (_, filePath: string, dimensionType: string, standard: string) => {
      try {
        const result = await autocadAutomationService.autoDimension(filePath, dimensionType as any, standard as any);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('autocad-batch-convert', async (_, inputFiles: string[], outputFormat: string, outputFolder: string, options?: any) => {
      try {
        const result = await autocadAutomationService.batchConvert(inputFiles, outputFormat as any, outputFolder, options);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('autocad-get-document-info', async (_, filePath: string) => {
      try {
        const result = await autocadAutomationService.getDocumentInfo(filePath);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('autocad-get-status', () => {
      try {
        const status = autocadAutomationService.getProcessingStatus();
        return { success: true, data: status };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('autocad-stop-processing', () => {
      try {
        autocadAutomationService.stopProcessing();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Blender自动化服务IPC
    ipcMain.handle('blender-detect-installation', async () => {
      try {
        const path = await blenderAutomationService.detectBlenderInstallation();
        return { success: true, data: { path, detected: !!path } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('blender-set-path', async (_, path: string) => {
      try {
        blenderAutomationService.setBlenderPath(path);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('blender-batch-process', async (_, config: any) => {
      try {
        const result = await blenderAutomationService.batchProcess(config);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('blender-optimize-model', async (_, filePath: string, optimizationLevel: string, targetPolygons?: number) => {
      try {
        const result = await blenderAutomationService.optimizeModel(filePath, optimizationLevel as any, targetPolygons);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('blender-manage-materials', async (_, filePath: string, materialType: string, customMaterial?: any) => {
      try {
        const result = await blenderAutomationService.manageMaterials(filePath, materialType as any, customMaterial);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('blender-batch-render', async (_, inputFiles: string[], renderSettings: any, outputFolder: string) => {
      try {
        const result = await blenderAutomationService.batchRender(inputFiles, renderSettings, outputFolder);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('blender-edit-keyframes', async (_, filePath: string, edits: any[]) => {
      try {
        const result = await blenderAutomationService.editKeyframes(filePath, edits);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('blender-get-model-info', async (_, filePath: string) => {
      try {
        const result = await blenderAutomationService.getModelInfo(filePath);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('blender-get-status', () => {
      try {
        const status = blenderAutomationService.getProcessingStatus();
        return { success: true, data: status };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('blender-stop-processing', () => {
      try {
        blenderAutomationService.stopProcessing();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 数据交换服务IPC
    ipcMain.handle('data-exchange-create-package', async (_, config: any, sourceFilePath: string) => {
      try {
        const result = await dataExchangeService.createExchangePackage(config, sourceFilePath);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('data-exchange-import-package', async (_, packageId: string, targetFilePath: string, config: any) => {
      try {
        const result = await dataExchangeService.importExchangePackage(packageId, targetFilePath, config);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('data-exchange-batch', async (_, configs: any[]) => {
      try {
        const result = await dataExchangeService.batchExchange(configs);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('data-exchange-history', () => {
      try {
        const history = dataExchangeService.getExchangeHistory();
        return { success: true, data: history };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('data-exchange-cleanup', async () => {
      try {
        await dataExchangeService.cleanup();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 图像生成服务IPC
    ipcMain.handle('image-generate', async (_, config: any) => {
      try {
        const task = await imageGenerationService.generateImage(config);
        return { success: true, data: task };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('image-generate-batch', async (_, configs: any[]) => {
      try {
        const tasks = await imageGenerationService.generateBatch(configs);
        return { success: true, data: tasks };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('image-generate-variations', async (_, baseImageUrl: string, count: number, variations: any) => {
      try {
        const tasks = await imageGenerationService.generateVariations(baseImageUrl, count, variations);
        return { success: true, data: tasks };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('image-optimize-prompt', async (_, prompt: string) => {
      try {
        const result = await imageGenerationService.optimizePrompt(prompt);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('image-cancel-task', async (_, taskId: string) => {
      try {
        const success = await imageGenerationService.cancelTask(taskId);
        return { success, data: { cancelled: success } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('image-get-task', async (_, taskId: string) => {
      try {
        const task = imageGenerationService.getTask(taskId);
        return { success: true, data: task };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('image-get-active-tasks', async () => {
      try {
        const tasks = imageGenerationService.getActiveTasks();
        return { success: true, data: tasks };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('image-save', async (_, taskId: string, filename?: string) => {
      try {
        const savePath = await imageGenerationService.saveImage(taskId, filename);
        return { success: true, data: { savePath } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('image-delete-history', async (_, historyId: string) => {
      try {
        const success = await imageGenerationService.deleteHistory(historyId);
        return { success, data: { deleted: success } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('image-toggle-favorite', async (_, historyId: string) => {
      try {
        const success = imageGenerationService.toggleFavorite(historyId);
        return { success, data: { favorited: success } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('image-get-stats', async () => {
      try {
        const stats = imageGenerationService.getStats();
        return { success: true, data: stats };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 语音识别服务IPC
    ipcMain.handle('speech-start-recording', async () => {
      try {
        await speechRecognitionService.startRecording();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-stop-recording', async () => {
      try {
        speechRecognitionService.stopRecording();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-start-realtime', async () => {
      try {
        await speechRecognitionService.startRealtimeRecognition();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-recognize-file', async (_, filePath: string) => {
      try {
        const result = await speechRecognitionService.recognizeAudioFile(filePath);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-get-status', () => {
      try {
        const status = speechRecognitionService.getRecordingStatus();
        return { success: true, data: status };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-get-commands', () => {
      try {
        const commands = speechRecognitionService.getCommands();
        return { success: true, data: commands };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-add-command', async (_, command: any) => {
      try {
        speechRecognitionService.addCommand(command);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-remove-command', async (_, commandId: string) => {
      try {
        const success = speechRecognitionService.removeCommand(commandId);
        return { success, data: { removed: success } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-toggle-command', async (_, commandId: string) => {
      try {
        const enabled = speechRecognitionService.toggleCommand(commandId);
        return { success: true, data: { enabled } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-get-history', async (_, limit?: number) => {
      try {
        const history = speechRecognitionService.getHistory(limit);
        return { success: true, data: history };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-clear-history', async () => {
      try {
        speechRecognitionService.clearHistory();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-update-config', async (_, config: any) => {
      try {
        // 更新语音识别配置
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('speech-get-config', async () => {
      try {
        // 获取语音识别配置
        const defaultConfig = {
          language: 'zh-CN',
          format: 'wav',
          sampleRate: 16000,
          channels: 1,
          enablePunctuation: true,
          enableTimestamps: true,
          enableWordConfidence: true,
          maxRecordingTime: 60,
          silenceTimeout: 3000
        };
        return { success: true, data: defaultConfig };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Shell操作IPC
    ipcMain.handle('shell-open-external', async (_, url: string) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // API调用IPC - 连接到后端服务
    const apiBaseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001/api' 
      : 'https://api.aiplatform.com/api';

    ipcMain.handle('api-init', async () => {
      try {
        // 这里可以初始化API连接，比如设置认证token等
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('api-post', async (_, endpoint: string, data: any) => {
      try {
        const axios = require('axios');
        const response = await axios.post(`${apiBaseUrl}${endpoint}`, data, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.API_TOKEN || 'demo-token'}`
          },
          timeout: 120000 // 2分钟超时
        });
        
        return { success: true, data: response.data };
      } catch (error) {
        console.error('API POST请求失败:', error);
        return { 
          success: false, 
          error: error.response?.data?.message || error.message || '请求失败' 
        };
      }
    });

    ipcMain.handle('api-get', async (_, endpoint: string) => {
      try {
        const axios = require('axios');
        const response = await axios.get(`${apiBaseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${process.env.API_TOKEN || 'demo-token'}`
          },
          timeout: 60000
        });
        
        return { success: true, data: response.data };
      } catch (error) {
        console.error('API GET请求失败:', error);
        return { 
          success: false, 
          error: error.response?.data?.message || error.message || '请求失败' 
        };
      }
    });

    // WebSocket客户端IPC
    ipcMain.handle('websocket-connect', async (_, config: { url: string; token?: string }) => {
      try {
        const connected = await webSocketManager.initialize(config);
        return { success: connected };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('websocket-disconnect', async () => {
      try {
        webSocketManager.disconnect();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('websocket-status', () => {
      try {
        const client = webSocketManager.getClient();
        if (!client) {
          return { success: true, data: { status: 'not_initialized' } };
        }
        
        return { 
          success: true, 
          data: { 
            status: client.getConnectionStatus(),
            config: client.getConfig()
          } 
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('websocket-send-status', async (_, status: any) => {
      try {
        webSocketManager.sendStatus(status);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('websocket-authenticate', async (_, token: string) => {
      try {
        const client = webSocketManager.getClient();
        if (client) {
          client.authenticate(token);
          return { success: true };
        } else {
          return { success: false, error: 'WebSocket client not initialized' };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 设置WebSocket事件监听器，将事件转发给渲染进程
    webSocketManager.on('connected', () => {
      this.mainWindow?.webContents.send('websocket-connected');
    });

    webSocketManager.on('disconnected', (reason) => {
      this.mainWindow?.webContents.send('websocket-disconnected', reason);
    });

    webSocketManager.on('error', (error) => {
      this.mainWindow?.webContents.send('websocket-error', error);
    });

    webSocketManager.on('task', async (task) => {
      console.log('收到AI任务:', task);
      
      // 转发给渲染进程显示
      this.mainWindow?.webContents.send('websocket-task', task);
      
      // 发送处理中状态
      webSocketManager.sendStatus({
        taskId: task.id,
        status: 'processing',
        message: `开始处理任务: ${task.command}`,
        timestamp: Date.now()
      });
      
      try {
        // 处理任务
        const result = await taskProcessorService.processTask(task);
        
        // 发送完成状态
        webSocketManager.sendStatus({
          taskId: task.id,
          status: 'completed',
          message: `任务完成: ${task.command}`,
          result: result,
          timestamp: Date.now()
        });
        
      } catch (error) {
        console.error('任务处理失败:', error);
        
        // 发送失败状态
        webSocketManager.sendStatus({
          taskId: task.id,
          status: 'failed',
          message: `任务失败: ${task.command}`,
          error: error.message,
          timestamp: Date.now()
        });
      }
    });

    webSocketManager.on('task_cancel', (taskId) => {
      console.log('收到任务取消请求:', taskId);
      
      // 转发给渲染进程显示
      this.mainWindow?.webContents.send('websocket-task-cancel', taskId);
      
      // 取消任务
      const cancelled = taskProcessorService.cancelTask(taskId);
      
      if (cancelled) {
        webSocketManager.sendStatus({
          taskId: taskId,
          status: 'cancelled',
          message: '任务已被取消',
          timestamp: Date.now()
        });
      } else {
        webSocketManager.sendStatus({
          taskId: taskId,
          status: 'failed',
          message: '任务不存在或已完成，无法取消',
          timestamp: Date.now()
        });
      }
    });

    webSocketManager.on('authenticated', (data) => {
      this.mainWindow?.webContents.send('websocket-authenticated', data);
    });

    webSocketManager.on('authentication_error', (error) => {
      this.mainWindow?.webContents.send('websocket-authentication-error', error);
    });

    // 监听任务处理器事件
    taskProcessorService.on('task_started', ({ taskId, task }) => {
      console.log(`任务开始处理: ${taskId} - ${task.command}`);
      
      statusTrackingService.startTaskTracking(taskId, `开始执行: ${task.command}`);
    });

    taskProcessorService.on('task_completed', ({ taskId, task, result }) => {
      console.log(`任务完成: ${taskId} - ${task.command}`);
      
      statusTrackingService.completeTask(taskId, `任务完成: ${task.command}`);
      
      webSocketManager.sendStatus({
        taskId: taskId,
        status: 'completed',
        progress: 100,
        message: `任务完成: ${task.command}`,
        result: result,
        timestamp: Date.now()
      });
    });

    taskProcessorService.on('task_failed', ({ taskId, task, error }) => {
      console.error(`任务失败: ${taskId} - ${task.command}`, error);
      
      statusTrackingService.failTask(taskId, error);
      
      webSocketManager.sendStatus({
        taskId: taskId,
        status: 'failed',
        message: `任务失败: ${task.command}`,
        error: error,
        timestamp: Date.now()
      });
    });

    taskProcessorService.on('task_cancelled', ({ taskId, context }) => {
      console.log(`任务已取消: ${taskId}`);
      
      statusTrackingService.cancelTask(taskId);
      
      webSocketManager.sendStatus({
        taskId: taskId,
        status: 'cancelled',
        message: '任务已被取消',
        timestamp: Date.now()
      });
    });

    // 监听状态跟踪服务的事件
    statusTrackingService.on('status_update', (statusMessage) => {
      webSocketManager.sendStatus(statusMessage);
    });

    statusTrackingService.on('status_updates_batch', (updates) => {
      // 批量发送状态更新
      updates.forEach(status => {
        webSocketManager.sendStatus(status);
      });
    });

    statusTrackingService.on('task_completed', ({ taskId, progress }) => {
      this.mainWindow?.webContents.send('task-completed', {
        taskId,
        progress,
        report: statusTrackingService.generateProgressReport(taskId)
      });
    });

    statusTrackingService.on('task_failed', ({ taskId, progress, error }) => {
      this.mainWindow?.webContents.send('task-failed', {
        taskId,
        progress,
        error,
        report: statusTrackingService.generateProgressReport(taskId)
      });
    });

    // 定期发送系统性能指标
    setInterval(() => {
      const activeTasks = statusTrackingService.getActiveTasks();
      
      activeTasks.forEach(taskId => {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        statusTrackingService.recordPerformanceMetrics(taskId, {
          taskId: taskId,
          cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // 转换为毫秒
          memoryUsage: memUsage.heapUsed / 1024 / 1024 // 转换为MB
        });
      });
    }, 5000); // 每5秒收集一次性能指标
  }

  private setupWebSocket() {
    // 初始化WebSocket连接配置
    const wsUrl = process.env.NODE_ENV === 'development' 
      ? 'ws://localhost:3001' 
      : 'wss://api.aiplatform.com';

    // 从存储中获取保存的token（如果有的话）
    const savedToken = store.get('websocket_token') as string;
    
    // 初始化WebSocket连接
    webSocketManager.initialize({
      url: wsUrl,
      token: savedToken,
      reconnectAttempts: 5,
      reconnectDelay: 3000
    }).then((connected) => {
      console.log('WebSocket初始化结果:', connected);
      if (!connected) {
        console.error('WebSocket连接失败，将在后台自动重连');
      }
    }).catch((error) => {
      console.error('WebSocket初始化错误:', error);
    });

    // 设置心跳检测
    setInterval(() => {
      if (webSocketManager.isConnected()) {
        const client = webSocketManager.getClient();
        client?.sendHeartbeat();
      }
    }, 30000); // 每30秒发送一次心跳
  }

  private setupUpdateService() {
    // 设置更新检查间隔（每24小时检查一次）
    updateService.setUpdateCheckInterval(24 * 60 * 60 * 1000);
    
    // 启动时检查更新
    updateService.checkForUpdatesOnStartup();
    
    // 监听更新事件
    updateService.on('update-available', (info) => {
      console.log('Update available:', info);
    });

    updateService.on('download-progress', (progress) => {
      console.log('Download progress:', progress);
    });

    updateService.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
    });

    updateService.on('error', (error) => {
      console.error('Update error:', error);
    });
  }

  private setupTrayService() {
    // 初始化托盘服务
    trayService.initialize();
    
    // 绑定托盘事件
    trayService.on('show-main-window', () => {
      this.createMainWindow();
    });
    
    trayService.on('open-ai-assistant', () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('navigate-to', '/ai');
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
    
    trayService.on('open-software-connect', () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('navigate-to', '/software');
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
    
    trayService.on('open-workflows', () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('navigate-to', '/workflows');
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
    
    trayService.on('open-settings', () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('navigate-to', '/settings');
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
    
    trayService.on('open-user-manual', () => {
      shell.openExternal('https://docs.ai.yourdomain.com/user-manual');
    });
    
    trayService.on('open-support', () => {
      shell.openExternal('mailto:support@ai.yourdomain.com');
    });
    
    trayService.on('notification-click', (notificationId: string, notification: any) => {
      console.log('通知被点击:', notificationId, notification);
      // 可以根据通知类型执行不同操作
      if (notification.type === 'task_complete') {
        if (this.mainWindow) {
          this.mainWindow.webContents.send('navigate-to', '/tasks');
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      }
    });
    
    trayService.on('quit-requested', () => {
      const choice = dialog.showMessageBoxSync(this.mainWindow!, {
        type: 'question',
        buttons: ['取消', '退出'],
        defaultId: 0,
        title: 'AI设计平台',
        message: '确定要退出AI设计平台吗？',
        detail: '退出后桌面应用将停止运行，但网页版仍然可用。'
      });
      
      if (choice === 1) {
        trayService.destroy();
        app.quit();
      }
    });

    // 注意：softwareIntegrationService不是EventEmitter，无法监听事件
    // 如需监听软件连接状态变化，可以在软件连接时主动调用updateTrayStatus

    // 监听任务完成通知
    taskProcessorService.on('task-completed', (task) => {
      trayService.showNotification({
        title: '任务完成',
        body: `任务"${task.name}"已成功完成`,
        icon: 'assets/success.png'
      });
    });

    // 监听错误通知
    taskProcessorService.on('task-error', (task, error) => {
      trayService.showNotification({
        title: '任务失败',
        body: `任务"${task.name}"执行失败: ${error.message}`,
        icon: 'assets/error.png'
      });
    });
  }
  
  private updateTrayStatus(status: any) {
    // 更新托盘状态
    const connectedSoftware = status.connected || [];
    const subscriptionStatus = (store.get('user.subscription') as string) || 'FREE';

    trayService.updateStatus({
      connection: status.connection || 'disconnected',
      software: connectedSoftware.map((s: any) => s.name),
      subscription: subscriptionStatus
    });
    
    // 设置托盘图标状态
    if (status.connection === 'connected' && connectedSoftware.length > 0) {
      trayService.setTrayIcon('active');
    } else if (status.connection === 'error') {
      trayService.setTrayIcon('error');
    } else {
      trayService.setTrayIcon('normal');
    }
    
    // 更新工具提示
    const tooltip = `AI设计平台 - ${connectedSoftware.length}个软件已连接`;
    trayService.updateToolTip(tooltip);
  }

  private async openFileDialog(): Promise<{ filePath: string; fileName: string } | null> {
    if (!this.mainWindow) return null;

    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: '所有文件', extensions: ['*'] },
        { name: '文本文件', extensions: ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx'] },
        { name: '代码文件', extensions: ['py', 'java', 'cpp', 'c', 'go', 'rs'] },
        { name: '配置文件', extensions: ['yaml', 'yml', 'xml', 'ini', 'conf'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const fileName = filePath.split(/[\\/]/).pop() || 'unknown';

    return { filePath, fileName };
  }

  private async saveFileDialog(defaultPath?: string): Promise<string | null> {
    if (!this.mainWindow) return null;

    const result = await dialog.showSaveDialog(this.mainWindow, {
      defaultPath,
      filters: [
        { name: '所有文件', extensions: ['*'] },
        { name: '文本文件', extensions: ['txt'] },
        { name: 'JSON文件', extensions: ['json'] },
        { name: 'Markdown文件', extensions: ['md'] }
      ]
    });

    return result.canceled ? null : result.filePath;
  }

  private showAboutDialog() {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '关于 AI智能体平台',
      message: 'AI智能体平台',
      detail: `版本: ${app.getVersion()}\n基于 Electron + React + TypeScript\n\n一个强大的AI驱动开发平台，\n集成智能推荐、代码分析、\n智能客服等功能。`
    });
  }

  private getAppIcon(): string {
    // TODO: 添加应用图标
    return '';
  }

  private restoreWindowState() {
    const bounds = store.get('windowBounds') as { width: number; height: number; x?: number; y?: number };
    
    if (bounds) {
      this.mainWindow?.setBounds(bounds);
    }

    // 保存窗口状态
    this.mainWindow?.on('resize', () => {
      const bounds = this.mainWindow?.getBounds();
      if (bounds) {
        store.set('windowBounds', bounds);
      }
    });

    this.mainWindow?.on('move', () => {
      const bounds = this.mainWindow?.getBounds();
      if (bounds) {
        store.set('windowBounds', bounds);
      }
    });
  }
}

// 创建应用实例
new DesktopApp();