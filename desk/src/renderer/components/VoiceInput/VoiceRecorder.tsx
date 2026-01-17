import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDesktopTheme } from '../../contexts/DesktopThemeContext';

interface VoiceRecorderProps {
  onRecordingStart?: () => void;
  onRecordingStop?: (audioBlob: Blob) => void;
  onTranscriptionComplete?: (text: string, confidence: number) => void;
  onError?: (error: string) => void;
  maxDuration?: number; // 最大录制时长（秒）
  className?: string;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
}

interface VoiceSettings {
  language: string;
  model: string;
  autoSubmit: boolean;
  confidenceThreshold: number;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingStart,
  onRecordingStop,
  onTranscriptionComplete,
  onError,
  maxDuration = 300,
  className = ''
}) => {
  const { theme } = useDesktopTheme();
  
  // 录制状态
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0
  });
  
  // 语音设置
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    language: 'zh-CN',
    model: 'whisper-1',
    autoSubmit: false,
    confidenceThreshold: 0.7
  });
  
  // 上传状态
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 录制相关引用
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // 获取语音设置
  useEffect(() => {
    loadVoiceSettings();
  }, []);

  // 清理资源
  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const loadVoiceSettings = async () => {
    try {
      const response = await fetch('/api/voice/settings', {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setVoiceSettings(result.data);
      }
    } catch (error) {
      console.error('加载语音设置失败:', error);
    }
  };

  // 开始录制
  const startRecording = async () => {
    try {
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      audioStreamRef.current = stream;

      // 创建音频上下文和分析器
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // 创建MediaRecorder
      const options = {
        mimeType: getSupportedMimeType(),
        audioBitsPerSecond: 128000
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;

      // 开始录制
      mediaRecorder.start(100); // 每100ms收集一次数据
      
      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingState(prev => {
          const newDuration = prev.duration + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return { ...prev, duration: newDuration };
        });
      }, 1000);

      // 开始音频级别监测
      startAudioLevelMonitoring();

      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0,
        audioLevel: 0
      }));

      onRecordingStart?.();
      
      console.log('录制开始');
    } catch (error) {
      console.error('录制启动失败:', error);
      onError?.('无法访问麦克风，请检查权限设置');
    }
  };

  // 停止录制
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      
      // 停止音频流
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      // 清理音频上下文
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // 停止计时
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // 停止音频级别监测
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        audioLevel: 0
      }));
      
      console.log('录制停止');
    }
  };

  // 暂停/恢复录制
  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (recordingState.isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingState(prev => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      
      setRecordingState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    }
  };

  // 处理录制停止
  const handleRecordingStop = async () => {
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
    
    setRecordingState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false,
      audioLevel: 0
    }));
    
    onRecordingStop?.(audioBlob);
    
    // 如果设置了自动提交，直接上传识别
    if (voiceSettings.autoSubmit) {
      await uploadAndTranscribe(audioBlob);
    }
  };

  // 上传并识别音频
  const uploadAndTranscribe = async (audioBlob: Blob) => {
    try {
      setIsUploading(true);
      setIsProcessing(true);

      const formData = new FormData();
      formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);
      formData.append('language', voiceSettings.language);
      formData.append('model', voiceSettings.model);

      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success) {
        const { text, confidence } = result.data;
        
        // 检查置信度阈值
        if (confidence >= voiceSettings.confidenceThreshold) {
          onTranscriptionComplete?.(text, confidence);
        } else {
          onError?.(`语音识别置信度较低 (${(confidence * 100).toFixed(1)}%)，请重新录制`);
        }
      } else {
        onError?.(result.message || '语音识别失败');
      }
    } catch (error) {
      console.error('上传音频失败:', error);
      onError?.('上传音频失败，请重试');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  // 手动上传识别
  const handleUpload = () => {
    if (chunksRef.current.length > 0) {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      uploadAndTranscribe(audioBlob);
    }
  };

  // 音频级别监测
  const startAudioLevelMonitoring = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateAudioLevel = () => {
      if (!recordingState.isRecording) return;

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = Math.min(100, (average / 128) * 100);

      setRecordingState(prev => ({ ...prev, audioLevel: normalizedLevel }));

      animationRef.current = requestAnimationFrame(updateAudioLevel);
    };

    updateAudioLevel();
  };

  // 获取支持的媒体类型
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取按钮样式
  const getButtonStyle = () => {
    const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2";
    
    if (recordingState.isRecording) {
      return `${baseStyle} bg-red-600 hover:bg-red-700 text-white`;
    }
    
    return `${baseStyle} bg-blue-600 hover:bg-blue-700 text-white`;
  };

  return (
    <div className={`voice-recorder ${className}`}>
      {/* 录制控制按钮 */}
      <div className="flex items-center space-x-3">
        {!recordingState.isRecording ? (
          <button
            onClick={startRecording}
            disabled={isUploading || isProcessing}
            className={getButtonStyle()}
          >
            <span>🎤</span>
            <span>开始录制</span>
          </button>
        ) : (
          <>
            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <span>⏹️</span>
              <span>停止录制</span>
            </button>
            
            <button
              onClick={togglePause}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-all duration-200"
            >
              {recordingState.isPaused ? '▶️' : '⏸️'}
            </button>
          </>
        )}
        
        {/* 上传按钮 */}
        {!recordingState.isRecording && chunksRef.current.length > 0 && !voiceSettings.autoSubmit && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
          >
            <span>📤</span>
            <span>{isUploading ? '上传中...' : '识别语音'}</span>
          </button>
        )}
      </div>

      {/* 录制状态显示 */}
      {(recordingState.isRecording || recordingState.duration > 0) && (
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${recordingState.isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-sm font-medium">
                {recordingState.isRecording ? '录制中' : '已停止'} {recordingState.isPaused && '(已暂停)'}
              </span>
              <span className="text-sm text-gray-400">
                {formatTime(recordingState.duration)}
              </span>
            </div>
            
            <div className="text-sm text-gray-400">
              最大时长: {formatTime(maxDuration)}
            </div>
          </div>
          
          {/* 音频级别指示器 */}
          {recordingState.isRecording && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400">音频级别</div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${recordingState.audioLevel}%` }}
                />
              </div>
            </div>
          )}
          
          {/* 处理状态 */}
          {(isUploading || isProcessing) && (
            <div className="mt-3 flex items-center space-x-2 text-sm text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>
                {isUploading ? '上传音频中...' : '语音识别中...'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 语音设置显示 */}
      <div className="mt-3 text-xs text-gray-500 flex items-center space-x-4">
        <span>语言: {voiceSettings.language}</span>
        <span>模型: {voiceSettings.model}</span>
        <span>置信度阈值: {(voiceSettings.confidenceThreshold * 100).toFixed(0)}%</span>
        {voiceSettings.autoSubmit && <span className="text-blue-400">自动提交</span>}
      </div>
    </div>
  );
};