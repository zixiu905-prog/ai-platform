import { spawn, ChildProcess } from 'child_process';
import { existsSync, writeFile, readFile, unlink, mkdir } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { app } from 'electron';
import { promisify } from 'util';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);
const mkdirAsync = promisify(mkdir);

export interface BlenderBatchConfig {
  inputFolder: string;
  outputFolder: string;
  operations: BlenderOperation[];
  filePattern?: string; // *.blend, *.obj, *.fbx, etc.
  preserveStructure?: boolean;
  backupOriginals?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
}

export interface BlenderOperation {
  type: 'optimize' | 'material' | 'render' | 'animation' | 'export' | 'decimate' | 'remesh';
  parameters: Record<string, any>;
}

export interface BlenderMaterial {
  name: string;
  type: string;
  properties: Record<string, any>;
  textures: Array<{
    type: string;
    path: string;
    strength: number;
  }>;
}

export interface BlenderRenderSettings {
  engine: 'CYCLES' | 'EEVEE' | 'WORKBENCH';
  resolution: { width: number; height: number };
  samples: number;
  quality: number;
  format: string;
  transparent?: boolean;
  denoising?: boolean;
}

export interface BlenderAnimationSettings {
  startFrame: number;
  endFrame: number;
  frameRate: number;
  step: number;
  outputFormat: 'MP4' | 'AVI' | 'PNG' | 'GIF';
  quality?: number;
}

export class BlenderAutomationService {
  private blenderPath: string | null = null;
  private tempScriptsPath: string;
  private isProcessing: boolean = false;
  private currentProcess: ChildProcess | null = null;
  private operationQueue: BlenderBatchConfig[] = [];
  private eventListeners: Map<string, Function[]> = new Map();
  private renderPresets: Map<string, BlenderRenderSettings> = new Map();
  private materialLibraries: Map<string, any> = new Map();

  constructor() {
    this.tempScriptsPath = join(app.getPath('temp'), 'aidesign-blender-scripts');
    this.initializeTempDirectory();
    this.initializePresets();
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

  private initializePresets(): void {
    // 初始化渲染预设
    this.renderPresets.set('preview', {
      engine: 'EEVEE',
      resolution: { width: 1920, height: 1080 },
      samples: 64,
      quality: 80,
      format: 'PNG',
      transparent: false,
      denoising: true
    });

    this.renderPresets.set('production', {
      engine: 'CYCLES',
      resolution: { width: 3840, height: 2160 },
      samples: 256,
      quality: 95,
      format: 'EXR',
      transparent: true,
      denoising: true
    });

    this.renderPresets.set('web', {
      engine: 'EEVEE',
      resolution: { width: 1280, height: 720 },
      samples: 32,
      quality: 70,
      format: 'JPG',
      transparent: false,
      denoising: false
    });

    // 初始化材质库
    this.materialLibraries.set('metal', {
      properties: {
        metallic: 1.0,
        roughness: 0.2,
        specular: 0.5
      },
      nodes: [
        { type: 'Principled BSDF', parameters: {} },
        { type: 'Noise Texture', parameters: { scale: 10 } }
      ]
    });

    this.materialLibraries.set('wood', {
      properties: {
        metallic: 0.0,
        roughness: 0.8,
        specular: 0.3
      },
      nodes: [
        { type: 'Principled BSDF', parameters: {} },
        { type: 'Voronoi Texture', parameters: { scale: 50 } }
      ]
    });
  }

  /**
   * 设置Blender可执行文件路径
   */
  public setBlenderPath(path: string): void {
    this.blenderPath = path;
  }

  /**
   * 检测Blender安装路径
   */
  public async detectBlenderInstallation(): Promise<string | null> {
    const commonPaths = [
      'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 3.5\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender-launcher.exe',
      '/Applications/Blender.app/Contents/MacOS/Blender',
      '/usr/bin/blender'
    ];

    for (const path of commonPaths) {
      if (existsSync(path)) {
        this.blenderPath = path;
        return path;
      }
    }

    return null;
  }

  /**
   * 批量处理Blender文件
   */
  public async batchProcess(config: BlenderBatchConfig): Promise<{
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
          errors: ['Blender is currently processing another task. Task queued.'],
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
   * 智能模型优化
   */
  public async optimizeModel(
    filePath: string,
    optimizationLevel: 'light' | 'medium' | 'aggressive',
    targetPolygons?: number
  ): Promise<{
    success: boolean;
    originalVertices: number;
    originalPolygons: number;
    optimizedVertices: number;
    optimizedPolygons: number;
    reductionPercentage: number;
    outputPath: string;
    error?: string;
  }> {
    try {
      const script = this.generateOptimizationScript(filePath, optimizationLevel, targetPolygons);
      const scriptPath = await this.createTempScript(script, 'optimize');
      
      const result = await this.executeScript(scriptPath);
      await this.cleanupTempScript(scriptPath);

      const optimizationResult = this.parseOptimizationResult(result);
      
      return {
        success: true,
        ...optimizationResult
      };
    } catch (error) {
      return {
        success: false,
        originalVertices: 0,
        originalPolygons: 0,
        optimizedVertices: 0,
        optimizedPolygons: 0,
        reductionPercentage: 0,
        outputPath: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 智能材质管理
   */
  public async manageMaterials(
    filePath: string,
    materialType: 'metal' | 'wood' | 'plastic' | 'glass' | 'custom',
    customMaterial?: any
  ): Promise<{
    success: boolean;
    materials: BlenderMaterial[];
    applied: number;
    error?: string;
  }> {
    try {
      const materialLibrary = materialType === 'custom' ? customMaterial : this.materialLibraries.get(materialType);
      if (!materialLibrary) {
        throw new Error(`Material type '${materialType}' not found`);
      }

      const script = this.generateMaterialScript(filePath, materialLibrary);
      const scriptPath = await this.createTempScript(script, 'materials');
      
      const result = await this.executeScript(scriptPath);
      await this.cleanupTempScript(scriptPath);

      const materials = this.parseMaterialsResult(result);
      
      return {
        success: true,
        materials,
        applied: materials.length
      };
    } catch (error) {
      return {
        success: false,
        materials: [],
        applied: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 批量渲染
   */
  public async batchRender(
    inputFiles: string[],
    renderSettings: BlenderRenderSettings,
    outputFolder: string
  ): Promise<{
    success: boolean;
    rendered: number;
    failed: number;
    outputs: Array<{
      inputFile: string;
      outputFile: string;
      renderTime: number;
      success: boolean;
      error?: string;
    }>;
  }> {
    try {
      const results = {
        success: true,
        rendered: 0,
        failed: 0,
        outputs: [] as Array<{
          inputFile: string;
          outputFile: string;
          renderTime: number;
          success: boolean;
          error?: string;
        }>
      };

      for (const inputFile of inputFiles) {
        try {
          const startTime = Date.now();
          const renderConfig: BlenderBatchConfig = {
            inputFolder: dirname(inputFile),
            outputFolder,
            operations: [{
              type: 'render',
              parameters: renderSettings
            }],
            filePattern: basename(inputFile),
            backupOriginals: false
          };

          const batchResult = await this.batchProcess(renderConfig);
          const renderTime = Date.now() - startTime;
          
          if (batchResult.success && batchResult.processed > 0) {
            results.rendered++;
            results.outputs.push({
              inputFile,
              outputFile: join(outputFolder, basename(inputFile, extname(inputFile)) + '.png'),
              renderTime,
              success: true
            });
          } else {
            results.failed++;
            results.outputs.push({
              inputFile,
              outputFile: '',
              renderTime,
              success: false,
              error: batchResult.errors.join('; ')
            });
          }
        } catch (error) {
          results.failed++;
          results.outputs.push({
            inputFile,
            outputFile: '',
            renderTime: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      return results;
    } catch (error) {
      return {
        success: false,
        rendered: 0,
        failed: inputFiles.length,
        outputs: inputFiles.map(file => ({
          inputFile: file,
          outputFile: '',
          renderTime: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }))
      };
    }
  }

  /**
   * 动画关键帧批量编辑
   */
  public async editKeyframes(
    filePath: string,
    edits: Array<{
      objectName: string;
      property: string;
      frame: number;
      value: any;
      interpolation?: string;
    }>
  ): Promise<{
    success: boolean;
    edited: number;
    totalFrames: number;
    error?: string;
  }> {
    try {
      const script = this.generateKeyframeScript(filePath, edits);
      const scriptPath = await this.createTempScript(script, 'keyframes');
      
      const result = await this.executeScript(scriptPath);
      await this.cleanupTempScript(scriptPath);

      const keyframeResult = this.parseKeyframeResult(result);
      
      return {
        success: true,
        edited: keyframeResult.edited,
        totalFrames: keyframeResult.totalFrames
      };
    } catch (error) {
      return {
        success: false,
        edited: 0,
        totalFrames: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取模型信息
   */
  public async getModelInfo(filePath: string): Promise<{
    success: boolean;
    info?: {
      vertices: number;
      polygons: number;
      objects: number;
      materials: number;
      textures: number;
      animations: boolean;
      animationFrames: number;
      fileFormat: string;
      fileSize: number;
    };
    error?: string;
  }> {
    try {
      const script = `
import bpy
import os

def get_model_info():
    # 清空当前场景
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    # 导入文件
    bpy.ops.import_scene.fbx(filepath="${filePath}")
    
    # 收集信息
    info = {
        'vertices': 0,
        'polygons': 0,
        'objects': len(bpy.context.scene.objects),
        'materials': len(bpy.data.materials),
        'textures': len(bpy.data.textures),
        'animations': False,
        'animationFrames': 0,
        'fileFormat': os.path.splitext('${filePath}')[1][1:].upper(),
        'fileSize': ${existsSync(filePath) ? require('fs').statSync(filePath).size : 0}
    }
    
    # 计算顶点和面数
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            info['vertices'] += len(obj.data.vertices)
            info['polygons'] += len(obj.data.polygons)
    
    # 检查动画
    if bpy.context.scene.animation_data and bpy.context.scene.animation_data.action:
        info['animations'] = True
        info['animationFrames'] = bpy.context.scene.frame_end - bpy.context.scene.frame_start
    
    return info

info = get_model_info()
print(str(info))
      `;
      
      const scriptPath = await this.createTempScript(script, 'model_info');
      const result = await this.executeScript(scriptPath);
      await this.cleanupTempScript(scriptPath);

      const info = this.parseModelInfo(result);

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

  private async getInputFiles(config: BlenderBatchConfig): Promise<string[]> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const pattern = config.filePattern || '*.blend';
      const command = `dir "${config.inputFolder}\\${pattern}" /B`;
      const { stdout } = await execAsync(command);
      
      return stdout.split('\n')
        .filter(file => file.trim())
        .map(file => join(config.inputFolder, file.trim()))
        .filter(file => ['.blend', '.obj', '.fbx', '.dae', '.ply'].includes(extname(file).toLowerCase()));
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
    config: BlenderBatchConfig,
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
    config: BlenderBatchConfig,
    results: { processed: number; failed: number; errors: string[] }
  ): Promise<void> {
    const maxConcurrency = config.maxConcurrency || 2; // Blender比较占用资源
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

  private async processSingleFile(file: string, config: BlenderBatchConfig): Promise<string> {
    const script = this.generateBatchScript(file, config);
    const scriptPath = await this.createTempScript(script, `process_${basename(file)}`);
    
    try {
      const result = await this.executeScript(scriptPath);
      return this.extractOutputPath(result);
    } finally {
      await this.cleanupTempScript(scriptPath);
    }
  }

  private generateBatchScript(file: string, config: BlenderBatchConfig): string {
    let script = `
import bpy
import os

def process_file():
    # 清空当前场景
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    # 导入文件
    file_ext = os.path.splitext("${file}")[1].lower()
    if file_ext == '.blend':
        bpy.ops.wm.open_mainfile(filepath="${file}")
    elif file_ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath="${file}")
    elif file_ext == '.obj':
        bpy.ops.import_scene.obj(filepath="${file}")
    else:
        print(f"Unsupported file format: {file_ext}")
        return
    
    output_file = os.path.join("${config.outputFolder}", os.path.splitext(os.path.basename("${file}"))[0] + "_processed.blend")
`;

    // 添加操作
    for (const operation of config.operations) {
      script += this.generateOperationScript(operation);
    }

    // 保存文件
    script += `
    bpy.ops.wm.save_mainfile(filepath=output_file)
    print(output_file)

process_file()
`;

    return script;
  }

  private generateOperationScript(operation: BlenderOperation): string {
    switch (operation.type) {
      case 'optimize':
        return this.generateOptimizationScript(
          operation.parameters.filePath || '',
          operation.parameters.level || 'medium',
          operation.parameters.targetPolygons
        );

      case 'material':
        return this.generateMaterialScript('', operation.parameters);

      case 'render':
        return this.generateRenderScript(operation.parameters as BlenderRenderSettings);

      case 'export':
        return this.generateExportScript(operation.parameters);

      default:
        return '';
    }
  }

  private generateOptimizationScript(filePath: string, level: string, targetPolygons?: number): string {
    const ratios = {
      light: 0.8,
      medium: 0.5,
      aggressive: 0.2
    };

    return `
import bpy
import math

def optimize_model():
    # 清空场景
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    # 导入模型
    bpy.ops.wm.open_mainfile(filepath="${filePath}")
    
    # 选择所有网格对象
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    
    original_vertices = 0
    original_polygons = 0
    
    for obj in mesh_objects:
        original_vertices += len(obj.data.vertices)
        original_polygons += len(obj.data.polygons)
        
        # 添加Decimate修改器
        decimate = obj.modifiers.new(name='Decimate', type='DECIMATE')
        ${targetPolygons ? 
          `decimate.ratio = min(${targetPolygons} / len(obj.data.polygons), 1.0)` :
          `decimate.ratio = ${ratios[level]}`
        }
        
        # 应用修改器
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=decimate.name)
    
    # 计算优化后的统计
    optimized_vertices = 0
    optimized_polygons = 0
    
    for obj in mesh_objects:
        optimized_vertices += len(obj.data.vertices)
        optimized_polygons += len(obj.data.polygons)
    
    reduction_percentage = ((original_polygons - optimized_polygons) / original_polygons) * 100
    
    output_file = "${filePath.replace('.blend', '_optimized.blend')}"
    bpy.ops.wm.save_mainfile(filepath=output_file)
    
    result = {
        'originalVertices': original_vertices,
        'originalPolygons': original_polygons,
        'optimizedVertices': optimized_vertices,
        'optimizedPolygons': optimized_polygons,
        'reductionPercentage': reduction_percentage,
        'outputPath': output_file
    }
    
    print(str(result))

optimize_model()
    `;
  }

  private generateMaterialScript(filePath: string, materialLibrary: any): string {
    return `
import bpy
import os

def apply_materials():
    if "${filePath}":
        bpy.ops.wm.open_mainfile(filepath="${filePath}")
    
    # 为选中的对象应用材质
    selected_objects = bpy.context.selected_objects if bpy.context.selected_objects else bpy.context.scene.objects
    
    for obj in selected_objects:
        if obj.type == 'MESH' and obj.data.materials:
            for i, mat_slot in enumerate(obj.data.materials):
                if mat_slot:
                    # 创建新材质
                    new_mat = bpy.data.materials.new(name=f"AutoMaterial_{i}")
                    obj.data.materials[i] = new_mat
                    
                    # 设置材质属性
                    new_mat.use_nodes = True
                    bsdf = new_mat.node_tree.nodes.get('Principled BSDF')
                    
                    if bsdf:
                        ${Object.entries(materialLibrary.properties || {}).map(([key, value]) => 
                          `bsdf.inputs['${key}'].default_value = ${value}`
                        ).join('\n                        ')}
    
    print("Materials applied successfully")

apply_materials()
    `;
  }

  private generateRenderScript(settings: BlenderRenderSettings): string {
    return `
    # 设置渲染参数
    bpy.context.scene.render.engine = '${settings.engine}'
    bpy.context.scene.render.resolution_x = ${settings.resolution.width}
    bpy.context.scene.render.resolution_y = ${settings.resolution.height}
    bpy.context.scene.render.resolution_percentage = 100

    if '${settings.engine}' == 'CYCLES':
        bpy.context.scene.cycles.samples = ${settings.samples}
        bpy.context.scene.cycles.use_denoising = ${settings.denoising ? 'True' : 'False'}
    elif '${settings.engine}' == 'EEVEE':
        bpy.context.scene.eevee.taa_render_samples = ${settings.samples}
        bpy.context.scene.eevee.use_ssr = True
        bpy.context.scene.eevee.use_ssr_refraction = True

    bpy.context.scene.render.image_settings.file_format = '${settings.format}'
    bpy.context.scene.render.image_settings.quality = ${settings.quality}
    bpy.context.scene.render.film_transparent = ${settings.transparent ? 'True' : 'False'}

    # 渲染图片
    output_path = os.path.join("/tmp", f"render_{os.path.basename(bpy.context.scene.filepath)}.png")
    bpy.context.scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)
    `;
  }

  private generateExportScript(parameters: any): string {
    return `
    # 导出设置
    export_format = "${parameters.format}"
    export_path = os.path.join("/tmp", f"export_{os.path.basename(bpy.context.scene.filepath)}.{export_format}")
    
    if export_format == 'fbx':
        bpy.ops.export_scene.fbx(
            filepath=export_path,
            apply_modifiers=${parameters.applyModifiers || 'True'},
            mesh_smooth_type='${parameters.smoothType || 'OFF'}'
        )
    elif export_format == 'obj':
        bpy.ops.export_scene.obj(
            filepath=export_path,
            apply_modifiers=${parameters.applyModifiers || 'True'},
            global_scale=${parameters.scale || 1.0}
        )
    `;
  }

  private generateKeyframeScript(filePath: string, edits: any[]): string {
    return `
import bpy

def edit_keyframes():
    bpy.ops.wm.open_mainfile(filepath="${filePath}")
    
    edits = ${JSON.stringify(edits)}
    edited_count = 0
    
    for edit in edits:
        obj = bpy.data.objects.get(edit['objectName'])
        if obj and obj.animation_data and obj.animation_data.action:
            fcurve = obj.animation_data.action.fcurves.find(edit['property'])
            if fcurve:
                # 插入或更新关键帧
                fcurve.keyframe_points.insert(edit['frame'], edit['value'])
                ${edits.map(e => e.interpolation ? `fcurve.interpolation = '${e.interpolation}'` : '').join('\n                ')}
                edited_count += 1
    
    total_frames = bpy.context.scene.frame_end - bpy.context.scene.frame_start
    result = {
        'edited': edited_count,
        'totalFrames': total_frames
    }
    
    print(str(result))

edit_keyframes()
    `;
  }

  private async createTempScript(script: string, name: string): Promise<string> {
    const scriptPath = join(this.tempScriptsPath, `${name}_${Date.now()}.py`);
    await writeFileAsync(scriptPath, script);
    return scriptPath;
  }

  private async executeScript(scriptPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.blenderPath) {
        reject(new Error('Blender path not set'));
        return;
      }

      const args = ['-b', '-P', scriptPath];
      this.currentProcess = spawn(this.blenderPath, args);

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
          reject(new Error(`Blender script execution failed: ${stderr}`));
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

  private parseOptimizationResult(result: string): any {
    try {
      const lines = result.split('\n');
      for (const line of lines) {
        if (line.includes('{')) {
          return JSON.parse(line);
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to parse optimization result:', error);
      return null;
    }
  }

  private parseMaterialsResult(result: string): BlenderMaterial[] {
    try {
      // 解析材质结果
      return [];
    } catch (error) {
      console.error('Failed to parse materials result:', error);
      return [];
    }
  }

  private parseKeyframeResult(result: string): any {
    try {
      const lines = result.split('\n');
      for (const line of lines) {
        if (line.includes('{')) {
          return JSON.parse(line);
        }
      }
      return { edited: 0, totalFrames: 0 };
    } catch (error) {
      console.error('Failed to parse keyframe result:', error);
      return { edited: 0, totalFrames: 0 };
    }
  }

  private parseModelInfo(result: string): any {
    try {
      const lines = result.split('\n');
      for (const line of lines) {
        if (line.includes('{')) {
          return JSON.parse(line);
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to parse model info:', error);
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
      currentTask: this.isProcessing ? 'Processing Blender files...' : undefined
    };
  }

  // 添加自定义预设
  public addRenderPreset(name: string, preset: BlenderRenderSettings): void {
    this.renderPresets.set(name, preset);
  }

  public addMaterialLibrary(name: string, library: any): void {
    this.materialLibraries.set(name, library);
  }
}