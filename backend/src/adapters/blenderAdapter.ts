import { logger } from '../utils/logger';

export interface BlenderConfig {
  url: string;
  apiKey?: string;
}

export class BlenderAdapter {
  private config: BlenderConfig;

  constructor(config: BlenderConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Blender适配器初始化中...');
      // 基本初始化逻辑
    } catch (error) {
      logger.error('Blender适配器初始化失败:', error);
      throw error;
    }
  }

  async executeCommand(command: string, params: any = {}): Promise<any> {
    try {
      logger.info(`执行Blender命令: ${command}`);
      
      const response = await fetch(`${this.config.url}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, ...params })
      });
      
      if (!response.ok) {
        throw new Error(`Blender API请求失败: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Blender命令执行失败:', error);
      throw error;
    }
  }

  async getSceneInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.config.url}/api/scene`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`获取场景信息失败: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.result;
    } catch (error) {
      logger.error('获取场景信息失败:', error);
      throw new Error(`获取场景信息失败: ${error}`);
    }
  }

  async createObject(params: any): Promise<any> {
    try {
      const response = await fetch(`${this.config.url}/api/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`创建对象失败: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('创建对象失败:', error);
      throw error;
    }
  }

  async exportModel(format: string = 'obj'): Promise<any> {
    try {
      const response = await fetch(`${this.config.url}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });
      
      if (!response.ok) {
        throw new Error(`导出模型失败: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('导出模型失败:', error);
      throw error;
    }
  }
}

export default BlenderAdapter;