import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface IllustratorConfig {
  url: string;
  apiKey?: string;
}

export interface DocumentInfo {
  name: string;
  width: number;
  height: number;
  units: string;
  colorMode: string;
  zoom: number;
}

export interface PathPoint {
  x: number;
  y: number;
  type?: 'corner' | 'smooth';
}

export class IllustratorAdvancedAdapter {
  private config: IllustratorConfig;

  constructor(config: IllustratorConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Illustrator高级适配器初始化中...');
      // 基本初始化逻辑
    } catch (error) {
      logger.error('Illustrator适配器初始化失败:', error);
      throw error;
    }
  }

  async executeCommand(command: string, params: any = {}): Promise<any> {
    try {
      logger.info(`执行Illustrator命令: ${command}`);
      
      const response = await fetch(`${this.config.url}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, ...params })
      });
      
      if (!response.ok) {
        throw new Error(`Illustrator API请求失败: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Illustrator命令执行失败:', error);
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
      logger.error('Illustrator连接失败:', error);
      return false;
    }
  }

  async execute(action: string, parameters?: any): Promise<any> {
    return this.executeCommand(action, parameters);
  }

  async getStatus(): Promise<any> {
    return {
      isOnline: true,
      version: '28.0',
      memoryUsage: 0,
      cpuUsage: 0,
    };
  }

  async disconnect(): Promise<void> {
    // 断开连接逻辑
  }

  async getDocumentInfo(): Promise<DocumentInfo> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      JSON.stringify({
        name: doc.name,
        width: doc.width,
        height: doc.height,
        origin: { x: doc.rulerOrigin[0], y: doc.rulerOrigin[1] }
        units: doc.rulerUnits.toString(),
        colorMode: doc.documentColorSpace.toString(),
        zoom: doc.activeView.zoom
      });
    `;

    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync(`osascript -e 'tell application "Adobe Illustrator 2024" to do javascript "${script.replace(/"/g, '\\"')}'"`);
        return JSON.parse(stdout.trim());
      } else {
        return await this.sendCommand('executeScript', { script });
      }
    } catch (error) {
      logger.error('获取文档信息失败:', error);
      throw new Error(`获取文档信息失败: ${error}`);
    }
  }

  async createDocument(params: {
    width?: number;
    height?: number;
    units?: 'Points' | 'Picas' | 'Inches' | 'Millimeters' | 'Centimeters' | 'Pixels' | 'Q';
    colorMode?: 'RGB' | 'CMYK' | 'Grayscale';
    title?: string;
  }): Promise<DocumentInfo> {
    const {
      width = 800,
      height = 600,
      units = 'Pixels',
      colorMode = 'RGB',
      title = 'Untitled'
    } = params;

    const script = `
      var doc = app.documents.addDocument(${width}, ${height}, DocumentColorSpace.${colorMode.toUpperCase()}, '${title}');
      doc.rulerUnits = RulerUnits.${units.toUpperCase()};
      JSON.stringify({
        success: true,
        width: ${width}
        height: ${height}
        units: '${units}',
        colorMode: '${colorMode}',
        title: '${title}'
      });
    `;

    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync(`osascript -e 'tell application "Adobe Illustrator 2024" to do javascript "${script.replace(/"/g, '\\"')}'"`);
        return JSON.parse(stdout.trim());
      } else {
        return await this.sendCommand('executeScript', { script });
      }
    } catch (error) {
      logger.error('创建文档失败:', error);
      throw new Error(`创建文档失败: ${error}`);
    }
  }

  async createPath(points: PathPoint[], closePath: boolean = true): Promise<any> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var pathItem = doc.pathItems.add();
      var pointsArray = ${JSON.stringify(points)};
      
      for (var i = 0; i < pointsArray.length; i++) {
        var point = pointsArray[i];
        var pathPoint = pathItem.pathPoints.add();
        pathPoint.anchor = [point.x, point.y];
        pathPoint.leftDirection = [point.x, point.y];
        pathPoint.rightDirection = [point.x, point.y];
        if (point.type === 'smooth') {
          pathPoint.pointType = PointType.SMOOTH;
        }
      }
      
      pathItem.closed = ${closePath};
      JSON.stringify({ success: true, pointsCount: pointsArray.length });
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('创建路径失败:', error);
      throw new Error(`创建路径失败: ${error}`);
    }
  }

  async createText(content: string, position: { x: number; y: number }, options: {
    font?: string;
    size?: number;
    color?: string;
    fill?: string;
  } = {}): Promise<any> {
    const {
      font = 'Arial',
      size = 12,
      color = '#000000',
      fill = color
    } = options;

    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var textFrame = doc.textFrames.add();
      textFrame.contents = "${content.replace(/"/g, '\\"')}";
      textFrame.position = [${position.x}, ${position.y}];
      textFrame.textRange.characterAttributes.size = ${size};
      textFrame.textRange.characterAttributes.textFont = app.textFonts.getByName("${font}");
      textFrame.textRange.characterAttributes.fillColor = doc.swatches.getByName("${fill}");
      
      JSON.stringify({ 
        success: true}
        content: "${content}",
        position: { x: ${position.x}, y: ${position.y} ,
      });
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('创建文本失败:', error);
      throw new Error(`创建文本失败: ${error}`);
    }
  }

  async exportArtboard(format: 'PNG' | 'JPG' | 'SVG' | 'PDF' = 'PNG', options: {
    quality?: number;
    scale?: number;
    transparent?: boolean;
  } = {}): Promise<any> {
    const {
      quality = 100,
      scale = 1,
      transparent = true
    } = options;

    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var exportOptions = new ExportOptions${format}();
      exportOptions.antiAliasing = true;
      exportOptions.artBoardClipping = true;
      ${format === 'PNG' ? `exportOptions.transparency = ${transparent};` : ''}
      ${format === 'JPG' ? `exportOptions.qualitySetting = ${quality};` : ''}
      
      var file = new File("/tmp/export_" + Date.now() + ".${format.toLowerCase()}");
      doc.exportFile(file, ExportType.${format.toUpperCase()}, exportOptions);
      
      JSON.stringify({ 
        success: true}
        format: "${format}",
        file: file.fsName
      });
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('导出画板失败:', error);
      throw new Error(`导出画板失败: ${error}`);
    }
  }

  async applyEffect(effectType: string, effectName: string, parameters: any = {}): Promise<any> {
    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var selection = doc.selection;
      if (selection.length === 0) {
        throw new Error("没有选中的对象");
      }
      
      // 应用效果逻辑
      JSON.stringify({ success: true, effectType: "${effectType}", effectName: "${effectName}" });
    `;

    try {
      await this.sendCommand('executeScript', { script });
      return { success: true, effectType, effectName, parameters };
    } catch (error) {
      logger.error('应用效果失败:', error);
      throw new Error(`应用效果失败: ${error}`);
    }
  }

  async transformObject(params: {
    objectIndex: number;
    operation: 'move' | 'rotate' | 'scale' | 'skew' | 'reflect' | 'shear';
    values: {
      x?: number;
      y?: number;
      angle?: number;
      scaleX?: number;
      scaleY?: number;
    };
  }): Promise<any> {
    const { objectIndex, operation, values } = params;

    const script = `
      var doc = app.activeDocument;
      if (!doc) {
        throw new Error("没有活动文档");
      }
      
      var pageItem = doc.pageItems[${objectIndex}];
      if (!pageItem) {
        throw new Error("找不到指定对象");
      }
      
      switch ("${operation}") {
        case "move":
          pageItem.position = [${values.x || 0}, ${values.y || 0}];
          break;
        case "rotate":
          pageItem.rotate(${values.angle || 0});
          break;
        case "scale":
          pageItem.resize(${values.scaleX || 100}, ${values.scaleY || 100});
          break;
      }
      
      JSON.stringify({ 
        success: true,
        operation: "${operation}",
        objectIndex: ${objectIndex}
      });
    `;

    try {
      const result = await this.sendCommand('executeScript', { script });
      return result;
    } catch (error) {
      logger.error('变换对象失败:', error);
      throw new Error(`变换对象失败: ${error}`);
    }
  }
}

export default IllustratorAdvancedAdapter;