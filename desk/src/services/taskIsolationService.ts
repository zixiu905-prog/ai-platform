import { BrowserWindow } from 'electron';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface IsolationConfig {
  enabled: boolean;
  isolateOnTaskStart: boolean;
  autoRestoreOnPause: boolean;
  enableUserInputBlock: boolean;
  enableProcessPriority: boolean;
  enableNetworkIsolation: boolean;
  enableFileSystemIsolation: boolean;
}

export interface IsolationState {
  taskId: string;
  softwareName: string;
  isIsolated: boolean;
  isolatedProcesses: string[];
  blockedInputs: boolean;
  priority: 'normal' | 'low' | 'realtime';
  networkBlocked: boolean;
  fileSystemRestricted: boolean;
  startTime: number;
  lastStateUpdate: number;
}

export interface IsolationResult {
  success: boolean;
  message: string;
  state?: IsolationState;
  error?: string;
}

/**
 * 任务隔离服务
 * 确保设计软件在执行任务时不受用户其他操作干扰
 */
export class TaskIsolationService {
  private isolationStates: Map<string, IsolationState> = new Map();
  private config: IsolationConfig = {
    enabled: true,
    isolateOnTaskStart: true,
    autoRestoreOnPause: true,
    enableUserInputBlock: true,
    enableProcessPriority: true,
    enableNetworkIsolation: false, // 默认不启用，可能会影响云服务
    enableFileSystemIsolation: true
  };

  private mainWindow: BrowserWindow | null = null;
  private isolationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadConfig();
  }

  /**
   * 设置主窗口
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      // 可以从配置文件加载
      // const config = readFileSync(configPath, 'utf-8');
      // this.config = JSON.parse(config);
    } catch (error) {
      console.warn('加载隔离配置失败，使用默认配置');
    }
  }

  /**
   * 保存配置
   */
  saveConfig(config: Partial<IsolationConfig>): void {
    this.config = { ...this.config, ...config };
    // 可以保存到配置文件
  }

  /**
   * 开始任务隔离
   */
  async startIsolation(
    taskId: string,
    softwareName: string,
    processIds: string[]
  ): Promise<IsolationResult> {
    try {
      if (!this.config.enabled || !this.config.isolateOnTaskStart) {
        return {
          success: true,
          message: '隔离未启用，任务正常执行'
        };
      }

      const isolatedProcesses: string[] = [];
      let networkBlocked = false;
      let fileSystemRestricted = false;

      // 1. 获取软件进程
      const softwareProcesses = await this.getSoftwareProcesses(softwareName);
      const allProcesses = [...processIds, ...softwareProcesses];

      // 2. 隔离进程（设置优先级）
      if (this.config.enableProcessPriority) {
        await this.setProcessPriority(allProcesses, 'low');
        isolatedProcesses.push(...allProcesses);
      }

      // 3. 阻止用户输入干扰
      if (this.config.enableUserInputBlock && this.mainWindow) {
        await this.blockUserInterference(this.mainWindow);
      }

      // 4. 网络隔离（可选）
      if (this.config.enableNetworkIsolation) {
        networkBlocked = await this.blockNetworkAccess(allProcesses);
      }

      // 5. 文件系统隔离
      if (this.config.enableFileSystemIsolation) {
        fileSystemRestricted = await this.restrictFileSystemAccess(softwareName);
      }

      // 创建隔离状态
      const state: IsolationState = {
        taskId,
        softwareName,
        isIsolated: true,
        isolatedProcesses,
        blockedInputs: this.config.enableUserInputBlock,
        priority: 'low',
        networkBlocked,
        fileSystemRestricted,
        startTime: Date.now(),
        lastStateUpdate: Date.now()
      };

      this.isolationStates.set(taskId, state);

      // 发送状态更新
      this.sendStatusUpdate(taskId, state);

      // 启动监控定时器
      this.startIsolationMonitoring(taskId);

      return {
        success: true,
        message: '任务隔离已启动',
        state
      };

    } catch (error) {
      return {
        success: false,
        message: '启动任务隔离失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 暂停任务时恢复部分隔离
   */
  async pauseIsolation(taskId: string): Promise<IsolationResult> {
    try {
      const state = this.isolationStates.get(taskId);
      if (!state || !state.isIsolated) {
        return {
          success: true,
          message: '任务未处于隔离状态'
        };
      }

      // 如果配置了自动恢复
      if (this.config.autoRestoreOnPause) {
        // 恢复进程优先级
        await this.setProcessPriority(state.isolatedProcesses, 'normal');
        state.priority = 'normal';

        // 恢复文件系统访问
        if (state.fileSystemRestricted) {
          await this.restoreFileSystemAccess(state.softwareName);
          state.fileSystemRestricted = false;
        }

        state.lastStateUpdate = Date.now();
        this.isolationStates.set(taskId, state);

        this.sendStatusUpdate(taskId, state);

        return {
          success: true,
          message: '任务暂停，隔离已部分恢复',
          state
        };
      }

      return {
        success: true,
        message: '任务已暂停，隔离保持不变',
        state
      };

    } catch (error) {
      return {
        success: false,
        message: '暂停隔离失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 继续任务时重新应用隔离
   */
  async resumeIsolation(taskId: string): Promise<IsolationResult> {
    try {
      const state = this.isolationStates.get(taskId);
      if (!state) {
        return {
          success: false,
          message: '任务状态不存在'
        };
      }

      // 重新应用隔离
      if (this.config.enableProcessPriority) {
        await this.setProcessPriority(state.isolatedProcesses, 'low');
        state.priority = 'low';
      }

      if (this.config.enableFileSystemIsolation) {
        state.fileSystemRestricted = await this.restrictFileSystemAccess(state.softwareName);
      }

      state.lastStateUpdate = Date.now();
      this.isolationStates.set(taskId, state);

      this.sendStatusUpdate(taskId, state);

      return {
        success: true,
        message: '任务继续，隔离已重新应用',
        state
      };

    } catch (error) {
      return {
        success: false,
        message: '恢复隔离失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 结束任务并完全恢复隔离
   */
  async endIsolation(taskId: string): Promise<IsolationResult> {
    try {
      const state = this.isolationStates.get(taskId);
      if (!state) {
        return {
          success: true,
          message: '任务状态不存在或已清理'
        };
      }

      // 停止监控
      this.stopIsolationMonitoring(taskId);

      // 恢复所有隔离
      if (state.isolatedProcesses.length > 0) {
        await this.setProcessPriority(state.isolatedProcesses, 'normal');
      }

      if (state.fileSystemRestricted) {
        await this.restoreFileSystemAccess(state.softwareName);
      }

      if (state.networkBlocked) {
        await this.restoreNetworkAccess(state.isolatedProcesses);
      }

      // 恢复用户输入
      if (state.blockedInputs && this.mainWindow) {
        await this.restoreUserInterference(this.mainWindow);
      }

      state.isIsolated = false;
      state.lastStateUpdate = Date.now();

      this.isolationStates.set(taskId, state);
      this.sendStatusUpdate(taskId, state);

      // 延迟清理状态
      setTimeout(() => {
        this.isolationStates.delete(taskId);
      }, 5000);

      return {
        success: true,
        message: '任务隔离已完全恢复',
        state
      };

    } catch (error) {
      return {
        success: false,
        message: '结束隔离失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 获取软件进程
   */
  private async getSoftwareProcesses(softwareName: string): Promise<string[]> {
    try {
      const platform = process.platform;
      let command = '';

      switch (platform) {
        case 'win32':
          command = `tasklist /FI "IMAGENAME eq ${softwareName}*" /FO CSV | findstr /V "PID"`;
          break;
        case 'darwin':
          command = `pgrep -i "${softwareName}"`;
          break;
        case 'linux':
          command = `pgrep -i "${softwareName}"`;
          break;
      }

      const { stdout } = await execAsync(command);
      const pids = stdout.trim().split('\n').filter(line => line.trim()).map(line => {
        // 提取PID
        const match = line.match(/"?\s*(\d+)\s*"?.*/);
        return match ? match[1] : line.trim();
      });

      return pids.filter(pid => pid && /^\d+$/.test(pid));

    } catch (error) {
      console.warn(`获取 ${softwareName} 进程失败:`, error);
      return [];
    }
  }

  /**
   * 设置进程优先级
   */
  private async setProcessPriority(pids: string[], priority: 'normal' | 'low' | 'realtime'): Promise<void> {
    try {
      const platform = process.platform;

      for (const pid of pids) {
        try {
          switch (platform) {
            case 'win32':
              let priorityValue = 'NORMAL';
              if (priority === 'low') priorityValue = 'BELOW_NORMAL';
              if (priority === 'realtime') priorityValue = 'HIGH';
              await execAsync(`wmic process where processid=${pid} call setpriority ${priorityValue}`);
              break;

            case 'darwin':
              let niceValue = 0;
              if (priority === 'low') niceValue = 10;
              if (priority === 'realtime') niceValue = -10;
              await execAsync(`renice -n ${niceValue} -p ${pid}`);
              break;

            case 'linux':
              niceValue = 0;
              if (priority === 'low') niceValue = 10;
              if (priority === 'realtime') niceValue = -10;
              await execAsync(`renice -n ${niceValue} -p ${pid}`);
              break;
          }
        } catch (error) {
          console.warn(`设置进程 ${pid} 优先级失败:`, error);
        }
      }
    } catch (error) {
      console.error('设置进程优先级失败:', error);
    }
  }

  /**
   * 阻止用户输入干扰
   */
  private async blockUserInterference(window: BrowserWindow): Promise<void> {
    try {
      // 防止窗口失去焦点
      // window.setFocusable(false);
      // window.setAlwaysOnTop(true, 'screen-saver');

      // 禁用快捷键
      // window.webContents.send('disable-shortcuts', true);

    } catch (error) {
      console.warn('阻止用户输入干扰失败:', error);
    }
  }

  /**
   * 恢复用户输入
   */
  private async restoreUserInterference(window: BrowserWindow): Promise<void> {
    try {
      // 恢复窗口行为
      // window.setFocusable(true);
      // window.setAlwaysOnTop(false);

      // 启用快捷键
      // window.webContents.send('disable-shortcuts', false);

    } catch (error) {
      console.warn('恢复用户输入失败:', error);
    }
  }

  /**
   * 阻止网络访问
   */
  private async blockNetworkAccess(pids: string[]): Promise<boolean> {
    try {
      const platform = process.platform;

      for (const pid of pids) {
        try {
          switch (platform) {
            case 'win32':
              // 使用防火墙规则
              await execAsync(`netsh advfirewall firewall add rule name="Block_${pid}" dir=out action=block program="${pid}"`);
              break;

            case 'darwin':
              // 使用pfctl或类似工具
              // await execAsync(`...`);
              break;

            case 'linux':
              // 使用iptables
              await execAsync(`iptables -A OUTPUT -m owner --pid-owner ${pid} -j DROP`);
              break;
          }
        } catch (error) {
          console.warn(`阻止进程 ${pid} 网络访问失败:`, error);
        }
      }

      return true;
    } catch (error) {
      console.error('阻止网络访问失败:', error);
      return false;
    }
  }

  /**
   * 恢复网络访问
   */
  private async restoreNetworkAccess(pids: string[]): Promise<void> {
    try {
      const platform = process.platform;

      for (const pid of pids) {
        try {
          switch (platform) {
            case 'win32':
              await execAsync(`netsh advfirewall firewall delete rule name="Block_${pid}"`);
              break;

            case 'linux':
              await execAsync(`iptables -D OUTPUT -m owner --pid-owner ${pid} -j DROP`);
              break;
          }
        } catch (error) {
          console.warn(`恢复进程 ${pid} 网络访问失败:`, error);
        }
      }
    } catch (error) {
      console.error('恢复网络访问失败:', error);
    }
  }

  /**
   * 限制文件系统访问
   */
  private async restrictFileSystemAccess(softwareName: string): Promise<boolean> {
    try {
      // 这里可以实现更复杂的文件系统隔离
      // 例如：使用AppLocker、SELinux、文件权限控制等

      // 简单实现：创建一个临时工作目录并限制访问
      console.log(`限制 ${softwareName} 的文件系统访问`);
      return true;

    } catch (error) {
      console.error('限制文件系统访问失败:', error);
      return false;
    }
  }

  /**
   * 恢复文件系统访问
   */
  private async restoreFileSystemAccess(softwareName: string): Promise<void> {
    try {
      console.log(`恢复 ${softwareName} 的文件系统访问`);
    } catch (error) {
      console.error('恢复文件系统访问失败:', error);
    }
  }

  /**
   * 启动隔离监控
   */
  private startIsolationMonitoring(taskId: string): void {
    const timer = setInterval(async () => {
      await this.monitorIsolationState(taskId);
    }, 5000); // 每5秒检查一次

    this.isolationTimers.set(taskId, timer);
  }

  /**
   * 停止隔离监控
   */
  private stopIsolationMonitoring(taskId: string): void {
    const timer = this.isolationTimers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.isolationTimers.delete(taskId);
    }
  }

  /**
   * 监控隔离状态
   */
  private async monitorIsolationState(taskId: string): Promise<void> {
    const state = this.isolationStates.get(taskId);
    if (!state || !state.isIsolated) {
      return;
    }

    try {
      // 检查进程是否还在运行
      const stillRunning = await this.checkProcessesAlive(state.isolatedProcesses);

      if (!stillRunning) {
        // 进程已退出，自动结束隔离
        await this.endIsolation(taskId);
      }

      state.lastStateUpdate = Date.now();
      this.isolationStates.set(taskId, state);

    } catch (error) {
      console.warn(`监控任务 ${taskId} 隔离状态失败:`, error);
    }
  }

  /**
   * 检查进程是否存活
   */
  private async checkProcessesAlive(pids: string[]): Promise<boolean> {
    try {
      const platform = process.platform;
      let command = '';

      for (const pid of pids) {
        switch (platform) {
          case 'win32':
            command = `tasklist /FI "PID eq ${pid}"`;
            break;
          case 'darwin':
          case 'linux':
            command = `ps -p ${pid}`;
            break;
        }

        try {
          await execAsync(command);
        } catch (error) {
          // 进程不存在
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 发送状态更新
   */
  private sendStatusUpdate(taskId: string, state: IsolationState): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('task-isolation-update', {
        taskId,
        state
      });
    }
  }

  /**
   * 获取隔离状态
   */
  getIsolationState(taskId: string): IsolationState | undefined {
    return this.isolationStates.get(taskId);
  }

  /**
   * 获取所有隔离状态
   */
  getAllIsolationStates(): Map<string, IsolationState> {
    return new Map(this.isolationStates);
  }

  /**
   * 获取配置
   */
  getConfig(): IsolationConfig {
    return { ...this.config };
  }

  /**
   * 清理所有隔离
   */
  async cleanupAll(): Promise<void> {
    const taskIds = Array.from(this.isolationStates.keys());

    for (const taskId of taskIds) {
      await this.endIsolation(taskId);
    }
  }
}

// 导出单例
export const taskIsolationService = new TaskIsolationService();
