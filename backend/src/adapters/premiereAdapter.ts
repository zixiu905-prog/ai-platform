import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PremiereConfig {
  url: string;
  apiKey?: string;
}

export interface ProjectInfo {
  name: string;
  path: string;
  timebase: string;
  frameRate: number;
  duration: number;
}

export interface SequenceInfo {
  name: string;
  startTime: number;
  endTime: number;
  frameRate: number;
  resolution: { width: number; height: number };
}

export class PremiereAdapter {
  private config: PremiereConfig;

  constructor(config: PremiereConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Premiere适配器初始化中...');
    } catch (error) {
      logger.error('Premiere适配器初始化失败:', error);
      throw error;
    }
  }

  async executeCommand(command: string, params: any = {}): Promise<any> {
    try {
      logger.info(`执行Premiere命令: ${command}`);

      const response = await fetch(`${this.config.url}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, ...params })
      });

      if (!response.ok) {
        throw new Error(`Premiere API请求失败: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Premiere命令执行失败:', error);
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
      logger.error('Premiere连接失败:', error);
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

  async getProjectInfo(): Promise<ProjectInfo> {
    const script = `
      var project = app.project;
      if (!project || !project.activeSequence) {
        throw new Error("没有活动项目或序列");
      }
      
      var sequence = project.activeSequence;
      
      JSON.stringify({
        name: project.name,
        path: project.file.fsName,
        timebase: sequence.timebase.toString(),
        frameRate: sequence.frameRate,
        duration: sequence.duration.seconds
      });
    `;

    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync(`osascript -e 'tell application "Adobe Premiere Pro 2024" to do javascript "${script.replace(/"/g, '\\"')}'"`);
        return JSON.parse(stdout.trim());
      } else {
        return await this.sendCommand('executeScript', { script });
      }
    } catch (error) {
      logger.error('获取项目信息失败:', error);
      throw new Error(`获取项目信息失败: ${error}`);
    }
  }

  async createSequence(params: {
    name?: string;
    width?: number;
    height?: number;
    frameRate?: number;
    sampleRate?: number;
  } = {}): Promise<SequenceInfo> {
    const {
      name = 'New Sequence',
      width = 1920,
      height = 1080,
      frameRate = 30,
      sampleRate = 48000
    } = params;

    const script = `
      var project = app.project;
      if (!project) {
        throw new Error("没有活动项目");
      }
      
      var sequenceSettings = {
        width: ${width},
        height: ${height},
        frameRate: ${frameRate},
        sampleRate: ${sampleRate}
      };
      
      var sequence = project.createNewSequence('${name}', sequenceSettings);
      
      JSON.stringify({
        success: true,
        name: '${name}',
        width: ${width},
        height: ${height},
        frameRate: ${frameRate},
        sampleRate: ${sampleRate}
      });
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('创建序列失败:', error);
      throw new Error(`创建序列失败: ${error}`);
    }
  }

  async importMedia(filePath: string): Promise<any> {
    const script = `
      var project = app.project;
      if (!project) {
        throw new Error("没有活动项目");
      }
      
      try {
        var mediaFile = new File('${filePath}');
        var importedItem = project.importFiles([mediaFile]);
        
        JSON.stringify({
          success: true,
          fileName: '${filePath}',
          itemCount: importedItem.length,
          importedFiles: importedItem.map(function(item) {
            return {
              name: item.name,
              type: item.type,
              duration: item.duration ? item.duration.seconds : null
            };
          })
        });
      } catch (importError) {
        JSON.stringify({
          success: false,
          error: importError.toString(),
          fileName: '${filePath}'
        });
      }
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('导入媒体失败:', error);
      throw new Error(`导入媒体失败: ${error}`);
    }
  }

  async addClipToSequence(clipName: string, startTime: number = 0): Promise<any> {
    const script = `
      var project = app.project;
      if (!project || !project.activeSequence) {
        throw new Error("没有活动项目或序列");
      }
      
      var sequence = project.activeSequence;
      var clip = null;
      
      // 查找指定的素材
      for (var i = 0; i < project.rootItem.numItems; i++) {
        var item = project.rootItem[i];
        if (item.name === '${clipName}') {
          clip = item;
          break;
        }
      }
      
      if (!clip) {
        throw new Error("找不到指定的素材");
      }
      
      // 将素材添加到序列
      var trackIndex = 0; // 视频轨道1
      var targetTime = new Time();
      targetTime.seconds = ${startTime};
      
      var placement = sequence.insertClip(clip, trackIndex, targetTime);
      
      JSON.stringify({
        success: true,
        clipName: '${clipName}',
        trackIndex: trackIndex,
        startTime: ${startTime}
        placementTime: placement.start.seconds
      });
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('添加片段到序列失败:', error);
      throw new Error(`添加片段到序列失败: ${error}`);
    }
  }

  async exportSequence(params: {
    format?: 'H264' | 'PRORES' | 'DNXHD';
    quality?: 'low' | 'medium' | 'high';
    preset?: string;
    outputPath?: string;
  } = {}): Promise<any> {
    const {
      format = 'H264',
      quality = 'medium',
      preset = 'matchSourceHighBitrate',
      outputPath = '/tmp/premiere_export_' + Date.now()
    } = params;

    const script = `
      var project = app.project;
      if (!project || !project.activeSequence) {
        throw new Error("没有活动项目或序列");
      }
      
      var sequence = project.activeSequence;
      
      // 设置导出选项
      var exportPreset = new ExportPreset();
      exportPreset.presetFile = '${preset}';
      
      // 开始导出
      var outputFilePath = new File('${outputPath}');
      var success = sequence.exportAsMediaDirect(outputFilePath, exportPreset, 'background');
      
      JSON.stringify({
        success: success,
        format: '${format}',
        quality: '${quality}',
        preset: '${preset}',
        outputPath: '${outputPath}',
        sequenceName: sequence.name
      });
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('导出序列失败:', error);
      throw new Error(`导出序列失败: ${error}`);
    }
  }

  async addTransition(type: string, duration: number = 1.0): Promise<any> {
    const script = `
      var project = app.project;
      if (!project || !project.activeSequence) {
        throw new Error("没有活动项目或序列");
      }
      
      var sequence = project.activeSequence;
      var videoTracks = sequence.videoTracks;
      
      if (videoTracks.length === 0 || videoTracks[0].clips.numItems < 2) {
        throw new Error("需要至少两个视频片段才能添加转场");
      }
      
      try {
        var transition = videoTracks[0].transitions.add('${type}', ${duration});
        
        JSON.stringify({
          success: true,
          transitionType: '${type}',
          duration: ${duration}
          transitionIndex: transition.index
        });
      } catch (transitionError) {
        JSON.stringify({
          success: false,
          error: transitionError.toString(),
          transitionType: '${type}'
        });
      }
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('添加转场失败:', error);
      throw new Error(`添加转场失败: ${error}`);
    }
  }

  async addTitle(text: string, position: { x: number; y: number } = { x: 50, y: 50 }): Promise<any> {
    const script = `
      var project = app.project;
      if (!project || !project.activeSequence) {
        throw new Error("没有活动项目或序列");
      }
      
      var sequence = project.activeSequence;
      
      try {
        var titleItem = project.createNewSequence('title', null);
        var titleClip = titleItem.createTitle();
        
        titleClip.setText('${text}');
        titleClip.setPosition(${position.x}, ${position.y});
        
        JSON.stringify({
          success: true,
          text: '${text}',
          position: { x: ${position.x}, y: ${position.y} }
          titleName: titleItem.name
        });
      } catch (titleError) {
        JSON.stringify({
          success: false,
          error: titleError.toString(),
          text: '${text}'
        });
      }
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('添加标题失败:', error);
      throw new Error(`添加标题失败: ${error}`);
    }
  }
}

export default PremiereAdapter;