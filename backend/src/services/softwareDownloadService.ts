import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface DownloadResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  message: string;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed: number;
}

export class SoftwareDownloadService {
  private readonly downloadBasePath: string;
  private readonly activeDownloads: Map<string, DownloadProgress>;

  constructor() {
    this.downloadBasePath = process.env.DOWNLOAD_BASE_PATH || '/opt/ai-design/downloads';
    this.activeDownloads = new Map();
    this.ensureDownloadDirectory();
  }

  /**
   * 确保下载目录存在
   */
  private async ensureDownloadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.downloadBasePath, { recursive: true });
    } catch (error) {
      logger.error('创建下载目录失败:', error);
    }
  }

  /**
   * 获取软件下载URL
   */
  async getDownloadUrl(softwareId: string): Promise<DownloadResult> {
    try {
      const software = await prisma.software_apis.findUnique({
        where: { id: softwareId }
      });

      if (!software) {
        return {
          success: false,
          message: `软件不存在: ${softwareId}`
        };
      }

      // 从versions中提取下载URL
      const versions = software.versions as any;
      const downloadUrl = versions?.latest?.downloadUrl || versions?.downloadUrl;

      if (!downloadUrl) {
        return {
          success: false,
          message: '该软件暂无下载地址'
        };
      }

      // 生成带签名的下载URL（如果需要）
      const signedUrl = await this.generateSignedUrl(downloadUrl);

      const version = versions?.latest?.version || versions?.version || '1.0.0';

      return {
        success: true,
        downloadUrl: signedUrl,
        fileName: `${software.softwareName}-${version}.${this.getFileExtension(downloadUrl)}`,
        message: '获取下载URL成功'
      };
    } catch (error) {
      logger.error('获取下载URL失败:', error);
      return {
        success: false,
        message: `获取下载URL失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 下载软件到服务器
   */
  async downloadSoftware(
    softwareId: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<DownloadResult> {
    try {
      const software = await prisma.software_apis.findUnique({
        where: { id: softwareId }
      });

      if (!software) {
        return {
          success: false,
          message: `软件不存在: ${softwareId}`
        };
      }

      // 从versions中提取下载URL
      const versions = software.versions as any;
      const downloadUrl = versions?.latest?.downloadUrl || versions?.downloadUrl;

      if (!downloadUrl) {
        return {
          success: false,
          message: '该软件暂无下载地址'
        };
      }

      logger.info(`开始下载软件: ${software.softwareName}`);

      const version = versions?.latest?.version || versions?.version || '1.0.0';
      const fileName = `${software.softwareName}-${version}.${this.getFileExtension(downloadUrl)}`;
      const filePath = path.join(this.downloadBasePath, fileName);

      // 执行下载
      await this.downloadFile(downloadUrl, filePath, software.softwareName, onProgress);

      // 获取文件大小
      const stats = await fs.stat(filePath);

      logger.info(`软件下载成功: ${fileName}, 大小: ${stats.size} bytes`);

      return {
        success: true,
        downloadUrl: filePath,
        fileName,
        fileSize: stats.size,
        message: '软件下载成功'
      };
    } catch (error) {
      logger.error('软件下载失败:', error);
      return {
        success: false,
        message: `软件下载失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 批量下载软件
   */
  async batchDownloadSoftware(
    softwareIds: string[],
    onProgress?: (current: number, total: number, softwareName: string) => void
  ): Promise<{ success: boolean; results: DownloadResult[]; message: string }> {
    const results: DownloadResult[] = [];

    for (let i = 0; i < softwareIds.length; i++) {
      const softwareId = softwareIds[i];
      const result = await this.downloadSoftware(softwareId);
      results.push(result);

      if (onProgress) {
        const software = await prisma.software_apis.findUnique({ where: { id: softwareId } });
        onProgress(i + 1, softwareIds.length, software?.softwareName || softwareId);
      }
    }

    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount === softwareIds.length,
      results,
      message: `批量下载完成: ${successCount}/${softwareIds.length} 成功`
    };
  }

  /**
   * 下载文件
   */
  private async downloadFile(
    url: string,
    filePath: string,
    softwareName: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const fileStream = require('fs').createWriteStream(filePath);
      let downloadedBytes = 0;
      let totalBytes = 0;
      const startTime = Date.now();

      protocol.get(url, (response: any) => {
        totalBytes = parseInt(response.headers['content-length'], 10) || 0;

        response.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;

          if (onProgress) {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const speed = elapsedSeconds > 0 ? downloadedBytes / elapsedSeconds : 0;

            onProgress({
              downloaded: downloadedBytes,
              total: totalBytes,
              percentage: totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0,
              speed
            });
          }
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          this.activeDownloads.delete(softwareName);
          resolve();
        });

        fileStream.on('error', (error: Error) => {
          this.activeDownloads.delete(softwareName);
          reject(error);
        });
      }).on('error', (error: Error) => {
        this.activeDownloads.delete(softwareName);
        reject(error);
      });

      // 记录下载进度
      this.activeDownloads.set(softwareName, {
        downloaded: 0,
        total: totalBytes,
        percentage: 0,
        speed: 0
      });
    });
  }

  /**
   * 获取下载进度
   */
  getDownloadProgress(softwareName: string): DownloadProgress | undefined {
    return this.activeDownloads.get(softwareName);
  }

  /**
   * 取消下载
   */
  async cancelDownload(softwareName: string): Promise<{ success: boolean; message: string }> {
    try {
      if (this.activeDownloads.has(softwareName)) {
        this.activeDownloads.delete(softwareName);
        logger.info(`取消下载: ${softwareName}`);
        return {
          success: true,
          message: '下载已取消'
        };
      }

      return {
        success: false,
        message: '没有找到对应的下载任务'
      };
    } catch (error) {
      logger.error('取消下载失败:', error);
      return {
        success: false,
        message: '取消下载失败'
      };
    }
  }

  /**
   * 生成带签名的URL
   */
  private async generateSignedUrl(url: string): Promise<string> {
    // 这里可以添加URL签名逻辑
    // 例如添加过期时间、token等
    const timestamp = Date.now();
    const expiry = timestamp + 3600000; // 1小时后过期
    return `${url}?expires=${expiry}&token=${this.generateToken(url, expiry)}`;
  }

  /**
   * 生成Token
   */
  private generateToken(url: string, expiry: number): string {
    // 简单的token生成逻辑
    const secret = process.env.DOWNLOAD_SECRET || 'default-secret';
    const data = `${url}|${expiry}`;
    return Buffer.from(data).toString('base64');
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(url: string): string {
    const parts = url.split('.');
    return parts[parts.length - 1];
  }

  /**
   * 清理过期的下载文件
   */
  async cleanupExpiredDownloads(maxAgeHours: number = 24): Promise<{ success: boolean; deletedCount: number; message: string }> {
    try {
      const files = await fs.readdir(this.downloadBasePath);
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.downloadBasePath, file);
        const stats = await fs.stat(filePath);
        const age = Date.now() - stats.mtime.getTime();

        if (age > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
          logger.info(`删除过期下载文件: ${file}`);
        }
      }

      return {
        success: true,
        deletedCount,
        message: `清理完成，删除了 ${deletedCount} 个过期文件`
      };
    } catch (error) {
      logger.error('清理过期下载文件失败:', error);
      return {
        success: false,
        deletedCount: 0,
        message: '清理过期下载文件失败'
      };
    }
  }

  /**
   * 获取可用磁盘空间
   */
  async getDiskSpace(): Promise<{ total: number; used: number; available: number; message: string }> {
    try {
      const { stdout } = await execAsync(`df -h "${this.downloadBasePath}"`);
      const lines = stdout.split('\n');
      const data = lines[1].split(/\s+/);

      return {
        total: this.parseDiskSize(data[1]),
        used: this.parseDiskSize(data[2]),
        available: this.parseDiskSize(data[3]),
        message: '获取磁盘空间成功'
      };
    } catch (error) {
      logger.error('获取磁盘空间失败:', error);
      return {
        total: 0,
        used: 0,
        available: 0,
        message: '获取磁盘空间失败'
      };
    }
  }

  /**
   * 解析磁盘大小
   */
  private parseDiskSize(size: string): number {
    const units = { K: 1024, M: 1024 * 1024, G: 1024 * 1024 * 1024, T: 1024 * 1024 * 1024 * 1024 };
    const match = size.match(/^(\d+)([KMGT])?$/i);
    if (!match) return 0;

    const value = parseInt(match[1], 10);
    const unit = (match[2] || '').toUpperCase();
    return value * (units[unit as keyof typeof units] || 1);
  }
}

export const softwareDownloadService = new SoftwareDownloadService();
