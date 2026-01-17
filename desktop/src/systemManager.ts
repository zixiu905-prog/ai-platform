/**
 * 系统管理器
 * 获取系统信息、剪贴板操作、屏幕信息等
 */

import * as os from 'os';
import { clipboard, screen } from 'electron';
import * as si from 'systeminformation';

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  hostname: string;
  username: string;
  uptime: number;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  cpu: {
    model: string;
    speed: number;
    cores: number;
    usage: number;
  };
  disks: Array<{
    device: string;
    mountpoint: string;
    type: string;
    size: number;
    used: number;
    free: number;
  }>;
  network: any;
}

export interface DisplayInfo {
  id: number;
  label: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  workArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scaleFactor: number;
  rotation: number;
  touchSupport: boolean;
  primary: boolean;
}

export class SystemManager {
  private static instance: SystemManager;

  constructor() {}

  public static getInstance(): SystemManager {
    if (!SystemManager.instance) {
      SystemManager.instance = new SystemManager();
    }
    return SystemManager.instance;
  }

  /**
   * 获取系统信息
   */
  public async getSystemInfo(): Promise<SystemInfo> {
    try {
      // 获取基础系统信息
      const platform = os.platform();
      const arch = os.arch();
      const version = os.release();
      const hostname = os.hostname();
      const username = os.userInfo().username;
      const uptime = os.uptime();

      // 获取内存信息
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      // 获取CPU信息
      const cpus = os.cpus();
      const cpuModel = cpus[0]?.model || 'Unknown';
      const cpuSpeed = cpus[0]?.speed || 0;
      const cpuCores = cpus.length;

      // 获取当前CPU使用率
      const cpuUsage = await this.getCpuUsage();

      // 获取磁盘信息
      const disks = await this.getDiskInfo();

      // 获取网络信息
      const network = await this.getNetworkInfo();

      return {
        platform,
        arch,
        version,
        hostname,
        username,
        uptime,
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem
        },
        cpu: {
          model: cpuModel,
          speed: cpuSpeed,
          cores: cpuCores,
          usage: cpuUsage
        },
        disks,
        network
      };
    } catch (error) {
      console.error('获取系统信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取CPU使用率
   */
  private async getCpuUsage(): Promise<number> {
    try {
      const cpus = await si.currentLoad();
      return Math.round(cpus.currentLoad || 0);
    } catch {
      return 0;
    }
  }

  /**
   * 获取磁盘信息
   */
  private async getDiskInfo(): Promise<Array<{
    device: string;
    mountpoint: string;
    type: string;
    size: number;
    used: number;
    free: number;
  }>> {
    try {
      const disks = await si.fsSize();
      return disks.map(disk => ({
        device: disk.fs,
        mountpoint: disk.mount,
        type: disk.type,
        size: disk.size,
        used: disk.used,
        free: disk.available
      }));
    } catch {
      return [];
    }
  }

  /**
   * 获取网络信息
   */
  private async getNetworkInfo(): Promise<{
    interfaces: Array<{
      iface: string;
      type: string;
      speed: number;
      ip4: string;
      ip6: string;
    }>;
  }> {
    try {
      const interfaces = await si.networkInterfaces();
      const ifaceArray: any[] = Object.values(interfaces);
      return {
        interfaces: ifaceArray.map((iface: any) => ({
          iface: iface.iface,
          type: iface.type || 'unknown',
          speed: iface.speed || 0,
          ip4: iface.ip4 || '',
          ip6: iface.ip6 || ''
        }))
      };
    } catch {
      return { interfaces: [] };
    }
  }

  /**
   * 获取显示器信息
   */
  public getDisplays(): DisplayInfo[] {
    const displays = screen.getAllDisplays();
    
    return displays.map((display, index) => ({
      id: index + 1,
      label: `Display ${index + 1}`,
      bounds: {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height
      },
      workArea: {
        x: display.workArea.x,
        y: display.workArea.y,
        width: display.workArea.width,
        height: display.workArea.height
      },
      scaleFactor: display.scaleFactor,
      rotation: display.rotation || 0,
      touchSupport: display.touchSupport === 'available',
      primary: display.id === screen.getPrimaryDisplay().id
    }));
  }

  /**
   * 获取主显示器信息
   */
  public getPrimaryDisplay(): DisplayInfo | null {
    const displays = this.getDisplays();
    return displays.find(display => display.primary) || null;
  }

  /**
   * 读取剪贴板文本
   */
  public readClipboardText(): string {
    return clipboard.readText();
  }

  /**
   * 写入剪贴板文本
   */
  public writeClipboardText(text: string): boolean {
    try {
      clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 读取剪贴板图像
   */
  public readClipboardImage(): Buffer | null {
    try {
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        return image.toPNG();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 写入剪贴板图像
   */
  public writeClipboardImage(imageBuffer: Buffer): boolean {
    try {
      const { nativeImage } = require('electron');
      const image = nativeImage.createFromBuffer(imageBuffer);
      clipboard.writeImage(image);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查剪贴板格式
   */
  public getClipboardFormats(): string[] {
    return clipboard.availableFormats();
  }

  /**
   * 清空剪贴板
   */
  public clearClipboard(): void {
    clipboard.clear();
  }

  /**
   * 获取系统性能指标
   */
  public async getPerformanceMetrics(): Promise<{
    cpu: number;
    memory: {
      total: number;
      used: number;
      percentage: number;
    };
    disk: Array<{
      device: string;
      usage: number;
    }>;
    network?: {
      rx: number;
      tx: number;
    };
    processes: number;
    uptime: number;
  }> {
    try {
      // CPU使用率
      const cpuLoad = await si.currentLoad();
      
      // 内存信息
      const memory = si.mem();
      const totalMemory = (await memory).total;
      const usedMemory = (await memory).used;
      const memoryPercentage = (usedMemory / totalMemory) * 100;

      // 磁盘使用率
      const diskStats = await si.fsSize();
      const diskUsage = diskStats.map((disk: any) => ({
        device: disk.fs,
        usage: disk.use
      }));

      // 进程数量
      const processes = await si.processes();
      
      return {
        cpu: cpuLoad.currentLoad || 0,
        memory: {
          total: totalMemory,
          used: usedMemory,
          percentage: memoryPercentage
        },
        disk: diskUsage,
        processes: processes.list.length,
        uptime: os.uptime()
      };
    } catch (error) {
      console.error('获取性能指标失败:', error);
      return {
        cpu: 0,
        memory: { total: 0, used: 0, percentage: 0 },
        disk: [],
        processes: 0,
        uptime: 0
      };
    }
  }

  /**
   * 获取电池信息（如果是笔记本电脑）
   */
  public async getBatteryInfo(): Promise<{
    hasBattery: boolean;
    charging: boolean;
    level: number;
    timeRemaining?: number;
  } | null> {
    try {
      const battery = await si.battery();
      if (!battery.hasBattery) {
        return null;
      }

      return {
        hasBattery: true,
        charging: battery.isCharging,
        level: Math.round(battery.percent),
        timeRemaining: battery.timeRemaining
      };
    } catch {
      return null;
    }
  }

  /**
   * 获取系统主题（深色/浅色模式）
   */
  public getSystemTheme(): 'light' | 'dark' | 'unknown' {
    try {
      if (process.platform === 'win32') {
        // Windows: 检查注册表
        const { execSync } = require('child_process');
        const result = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme', { encoding: 'utf8' });
        const useLightTheme = result.includes('0x0');
        return useLightTheme ? 'dark' : 'light';
      } else if (process.platform === 'darwin') {
        // macOS: 检查系统偏好设置
        const { execSync } = require('child_process');
        const result = execSync('defaults read -g AppleInterfaceStyle', { encoding: 'utf8' });
        return result.includes('Dark') ? 'dark' : 'light';
      } else {
        // Linux: 检查GTK主题或其他桌面环境设置
        // 这里可以简化处理
        return 'unknown';
      }
    } catch {
      return 'unknown';
    }
  }

  /**
   * 监视系统事件
   */
  public startMonitoring(): void {
    // TODO: 实现系统事件监控
    // 例如：内存警告、磁盘空间不足、网络状态变化等
  }

  /**
   * 停止系统监控
   */
  public stopMonitoring(): void {
    // TODO: 停止系统事件监控
  }
}

// 导出单例实例
export const systemManager = SystemManager.getInstance();