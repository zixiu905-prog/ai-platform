import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { homedir } from 'os';
import chokidar from 'chokidar';

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  extension?: string;
  modifiedTime: Date;
  createdTime?: Date;
}

export interface FileWatcher {
  on: (event: 'change' | 'add' | 'unlink', callback: (path: string) => void) => void;
  close: () => void;
}

export class FileSystemService {
  private static instance: FileSystemService;
  private watchers: Map<string, chokidar.FSWatcher> = new Map();

  private constructor() {}

  static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  /**
   * 读取文件内容
   */
  async readFile(filePath: string): Promise<string> {
    try {
      if (!existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`读取文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 写入文件内容
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`写入文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取文件信息
   */
  getFileInfo(filePath: string): FileInfo | null {
    try {
      if (!existsSync(filePath)) {
        return null;
      }

      const stats = statSync(filePath);
      return {
        path: filePath,
        name: basename(filePath),
        size: stats.size,
        isDirectory: stats.isDirectory(),
        extension: extname(filePath),
        modifiedTime: stats.mtime,
        createdTime: stats.birthtime
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 列出目录内容
   */
  listDirectory(dirPath: string): FileInfo[] {
    try {
      if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
        return [];
      }

      return readdirSync(dirPath)
        .map(name => this.getFileInfo(join(dirPath, name)))
        .filter((info): info is FileInfo => info !== null)
        .sort((a, b) => {
          // 目录优先，然后按名称排序
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
    } catch (error) {
      return [];
    }
  }

  /**
   * 创建目录
   */
  createDirectory(dirPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        mkdirSync(dirPath, { recursive: true });
        resolve();
      } catch (error) {
        reject(new Error(`创建目录失败: ${error instanceof Error ? error.message : '未知错误'}`));
      }
    });
  }

  /**
   * 检查文件是否存在
   */
  fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  /**
   * 获取文件扩展名
   */
  getFileExtension(filePath: string): string {
    return extname(filePath).toLowerCase();
  }

  /**
   * 检查文件类型
   */
  isTextFile(filePath: string): boolean {
    const textExtensions = [
      '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx',
      '.html', '.css', '.scss', '.less', '.xml', '.yaml',
      '.yml', '.ini', '.conf', '.log', '.py', '.java',
      '.cpp', '.c', '.go', '.rs', '.php', '.rb', '.swift',
      '.kt', '.scala', '.r', '.sql', '.sh', '.bat'
    ];
    
    const ext = this.getFileExtension(filePath);
    return textExtensions.includes(ext);
  }

  /**
   * 获取用户主目录
   */
  getUserHomeDir(): string {
    return homedir();
  }

  /**
   * 创建文件监视器
   */
  createFileWatcher(watchPath: string, options?: {
    ignored?: string[];
    persistent?: boolean;
    ignoreInitial?: boolean;
  }): FileWatcher {
    const watcher = chokidar.watch(watchPath, {
      ignored: options?.ignored || /(^|[\/\\])\../, // ignore dotfiles
      persistent: options?.persistent !== false,
      ignoreInitial: options?.ignoreInitial !== false
    });

    const fileWatcher: FileWatcher = {
      on: (event: 'change' | 'add' | 'unlink', callback: (path: string) => void) => {
        watcher.on(event, callback);
      },
      close: () => {
        watcher.close();
        this.watchers.delete(watchPath);
      }
    };

    this.watchers.set(watchPath, watcher);
    return fileWatcher;
  }

  /**
   * 关闭所有文件监视器
   */
  closeAllWatchers(): void {
    for (const [path, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
  }

  /**
   * 搜索文件
   */
  searchFiles(
    searchDir: string, 
    pattern: string, 
    options?: {
      maxResults?: number;
      includeContent?: boolean;
      fileExtensions?: string[];
    }
  ): Promise<FileInfo[]> {
    return new Promise((resolve, reject) => {
      try {
        const results: FileInfo[] = [];
        const maxResults = options?.maxResults || 100;
        const allowedExtensions = options?.fileExtensions;
        const regex = new RegExp(pattern, 'i');

        const searchDirectory = (dirPath: string, depth = 0) => {
          if (depth > 10 || results.length >= maxResults) return; // 防止无限递归

          try {
            const items = this.listDirectory(dirPath);
            
            for (const item of items) {
              if (results.length >= maxResults) break;

              if (item.isDirectory) {
                searchDirectory(item.path, depth + 1);
              } else {
                // 检查扩展名过滤
                if (allowedExtensions && !allowedExtensions.includes(item.extension || '')) {
                  continue;
                }

                // 检查文件名匹配
                if (regex.test(item.name)) {
                  results.push(item);
                  continue;
                }

                // 如果启用了内容搜索，也搜索文件内容
                if (options?.includeContent && this.isTextFile(item.path)) {
                  try {
                    const content = readFileSync(item.path, 'utf-8');
                    if (regex.test(content)) {
                      results.push(item);
                    }
                  } catch {
                    // 忽略无法读取的文件
                  }
                }
              }
            }
          } catch {
            // 忽略无法访问的目录
          }
        };

        searchDirectory(searchDir);
        resolve(results);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取项目根目录（向上查找package.json等标记文件）
   */
  getProjectRoot(startPath: string): string | null {
    let currentPath = startPath;
    
    while (currentPath !== dirname(currentPath)) {
      if (existsSync(join(currentPath, 'package.json')) ||
          existsSync(join(currentPath, '.git')) ||
          existsSync(join(currentPath, 'tsconfig.json'))) {
        return currentPath;
      }
      
      currentPath = dirname(currentPath);
    }
    
    return null;
  }

  /**
   * 获取相对路径
   */
  getRelativePath(fromPath: string, toPath: string): string {
    // 简单的相对路径计算
    const fromParts = fromPath.split(/[/\\]/);
    const toParts = toPath.split(/[/\\]/);
    
    let commonLength = 0;
    const minLength = Math.min(fromParts.length, toParts.length);
    
    for (let i = 0; i < minLength; i++) {
      if (fromParts[i] === toParts[i]) {
        commonLength++;
      } else {
        break;
      }
    }
    
    const upLevels = fromParts.length - commonLength - 1;
    const relativeParts = Array(upLevels).fill('..').concat(toParts.slice(commonLength));
    
    return relativeParts.join('/');
  }
}