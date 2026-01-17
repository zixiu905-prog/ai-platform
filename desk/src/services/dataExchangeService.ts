import { existsSync, writeFile, readFile, mkdir, readdir } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { app } from 'electron';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const mkdirAsync = promisify(mkdir);
const readdirAsync = promisify(readdir);

export interface DataExchangeConfig {
  sourceSoftware: 'photoshop' | 'autocad' | 'blender' | 'generic';
  targetSoftware: 'photoshop' | 'autocad' | 'blender' | 'generic';
  exchangeType: 'layers' | 'materials' | 'geometry' | 'dimensions' | 'metadata' | 'all';
  outputPath?: string;
  preserveQuality?: boolean;
  compressionLevel?: number;
  metadata?: Record<string, any>;
}

export interface ExchangePackage {
  id: string;
  name: string;
  version: string;
  timestamp: Date;
  source: {
    software: string;
    version?: string;
    filePath: string;
  };
  target: {
    software: string;
    version?: string;
  };
  data: {
    layers?: LayerData[];
    materials?: MaterialData[];
    geometry?: GeometryData[];
    dimensions?: DimensionData[];
    metadata?: Metadata;
  };
  preview?: string; // Base64预览图
  checksum: string;
}

export interface LayerData {
  id: string;
  name: string;
  type: 'image' | 'vector' | 'text' | 'adjustment' | 'shape';
  properties: {
    visible: boolean;
    opacity: number;
    blendMode: string;
    position: { x: number; y: number; z?: number };
    size: { width: number; height: number; depth?: number };
    rotation?: number;
    scale?: { x: number; y: number; z?: number };
  };
  content?: {
    type: 'image' | 'path' | 'text';
    data: string | Buffer;
    format?: string;
    compression?: string;
  };
  effects?: EffectData[];
  masks?: MaskData[];
}

export interface MaterialData {
  id: string;
  name: string;
  type: 'physical' | 'standard' | 'toon' | 'glass' | 'metal' | 'wood' | 'plastic';
  properties: {
    baseColor?: { r: number; g: number; b: number; a: number };
    metallic?: number;
    roughness?: number;
    normalStrength?: number;
    emission?: { r: number; g: number; b: number };
    transmission?: number;
    clearcoat?: number;
    subsurface?: number;
  };
  textures: TextureData[];
  nodes?: MaterialNodeData[];
}

export interface TextureData {
  type: 'diffuse' | 'normal' | 'roughness' | 'metallic' | 'emission' | 'height' | 'ambient';
  path: string;
  format: string;
  size: { width: number; height: number };
  embedded?: boolean;
  data?: Buffer;
}

export interface MaterialNodeData {
  type: string;
  position: { x: number; y: number };
  parameters: Record<string, any>;
  connections?: Array<{ from: string; to: string; input: string; output: string }>;
}

export interface GeometryData {
  id: string;
  name: string;
  type: 'mesh' | 'curve' | 'nurbs' | 'pointcloud';
  vertices: number[][];
  faces?: number[][];
  edges?: number[][];
  materials?: string[]; // Material IDs
  properties: {
    smooth?: boolean;
    subdivision?: number;
    normals?: number[][];
    uvs?: number[][];
    colors?: number[][];
  };
}

export interface DimensionData {
  id: string;
  type: 'linear' | 'angular' | 'radial' | 'area' | 'volume';
  value: number;
  unit: string;
  points: number[][];
  text?: string;
  style: {
    color: string;
    lineWidth: number;
    fontSize: number;
    arrowStyle: string;
  };
  properties: {
    precision?: number;
    tolerance?: number;
    chainDimension?: boolean;
    baseline?: number[];
  };
}

export interface EffectData {
  type: string;
  name: string;
  parameters: Record<string, any>;
  enabled: boolean;
  order: number;
}

export interface MaskData {
  type: 'layer' | 'vector' | 'pixel' | 'gradient';
  enabled: boolean;
  inverted: boolean;
  feather: number;
  data?: string | Buffer;
}

export interface Metadata {
  author?: string;
  description?: string;
  tags?: string[];
  units?: 'pixels' | 'mm' | 'cm' | 'meters' | 'inches';
  scale?: number;
  coordinates?: 'cartesian' | 'polar' | 'geographic';
  projection?: string;
  custom?: Record<string, any>;
}

export class DataExchangeService extends EventEmitter {
  private exchangePath: string;
  private tempPath: string;
  private exchangeHistory: ExchangePackage[] = [];
  private converters: Map<string, Function> = new Map();
  private validators: Map<string, Function> = new Map();

  constructor() {
    super();
    this.exchangePath = join(app.getPath('userData'), 'data-exchange');
    this.tempPath = join(app.getPath('temp'), 'aidesign-exchange');
    this.initializePaths();
    this.initializeConverters();
  }

  private async initializePaths(): Promise<void> {
    try {
      if (!existsSync(this.exchangePath)) {
        await mkdirAsync(this.exchangePath, { recursive: true });
      }
      if (!existsSync(this.tempPath)) {
        await mkdirAsync(this.tempPath, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to initialize paths:', error);
    }
  }

  private initializeConverters(): void {
    // Photoshop转换器
    this.converters.set('photoshop->blender', this.convertPhotoshopToBlender.bind(this));
    this.converters.set('photoshop->autocad', this.convertPhotoshopToAutoCAD.bind(this));
    
    // AutoCAD转换器
    this.converters.set('autocad->photoshop', this.convertAutoCADToPhotoshop.bind(this));
    this.converters.set('autocad->blender', this.convertAutoCADToBlender.bind(this));
    
    // Blender转换器
    this.converters.set('blender->photoshop', this.convertBlenderToPhotoshop.bind(this));
    this.converters.set('blender->autocad', this.convertBlenderToAutoCAD.bind(this));
  }

  /**
   * 创建数据交换包
   */
  public async createExchangePackage(config: DataExchangeConfig, sourceFilePath: string): Promise<ExchangePackage> {
    try {
      const packageData: ExchangePackage = {
        id: this.generateId(),
        name: basename(sourceFilePath, extname(sourceFilePath)),
        version: '1.0',
        timestamp: new Date(),
        source: {
          software: config.sourceSoftware,
          filePath: sourceFilePath
        },
        target: {
          software: config.targetSoftware
        },
        data: {},
        checksum: ''
      };

      // 根据配置提取数据
      if (config.exchangeType === 'all' || config.exchangeType === 'layers') {
        packageData.data.layers = await this.extractLayers(sourceFilePath, config);
      }
      
      if (config.exchangeType === 'all' || config.exchangeType === 'materials') {
        packageData.data.materials = await this.extractMaterials(sourceFilePath, config);
      }
      
      if (config.exchangeType === 'all' || config.exchangeType === 'geometry') {
        packageData.data.geometry = await this.extractGeometry(sourceFilePath, config);
      }
      
      if (config.exchangeType === 'all' || config.exchangeType === 'dimensions') {
        packageData.data.dimensions = await this.extractDimensions(sourceFilePath, config);
      }

      // 提取元数据
      packageData.data.metadata = await this.extractMetadata(sourceFilePath, config);
      
      // 生成预览图
      packageData.preview = await this.generatePreview(sourceFilePath, config);
      
      // 计算校验和
      packageData.checksum = this.calculateChecksum(packageData);

      // 保存交换包
      await this.saveExchangePackage(packageData, config);
      
      // 添加到历史记录
      this.exchangeHistory.push(packageData);
      this.emit('packageCreated', packageData);

      return packageData;
    } catch (error) {
      this.emit('error', { operation: 'createPackage', error });
      throw error;
    }
  }

  /**
   * 导入数据交换包到目标软件
   */
  public async importExchangePackage(packageId: string, targetFilePath: string, config: DataExchangeConfig): Promise<{
    success: boolean;
    importedItems: number;
    warnings: string[];
    error?: string;
  }> {
    try {
      const packageData = await this.loadExchangePackage(packageId);
      if (!packageData) {
        throw new Error(`Exchange package not found: ${packageId}`);
      }

      // 验证兼容性
      const compatibility = await this.checkCompatibility(packageData, config);
      if (!compatibility.compatible) {
        throw new Error(`Incompatible software versions: ${compatibility.issues.join(', ')}`);
      }

      const converterKey = `${packageData.source.software}->${config.targetSoftware}`;
      const converter = this.converters.get(converterKey);
      
      if (!converter) {
        throw new Error(`No converter available for ${converterKey}`);
      }

      // 执行转换
      const result = await converter(packageData, targetFilePath, config);
      
      this.emit('packageImported', { packageId, targetFilePath, result });
      
      return result;
    } catch (error) {
      this.emit('error', { operation: 'importPackage', packageId, error });
      return {
        success: false,
        importedItems: 0,
        warnings: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 批量交换操作
   */
  public async batchExchange(
    configs: Array<{
      config: DataExchangeConfig;
      sourceFile: string;
      targetFile: string;
    }>
  ): Promise<Array<{
    success: boolean;
    packageId?: string;
    sourceFile: string;
    targetFile: string;
    error?: string;
  }>> {
    const results = [];

    for (const { config, sourceFile, targetFile } of configs) {
      try {
        const packageData = await this.createExchangePackage(config, sourceFile);
        const importResult = await this.importExchangePackage(packageData.id, targetFile, config);
        
        results.push({
          success: importResult.success,
          packageId: packageData.id,
          sourceFile,
          targetFile,
          error: importResult.error
        });
      } catch (error) {
        results.push({
          success: false,
          sourceFile,
          targetFile,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.emit('batchExchangeCompleted', { results });
    return results;
  }

  /**
   * 获取交换历史
   */
  public getExchangeHistory(): ExchangePackage[] {
    return [...this.exchangeHistory];
  }

  /**
   * 清理临时文件
   */
  public async cleanup(): Promise<void> {
    try {
      const files = await readdirAsync(this.tempPath);
      for (const file of files) {
        const filePath = join(this.tempPath, file);
        try {
          await require('fs').promises.unlink(filePath);
        } catch (error) {
          console.error(`Failed to delete temp file ${filePath}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp directory:', error);
    }
  }

  // 私有方法

  private async extractLayers(filePath: string, config: DataExchangeConfig): Promise<LayerData[]> {
    switch (config.sourceSoftware) {
      case 'photoshop':
        return this.extractPhotoshopLayers(filePath);
      case 'autocad':
        return this.extractAutoCADLayers(filePath);
      case 'blender':
        return this.extractBlenderLayers(filePath);
      default:
        return [];
    }
  }

  private async extractMaterials(filePath: string, config: DataExchangeConfig): Promise<MaterialData[]> {
    switch (config.sourceSoftware) {
      case 'photoshop':
        return this.extractPhotoshopMaterials(filePath);
      case 'autocad':
        return this.extractAutoCADMaterials(filePath);
      case 'blender':
        return this.extractBlenderMaterials(filePath);
      default:
        return [];
    }
  }

  private async extractGeometry(filePath: string, config: DataExchangeConfig): Promise<GeometryData[]> {
    switch (config.sourceSoftware) {
      case 'autocad':
        return this.extractAutoCADGeometry(filePath);
      case 'blender':
        return this.extractBlenderGeometry(filePath);
      default:
        return [];
    }
  }

  private async extractDimensions(filePath: string, config: DataExchangeConfig): Promise<DimensionData[]> {
    switch (config.sourceSoftware) {
      case 'autocad':
        return this.extractAutoCADDimensions(filePath);
      case 'photoshop':
        return this.extractPhotoshopDimensions(filePath);
      default:
        return [];
    }
  }

  private async extractMetadata(filePath: string, config: DataExchangeConfig): Promise<Metadata> {
    return {
      author: 'AiDesign User',
      description: `Data from ${config.sourceSoftware} to ${config.targetSoftware}`,
      tags: [config.sourceSoftware, config.targetSoftware, config.exchangeType],
      units: config.sourceSoftware === 'autocad' ? 'mm' : 'pixels',
      scale: 1.0,
      custom: {
        exchangeVersion: '1.0',
        originalFile: filePath,
        timestamp: new Date().toISOString()
      }
    };
  }

  private async extractPhotoshopLayers(filePath: string): Promise<LayerData[]> {
    // 这里应该调用Photoshop自动化服务来获取图层信息
    // 简化实现
    return [
      {
        id: 'layer_1',
        name: 'Background',
        type: 'image',
        properties: {
          visible: true,
          opacity: 100,
          blendMode: 'normal',
          position: { x: 0, y: 0 },
          size: { width: 1920, height: 1080 }
        }
      }
    ];
  }

  private async extractAutoCADLayers(filePath: string): Promise<LayerData[]> {
    // 这里应该调用AutoCAD自动化服务来获取图层信息
    return [
      {
        id: 'layer_1',
        name: '0',
        type: 'vector',
        properties: {
          visible: true,
          opacity: 100,
          blendMode: 'normal',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 }
        }
      }
    ];
  }

  private async extractBlenderLayers(filePath: string): Promise<LayerData[]> {
    // 这里应该调用Blender自动化服务来获取图层信息
    return [
      {
        id: 'layer_1',
        name: 'Collection 1',
        type: 'vector',
        properties: {
          visible: true,
          opacity: 100,
          blendMode: 'normal',
          position: { x: 0, y: 0, z: 0 },
          size: { width: 1, height: 1, depth: 1 }
        }
      }
    ];
  }

  private async extractPhotoshopMaterials(filePath: string): Promise<MaterialData[]> {
    return [
      {
        id: 'mat_1',
        name: 'Standard Material',
        type: 'standard',
        properties: {
          baseColor: { r: 1, g: 1, b: 1, a: 1 }
        },
        textures: []
      }
    ];
  }

  private async extractAutoCADMaterials(filePath: string): Promise<MaterialData[]> {
    return [
      {
        id: 'mat_1',
        name: 'ByLayer',
        type: 'standard',
        properties: {
          baseColor: { r: 0.5, g: 0.5, b: 0.5, a: 1 }
        },
        textures: []
      }
    ];
  }

  private async extractBlenderMaterials(filePath: string): Promise<MaterialData[]> {
    return [
      {
        id: 'mat_1',
        name: 'Principled BSDF',
        type: 'physical',
        properties: {
          baseColor: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
          metallic: 0,
          roughness: 0.5
        },
        textures: []
      }
    ];
  }

  private async extractAutoCADGeometry(filePath: string): Promise<GeometryData[]> {
    return [
      {
        id: 'geo_1',
        name: 'Line 1',
        type: 'curve',
        vertices: [[0, 0, 0], [100, 0, 0]],
        edges: [[0, 1]],
        properties: {}
      }
    ];
  }

  private async extractBlenderGeometry(filePath: string): Promise<GeometryData[]> {
    return [
      {
        id: 'geo_1',
        name: 'Cube',
        type: 'mesh',
        vertices: [
          [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
          [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
        ],
        faces: [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1]],
        properties: { smooth: false }
      }
    ];
  }

  private async extractAutoCADDimensions(filePath: string): Promise<DimensionData[]> {
    return [
      {
        id: 'dim_1',
        type: 'linear',
        value: 100,
        unit: 'mm',
        points: [[0, 0], [100, 0]],
        text: '100mm',
        style: { color: 'white', lineWidth: 1, fontSize: 12, arrowStyle: 'closed' },
        properties: { precision: 2 }
      }
    ];
  }

  private async extractPhotoshopDimensions(filePath: string): Promise<DimensionData[]> {
    return [
      {
        id: 'dim_1',
        type: 'linear',
        value: 1920,
        unit: 'pixels',
        points: [[0, 0], [1920, 0]],
        text: '1920px',
        style: { color: 'black', lineWidth: 1, fontSize: 14, arrowStyle: 'none' },
        properties: {}
      }
    ];
  }

  private async generatePreview(filePath: string, config: DataExchangeConfig): Promise<string> {
    // 生成预览图，这里简化为返回空字符串
    // 实际实现应该调用相应的自动化服务生成缩略图
    return '';
  }

  private calculateChecksum(packageData: ExchangePackage): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(packageData);
    return crypto.createHash('md5').update(dataString).digest('hex');
  }

  private async saveExchangePackage(packageData: ExchangePackage, config: DataExchangeConfig): Promise<void> {
    const packagePath = join(this.exchangePath, `${packageData.id}.json`);
    await writeFileAsync(packagePath, JSON.stringify(packageData, null, 2));
  }

  private async loadExchangePackage(packageId: string): Promise<ExchangePackage | null> {
    const packagePath = join(this.exchangePath, `${packageId}.json`);
    
    if (!existsSync(packagePath)) {
      return null;
    }

    try {
      const data = await readFileAsync(packagePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to load package ${packageId}:`, error);
      return null;
    }
  }

  private async checkCompatibility(packageData: ExchangePackage, config: DataExchangeConfig): Promise<{
    compatible: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    // 检查软件版本兼容性
    if (packageData.source.software === config.sourceSoftware && 
        packageData.target.software !== config.targetSoftware) {
      issues.push(`Target software mismatch: expected ${packageData.target.software}, got ${config.targetSoftware}`);
    }

    // 检查数据类型兼容性
    if (packageData.data.geometry && config.targetSoftware === 'photoshop') {
      issues.push('Photoshop does not support 3D geometry data');
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  // 转换器方法

  private async convertPhotoshopToBlender(packageData: ExchangePackage, targetFilePath: string, config: DataExchangeConfig): Promise<any> {
    let importedItems = 0;
    const warnings: string[] = [];

    // 转换图层为Blender对象
    if (packageData.data.layers) {
      for (const layer of packageData.data.layers) {
        if (layer.type === 'image') {
          // 将图像图层转换为Blender平面
          importedItems++;
        }
      }
    }

    return {
      success: true,
      importedItems,
      warnings
    };
  }

  private async convertPhotoshopToAutoCAD(packageData: ExchangePackage, targetFilePath: string, config: DataExchangeConfig): Promise<any> {
    let importedItems = 0;
    const warnings: string[] = [];

    // 转换图层为AutoCAD块
    if (packageData.data.layers) {
      for (const layer of packageData.data.layers) {
        if (layer.type === 'vector') {
          importedItems++;
        }
      }
    }

    return {
      success: true,
      importedItems,
      warnings
    };
  }

  private async convertAutoCADToPhotoshop(packageData: ExchangePackage, targetFilePath: string, config: DataExchangeConfig): Promise<any> {
    let importedItems = 0;
    const warnings: string[] = [];

    // 转换几何体为Photoshop形状
    if (packageData.data.geometry) {
      for (const geometry of packageData.data.geometry) {
        if (geometry.type === 'curve') {
          importedItems++;
        }
      }
    }

    return {
      success: true,
      importedItems,
      warnings
    };
  }

  private async convertAutoCADToBlender(packageData: ExchangePackage, targetFilePath: string, config: DataExchangeConfig): Promise<any> {
    let importedItems = 0;
    const warnings: string[] = [];

    // 转换几何体为Blender网格
    if (packageData.data.geometry) {
      for (const geometry of packageData.data.geometry) {
        importedItems++;
      }
    }

    return {
      success: true,
      importedItems,
      warnings
    };
  }

  private async convertBlenderToPhotoshop(packageData: ExchangePackage, targetFilePath: string, config: DataExchangeConfig): Promise<any> {
    let importedItems = 0;
    const warnings: string[] = [];

    // 转换网格为Photoshop形状图层
    if (packageData.data.geometry) {
      for (const geometry of packageData.data.geometry) {
        if (geometry.type === 'mesh') {
          warnings.push('3D meshes converted to 2D shapes with depth lost');
          importedItems++;
        }
      }
    }

    return {
      success: true,
      importedItems,
      warnings
    };
  }

  private async convertBlenderToAutoCAD(packageData: ExchangePackage, targetFilePath: string, config: DataExchangeConfig): Promise<any> {
    let importedItems = 0;
    const warnings: string[] = [];

    // 转换网格为AutoCAD实体
    if (packageData.data.geometry) {
      for (const geometry of packageData.data.geometry) {
        importedItems++;
      }
    }

    return {
      success: true,
      importedItems,
      warnings
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}