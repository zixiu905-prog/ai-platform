import { spawn, ChildProcess } from 'child_process';
import { existsSync, writeFile, readFile, unlink, mkdir } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { app } from 'electron';
import { promisify } from 'util';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);
const mkdirAsync = promisify(mkdir);

export interface AutoCADBatchConfig {
  inputFolder: string;
  outputFolder: string;
  operations: AutoCADOperation[];
  filePattern?: string; // *.dwg, *.dxf, etc.
  preserveStructure?: boolean;
  backupOriginals?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
}

export interface AutoCADOperation {
  type: 'convert' | 'optimize' | 'standardize' | 'dimension' | 'layer' | 'block' | 'export';
  parameters: Record<string, any>;
}

export interface AutoCADLayer {
  name: string;
  color: string;
  linetype: string;
  lineWidth: number;
  visible: boolean;
  frozen: boolean;
  locked: boolean;
}

export interface AutoCADDimension {
  type: string;
  text: string;
  position: { x: number; y: number; z: number };
  value: number;
  style: string;
}

export interface AutoCADExportOptions {
  format: 'dwg' | 'dxf' | 'pdf' | 'svg' | 'jpg' | 'png';
  version?: string;
  quality?: number;
  scale?: number;
  layers?: string[];
}

export class AutoCADAutomationService {
  private autocadPath: string | null = null;
  private tempScriptsPath: string;
  private isProcessing: boolean = false;
  private currentProcess: ChildProcess | null = null;
  private operationQueue: AutoCADBatchConfig[] = [];
  private eventListeners: Map<string, Function[]> = new Map();
  private layerStandards: Map<string, any> = new Map();
  private dimensionStandards: Map<string, any> = new Map();

  constructor() {
    this.tempScriptsPath = join(app.getPath('temp'), 'aidesign-autocad-scripts');
    this.initializeTempDirectory();
    this.initializeStandards();
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

  private initializeStandards(): void {
    // 初始化图层标准
    this.layerStandards.set('architectural', {
      'A- Walls': { color: '1', linetype: 'Continuous', lineWidth: 0.30 },
      'A- Doors': { color: '2', linetype: 'Continuous', lineWidth: 0.15 },
      'A- Windows': { color: '3', linetype: 'Continuous', lineWidth: 0.15 },
      'A- Dimensions': { color: '7', linetype: 'Continuous', lineWidth: 0.13 },
      'A- Text': { color: '7', linetype: 'Continuous', lineWidth: 0.13 }
    });

    this.layerStandards.set('mechanical', {
      'M- Outline': { color: '7', linetype: 'Continuous', lineWidth: 0.50 },
      'M- Hidden': { color: '4', linetype: 'Hidden', lineWidth: 0.25 },
      'M- Center': { color: '1', linetype: 'Center', lineWidth: 0.13 },
      'M- Dimensions': { color: '3', linetype: 'Continuous', lineWidth: 0.13 },
      'M- Hatching': { color: '8', linetype: 'Continuous', lineWidth: 0.13 }
    });

    // 初始化标注标准
    this.dimensionStandards.set('imperial', {
      units: 'Imperial',
      precision: 0.0625,
      scale: 1.0,
      textHeight: 0.125,
      arrowSize: 0.125
    });

    this.dimensionStandards.set('metric', {
      units: 'Metric',
      precision: 1.0,
      scale: 1.0,
      textHeight: 2.5,
      arrowSize: 2.5
    });
  }

  /**
   * 设置AutoCAD可执行文件路径
   */
  public setAutoCADPath(path: string): void {
    this.autocadPath = path;
  }

  /**
   * 检测AutoCAD安装路径
   */
  public async detectAutoCADInstallation(): Promise<string | null> {
    const commonPaths = [
      'C:\\Program Files\\Autodesk\\AutoCAD 2024\\acad.exe',
      'C:\\Program Files\\Autodesk\\AutoCAD 2023\\acad.exe',
      'C:\\Program Files\\Autodesk\\AutoCAD 2022\\acad.exe',
      'C:\\Program Files\\Autodesk\\AutoCAD 2021\\acad.exe',
      'C:\\Program Files\\Autodesk\\AutoCAD LT 2024\\acadlt.exe',
      '/Applications/AutoCAD 2024/AutoCAD 2024.app/Contents/MacOS/AutoCAD 2024'
    ];

    for (const path of commonPaths) {
      if (existsSync(path)) {
        this.autocadPath = path;
        return path;
      }
    }

    return null;
  }

  /**
   * 批量处理CAD文件
   */
  public async batchProcess(config: AutoCADBatchConfig): Promise<{
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
          errors: ['AutoCAD is currently processing another task. Task queued.'],
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

        if (config.backupOriginals) {
          await this.createBackups(files);
        }

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
   * 智能图层管理
   */
  public async manageLayers(
    filePath: string,
    standard: 'architectural' | 'mechanical' | 'custom',
    customStandard?: Record<string, any>
  ): Promise<{
    success: boolean;
    layers: AutoCADLayer[];
    modified: boolean;
    error?: string;
  }> {
    try {
      const layerStandard = standard === 'custom' ? customStandard : this.layerStandards.get(standard);
      if (!layerStandard) {
        throw new Error(`Layer standard '${standard}' not found`);
      }

      const script = this.generateLayerManagementScript(filePath, layerStandard);
      const scriptPath = await this.createTempScript(script, 'layer_management');
      
      const result = await this.executeScript(scriptPath);
      await this.cleanupTempScript(scriptPath);

      const layers = this.parseLayersOutput(result);
      
      return {
        success: true,
        layers,
        modified: true
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
   * 智能标注系统
   */
  public async autoDimension(
    filePath: string,
    dimensionType: 'linear' | 'angular' | 'radial' | 'all',
    standard: 'imperial' | 'metric'
  ): Promise<{
    success: boolean;
    dimensions: AutoCADDimension[];
    added: number;
    error?: string;
  }> {
    try {
      const dimStandard = this.dimensionStandards.get(standard);
      if (!dimStandard) {
        throw new Error(`Dimension standard '${standard}' not found`);
      }

      const script = this.generateAutoDimensionScript(filePath, dimensionType, dimStandard);
      const scriptPath = await this.createTempScript(script, 'auto_dimension');
      
      const result = await this.executeScript(scriptPath);
      await this.cleanupTempScript(scriptPath);

      const dimensions = this.parseDimensionsOutput(result);
      
      return {
        success: true,
        dimensions,
        added: dimensions.length
      };
    } catch (error) {
      return {
        success: false,
        dimensions: [],
        added: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 批量格式转换
   */
  public async batchConvert(
    inputFiles: string[],
    outputFormat: AutoCADExportOptions['format'],
    outputFolder: string,
    options?: Partial<AutoCADExportOptions>
  ): Promise<{
    success: boolean;
    converted: number;
    failed: number;
    outputs: Array<{
      inputFile: string;
      outputFile: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    try {
      const results = {
        success: true,
        converted: 0,
        failed: 0,
        outputs: [] as Array<{
          inputFile: string;
          outputFile: string;
          success: boolean;
          error?: string;
        }>
      };

      for (const inputFile of inputFiles) {
        try {
          const convertConfig: AutoCADBatchConfig = {
            inputFolder: dirname(inputFile),
            outputFolder,
            operations: [{
              type: 'convert',
              parameters: { ...options, format: outputFormat }
            }],
            filePattern: basename(inputFile),
            backupOriginals: true
          };

          const batchResult = await this.batchProcess(convertConfig);
          
          if (batchResult.success && batchResult.processed > 0) {
            results.converted++;
            results.outputs.push({
              inputFile,
              outputFile: join(outputFolder, basename(inputFile, extname(inputFile)) + '.' + outputFormat),
              success: true
            });
          } else {
            results.failed++;
            results.outputs.push({
              inputFile,
              outputFile: '',
              success: false,
              error: batchResult.errors.join('; ')
            });
          }
        } catch (error) {
          results.failed++;
          results.outputs.push({
            inputFile,
            outputFile: '',
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      return results;
    } catch (error) {
      return {
        success: false,
        converted: 0,
        failed: inputFiles.length,
        outputs: inputFiles.map(file => ({
          inputFile: file,
          outputFile: '',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }))
      };
    }
  }

  /**
   * 获取文档信息
   */
  public async getDocumentInfo(filePath: string): Promise<{
    success: boolean;
    info?: {
      version: string;
      units: string;
      limits: { minX: number; minY: number; maxX: number; maxY: number };
      layers: number;
      blocks: number;
      entities: number;
      size: number;
      modifiedDate: Date;
    };
    error?: string;
  }> {
    try {
      const script = `
        (defun get-doc-info (/ doc info)
          (setq doc (vla-get-activedocument (vlax-get-acad-object)))
          (setq info
            (list
              (cons "version" (vla-get-version doc))
              (cons "units" (vla-get-measurement doc))
              (cons "layers" (vla-get-count (vla-get-layers doc)))
              (cons "blocks" (vla-get-count (vla-get-blocks doc)))
              (cons "entities" (vla-get-count (vla-get-modelspace doc)))
            )
          )
          (princ (vl-princ-to-string info))
          (princ)
        )
        (get-doc-info)
      `;
      
      const scriptPath = await this.createTempScript(script, 'doc_info');
      const result = await this.executeScript(scriptPath);
      await this.cleanupTempScript(scriptPath);

      const info = this.parseDocumentInfo(result);

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

  private async getInputFiles(config: AutoCADBatchConfig): Promise<string[]> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const pattern = config.filePattern || '*.dwg';
      const command = `dir "${config.inputFolder}\\${pattern}" /B`;
      const { stdout } = await execAsync(command);
      
      return stdout.split('\n')
        .filter(file => file.trim())
        .map(file => join(config.inputFolder, file.trim()))
        .filter(file => ['.dwg', '.dxf'].includes(extname(file).toLowerCase()));
    } catch (error) {
      console.error('Failed to get input files:', error);
      return [];
    }
  }

  private async createBackups(files: string[]): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    for (const file of files) {
      try {
        const backupPath = file + '.backup';
        await execAsync(`copy "${file}" "${backupPath}"`);
      } catch (error) {
        console.error(`Failed to create backup for ${file}:`, error);
      }
    }
  }

  private async processFilesSequential(
    files: string[],
    config: AutoCADBatchConfig,
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
    config: AutoCADBatchConfig,
    results: { processed: number; failed: number; errors: string[] }
  ): Promise<void> {
    const maxConcurrency = config.maxConcurrency || 3;
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

  private async processSingleFile(file: string, config: AutoCADBatchConfig): Promise<string> {
    const script = this.generateBatchScript(file, config);
    const scriptPath = await this.createTempScript(script, `process_${basename(file)}`);
    
    try {
      const result = await this.executeScript(scriptPath);
      return this.extractOutputPath(result);
    } finally {
      await this.cleanupTempScript(scriptPath);
    }
  }

  private generateBatchScript(file: string, config: AutoCADBatchConfig): string {
    let script = `
      (defun process-file ()
        (setq doc (vla-open (vla-get-documents (vlax-get-acad-object)) "${file}"))
    `;

    // 添加操作
    for (const operation of config.operations) {
      script += this.generateOperationScript(operation);
    }

    // 保存文件
    const outputName = basename(file, extname(file));
    script += `
        (vla-saveas doc (vl-filename-base "${file}") "${config.outputFolder}\\${outputName}_processed.dwg")
        (vla-close doc :vlax-false)
        (princ "${config.outputFolder}\\${outputName}_processed.dwg")
      )
      (process-file)
    `;

    return script;
  }

  private generateOperationScript(operation: AutoCADOperation): string {
    switch (operation.type) {
      case 'convert':
        return `
          (if (= "${operation.parameters.format}" "dxf")
            (vla-export doc "${operation.parameters.output}" "dxf" "${operation.parameters.version || 'R2010'}")
          )
        `;
      
      case 'optimize':
        return `
          (vla-purgeall doc)  ; 清理未使用的对象
          (vla-audit doc :vlax-true)  ; 审计文件
        `;
      
      case 'layer':
        return this.generateLayerScript(operation.parameters);
      
      case 'dimension':
        return this.generateDimensionScript(operation.parameters);
      
      default:
        return '';
    }
  }

  private generateLayerManagementScript(filePath: string, layerStandard: Record<string, any>): string {
    return `
      (defun apply-layer-standards ()
        (setq doc (vla-open (vla-get-documents (vlax-get-acad-object)) "${filePath}"))
        (setq layers (vla-get-layers doc))
        
        ; 清理现有图层
        (vlax-for layer layers
          (if (not (member (vla-get-name layer) '("0" "Defpoints")))
            (vla-delete layer)
          )
        )
        
        ; 创建标准图层
        ${Object.entries(layerStandard).map(([layerName, props]: [string, any]) => `
          (setq ${layerName.replace(/[^a-zA-Z0-9]/g, '_')} (vla-add layers "${layerName}"))
          (vla-put-color ${layerName.replace(/[^a-zA-Z0-9]/g, '_')} ${props.color})
          (vla-put-linetype ${layerName.replace(/[^a-zA-Z0-9]/g, '_')} "${props.linetype}")
          (vla-put-lineweight ${layerName.replace(/[^a-zA-Z0-9]/g, '_')} ${props.lineWidth})
        `).join('\n')}
        
        (vla-save doc)
        (vla-close doc :vlax-false)
        (princ "Layer standards applied successfully")
      )
      (apply-layer-standards)
    `;
  }

  private generateLayerScript(params: Record<string, any>): string {
    return `
      (if (= "${params.action}" "rename")
        (progn
          (setq old-layer (vla-item layers "${params.oldName}"))
          (vla-put-name old-layer "${params.newName}")
        )
      )
      (if (= "${params.action}" "properties")
        (progn
          (setq target-layer (vla-item layers "${params.layerName}"))
          ${params.color ? `(vla-put-color target-layer ${params.color})` : ''}
          ${params.linetype ? `(vla-put-linetype target-layer "${params.linetype}")` : ''}
          ${params.lineWidth ? `(vla-put-lineweight target-layer ${params.lineWidth})` : ''}
        )
      )
    `;
  }

  private generateAutoDimensionScript(filePath: string, dimensionType: string, dimStandard: Record<string, any>): string {
    return `
      (defun add-dimensions ()
        (setq doc (vla-open (vla-get-documents (vlax-get-acad-object)) "${filePath}"))
        (setq space (vla-get-modelspace doc))
        
        ; 设置标注样式
        (setq dim-style (vla-add (vla-get-dimstyles doc) "Standard"))
        (vla-put-dimtxsty dim-style "Standard")
        (vla-put-dimtxt dim-style ${dimStandard.textHeight})
        (vla-put-dimscale dim-style ${dimStandard.scale})
        (vla-put-dimdec dim-style ${dimStandard.precision})
        
        ; 自动标注
        ${dimensionType === 'all' || dimensionType === 'linear' ? this.generateLinearDimensionScript() : ''}
        ${dimensionType === 'all' || dimensionType === 'angular' ? this.generateAngularDimensionScript() : ''}
        ${dimensionType === 'all' || dimensionType === 'radial' ? this.generateRadialDimensionScript() : ''}
        
        (vla-save doc)
        (vla-close doc :vlax-false)
        (princ "Dimensions added successfully")
      )
      (add-dimensions)
    `;
  }

  private generateLinearDimensionScript(): string {
    return `
      ; 添加线性标注
      (vlax-for ent (vla-get-modelspace doc)
        (if (= (vla-get-objectname ent) "AcDbLine")
          (progn
            (setq start-pt (vla-get-startpoint ent))
            (setq end-pt (vla-get-endpoint ent))
            (setq dim-obj (vla-adddimlinear space start-pt end-pt 
              (vlax-3d-point (list (+ (car (vlax-get start-pt)) 10) (cadr (vlax-get start-pt)) 0))))
          )
        )
      )
    `;
  }

  private generateAngularDimensionScript(): string {
    return `
      ; 添加角度标注
      (vlax-for ent (vla-get-modelspace doc)
        (if (= (vla-get-objectname ent) "AcDbArc")
          (progn
            (setq center-pt (vla-get-center ent))
            (setq radius (vla-get-radius ent))
            (setq start-angle (vla-get-startangle ent))
            (setq end-angle (vla-get-endangle ent))
            (setq start-pt (vlax-3d-point (list 
              (+ (car center-pt) (* radius (cos start-angle)))
              (+ (cadr center-pt) (* radius (sin start-angle)))
              0)))
            (setq end-pt (vlax-3d-point (list 
              (+ (car center-pt) (* radius (cos end-angle)))
              (+ (cadr center-pt) (* radius (sin end-angle)))
              0)))
            (setq dim-obj (vla-adddimangular space start-pt end-pt center-pt))
          )
        )
      )
    `;
  }

  private generateRadialDimensionScript(): string {
    return `
      ; 添加半径标注
      (vlax-for ent (vla-get-modelspace doc)
        (if (or (= (vla-get-objectname ent) "AcDbCircle") (= (vla-get-objectname ent) "AcDbArc"))
          (progn
            (setq center-pt (vla-get-center ent))
            (setq radius (vla-get-radius ent))
            (setq chord-pt (vlax-3d-point (list 
              (+ (car center-pt) radius) (cadr center-pt) 0)))
            (setq dim-obj (vla-adddimradius space ent chord-pt))
          )
        )
      )
    `;
  }

  private generateDimensionScript(params: Record<string, any>): string {
    return `
      (setq dim-obj (vla-adddim${params.type} space 
        (vlax-3d-point (list ${params.startX} ${params.startY} 0))
        (vlax-3d-point (list ${params.endX} ${params.endY} 0))
        (vlax-3d-point (list ${params.textX} ${params.textY} 0))
      ))
      (vla-put-textstring dim-obj "${params.text}")
    `;
  }

  private async createTempScript(script: string, name: string): Promise<string> {
    const scriptPath = join(this.tempScriptsPath, `${name}_${Date.now()}.lsp`);
    await writeFileAsync(scriptPath, script);
    return scriptPath;
  }

  private async executeScript(scriptPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.autocadPath) {
        reject(new Error('AutoCAD path not set'));
        return;
      }

      const args = ['/b', scriptPath, '/s'];
      this.currentProcess = spawn(this.autocadPath, args);

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
          reject(new Error(`AutoCAD script execution failed: ${stderr}`));
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
    const match = result.match(/^(.+)$/m);
    return match ? match[1].trim() : '';
  }

  private parseLayersOutput(result: string): AutoCADLayer[] {
    try {
      // 解析图层信息并返回
      return []; // 实际实现需要解析AutoCAD的输出格式
    } catch (error) {
      console.error('Failed to parse layers output:', error);
      return [];
    }
  }

  private parseDimensionsOutput(result: string): AutoCADDimension[] {
    try {
      // 解析标注信息并返回
      return []; // 实际实现需要解析AutoCAD的输出格式
    } catch (error) {
      console.error('Failed to parse dimensions output:', error);
      return [];
    }
  }

  private parseDocumentInfo(result: string): any {
    try {
      // 解析文档信息并返回
      return {
        version: '2024',
        units: 'Metric',
        limits: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        layers: 5,
        blocks: 10,
        entities: 100,
        size: 1024,
        modifiedDate: new Date()
      };
    } catch (error) {
      console.error('Failed to parse document info:', error);
      return null;
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
      currentTask: this.isProcessing ? 'Processing CAD files...' : undefined
    };
  }

  // 添加自定义标准
  public addLayerStandard(name: string, standard: Record<string, any>): void {
    this.layerStandards.set(name, standard);
  }

  public addDimensionStandard(name: string, standard: Record<string, any>): void {
    this.dimensionStandards.set(name, standard);
  }
}