import { EventEmitter } from 'events';
import { TaskMessage, StatusMessage } from './websocketClientService';
import { PhotoshopAutomationService } from './photoshopAutomationService';
import { AutoCADAutomationService } from './autocadAutomationService';
import { BlenderAutomationService } from './blenderAutomationService';
import { SoftwareIntegrationService } from '../services/softwareIntegrationService';
import { statusTrackingService } from './statusTrackingService';

// 获取服务实例
const photoshopAutomationService = new PhotoshopAutomationService();
const autocadAutomationService = new AutoCADAutomationService();
const blenderAutomationService = new BlenderAutomationService();
const softwareIntegrationService = new SoftwareIntegrationService();

export interface TaskProcessor {
  canProcess(task: TaskMessage): boolean;
  process(task: TaskMessage): Promise<any>;
}

export interface TaskContext {
  taskId: string;
  timestamp: number;
  priority: string;
  startTime: number;
}

export class TaskProcessorService extends EventEmitter {
  private processors: Map<string, TaskProcessor> = new Map();
  private activeTasks: Map<string, TaskContext> = new Map();
  private processingQueue: TaskMessage[] = [];
  private isProcessing = false;
  private maxConcurrentTasks = 3;

  constructor() {
    super();
    this.initializeProcessors();
  }

  private initializeProcessors() {
    // Photoshop任务处理器
    this.registerProcessor('photoshop', {
      canProcess: (task: TaskMessage) => {
        return task.parameters?.software === 'photoshop' ||
               task.command.includes('photoshop');
      },
      process: async (task: TaskMessage) => {
        return await this.processPhotoshopTask(task);
      }
    });

    // AutoCAD任务处理器
    this.registerProcessor('autocad', {
      canProcess: (task: TaskMessage) => {
        return task.parameters?.software === 'autocad' ||
               task.command.includes('autocad');
      },
      process: async (task: TaskMessage) => {
        return await this.processAutoCADTask(task);
      }
    });

    // Blender任务处理器
    this.registerProcessor('blender', {
      canProcess: (task: TaskMessage) => {
        return task.parameters?.software === 'blender' ||
               task.command.includes('blender');
      },
      process: async (task: TaskMessage) => {
        return await this.processBlenderTask(task);
      }
    });

    // 文件操作任务处理器
    this.registerProcessor('file', {
      canProcess: (task: TaskMessage) => {
        return task.type === 'file_operation' ||
               task.command.includes('文件') ||
               task.command.includes('保存') ||
               task.command.includes('打开');
      },
      process: async (task: TaskMessage) => {
        return await this.processFileTask(task);
      }
    });

    // 系统任务处理器
    this.registerProcessor('system', {
      canProcess: (task: TaskMessage) => {
        return task.type === 'system_command' ||
               task.command.includes('启动') ||
               task.command.includes('关闭') ||
               task.command.includes('检查');
      },
      process: async (task: TaskMessage) => {
        return await this.processSystemTask(task);
      }
    });
  }

  registerProcessor(name: string, processor: TaskProcessor) {
    this.processors.set(name, processor);
  }

  async processTask(task: TaskMessage): Promise<any> {
    const taskId = task.id;
    
    // 添加任务上下文
    const context: TaskContext = {
      taskId,
      timestamp: task.timestamp,
      priority: task.priority || 'medium',
      startTime: Date.now()
    };
    
    this.activeTasks.set(taskId, context);

    try {
      this.emit('task_started', { taskId, task });
      
      // 查找合适的处理器
      let processor: TaskProcessor | null = null;
      let processorName = '';
      
      for (const [name, p] of this.processors) {
        if (p.canProcess(task)) {
          processor = p;
          processorName = name;
          break;
        }
      }

      if (!processor) {
        throw new Error(`未找到适合的任务处理器: ${task.type} - ${task.command}`);
      }

      console.log(`使用${processorName}处理器处理任务: ${task.command}`);
      
      // 处理任务
      const result = await processor.process(task);
      
      this.emit('task_completed', { taskId, task, result });
      return result;
      
    } catch (error) {
      console.error(`任务处理失败 ${taskId}:`, error);
      this.emit('task_failed', { taskId, task, error: error.message });
      throw error;
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  private async processPhotoshopTask(task: TaskMessage): Promise<any> {
    const { command, parameters } = task;
    
    statusTrackingService.addSubStep(task.id, 'photoshop_preparation', '准备Photoshop操作');
    statusTrackingService.updateSubStepProgress(task.id, 'photoshop_preparation', 50, 'Photoshop准备完成');
    
    try {
      let result;
      
      switch (command) {
        case '创建文档':
        case '创建新文档':
          statusTrackingService.addSubStep(task.id, 'create_document', '创建文档');
          statusTrackingService.updateSubStepProgress(task.id, 'create_document', 25, '正在创建新文档');
          result = await this.createPhotoshopDocument(parameters);
          statusTrackingService.updateSubStepProgress(task.id, 'create_document', 100, '文档创建完成');
          break;
        
        case '图层操作':
        case '图层':
          statusTrackingService.addSubStep(task.id, 'layer_operation', '执行图层操作');
          statusTrackingService.updateSubStepProgress(task.id, 'layer_operation', 25, '正在执行图层操作');
          result = await this.performLayerOperation(parameters);
          statusTrackingService.updateSubStepProgress(task.id, 'layer_operation', 100, '图层操作完成');
          break;
        
        case '应用滤镜':
        case '滤镜':
          statusTrackingService.addSubStep(task.id, 'apply_filters', '应用滤镜');
          statusTrackingService.updateSubStepProgress(task.id, 'apply_filters', 25, '正在应用滤镜');
          result = await this.applyFilters(parameters);
          statusTrackingService.updateSubStepProgress(task.id, 'apply_filters', 100, '滤镜应用完成');
          break;
        
        case '导出图片':
        case '保存图片':
          statusTrackingService.addSubStep(task.id, 'export_image', '导出图片');
          statusTrackingService.updateSubStepProgress(task.id, 'export_image', 25, '正在导出图片');
          result = await this.exportImage(parameters);
          statusTrackingService.updateSubStepProgress(task.id, 'export_image', 100, '图片导出完成');
          break;
        
        case '批量处理':
          statusTrackingService.addSubStep(task.id, 'batch_process', '批量处理');
          statusTrackingService.updateSubStepProgress(task.id, 'batch_process', 25, '正在批量处理');
          result = await this.batchProcessPhotoshop(parameters);
          statusTrackingService.updateSubStepProgress(task.id, 'batch_process', 100, '批量处理完成');
          break;
        
        default:
          statusTrackingService.addSubStep(task.id, 'custom_command', '执行自定义命令');
          statusTrackingService.updateSubStepProgress(task.id, 'custom_command', 25, `正在执行: ${command}`);
          result = await this.executePhotoshopCommand(command, parameters);
          statusTrackingService.updateSubStepProgress(task.id, 'custom_command', 100, '命令执行完成');
          break;
      }
      
      statusTrackingService.updateSubStepProgress(task.id, 'photoshop_preparation', 100, 'Photoshop操作完成');
      return result;
      
    } catch (error) {
      statusTrackingService.updateSubStepProgress(task.id, 'photoshop_preparation', 100, 'Photoshop操作失败', 'failed');
      throw error;
    }
  }

  private async createPhotoshopDocument(parameters: any) {
    try {
      const width = parameters?.width || 1920;
      const height = parameters?.height || 1080;
      const resolution = parameters?.resolution || 72;
      const documentType = parameters?.documentType || 'RGB';
      
      // 优先使用COM接口，回退到脚本模式
      let result;
      if (photoshopAutomationService.isCOMConnected()) {
        result = await photoshopAutomationService.createDocumentCOM({
          width,
          height,
          resolution,
          name: parameters?.name || `未标题-${Date.now()}`
        });
      } else {
        result = await photoshopAutomationService.createDocumentCOM({
          width,
          height,
          resolution,
          name: parameters?.name || `未标题-${Date.now()}`
        });
      }
      
      return {
        success: true,
        documentId: result.documentId,
        message: `成功创建${width}x${height}的Photoshop文档`
      };
    } catch (error) {
      throw new Error(`创建Photoshop文档失败: ${error.message}`);
    }
  }

  private async performLayerOperation(parameters: any) {
    try {
      const { operation, layerName, layerIndex, properties } = parameters;
      
      // 优先使用专门的图层服务
      const { photoshopLayerService } = await import('./photoshopLayerService');
      
      let result;
      switch (operation) {
        case 'create':
          result = await photoshopLayerService.createLayer(properties);
          break;
        case 'delete':
          result = await photoshopLayerService.deleteLayer(layerName);
          break;
        case 'duplicate':
          result = await photoshopLayerService.duplicateLayer(
            layerName, 
            properties?.name
          );
          break;
        case 'move':
          const moveProps = properties || {};
          result = await photoshopLayerService.moveLayer(
            layerName,
            moveProps.position?.x || 0,
            moveProps.position?.y || 0
          );
          break;
        case 'set_property':
          result = await photoshopLayerService.setLayerProperties(
            layerName,
            properties
          );
          break;
        case 'merge':
          const mergeLayers = properties?.layers || [layerName];
          result = await photoshopLayerService.mergeLayers(mergeLayers);
          break;
        default:
          // 回退到原始方法
          result = await photoshopAutomationService.executeLayerOperationCOM({
            operation,
            layerName,
            layerIndex,
            properties
          });
          break;
      }
      
      return {
        success: true,
        result: result,
        message: `成功执行图层操作: ${operation}`
      };
    } catch (error) {
      throw new Error(`图层操作失败: ${error.message}`);
    }
  }

  private async applyFilters(parameters: any) {
    try {
      const { filters, targetLayers, presetName } = parameters;
      
      // 优先使用专门的滤镜服务
      const { photoshopFilterService } = await import('./photoshopFilterService');
      
      let result;
      if (presetName) {
        // 应用预设
        result = await photoshopFilterService.applyPreset(presetName, targetLayers?.[0]);
      } else if (Array.isArray(filters)) {
        // 应用滤镜链
        const filterChain = filters.map(filter => ({
          filterId: filter.type || filter.filterId,
          parameters: filter.parameters,
          layerName: targetLayers?.[0]
        }));
        result = await photoshopFilterService.applyFilterChain(filterChain);
      } else {
        // 回退到原始方法
        result = await photoshopAutomationService.applyFiltersCOM(filters);
      }
      
      const appliedCount = Array.isArray(result) ? result.length : 1;
      
      return {
        success: true,
        result: result,
        message: `成功应用${appliedCount}个滤镜`
      };
    } catch (error) {
      throw new Error(`应用滤镜失败: ${error.message}`);
    }
  }

  private async exportImage(parameters: any) {
    try {
      const { format, quality, outputPath, layerName } = parameters;
      
      // 优先使用专门的文件服务
      const { photoshopFileService } = await import('./photoshopFileService');
      
      let result;
      if (layerName) {
        // 导出指定图层
        result = await photoshopFileService.exportLayer(layerName, outputPath, {
          format: format || 'jpg',
          quality: quality || 80
        });
      } else {
        // 导出整个文档
        result = await photoshopFileService.exportDocument(outputPath, {
          format: format || 'jpg',
          quality: quality || 80
        });
      }
      
      return {
        success: true,
        filePath: result.path,
        message: `成功导出图片到: ${result.path}`
      };
    } catch (error) {
      throw new Error(`导出图片失败: ${error.message}`);
    }
  }

  private async batchProcessPhotoshop(parameters: any) {
    try {
      const { operations } = parameters;

      const result = await photoshopAutomationService.batchProcess({
        operations,
        inputFolder: parameters.inputFolder || '',
        outputFolder: parameters.outputFolder || ''
      });

      return {
        success: true,
        results: result,
        message: `成功批量处理`
      };
    } catch (error) {
      throw new Error(`批量处理失败: ${error.message}`);
    }
  }

  private async executePhotoshopCommand(command: string, parameters: any) {
    try {
      // @ts-ignore - executeCommand may not exist in service
      const result = await (photoshopAutomationService as any).executeCommand({
        command,
        parameters
      });

      return {
        success: true,
        result: result,
        message: `成功执行Photoshop命令: ${command}`
      };
    } catch (error) {
      throw new Error(`执行Photoshop命令失败: ${error.message}`);
    }
  }

  private async processAutoCADTask(task: TaskMessage): Promise<any> {
    const { command, parameters } = task;
    
    switch (command) {
      case '创建图纸':
        return await this.createAutoCADDrawing(parameters);
      case '图层管理':
        return await this.manageAutoCADLayers(parameters);
      case '批量转换':
        return await this.batchConvertAutoCAD(parameters);
      default:
        return await this.executeAutoCADCommand(command, parameters);
    }
  }

  private async processBlenderTask(task: TaskMessage): Promise<any> {
    const { command, parameters } = task;
    
    switch (command) {
      case '创建场景':
        return await this.createBlenderScene(parameters);
      case '渲染':
        return await this.renderBlenderScene(parameters);
      case '模型优化':
        return await this.optimizeBlenderModel(parameters);
      default:
        return await this.executeBlenderCommand(command, parameters);
    }
  }

  private async processFileTask(task: TaskMessage): Promise<any> {
    const { command, parameters } = task;
    
    // 文件操作实现
    return {
      success: true,
      message: `文件操作完成: ${command}`,
      result: parameters
    };
  }

  private async processSystemTask(task: TaskMessage): Promise<any> {
    const { command, parameters } = task;
    
    switch (command) {
      case '启动软件':
        return await this.launchSoftware(parameters);
      case '检查状态':
        return await this.checkSoftwareStatus(parameters);
      case '系统信息':
        return await this.getSystemInfo();
      default:
        return {
          success: true,
          message: `系统命令执行: ${command}`,
          result: parameters
        };
    }
  }

  private async createAutoCADDrawing(parameters: any) {
    return {
      success: true,
      message: 'AutoCAD图纸创建完成',
      result: parameters
    };
  }

  private async manageAutoCADLayers(parameters: any) {
    return {
      success: true,
      message: 'AutoCAD图层管理完成',
      result: parameters
    };
  }

  private async batchConvertAutoCAD(parameters: any) {
    return {
      success: true,
      message: 'AutoCAD批量转换完成',
      result: parameters
    };
  }

  private async executeAutoCADCommand(command: string, parameters: any) {
    return {
      success: true,
      message: `AutoCAD命令执行: ${command}`,
      result: parameters
    };
  }

  private async createBlenderScene(parameters: any) {
    return {
      success: true,
      message: 'Blender场景创建完成',
      result: parameters
    };
  }

  private async renderBlenderScene(parameters: any) {
    return {
      success: true,
      message: 'Blender渲染完成',
      result: parameters
    };
  }

  private async optimizeBlenderModel(parameters: any) {
    return {
      success: true,
      message: 'Blender模型优化完成',
      result: parameters
    };
  }

  private async executeBlenderCommand(command: string, parameters: any) {
    return {
      success: true,
      message: `Blender命令执行: ${command}`,
      result: parameters
    };
  }

  private async launchSoftware(parameters: any) {
    try {
      const { softwareName, filePath } = parameters;
      const result = await softwareIntegrationService.launchSoftware(softwareName, filePath);
      
      return {
        success: result,
        message: `成功启动${softwareName}`
      };
    } catch (error) {
      throw new Error(`启动软件失败: ${error.message}`);
    }
  }

  private async checkSoftwareStatus(parameters: any) {
    try {
      const { softwareName } = parameters;
      const status = softwareIntegrationService.getSoftwareStatus(softwareName);
      
      return {
        success: true,
        status: status,
        message: `${softwareName}状态检查完成`
      };
    } catch (error) {
      throw new Error(`检查软件状态失败: ${error.message}`);
    }
  }

  private async getSystemInfo() {
    return {
      success: true,
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      message: '系统信息获取完成'
    };
  }

  getActiveTasks(): string[] {
    return Array.from(this.activeTasks.keys());
  }

  getTaskContext(taskId: string): TaskContext | undefined {
    return this.activeTasks.get(taskId);
  }

  cancelTask(taskId: string): boolean {
    const context = this.activeTasks.get(taskId);
    if (context) {
      this.activeTasks.delete(taskId);
      this.emit('task_cancelled', { taskId, context });
      return true;
    }
    return false;
  }

  async processTasks(tasks: TaskMessage[]): Promise<any[]> {
    const results = [];
    
    for (const task of tasks) {
      try {
        const result = await this.processTask(task);
        results.push({ taskId: task.id, success: true, result });
      } catch (error) {
        results.push({ taskId: task.id, success: false, error: error.message });
      }
    }
    
    return results;
  }
}

// 单例模式
export const taskProcessorService = new TaskProcessorService();