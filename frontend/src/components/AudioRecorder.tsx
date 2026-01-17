import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause,
  Volume2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { Badge } from '@/components/ui/badge';

interface AudioRecorderProps {
  onTranscriptionComplete?: (text: string, confidence: number) => void;
  onTranscriptionError?: (error: string) => void;
  className?: string;
}

interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  processingTime: number;
  provider: string;
  model: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscriptionComplete,
  onTranscriptionError,
  className
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioURL, setAudioURL] = useState<string>('');
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;
      mediaRecorder.start(100); // 100ms片段
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('无法访问麦克风:', error);
      onTranscriptionError?.('无法访问麦克风，请检查权限设置');
    }
  }, [onTranscriptionError]);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // 暂停/恢复录音
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    setIsPaused(!isPaused);
  }, [isPaused, isRecording]);

  // 处理录音停止
  const handleRecordingStop = useCallback(() => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
    const url = URL.createObjectURL(audioBlob);
    setAudioURL(url);

    // 自动开始转录
    transcribeAudio(audioBlob);
  }, []);

  // 转录音频
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setTranscriptionResult(null);

      // 创建FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', 'zh-CN'); // 默认中文
      formData.append('model', 'whisper-1');
      formData.append('enablePunctuation', 'true');
      formData.append('noiseReduction', 'true');

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('转录请求失败');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '转录失败');
      }

      setTranscriptionResult(result.data);
      onTranscriptionComplete?.(result.data.text, result.data.confidence);

    } catch (error) {
      console.error('音频转录失败:', error);
      const errorMessage = error instanceof Error ? error.message : '音频转录失败';
      onTranscriptionError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [onTranscriptionComplete, onTranscriptionError]);

  // 重新录音
  const resetRecording = useCallback(() => {
    setAudioURL('');
    setTranscriptionResult(null);
    setRecordingTime(0);
    setIsPaused(false);
    audioChunksRef.current = [];
  }, []);

  // 清理资源
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* 录音控制区域 */}
          <div className="flex flex-col items-center space-y-4">
            {/* 录音状态指示器 */}
            <div className="relative">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors ${
                isRecording 
                  ? isPaused ? 'bg-yellow-100' : 'bg-red-100' 
                  : 'bg-gray-100'
              }`}>
                {isRecording ? (
                  isPaused ? (
                    <Pause className="h-10 w-10 text-yellow-600" />
                  ) : (
                    <>
                      <Mic className="h-10 w-10 text-red-600 animate-pulse" />
                      <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping"></div>
                    </>
                  )
                ) : (
                  <Mic className="h-10 w-10 text-gray-600" />
                )}
              </div>
            </div>

            {/* 录音时间 */}
            {isRecording && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
                <Badge variant={isPaused ? "secondary" : "destructive"}>
                  {isPaused ? '已暂停' : '录音中'}
                </Badge>
              </div>
            )}

            {/* 控制按钮 */}
            <div className="flex items-center space-x-3">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="h-12 px-8"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  开始录音
                </Button>
              ) : (
                <>
                  <Button
                    onClick={togglePause}
                    variant="outline"
                    size="lg"
                    disabled={isProcessing}
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        继续
                      </>
                    ) : (
                      <>
                        <Pause className="h-5 w-5 mr-2" />
                        暂停
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    size="lg"
                    disabled={isProcessing}
                  >
                    <Square className="h-5 w-5 mr-2" />
                    停止
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 处理状态 */}
          {isProcessing && (
            <div className="flex items-center justify-center space-y-3 py-4 border rounded-lg bg-gray-50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div>
                <p className="font-medium">正在转录音频...</p>
                <p className="text-sm text-muted-foreground">请稍候，这可能需要几秒钟</p>
              </div>
            </div>
          )}

          {/* 音频播放器 */}
          {audioURL && !isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">录音回放</span>
                <Button
                  onClick={resetRecording}
                  variant="outline"
                  size="sm"
                >
                  重新录音
                </Button>
              </div>
              <audio 
                controls 
                className="w-full" 
                src={audioURL}
              />
            </div>
          )}

          {/* 转录结果 */}
          {transcriptionResult && (
            <div className="space-y-3 border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">转录结果</h4>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {transcriptionResult.provider}
                  </Badge>
                  <Badge variant="secondary">
                    置信度: {(transcriptionResult.confidence * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <p className="text-sm leading-relaxed">
                {transcriptionResult.text}
              </p>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>处理时间: {transcriptionResult.processingTime}ms</span>
                <span>语言: {transcriptionResult.language}</span>
                <span>模型: {transcriptionResult.model}</span>
              </div>
            </div>
          )}

          {/* 使用提示 */}
          <div className="flex items-start space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">使用提示：</p>
              <ul className="space-y-1 text-xs">
                <li>• 请在安静环境中录音以获得更好的识别效果</li>
                <li>• 说话清晰，语速适中</li>
                <li>• 单次录音建议不超过60秒</li>
                <li>• 支持中文和英文语音识别</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;