import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square,
  Download,
  Upload,
  Settings,
  Volume2,
  Globe,
  Clock,
  Zap,
  Languages,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';

interface RecognitionResult {
  transcript: string;
  confidence: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
  language?: string;
  duration?: number;
}

interface RecognitionHistory {
  id: string;
  original_file?: string;
  transcript: string;
  language: string;
  model: string;
  confidence: number;
  duration: number;
  created_at: string;
  cost: number;
}

const SpeechRecognition: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [activeTab, setActiveTab] = useState('realtime');
  const [language, setLanguage] = useState('zh-CN');
  const [model, setModel] = useState('whisper-1');
  const [realtimeText, setRealtimeText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [history, setHistory] = useState<RecognitionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(false);
  const [enablePunctuation, setEnablePunctuation] = useState(true);
  const [enableTimestamps, setEnableTimestamps] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    loadHistory();
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/speech/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      // 设置音频分析器
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // 监听音频电平
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 128) * 100));
          if (isRecording && !isPaused) {
            requestAnimationFrame(updateAudioLevel);
          }
        }
      };
      updateAudioLevel();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);

      // 开始计时
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('开始录音');
    } catch (error) {
      toast.error('无法访问麦克风，请检查权限设置');
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      toast.info('录音已暂停');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      toast.info('继续录音');
    }
  };

  const handleRecordingStop = async () => {
    if (audioChunksRef.current.length === 0) {
      toast.error('录音数据为空');
      return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    await processAudio(audioBlob);
  };

  const processAudio = async (audioBlob: Blob) => {
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', autoDetectLanguage ? 'auto' : language);
      formData.append('model', model);
      formData.append('format', 'json');
      formData.append('enable_punctuation', enablePunctuation.toString());
      formData.append('enable_timestamps', enableTimestamps.toString());

      const response = await fetch('/api/speech/recognize', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result: RecognitionResult = await response.json();
        setRecognitionResult(result);
        setFinalText(result.transcript);
        toast.success('语音识别完成');
        loadHistory();
      } else {
        const error = await response.json();
        toast.error(error.message || '语音识别失败');
      }
    } catch (error) {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/webm', 'audio/mpeg'];
    if (!validTypes.includes(file.type)) {
      toast.error('不支持的音频格式');
      return;
    }

    // 检查文件大小 (最大100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('文件大小不能超过100MB');
      return;
    }

    setUploadFile(file);
    await processAudio(file);
  };

  const downloadTranscript = () => {
    if (!recognitionResult) return;

    let content = '';
    if (recognitionResult.segments && enableTimestamps) {
      content = recognitionResult.segments
        .map(segment => `[${formatTime(segment.start)}] ${segment.text}`)
        .join('\n');
    } else {
      content = recognitionResult.transcript;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('转录文件下载成功');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRecordingTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Mic className="w-8 h-8 text-blue-600" />
          语音识别
        </h1>
        <p className="text-gray-600 mt-2">高精度语音转文字，支持多语言实时识别</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="realtime">实时录音</TabsTrigger>
          <TabsTrigger value="upload">文件上传</TabsTrigger>
          <TabsTrigger value="history">识别历史</TabsTrigger>
        </TabsList>

        {/* 实时录音 */}
        <TabsContent value="realtime" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 录音控制面板 */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  录音设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="language">识别语言</Label>
                  <Select value={language} onValueChange={(value: string) => setLanguage(value)} disabled={autoDetectLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">中文 (普通话)</SelectItem>
                      <SelectItem value="zh-TW">中文 (台湾)</SelectItem>
                      <SelectItem value="en-US">英语 (美国)</SelectItem>
                      <SelectItem value="en-GB">英语 (英国)</SelectItem>
                      <SelectItem value="ja-JP">日语</SelectItem>
                      <SelectItem value="ko-KR">韩语</SelectItem>
                      <SelectItem value="es-ES">西班牙语</SelectItem>
                      <SelectItem value="fr-FR">法语</SelectItem>
                      <SelectItem value="de-DE">德语</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="model">识别模型</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whisper-1">Whisper (推荐)</SelectItem>
                      <SelectItem value="whisper-large">Whisper Large</SelectItem>
                      <SelectItem value="azure-speech">Azure Speech</SelectItem>
                      <SelectItem value="aliyun-nls">阿里云语音</SelectItem>
                      <SelectItem value="volcengine">火山引擎</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>自动检测语言</Label>
                    <Switch
                      checked={autoDetectLanguage}
                      onCheckedChange={setAutoDetectLanguage}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>自动添加标点</Label>
                    <Switch
                      checked={enablePunctuation}
                      onCheckedChange={setEnablePunctuation}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>显示时间戳</Label>
                    <Switch
                      checked={enableTimestamps}
                      onCheckedChange={setEnableTimestamps}
                    />
                  </div>
                </div>

                {/* 录音控制按钮 */}
                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    {/* 音频电平显示 */}
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">音频电平</Label>
                        <span className="text-sm text-gray-600">{Math.round(audioLevel)}%</span>
                      </div>
                      <Progress value={audioLevel} className="w-full" />
                    </div>

                    {/* 录音时间 */}
                    <div className="text-center">
                      <div className="text-2xl font-mono font-bold">
                        {formatRecordingTime(recordingTime)}
                      </div>
                      <div className="text-sm text-gray-600">录音时长</div>
                    </div>

                    {/* 控制按钮 */}
                    <div className="flex gap-2">
                      {!isRecording ? (
                        <Button
                          onClick={startRecording}
                          size="lg"
                          className="flex-1"
                        >
                          <Mic className="w-5 h-5 mr-2" />
                          开始录音
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={stopRecording}
                            size="lg"
                            variant="destructive"
                          >
                            <Square className="w-5 h-5" />
                          </Button>
                          {!isPaused ? (
                            <Button
                              onClick={pauseRecording}
                              size="lg"
                              variant="outline"
                            >
                              <Pause className="w-5 h-5" />
                            </Button>
                          ) : (
                            <Button
                              onClick={resumeRecording}
                              size="lg"
                              variant="outline"
                            >
                              <Play className="w-5 h-5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 实时识别结果 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  识别结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">正在识别语音...</p>
                    </div>
                  </div>
                ) : recognitionResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{model}</Badge>
                        <Badge variant="outline">
                          置信度: {Math.round((recognitionResult.confidence || 0) * 100)}%
                        </Badge>
                        {recognitionResult.language && (
                          <Badge variant="outline">{recognitionResult.language}</Badge>
                        )}
                        {recognitionResult.duration && (
                          <Badge variant="outline">时长: {formatTime(recognitionResult.duration)}</Badge>
                        )}
                      </div>
                      <Button onClick={downloadTranscript} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        下载
                      </Button>
                    </div>

                    <Textarea
                      value={finalText}
                      onChange={(e) => setFinalText(e.target.value)}
                      placeholder="识别结果将显示在这里..."
                      rows={12}
                      className="min-h-[300px]"
                    />

                    {/* 分段显示 */}
                    {recognitionResult.segments && enableTimestamps && (
                      <div className="mt-6">
                        <Label className="text-sm font-medium">分段结果</Label>
                        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                          {recognitionResult.segments.map((segment, index) => (
                            <div key={index} className="flex gap-3 text-sm p-2 bg-gray-50 rounded">
                              <span className="text-gray-500 font-mono">
                                [{formatTime(segment.start)}]
                              </span>
                              <span className="flex-1">{segment.text}</span>
                              <span className="text-gray-400">
                                {Math.round(segment.confidence * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <MicOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>请点击"开始录音"或上传音频文件</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 文件上传 */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                文件上传识别
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:underline">
                    点击上传音频文件
                  </Label>
                  <input
                    id="file-upload"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-600">
                    支持 WAV, MP3, M4A, WebM 格式，最大 100MB
                  </p>
                </div>
              </div>

              {uploadFile && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{uploadFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{uploadFile.type}</Badge>
                </div>
              )}

              {recognitionResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">识别结果</h3>
                    <Button onClick={downloadTranscript} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      下载
                    </Button>
                  </div>
                  <Textarea
                    value={finalText}
                    onChange={(e) => setFinalText(e.target.value)}
                    rows={12}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 历史记录 */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  识别历史
                </div>
                <Button onClick={loadHistory} variant="outline" size="sm">
                  刷新
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无识别历史</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{item.model}</Badge>
                          <Badge variant="outline">{item.language}</Badge>
                          <Badge>¥{item.cost.toFixed(4)}</Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">
                        <span className="font-medium">置信度:</span> {Math.round(item.confidence * 100)}%
                        {item.duration && (
                          <span className="ml-4">
                            <span className="font-medium">时长:</span> {formatTime(item.duration)}
                          </span>
                        )}
                      </p>
                      <div className="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                        <p className="text-sm whitespace-pre-wrap">{item.transcript}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Alert className="mt-8">
        <AlertDescription>
          <strong>使用提示：</strong>
          语音识别会消耗API配额。为保证最佳效果，请在安静环境下录音，保持正常语速和清晰发音。
          支持最长3小时的音频文件识别。
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SpeechRecognition;