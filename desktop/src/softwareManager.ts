/**
 * 软件管理器
 * 检测、启动和控制本地设计软件
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SoftwareInfo {
  id: string;
  name: string;
  displayName: string;
  version?: string;
  path?: string;
  executable?: string;
  icon?: string;
  category: 'design' | 'development' | 'office' | 'media' | 'other';
  supportedActions: string[];
  isInstalled: boolean;
  running?: boolean;
}

export interface SoftwareAction {
  id: string;
  name: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'file' | 'directory';
    required: boolean;
    description?: string;
  }>;
}

export class SoftwareManager {
  private static instance: SoftwareManager;
  private installedSoftware: Map<string, SoftwareInfo> = new Map();
  private runningProcesses: Map<string, any> = new Map();

  constructor() {
    this.detectInstalledSoftware();
  }

  public static getInstance(): SoftwareManager {
    if (!SoftwareManager.instance) {
      SoftwareManager.instance = new SoftwareManager();
    }
    return SoftwareManager.instance;
  }

  /**
   * 获取支持的软件列表
   */
  public getSupportedSoftware(): SoftwareInfo[] {
    const supportedSoftware: SoftwareInfo[] = [
      // Adobe 套件
      {
        id: 'photoshop',
        name: 'Adobe Photoshop',
        displayName: 'Photoshop',
        category: 'design',
        supportedActions: ['open', 'new', 'batch', 'export'],
        isInstalled: false
      },
      {
        id: 'illustrator',
        name: 'Adobe Illustrator',
        displayName: 'Illustrator',
        category: 'design',
        supportedActions: ['open', 'new', 'export', 'save-as'],
        isInstalled: false
      },
      {
        id: 'premiere',
        name: 'Adobe Premiere Pro',
        displayName: 'Premiere Pro',
        category: 'media',
        supportedActions: ['open', 'new', 'export', 'render'],
        isInstalled: false
      },

      // Figma
      {
        id: 'figma',
        name: 'Figma',
        displayName: 'Figma',
        category: 'design',
        supportedActions: ['open', 'new', 'export'],
        isInstalled: false
      },

      // Sketch (仅macOS)
      {
        id: 'sketch',
        name: 'Sketch',
        displayName: 'Sketch',
        category: 'design',
        supportedActions: ['open', 'new', 'export'],
        isInstalled: false
      },

      // 基础工具
      {
        id: 'vscode',
        name: 'Visual Studio Code',
        displayName: 'VS Code',
        category: 'development',
        supportedActions: ['open', 'new', 'install-extension'],
        isInstalled: false
      },
      {
        id: 'notepad',
        name: 'Notepad',
        displayName: '记事本',
        category: 'other',
        supportedActions: ['open', 'new'],
        isInstalled: true // 基础工具总是可用
      }
    ];

    // 合并检测结果
    return supportedSoftware.map(software => {
      const detected = this.installedSoftware.get(software.id);
      return detected ? { ...software, ...detected } : software;
    });
  }

  /**
   * 获取已安装的软件列表
   */
  public async getInstalledSoftware(): Promise<SoftwareInfo[]> {
    await this.detectInstalledSoftware();
    return Array.from(this.installedSoftware.values());
  }

  /**
   * 检测已安装的软件
   */
  private async detectInstalledSoftware(): Promise<void> {
    const platform = process.platform;

    try {
      if (platform === 'win32') {
        await this.detectWindowsSoftware();
      } else if (platform === 'darwin') {
        await this.detectMacSoftware();
      } else if (platform === 'linux') {
        await this.detectLinuxSoftware();
      }
    } catch (error) {
      console.error('检测安装软件失败:', error);
    }
  }

  /**
   * 检测Windows软件
   */
  private async detectWindowsSoftware(): Promise<void> {
    try {
      // 检查常用安装路径
      const programPaths = [
        'C:\\Program Files\\',
        'C:\\Program Files (x86)\\',
        'C:\\Program Files\\Adobe\\',
        'C:\\Program Files (x86)\\Adobe\\'
      ];

      const softwareChecks: Array<{
        id: string;
        paths: string[];
        executables: string[];
      }> = [
        {
          id: 'photoshop',
          paths: ['Adobe\\Adobe Photoshop', 'Adobe\\Photoshop'],
          executables: ['Photoshop.exe', 'Photoshop.exe']
        },
        {
          id: 'illustrator',
          paths: ['Adobe\\Adobe Illustrator', 'Adobe\\Illustrator'],
          executables: ['Illustrator.exe', 'illustrator.exe']
        },
        {
          id: 'premiere',
          paths: ['Adobe\\Adobe Premiere Pro', 'Adobe\\Premiere Pro'],
          executables: ['Adobe Premiere Pro.exe', 'Premiere Pro.exe']
        },
        {
          id: 'vscode',
          paths: ['Microsoft VS Code'],
          executables: ['Code.exe']
        }
      ];

      for (const programPath of programPaths) {
        if (!fs.existsSync(programPath)) continue;

        for (const check of softwareChecks) {
          for (const softwarePath of check.paths) {
            const fullPath = path.join(programPath, softwarePath);
            if (fs.existsSync(fullPath)) {
              for (const executable of check.executables) {
                const exePath = path.join(fullPath, executable);
                if (fs.existsSync(exePath)) {
                  this.installedSoftware.set(check.id, {
                    id: check.id,
                    name: this.getSoftwareName(check.id),
                    displayName: this.getDisplayName(check.id),
                    path: fullPath,
                    executable: exePath,
                    category: 'design',
                    supportedActions: this.getSupportedActions(check.id),
                    isInstalled: true,
                    running: false
                  });
                  break;
                }
              }
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Windows软件检测失败:', error);
    }
  }

  /**
   * 检测macOS软件
   */
  private async detectMacSoftware(): Promise<void> {
    try {
      // 检查Applications目录
      const applicationsPath = '/Applications';
      
      const softwareChecks = [
        {
          id: 'photoshop',
          path: 'Adobe Photoshop.app',
          executable: 'Contents/MacOS/Adobe Photoshop'
        },
        {
          id: 'illustrator',
          path: 'Adobe Illustrator.app',
          executable: 'Contents/MacOS/Adobe Illustrator'
        },
        {
          id: 'figma',
          path: 'Figma.app',
          executable: 'Contents/MacOS/Figma'
        },
        {
          id: 'sketch',
          path: 'Sketch.app',
          executable: 'Contents/MacOS/Sketch'
        },
        {
          id: 'vscode',
          path: 'Visual Studio Code.app',
          executable: 'Contents/MacOS/Electron'
        }
      ];

      for (const check of softwareChecks) {
        const fullPath = path.join(applicationsPath, check.path);
        if (fs.existsSync(fullPath)) {
          this.installedSoftware.set(check.id, {
            id: check.id,
            name: this.getSoftwareName(check.id),
            displayName: this.getDisplayName(check.id),
            path: fullPath,
            executable: path.join(fullPath, check.executable),
            category: 'design',
            supportedActions: this.getSupportedActions(check.id),
            isInstalled: true,
            running: false
          });
        }
      }
    } catch (error) {
      console.error('macOS软件检测失败:', error);
    }
  }

  /**
   * 检测Linux软件
   */
  private async detectLinuxSoftware(): Promise<void> {
    try {
      // 使用which命令检测常用软件
      const commands = [
        { id: 'figma-linux', command: 'figma-linux', name: 'Figma (Linux)' },
        { id: 'inkscape', command: 'inkscape', name: 'Inkscape' },
        { id: 'gimp', command: 'gimp', name: 'GIMP' },
        { id: 'code', command: 'code', name: 'Visual Studio Code' }
      ];

      for (const check of commands) {
        try {
          const { stdout } = await execAsync(`which ${check.command}`);
          if (stdout.trim()) {
            this.installedSoftware.set(check.id, {
              id: check.id,
              name: check.name,
              displayName: check.name,
              path: stdout.trim(),
              executable: check.command,
              category: 'design',
              supportedActions: this.getSupportedActions(check.id),
              isInstalled: true,
              running: false
            });
          }
        } catch {
          // 命令不存在，跳过
        }
      }
    } catch (error) {
      console.error('Linux软件检测失败:', error);
    }
  }

  /**
   * 获取软件状态
   */
  public async getSoftwareStatus(softwareId: string): Promise<{
    success: boolean;
    running?: boolean;
    memoryUsage?: number;
    cpuUsage?: number;
    error?: string;
  }> {
    try {
      const software = this.installedSoftware.get(softwareId);
      if (!software) {
        return { success: false, error: '软件未安装' };
      }

      // 简单的进程检测（实际应用中可能需要更复杂的实现）
      const platform = process.platform;
      let command = '';

      if (platform === 'win32') {
        command = `tasklist /fi "imagename eq ${path.basename(software.executable || '')}"`;
      } else {
        command = `ps aux | grep "${software.executable}" | grep -v grep`;
      }

      try {
        const { stdout } = await execAsync(command);
        const running = stdout.trim().length > 0;

        return { success: true, running };
      } catch {
        return { success: true, running: false };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 启动软件
   */
  public async launchSoftware(
    softwareId: string, 
    parameters?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const software = this.installedSoftware.get(softwareId);
      if (!software && softwareId !== 'notepad') {
        // 检查是否是支持的软件但未检测到
        const supportedSoftware = this.getSupportedSoftware();
        const supported = supportedSoftware.find(s => s.id === softwareId);
        if (!supported) {
          return { success: false, error: '不支持的软件' };
        }
      }

      const platform = process.platform;
      let command = '';
      let args: string[] = parameters || [];

      if (softwareId === 'notepad') {
        // 记事本特殊处理
        if (platform === 'win32') {
          command = 'notepad.exe';
        } else {
          command = 'nano'; // Linux/macOS使用nano
        }
      } else if (software) {
        if (platform === 'win32') {
          command = `"${software.executable}"`;
        } else if (platform === 'darwin') {
          command = 'open';
          args = ['-a', `"${software.path}"`, ...args];
        } else {
          command = software.executable || '';
        }
      }

      if (!command) {
        return { success: false, error: '无法确定启动命令' };
      }

      const childProcess = spawn(command, args, { detached: true, stdio: 'ignore' });
      this.runningProcesses.set(softwareId, childProcess);

      childProcess.on('error', (error) => {
        this.runningProcesses.delete(softwareId);
        console.error('启动软件失败:', error);
      });

      childProcess.on('exit', () => {
        this.runningProcesses.delete(softwareId);
      });

      childProcess.unref();

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行软件操作
   */
  public async executeSoftwareAction(
    softwareId: string, 
    action: string, 
    parameters?: any
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const software = this.installedSoftware.get(softwareId);
      if (!software && softwareId !== 'notepad') {
        return { success: false, error: '软件未安装' };
      }

      switch (action) {
        case 'open':
          return this.openWithSoftware(software, parameters?.filePath);
        case 'new':
          return this.createNewWithSoftware(software, parameters);
        case 'export':
          return this.exportWithSoftware(software, parameters);
        default:
          return { success: false, error: '不支持的操作' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 使用软件打开文件
   */
  private async openWithSoftware(
    software: SoftwareInfo | undefined, 
    filePath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }

      const platform = process.platform;
      let command = '';
      let args: string[] = [];

      if (platform === 'win32') {
        command = `"${software?.executable || 'notepad.exe'}"`;
        args = [`"${filePath}"`];
      } else if (platform === 'darwin') {
        command = 'open';
        args = ['-a', `"${software?.path || 'TextEdit'}"`, `"${filePath}"`];
      } else {
        command = software?.executable || 'gedit';
        args = [`"${filePath}"`];
      }

      spawn(command, args, { detached: true, stdio: 'ignore' }).unref();

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 创建新文件
   */
  private async createNewWithSoftware(
    software: SoftwareInfo | undefined, 
    parameters: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 启动软件创建新文件
      return this.launchSoftware(software?.id || 'notepad');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 使用软件导出
   */
  private async exportWithSoftware(
    software: SoftwareInfo | undefined, 
    parameters: any
  ): Promise<{ success: boolean; error?: string }> {
    // TODO: 实现特定的导出逻辑
    return { success: false, error: '导出功能尚未实现' };
  }

  /**
   * 获取软件名称
   */
  private getSoftwareName(id: string): string {
    const names: Record<string, string> = {
      photoshop: 'Adobe Photoshop',
      illustrator: 'Adobe Illustrator',
      premiere: 'Adobe Premiere Pro',
      figma: 'Figma',
      sketch: 'Sketch',
      vscode: 'Visual Studio Code',
      notepad: 'Notepad'
    };
    return names[id] || id;
  }

  /**
   * 获取显示名称
   */
  private getDisplayName(id: string): string {
    const displayNames: Record<string, string> = {
      photoshop: 'Photoshop',
      illustrator: 'Illustrator',
      premiere: 'Premiere Pro',
      figma: 'Figma',
      sketch: 'Sketch',
      vscode: 'VS Code',
      notepad: '记事本'
    };
    return displayNames[id] || id;
  }

  /**
   * 获取支持的操作
   */
  private getSupportedActions(id: string): string[] {
    const actions: Record<string, string[]> = {
      photoshop: ['open', 'new', 'batch', 'export'],
      illustrator: ['open', 'new', 'export', 'save-as'],
      premiere: ['open', 'new', 'export', 'render'],
      figma: ['open', 'new', 'export'],
      sketch: ['open', 'new', 'export'],
      vscode: ['open', 'new', 'install-extension'],
      notepad: ['open', 'new']
    };
    return actions[id] || ['open'];
  }
}

// 导出单例实例
export const softwareManager = SoftwareManager.getInstance();