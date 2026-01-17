import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth';

const router = Router();

// 下载目录
const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads', 'desktop');

// 桌面应用信息
interface DesktopAppVersion {
  version: string;
  platform: 'windows' | 'mac' | 'linux';
  arch: 'x64' | 'ia32' | 'arm64';
  filename: string;
  filesize: number;
  downloadUrl: string;
  releaseDate: string;
  md5: string;
  sha256: string;
  isLatest: boolean;
}

// 初始化下载目录
const initializeDownloadDir = async () => {
  try {
    if (!require('fs').existsSync(DOWNLOAD_DIR)) {
      await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to initialize download directory:', error);
  }
};

// 获取版本信息
const getVersionInfo = async (): Promise<DesktopAppVersion[]> => {
  try {
    const versionFile = path.join(DOWNLOAD_DIR, 'version.json');
    const versionData = await fs.readFile(versionFile, 'utf-8');
    const versionInfo = JSON.parse(versionData);
    
    const versions: DesktopAppVersion[] = [];
    const files = versionInfo.files || [];
    
    for (const filename of files) {
      const filePath = path.join(DOWNLOAD_DIR, filename);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath);
      
      const platform: 'windows' | 'mac' | 'linux' = 
        filename.endsWith('.exe') ? 'windows' :
        filename.endsWith('.dmg') || filename.endsWith('.zip') ? 'mac' : 'linux';
      
      const arch: 'x64' | 'ia32' | 'arm64' = 
        filename.includes('ia32') ? 'ia32' :
        filename.includes('arm64') ? 'arm64' : 'x64';
      
      versions.push({
        version: versionInfo.version,
        platform,
        arch,
        filename,
        filesize: stats.size,
        downloadUrl: `/api/desktop/download/${filename}`,
        releaseDate: versionInfo.buildDate,
        md5: crypto.createHash('md5').update(content).digest('hex'),
        sha256: crypto.createHash('sha256').update(content).digest('hex'),
        isLatest: true // 当前都是最新版本
      });
    }
    
    return versions;
  } catch (error) {
    console.error('Failed to read version info:', error);
    return [];
  }
};

// 初始化
initializeDownloadDir();

/**
 * GET /api/desktop/versions
 * 获取所有桌面应用版本
 */
router.get('/versions', async (req: Request, res: Response) => {
  try {
    const versions = await getVersionInfo();
    res.json({
      success: true,
      data: versions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get desktop versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get versions'
    });
  }
});

/**
 * GET /api/desktop/latest/:platform
 * 获取指定平台的最新版本
 */
router.get('/latest/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const versions = await getVersionInfo();
    
    const platformVersions = versions.filter(
      v => v.platform === platform
    );
    
    if (platformVersions.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No version found for platform: ${platform}`
      });
    }
    
    // 优先返回x64架构
    const latestVersion = platformVersions.find(v => v.arch === 'x64') || platformVersions[0];
    
    res.json({
      success: true,
      data: latestVersion,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get latest version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get latest version'
    });
  }
});

/**
 * GET /api/desktop/download/:filename
 * 下载桌面应用安装程序
 */
router.get('/download/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // 安全检查：防止目录遍历
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }
    
    const filePath = path.join(DOWNLOAD_DIR, filename);
    
    // 检查文件是否存在
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    const stats = await fs.stat(filePath);
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 缓存1年
    
    // 发送文件
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
    
    // 记录下载
    console.log(`[Desktop Download] ${filename} downloaded by ${req.ip}`);
  } catch (error) {
    console.error('Failed to download file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

/**
 * POST /api/desktop/download
 * 处理下载请求（记录统计）
 */
router.post('/download', async (req: Request, res: Response) => {
  try {
    const { platform, arch, version } = req.body;
    
    const versions = await getVersionInfo();
    const targetVersion = versions.find(
      v => v.platform === platform && v.arch === arch && v.version === version
    );
    
    if (!targetVersion) {
      return res.status(404).json({
        success: false,
        error: 'Version not found'
      });
    }
    
    // 返回下载URL
    res.json({
      success: true,
      data: {
        downloadUrl: targetVersion.downloadUrl,
        filename: targetVersion.filename,
        filesize: targetVersion.filesize,
        md5: targetVersion.md5,
        sha256: targetVersion.sha256
      }
    });
  } catch (error) {
    console.error('Failed to process download request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process download request'
    });
  }
});

/**
 * GET /api/desktop/checksums
 * 获取所有文件的校验和
 */
router.get('/checksums', async (req: Request, res: Response) => {
  try {
    const checksums: any = {};
    
    // MD5校验和
    try {
      const md5Path = path.join(DOWNLOAD_DIR, 'checksums.md5');
      const md5Content = await fs.readFile(md5Path, 'utf-8');
      md5Content.split('\n').forEach(line => {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const hash = parts[0];
          const filename = parts[1];
          checksums[filename] = { ...checksums[filename], md5: hash };
        }
      });
    } catch (error) {
      console.error('Failed to read MD5 checksums:', error);
    }
    
    // SHA256校验和
    try {
      const sha256Path = path.join(DOWNLOAD_DIR, 'checksums.sha256');
      const sha256Content = await fs.readFile(sha256Path, 'utf-8');
      sha256Content.split('\n').forEach(line => {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const hash = parts[0];
          const filename = parts[1];
          checksums[filename] = { ...checksums[filename], sha256: hash };
        }
      });
    } catch (error) {
      console.error('Failed to read SHA256 checksums:', error);
    }
    
    res.json({
      success: true,
      data: checksums,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get checksums:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get checksums'
    });
  }
});

/**
 * GET /api/desktop/info
 * 获取桌面应用信息
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    const versions = await getVersionInfo();
    const versionInfo = await fs.readFile(
      path.join(DOWNLOAD_DIR, 'version.json'),
      'utf-8'
    ).then(JSON.parse).catch(() => ({}));
    
    // 统计各平台版本
    const windowsVersions = versions.filter(v => v.platform === 'windows');
    const macVersions = versions.filter(v => v.platform === 'mac');
    const linuxVersions = versions.filter(v => v.platform === 'linux');
    
    // 计算总下载次数（这里可以添加实际的下载统计）
    const totalDownloads = windowsVersions.length + macVersions.length + linuxVersions.length;
    
    res.json({
      success: true,
      data: {
        ...versionInfo,
        platforms: {
          windows: {
            count: windowsVersions.length,
            versions: windowsVersions
          },
          mac: {
            count: macVersions.length,
            versions: macVersions
          },
          linux: {
            count: linuxVersions.length,
            versions: linuxVersions
          }
        },
        totalDownloads,
        totalVersions: versions.length,
        latestUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to get desktop info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get desktop info'
    });
  }
});

export default router;
