import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync, statSync, readFileSync, readdirSync } from 'fs';
import { platform, arch } from 'os';
import { join, dirname, basename, extname } from 'path';

// 动态导入 winreg（仅 Windows 安装版使用）
let Registry: any = null;
if (platform() === 'win32') {
  try {
    // @ts-ignore
    const winregModule = require('winreg');
    Registry = winregModule.Registry;
  } catch (error) {
    console.warn('winreg 模块未安装，将禁用注册表搜索功能');
  }
}
import { IntelligentPathSearchService, PathSearchResult } from './intelligentPathSearchService';

const execAsync = promisify(exec) as any;

export interface SoftwareInfo {
  name: string;
  version: string;
  path: string;
  executable: string;
  icon?: string;
  category: 'design' | 'development' | 'modeling' | 'rendering' | 'other';
  status: 'installed' | 'not_installed' | 'unknown';
  lastUsed?: Date;
  capabilities?: string[];
  publisher?: string;
  installDate?: Date;
  size?: number;
  isLocked?: boolean;
  detectedPaths?: string[];
  confidence?: number; // 检测置信度 0-100
}

export interface SoftwareCommand {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  script: string;
}

export class SoftwareIntegrationService {
  private platform: NodeJS.Platform;
  private softwareCache: Map<string, SoftwareInfo> = new Map();
  private registryCache: Map<string, string> = new Map();
  private environmentPaths: string[] = [];
  private scannedDirectories: Set<string> = new Set();
  private intelligentSearch: IntelligentPathSearchService;
  private readonly softwarePaths = {
    win32: {
      // Adobe系列
      photoshop: [
        'C:\\Program Files\\Adobe\\Adobe Photoshop*',
        'C:\\Program Files (x86)\\Adobe\\Adobe Photoshop*',
        'C:\\Program Files\\Adobe\\Photoshop*',
        'C:\\Program Files (x86)\\Adobe\\Photoshop*'
      ],
      illustrator: [
        'C:\\Program Files\\Adobe\\Adobe Illustrator*',
        'C:\\Program Files (x86)\\Adobe\\Adobe Illustrator*',
        'C:\\Program Files\\Adobe\\Illustrator*',
        'C:\\Program Files (x86)\\Adobe\\Illustrator*'
      ],
      indesign: [
        'C:\\Program Files\\Adobe\\Adobe InDesign*',
        'C:\\Program Files (x86)\\Adobe\\Adobe InDesign*',
        'C:\\Program Files\\Adobe\\InDesign*',
        'C:\\Program Files (x86)\\Adobe\\InDesign*'
      ],
      aftereffects: [
        'C:\\Program Files\\Adobe\\Adobe After Effects*',
        'C:\\Program Files (x86)\\Adobe\\Adobe After Effects*',
        'C:\\Program Files\\Adobe\\After Effects*',
        'C:\\Program Files (x86)\\Adobe\\After Effects*'
      ],
      premiere: [
        'C:\\Program Files\\Adobe\\Adobe Premiere Pro*',
        'C:\\Program Files (x86)\\Adobe\\Adobe Premiere Pro*',
        'C:\\Program Files\\Adobe\\Premiere Pro*',
        'C:\\Program Files (x86)\\Adobe\\Premiere Pro*'
      ],
      
      // Autodesk系列
      autocad: [
        'C:\\Program Files\\Autodesk\\AutoCAD*',
        'C:\\Program Files (x86)\\Autodesk\\AutoCAD*',
        'C:\\Program Files\\Autodesk\\AutoCAD*',
        'C:\\Program Files (x86)\\Autodesk\\AutoCAD*'
      ],
      '3dsmax': [
        'C:\\Program Files\\Autodesk\\3ds Max*',
        'C:\\Program Files (x86)\\Autodesk\\3ds Max*',
        'C:\\Program Files\\Autodesk\\3ds Max*',
        'C:\\Program Files (x86)\\Autodesk\\3ds Max*'
      ],
      maya: [
        'C:\\Program Files\\Autodesk\\Maya*',
        'C:\\Program Files (x86)\\Autodesk\\Maya*',
        'C:\\Program Files\\Autodesk\\Maya*',
        'C:\\Program Files (x86)\\Autodesk\\Maya*'
      ],
      revit: [
        'C:\\Program Files\\Autodesk\\Revit*',
        'C:\\Program Files (x86)\\Autodesk\\Revit*',
        'C:\\Program Files\\Autodesk\\Revit*',
        'C:\\Program Files (x86)\\Autodesk\\Revit*'
      ],
      
      // 其他设计软件
      blender: [
        'C:\\Program Files\\Blender Foundation\\Blender*',
        'C:\\Program Files (x86)\\Blender Foundation\\Blender*',
        'C:\\Program Files\\Blender*',
        'C:\\Program Files (x86)\\Blender*'
      ],
      sketchup: [
        'C:\\Program Files\\SketchUp\\SketchUp*',
        'C:\\Program Files (x86)\\SketchUp\\SketchUp*',
        'C:\\Program Files\\SketchUp*',
        'C:\\Program Files (x86)\\SketchUp*'
      ],
      rhino: [
        'C:\\Program Files\\Rhino*',
        'C:\\Program Files (x86)\\Rhino*',
        'C:\\Program Files\\Rhinoceros*',
        'C:\\Program Files (x86)\\Rhinoceros*'
      ],
      zbrush: [
        'C:\\Program Files\\Pixologic\\ZBrush*',
        'C:\\Program Files (x86)\\Pixologic\\ZBrush*',
        'C:\\Program Files\\ZBrush*',
        'C:\\Program Files (x86)\\ZBrush*'
      ],
      substance: [
        'C:\\Program Files\\Adobe\\Adobe Substance 3D*',
        'C:\\Program Files (x86)\\Adobe\\Adobe Substance 3D*',
        'C:\\Program Files\\Allegorithmic\\Substance*',
        'C:\\Program Files (x86)\\Allegorithmic\\Substance*'
      ],
      
      // 开发工具
      vscode: [
        'C:\\Program Files\\Microsoft VS Code\\Code.exe',
        'C:\\Program Files (x86)\\Microsoft VS Code\\Code.exe',
        'C:\\Users\\*\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe'
      ],
      jetbrains: [
        'C:\\Program Files\\JetBrains\\*\\bin\\*.exe',
        'C:\\Program Files (x86)\\JetBrains\\*\\bin\\*.exe'
      ],
      
      // 渲染引擎
      vray: [
        'C:\\Program Files\\Chaos Group\\V-Ray*',
        'C:\\Program Files (x86)\\Chaos Group\\V-Ray*'
      ],
      corona: [
        'C:\\Program Files\\Corona Renderer\\*',
        'C:\\Program Files (x86)\\Corona Renderer\\*'
      ],
      octane: [
        'C:\\Program Files\\OTOY\\OctaneRender*',
        'C:\\Program Files (x86)\\OTOY\\OctaneRender*'
      ]
    },
    darwin: {
      // Adobe系列
      photoshop: [
        '/Applications/Adobe Photoshop*',
        '/Applications/Adobe Photoshop*/Adobe Photoshop*.app'
      ],
      illustrator: [
        '/Applications/Adobe Illustrator*',
        '/Applications/Adobe Illustrator*/Adobe Illustrator*.app'
      ],
      indesign: [
        '/Applications/Adobe InDesign*',
        '/Applications/Adobe InDesign*/Adobe InDesign*.app'
      ],
      aftereffects: [
        '/Applications/Adobe After Effects*',
        '/Applications/Adobe After Effects*/Adobe After Effects*.app'
      ],
      premiere: [
        '/Applications/Adobe Premiere Pro*',
        '/Applications/Adobe Premiere Pro*/Adobe Premiere Pro*.app'
      ],
      
      // Autodesk系列
      autocad: [
        '/Applications/Autodesk/AutoCAD*',
        '/Applications/AutoCAD*'
      ],
      maya: [
        '/Applications/Autodesk/Maya*',
        '/Applications/Maya*'
      ],
      
      // 其他设计软件
      blender: [
        '/Applications/Blender.app',
        '/Applications/Blender*.app'
      ],
      sketchup: [
        '/Applications/SketchUp*',
        '/Applications/SketchUp*.app'
      ],
      rhino: [
        '/Applications/Rhinoceros.app',
        '/Applications/Rhino*.app'
      ],
      zbrush: [
        '/Applications/ZBrush.app',
        '/Applications/ZBrush*.app'
      ],
      
      // 开发工具
      vscode: [
        '/Applications/Visual Studio Code.app',
        '/Applications/Code.app'
      ],
      jetbrains: [
        '/Applications/IntelliJ IDEA*.app',
        '/Applications/PyCharm*.app',
        '/Applications/WebStorm*.app',
        '/Applications/CLion*.app',
        '/Applications/DataGrip*.app'
      ],
      
      // 其他macOS应用
      figma: [
        '/Applications/Figma.app',
        '/Applications/Figma*.app'
      ],
      sketch: [
        '/Applications/Sketch.app',
        '/Applications/Sketch*.app'
      ]
    },
    linux: {
      // 建模软件
      blender: [
        '/usr/bin/blender',
        '/opt/blender*',
        '~/.local/bin/blender',
        '/usr/local/bin/blender',
        '/snap/blender/current/bin/blender'
      ],
      // 图像处理
      gimp: [
        '/usr/bin/gimp',
        '/opt/gimp*',
        '~/.local/bin/gimp',
        '/usr/local/bin/gimp',
        '/snap/gimp/current/bin/gimp'
      ],
      inkscape: [
        '/usr/bin/inkscape',
        '/opt/inkscape*',
        '~/.local/bin/inkscape',
        '/usr/local/bin/inkscape',
        '/snap/inkscape/current/bin/inkscape'
      ],
      krita: [
        '/usr/bin/krita',
        '/opt/krita*',
        '~/.local/bin/krita',
        '/usr/local/bin/krita',
        '/snap/krita/current/bin/krita'
      ],
      
      // CAD软件
      freecad: [
        '/usr/bin/freecad',
        '/opt/freecad*',
        '~/.local/bin/freecad',
        '/usr/local/bin/freecad'
      ],
      openscad: [
        '/usr/bin/openscad',
        '/opt/openscad*',
        '~/.local/bin/openscad',
        '/usr/local/bin/openscad'
      ],
      
      // 开发工具
      vscode: [
        '/usr/bin/code',
        '/opt/visual-studio-code/code',
        '~/.local/bin/code',
        '/usr/local/bin/code',
        '/snap/code/current/bin/code'
      ],
      jetbrains: [
        '/opt/jetbrains-*/*/bin/*.sh',
        '~/.local/share/JetBrains/*/bin/*.sh'
      ],
      
      // 其他工具
      darktable: [
        '/usr/bin/darktable',
        '/opt/darktable*',
        '~/.local/bin/darktable',
        '/usr/local/bin/darktable'
      ],
      rawtherapee: [
        '/usr/bin/rawtherapee',
        '/opt/rawtherapee*',
        '~/.local/bin/rawtherapee',
        '/usr/local/bin/rawtherapee'
      ]
    }
  };

  constructor() {
    this.platform = platform();
    this.intelligentSearch = new IntelligentPathSearchService();
    this.initializeEnvironmentPaths();
  }

  /**
   * 初始化环境路径
   */
  private initializeEnvironmentPaths(): void {
    if (this.platform === 'win32') {
      const programFiles = ['C:\\Program Files', 'C:\\Program Files (x86)'];
      const programData = ['C:\\ProgramData', 'C:\\Users\\*\\AppData\\Local', 'C:\\Users\\*\\AppData\\Roaming'];
      this.environmentPaths = [...programFiles, ...programData];
    } else if (this.platform === 'darwin') {
      this.environmentPaths = ['/Applications', '/usr/local/bin', '/opt', '~/.local/bin'];
    } else {
      this.environmentPaths = ['/usr/bin', '/usr/local/bin', '/opt', '~/.local/bin', '/snap/bin'];
    }
  }

  /**
   * 扫描所有已安装的设计软件（增强版）
   */
  async scanInstalledSoftware(deepScan: boolean = false): Promise<SoftwareInfo[]> {
    const softwareList: SoftwareInfo[] = [];
    const platformSoftware = this.softwarePaths[this.platform as keyof typeof this.softwarePaths];

    if (!platformSoftware) {
      console.warn(`❌ 不支持的平台: ${this.platform}`);
      return softwareList;
    }

    // 清空缓存
    this.scannedDirectories.clear();
    
    // 并行扫描所有软件
    const scanPromises = Object.entries(platformSoftware).map(async ([softwareName, paths]) => {
      try {
        const softwareInfo = await this.detectSoftwareEnhanced(softwareName, paths, deepScan);
        if (softwareInfo) {
          this.softwareCache.set(softwareName, softwareInfo);
          return softwareInfo;
        }
      } catch (error) {
        console.error(`❌ 检测软件 ${softwareName} 失败:`, error);
      }
      return null;
    });

    const results = await Promise.allSettled(scanPromises);
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<SoftwareInfo> => 
        result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);

    // 如果启用深度扫描，进行额外搜索
    if (deepScan) {
      const deepScanResults = await this.performDeepScan();
      successfulResults.push(...deepScanResults);
    }

    console.log(`✅ 扫描完成，发现 ${successfulResults.length} 个设计软件`);
    return successfulResults;
  }

  /**
   * 增强的软件检测方法
   */
  private async detectSoftwareEnhanced(
    softwareName: string, 
    searchPaths: string[], 
    deepScan: boolean = false
  ): Promise<SoftwareInfo | null> {
    const detectedPaths: string[] = [];
    let bestMatch: SoftwareInfo | null = null;
    let highestConfidence = 0;

    // 1. 标准路径搜索
    for (const pathPattern of searchPaths) {
      try {
        const paths = await this.findFilesEnhanced(pathPattern);
        detectedPaths.push(...paths);
        
        for (const path of paths) {
          if (existsSync(path)) {
            const softwareInfo = await this.getSoftwareInfoEnhanced(softwareName, path);
            if (softwareInfo && softwareInfo.confidence && softwareInfo.confidence > highestConfidence) {
              bestMatch = softwareInfo;
              highestConfidence = softwareInfo.confidence;
            }
          }
        }
      } catch (error) {
        // 忽略单个路径的错误，继续尝试其他路径
      }
    }

    // 2. Windows注册表检测
    if (this.platform === 'win32') {
      try {
        const registryPaths = await this.searchRegistry(softwareName);
        for (const regPath of registryPaths) {
          if (existsSync(regPath)) {
            const softwareInfo = await this.getSoftwareInfoEnhanced(softwareName, regPath);
            if (softwareInfo && softwareInfo.confidence && softwareInfo.confidence > highestConfidence) {
              bestMatch = softwareInfo;
              highestConfidence = softwareInfo.confidence;
            }
            detectedPaths.push(regPath);
          }
        }
      } catch (error) {
        console.warn(`注册表搜索失败 ${softwareName}:`, error);
      }
    }

    // 3. 环境变量PATH搜索
    try {
      const envPath = this.searchEnvironmentPath(softwareName);
      if (envPath && existsSync(envPath)) {
        const softwareInfo = await this.getSoftwareInfoEnhanced(softwareName, envPath);
        if (softwareInfo && softwareInfo.confidence && softwareInfo.confidence > highestConfidence) {
          bestMatch = softwareInfo;
          highestConfidence = softwareInfo.confidence;
        }
        detectedPaths.push(envPath);
      }
    } catch (error) {
      console.warn(`环境变量搜索失败 ${softwareName}:`, error);
    }

    // 4. 深度扫描（可选）
    if (deepScan && !bestMatch) {
      try {
        const deepScanResults = await this.deepSearchDirectories(softwareName);
        for (const deepPath of deepScanResults) {
          if (existsSync(deepPath)) {
            const softwareInfo = await this.getSoftwareInfoEnhanced(softwareName, deepPath);
            if (softwareInfo && softwareInfo.confidence && softwareInfo.confidence > highestConfidence) {
              bestMatch = softwareInfo;
              highestConfidence = softwareInfo.confidence;
            }
            detectedPaths.push(deepPath);
          }
        }
      } catch (error) {
        console.warn(`深度搜索失败 ${softwareName}:`, error);
      }
    }

    // 返回最佳匹配或创建未安装信息
    if (bestMatch) {
      bestMatch.detectedPaths = [...new Set(detectedPaths)]; // 去重
      return bestMatch;
    }

    return this.createNotInstalledInfo(softwareName);
  }

  /**
   * 增强的文件查找（支持更多通配符模式）
   */
  private async findFilesEnhanced(pattern: string): Promise<string[]> {
    return new Promise((resolve) => {
      // 使用更强大的glob模式匹配
      const cmd = this.platform === 'win32' ? 'where' : 'find';
      
      try {
        if (this.platform === 'win32') {
          execAsync(`where /r "${pattern.replace(/[*]/g, '')}" 2>nul`, { shell: true }).then(({ stdout }) => {
            const files = stdout.trim().split('\n').filter(line => line.trim());
            resolve(files);
          }).catch(() => {
            resolve([]);
          });
        } else {
          // 使用find命令进行更精确的搜索
          const baseDir = pattern.split('*')[0];
          execAsync(`find "${baseDir}" -name "${basename(pattern)}" -type f 2>/dev/null`, { shell: true }).then(({ stdout }) => {
            const files = stdout.trim().split('\n').filter(line => line.trim());
            resolve(files);
          }).catch(() => {
            resolve([]);
          });
        }
      } catch (error) {
        resolve([]);
      }
    });
  }

  /**
   * Windows注册表搜索
   */
  private async searchRegistry(softwareName: string): Promise<string[]> {
    if (this.platform !== 'win32' || !Registry) return [];

    return new Promise((resolve) => {
      const paths: string[] = [];
      const registry = new Registry({
        hive: Registry.HKLM,
        key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
      });

      registry.keys((err, items) => {
        if (err) {
          resolve([]);
          return;
        }

        const searchPromises = items?.map(item => {
          return new Promise<void>((itemResolve) => {
            const subRegistry = new Registry({
              hive: Registry.HKLM,
              key: item.key
            });

            subRegistry.values((subErr, values) => {
              if (subErr) {
                itemResolve();
                return;
              }

              values?.forEach(value => {
                if (value.name === 'DisplayName' &&
                    typeof value.value === 'string' &&
                    value.value.toLowerCase().includes(softwareName.toLowerCase())) {
                  // 找到匹配的软件，获取安装路径
                  const installLocation = values.find(v => v.name === 'InstallLocation');
                  if (installLocation && typeof installLocation.value === 'string') {
                    paths.push(installLocation.value);
                  }
                }
              });
              itemResolve();
            });
          });
        }) || [];

        Promise.all(searchPromises).then(() => {
          resolve(paths);
        });
      });
    });
  }

  /**
   * 环境变量PATH搜索
   */
  private searchEnvironmentPath(softwareName: string): string | null {
    const execName = this.getExecutableName(softwareName);
    const pathEnv = process.env.PATH || '';
    
    if (this.platform === 'win32') {
      const paths = pathEnv.split(';');
      const exeNames = [`${execName}.exe`, execName];
      
      for (const path of paths) {
        for (const exe of exeNames) {
          const fullPath = join(path, exe);
          if (existsSync(fullPath)) {
            return fullPath;
          }
        }
      }
    } else {
      const paths = pathEnv.split(':');
      for (const path of paths) {
        const fullPath = join(path, execName);
        if (existsSync(fullPath)) {
          return fullPath;
        }
      }
    }
    
    return null;
  }

  /**
   * 深度目录搜索
   */
  private async deepSearchDirectories(softwareName: string): Promise<string[]> {
    const results: string[] = [];
    const execName = this.getExecutableName(softwareName);
    const maxDepth = 5;

    for (const basePath of this.environmentPaths) {
      try {
        const searchResults = await this.recursiveSearch(basePath, execName, maxDepth);
        results.push(...searchResults);
      } catch (error) {
        // 忽略无法访问的目录
      }
    }

    return results;
  }

  /**
   * 递归搜索目录
   */
  private async recursiveSearch(
    dirPath: string, 
    targetName: string, 
    maxDepth: number,
    currentDepth: number = 0
  ): Promise<string[]> {
    if (currentDepth >= maxDepth || this.scannedDirectories.has(dirPath)) {
      return [];
    }

    this.scannedDirectories.add(dirPath);
    const results: string[] = [];

    try {
      if (!existsSync(dirPath)) {
        return results;
      }

      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
          // 递归搜索子目录
          const subResults = await this.recursiveSearch(fullPath, targetName, maxDepth, currentDepth + 1);
          results.push(...subResults);
        } else if (stats.isFile() && item.toLowerCase().includes(targetName.toLowerCase())) {
          // 找到匹配的文件
          results.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略权限错误等
    }

    return results;
  }

  /**
   * 获取可执行文件名
   */
  private getExecutableName(softwareName: string): string {
    const execMap: Record<string, string> = {
      photoshop: 'Photoshop',
      illustrator: 'Illustrator',
      indesign: 'InDesign',
      aftereffects: 'AfterFX',
      premiere: 'Adobe Premiere Pro',
      autocad: 'acad',
      '3dsmax': '3dsmax',
      maya: 'maya',
      revit: 'Revit',
      blender: 'blender',
      sketchup: 'SketchUp',
      rhino: 'Rhino',
      zbrush: 'ZBrush',
      gimp: 'gimp',
      inkscape: 'inkscape',
      krita: 'krita',
      vscode: 'Code',
      freecad: 'FreeCAD',
      openscad: 'openscad',
      darktable: 'darktable',
      rawtherapee: 'rawtherapee'
    };

    return execMap[softwareName] || softwareName;
  }

  /**
   * 增强的软件信息获取
   */
  private async getSoftwareInfoEnhanced(softwareName: string, path: string): Promise<SoftwareInfo | null> {
    try {
      const executable = await this.findExecutableEnhanced(softwareName, path);
      const version = await this.getSoftwareVersionEnhanced(softwareName, executable);
      const category = this.getSoftwareCategory(softwareName);
      const capabilities = this.getSoftwareCapabilities(softwareName);
      const publisher = await this.getPublisherInfo(softwareName, path);
      const installDate = await this.getInstallDate(softwareName, path);
      const size = await this.calculateSoftwareSize(path);
      const confidence = this.calculateConfidence(softwareName, path, executable, version);

      return {
        name: this.getSoftwareDisplayName(softwareName),
        version: version || 'unknown',
        path,
        executable,
        category,
        status: 'installed',
        capabilities,
        publisher,
        installDate,
        size,
        isLocked: false,
        confidence
      };
    } catch (error) {
      console.error(`❌ 获取软件信息失败 ${softwareName}:`, error);
      return null;
    }
  }

  /**
   * 增强的可执行文件查找
   */
  private async findExecutableEnhanced(softwareName: string, path: string): Promise<string> {
    const execMap: Record<string, string[]> = {
      // Adobe系列
      photoshop: this.platform === 'win32' 
        ? ['Photoshop.exe', 'Photoshop.exe'] 
        : ['Adobe Photoshop*', 'Photoshop'],
      illustrator: this.platform === 'win32' 
        ? ['Illustrator.exe', 'Adobe Illustrator.exe'] 
        : ['Adobe Illustrator*', 'Illustrator'],
      indesign: this.platform === 'win32' 
        ? ['InDesign.exe', 'Adobe InDesign.exe'] 
        : ['Adobe InDesign*', 'InDesign'],
      aftereffects: this.platform === 'win32' 
        ? ['AfterFX.exe', 'Adobe After Effects.exe'] 
        : ['Adobe After Effects*', 'AfterFX'],
      premiere: this.platform === 'win32' 
        ? ['Adobe Premiere Pro.exe', 'Premiere Pro.exe'] 
        : ['Adobe Premiere Pro*', 'Premiere Pro'],
      
      // Autodesk系列
      autocad: this.platform === 'win32' 
        ? ['acad.exe', 'AutoCAD.exe'] 
        : ['AutoCAD*', 'acad'],
      '3dsmax': this.platform === 'win32' 
        ? ['3dsmax.exe', '3ds Max.exe'] 
        : ['3ds Max*', '3dsmax'],
      maya: this.platform === 'win32' 
        ? ['maya.exe', 'Maya.exe'] 
        : ['Maya*', 'maya'],
      revit: this.platform === 'win32' 
        ? ['Revit.exe', 'Autodesk Revit.exe'] 
        : ['Revit*', 'revit'],
      
      // 其他软件
      blender: this.platform === 'win32' ? ['blender.exe'] : ['blender'],
      sketchup: this.platform === 'win32' ? ['SketchUp.exe'] : ['SketchUp*'],
      rhino: this.platform === 'win32' ? ['Rhino.exe', 'Rhinoceros.exe'] : ['Rhino*', 'Rhinoceros'],
      zbrush: this.platform === 'win32' ? ['ZBrush.exe'] : ['ZBrush*'],
      gimp: this.platform === 'win32' ? ['gimp.exe'] : ['gimp'],
      inkscape: this.platform === 'win32' ? ['inkscape.exe'] : ['inkscape'],
      krita: this.platform === 'win32' ? ['krita.exe'] : ['krita'],
      vscode: this.platform === 'win32' ? ['Code.exe'] : ['Code', 'code'],
      freecad: this.platform === 'win32' ? ['FreeCAD.exe'] : ['FreeCAD', 'freecad'],
      openscad: this.platform === 'win32' ? ['OpenSCAD.exe'] : ['openscad', 'OpenSCAD'],
      darktable: this.platform === 'win32' ? ['darktable.exe'] : ['darktable'],
      rawtherapee: this.platform === 'win32' ? ['rawtherapee.exe'] : ['rawtherapee']
    };

    const possibleExecs = execMap[softwareName] || [softwareName];

    // 1. 在指定路径中查找
    for (const exec of possibleExecs) {
      const execPath = join(path, exec);
      if (existsSync(execPath)) {
        return execPath;
      }
    }

    // 2. 如果是目录，递归查找
    if (existsSync(path) && statSync(path).isDirectory()) {
      try {
        const files = this.recursiveFindExecutable(path, possibleExecs);
        if (files.length > 0) {
          return files[0]; // 返回第一个找到的
        }
      } catch (error) {
        // 忽略搜索错误
      }
    }

    // 3. 如果是 macOS，检查 .app 包内的可执行文件
    if (this.platform === 'darwin' && path.endsWith('.app')) {
      const contentsPath = join(path, 'Contents', 'MacOS');
      if (existsSync(contentsPath)) {
        const files = readdirSync(contentsPath);
        if (files.length > 0) {
          return join(contentsPath, files[0]);
        }
      }
    }

    return path; // 返回路径作为最后备选
  }

  /**
   * 递归查找可执行文件
   */
  private recursiveFindExecutable(dirPath: string, execNames: string[]): string[] {
    const results: string[] = [];
    
    try {
      if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
        return results;
      }

      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
          // 限制递归深度，避免无限搜索
          if (item === 'node_modules' || item === '.git') continue;
          results.push(...this.recursiveFindExecutable(fullPath, execNames));
        } else if (stats.isFile()) {
          for (const execName of execNames) {
            if (item === execName || item.includes(execName)) {
              results.push(fullPath);
              break;
            }
          }
        }
      }
    } catch (error) {
      // 忽略权限错误等
    }

    return results;
  }

  /**
   * 增强的版本检测
   */
  private async getSoftwareVersionEnhanced(softwareName: string, executable: string): Promise<string | null> {
    try {
      const versionCommands: Record<string, string[]> = {
        blender: ['--version'],
        gimp: ['--version'],
        inkscape: ['--version'],
        krita: ['--version'],
        freecad: ['--version'],
        openscad: ['--version'],
        darktable: ['--version'],
        rawtherapee: ['--version'],
        code: ['--version']
      };

      const commands = versionCommands[softwareName];
      if (commands) {
        try {
          const { stdout } = await execAsync(`"${executable}" ${commands.join(' ')}`);
          const versionMatch = stdout.match(/(\d+\.\d+(\.\d+)?)/);
          return versionMatch ? versionMatch[1] : this.extractVersionFromPath(executable);
        } catch (error) {
          // 命令行版本检测失败，尝试其他方法
        }
      }

      // 尝试从文件属性获取版本（Windows）
      if (this.platform === 'win32') {
        const version = await this.getFileVersion(executable);
        if (version) return version;
      }

      // 从路径提取版本信息
      return this.extractVersionFromPath(executable);
    } catch (error) {
      return this.extractVersionFromPath(executable);
    }
  }

  /**
   * 获取文件版本（Windows）
   */
  private async getFileVersion(filePath: string): Promise<string | null> {
    if (this.platform !== 'win32') return null;

    try {
      // 这里可以集成Windows API获取文件版本信息
      // 简化实现：从文件名中提取版本
      const filename = basename(filePath);
      const versionMatch = filename.match(/(\d+\.\d+(\.\d+)?)/);
      return versionMatch ? versionMatch[1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取发布者信息
   */
  private async getPublisherInfo(softwareName: string, path: string): Promise<string | null> {
    try {
      if (this.platform === 'win32' && Registry) {
        // 从注册表获取发布者信息
        const registry = new Registry({
          hive: Registry.HKLM,
          key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
        });

        // 这里可以实现注册表查询逻辑
        // 简化实现：返回已知的发布者
        const publisherMap: Record<string, string> = {
          photoshop: 'Adobe Inc.',
          illustrator: 'Adobe Inc.',
          indesign: 'Adobe Inc.',
          aftereffects: 'Adobe Inc.',
          premiere: 'Adobe Inc.',
          autocad: 'Autodesk, Inc.',
          '3dsmax': 'Autodesk, Inc.',
          maya: 'Autodesk, Inc.',
          revit: 'Autodesk, Inc.',
          blender: 'Blender Foundation',
          gimp: 'GIMP Team',
          inkscape: 'Inkscape Team',
          krita: 'Krita Foundation',
          vscode: 'Microsoft Corporation'
        };

        return publisherMap[softwareName] || null;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取安装日期
   */
  private async getInstallDate(softwareName: string, path: string): Promise<Date | null> {
    try {
      if (existsSync(path)) {
        const stats = statSync(path);
        return stats.birthtime || stats.ctime;
      }
    } catch (error) {
      // 忽略错误
    }
    return null;
  }

  /**
   * 计算软件大小
   */
  private async calculateSoftwareSize(path: string): Promise<number> {
    try {
      if (existsSync(path)) {
        const stats = statSync(path);
        if (stats.isFile()) {
          return stats.size;
        } else if (stats.isDirectory()) {
          return this.calculateDirectorySize(path);
        }
      }
    } catch (error) {
      // 忽略错误
    }
    return 0;
  }

  /**
   * 计算目录大小
   */
  private calculateDirectorySize(dirPath: string): number {
    let totalSize = 0;
    
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stats = statSync(fullPath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          totalSize += this.calculateDirectorySize(fullPath);
        }
      }
    } catch (error) {
      // 忽略无法访问的文件
    }
    
    return totalSize;
  }

  /**
   * 计算检测置信度
   */
  private calculateConfidence(
    softwareName: string, 
    path: string, 
    executable: string, 
    version: string | null
  ): number {
    let confidence = 0;

    // 基于路径匹配度
    if (path.toLowerCase().includes(softwareName.toLowerCase())) {
      confidence += 30;
    }

    // 基于可执行文件匹配度
    if (executable.toLowerCase().includes(softwareName.toLowerCase())) {
      confidence += 25;
    }

    // 基于版本信息
    if (version && version !== 'unknown' && version !== '0.0.0') {
      confidence += 20;
    }

    // 基于标准安装路径
    const standardPaths = this.softwarePaths[this.platform as keyof typeof this.softwarePaths];
    const softwareStandardPaths = standardPaths[softwareName as keyof typeof standardPaths];
    if (softwareStandardPaths) {
      for (const standardPath of softwareStandardPaths) {
        if (path.startsWith(standardPath.split('*')[0])) {
          confidence += 15;
          break;
        }
      }
    }

    // 基于发布者信息（如果可获取）
    const knownPublishers = ['Adobe', 'Autodesk', 'Microsoft', 'Blender Foundation'];
    if (knownPublishers.some(publisher => path.includes(publisher))) {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }

  /**
   * 查找可执行文件
   */
  private async findExecutable(softwareName: string, path: string): Promise<string> {
    const execMap: Record<string, string[]> = {
      photoshop: this.platform === 'win32' ? ['Photoshop.exe', 'Photoshop.exe'] : ['Adobe Photoshop*'],
      autocad: this.platform === 'win32' ? ['acad.exe', 'AutoCAD.exe'] : ['AutoCAD*'],
      blender: this.platform === 'win32' ? ['blender.exe'] : ['blender'],
      sketchup: this.platform === 'win32' ? ['SketchUp.exe'] : ['SketchUp*'],
      '3dsmax': this.platform === 'win32' ? ['3dsmax.exe', '3ds Max.exe'] : ['3ds Max*'],
      maya: this.platform === 'win32' ? ['maya.exe', 'Maya.exe'] : ['Maya*'],
      gimp: this.platform === 'win32' ? ['gimp.exe'] : ['gimp'],
      inkscape: this.platform === 'win32' ? ['inkscape.exe'] : ['inkscape']
    };

    const possibleExecs = execMap[softwareName] || [softwareName];

    for (const exec of possibleExecs) {
      const execPath = join(path, exec);
      if (existsSync(execPath)) {
        return execPath;
      }
    }

    // 如果是 macOS，检查 .app 包内的可执行文件
    if (this.platform === 'darwin' && path.endsWith('.app')) {
      const contentsPath = join(path, 'Contents', 'MacOS');
      if (existsSync(contentsPath)) {
        const files = await this.findFiles(join(contentsPath, '*'));
        if (files.length > 0) {
          return files[0];
        }
      }
    }

    return path; // 返回路径作为最后备选
  }

  /**
   * 获取软件版本
   */
  private async getSoftwareVersion(softwareName: string, executable: string): Promise<string | null> {
    try {
      const versionCommands: Record<string, string[]> = {
        blender: ['--version'],
        gimp: ['--version'],
        inkscape: ['--version']
      };

      const commands = versionCommands[softwareName];
      if (!commands) {
        return this.extractVersionFromPath(executable);
      }

      const { stdout } = await execAsync(`"${executable}" ${commands.join(' ')}`);
      const versionMatch = stdout.match(/(\d+\.\d+(\.\d+)?)/);
      return versionMatch ? versionMatch[1] : null;
    } catch (error) {
      return this.extractVersionFromPath(executable);
    }
  }

  /**
   * 从路径提取版本信息
   */
  private extractVersionFromPath(path: string): string | null {
    const versionMatch = path.match(/(\d{4})|(\d+\.\d+(\.\d+)?)/);
    return versionMatch ? versionMatch[1] || versionMatch[0] : null;
  }

  /**
   * 获取软件分类
   */
  private getSoftwareCategory(softwareName: string): SoftwareInfo['category'] {
    const categoryMap: Record<string, SoftwareInfo['category']> = {
      photoshop: 'design',
      gimp: 'design',
      inkscape: 'design',
      autocad: 'design',
      sketchup: 'modeling',
      blender: 'modeling',
      '3dsmax': 'modeling',
      maya: 'modeling'
    };

    return categoryMap[softwareName] || 'other';
  }

  /**
   * 获取软件功能
   */
  private getSoftwareCapabilities(softwareName: string): string[] {
    const capabilitiesMap: Record<string, string[]> = {
      photoshop: ['image_editing', 'layers', 'filters', 'plugins', 'automation'],
      gimp: ['image_editing', 'layers', 'filters', 'plugins', 'scripting'],
      inkscape: ['vector_editing', 'svg', 'extensions', 'scripting'],
      autocad: ['2d_drawing', '3d_modeling', 'dwg', 'blocks', 'scripts'],
      sketchup: ['3d_modeling', 'components', 'materials', 'extensions'],
      blender: ['3d_modeling', 'sculpting', 'animation', 'rendering', 'python_api'],
      '3dsmax': ['3d_modeling', 'animation', 'rendering', 'maxscript'],
      maya: ['3d_modeling', 'animation', 'rendering', 'mel_scripting', 'python_api']
    };

    return capabilitiesMap[softwareName] || [];
  }

  /**
   * 获取软件显示名称
   */
  private getSoftwareDisplayName(softwareName: string): string {
    const nameMap: Record<string, string> = {
      photoshop: 'Adobe Photoshop',
      gimp: 'GIMP',
      inkscape: 'Inkscape',
      autocad: 'AutoCAD',
      sketchup: 'SketchUp',
      blender: 'Blender',
      '3dsmax': '3ds Max',
      maya: 'Maya'
    };

    return nameMap[softwareName] || softwareName;
  }

  /**
   * 创建未安装软件信息
   */
  private createNotInstalledInfo(softwareName: string): SoftwareInfo {
    return {
      name: this.getSoftwareDisplayName(softwareName),
      version: '0.0.0',
      path: '',
      executable: '',
      category: this.getSoftwareCategory(softwareName),
      status: 'not_installed',
      capabilities: []
    };
  }

  /**
   * 查找文件（支持通配符）
   */
  private async findFiles(pattern: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const cmd = this.platform === 'win32' ? 'dir' : 'find';
      const args = this.platform === 'win32' ? ['/b', pattern] : [pattern, '-type', 'f', '2>/dev/null'];

      execAsync(`${cmd} ${args.join(' ')}`, { shell: true }).then(({ stdout, stderr }) => {
        if (stderr) {
          resolve([]);
          return;
        }

        const files = stdout.trim().split('\n').filter(line => line.trim());
        const fullPaths = files.map(file => {
          if (this.platform === 'win32') {
            return join(dirname(pattern), file);
          }
          return file;
        });

        resolve(fullPaths);
      }).catch(() => {
        resolve([]);
      });
    });
  }

  /**
   * 启动软件
   */
  async launchSoftware(softwareName: string, filePath?: string): Promise<boolean> {
    const softwareInfo = this.softwareCache.get(softwareName);
    if (!softwareInfo || softwareInfo.status !== 'installed') {
      throw new Error(`软件 ${softwareName} 未安装或不可用`);
    }

    try {
      const args = filePath ? [filePath] : [];
      const process = spawn(softwareInfo.executable, args, { detached: true });
      process.unref();

      console.log(`✅ 成功启动 ${softwareInfo.name}`);
      return true;
    } catch (error) {
      console.error(`❌ 启动软件失败 ${softwareName}:`, error);
      return false;
    }
  }

  /**
   * 执行软件命令
   */
  async executeSoftwareCommand(softwareName: string, command: SoftwareCommand): Promise<any> {
    const softwareInfo = this.softwareCache.get(softwareName);
    if (!softwareInfo || softwareInfo.status !== 'installed') {
      throw new Error(`软件 ${softwareName} 未安装或不可用`);
    }

    try {
      // 构建命令参数
      const args = [];
      if (command.parameters) {
        for (const [key, value] of Object.entries(command.parameters)) {
          args.push(`--${key}`, String(value));
        }
      }

      const { stdout, stderr } = await execAsync(`"${softwareInfo.executable}" ${command.script} ${args.join(' ')}`);
      
      if (stderr) {
        console.warn(`⚠️ 命令执行警告:`, stderr);
      }

      return stdout;
    } catch (error) {
      console.error(`❌ 执行软件命令失败:`, error);
      throw error;
    }
  }

  /**
   * 获取软件状态
   */
  getSoftwareStatus(softwareName: string): SoftwareInfo | null {
    return this.softwareCache.get(softwareName) || null;
  }

  /**
   * 获取所有已安装软件
   */
  getAllInstalledSoftware(): SoftwareInfo[] {
    return Array.from(this.softwareCache.values()).filter(info => info.status === 'installed');
  }

  /**
   * 按分类获取软件
   */
  getSoftwareByCategory(category: SoftwareInfo['category']): SoftwareInfo[] {
    return Array.from(this.softwareCache.values()).filter(info => info.category === category);
  }

  /**
   * 检查软件是否支持特定功能
   */
  supportsCapability(softwareName: string, capability: string): boolean {
    const softwareInfo = this.softwareCache.get(softwareName);
    return softwareInfo?.capabilities?.includes(capability) || false;
  }

  /**
   * 重新扫描软件（增强版）
   */
  async rescanSoftware(deepScan: boolean = false): Promise<SoftwareInfo[]> {
    this.softwareCache.clear();
    this.registryCache.clear();
    this.scannedDirectories.clear();
    return this.scanInstalledSoftware(deepScan);
  }

  /**
   * 执行智能路径搜索
   */
  async performIntelligentPathSearch(softwareName?: string): Promise<SoftwareInfo[]> {
    const searchResults = await this.intelligentSearch.performIntelligentSearch(softwareName);
    const softwareList: SoftwareInfo[] = [];

    for (const result of searchResults) {
      const softwareInfo = await this.convertPathSearchResultToSoftwareInfo(result);
      if (softwareInfo) {
        softwareList.push(softwareInfo);
        this.softwareCache.set(softwareInfo.name, softwareInfo);
      }
    }

    return softwareList;
  }

  /**
   * 转换路径搜索结果为软件信息
   */
  private async convertPathSearchResultToSoftwareInfo(result: PathSearchResult): Promise<SoftwareInfo | null> {
    try {
      const mainPath = result.detectedPaths[0];
      if (!mainPath || !existsSync(mainPath)) {
        return null;
      }

      const version = result.metadata?.version || await this.getSoftwareVersionEnhanced(result.softwareName, mainPath);
      const category = this.getSoftwareCategory(result.softwareName);
      const capabilities = this.getSoftwareCapabilities(result.softwareName);
      const size = await this.calculateSoftwareSize(mainPath);

      return {
        name: result.softwareName,
        version: version || 'unknown',
        path: mainPath,
        executable: mainPath,
        category,
        status: 'installed',
        capabilities,
        publisher: result.metadata?.publisher,
        installDate: result.metadata?.installDate ? new Date(result.metadata.installDate) : undefined,
        size,
        isLocked: false,
        detectedPaths: result.detectedPaths,
        confidence: result.confidence
      };
    } catch (error) {
      console.error(`转换搜索结果失败 ${result.softwareName}:`, error);
      return null;
    }
  }

  /**
   * 执行深度扫描
   */
  private async performDeepScan(): Promise<SoftwareInfo[]> {
    const additionalSoftware: SoftwareInfo[] = [];
    
    // 扫描常见软件安装目录
    const commonDirectories = this.environmentPaths;
    
    for (const directory of commonDirectories) {
      try {
        if (existsSync(directory)) {
          const foundSoftware = await this.scanDirectoryForUnknownSoftware(directory);
          additionalSoftware.push(...foundSoftware);
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    }
    
    return additionalSoftware;
  }

  /**
   * 扫描目录查找未知软件
   */
  private async scanDirectoryForUnknownSoftware(dirPath: string): Promise<SoftwareInfo[]> {
    const foundSoftware: SoftwareInfo[] = [];
    
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stats = statSync(fullPath);
        
        if (stats.isDirectory() && !this.scannedDirectories.has(fullPath)) {
          // 检查是否可能是软件目录
          const softwareInfo = await this.analyzePotentialSoftwareDirectory(fullPath, item);
          if (softwareInfo) {
            foundSoftware.push(softwareInfo);
          }
        }
      }
    } catch (error) {
      // 忽略错误
    }
    
    return foundSoftware;
  }

  /**
   * 分析可能的软件目录
   */
  private async analyzePotentialSoftwareDirectory(dirPath: string, dirName: string): Promise<SoftwareInfo | null> {
    try {
      // 查找可执行文件
      const executables = this.findExecutablesInDirectory(dirPath);
      
      if (executables.length > 0) {
        // 尝试获取版本信息
        const version = await this.getSoftwareVersionEnhanced(dirName, executables[0]);
        
        // 推断软件分类
        const category = this.inferSoftwareCategory(dirName, executables);
        
        return {
          name: dirName,
          version: version || 'unknown',
          path: dirPath,
          executable: executables[0],
          category,
          status: 'installed',
          confidence: 50, // 未知软件的默认置信度
          detectedPaths: executables
        };
      }
    } catch (error) {
      // 忽略错误
    }
    
    return null;
  }

  /**
   * 在目录中查找可执行文件
   */
  private findExecutablesInDirectory(dirPath: string): string[] {
    const executables: string[] = [];
    
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stats = statSync(fullPath);
        
        if (stats.isFile()) {
          const ext = extname(item).toLowerCase();
          
          // Windows可执行文件
          if (this.platform === 'win32' && (ext === '.exe' || ext === '.com' || ext === '.bat')) {
            executables.push(fullPath);
          }
          // macOS可执行文件
          else if (this.platform === 'darwin' && (ext === '' || ext === '.app')) {
            executables.push(fullPath);
          }
          // Linux可执行文件
          else if (this.platform === 'linux' && ext === '' && stats.mode & 0o111) {
            executables.push(fullPath);
          }
        }
      }
    } catch (error) {
      // 忽略错误
    }
    
    return executables;
  }

  /**
   * 推断软件分类
   */
  private inferSoftwareCategory(dirName: string, executables: string[]): SoftwareInfo['category'] {
    const name = dirName.toLowerCase();
    
    if (name.includes('photo') || name.includes('image') || name.includes('design') || 
        name.includes('illustrator') || name.includes('gimp') || name.includes('ink')) {
      return 'design';
    }
    
    if (name.includes('3d') || name.includes('model') || name.includes('render') ||
        name.includes('blender') || name.includes('maya') || name.includes('max')) {
      return 'modeling';
    }
    
    if (name.includes('render') || name.includes('v-ray') || name.includes('corona')) {
      return 'rendering';
    }
    
    if (name.includes('code') || name.includes('visual') || name.includes('jetbrains')) {
      return 'development';
    }
    
    return 'other';
  }
}