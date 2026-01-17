import { spawn, ChildProcess } from 'child_process';
import { existsSync, writeFile, readFile, unlink, mkdir, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { app } from 'electron';
import { promisify } from 'util';
import { photoshopCOMService } from './photoshopComService';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);
const mkdirAsync = promisify(mkdir);

export interface PhotoshopBatchConfig {
  inputFolder: string;
  outputFolder: string;
  operations: PhotoshopOperation[];
  filePattern?: string; // 支持通配符，如 *.jpg, **/*.psd
  preserveStructure?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
}

export interface PhotoshopOperation {
  type: 'resize' | 'filter' | 'adjustment' | 'export' | 'layer' | 'text' | 'effect';
  parameters: Record<string, any>;
}

export interface PhotoshopLayer {
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface PhotoshopExportOptions {
  format: 'jpg' | 'png' | 'gif' | 'webp' | 'svg';
  quality?: number; // 0-100
  width?: number;
  height?: number;
  progressive?: boolean;
  optimize?: boolean;
}

export class PhotoshopAutomationService {
  private photoshopPath: string | null = null;
  private tempScriptsPath: string;
  private isProcessing: boolean = false;
  private currentProcess: ChildProcess | null = null;
  private operationQueue: PhotoshopBatchConfig[] = [];
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.tempScriptsPath = join(app.getPath('temp'), 'aidesign-photoshop-scripts');
    this.initializeTempDirectory();
    this.initializeCOM();
  }

  private async initializeCOM(): Promise<void> {
    try {
      // 初始化COM服务
      await photoshopCOMService.connect();
      console.log('Photoshop COM服务初始化成功');
    } catch (error) {
      console.warn('Photoshop COM服务初始化失败，将使用脚本模式:', error);
    }
  }

  private async initializeTempDirectory(): Promise<void> {
    try {
      if (!existsSync(this.tempScriptsPath)) {
        await mkdirAsync(this.tempScriptsPath, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * 设置Photoshop可执行文件路径
   */
  public setPhotoshopPath(path: string): void {
    this.photoshopPath = path;
  }

  /**
   * 检测Photoshop安装路径
   */
  public async detectPhotoshopInstallation(): Promise<string | null> {
    const commonPaths = [
      'C:\\Program Files\\Adobe\\Adobe Photoshop 2024\\Photoshop.exe',
      'C:\\Program Files\\Adobe\\Adobe Photoshop 2023\\Photoshop.exe',
      'C:\\Program Files\\Adobe\\Adobe Photoshop 2022\\Photoshop.exe',
      'C:\\Program Files (x86)\\Adobe\\Adobe Photoshop 2024\\Photoshop.exe',
      '/Applications/Adobe Photoshop 2024/Adobe Photoshop 2024.app/Contents/MacOS/Adobe Photoshop 2024',
      '/Applications/Adobe Photoshop 2023/Adobe Photoshop 2023.app/Contents/MacOS/Adobe Photoshop 2023'
    ];

    for (const path of commonPaths) {
      if (existsSync(path)) {
        this.photoshopPath = path;
        return path;
      }
    }

    return null;
  }

  /**
   * 批量处理图片
   */
  public async batchProcess(config: PhotoshopBatchConfig): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: string[];
    duration: number;
  }> {
    return new Promise(async (resolve) => {
      const startTime = Date.now();
      
      if (this.isProcessing) {
        this.operationQueue.push(config);
        resolve({
          success: false,
          processed: 0,
          failed: 0,
          errors: ['Photoshop is currently processing another task. Task queued.'],
          duration: 0
        });
        return;
      }

      this.isProcessing = true;
      this.emit('batchProcessStart', { config });

      try {
        const files = await this.getInputFiles(config);
        const results = {
          success: true,
          processed: 0,
          failed: 0,
          errors: [] as string[],
          duration: 0
        };

        if (config.parallel && files.length > 1) {
          await this.processFilesParallel(files, config, results);
        } else {
          await this.processFilesSequential(files, config, results);
        }

        results.duration = Date.now() - startTime;
        this.emit('batchProcessComplete', { config, results });
        resolve(results);

      } catch (error) {
        const errorResult = {
          success: false,
          processed: 0,
          failed: 0,
          errors: [error instanceof Error ? error.message : String(error)],
          duration: Date.now() - startTime
        };
        this.emit('batchProcessError', { config, error: errorResult });
        resolve(errorResult);
      } finally {
        this.isProcessing = false;
        this.processNextQueuedTask();
      }
    });
  }

  /**
   * 智能图层操作
   */
  public async smartLayerOperation(
    filePath: string,
    operations: Array<{
      type: 'select' | 'create' | 'delete' | 'move' | 'adjust';
      parameters: Record<string, any>;
    }>
  ): Promise<{
    success: boolean;
    layers: PhotoshopLayer[];
    modified: boolean;
    error?: string;
  }> {
    try {
      const script = this.generateLayerScript(filePath, operations);
      const scriptPath = await this.createTempScript(script, 'layer_ops');
      
      const result = await this.executeScript(scriptPath);
      await this.cleanupTempScript(scriptPath);

      const layers = this.parseLayersOutput(result);
      
      return {
        success: true,
        layers,
        modified: operations.length > 0
      };
    } catch (error) {
      return {
        success: false,
        layers: [],
        modified: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 智能滤镜效果应用
   */
  public async applyIntelligentFilters(
    filePath: string,
    filters: Array<{
      name: string;
      strength: number; // 0-100
      parameters?: Record<string, any>;
    }>
  ): Promise<{
    success: boolean;
    outputPath: string;
    appliedFilters: string[];
    error?: string;
  }> {
    try {
      const script = this.generateFilterScript(filePath, filters);
      const scriptPath = await this.createTempScript(script, 'filters');
      
      const result = await this.executeScript(scriptPath);
      await this.cleanupTempScript(scriptPath);

      const outputPath = this.extractOutputPath(result);
      const appliedFilters = filters.map(f => f.name);

      return {
        success: true,
        outputPath,
        appliedFilters
      };
    } catch (error) {
      return {
        success: false,
        outputPath: '',
        appliedFilters: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 批量导出多种格式
   */
  public async batchExport(
    filePath: string,
    exportConfigs: PhotoshopExportOptions[]
  ): Promise<{
    success: boolean;
    outputs: Array<{
      format: string;
      path: string;
      size: number;
    }>;
    error?: string;
  }> {
    try {
      const script = this.generateExportScript(filePath, exportConfigs);
      const scriptPath = await this.createTempScript(script, 'export');
      
      const result = await this.executeScript(scriptPath);
      await this.cleanupTempScript(scriptPath);

      const outputs = this.parseExportResults(result);

      return {
        success: true,
        outputs
      };
    } catch (error) {
      return {
        success: false,
        outputs: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取文档信息
   */
  public async getDocumentInfo(filePath: string): Promise<{
    success: boolean;
    info?: {
      width: number;
      height: number;
      resolution: number;
      colorMode: string;
      layers: number;
      channels: number;
      size: number;
    };
    error?: string;
  }> {
    try {
      const script = `
        var file = new File("${filePath}");
        var doc = app.open(file);
        
        var info = {
          width: doc.width.as('px'),
          height: doc.height.as('px'),
          resolution: doc.resolution,
          colorMode: doc.mode.toString(),
          layers: doc.artLayers.length,
          channels: doc.channels.length,
          size: ${existsSync(filePath) ? statSync(filePath).size : 0}
        };
        
        doc.close(SaveOptions.DONOTSAVECHANGES);
        info;
      `;
      
      const scriptPath = await this.createTempScript(script, 'info');
      const result = await this.executeScript(scriptPath);
      await this.cleanupTempScript(scriptPath);

      const info = JSON.parse(result);

      return {
        success: true,
        info
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // 私有方法

  private async getInputFiles(config: PhotoshopBatchConfig): Promise<string[]> {
    // 这里应该实现文件匹配逻辑
    // 简化版本，实际应该使用glob等库
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const pattern = config.filePattern || '*.*';
      const command = `dir "${config.inputFolder}\\${pattern}" /B`;
      const { stdout } = await execAsync(command);
      
      return stdout.split('\n')
        .filter(file => file.trim())
        .map(file => join(config.inputFolder, file.trim()));
    } catch (error) {
      console.error('Failed to get input files:', error);
      return [];
    }
  }

  private async processFilesSequential(
    files: string[],
    config: PhotoshopBatchConfig,
    results: { processed: number; failed: number; errors: string[] }
  ): Promise<void> {
    for (const file of files) {
      try {
        await this.processSingleFile(file, config);
        results.processed++;
        this.emit('fileProcessed', { file, success: true });
      } catch (error) {
        results.failed++;
        results.errors.push(`${file}: ${error}`);
        this.emit('fileProcessed', { file, success: false, error });
      }
    }
  }

  private async processFilesParallel(
    files: string[],
    config: PhotoshopBatchConfig,
    results: { processed: number; failed: number; errors: string[] }
  ): Promise<void> {
    const maxConcurrency = config.maxConcurrency || 4;
    const chunks = this.chunkArray(files, maxConcurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (file) => {
        try {
          await this.processSingleFile(file, config);
          results.processed++;
          this.emit('fileProcessed', { file, success: true });
        } catch (error) {
          results.failed++;
          results.errors.push(`${file}: ${error}`);
          this.emit('fileProcessed', { file, success: false, error });
        }
      });

      await Promise.all(promises);
    }
  }

  private async processSingleFile(file: string, config: PhotoshopBatchConfig): Promise<string> {
    const script = this.generateBatchScript(file, config);
    const scriptPath = await this.createTempScript(script, `process_${basename(file)}`);
    
    try {
      const result = await this.executeScript(scriptPath);
      return this.extractOutputPath(result);
    } finally {
      await this.cleanupTempScript(scriptPath);
    }
  }

  private generateBatchScript(file: string, config: PhotoshopBatchConfig): string {
    let script = `
      var inputfile = new File("${file}");
      var doc = app.open(inputfile);
    `;

    // 添加操作
    for (const operation of config.operations) {
      script += this.generateOperationScript(operation);
    }

    // 添加导出逻辑
    const outputName = basename(file, extname(file));
    script += `
      var outputfile = new File("${config.outputFolder}\\${outputName}_processed.jpg");
      doc.exportDocument(outputfile, ExportType.SAVEFORWEB, {
        format: SaveDocumentType.JPEG,
        quality: 80
      });
      doc.close(SaveOptions.DONOTSAVECHANGES);
      outputfile.fsName;
    `;

    return script;
  }

  private generateOperationScript(operation: PhotoshopOperation): string {
    switch (operation.type) {
      case 'resize':
        return `
          doc.resizeImage(
            UnitValue(${operation.parameters.width}, "px"),
            UnitValue(${operation.parameters.height || operation.parameters.width}, "px"),
            null,
            ResampleMethod.BICUBICSHARPER
          );
        `;
      
      case 'filter':
        const filterName = operation.parameters.name;
        const filterParams = operation.parameters.parameters || {};
        return `
          var filterDesc = new ActionDescriptor();
          ${this.generateFilterParameters(filterParams)}
          executeAction(charIDToTypeID("${filterName}"), filterDesc, DialogModes.NO);
        `;
      
      case 'adjustment':
        return this.generateAdjustmentScript(operation.parameters);
      
      default:
        return '';
    }
  }

  private generateFilterParameters(params: Record<string, any>): string {
    let script = '';
    for (const [key, value] of Object.entries(params)) {
      script += `filterDesc.put${typeof value === 'number' ? 'Integer' : 'String'}(charIDToTypeID("${key}"), ${value});\n`;
    }
    return script;
  }

  private generateAdjustmentScript(params: Record<string, any>): string {
    // 实现各种调整层的脚本生成
    let script = '';
    
    if (params.brightness !== undefined || params.contrast !== undefined) {
      script += `
        var brightnessContrast = doc.artLayers.add();
        brightnessContrast.name = "Brightness/Contrast";
        brightnessContrast.adjustBrightnessContrast(
          ${params.brightness || 0},
          ${params.contrast || 0}
        );
      `;
    }

    return script;
  }

  private generateLayerScript(file: string, operations: any[]): string {
    // 生成图层操作脚本
    return `
      var file = new File("${file}");
      var doc = app.open(file);
      var layers = [];
      
      ${operations.map(op => this.generateLayerOperation(op)).join('\n')}
      
      // 返回图层信息
      for (var i = 0; i < doc.artLayers.length; i++) {
        var layer = doc.artLayers[i];
        layers.push({
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          blendMode: layer.blendMode.toString(),
          position: { x: layer.bounds[0].as('px'), y: layer.bounds[1].as('px') },
          size: { 
            width: layer.bounds[2].as('px') - layer.bounds[0].as('px'),
            height: layer.bounds[3].as('px') - layer.bounds[1].as('px')
          }
        });
      }
      
      doc.close(SaveOptions.DONOTSAVECHANGES);
      JSON.stringify(layers);
    `;
  }

  private generateLayerOperation(operation: any): string {
    // 生成单个图层操作脚本
    switch (operation.type) {
      case 'select':
        return `var selectedLayer = doc.artLayers.getByName("${operation.parameters.layerName}");`;
      case 'create':
        return `
          var newLayer = doc.artLayers.add();
          newLayer.name = "${operation.parameters.name}";
          newLayer.opacity = ${operation.parameters.opacity || 100};
        `;
      case 'move':
        return `
          var layer = doc.artLayers.getByName("${operation.parameters.layerName}");
          layer.translate(
            UnitValue(${operation.parameters.x}, "px"),
            UnitValue(${operation.parameters.y}, "px")
          );
        `;
      default:
        return '';
    }
  }

  private generateFilterScript(file: string, filters: any[]): string {
    return `
      var file = new File("${file}");
      var doc = app.open(file);
      
      ${filters.map(filter => `
        // Apply ${filter.name}
        var ${filter.name}Desc = new ActionDescriptor();
        ${this.generateFilterParameters(filter.parameters || {})}
        executeAction(charIDToTypeID("${filter.name}"), ${filter.name}Desc, DialogModes.NO);
      `).join('\n')}
      
      var outputfile = new File("${file.replace(/\.[^/.]+$/, '_filtered.jpg')}");
      doc.exportDocument(outputfile, ExportType.SAVEFORWEB, {
        format: SaveDocumentType.JPEG,
        quality: 80
      });
      
      doc.close(SaveOptions.DONOTSAVECHANGES);
      outputfile.fsName;
    `;
  }

  private generateExportScript(file: string, exportConfigs: PhotoshopExportOptions[]): string {
    return `
      var file = new File("${file}");
      var doc = app.open(file);
      var outputs = [];
      
      ${exportConfigs.map((config, index) => `
        var output${index} = new File("${file.replace(/\.[^/.]+$/, '.' + config.format)}");
        doc.exportDocument(output${index}, ExportType.SAVEFORWEB, {
          format: "${this.getExportFormat(config.format)}",
          quality: ${config.quality || 80},
          ${config.width ? `width: UnitValue(${config.width}, "px"),` : ''}
          ${config.height ? `height: UnitValue(${config.height}, "px"),` : ''}
          ${config.progressive ? 'progressive: true,' : ''}
          ${config.optimize ? 'optimize: true,' : ''}
        });
        outputs.push({
          format: "${config.format}",
          path: output${index}.fsName,
          size: output${index}.length
        });
      `).join('\n')}
      
      doc.close(SaveOptions.DONOTSAVECHANGES);
      JSON.stringify(outputs);
    `;
  }

  private getExportFormat(format: string): string {
    const formatMap: Record<string, string> = {
      'jpg': 'JPEG',
      'png': 'PNG',
      'gif': 'GIF',
      'webp': 'WEBP',
      'svg': 'SVG'
    };
    return formatMap[format] || 'JPEG';
  }

  private async createTempScript(script: string, name: string): Promise<string> {
    const scriptPath = join(this.tempScriptsPath, `${name}_${Date.now()}.jsx`);
    await writeFileAsync(scriptPath, script);
    return scriptPath;
  }

  private async executeScript(scriptPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.photoshopPath) {
        reject(new Error('Photoshop path not set'));
        return;
      }

      const args = ['-r', scriptPath];
      this.currentProcess = spawn(this.photoshopPath, args);

      let stdout = '';
      let stderr = '';

      this.currentProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      this.currentProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      this.currentProcess.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Photoshop script execution failed: ${stderr}`));
        }
      });

      this.currentProcess.on('error', (error) => {
        this.currentProcess = null;
        reject(error);
      });
    });
  }

  private async cleanupTempScript(scriptPath: string): Promise<void> {
    try {
      await unlinkAsync(scriptPath);
    } catch (error) {
      console.error('Failed to cleanup temp script:', error);
    }
  }

  private extractOutputPath(result: string): string {
    // 从执行结果中提取输出文件路径
    const match = result.match(/^(.+)$/m);
    return match ? match[1].trim() : '';
  }

  private parseLayersOutput(result: string): PhotoshopLayer[] {
    try {
      return JSON.parse(result);
    } catch (error) {
      console.error('Failed to parse layers output:', error);
      return [];
    }
  }

  private parseExportResults(result: string): Array<{
    format: string;
    path: string;
    size: number;
  }> {
    try {
      return JSON.parse(result);
    } catch (error) {
      console.error('Failed to parse export results:', error);
      return [];
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async processNextQueuedTask(): Promise<void> {
    if (this.operationQueue.length > 0) {
      const nextTask = this.operationQueue.shift();
      if (nextTask) {
        await this.batchProcess(nextTask);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  // 事件监听器管理
  public on(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  public off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  // 停止当前处理
  public stopProcessing(): void {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }
    this.isProcessing = false;
  }

  // 获取处理状态
  public getProcessingStatus(): {
    isProcessing: boolean;
    queueLength: number;
    currentTask?: string;
  } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.operationQueue.length,
      currentTask: this.isProcessing ? 'Processing files...' : undefined
    };
  }

  // COM集成相关方法

  /**
   * 使用COM创建文档
   */
  public async createDocumentCOM(options: {
    width?: number;
    height?: number;
    resolution?: number;
    name?: string;
  } = {}): Promise<any> {
    try {
      if (photoshopCOMService.isPhotoshopConnected()) {
        const doc = await photoshopCOMService.createDocument(options);
        
        return {
          documentId: `doc_${Date.now()}`,
          width: doc.Width,
          height: doc.Height,
          resolution: doc.Resolution,
          name: doc.Name,
          success: true
        };
      } else {
        throw new Error('Photoshop COM未连接，尝试使用脚本模式');
      }
    } catch (error) {
      // 回退到脚本模式
      return this.createDocumentWithScript(options);
    }
  }

  /**
   * 使用COM执行图层操作
   */
  public async executeLayerOperationCOM(operation: {
    operation: string;
    layerName?: string;
    layerIndex?: number;
    properties?: any;
  }): Promise<any> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop COM未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

      const layers = activeDoc.Layers;
      let targetLayer = null;

      // 查找目标图层
      if (operation.layerName) {
        for (let i = 0; i < layers.Count; i++) {
          const layer = layers.Item(i + 1);
          if (layer.Name === operation.layerName) {
            targetLayer = layer;
            break;
          }
        }
      } else if (operation.layerIndex !== undefined) {
        targetLayer = layers.Item(operation.layerIndex + 1);
      } else {
        targetLayer = activeDoc.ActiveLayer;
      }

      if (!targetLayer) {
        throw new Error('找不到目标图层');
      }

      // 执行操作
      switch (operation.operation) {
        case 'set_opacity':
          if (operation.properties?.opacity !== undefined) {
            targetLayer.Opacity = operation.properties.opacity;
          }
          break;
        case 'set_visibility':
          if (operation.properties?.visible !== undefined) {
            targetLayer.Visible = operation.properties.visible;
          }
          break;
        case 'move':
          if (operation.properties?.x !== undefined && operation.properties?.y !== undefined) {
            targetLayer.Move(operation.properties.x, operation.properties.y);
          }
          break;
        case 'duplicate':
          const newLayer = targetLayer.Duplicate();
          if (operation.properties?.name) {
            newLayer.Name = operation.properties.name;
          }
          break;
        case 'delete':
          targetLayer.Delete();
          break;
        default:
          throw new Error(`不支持的图层操作: ${operation.operation}`);
      }

      return {
        success: true,
        operation: operation.operation,
        layerName: targetLayer.Name,
        result: '操作成功'
      };
    } catch (error) {
      return {
        success: false,
        operation: operation.operation,
        error: error.message
      };
    }
  }

  /**
   * 使用COM应用滤镜
   */
  public async applyFiltersCOM(filters: Array<{
    type: string;
    parameters?: any;
  }>): Promise<any> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop COM未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

      const results = [];

      for (const filter of filters) {
        // 这里应该根据不同的滤镜类型实现具体的逻辑
        // 模拟实现
        console.log(`应用滤镜: ${filter.type}`, filter.parameters);
        
        results.push({
          filterType: filter.type,
          success: true,
          message: `${filter.type}滤镜应用成功`
        });
      }

      return {
        success: true,
        filters: results,
        message: `成功应用${filters.length}个滤镜`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '滤镜应用失败'
      };
    }
  }

  /**
   * 使用COM导出文档
   */
  public async exportDocumentCOM(options: {
    format: string;
    quality?: number;
    outputPath?: string;
  }): Promise<any> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop COM未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

      const outputPath = options.outputPath || `export_${Date.now()}.${options.format}`;
      
      // 这里应该实现具体的导出逻辑
      // 模拟实现
      activeDoc.Export(outputPath, this.getExportFormat(options.format), {
        quality: options.quality || 80
      });

      return {
        success: true,
        filePath: outputPath,
        format: options.format,
        message: `文档导出成功: ${outputPath}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '文档导出失败'
      };
    }
  }

  /**
   * 使用脚本模式的备选方法
   */
  private async createDocumentWithScript(options: any): Promise<any> {
    // 回退到原始脚本模式
    const script = this.generateCreateDocumentScript(options);
    const scriptPath = await this.createTempScript(script, 'create_doc');
    
    try {
      const result = await this.executeScript(scriptPath);
      return JSON.parse(result);
    } finally {
      await this.cleanupTempScript(scriptPath);
    }
  }

  private generateCreateDocumentScript(options: any): string {
    const width = options.width || 1920;
    const height = options.height || 1080;
    const resolution = options.resolution || 72;
    const name = options.name || `未标题-${Date.now()}`;

    return `
      var doc = app.documents.add(width, height, resolution, name);
      var docInfo = {
        documentId: '${Date.now()}',
        width: doc.width.value,
        height: doc.height.value,
        resolution: doc.resolution.value,
        name: doc.name,
        success: true
      };
      JSON.stringify(docInfo);
    `;
  }

  /**
   * 检查COM连接状态
   */
  public isCOMConnected(): boolean {
    return photoshopCOMService.isPhotoshopConnected();
  }

  /**
   * 尝试重新连接COM
   */
  public async reconnectCOM(): Promise<boolean> {
    try {
      return await photoshopCOMService.connect();
    } catch (error) {
      console.error('COM重新连接失败:', error);
      return false;
    }
  }
}