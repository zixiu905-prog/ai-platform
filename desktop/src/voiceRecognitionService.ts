import authService from './authService';

export interface VoiceRecognitionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  timestamp: number;
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
}

export interface VoiceSettings {
  language: string;
  model: 'whisper-1' | 'whisper-large' | 'custom';
  enablePunctuation: boolean;
  enableTimestamps: boolean;
  enableAlternatives: boolean;
  maxDuration: number; // 最大录制时长（秒）
  sampleRate: number;
  channels: number;
}

export interface SpeechToTextOptions {
  language?: string;
  model?: string;
  enablePunctuation?: boolean;
  enableTimestamps?: boolean;
  maxAlternatives?: number;
  profanityFilter?: boolean;
}

export class VoiceRecognitionService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private recordingStartTime: number = 0;
  private recordingStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private volumeMeter: NodeJS.Timeout | null = null;

  private settings: VoiceSettings = {
    language: 'zh-CN',
    model: 'whisper-1',
    enablePunctuation: true,
    enableTimestamps: false,
    enableAlternatives: true,
    maxDuration: 300, // 5分钟
    sampleRate: 16000,
    channels: 1
  };

  private eventListeners: { [key: string]: Function[] } = {};

  constructor() {
    this.initializeAudioContext();
  }

  /**
   * 初始化音频上下文
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
    } catch (error) {
      console.error('音频上下文初始化失败:', error);
      throw new Error('音频功能不可用');
    }
  }

  /**
   * 检查浏览器支持
   */
  static checkBrowserSupport(): {
    supported: boolean;
    features: {
      mediaRecorder: boolean;
      webAudio: boolean;
      getUserMedia: boolean;
    };
    errorMessage?: string;
  } {
    const features = {
      mediaRecorder: !!(navigator.mediaDevices && MediaRecorder),
      webAudio: !!(window.AudioContext || (window as any).webkitAudioContext),
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    };

    const supported = Object.values(features).every(Boolean);

    return {
      supported,
      features,
      errorMessage: supported ? undefined : '您的浏览器不支持语音识别功能'
    };
  }

  /**
   * 请求麦克风权限
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.settings.sampleRate,
          channelCount: this.settings.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // 立即关闭测试流
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('麦克风权限请求失败:', error);
      return false;
    }
  }

  /**
   * 开始录音
   */
  async startRecording(options?: Partial<SpeechToTextOptions>): Promise<boolean> {
    if (this.isRecording) {
      console.warn('录音已在进行中');
      return false;
    }

    try {
      // 获取麦克风流
      this.recordingStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.settings.sampleRate,
          channelCount: this.settings.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // 创建音频分析器
      if (this.audioContext && this.recordingStream) {
        this.microphone = this.audioContext.createMediaStreamSource(this.recordingStream);
        this.microphone.connect(this.analyser!);
        this.startVolumeMonitoring();
      }

      // 初始化录制器
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.recordingStream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];
      this.recordingStartTime = Date.now();

      // 设置事件处理
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('录制错误:', event);
        this.emit('error', { message: '录制过程中发生错误' });
      };

      // 开始录制
      this.mediaRecorder.start(100); // 每100ms收集一次数据
      this.isRecording = true;

      this.emit('recordingStarted', {
        timestamp: this.recordingStartTime,
        settings: { ...this.settings, ...options }
      });

      // 设置最大录制时长
      if (this.settings.maxDuration > 0) {
        setTimeout(() => {
          if (this.isRecording) {
            this.stopRecording();
            this.emit('maxDurationReached');
          }
        }, this.settings.maxDuration * 1000);
      }

      return true;
    } catch (error: any) {
      console.error('开始录音失败:', error);
      this.emit('error', { 
        message: error.message || '无法访问麦克风',
        code: error.name
      });
      return false;
    }
  }

  /**
   * 停止录音
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording || !this.mediaRecorder) {
      return;
    }

    this.isRecording = false;
    
    // 停止音量监控
    this.stopVolumeMonitoring();

    try {
      this.mediaRecorder.stop();
      
      if (this.recordingStream) {
        this.recordingStream.getTracks().forEach(track => track.stop());
        this.recordingStream = null;
      }

      if (this.microphone) {
        this.microphone.disconnect();
        this.microphone = null;
      }

      this.emit('recordingStopped', {
        duration: Date.now() - this.recordingStartTime,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('停止录音失败:', error);
    }
  }

  /**
   * 处理录音停止
   */
  private async handleRecordingStop(): Promise<void> {
    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const duration = Date.now() - this.recordingStartTime;
      
      this.emit('audioReady', {
        blob: audioBlob,
        duration,
        size: audioBlob.size,
        timestamp: Date.now()
      });

      // 自动转录
      await this.transcribeAudio(audioBlob, duration);
    } catch (error) {
      console.error('处理录音数据失败:', error);
      this.emit('error', { message: '音频处理失败' });
    }
  }

  /**
   * 转录音频
   */
  async transcribeAudio(audioBlob: Blob, duration: number, options?: SpeechToTextOptions): Promise<VoiceRecognitionResult | null> {
    try {
      this.emit('transcriptionStarted');

      // 检查文件大小限制 (25MB)
      if (audioBlob.size > 25 * 1024 * 1024) {
        throw new Error('音频文件过大，请缩短录音时长');
      }

      // 检查时长限制
      if (duration > this.settings.maxDuration * 1000) {
        throw new Error('录音时长超过限制');
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('model', options?.model || this.settings.model);
      formData.append('language', options?.language || this.settings.language);
      formData.append('enable_punctuation', (options?.enablePunctuation ?? this.settings.enablePunctuation).toString());
      formData.append('enable_timestamps', (options?.enableTimestamps ?? this.settings.enableTimestamps).toString());
      formData.append('max_alternatives', (options?.maxAlternatives ?? 3).toString());
      formData.append('profanity_filter', (options?.profanityFilter ?? true).toString());

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/voice/transcribe`, {
        method: 'POST',
        headers: authService.getAuthHeader() as any,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '语音识别失败');
      }

      const result = await response.json();
      
      const transcriptionResult: VoiceRecognitionResult = {
        text: result.text || '',
        confidence: result.confidence || 0,
        language: result.language || this.settings.language,
        duration: duration / 1000,
        timestamp: Date.now(),
        alternatives: result.alternatives
      };

      this.emit('transcriptionCompleted', transcriptionResult);
      return transcriptionResult;

    } catch (error: any) {
      console.error('音频转录失败:', error);
      this.emit('transcriptionFailed', {
        message: error.message || '语音识别服务不可用',
        code: error.code
      });
      return null;
    }
  }

  /**
   * 实时语音识别 (使用 Web Speech API，如果可用)
   */
  async startRealtimeRecognition(options?: SpeechToTextOptions): Promise<boolean> {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.emit('error', { message: '浏览器不支持实时语音识别' });
      return false;
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = options?.language || this.settings.language;
      recognition.maxAlternatives = options?.maxAlternatives || 3;

      recognition.onstart = () => {
        this.emit('realtimeRecognitionStarted');
      };

      recognition.onresult = (event: any) => {
        const results = Array.from(event.results);
        const isFinal = results[results.length - 1].isFinal;
        const transcript = results[results.length - 1][0].transcript;
        const confidence = results[results.length - 1][0].confidence;

        this.emit('realtimeResult', {
          text: transcript,
          confidence: confidence || 0,
          isFinal,
          timestamp: Date.now()
        });

        if (isFinal) {
          this.emit('transcriptionCompleted', {
            text: transcript,
            confidence: confidence || 0,
            language: recognition.lang,
            duration: 0,
            timestamp: Date.now()
          } as VoiceRecognitionResult);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('实时语音识别错误:', event.error);
        this.emit('error', { message: this.getSpeechRecognitionError(event.error) });
        recognition.stop();
      };

      recognition.onend = () => {
        this.emit('realtimeRecognitionStopped');
      };

      recognition.start();
      return true;
    } catch (error) {
      console.error('启动实时语音识别失败:', error);
      this.emit('error', { message: '实时语音识别启动失败' });
      return false;
    }
  }

  /**
   * 获取音量级别
   */
  getVolumeLevel(): number {
    if (!this.analyser || !this.isRecording) {
      return 0;
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }

    return Math.min(100, (sum / dataArray.length) * 2);
  }

  /**
   * 开始音量监控
   */
  private startVolumeMonitoring(): void {
    if (!this.analyser) return;

    const updateVolume = () => {
      const level = this.getVolumeLevel();
      this.emit('volumeChanged', { level, timestamp: Date.now() });
    };

    this.volumeMeter = setInterval(updateVolume, 100);
  }

  /**
   * 停止音量监控
   */
  private stopVolumeMonitoring(): void {
    if (this.volumeMeter) {
      clearInterval(this.volumeMeter);
      this.volumeMeter = null;
    }
  }

  /**
   * 获取支持的 MIME 类型
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  /**
   * 获取语音识别错误消息
   */
  private getSpeechRecognitionError(error: string): string {
    const errorMessages: { [key: string]: string } = {
      'no-speech': '未检测到语音',
      'audio-capture': '无法捕获音频',
      'not-allowed': '麦克风权限被拒绝',
      'network': '网络连接错误',
      'service-not-allowed': '语音识别服务不可用',
      'aborted': '语音识别被中止'
    };

    return errorMessages[error] || `语音识别错误: ${error}`;
  }

  /**
   * 事件监听
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * 移除事件监听
   */
  off(event: string, callback?: Function): void {
    if (!this.eventListeners[event]) return;

    if (callback) {
      const index = this.eventListeners[event].indexOf(callback);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    } else {
      this.eventListeners[event] = [];
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件监听器错误 (${event}):`, error);
        }
      });
    }
  }

  /**
   * 获取当前设置
   */
  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  /**
   * 更新设置
   */
  updateSettings(newSettings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.emit('settingsChanged', this.settings);
  }

  /**
   * 获取录音状态
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * 获取录音时长
   */
  getRecordingDuration(): number {
    if (!this.isRecording) return 0;
    return Date.now() - this.recordingStartTime;
  }

  /**
   * 暂停录音
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.emit('recordingPaused');
    }
  }

  /**
   * 恢复录音
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.emit('recordingResumed');
    }
  }

  /**
   * 取消录音
   */
  cancelRecording(): void {
    if (this.isRecording) {
      this.stopRecording();
      this.audioChunks = [];
      this.emit('recordingCancelled');
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopRecording();
    this.stopVolumeMonitoring();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // 清除所有事件监听器
    this.eventListeners = {};
  }

  /**
   * 音频格式转换
   */
  async convertAudioFormat(audioBlob: Blob, targetFormat: 'wav' | 'mp3' | 'ogg' = 'wav'): Promise<Blob> {
    try {
      const audioBuffer = await this.audioBufferFromBlob(audioBlob);
      const convertedBlob = await this.blobFromAudioBuffer(audioBuffer, targetFormat);
      return convertedBlob;
    } catch (error) {
      console.error('音频格式转换失败:', error);
      throw new Error('音频格式转换失败');
    }
  }

  /**
   * 从 Blob 创建 AudioBuffer
   */
  private async audioBufferFromBlob(blob: Blob): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('音频上下文未初始化');
    }

    const arrayBuffer = await blob.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * 从 AudioBuffer 创建 Blob
   */
  private async blobFromAudioBuffer(audioBuffer: AudioBuffer, format: string): Promise<Blob> {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    let buffer: ArrayBuffer;
    let mimeType: string;

    switch (format) {
      case 'wav':
        buffer = this.audioBufferToWav(audioBuffer);
        mimeType = 'audio/wav';
        break;
      case 'mp3':
        // 简化处理，实际应使用 LAME.js 等库
        buffer = this.audioBufferToWav(audioBuffer);
        mimeType = 'audio/mpeg';
        break;
      case 'ogg':
        buffer = this.audioBufferToWav(audioBuffer);
        mimeType = 'audio/ogg';
        break;
      default:
        throw new Error(`不支持的音频格式: ${format}`);
    }

    return new Blob([buffer], { type: mimeType });
  }

  /**
   * AudioBuffer 转 WAV
   */
  private audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM

    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV 文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // 写入音频数据
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }
}

// 创建单例实例
const voiceRecognitionService = new VoiceRecognitionService();

export default voiceRecognitionService;