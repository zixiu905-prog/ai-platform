import { EventEmitter } from 'events';
import { writeFile, mkdir, existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { promisify } from 'util';
import axios from 'axios';
import WebSocket from 'ws';

const writeFileAsync = promisify(writeFile);
const mkdirAsync = promisify(mkdir);

export interface SpeechConfig {
  appId: string;
  accessToken: string;
  secretKey: string;
  language: 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';
  format: 'wav' | 'mp3' | 'flac';
  sampleRate: number;
  channels: number;
  enablePunctuation: boolean;
  enableTimestamps: boolean;
  enableWordConfidence: boolean;
  maxRecordingTime: number; // 最大录音时间（秒）
  silenceTimeout: number; // 静音超时（毫秒）
}

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  duration: number;
  language: string;
  words: SpeechWord[];
  segments: SpeechSegment[];
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
}

export interface SpeechWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface SpeechSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: number;
}

export interface SpeechCommand {
  id: string;
  name: string;
  keywords: string[];
  action: string;
  parameters?: Record<string, any>;
  category: 'photoshop' | 'autocad' | 'blender' | 'general';
  enabled: boolean;
  aliases: string[];
}

export class SpeechRecognitionService extends EventEmitter {
  private config: SpeechConfig;
  private isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private silenceTimer: NodeJS.Timeout | null = null;
  private tempDir: string;
  private commands: Map<string, SpeechCommand> = new Map();
  private recognitionHistory: Array<{
    id: string;
    result: SpeechRecognitionResult;
    timestamp: Date;
    command?: SpeechCommand;
  }> = [];

  constructor(config: Partial<SpeechConfig>) {
    super();
    
    // 使用提供的火山引擎配置
    this.config = {
      appId: '2413851872',
      accessToken: 'riOMCwpSAHmDHo2mpEglqX0fatSitY-D',
      secretKey: 'QVBINDSBk5e1TNp3V-S7QzLXzXwrq9pT',
      language: 'zh-CN',
      format: 'wav',
      sampleRate: 16000,
      channels: 1,
      enablePunctuation: true,
      enableTimestamps: true,
      enableWordConfidence: true,
      maxRecordingTime: 60,
      silenceTimeout: 3000,
      ...config
    };

    this.tempDir = join(app.getPath('temp'), 'aidesign-speech');
    this.initializeDirectories();
    this.initializeCommands();
  }

  private async initializeDirectories(): Promise<void> {
    try {
      if (!existsSync(this.tempDir)) {
        await mkdirAsync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to initialize directories:', error);
    }
  }

  private initializeCommands(): void {
    const defaultCommands: SpeechCommand[] = [
      {
        id: 'open-photoshop',
        name: '打开Photoshop',
        keywords: ['打开', '启动', '运行', 'photoshop', 'PS'],
        action: 'launch_software',
        parameters: { software: 'photoshop' },
        category: 'photoshop',
        enabled: true,
        aliases: ['启动PS', '打开PS']
      },
      {
        id: 'new-document',
        name: '新建文档',
        keywords: ['新建', '创建', '文档', '文件'],
        action: 'new_document',
        parameters: {},
        category: 'general',
        enabled: true,
        aliases: ['新建文档', '创建文件']
      },
      {
        id: 'save-file',
        name: '保存文件',
        keywords: ['保存', '存储', '存档'],
        action: 'save_file',
        parameters: {},
        category: 'general',
        enabled: true,
        aliases: ['保存文档']
      },
      {
        id: 'open-autocad',
        name: '打开AutoCAD',
        keywords: ['打开', '启动', '运行', 'autocad', 'CAD'],
        action: 'launch_software',
        parameters: { software: 'autocad' },
        category: 'autocad',
        enabled: true,
        aliases: ['启动CAD', '打开CAD']
      },
      {
        id: 'open-blender',
        name: '打开Blender',
        keywords: ['打开', '启动', '运行', 'blender', '三维'],
        action: 'launch_software',
        parameters: { software: 'blender' },
        category: 'blender',
        enabled: true,
        aliases: ['启动blender', '打开三维软件']
      },
      {
        id: 'batch-process',
        name: '批量处理',
        keywords: ['批量', '批处理', '批量操作'],
        action: 'batch_process',
        parameters: {},
        category: 'general',
        enabled: true,
        aliases: ['批量处理']
      },
      {
        id: 'generate-image',
        name: '生成图像',
        keywords: ['生成', '创建', '图像', '图片', 'AI'],
        action: 'generate_image',
        parameters: {},
        category: 'general',
        enabled: true,
        aliases: ['AI生成', '图片生成']
      },
      {
        id: 'export-file',
        name: '导出文件',
        keywords: ['导出', '输出', '另存为'],
        action: 'export_file',
        parameters: {},
        category: 'general',
        enabled: true,
        aliases: ['文件导出']
      }
    ];

    defaultCommands.forEach(command => {
      this.commands.set(command.id, command);
    });
  }

  /**
   * 开始录音
   */
  public async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: `audio/${this.config.format}`
      });

      this.audioChunks = [];
      this.recordingStartTime = Date.now();
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
        this.resetSilenceTimer();
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      this.mediaRecorder.start(100); // 100ms chunks
      this.emit('recordingStarted');
      
    } catch (error) {
      this.isRecording = false;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 停止录音
   */
  public stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      return;
    }

    this.mediaRecorder.stop();
    this.isRecording = false;
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    this.emit('recordingStopped');
  }

  /**
   * 实时语音识别（使用WebSocket）
   */
  public async startRealtimeRecognition(): Promise<void> {
    try {
      const wsUrl = await this.getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for real-time speech recognition');
        this.emit('realtimeStarted');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          this.handleRealtimeResult(data);
        } catch (error) {
          console.error('Failed to parse real-time result:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        this.emit('realtimeStopped');
      };

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 识别音频文件
   */
  public async recognizeAudioFile(filePath: string): Promise<SpeechRecognitionResult> {
    try {
      const audioBuffer = await this.readAudioFile(filePath);
      const result = await this.sendToRecognitionAPI(audioBuffer);
      
      // 保存到历史记录
      this.addToHistory(result);
      
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 添加自定义命令
   */
  public addCommand(command: SpeechCommand): void {
    this.commands.set(command.id, command);
    this.emit('commandAdded', command);
  }

  /**
   * 删除命令
   */
  public removeCommand(commandId: string): boolean {
    const deleted = this.commands.delete(commandId);
    if (deleted) {
      this.emit('commandRemoved', commandId);
    }
    return deleted;
  }

  /**
   * 获取所有命令
   */
  public getCommands(): SpeechCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * 启用/禁用命令
   */
  public toggleCommand(commandId: string): boolean {
    const command = this.commands.get(commandId);
    if (command) {
      command.enabled = !command.enabled;
      this.emit('commandToggled', { commandId, enabled: command.enabled });
      return command.enabled;
    }
    return false;
  }

  /**
   * 识别语音命令
   */
  public recognizeCommand(text: string): SpeechCommand | null {
    const normalizedText = text.toLowerCase().trim();
    
    for (const command of this.commands.values()) {
      if (!command.enabled) continue;
      
      // 检查关键词匹配
      for (const keyword of command.keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          return command;
        }
      }
      
      // 检查别名匹配
      for (const alias of command.aliases) {
        if (normalizedText.includes(alias.toLowerCase())) {
          return command;
        }
      }
    }
    
    return null;
  }

  /**
   * 获取识别历史
   */
  public getHistory(limit?: number): Array<{
    id: string;
    result: SpeechRecognitionResult;
    timestamp: Date;
    command?: SpeechCommand;
  }> {
    if (limit) {
      return this.recognitionHistory.slice(-limit);
    }
    return [...this.recognitionHistory];
  }

  /**
   * 清除历史记录
   */
  public clearHistory(): void {
    this.recognitionHistory = [];
    this.emit('historyCleared');
  }

  /**
   * 获取录音状态
   */
  public getRecordingStatus(): {
    isRecording: boolean;
    duration: number;
    silenceDetected: boolean;
  } {
    return {
      isRecording: this.isRecording,
      duration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
      silenceDetected: this.silenceTimer !== null
    };
  }

  // 私有方法

  private async readAudioFile(filePath: string): Promise<Buffer> {
    const fs = require('fs').promises;
    return await fs.readFile(filePath);
  }

  private async sendToRecognitionAPI(audioBuffer: Buffer): Promise<SpeechRecognitionResult> {
    // 使用火山引擎的语音识别API
    const url = 'https://openspeech.bytedance.com/api/v1/vc';
    
    const formData = new FormData();
    formData.append('app_id', this.config.appId);
    formData.append('language', this.config.language);
    formData.append('format', this.config.format);
    formData.append('sample_rate', this.config.sampleRate.toString());
    formData.append('channel', this.config.channels.toString());
    formData.append('enable_punctuation', this.config.enablePunctuation ? '1' : '0');
    formData.append('enable_timestamp', this.config.enableTimestamps ? '1' : '0');
    formData.append('enable_word_confidence', this.config.enableWordConfidence ? '1' : '0');
    formData.append('audio', new Blob([new Uint8Array(audioBuffer)]), 'audio.wav');

    try {
      const response = await axios.post(url, formData, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      });

      return this.parseAPIResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Speech recognition API error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  private async getWebSocketUrl(): Promise<string> {
    // 获取实时识别的WebSocket URL
    const url = 'https://openspeech.bytedance.com/api/v1/vc/ws';
    const params = new URLSearchParams({
      app_id: this.config.appId,
      language: this.config.language,
      format: this.config.format,
      sample_rate: this.config.sampleRate.toString(),
      channel: this.config.channels.toString(),
      enable_punctuation: this.config.enablePunctuation ? '1' : '0',
      enable_timestamp: this.config.enableTimestamps ? '1' : '0',
      token: this.config.accessToken
    });

    return `${url}?${params.toString()}`;
  }

  private parseAPIResponse(data: any): SpeechRecognitionResult {
    // 解析火山引擎的响应格式
    return {
      text: data.text || '',
      confidence: data.confidence || 0.8,
      duration: data.duration || 0,
      language: this.config.language,
      words: data.words || [],
      segments: data.segments || [],
      alternatives: data.alternatives || []
    };
  }

  private async handleRecordingStop(): Promise<void> {
    try {
      const audioBlob = new Blob(this.audioChunks, { 
        type: `audio/${this.config.format}` 
      });
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      
      const result = await this.sendToRecognitionAPI(audioBuffer);
      this.addToHistory(result);
      
      // 检查是否包含命令
      const command = this.recognizeCommand(result.text);
      if (command) {
        this.emit('commandRecognized', { command, text: result.text });
      }
      
      this.emit('recognitionComplete', result);
      
      // 清理音频流
      if (this.mediaRecorder) {
        const tracks = this.mediaRecorder.stream.getTracks();
        tracks.forEach(track => track.stop());
        this.mediaRecorder = null;
      }
      
    } catch (error) {
      this.emit('error', error);
    }
  }

  private handleRealtimeResult(data: any): void {
    // 处理实时识别结果
    if (data.type === 'partial') {
      this.emit('realtimePartial', data.text);
    } else if (data.type === 'final') {
      const result = this.parseAPIResponse(data);
      this.addToHistory(result);
      this.emit('realtimeFinal', result);
      
      // 检查命令
      const command = this.recognizeCommand(result.text);
      if (command) {
        this.emit('commandRecognized', { command, text: result.text });
      }
    }
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceTimer = setTimeout(() => {
      this.emit('silenceDetected');
      if (this.config.silenceTimeout > 0) {
        this.stopRecording();
      }
    }, this.config.silenceTimeout);
  }

  private addToHistory(result: SpeechRecognitionResult): void {
    const command = this.recognizeCommand(result.text);
    
    this.recognitionHistory.push({
      id: Date.now().toString(),
      result,
      timestamp: new Date(),
      command
    });

    // 限制历史记录数量
    if (this.recognitionHistory.length > 1000) {
      this.recognitionHistory = this.recognitionHistory.slice(-1000);
    }

    this.emit('historyAdded', { result, command });
  }
}