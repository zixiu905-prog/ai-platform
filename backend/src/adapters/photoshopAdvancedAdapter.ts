import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PhotoshopAdvancedConfig {
  url: string;
  apiKey?: string;
}

export interface LayerInfo {
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  locked: boolean;
}

export interface ChannelInfo {
  name: string;
  visible: boolean;
  histogram: number[];
}

export class PhotoshopAdvancedAdapter {
  private config: PhotoshopAdvancedConfig;

  constructor(config: PhotoshopAdvancedConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Photoshop高级适配器初始化中...');
    } catch (error) {
      logger.error('Photoshop高级适配器初始化失败:', error);
      throw error;
    }
  }

  async executeCommand(command: string, params: any = {}): Promise<any> {
    try {
      logger.info(`执行Photoshop高级命令: ${command}`);
      
      const response = await fetch(`${this.config.url}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, ...params })
      });
      
      if (!response.ok) {
        throw new Error(`Photoshop高级API请求失败: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Photoshop高级命令执行失败:', error);
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
      logger.error('Photoshop高级连接失败:', error);
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

  async getLayersInfo(): Promise<LayerInfo[]> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var layers = [];
      for (var i = 0; i < doc.artLayers.length; i++) {
        var layer = doc.artLayers[i];
        layers.push({
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          blendMode: layer.blendMode.toString(),
          locked: layer.allLocked || layer.pixelsLocked || layer.positionLocked || layer.transparentPixelsLocked
        });
      }
      
      JSON.stringify(layers);
    `;

    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync(`osascript -e 'tell application "Adobe Photoshop 2024" to do javascript "${script.replace(/"/g, '\\"')}'"`);
        return JSON.parse(stdout.trim());
      } else {
        return await this.sendCommand('executeScript', { script });
      }
    } catch (error) {
      logger.error('获取图层信息失败:', error);
      throw new Error(`获取图层信息失败: ${error}`);
    }
  }

  async getChannelInfo(): Promise<ChannelInfo[]> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var channels = [];
      for (var i = 0; i < doc.channels.length; i++) {
        var channel = doc.channels[i];
        channels.push({
          name: channel.name,
          visible: channel.visible,
          histogram: channel.histogram
        });
      }
      
      JSON.stringify(channels);
    `;

    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync(`osascript -e 'tell application "Adobe Photoshop 2024" to do javascript "${script.replace(/"/g, '\\"')}'"`);
        return JSON.parse(stdout.trim());
      } else {
        return await this.sendCommand('executeScript', { script });
      }
    } catch (error) {
      logger.error('获取通道信息失败:', error);
      throw new Error(`获取通道信息失败: ${error}`);
    }
  }

  async applyAdvancedAdjustment(type: string, parameters: any): Promise<any> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var adjustmentLayer = doc.artLayers.add();
      adjustmentLayer.kind = LayerKind.${type.toUpperCase()};
      
      // 根据类型设置参数
      switch ('${type}') {
        case 'BRIGHTNESSCONTRAST':
          var bc = adjustmentLayer.brightnessContrast;
          bc.brightness = ${parameters.brightness || 0};
          bc.contrast = ${parameters.contrast || 0};
          break;
        case 'LEVELS':
          var levels = adjustmentLayer.levels;
          levels.inputRange = [${parameters.inputMin || 0}, ${parameters.inputMax || 255}];
          levels.outputRange = [${parameters.outputMin || 0}, ${parameters.outputMax || 255}];
          break;
        case 'CURVES':
          // 曲线调整逻辑
          break;
      }
      
      JSON.stringify({
        success: true,
        type: '${type}',
        parameters: ${JSON.stringify(parameters)},
        layerIndex: adjustmentLayer.itemIndex
      });
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('应用高级调整失败:', error);
      throw new Error(`应用高级调整失败: ${error}`);
    }
  }

  async performSmartSelection(operation: string, parameters: any = {}): Promise<any> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var selection;
      
      switch ('${operation}') {
        case 'colorRange':
          var colorRange = new ColorRange();
          colorRange.fuzziness = ${parameters.fuzziness || 40};
          selection = doc.selection.selectColorRange(colorRange);
          break;
        case 'subject':
          // 选择主体逻辑（需要较新版本的Photoshop）
          try {
            selection = doc.selection.selectSubject();
          } catch (e) {
            throw new Error("当前版本不支持智能主体选择");
          }
          break;
        case 'sky':
          // 选择天空逻辑
          try {
            selection = doc.selection.selectSky();
          } catch (e) {
            throw new Error("当前版本不支持智能天空选择");
          }
          break;
        default:
          throw new Error("不支持的选择操作");
      }
      
      JSON.stringify({
        success: true,
        operation: '${operation}',
        parameters: ${JSON.stringify(parameters)},
        hasSelection: doc.selection.bounds
      });
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('智能选择失败:', error);
      throw new Error(`智能选择失败: ${error}`);
    }
  }

  async createSmartObject(parameters: any = {}): Promise<any> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var selection = doc.selection;
      if (!selection || selection.bounds[0] === 0 && selection.bounds[1] === 0) {
        throw new Error("没有选中的区域");
      }
      
      try {
        var smartObject = selection.createSmartObject();
        
        JSON.stringify({
          success: true,
          smartObjectName: smartObject.name,
          layerIndex: smartObject.itemIndex
        });
      } catch (error) {
        JSON.stringify({
          success: false,
          error: error.toString()
        });
      }
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('创建智能对象失败:', error);
      throw new Error(`创建智能对象失败: ${error}`);
    }
  }

  async applyFilterMask(): Promise<any> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var activeLayer = doc.activeLayer;
      
      try {
        var mask = activeLayer.addFilterMask();
        
        JSON.stringify({
          success: true,
          hasMask: activeLayer.hasFilterMask,
          maskIndex: mask.itemIndex
        });
      } catch (error) {
        JSON.stringify({
          success: false,
          error: error.toString()
        });
      }
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('应用滤镜蒙版失败:', error);
      throw new Error(`应用滤镜蒙版失败: ${error}`);
    }
  }
}

export default PhotoshopAdvancedAdapter;