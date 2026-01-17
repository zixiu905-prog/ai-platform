import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SoftwareIntegrationResult {
  success: boolean;
  message: string;
  installedPath?: string;
  version?: string;
}

export class SoftwareIntegrationService {
  private readonly softwareBasePath: string;

  constructor() {
    this.softwareBasePath = process.env.SOFTWARE_BASE_PATH || '/opt/ai-design/software';
  }

  /**
   * 集成设计软件
   */
  async integrate(softwareId: string): Promise<SoftwareIntegrationResult> {
    try {
      logger.info(`开始集成软件: ${softwareId}`);

      // 1. 获取软件信息
      const software = await prisma.software_apis.findUnique({
        where: { id: softwareId }
      });

      if (!software) {
        return {
          success: false,
          message: `软件不存在: ${softwareId}`
        };
      }

      // 从versions中提取版本信息
      const versions = software.versions as any;
      const version = versions?.latest?.version || versions?.version || '1.0.0';
      const downloadUrl = versions?.latest?.downloadUrl || versions?.downloadUrl;

      // 2. 检查软件是否已安装
      const installedPath = await this.checkSoftwareInstalled(software.softwareName);
      if (installedPath) {
        logger.info(`软件已安装: ${installedPath}`);
        return {
          success: true,
          message: `软件已安装: ${software.softwareName}`,
          installedPath,
          version
        };
      }

      // 3. 下载软件
      if (!downloadUrl) {
        return {
          success: false,
          message: '该软件暂无下载地址'
        };
      }

      const downloadResult = await this.downloadSoftware(software.softwareName, downloadUrl, version);
      if (!downloadResult.success) {
        return downloadResult;
      }

      // 4. 安装软件
      if (!downloadResult.filePath) {
        return {
          success: false,
          message: '下载文件路径缺失'
        };
      }

      const installResult = await this.installSoftware(software.softwareName, version, downloadResult.filePath);
      if (!installResult.success) {
        return installResult;
      }

      // 5. 验证安装
      const verifyResult = await this.verifySoftwareInstall(software.softwareName);
      if (!verifyResult.success) {
        return verifyResult;
      }

      // 6. 更新数据库状态
      await prisma.software_apis.update({
        where: { id: softwareId },
        data: {
          apiConfig: {
            ...(software.apiConfig as any),
            status: 'installed',
            installPath: verifyResult.installPath
          },
          updatedAt: new Date()
        }
      });

      logger.info(`软件集成成功: ${software.softwareName}`);
      return {
        success: true,
        message: `软件集成成功: ${software.softwareName}`,
        installedPath: verifyResult.installPath,
        version
      };
    } catch (error) {
      logger.error('软件集成失败:', error);
      return {
        success: false,
        message: `软件集成失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 检查软件是否已安装
   */
  private async checkSoftwareInstalled(softwareName: string): Promise<string | null> {
    const commonPaths = [
      '/Applications',
      '/opt',
      '/usr/local',
      'C:\\Program Files',
      'C:\\Program Files (x86)'
    ];

    for (const basePath of commonPaths) {
      try {
        const files = await fs.readdir(basePath);
        for (const file of files) {
          if (file.toLowerCase().includes(softwareName.toLowerCase())) {
            return path.join(basePath, file);
          }
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  /**
   * 下载软件
   */
  private async downloadSoftware(
    softwareName: string,
    downloadUrl: string,
    version: string
  ): Promise<{ success: boolean; filePath?: string; message: string }> {
    try {
      const downloadDir = path.join(this.softwareBasePath, 'downloads');
      await fs.mkdir(downloadDir, { recursive: true });

      const fileName = `${softwareName}-${version}.${this.getFileExtension(downloadUrl)}`;
      const filePath = path.join(downloadDir, fileName);

      logger.info(`开始下载软件: ${downloadUrl}`);

      // 使用wget或curl下载
      const command = `curl -L -o "${filePath}" "${downloadUrl}"`;
      await execAsync(command);

      logger.info(`软件下载成功: ${filePath}`);
      return {
        success: true,
        filePath,
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
   * 安装软件
   */
  private async installSoftware(
    softwareName: string,
    version: string,
    filePath: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const installDir = path.join(this.softwareBasePath, softwareName);
      await fs.mkdir(installDir, { recursive: true });

      logger.info(`开始安装软件: ${filePath}`);

      // 根据文件类型执行不同的安装命令
      const ext = path.extname(filePath);
      let command = '';

      if (ext === '.dmg') {
        // macOS DMG
        command = `hdiutil attach "${filePath}" && cp -R "/Volumes/${softwareName}"/* "${installDir}" && hdiutil detach "/Volumes/${softwareName}"`;
      } else if (ext === '.exe') {
        // Windows EXE
        command = `"${filePath}" /S /D="${installDir}"`;
      } else if (ext === '.deb') {
        // Linux DEB
        command = `sudo dpkg -i "${filePath}"`;
      } else if (ext === '.rpm') {
        // Linux RPM
        command = `sudo rpm -i "${filePath}"`;
      } else {
        // 直接解压
        command = `tar -xzf "${filePath}" -C "${installDir}"`;
      }

      await execAsync(command);

      logger.info(`软件安装成功: ${installDir}`);
      return {
        success: true,
        message: '软件安装成功'
      };
    } catch (error) {
      logger.error('软件安装失败:', error);
      return {
        success: false,
        message: `软件安装失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 验证软件安装
   */
  private async verifySoftwareInstall(softwareName: string): Promise<{ success: boolean; installPath?: string; message: string }> {
    const installPath = await this.checkSoftwareInstalled(softwareName);
    if (installPath) {
      return {
        success: true,
        installPath,
        message: '软件安装验证成功'
      };
    }

    return {
      success: false,
      message: '软件安装验证失败'
    };
  }

  /**
   * 卸载软件
   */
  async uninstall(softwareId: string): Promise<{ success: boolean; message: string }> {
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

      const apiConfig = software.apiConfig as any;
      if (apiConfig?.installPath) {
        // 删除安装目录
        await fs.rm(apiConfig.installPath, { recursive: true, force: true });
      }

      // 更新数据库状态
      await prisma.software_apis.update({
        where: { id: softwareId },
        data: {
          apiConfig: {
            ...(apiConfig || {}),
            status: 'uninstalled',
            installPath: null
          },
          updatedAt: new Date()
        }
      });

      logger.info(`软件卸载成功: ${software.softwareName}`);
      return {
        success: true,
        message: `软件卸载成功: ${software.softwareName}`
      };
    } catch (error) {
      logger.error('软件卸载失败:', error);
      return {
        success: false,
        message: `软件卸载失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(url: string): string {
    const parts = url.split('.');
    return parts[parts.length - 1];
  }

  /**
   * 获取软件列表
   */
  async getSoftwareList(): Promise<any[]> {
    try {
      const softwareList = await prisma.software_apis.findMany({
        orderBy: { softwareName: 'asc' }
      });
      return softwareList;
    } catch (error) {
      logger.error('获取软件列表失败:', error);
      return [];
    }
  }

  /**
   * 检查软件更新
   */
  async checkUpdate(softwareId: string): Promise<{ hasUpdate: boolean; latestVersion?: string; message: string }> {
    try {
      const software = await prisma.software_apis.findUnique({
        where: { id: softwareId }
      });

      if (!software) {
        return {
          hasUpdate: false,
          message: `软件不存在: ${softwareId}`
        };
      }

      // 从versions中提取当前版本
      const versions = software.versions as any;
      const currentVersion = versions?.latest?.version || versions?.version || '1.0.0';

      // 这里应该调用实际的更新检查API
      // 暂时返回无更新
      return {
        hasUpdate: false,
        latestVersion: currentVersion,
        message: '已是最新版本'
      };
    } catch (error) {
      logger.error('检查软件更新失败:', error);
      return {
        hasUpdate: false,
        message: `检查软件更新失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
}

export const softwareIntegrationService = new SoftwareIntegrationService();
