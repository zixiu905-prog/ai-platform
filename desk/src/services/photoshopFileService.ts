import { EventEmitter } from 'events';
import { existsSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { photoshopCOMService } from './photoshopComService';

export interface ImportOptions {
  fileType: 'psd' | 'jpg' | 'png' | 'gif' | 'tiff' | 'bmp' | 'ai' | 'pdf';
  width?: number;
  height?: number;
  resolution?: number;
  colorMode?: 'RGB' | 'CMYK' | 'LAB' | 'Grayscale';
  bitDepth?: 8 | 16 | 32;
  asSmartObject?: boolean;
  layerName?: string;
}

export interface ExportOptions {
  format: 'psd' | 'jpg' | 'png' | 'gif' | 'webp' | 'tiff' | 'bmp' | 'pdf';
  quality?: number; // 0-100
  progressive?: boolean; // for JPG
  compression?: 'none' | 'lzw' | 'zip'; // for TIFF
  interlaced?: boolean; // for PNG
  transparency?: boolean; // for PNG/GIF
  backgroundColor?: string; // for JPG
  colorProfile?: string;
  optimize?: boolean; // for PNG/WebP
  metadata?: {
    includeEXIF?: boolean;
    includeXMP?: boolean;
    includeIPTC?: boolean;
  };
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  dimensions?: { width: number; height: number };
  resolution?: number;
  colorMode?: string;
  layers?: number;
  hasAlpha?: boolean;
  created?: Date;
  modified?: Date;
}

export interface BatchProcessOptions {
  inputFiles: string[];
  outputFolder: string;
  outputFormat: string;
  exportOptions: ExportOptions;
  parallel?: boolean;
  maxConcurrency?: number;
}

export class PhotoshopFileService extends EventEmitter {
  private supportedFormats = {
    import: ['psd', 'jpg', 'jpeg', 'png', 'gif', 'tiff', 'tif', 'bmp', 'ai', 'pdf'],
    export: ['psd', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp', 'pdf']
  };

  constructor() {
    super();
  }

  /**
   * 导入文件到Photoshop
   */
  public async importFile(
    filePath: string,
    options: Partial<ImportOptions> = {}
  ): Promise<FileInfo> {
    try {
      if (!existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      
      // 如果有活动文档，询问是否关闭
      if (activeDoc) {
        console.log('检测到活动文档，将导入到新文档');
      }

      // 打开文件
      const doc = await photoshopCOMService.openDocument(filePath);
      
      // 应用导入选项
      if (options.width && options.height) {
        doc.ResizeImage(options.width, options.height, options.resolution);
      }
      
      if (options.layerName && doc.Layers.Count > 0) {
        const activeLayer = doc.Layers.Item(1);
        if (activeLayer) {
          activeLayer.Name = options.layerName;
        }
      }

      // 如果需要作为智能对象导入
      if (options.asSmartObject && doc.Layers.Count > 0) {
        // 这里应该实现智能对象转换逻辑
        console.log('转换为智能对象（模拟实现）');
      }

      const fileInfo: FileInfo = {
        name: basename(filePath),
        path: filePath,
        size: 0, // 需要通过文件系统API获取
        type: extname(filePath).toLowerCase(),
        dimensions: {
          width: doc.Width,
          height: doc.Height
        },
        resolution: doc.Resolution,
        colorMode: this.getColorModeName(doc.Mode),
        layers: doc.Layers.Count,
        hasAlpha: this.hasAlphaChannel(doc),
        created: new Date(),
        modified: new Date()
      };

      this.emit('file_imported', { filePath, fileInfo, options });
      return fileInfo;
    } catch (error) {
      this.emit('import_error', { filePath, error: error.message });
      throw new Error(`导入文件失败: ${error.message}`);
    }
  }

  /**
   * 导出当前文档
   */
  public async exportDocument(
    outputPath: string,
    options: Partial<ExportOptions> = {}
  ): Promise<FileInfo> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

      // 确保输出目录存在
      const outputDir = dirname(outputPath);
      // 这里应该创建目录（需要文件系统API）

      // 应用导出选项
      const exportConfig = {
        format: this.getExportFormat(options.format),
        quality: options.quality || 80,
        progressive: options.progressive || false,
        compression: options.compression || 'none',
        interlaced: options.interlaced || false,
        transparency: options.transparency !== false,
        backgroundColor: options.backgroundColor || '#ffffff',
        optimize: options.optimize || true,
        metadata: options.metadata || {
          includeEXIF: true,
          includeXMP: true,
          includeIPTC: false
        }
      };

      // 执行导出
      activeDoc.Export(outputPath, exportConfig.format, exportConfig);

      const fileInfo: FileInfo = {
        name: basename(outputPath),
        path: outputPath,
        size: 0, // 需要通过文件系统API获取
        type: `.${options.format}`,
        dimensions: {
          width: activeDoc.Width,
          height: activeDoc.Height
        },
        resolution: activeDoc.Resolution,
        colorMode: this.getColorModeName(activeDoc.Mode),
        layers: activeDoc.Layers.Count,
        hasAlpha: this.hasAlphaChannel(activeDoc),
        created: new Date(),
        modified: new Date()
      };

      this.emit('file_exported', { outputPath, fileInfo, options });
      return fileInfo;
    } catch (error) {
      this.emit('export_error', { outputPath, error: error.message });
      throw new Error(`导出文档失败: ${error.message}`);
    }
  }

  /**
   * 导出指定图层
   */
  public async exportLayer(
    layerName: string,
    outputPath: string,
    options: Partial<ExportOptions> = {}
  ): Promise<FileInfo> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

      // 查找目标图层
      const layers = activeDoc.Layers;
      let targetLayer = null;

      for (let i = 0; i < layers.Count; i++) {
        const layer = layers.Item(i + 1);
        if (layer.Name === layerName) {
          targetLayer = layer;
          break;
        }
      }

      if (!targetLayer) {
        throw new Error(`找不到图层: ${layerName}`);
      }

      // 隐藏其他图层
      for (let i = 0; i < layers.Count; i++) {
        const layer = layers.Item(i + 1);
        layer.Visible = (layer.Name === layerName);
      }

      // 导出文档（现在只包含可见图层）
      await this.exportDocument(outputPath, options);

      // 恢复图层可见性
      for (let i = 0; i < layers.Count; i++) {
        const layer = layers.Item(i + 1);
        layer.Visible = true;
      }

      const fileInfo: FileInfo = {
        name: basename(outputPath),
        path: outputPath,
        size: 0,
        type: `.${options.format}`,
        dimensions: {
          width: targetLayer.Bounds[2] - targetLayer.Bounds[0],
          height: targetLayer.Bounds[3] - targetLayer.Bounds[1]
        },
        created: new Date(),
        modified: new Date()
      };

      this.emit('layer_exported', { layerName, outputPath, fileInfo });
      return fileInfo;
    } catch (error) {
      this.emit('export_error', { outputPath, error: error.message });
      throw new Error(`导出图层失败: ${error.message}`);
    }
  }

  /**
   * 批量处理文件
   */
  public async batchProcess(
    batchOptions: BatchProcessOptions
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      inputFile: string;
      outputFile?: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results = [];
    const { inputFiles, outputFolder, outputFormat, exportOptions, parallel = true } = batchOptions;
    const maxConcurrency = batchOptions.maxConcurrency || (parallel ? 4 : 1);

    console.log(`开始批量处理 ${inputFiles.length} 个文件`);

    if (parallel) {
      // 并行处理
      const chunks = this.chunkArray(inputFiles, maxConcurrency);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (inputFile) => {
          try {
            const fileName = basename(inputFile, extname(inputFile));
            const outputPath = join(outputFolder, `${fileName}.${outputFormat}`);
            
            // 导入文件
            await this.importFile(inputFile);
            
            // 导出文件
            await this.exportDocument(outputPath, exportOptions);
            
            return {
              inputFile,
              outputFile: outputPath,
              success: true
            };
          } catch (error) {
            return {
              inputFile,
              success: false,
              error: error.message
            };
          }
        });

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      }
    } else {
      // 串行处理
      for (const inputFile of inputFiles) {
        try {
          const fileName = basename(inputFile, extname(inputFile));
          const outputPath = join(outputFolder, `${fileName}.${outputFormat}`);
          
          await this.importFile(inputFile);
          await this.exportDocument(outputPath, exportOptions);
          
          results.push({
            inputFile,
            outputFile: outputPath,
            success: true
          });
        } catch (error) {
          results.push({
            inputFile,
            success: false,
            error: error.message
          });
        }
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    const summary = {
      total: inputFiles.length,
      successful,
      failed,
      results
    };

    this.emit('batch_completed', summary);
    return summary;
  }

  /**
   * 获取文件信息
   */
  public async getFileInfo(filePath: string): Promise<FileInfo> {
    try {
      if (!existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      const extension = extname(filePath).toLowerCase();
      
      if (!this.supportedFormats.import.includes(extension.slice(1))) {
        throw new Error(`不支持的文件格式: ${extension}`);
      }

      // 这里应该实现实际的文件信息读取
      // 模拟实现
      return {
        name: basename(filePath),
        path: filePath,
        size: 1024 * 1024, // 1MB
        type: extension,
        dimensions: { width: 1920, height: 1080 },
        resolution: 72,
        colorMode: 'RGB',
        layers: 5,
        hasAlpha: false,
        created: new Date(),
        modified: new Date()
      };
    } catch (error) {
      throw new Error(`获取文件信息失败: ${error.message}`);
    }
  }

  /**
   * 检查文件格式支持
   */
  public isFormatSupported(format: string, operation: 'import' | 'export' = 'import'): boolean {
    const formats = this.supportedFormats[operation];
    return formats.includes(format.toLowerCase());
  }

  /**
   * 获取支持的导入格式
   */
  public getSupportedImportFormats(): string[] {
    return [...this.supportedFormats.import];
  }

  /**
   * 获取支持的导出格式
   */
  public getSupportedExportFormats(): string[] {
    return [...this.supportedFormats.export];
  }

  /**
   * 保存当前文档
   */
  public async saveDocument(filePath?: string): Promise<boolean> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

      if (filePath) {
        activeDoc.SaveAs(filePath);
      } else {
        activeDoc.Save();
      }

      this.emit('document_saved', { filePath: filePath || '原位置' });
      return true;
    } catch (error) {
      this.emit('save_error', { error: error.message });
      throw new Error(`保存文档失败: ${error.message}`);
    }
  }

  /**
   * 关闭文档
   */
  public async closeDocument(saveChanges: boolean = true): Promise<boolean> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        return true; // 没有活动文档
      }

      activeDoc.Close(saveChanges ? 2 : 3); // SaveOptions.YES : SaveOptions.NO
      this.emit('document_closed', { saveChanges });
      return true;
    } catch (error) {
      this.emit('close_error', { error: error.message });
      throw new Error(`关闭文档失败: ${error.message}`);
    }
  }

  // 辅助方法

  private getColorModeName(mode: any): string {
    const modeMap: Record<number, string> = {
      1: 'Bitmap',
      2: 'Grayscale',
      3: 'Indexed',
      4: 'RGB',
      5: 'CMYK',
      6: 'Multichannel',
      7: 'Duotone',
      8: 'Lab'
    };
    return modeMap[mode] || 'RGB';
  }

  private hasAlphaChannel(doc: any): boolean {
    // 这里应该实现实际的Alpha通道检测
    // 模拟实现
    return doc.Layers.Count > 1;
  }

  private getExportFormat(format: string): string {
    const formatMap: Record<string, string> = {
      'psd': 'Photoshop',
      'jpg': 'JPEG',
      'jpeg': 'JPEG',
      'png': 'PNG',
      'gif': 'GIF',
      'webp': 'WEBP',
      'tiff': 'TIFF',
      'tif': 'TIFF',
      'bmp': 'BMP',
      'pdf': 'PDF'
    };
    return formatMap[format.toLowerCase()] || 'JPEG';
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// 单例模式
export const photoshopFileService = new PhotoshopFileService();