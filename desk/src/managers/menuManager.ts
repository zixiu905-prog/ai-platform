import { Menu, MenuItem, MenuItemConstructorOptions, app, shell, dialog, BrowserWindow } from 'electron';
import { WindowManager } from './windowManager';
import { ConfigService } from '../services/configService';

export interface MenuTemplate {
  label?: string;
  submenu?: MenuItemConstructorOptions[];
  role?: string;
  type?: 'separator';
  accelerator?: string;
  click?: () => void;
}

export class MenuManager {
  private static instance: MenuManager;
  private windowManager: WindowManager;
  private configService: ConfigService;
  
  private constructor() {
    this.windowManager = WindowManager.getInstance();
    this.configService = ConfigService.getInstance();
  }
  
  static getInstance(): MenuManager {
    if (!MenuManager.instance) {
      MenuManager.instance = new MenuManager();
    }
    return MenuManager.instance;
  }
  
  /**
   * 创建应用菜单
   */
  createApplicationMenu(): Menu {
    const isMac = process.platform === 'darwin';
    
    const template: MenuItemConstructorOptions[] = [
      ...(isMac ? [this.createMacOSMenu()] : []),
      this.createFileMenu(),
      this.createEditMenu(),
      this.createViewMenu(),
      this.createProjectMenu(),
      this.createAIMenu(),
      this.createToolsMenu(),
      this.createWindowMenu(),
      this.createHelpMenu()
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    
    return menu;
  }
  
  /**
   * 创建上下文菜单
   */
  createContextMenu(context: 'editor' | 'fileTree' | 'project'): Menu {
    let template: MenuItemConstructorOptions[] = [];
    
    switch (context) {
      case 'editor':
        template = this.createEditorContextMenu();
        break;
      case 'fileTree':
        template = this.createFileTreeContextMenu();
        break;
      case 'project':
        template = this.createProjectContextMenu();
        break;
    }
    
    return Menu.buildFromTemplate(template);
  }
  
  /**
   * 创建托盘菜单
   */
  createTrayMenu(): Menu {
    const template: MenuItemConstructorOptions[] = [
      {
        label: '显示主窗口',
        click: () => {
          const mainWindow = this.windowManager.getMainWindow();
          if (mainWindow) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: '打开AI助手',
        click: () => {
          this.windowManager.createAIChatWindow();
        }
      },
      {
        label: '图像生成',
        click: () => {
          const mainWindow = this.windowManager.getMainWindow();
          if (mainWindow) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('open-image-generation');
          }
        }
      },
      {
        label: '自然语言设计',
        click: () => {
          const mainWindow = this.windowManager.getMainWindow();
          if (mainWindow) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('open-natural-language-design');
          }
        }
      },
      {
        label: '语音识别',
        click: () => {
          const mainWindow = this.windowManager.getMainWindow();
          if (mainWindow) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('open-voice-test');
          }
        }
      },
      { type: 'separator' },
      {
        label: '设置',
        click: () => {
          this.windowManager.createSettingsWindow();
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ];
    
    return Menu.buildFromTemplate(template);
  }
  
  private createMacOSMenu(): MenuItemConstructorOptions {
    return {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    };
  }
  
  private createFileMenu(): MenuItemConstructorOptions {
    return {
      label: '文件',
      submenu: [
        {
          label: '新建项目',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            this.sendToMainWindow('menu-new-project');
          }
        },
        {
          label: '打开项目',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            this.openProject();
          }
        },
        {
          label: '打开文件',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            this.openFile();
          }
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            this.sendToMainWindow('menu-save');
          }
        },
        {
          label: '另存为',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            this.sendToMainWindow('menu-save-as');
          }
        },
        {
          label: '保存所有',
          accelerator: 'CmdOrCtrl+Alt+S',
          click: () => {
            this.sendToMainWindow('menu-save-all');
          }
        },
        { type: 'separator' },
        {
          label: '最近的文件',
          submenu: this.createRecentFilesMenu()
        },
        {
          label: '最近的项目',
          submenu: this.createRecentProjectsMenu()
        },
        { type: 'separator' },
        {
          label: '导出项目',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            this.sendToMainWindow('menu-export-project');
          }
        },
        {
          label: '导入项目',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            this.importProject();
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    };
  }
  
  private createEditMenu(): MenuItemConstructorOptions {
    return {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        {
          label: '选择性粘贴',
          submenu: [
            {
              label: '纯文本',
              click: () => {
                this.sendToMainWindow('menu-paste-plain-text');
              }
            }
          ]
        },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
        { type: 'separator' },
        {
          label: '查找',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            this.sendToMainWindow('menu-find');
          }
        },
        {
          label: '替换',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            this.sendToMainWindow('menu-replace');
          }
        },
        {
          label: '在文件中查找',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            this.sendToMainWindow('menu-find-in-files');
          }
        },
        { type: 'separator' },
        {
          label: '行操作',
          submenu: [
            {
              label: '复制行',
              accelerator: 'CmdOrCtrl+Shift+Up',
              click: () => {
                this.sendToMainWindow('menu-duplicate-line');
              }
            },
            {
              label: '删除行',
              accelerator: 'CmdOrCtrl+Shift+K',
              click: () => {
                this.sendToMainWindow('menu-delete-line');
              }
            },
            {
              label: '向上移动行',
              accelerator: 'Alt+Up',
              click: () => {
                this.sendToMainWindow('menu-move-line-up');
              }
            },
            {
              label: '向下移动行',
              accelerator: 'Alt+Down',
              click: () => {
                this.sendToMainWindow('menu-move-line-down');
              }
            }
          ]
        }
      ]
    };
  }
  
  private createViewMenu(): MenuItemConstructorOptions {
    return {
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
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: '显示/隐藏侧边栏',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            this.sendToMainWindow('menu-toggle-sidebar');
          }
        },
        {
          label: '显示/隐藏终端',
          accelerator: 'CmdOrCtrl+`',
          click: () => {
            this.sendToMainWindow('menu-toggle-terminal');
          }
        },
        {
          label: '显示/隐藏输出面板',
          accelerator: 'CmdOrCtrl+J',
          click: () => {
            this.sendToMainWindow('menu-toggle-output');
          }
        }
      ]
    };
  }
  
  private createProjectMenu(): MenuItemConstructorOptions {
    return {
      label: '项目',
      submenu: [
        {
          label: '运行项目',
          accelerator: 'F5',
          click: () => {
            this.sendToMainWindow('menu-run-project');
          }
        },
        {
          label: '调试项目',
          accelerator: 'Shift+F5',
          click: () => {
            this.sendToMainWindow('menu-debug-project');
          }
        },
        {
          label: '构建项目',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => {
            this.sendToMainWindow('menu-build-project');
          }
        },
        { type: 'separator' },
        {
          label: '清理项目',
          click: () => {
            this.sendToMainWindow('menu-clean-project');
          }
        },
        {
          label: '项目设置',
          click: () => {
            this.sendToMainWindow('menu-project-settings');
          }
        },
        { type: 'separator' },
        {
          label: '同步到云端',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            this.sendToMainWindow('menu-sync-project');
          }
        }
      ]
    };
  }
  
  private createAIMenu(): MenuItemConstructorOptions {
    return {
      label: 'AI助手',
      submenu: [
        {
          label: '智能推荐',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            this.sendToMainWindow('menu-ai-recommend');
          }
        },
        {
          label: '代码分析',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            this.sendToMainWindow('menu-code-analysis');
          }
        },
        {
          label: '智能客服',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            this.windowManager.createAIChatWindow();
          }
        },
        {
          label: '图像生成',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            this.sendToMainWindow('open-image-generation');
          }
        },
        {
          label: '自然语言设计',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            this.sendToMainWindow('open-natural-language-design');
          }
        },
        {
          label: '管理员工作流',
          accelerator: 'CmdOrCtrl+Shift+W',
          click: () => {
            this.sendToMainWindow('open-admin-workflows');
          }
        },
        {
          label: '设计模板库',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            this.sendToMainWindow('open-design-templates');
          }
        },
        {
          label: '语音识别',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => {
            this.sendToMainWindow('open-voice-test');
          }
        },
        { type: 'separator' },
        {
          label: '代码补全',
          accelerator: 'CmdOrCtrl+Space',
          click: () => {
            this.sendToMainWindow('menu-ai-complete');
          }
        },
        {
          label: '代码优化',
          click: () => {
            this.sendToMainWindow('menu-ai-optimize');
          }
        },
        {
          label: '生成文档',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            this.sendToMainWindow('menu-generate-docs');
          }
        },
        { type: 'separator' },
        {
          label: 'AI设置',
          click: () => {
            this.windowManager.createSettingsWindow();
            // 延迟发送消息，等待设置窗口加载完成
            setTimeout(() => {
              this.sendToWindow('settings', 'menu-open-ai-settings');
            }, 500);
          }
        }
      ]
    };
  }
  
  private createToolsMenu(): MenuItemConstructorOptions {
    return {
      label: '工具',
      submenu: [
        {
          label: '代码格式化',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            this.sendToMainWindow('menu-format-code');
          }
        },
        {
          label: '代码检查',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => {
            this.sendToMainWindow('menu-lint-code');
          }
        },
        { type: 'separator' },
        {
          label: 'Git集成',
          submenu: [
            {
              label: '提交',
              accelerator: 'CmdOrCtrl+Shift+G',
              click: () => {
                this.sendToMainWindow('menu-git-commit');
              }
            },
            {
              label: '推送',
              click: () => {
                this.sendToMainWindow('menu-git-push');
              }
            },
            {
              label: '拉取',
              click: () => {
                this.sendToMainWindow('menu-git-pull');
              }
            },
            {
              label: '分支管理',
              click: () => {
                this.sendToMainWindow('menu-git-branches');
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: '插件管理',
          click: () => {
            this.sendToMainWindow('menu-plugins');
          }
        },
        {
          label: '性能分析',
          click: () => {
            this.sendToMainWindow('menu-performance-analysis');
          }
        }
      ]
    };
  }
  
  private createWindowMenu(): MenuItemConstructorOptions {
    return {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        { type: 'separator' },
        {
          label: 'AI助手窗口',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            this.windowManager.createAIChatWindow();
          }
        },
        {
          label: '设置',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            this.windowManager.createSettingsWindow();
          }
        },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' as const, role: undefined as undefined },
          { role: 'front' },
          { role: 'window' }
        ] as const : []),
        ...(process.platform !== 'darwin' ? [
          { type: 'separator' as const, role: undefined as undefined },
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { role: 'togglefullscreen' }
        ] as const : [])
      ]
    };
  }
  
  private createHelpMenu(): MenuItemConstructorOptions {
    return {
      label: '帮助',
      submenu: [
        {
          label: '欢迎页面',
          click: () => {
            this.sendToMainWindow('menu-welcome');
          }
        },
        {
          label: '键盘快捷键',
          accelerator: 'F1',
          click: () => {
            this.sendToMainWindow('menu-keyboard-shortcuts');
          }
        },
        {
          label: '帮助文档',
          click: () => {
            shell.openExternal('https://docs.aiplatform.com');
          }
        },
        { type: 'separator' },
        {
          label: '检查更新',
          click: () => {
            this.sendToMainWindow('menu-check-updates');
          }
        },
        {
          label: '反馈问题',
          click: () => {
            shell.openExternal('https://github.com/aiplatform/issues');
          }
        },
        { type: 'separator' },
        {
          label: '关于',
          click: () => {
            this.showAboutDialog();
          }
        }
      ]
    };
  }
  
  private createEditorContextMenu(): MenuItemConstructorOptions[] {
    return [
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      { role: 'selectAll' },
      { type: 'separator' },
      {
        label: '代码分析',
        click: () => {
          this.sendToMainWindow('context-code-analysis');
        }
      },
      {
        label: 'AI优化',
        click: () => {
          this.sendToMainWindow('context-ai-optimize');
        }
      }
    ];
  }
  
  private createFileTreeContextMenu(): MenuItemConstructorOptions[] {
    return [
      {
        label: '新建文件',
        click: () => {
          this.sendToMainWindow('context-new-file');
        }
      },
      {
        label: '新建文件夹',
        click: () => {
          this.sendToMainWindow('context-new-folder');
        }
      },
      { type: 'separator' },
      {
        label: '重命名',
        click: () => {
          this.sendToMainWindow('context-rename');
        }
      },
      {
        label: '删除',
        click: () => {
          this.sendToMainWindow('context-delete');
        }
      },
      { type: 'separator' },
      {
        label: '在终端中打开',
        click: () => {
          this.sendToMainWindow('context-open-terminal');
        }
      },
      {
        label: '在文件浏览器中显示',
        click: () => {
          this.sendToMainWindow('context-reveal-file');
        }
      }
    ];
  }
  
  private createProjectContextMenu(): MenuItemConstructorOptions[] {
    return [
      {
        label: '运行',
        accelerator: 'F5',
        click: () => {
          this.sendToMainWindow('context-run');
        }
      },
      {
        label: '调试',
        accelerator: 'Shift+F5',
        click: () => {
          this.sendToMainWindow('context-debug');
        }
      },
      {
        label: '构建',
        click: () => {
          this.sendToMainWindow('context-build');
        }
      },
      { type: 'separator' },
      {
        label: '项目设置',
        click: () => {
          this.sendToMainWindow('context-project-settings');
        }
      }
    ];
  }
  
  private createRecentFilesMenu(): MenuItemConstructorOptions[] {
    // TODO: 从配置中获取最近文件列表
    return [
      { label: '暂无最近文件', enabled: false }
    ];
  }
  
  private createRecentProjectsMenu(): MenuItemConstructorOptions[] {
    const recentProjects = this.configService.getRecentProjects();
    
    if (recentProjects.length === 0) {
      return [{ label: '暂无最近项目', enabled: false }];
    }
    
    return recentProjects.map(project => ({
      label: project.name,
      click: () => {
        this.sendToMainWindow('menu-open-recent-project', project.path);
      }
    }));
  }
  
  private async openProject(): Promise<void> {
    const mainWindow = this.windowManager.getMainWindow();
    if (!mainWindow) return;
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择项目文件夹'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      this.sendToMainWindow('menu-open-project', result.filePaths[0]);
    }
  }
  
  private async openFile(): Promise<void> {
    const mainWindow = this.windowManager.getMainWindow();
    if (!mainWindow) return;
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: '所有文件', extensions: ['*'] },
        { name: '代码文件', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go'] }
      ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      this.sendToMainWindow('menu-open-file', result.filePaths[0]);
    }
  }
  
  private async importProject(): Promise<void> {
    const mainWindow = this.windowManager.getMainWindow();
    if (!mainWindow) return;
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: '项目文件', extensions: ['zip', 'tar', 'gz'] }
      ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      this.sendToMainWindow('menu-import-project', result.filePaths[0]);
    }
  }
  
  private sendToMainWindow(channel: string, ...args: any[]): void {
    const mainWindow = this.windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args);
    }
  }
  
  private sendToWindow(windowId: string, channel: string, ...args: any[]): void {
    const window = this.windowManager.getWindow(windowId);
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, ...args);
    }
  }
  
  private showAboutDialog(): void {
    const mainWindow = this.windowManager.getMainWindow();
    if (!mainWindow) return;
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '关于 AI智能体平台',
      message: 'AI智能体平台',
      detail: `版本: ${app.getVersion()}\n基于 Electron + React + TypeScript\n\n一个强大的AI驱动开发平台，\n集成智能推荐、代码分析、\n智能客服等功能。`
    });
  }
}