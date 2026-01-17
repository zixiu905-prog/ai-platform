import { SoftwareStatus, CADLayerInfo, CADBlockInfo, SoftwareAdapter, AdapterSoftwareStatus } from '../types/adapter';
import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export class AutoCADAdapter implements SoftwareAdapter {
  private isConnected: boolean = false;
  private app: any = null;
  private process: any = null;

  async connect(apiKey?: string, settings?: any): Promise<boolean> {
    try {
      const autocadPath = await this.detectAutoCADInstallation();
      if (!autocadPath) {
        throw new Error('未检测到AutoCAD安装');
      }

      console.log(`📐 检测到AutoCAD安装路径: ${autocadPath}`);

      if (process.platform === 'win32') {
        return await this.connectWindowsCOM(apiKey, settings);
      } else if (process.platform === 'darwin') {
        return await this.connectMacOSAppleScript(apiKey, settings);
      } else {
        return await this.connectWebSocketAPI(apiKey, settings);
      }
    } catch (error) {
      logger.error('AutoCAD连接失败:', error);
      return false;
    }
  }

  private async connectWindowsCOM(apiKey?: string, settings?: any): Promise<boolean> {
    try {
      // 通过COM接口连接AutoCAD
      const { execSync } = require('child_process');
      
      // 启动AutoCAD
      const autocadPath = await this.detectAutoCADInstallation();
      this.process = require('child_process').execFile(autocadPath);
      
      // 等待AutoCAD启动
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 创建WebSocket连接到AutoCAD插件
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:8081/autocad');
      
      return new Promise((resolve, reject) => {
        ws.on('open', () => {
          this.isConnected = true;
          this.app = ws;
          console.log('✅ AutoCAD COM连接成功');
          resolve(true);
        });
        
        ws.on('error', (error: any) => {
          logger.error('❌ AutoCAD连接错误:', error);
          reject(error);
        });
        
        ws.on('close', () => {
          this.isConnected = false;
        });
      });
    } catch (error) {
      logger.error('Windows COM连接失败:', error);
      return false;
    }
  }

  private async connectMacOSAppleScript(apiKey?: string, settings?: any): Promise<boolean> {
    try {
      const script = `
        tell application "AutoCAD"
          activate
          return "connected"
        end tell
      `;
      
      const { stdout } = await execAsync(`osascript -e '${script}'`);
      
      if (stdout.trim() === 'connected') {
        this.isConnected = true;
        console.log('✅ AutoCAD AppleScript连接成功');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('macOS AppleScript连接失败:', error);
      return false;
    }
  }

  private async connectWebSocketAPI(apiKey?: string, settings?: any): Promise<boolean> {
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:8081/autocad');
      
      return new Promise((resolve, reject) => {
        ws.on('open', () => {
          this.isConnected = true;
          this.app = ws;
          console.log('✅ AutoCAD WebSocket连接成功');
          resolve(true);
        });
        
        ws.on('error', (error: any) => {
          logger.error('❌ AutoCAD WebSocket连接错误:', error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('WebSocket API连接失败:', error);
      return false;
    }
  }

  private async detectAutoCADInstallation(): Promise<string | null> {
    const possiblePaths = [];
    
    if (process.platform === 'win32') {
      possiblePaths.push(
        'C:\\Program Files\\Autodesk\\AutoCAD 2024\\acad.exe',
        'C:\\Program Files\\Autodesk\\AutoCAD 2023\\acad.exe',
        'C:\\Program Files\\Autodesk\\AutoCAD 2022\\acad.exe'
      );
    } else if (process.platform === 'darwin') {
      possiblePaths.push(
        '/Applications/AutoCAD 2024/AutoCAD 2024.app',
        '/Applications/AutoCAD 2023/AutoCAD 2023.app'
      );
    } else {
      possiblePaths.push('/usr/bin/autocad');
    }
    
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
    
    return null;
  }

  async execute(action: string, parameters?: any): Promise<any> {
    if (!this.isConnected || !this.app) {
      throw new Error('AutoCAD未连接');
    }

    try {
      let result;
      
      switch (action) {
        case 'getDrawingInfo':
          result = await this.getDrawingInfo();
          break;
          
        case 'createDrawing':
          result = await this.createDrawing(parameters);
          break;
          
        case 'openDrawing':
          result = await this.openDrawing(parameters.path);
          break;
          
        case 'saveDrawing':
          result = await this.saveDrawing(parameters);
          break;
          
        case 'getLayers':
          result = await this.getLayers();
          break;
          
        case 'createLayer':
          result = await this.createLayer(parameters);
          break;
          
        case 'getBlocks':
          result = await this.getBlocks();
          break;
          
        case 'insertBlock':
          result = await this.insertBlock(parameters);
          break;
          
        case 'executeLisp':
          result = await this.executeLisp(parameters.lispCode);
          break;
          
        case 'batchConvert':
          result = await this.batchConvert(parameters);
          break;
          
        case 'layerCleanup':
          result = await this.layerCleanup();
          break;
          
        default:
          result = await this.executeCustomCommand(action, parameters);
      }
      
      console.log(`✅ AutoCAD命令执行成功: ${action}`);
      return result;
    } catch (error) {
      logger.error(`❌ AutoCAD命令执行失败: ${action}`, error);
      throw error;
    }
  }

  private async getDrawingInfo(): Promise<any> {
    const lispCode = `
      (vl-load-com)
      (setq acadObject (vlax-get-acad-object))
      (setq acadDocument (vla-get-activedocument acadObject))
      (list 
        (cons "name" (vla-get-name acadDocument))
        (cons "path" (vla-get-fullname acadDocument))
        (cons "saved" (vla-get-saved acadDocument))
        (cons "units" (vla-get-measurement acadDocument))
        (cons "layers" (vla-get-count (vla-get-layers acadDocument)))
        (cons "blocks" (vla-get-count (vla-get-blocks acadDocument)))
      )
    `;

    try {
      return await this.sendCommand('executeLisp', { lispCode });
    } catch (error) {
      logger.error('获取图纸信息失败:', error);
      throw new Error(`获取图纸信息失败: ${error}`);
    }
  }

  private async createDrawing(params: any): Promise<any> {
    const { template = '', units = 'Metric' } = params;
    
    const lispCode = template ? 
      `(command "._new" "${template}")` :
      `(command "._new" "")`;

    try {
      await this.sendCommand('executeLisp', { lispCode });
      return { success: true, message: '图纸创建成功', template, units };
    } catch (error) {
      logger.error('创建图纸失败:', error);
      throw new Error(`创建图纸失败: ${error}`);
    }
  }

  private async openDrawing(filePath: string): Promise<any> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const lispCode = `(command "._open" "${filePath}")`;

    try {
      await this.sendCommand('executeLisp', { lispCode });
      return { success: true, message: '图纸打开成功', path: filePath };
    } catch (error) {
      logger.error('打开图纸失败:', error);
      throw new Error(`打开图纸失败: ${error}`);
    }
  }

  private async saveDrawing(params: any): Promise<any> {
    const { path, version = '2018' } = params;
    
    let lispCode;
    if (path) {
      lispCode = `(command "._saveas" "${version}" "${path}")`;
    } else {
      lispCode = `(command "._qsave")`;
    }

    try {
      await this.sendCommand('executeLisp', { lispCode });
      return { success: true, message: '图纸保存成功', path: path || '当前文件' };
    } catch (error) {
      logger.error('保存图纸失败:', error);
      throw new Error(`保存图纸失败: ${error}`);
    }
  }

  private async getLayers(): Promise<CADLayerInfo[]> {
    const lispCode = `
      (vl-load-com)
      (setq acadObject (vlax-get-acad-object))
      (setq acadDocument (vla-get-activedocument acadObject))
      (setq layers (vla-get-layers acadDocument))
      (setq layerList '())
      (vlax-for layer layers
        (setq layerInfo (list 
          (cons "name" (vla-get-name layer))
          (cons "color" (vla-get-color layer))
          (cons "lineType" (vla-get-linetype layer))
          (cons "visible" (= (vla-get-layeron layer) :vlax-true))
          (cons "frozen" (= (vla-get-freeze layer) :vlax-true))
          (cons "locked" (= (vla-get-lock layer) :vlax-true))
        ))
        (setq layerList (cons layerInfo layerList))
      )
      layerList
    `;

    try {
      return await this.sendCommand('executeLisp', { lispCode });
    } catch (error) {
      logger.error('获取图层信息失败:', error);
      throw new Error(`获取图层信息失败: ${error}`);
    }
  }

  private async createLayer(params: any): Promise<any> {
    const { name, color = 7, lineType = 'Continuous' } = params;
    
    const lispCode = `
      (command "._layer" "_make" "${name}" "_color" ${color} "" "_ltype" "${lineType}" "" "")
    `;

    try {
      await this.sendCommand('executeLisp', { lispCode });
      return { success: true, name, color, lineType };
    } catch (error) {
      logger.error('创建图层失败:', error);
      throw new Error(`创建图层失败: ${error}`);
    }
  }

  private async getBlocks(): Promise<CADBlockInfo[]> {
    const lispCode = `
      (vl-load-com)
      (setq acadObject (vlax-get-acad-object))
      (setq acadDocument (vla-get-activedocument acadObject))
      (setq blocks (vla-get-blocks acadDocument))
      (setq blockList '())
      (vlax-for block blocks
        (if (not (= (vla-get-islayout block) :vlax-true))
          (progn
            (setq blockInfo (list 
              (cons "name" (vla-get-name block))
              (cons "origin" (list 
                (vlax-get-property block 'origin 0)
                (vlax-get-property block 'origin 1) 
                (vlax-get-property block 'origin 2)
              ))
            ))
            (setq blockList (cons blockInfo blockList))
          )
        )
      )
      blockList
    `;

    try {
      return await this.sendCommand('executeLisp', { lispCode });
    } catch (error) {
      logger.error('获取图块信息失败:', error);
      throw new Error(`获取图块信息失败: ${error}`);
    }
  }

  private async insertBlock(params: any): Promise<any> {
    const { blockName, insertionPoint = [0, 0, 0], scale = 1, rotation = 0 } = params;
    
    const [x, y, z] = insertionPoint;
    const lispCode = `
      (command "._insert" "${blockName}" ${x},${y},${z} ${scale} ${scale} ${scale} ${rotation})
    `;

    try {
      await this.sendCommand('executeLisp', { lispCode });
      return { success: true, blockName, insertionPoint, scale, rotation };
    } catch (error) {
      logger.error('插入图块失败:', error);
      throw new Error(`插入图块失败: ${error}`);
    }
  }

  private async executeLisp(lispCode: string): Promise<any> {
    try {
      return await this.sendCommand('executeLisp', { lispCode });
    } catch (error) {
      logger.error('执行Lisp代码失败:', error);
      throw new Error(`执行Lisp代码失败: ${error}`);
    }
  }

  private async batchConvert(params: any): Promise<any> {
    const { inputFolder, outputFolder, targetFormat = 'DWG', sourceFormat = 'DXF' } = params;
    
    const files = fs.readdirSync(inputFolder).filter(file => 
      file.toLowerCase().endsWith(sourceFormat.toLowerCase())
    );
    
    const results = [];
    
    for (const file of files) {
      const inputPath = path.join(inputFolder, file);
      const outputPath = path.join(outputFolder, file.replace(new RegExp(`\\.${sourceFormat}$`, 'i'), `.${targetFormat}`));
      
      try {
        // 打开文件
        await this.openDrawing(inputPath);
        
        // 另存为目标格式
        await this.saveDrawing({ path: outputPath, version: targetFormat });
        
        results.push({ file, success: true, inputPath, outputPath });
      } catch (error: any) {
        logger.error('批量转换失败:', error);
        results.push({ file, success: false, error: error.message });
      }
    }
    
    return { 
      success: true,
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results 
    };
  }

  private async layerCleanup(): Promise<any> {
    const lispCode = `
      (defun cleanupLayers (/ layerCount cleanedLayers)
        (vl-load-com)
        (setq acadObject (vlax-get-acad-object))
        (setq acadDocument (vla-get-activedocument acadObject))
        (setq layers (vla-get-layers acadDocument))
        (setq layerCount 0)
        (setq cleanedLayers 0)
        
        (vlax-for layer layers
          (setq layerCount (1+ layerCount))
          
          ;; 删除空图层
          (if (and 
                (/= (vla-get-name layer) "0")
                (/= (vla-get-name layer) "Defpoints")
                (= (vla-get-count (vla-get-block (vla-get-layout acadDocument))) 0)
              )
            (progn
              (vla-delete layer)
              (setq cleanedLayers (1+ cleanedLayers))
            )
          )
        )
        
        (list (cons "totalLayers" layerCount) (cons "cleanedLayers" cleanedLayers))
      )
      
      (cleanupLayers)
    `;

    try {
      return await this.sendCommand('executeLisp', { lispCode });
    } catch (error) {
      logger.error('图层清理失败:', error);
      throw new Error(`图层清理失败: ${error}`);
    }
  }

  private async executeCustomCommand(action: string, parameters: any): Promise<any> {
    return await this.sendCommand(action, parameters);
  }

  async sendCommand(command: string, parameters?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.app || !this.isConnected) {
        reject(new Error('AutoCAD未连接'));
        return;
      }

      const message = {
        command,
        parameters,
        timestamp: Date.now()
      };

      this.app.send(JSON.stringify(message));

      const timeout = setTimeout(() => {
        reject(new Error('命令执行超时'));
      }, 30000);

      const responseHandler = (data: any) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          if (response.success) {
            resolve(response.result);
          } else {
            reject(new Error(response.error));
          }
        } catch (error) {
          logger.error('响应解析失败:', error);
          reject(new Error('响应解析失败'));
        }
      };

      this.app.once('message', responseHandler);
    });
  }

  async getStatus(): Promise<AdapterSoftwareStatus> {
    try {
      if (!this.isConnected) {
        return { isOnline: false, version: null, memoryUsage: 0, cpuUsage: 0 };
      }

      await this.execute('ping');

      return {
        isOnline: true,
        version: '2024.0.0', // 实际应该从AutoCAD获取
        memoryUsage: 0,
        cpuUsage: 0
      };
    } catch (error) {
      logger.error('获取状态失败:', error);
      this.isConnected = false;
      return { isOnline: false, version: null, memoryUsage: 0, cpuUsage: 0 };
    }
  }


  async disconnect(): Promise<void> {
    try {
      if (this.app) {
        this.app.close();
      }
      
      if (this.process) {
        this.process.kill();
      }
      
      this.isConnected = false;
      this.app = null;
      this.process = null;
      
      console.log('✅ AutoCAD连接已断开');
    } catch (error) {
      logger.error('❌ 断开AutoCAD连接失败:', error);
    }
  }
}

export default AutoCADAdapter;