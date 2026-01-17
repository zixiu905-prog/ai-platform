import { EventEmitter } from 'events';
import { photoshopCOMService } from './photoshopComService';

export interface LayerProperties {
  name?: string;
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface LayerOperation {
  type: 'create' | 'delete' | 'duplicate' | 'move' | 'resize' | 'set_property' | 'blend' | 'group' | 'ungroup';
  layerName?: string;
  layerIndex?: number;
  targetLayers?: string[];
  properties?: LayerProperties;
  parameters?: any;
}

export interface LayerInfo {
  index: number;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  kind: string; // 图层类型
  locked: boolean;
  hasMask: boolean;
}

export class PhotoshopLayerService extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * 获取当前文档的所有图层信息
   */
  public async getAllLayers(): Promise<LayerInfo[]> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

      const layers = activeDoc.Layers;
      const layerInfos: LayerInfo[] = [];

      for (let i = 0; i < layers.Count; i++) {
        const layer = layers.Item(i + 1);
        
        layerInfos.push({
          index: i,
          name: layer.Name,
          visible: layer.Visible,
          opacity: layer.Opacity,
          blendMode: this.getBlendModeName(layer.BlendMode),
          position: {
            x: layer.Bounds[0],
            y: layer.Bounds[1]
          },
          size: {
            width: layer.Bounds[2] - layer.Bounds[0],
            height: layer.Bounds[3] - layer.Bounds[1]
          },
          kind: this.getLayerKindName(layer.Kind),
          locked: false, // 需要通过COM接口获取
          hasMask: false // 需要通过COM接口获取
        });
      }

      return layerInfos;
    } catch (error) {
      throw new Error(`获取图层信息失败: ${error.message}`);
    }
  }

  /**
   * 创建新图层
   */
  public async createLayer(properties: LayerProperties = {}): Promise<LayerInfo> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

      // 创建新图层
      const newLayer = activeDoc.Layers.Add();
      
      // 设置属性
      if (properties.name) {
        newLayer.Name = properties.name;
      }
      
      if (properties.visible !== undefined) {
        newLayer.Visible = properties.visible;
      }
      
      if (properties.opacity !== undefined) {
        newLayer.Opacity = properties.opacity;
      }
      
      if (properties.blendMode) {
        newLayer.BlendMode = this.getBlendModeValue(properties.blendMode);
      }

      const layerInfo: LayerInfo = {
        index: 0, // 需要重新获取
        name: newLayer.Name,
        visible: newLayer.Visible,
        opacity: newLayer.Opacity,
        blendMode: this.getBlendModeName(newLayer.BlendMode),
        position: {
          x: newLayer.Bounds[0],
          y: newLayer.Bounds[1]
        },
        size: {
          width: newLayer.Bounds[2] - newLayer.Bounds[0],
          height: newLayer.Bounds[3] - newLayer.Bounds[1]
        },
        kind: this.getLayerKindName(newLayer.Kind),
        locked: false,
        hasMask: false
      };

      this.emit('layer_created', { layer: layerInfo });
      return layerInfo;
    } catch (error) {
      throw new Error(`创建图层失败: ${error.message}`);
    }
  }

  /**
   * 删除图层
   */
  public async deleteLayer(layerName: string): Promise<boolean> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

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

      targetLayer.Delete();
      
      this.emit('layer_deleted', { layerName });
      return true;
    } catch (error) {
      throw new Error(`删除图层失败: ${error.message}`);
    }
  }

  /**
   * 复制图层
   */
  public async duplicateLayer(layerName: string, newName?: string): Promise<LayerInfo> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

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

      const newLayer = targetLayer.Duplicate();
      
      if (newName) {
        newLayer.Name = newName;
      }

      const layerInfo: LayerInfo = {
        index: 0,
        name: newLayer.Name,
        visible: newLayer.Visible,
        opacity: newLayer.Opacity,
        blendMode: this.getBlendModeName(newLayer.BlendMode),
        position: {
          x: newLayer.Bounds[0],
          y: newLayer.Bounds[1]
        },
        size: {
          width: newLayer.Bounds[2] - newLayer.Bounds[0],
          height: newLayer.Bounds[3] - newLayer.Bounds[1]
        },
        kind: this.getLayerKindName(newLayer.Kind),
        locked: false,
        hasMask: false
      };

      this.emit('layer_duplicated', { 
        originalLayer: layerName, 
        newLayer: layerInfo 
      });
      
      return layerInfo;
    } catch (error) {
      throw new Error(`复制图层失败: ${error.message}`);
    }
  }

  /**
   * 移动图层
   */
  public async moveLayer(layerName: string, x: number, y: number): Promise<boolean> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

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

      targetLayer.Move(x, y);
      
      this.emit('layer_moved', { 
        layerName, 
        position: { x, y } 
      });
      
      return true;
    } catch (error) {
      throw new Error(`移动图层失败: ${error.message}`);
    }
  }

  /**
   * 设置图层属性
   */
  public async setLayerProperties(
    layerName: string, 
    properties: LayerProperties
  ): Promise<LayerInfo> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

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

      // 更新属性
      if (properties.name) {
        targetLayer.Name = properties.name;
      }
      
      if (properties.visible !== undefined) {
        targetLayer.Visible = properties.visible;
      }
      
      if (properties.opacity !== undefined) {
        targetLayer.Opacity = Math.max(0, Math.min(100, properties.opacity));
      }
      
      if (properties.blendMode) {
        targetLayer.BlendMode = this.getBlendModeValue(properties.blendMode);
      }

      const layerInfo: LayerInfo = {
        index: 0,
        name: targetLayer.Name,
        visible: targetLayer.Visible,
        opacity: targetLayer.Opacity,
        blendMode: this.getBlendModeName(targetLayer.BlendMode),
        position: {
          x: targetLayer.Bounds[0],
          y: targetLayer.Bounds[1]
        },
        size: {
          width: targetLayer.Bounds[2] - targetLayer.Bounds[0],
          height: targetLayer.Bounds[3] - targetLayer.Bounds[1]
        },
        kind: this.getLayerKindName(targetLayer.Kind),
        locked: false,
        hasMask: false
      };

      this.emit('layer_properties_updated', { 
        layerName, 
        properties,
        layerInfo 
      });
      
      return layerInfo;
    } catch (error) {
      throw new Error(`设置图层属性失败: ${error.message}`);
    }
  }

  /**
   * 调整图层顺序
   */
  public async reorderLayers(layerOrder: string[]): Promise<boolean> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

      // 实现图层重排序逻辑
      // 这里需要根据具体的COM接口实现
      console.log('调整图层顺序:', layerOrder);
      
      this.emit('layers_reordered', { layerOrder });
      return true;
    } catch (error) {
      throw new Error(`调整图层顺序失败: ${error.message}`);
    }
  }

  /**
   * 合并图层
   */
  public async mergeLayers(layerNames: string[]): Promise<LayerInfo> {
    try {
      if (!photoshopCOMService.isPhotoshopConnected()) {
        throw new Error('Photoshop未连接');
      }

      const activeDoc = photoshopCOMService.getActiveDocument();
      if (!activeDoc) {
        throw new Error('没有活动文档');
      }

      const layers = activeDoc.Layers;
      const targetLayers = [];

      for (const layerName of layerNames) {
        for (let i = 0; i < layers.Count; i++) {
          const layer = layers.Item(i + 1);
          if (layer.Name === layerName) {
            targetLayers.push(layer);
            break;
          }
        }
      }

      if (targetLayers.length < 2) {
        throw new Error('至少需要选择两个图层进行合并');
      }

      // 合并图层
      // 这里需要根据具体的COM接口实现
      const mergedLayer = targetLayers[0]; // 模拟
      
      const layerInfo: LayerInfo = {
        index: 0,
        name: mergedLayer.Name,
        visible: mergedLayer.Visible,
        opacity: mergedLayer.Opacity,
        blendMode: this.getBlendModeName(mergedLayer.BlendMode),
        position: {
          x: mergedLayer.Bounds[0],
          y: mergedLayer.Bounds[1]
        },
        size: {
          width: mergedLayer.Bounds[2] - mergedLayer.Bounds[0],
          height: mergedLayer.Bounds[3] - mergedLayer.Bounds[1]
        },
        kind: this.getLayerKindName(mergedLayer.Kind),
        locked: false,
        hasMask: false
      };

      this.emit('layers_merged', { 
        mergedLayers: layerNames, 
        resultLayer: layerInfo 
      });
      
      return layerInfo;
    } catch (error) {
      throw new Error(`合并图层失败: ${error.message}`);
    }
  }

  /**
   * 批量执行图层操作
   */
  public async batchLayerOperations(operations: LayerOperation[]): Promise<any[]> {
    const results = [];

    for (const operation of operations) {
      try {
        let result;
        
        switch (operation.type) {
          case 'create':
            result = await this.createLayer(operation.properties);
            break;
          case 'delete':
            result = await this.deleteLayer(operation.layerName!);
            break;
          case 'duplicate':
            result = await this.duplicateLayer(
              operation.layerName!, 
              operation.properties?.name
            );
            break;
          case 'move':
            const moveProps = operation.properties;
            result = await this.moveLayer(
              operation.layerName!,
              moveProps?.position?.x || 0,
              moveProps?.position?.y || 0
            );
            break;
          case 'set_property':
            result = await this.setLayerProperties(
              operation.layerName!,
              operation.properties!
            );
            break;
          default:
            throw new Error(`不支持的图层操作: ${operation.type}`);
        }

        results.push({
          operation,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          operation,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // 辅助方法

  private getBlendModeName(blendMode: any): string {
    const modeMap: Record<number, string> = {
      1: '正常',
      2: '正片叠底',
      3: '滤色',
      4: '叠加',
      5: '柔光',
      6: '强光',
      7: '颜色减淡',
      8: '颜色加深',
      9: '变暗',
      10: '变亮',
      11: '差值',
      12: '排除',
      13: '色相',
      14: '饱和度',
      15: '颜色',
      16: '亮度'
    };
    return modeMap[blendMode] || '正常';
  }

  private getBlendModeValue(blendModeName: string): any {
    const nameMap: Record<string, number> = {
      '正常': 1,
      '正片叠底': 2,
      '滤色': 3,
      '叠加': 4,
      '柔光': 5,
      '强光': 6,
      '颜色减淡': 7,
      '颜色加深': 8,
      '变暗': 9,
      '变亮': 10,
      '差值': 11,
      '排除': 12,
      '色相': 13,
      '饱和度': 14,
      '颜色': 15,
      '亮度': 16
    };
    return nameMap[blendModeName] || 1;
  }

  private getLayerKindName(kind: any): string {
    const kindMap: Record<number, string> = {
      1: '像素图层',
      2: '调整图层',
      3: '文字图层',
      4: '形状图层',
      5: '智能对象',
      7: '图层组',
      8: '3D图层'
    };
    return kindMap[kind] || '像素图层';
  }
}

// 单例模式
export const photoshopLayerService = new PhotoshopLayerService();