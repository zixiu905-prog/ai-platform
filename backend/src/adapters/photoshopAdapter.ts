import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PhotoshopConfig {
  url: string;
  apiKey?: string;
}

export interface DocumentInfo {
  name: string;
  width: number;
  height: number;
  resolution: number;
  colorMode: string;
  bitDepth: number;
}

export class PhotoshopAdapter {
  private config: PhotoshopConfig;

  constructor(config: PhotoshopConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Photoshop适配器初始化中...');
    } catch (error) {
      logger.error('Photoshop适配器初始化失败:', error);
      throw error;
    }
  }

  async executeCommand(command: string, params: any = {}): Promise<any> {
    try {
      logger.info(`执行Photoshop命令: ${command}`);
      
      const response = await fetch(`${this.config.url}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, ...params })
      });
      
      if (!response.ok) {
        throw new Error(`Photoshop API请求失败: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Photoshop命令执行失败:', error);
      throw error;
    }
  }

  sendCommand(action: string, parameters?: any): Promise<any> {
    return this.executeCommand(action, parameters);
  }

  async connect(apiKey?: string, settings?: any): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch (error) {
      logger.error('Photoshop连接失败:', error);
      return false;
    }
  }

  async execute(action: string, parameters?: any): Promise<any> {
    return this.executeCommand(action, parameters);
  }

  async getStatus(): Promise<any> {
    return {
      isOnline: true,
      version: '24.0',
      memoryUsage: 0,
      cpuUsage: 0,
    };
  }

  async disconnect(): Promise<void> {
    // 断开连接逻辑
  }

  async getDocumentInfo(): Promise<DocumentInfo> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      JSON.stringify({
        name: doc.name,
        width: doc.width.as('px'),
        height: doc.height.as('px'),
        resolution: doc.resolution,
        colorMode: doc.mode.toString(),
        bitDepth: doc.bitsPerChannel
      });
    `;

    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync(`osascript -e 'tell application "Adobe Photoshop 2024" to do javascript "${script.replace(/"/g, '\\"')}'"`);
        return JSON.parse(stdout.trim());
      } else {
        return await this.sendCommand('executeScript', { script });
      }
    } catch (error) {
      logger.error('获取文档信息失败:', error);
      throw new Error(`获取文档信息失败: ${error}`);
    }
  }

  async createDocument(params: {
    width?: number;
    height?: number;
    resolution?: number;
    mode?: 'RGB' | 'CMYK' | 'LAB' | 'GRAYSCALE';
    name?: string;
  } = {}): Promise<DocumentInfo> {
    const {
      width = 1920,
      height = 1080,
      resolution = 72,
      mode = 'RGB',
      name = 'New Document'
    } = params;

    const script = `
      var doc = app.documents.add(new UnitValue(${width}, 'px'), new UnitValue(${height}, 'px'), ${resolution}, '${mode}', NewDocumentMode.RGB);
      doc.name = '${name}';
      
      JSON.stringify({
        name: '${name}',
        width: ${width},
        height: ${height},
        resolution: ${resolution},
        colorMode: '${mode}',
        bitDepth: 8
      });
    `;

    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync(`osascript -e 'tell application "Adobe Photoshop 2024" to do javascript "${script.replace(/"/g, '\\"')}'"`);
        return JSON.parse(stdout.trim());
      } else {
        return await this.sendCommand('executeScript', { script });
      }
    } catch (error) {
      logger.error('创建文档失败:', error);
      throw new Error(`创建文档失败: ${error}`);
    }
  }

  async addLayer(name: string, type: 'normal' | 'adjustment' | 'text' = 'normal'): Promise<any> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var layer;
      switch ('${type}') {
        case 'normal':
          layer = doc.artLayers.add();
          break;
        case 'adjustment':
          layer = doc.artLayers.add();
          layer.kind = LayerKind.NORMAL;
          break;
        case 'text':
          layer = doc.artLayers.add();
          layer.kind = LayerKind.TEXTLAYER;
          break;
      }
      
      layer.name = '${name}';
      
      JSON.stringify({
        success: true,
        layerName: '${name}',
        layerType: '${type}',
        layerIndex: layer.itemIndex
      });
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('添加图层失败:', error);
      throw new Error(`添加图层失败: ${error}`);
    }
  }

  async applyFilter(filterName: string, parameters: any = {}): Promise<any> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var activeLayer = doc.activeLayer;
      
      // 应用滤镜的逻辑
      try {
        activeLayer.apply${filterName}();
        JSON.stringify({ 
          success: true,
          filter: '${filterName}',
          parameters: ${JSON.stringify(parameters)}
        });
      } catch (filterError) {
        JSON.stringify({ 
          success: false,
          error: filterError.toString(),
          filter: '${filterName}'
        });
      }
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('应用滤镜失败:', error);
      throw new Error(`应用滤镜失败: ${error}`);
    }
  }

  async saveDocument(format: 'PSD' | 'JPG' | 'PNG' | 'TIFF' = 'PSD', options: {
    quality?: number;
    path?: string;
  } = {}): Promise<any> {
    const { quality = 90, path } = options;
    
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var saveFile = new File("${path || '/tmp/photoshop_export_' + Date.now() + '.' + format.toLowerCase()}");
      
      try {
        switch ('${format}') {
          case 'PSD':
            doc.saveAs(saveFile);
            break;
          case 'JPG':
            var jpgOptions = new JPEGSaveOptions();
            jpgOptions.quality = ${quality};
            doc.saveAs(saveFile, jpgOptions);
            break;
          case 'PNG':
            var pngOptions = new PNGSaveOptions();
            pngOptions.compression = 8;
            doc.saveAs(saveFile, pngOptions);
            break;
          case 'TIFF':
            var tiffOptions = new TiffSaveOptions();
            tiffOptions.imageCompression = TIFFEncoding.NONE;
            doc.saveAs(saveFile, tiffOptions);
            break;
        }
        
        JSON.stringify({ 
          success: true,
          format: '${format}',
          path: saveFile.fsName,
          quality: ${quality}
        });
      } catch (saveError) {
        JSON.stringify({ 
          success: false,
          error: saveError.toString(),
          format: '${format}'
        });
      }
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('保存文档失败:', error);
      throw new Error(`保存文档失败: ${error}`);
    }
  }

  async resizeImage(width: number, height: number, maintainAspect: boolean = true): Promise<any> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var originalWidth = doc.width.as('px');
      var originalHeight = doc.height.as('px');
      
      if (${maintainAspect}) {
        var aspectRatio = originalWidth / originalHeight;
        var newWidth = ${width};
        var newHeight = ${width} / aspectRatio;
        
        if (newHeight > ${height}) {
          newHeight = ${height};
          newWidth = ${height} * aspectRatio;
        }
      } else {
        var newWidth = ${width};
        var newHeight = ${height};
      }
      
      doc.resizeImage(UnitValue(newWidth, 'px'), UnitValue(newHeight, 'px'), null, ResampleMethod.BICUBICSHARPER);
      
      JSON.stringify({
        success: true,
        originalWidth: originalWidth,
        originalHeight: originalHeight,
        newWidth: newWidth,
        newHeight: newHeight,
        maintainAspect: ${maintainAspect}
      });
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('调整图像大小失败:', error);
      throw new Error(`调整图像大小失败: ${error}`);
    }
  }
}

export default PhotoshopAdapter;