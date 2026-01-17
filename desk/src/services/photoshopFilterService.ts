import { EventEmitter } from 'events';
import { photoshopCOMService } from './photoshopComService';

export interface FilterParameters {
  [key: string]: any;
}

export interface FilterPreset {
  name: string;
  category: string;
  parameters: FilterParameters;
}

export interface FilterDefinition {
  id: string;
  name: string;
  category: 'blur' | 'sharpen' | 'distort' | 'noise' | 'pixelate' | 'render' | 'artistic' | 'stylize' | 'adjustment';
  parameters: {
    name: string;
    type: 'number' | 'boolean' | 'string' | 'choice';
    min?: number;
    max?: number;
    default: any;
    options?: string[];
    description?: string;
  }[];
}

export class PhotoshopFilterService extends EventEmitter {
  private filterPresets: Map<string, FilterPreset> = new Map();
  private filterDefinitions: Map<string, FilterDefinition> = new Map();

  constructor() {
    super();
    this.initializeFilterDefinitions();
    this.initializeDefaultPresets();
  }

  /**
   * 初始化滤镜定义
   */
  private initializeFilterDefinitions(): void {
    const definitions: FilterDefinition[] = [
      // 模糊滤镜
      {
        id: 'gaussianBlur',
        name: '高斯模糊',
        category: 'blur',
        parameters: [
          {
            name: 'radius',
            type: 'number',
            min: 0.1,
            max: 1000,
            default: 5,
            description: '模糊半径'
          }
        ]
      },
      {
        id: 'motionBlur',
        name: '动感模糊',
        category: 'blur',
        parameters: [
          {
            name: 'angle',
            type: 'number',
            min: -360,
            max: 360,
            default: 0,
            description: '模糊角度'
          },
          {
            name: 'distance',
            type: 'number',
            min: 0,
            max: 999,
            default: 10,
            description: '模糊距离'
          }
        ]
      },
      {
        id: 'radialBlur',
        name: '径向模糊',
        category: 'blur',
        parameters: [
          {
            name: 'amount',
            type: 'number',
            min: 0,
            max: 100,
            default: 10,
            description: '模糊量'
          },
          {
            name: 'method',
            type: 'choice',
            default: 'spin',
            options: ['spin', 'zoom'],
            description: '模糊方法'
          },
          {
            name: 'quality',
            type: 'choice',
            default: 'good',
            options: ['draft', 'good', 'best'],
            description: '模糊质量'
          }
        ]
      },

      // 锐化滤镜
      {
        id: 'sharpen',
        name: '锐化',
        category: 'sharpen',
        parameters: [
          {
            name: 'amount',
            type: 'number',
            min: 0,
            max: 500,
            default: 100,
            description: '锐化量'
          },
          {
            name: 'radius',
            type: 'number',
            min: 0.1,
            max: 100,
            default: 1,
            description: '锐化半径'
          },
          {
            name: 'threshold',
            type: 'number',
            min: 0,
            max: 255,
            default: 3,
            description: '锐化阈值'
          }
        ]
      },
      {
        id: 'unsharpMask',
        name: 'USM锐化',
        category: 'sharpen',
        parameters: [
          {
            name: 'amount',
            type: 'number',
            min: 0,
            max: 500,
            default: 100,
            description: '锐化量'
          },
          {
            name: 'radius',
            type: 'number',
            min: 0.1,
            max: 100,
            default: 1,
            description: '锐化半径'
          },
          {
            name: 'threshold',
            type: 'number',
            min: 0,
            max: 255,
            default: 3,
            description: '锐化阈值'
          }
        ]
      },

      // 扭曲滤镜
      {
        id: 'wave',
        name: '波浪',
        category: 'distort',
        parameters: [
          {
            name: 'amplitude',
            type: 'number',
            min: 0,
            max: 999,
            default: 10,
            description: '振幅'
          },
          {
            name: 'wavelength',
            type: 'number',
            min: 1,
            max: 999,
            default: 100,
            description: '波长'
          }
        ]
      },
      {
        id: 'ripple',
        name: '波纹',
        category: 'distort',
        parameters: [
          {
            name: 'amount',
            type: 'number',
            min: -999,
            max: 999,
            default: 100,
            description: '波纹量'
          },
          {
            name: 'size',
            type: 'choice',
            default: 'medium',
            options: ['small', 'medium', 'large'],
            description: '波纹大小'
          }
        ]
      },

      // 噪点滤镜
      {
        id: 'addNoise',
        name: '添加杂色',
        category: 'noise',
        parameters: [
          {
            name: 'amount',
            type: 'number',
            min: 0,
            max: 999,
            default: 10,
            description: '杂色量'
          },
          {
            name: 'distribution',
            type: 'choice',
            default: 'gaussian',
            options: ['gaussian', 'uniform'],
            description: '分布类型'
          }
        ]
      },

      // 像素化滤镜
      {
        id: 'pixelate',
        name: '像素化',
        category: 'pixelate',
        parameters: [
          {
            name: 'cellSize',
            type: 'number',
            min: 2,
            max: 50,
            default: 10,
            description: '单元格大小'
          }
        ]
      },

      // 艺术效果
      {
        id: 'oilPaint',
        name: '油画',
        category: 'artistic',
        parameters: [
          {
            name: 'brushSize',
            type: 'number',
            min: 1,
            max: 50,
            default: 7,
            description: '画笔大小'
          },
          {
            name: 'stylization',
            type: 'number',
            min: 0,
            max: 40,
            default: 30,
            description: '风格化程度'
          }
        ]
      },
      {
        id: 'watercolor',
        name: '水彩',
        category: 'artistic',
        parameters: [
          {
            name: 'brushDetail',
            type: 'number',
            min: 1,
            max: 14,
            default: 9,
            description: '画笔细节'
          },
          {
            name: 'shadowIntensity',
            type: 'number',
            min: 0,
            max: 100,
            default: 30,
            description: '阴影强度'
          }
        ]
      },

      // 调整图层
      {
        id: 'levels',
        name: '色阶',
        category: 'adjustment',
        parameters: [
          {
            name: 'inputRange',
            type: 'number',
            min: 0,
            max: 255,
            default: 255,
            description: '输入色阶'
          },
          {
            name: 'outputRange',
            type: 'number',
            min: 0,
            max: 255,
            default: 255,
            description: '输出色阶'
          },
          {
            name: 'gamma',
            type: 'number',
            min: 0.1,
            max: 9.99,
            default: 1,
            description: '伽马值'
          }
        ]
      },
      {
        id: 'curves',
        name: '曲线',
        category: 'adjustment',
        parameters: [
          {
            name: 'curvePoints',
            type: 'string',
            default: '0,0,255,255',
            description: '曲线点 (格式: x1,y1,x2,y2,...)'
          }
        ]
      },
      {
        id: 'hueSaturation',
        name: '色相/饱和度',
        category: 'adjustment',
        parameters: [
          {
            name: 'hue',
            type: 'number',
            min: -180,
            max: 180,
            default: 0,
            description: '色相'
          },
          {
            name: 'saturation',
            type: 'number',
            min: -100,
            max: 100,
            default: 0,
            description: '饱和度'
          },
          {
            name: 'lightness',
            type: 'number',
            min: -100,
            max: 100,
            default: 0,
            description: '明度'
          }
        ]
      }
    ];

    definitions.forEach(def => {
      this.filterDefinitions.set(def.id, def);
    });
  }

  /**
   * 初始化默认预设
   */
  private initializeDefaultPresets(): void {
    const presets: FilterPreset[] = [
      {
        name: '照片增强',
        category: 'photography',
        parameters: {
          filterChain: [
            { id: 'sharpen', parameters: { amount: 80, radius: 1.5, threshold: 2 } },
            { id: 'levels', parameters: { inputRange: 240, outputRange: 255, gamma: 1.1 } }
          ]
        }
      },
      {
        name: '人像美化',
        category: 'portrait',
        parameters: {
          filterChain: [
            { id: 'gaussianBlur', parameters: { radius: 2.5 } },
            { id: 'unsharpMask', parameters: { amount: 120, radius: 2, threshold: 3 } }
          ]
        }
      },
      {
        name: '风景增强',
        category: 'landscape',
        parameters: {
          filterChain: [
            { id: 'hueSaturation', parameters: { saturation: 15, lightness: 5 } },
            { id: 'levels', parameters: { inputRange: 235, gamma: 1.05 } }
          ]
        }
      },
      {
        name: '复古效果',
        category: 'vintage',
        parameters: {
          filterChain: [
            { id: 'hueSaturation', parameters: { saturation: -20, lightness: -5 } },
            { id: 'addNoise', parameters: { amount: 3, distribution: 'gaussian' } }
          ]
        }
      },
      {
        name: '艺术风格',
        category: 'artistic',
        parameters: {
          filterChain: [
            { id: 'oilPaint', parameters: { brushSize: 5, stylization: 25 } }
          ]
        }
      }
    ];

    presets.forEach(preset => {
      this.filterPresets.set(preset.name, preset);
    });
  }

  /**
   * 应用单个滤镜
   */
  public async applyFilter(
    filterId: string, 
    parameters: FilterParameters = {},
    layerName?: string
  ): Promise<any> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const filterDef = this.filterDefinitions.get(filterId);
      if (!filterDef) {
        throw new Error(`未知滤镜: ${filterId}`);
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

      // 选择目标图层
      if (layerName) {
        await this.selectLayer(layerName);
      }

      // 验证参数
      this.validateParameters(filterDef, parameters);

      // 应用滤镜（模拟实现）
      console.log(`应用滤镜: ${filterDef.name}`, parameters);
      
      const result = {
        filterId,
        filterName: filterDef.name,
        parameters,
        layerName: layerName || '当前图层',
        success: true,
        timestamp: Date.now()
      };

      this.emit('filter_applied', result);
      return result;
    } catch (error) {
      const errorResult = {
        filterId,
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
      
      this.emit('filter_error', errorResult);
      throw error;
    }
  }

  /**
   * 应用滤镜链
   */
  public async applyFilterChain(
    filterChain: Array<{
      filterId: string;
      parameters?: FilterParameters;
      layerName?: string;
    }>
  ): Promise<any[]> {
    const results = [];

    for (const filterItem of filterChain) {
      try {
        const result = await this.applyFilter(
          filterItem.filterId,
          filterItem.parameters,
          filterItem.layerName
        );
        results.push(result);
      } catch (error) {
        results.push({
          filterId: filterItem.filterId,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
        
        // 可以选择继续处理或停止
        // break; // 取消注释以在错误时停止
      }
    }

    return results;
  }

  /**
   * 应用预设
   */
  public async applyPreset(
    presetName: string,
    layerName?: string
  ): Promise<any> {
    const preset = this.filterPresets.get(presetName);
    if (!preset) {
      throw new Error(`未知预设: ${presetName}`);
    }

    const filterChain = preset.parameters.filterChain || [];
    return await this.applyFilterChain(
      filterChain.map(filter => ({
        ...filter,
        layerName
      }))
    );
  }

  /**
   * 批量应用滤镜到多个图层
   */
  public async batchApplyFilters(
    filters: Array<{
      layerNames: string[];
      filterId: string;
      parameters?: FilterParameters;
    }>
  ): Promise<any[]> {
    const results = [];

    for (const batchFilter of filters) {
      for (const layerName of batchFilter.layerNames) {
        try {
          const result = await this.applyFilter(
            batchFilter.filterId,
            batchFilter.parameters,
            layerName
          );
          results.push({
            ...result,
            batchId: filters.indexOf(batchFilter)
          });
        } catch (error) {
          results.push({
            filterId: batchFilter.filterId,
            layerName,
            success: false,
            error: error.message,
            timestamp: Date.now(),
            batchId: filters.indexOf(batchFilter)
          });
        }
      }
    }

    return results;
  }

  /**
   * 获取所有可用滤镜
   */
  public getAvailableFilters(category?: string): FilterDefinition[] {
    const filters = Array.from(this.filterDefinitions.values());
    
    if (category) {
      return filters.filter(filter => filter.category === category);
    }
    
    return filters;
  }

  /**
   * 获取滤镜分类
   */
  public getFilterCategories(): string[] {
    const categories = new Set<string>();
    this.filterDefinitions.forEach(filter => {
      categories.add(filter.category);
    });
    return Array.from(categories);
  }

  /**
   * 获取所有预设
   */
  public getPresets(category?: string): FilterPreset[] {
    const presets = Array.from(this.filterPresets.values());
    
    if (category) {
      return presets.filter(preset => preset.category === category);
    }
    
    return presets;
  }

  /**
   * 添加自定义预设
   */
  public addPreset(preset: FilterPreset): void {
    this.filterPresets.set(preset.name, preset);
    this.emit('preset_added', preset);
  }

  /**
   * 删除预设
   */
  public removePreset(presetName: string): boolean {
    const deleted = this.filterPresets.delete(presetName);
    if (deleted) {
      this.emit('preset_removed', { presetName });
    }
    return deleted;
  }

  /**
   * 验证滤镜参数
   */
  private validateParameters(
    filterDef: FilterDefinition, 
    parameters: FilterParameters
  ): void {
    for (const paramDef of filterDef.parameters) {
      const value = parameters[paramDef.name];
      
      if (value === undefined || value === null) {
        if (paramDef.default !== undefined) {
          parameters[paramDef.name] = paramDef.default;
        }
        continue;
      }

      switch (paramDef.type) {
        case 'number':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            throw new Error(`${paramDef.name} 必须是数字`);
          }
          if (paramDef.min !== undefined && numValue < paramDef.min) {
            throw new Error(`${paramDef.name} 不能小于 ${paramDef.min}`);
          }
          if (paramDef.max !== undefined && numValue > paramDef.max) {
            throw new Error(`${paramDef.name} 不能大于 ${paramDef.max}`);
          }
          break;
          
        case 'choice':
          if (paramDef.options && !paramDef.options.includes(value)) {
            throw new Error(`${paramDef.name} 必须是以下选项之一: ${paramDef.options.join(', ')}`);
          }
          break;
          
        case 'boolean':
          if (typeof value !== 'boolean') {
            parameters[paramDef.name] = Boolean(value);
          }
          break;
      }
    }
  }

  /**
   * 选择指定图层
   */
  private async selectLayer(layerName: string): Promise<void> {
    const activeDoc = photoshopCOMService.getActiveDocument();
    if (!activeDoc) {
      throw new Error('没有活动文档');
    }

    const layers = activeDoc.Layers;
    for (let i = 0; i < layers.Count; i++) {
      const layer = layers.Item(i + 1);
      if (layer.Name === layerName) {
        activeDoc.ActiveLayer = layer;
        return;
      }
    }
    
    throw new Error(`找不到图层: ${layerName}`);
  }

  /**
   * 获取滤镜信息
   */
  public getFilterInfo(filterId: string): FilterDefinition | null {
    return this.filterDefinitions.get(filterId) || null;
  }

  /**
   * 获取预设信息
   */
  public getPresetInfo(presetName: string): FilterPreset | null {
    return this.filterPresets.get(presetName) || null;
  }
}

// 单例模式
export const photoshopFilterService = new PhotoshopFilterService();