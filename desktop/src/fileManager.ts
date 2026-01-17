/**
 * 文件管理器
 * 处理文件的读写、格式转换、压缩解压等操作
 */

import * as fs from 'fs';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { promisify } from 'util';
import * as zlib from 'zlib';
import * as tar from 'tar';

const pipeline = promisify(require('stream').pipeline);

export interface FileOperationOptions {
  encoding?: BufferEncoding;
  createDir?: boolean;
  overwrite?: boolean;
  backup?: boolean;
}

export interface FileMetadata {
  size: number;
  mtime: Date;
  ctime: Date;
  isFile: boolean;
  isDirectory: boolean;
  extension?: string;
  mimeType?: string;
}

export interface FileProgress {
  bytesRead: number;
  bytesTotal: number;
  progress: number;
  speed?: number;
}

export class FileManager {
  private static instance: FileManager;
  private watchedFiles: Map<string, fs.FSWatcher> = new Map();
  private fileOperations: Map<string, any> = new Map();

  constructor() {
    this.setupDefaultDirectories();
  }

  public static getInstance(): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager();
    }
    return FileManager.instance;
  }

  /**
   * 设置默认目录结构
   */
  private setupDefaultDirectories(): void {
    const userDataPath = (global as any).app?.getPath('userData') || './';
    const directories = [
      'projects',
      'templates',
      'assets',
      'cache',
      'logs',
      'temp',
      'models',
      'exports'
    ];

    directories.forEach(dir => {
      const fullPath = path.join(userDataPath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  /**
   * 读取文件
   */
  public async readFile(filePath: string, options: FileOperationOptions = {}): Promise<{
    success: boolean;
    data?: string | Buffer;
    error?: string;
    metadata?: FileMetadata;
  }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }

      const encoding = options.encoding || 'utf8';
      const data = fs.readFileSync(filePath, encoding);
      const metadata = await this.getFileMetadata(filePath);

      return { success: true, data, metadata };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 写入文件
   */
  public async writeFile(
    filePath: string, 
    content: string | Buffer, 
    options: FileOperationOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 确保目录存在
      if (options.createDir !== false) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // 备份现有文件
      if (options.backup && fs.existsSync(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
      }

      // 写入文件
      const encoding = options.encoding || 'utf8';
      fs.writeFileSync(filePath, content, { encoding });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 追加文件内容
   */
  public async appendFile(
    filePath: string, 
    content: string | Buffer, 
    options: FileOperationOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 确保目录存在
      if (options.createDir !== false) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      const encoding = options.encoding || 'utf8';
      fs.appendFileSync(filePath, content, { encoding });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 复制文件
   */
  public async copyFile(
    sourcePath: string, 
    destPath: string, 
    options: FileOperationOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 检查源文件是否存在
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: '源文件不存在' };
      }

      // 确保目标目录存在
      if (options.createDir !== false) {
        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // 检查目标文件是否已存在
      if (fs.existsSync(destPath) && options.overwrite !== true) {
        return { success: false, error: '目标文件已存在' };
      }

      // 复制文件
      fs.copyFileSync(sourcePath, destPath);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 移动文件
   */
  public async moveFile(
    sourcePath: string, 
    destPath: string, 
    options: FileOperationOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 检查源文件是否存在
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: '源文件不存在' };
      }

      // 确保目标目录存在
      if (options.createDir !== false) {
        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // 检查目标文件是否已存在
      if (fs.existsSync(destPath) && options.overwrite !== true) {
        return { success: false, error: '目标文件已存在' };
      }

      // 移动文件
      fs.renameSync(sourcePath, destPath);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 删除文件
   */
  public async deleteFile(
    filePath: string, 
    options: { moveToTrash?: boolean } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }

      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // 删除目录
        if (options.moveToTrash) {
          // TODO: 实现移动到回收站
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.rmSync(filePath, { recursive: true, force: true });
        }
      } else {
        // 删除文件
        if (options.moveToTrash) {
          // TODO: 实现移动到回收站
          fs.unlinkSync(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取文件元数据
   */
  public async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const stat = fs.statSync(filePath);
      const extension = path.extname(filePath).toLowerCase();
      
      return {
        size: stat.size,
        mtime: stat.mtime,
        ctime: stat.ctime,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        extension: extension || undefined,
        mimeType: this.getMimeType(extension)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 列出目录内容
   */
  public async listDirectory(
    dirPath: string, 
    options: { 
      recursive?: boolean; 
      includeHidden?: boolean;
      filter?: RegExp;
    } = {}
  ): Promise<{ success: boolean; files?: any[]; error?: string }> {
    try {
      if (!fs.existsSync(dirPath)) {
        return { success: false, error: '目录不存在' };
      }

      const files: any[] = [];
      const { recursive = false, includeHidden = false, filter } = options;

      const processDirectory = (currentPath: string, depth: number = 0): void => {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
          // 跳过隐藏文件
          if (!includeHidden && item.startsWith('.')) {
            continue;
          }

          // 应用过滤器
          if (filter && !filter.test(item)) {
            continue;
          }

          const fullPath = path.join(currentPath, item);
          const stat = fs.statSync(fullPath);

          const fileData = {
            name: item,
            path: fullPath,
            relativePath: path.relative(dirPath, fullPath),
            isFile: stat.isFile(),
            isDirectory: stat.isDirectory(),
            size: stat.size,
            mtime: stat.mtime,
            ctime: stat.ctime,
            extension: stat.isFile() ? path.extname(item).toLowerCase() : undefined,
            depth
          };

          files.push(fileData);

          // 递归处理子目录
          if (recursive && stat.isDirectory()) {
            processDirectory(fullPath, depth + 1);
          }
        }
      };

      processDirectory(dirPath);

      return { success: true, files };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 监视文件变化
   */
  public watchFile(
    filePath: string, 
    callback: (event: string, filename: string) => void
  ): { success: boolean; error?: string } {
    try {
      // 如果已经在监视，先停止
      if (this.watchedFiles.has(filePath)) {
        this.watchedFiles.get(filePath)?.close();
      }

      const watcher = fs.watch(filePath, callback);
      this.watchedFiles.set(filePath, watcher);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 停止监视文件
   */
  public unwatchFile(filePath: string): void {
    const watcher = this.watchedFiles.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchedFiles.delete(filePath);
    }
  }

  /**
   * 压缩文件
   */
  public async compressFiles(
    sourcePaths: string[], 
    destPath: string,
    options: { format: 'zip' | 'gzip' | 'tar'; level?: number } = { format: 'zip' }
  ): Promise<{ success: boolean; error?: string; progress?: FileProgress }> {
    try {
      const { format, level = 6 } = options;

      switch (format) {
        case 'gzip':
          // 单文件gzip压缩
          if (sourcePaths.length !== 1) {
            return { success: false, error: 'gzip压缩只支持单个文件' };
          }
          await this.gzipCompress(sourcePaths[0], destPath, level);
          break;

        case 'tar':
          await this.tarCompress(sourcePaths, destPath);
          break;

        case 'zip':
          // TODO: 实现zip压缩
          return { success: false, error: 'zip压缩尚未实现' };

        default:
          return { success: false, error: '不支持的压缩格式' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 解压文件
   */
  public async extractFiles(
    sourcePath: string, 
    destPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const ext = path.extname(sourcePath).toLowerCase();

      switch (ext) {
        case '.gz':
        case '.gzip':
          await this.gzipExtract(sourcePath, destPath);
          break;

        case '.tar':
          await this.tarExtract(sourcePath, destPath);
          break;

        default:
          return { success: false, error: '不支持的压缩格式' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Gzip压缩
   */
  private async gzipCompress(sourcePath: string, destPath: string, level: number): Promise<void> {
    const readStream = createReadStream(sourcePath);
    const writeStream = createWriteStream(destPath);
    const gzipStream = zlib.createGzip({ level });

    await pipeline(readStream, gzipStream, writeStream);
  }

  /**
   * Gzip解压
   */
  private async gzipExtract(sourcePath: string, destPath: string): Promise<void> {
    const readStream = createReadStream(sourcePath);
    const writeStream = createWriteStream(destPath);
    const gunzipStream = zlib.createGunzip();

    await pipeline(readStream, gunzipStream, writeStream);
  }

  /**
   * Tar压缩
   */
  private async tarCompress(sourcePaths: string[], destPath: string): Promise<void> {
    await tar.create(
      {
        file: destPath,
        gzip: true
      },
      sourcePaths
    );
  }

  /**
   * Tar解压
   */
  private async tarExtract(sourcePath: string, destPath: string): Promise<void> {
    await tar.extract({
      file: sourcePath,
      cwd: destPath
    });
  }

  /**
   * 获取MIME类型
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * 清理临时文件
   */
  public async cleanupTempFiles(): Promise<{ success: boolean; error?: string; cleaned?: number }> {
    try {
      const userDataPath = (global as any).app?.getPath('userData') || './';
      const tempDir = path.join(userDataPath, 'temp');
      
      if (!fs.existsSync(tempDir)) {
        return { success: true, cleaned: 0 };
      }

      let cleaned = 0;
      const files = fs.readdirSync(tempDir);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stat = fs.statSync(filePath);
        
        // 删除超过24小时的临时文件
        const ageMs = Date.now() - stat.mtime.getTime();
        if (ageMs > 24 * 60 * 60 * 1000) {
          fs.rmSync(filePath, { recursive: true, force: true });
          cleaned++;
        }
      }

      return { success: true, cleaned };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// 导出单例实例
export const fileManager = FileManager.getInstance();