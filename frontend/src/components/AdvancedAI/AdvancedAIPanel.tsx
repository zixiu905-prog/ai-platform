import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Image, 
  Mic, 
  Upload, 
  Download, 
  Play, 
  Pause,
  Settings,
  Sparkles,
  Zap,
  Camera,
  Volume2,
  FileAudio,
  Layers,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface GenerationRequest {
  type: 'image' | 'speech' | 'multimodal';
  config: any;
}

interface GenerationResult {
  success: boolean;
  data?: any;
  cost?: number;
  error?: string;
}

export const AdvancedAIPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  
  // 图像生成状态
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('realistic');
  const [imageModel, setImageModel] = useState('stable-diffusion');
  const [imageWidth, setImageWidth] = useState(512);
  const [imageHeight, setImageHeight] = useState(512);
  const [imageSteps, setImageSteps] = useState(20);
  const [negativePrompt, setNegativePrompt] = useState('');
  
  // 语音合成状态
  const [speechText, setSpeechText] = useState('');
  const [voiceModel, setVoiceModel] = useState('google-tts');
  const [voice, setVoice] = useState('default');
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [audioFormat, setAudioFormat] = useState('mp3');
  
  // 多模态状态
  const [multimodalText, setMultimodalText] = useState('');
  const [multimodalTask, setMultimodalTask] = useState('analyze');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const imageStyles = [
    { value: 'realistic', label: '写实风格' },
    { value: 'artistic', label: '艺术风格' },
    { value: 'cartoon', label: '卡通风格' },
    { value: '3d', label: '3D风格' },
    { value: 'sketch', label: '素描风格' }
  ];

  const imageModels = [
    { value: 'stable-diffusion', label: 'Stable Diffusion', cost: '低成本' },
    { value: 'dall-e', label: 'DALL-E', cost: '高质量' },
    { value: 'midjourney', label: 'Midjourney', cost: '艺术性' },
    { value: 'leonardo', label: 'Leonardo AI', cost: '平衡' }
  ];

  const voiceModels = [
    { value: 'google-tts', label: 'Google TTS' },
    { value: 'elevenlabs', label: 'ElevenLabs' },
    { value: 'azure-tts', label: 'Azure TTS' },
    { value: 'openai-tts', label: 'OpenAI TTS' }
  ];

  const multimodalTasks = [
    { value: 'analyze', label: '内容分析', icon: '🔍' },
    { value: 'generate', label: '创意生成', icon: '✨' },
    { value: 'translate', label: '翻译转换', icon: '🌐' },
    { value: 'summarize', label: '内容总结', icon: '📝' }
  ];

  // 生成图像
  const generateImage = async () => {
    if (!imagePrompt.trim()) return;

    setIsGenerating(true);
    setProgress(0);
    setCurrentTask('生成图像...');

    const config = {
      prompt: imagePrompt,
      style: imageStyle,
      width: imageWidth,
      height: imageHeight,
      steps: imageSteps,
      negativePrompt,
      model: imageModel
    };

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const response = await fetch('/api/ai/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });

      clearInterval(progressInterval);
      setProgress(100);

      const result: GenerationResult = await response.json();
      
      if (result.success && result.data) {
        setResults(prev => [...prev, result]);
        setTotalCost(prev => prev + (result.data.cost || 0));
      } else {
        throw new Error(result.error || '生成失败');
      }
    } catch (error) {
      console.error('图像生成失败:', error);
      setResults(prev => [...prev, {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }]);
    } finally {
      setIsGenerating(false);
      setCurrentTask(null);
      setProgress(0);
    }
  };

  // 生成语音
  const synthesizeSpeech = async () => {
    if (!speechText.trim()) return;

    setIsGenerating(true);
    setProgress(0);
    setCurrentTask('合成语音...');

    const config = {
      text: speechText,
      voice,
      language: 'zh-CN',
      speed: speechSpeed,
      format: audioFormat,
      model: voiceModel
    };

    try {
      const response = await fetch('/api/ai/speech/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });

      const result: GenerationResult = await response.json();
      
      if (result.success && result.data) {
        setResults(prev => [...prev, result]);
        setTotalCost(prev => prev + (result.data.cost || 0));
      } else {
        throw new Error(result.error || '语音合成失败');
      }
    } catch (error) {
      console.error('语音合成失败:', error);
      setResults(prev => [...prev, {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }]);
    } finally {
      setIsGenerating(false);
      setCurrentTask(null);
      setProgress(0);
    }
  };

  // 多模态处理
  const processMultimodal = async () => {
    setIsGenerating(true);
    setProgress(0);
    setCurrentTask('多模态AI处理...');

    const formData = new FormData();
    formData.append('taskType', multimodalTask);
    if (multimodalText) formData.append('text', multimodalText);
    if (uploadedImage) formData.append('image', uploadedImage);
    if (uploadedAudio) formData.append('audio', uploadedAudio);

    try {
      const response = await fetch('/api/ai/multimodal/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result: GenerationResult = await response.json();
      
      if (result.success && result.data) {
        setResults(prev => [...prev, result]);
        setTotalCost(prev => prev + (result.data.cost || 0));
      } else {
        throw new Error(result.error || '多模态处理失败');
      }
    } catch (error) {
      console.error('多模态处理失败:', error);
      setResults(prev => [...prev, {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }]);
    } finally {
      setIsGenerating(false);
      setCurrentTask(null);
      setProgress(0);
    }
  };

  // 清空结果
  const clearResults = () => {
    setResults([]);
    setTotalCost(0);
  };

  return (
    <div className="space-y-6">
      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            高级AI功能
          </h2>
          <p className="text-muted-foreground">
            图像生成、语音合成、多模态AI处理
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">总成本</div>
            <div className="text-lg font-semibold">¥{totalCost.toFixed(4)}</div>
          </div>
          <Button variant="outline" onClick={clearResults} disabled={results.length === 0}>
            清空结果
          </Button>
        </div>
      </div>

      {/* 进度显示 */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="animate-spin">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span>{currentTask}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 主要功能标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="image" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            图像生成
          </TabsTrigger>
          <TabsTrigger value="speech" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            语音处理
          </TabsTrigger>
          <TabsTrigger value="multimodal" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            多模态AI
          </TabsTrigger>
        </TabsList>

        {/* 图像生成面板 */}
        <TabsContent value="image" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                AI图像生成
              </CardTitle>
              <CardDescription>
                输入文字描述，AI为您生成精美图像
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>文字描述</Label>
                <Textarea
                  placeholder="描述您想要生成的图像，例如：一只可爱的小猫坐在彩虹上..."
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>艺术风格</Label>
                  <Select value={imageStyle} onValueChange={setImageStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {imageStyles.map(style => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>AI模型</Label>
                  <Select value={imageModel} onValueChange={setImageModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {imageModels.map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label} ({model.cost})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>负面描述 (可选)</Label>
                <Input
                  placeholder="不希望出现在图像中的内容..."
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>宽度</Label>
                  <Input
                    type="number"
                    value={imageWidth}
                    onChange={(e) => setImageWidth(Number(e.target.value))}
                    min={256}
                    max={1024}
                    step={64}
                  />
                </div>
                <div className="space-y-2">
                  <Label>高度</Label>
                  <Input
                    type="number"
                    value={imageHeight}
                    onChange={(e) => setImageHeight(Number(e.target.value))}
                    min={256}
                    max={1024}
                    step={64}
                  />
                </div>
                <div className="space-y-2">
                  <Label>生成步数</Label>
                  <Input
                    type="number"
                    value={imageSteps}
                    onChange={(e) => setImageSteps(Number(e.target.value))}
                    min={10}
                    max={50}
                    step={5}
                  />
                </div>
              </div>

              <Button 
                onClick={generateImage} 
                disabled={!imagePrompt.trim() || isGenerating}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                生成图像
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 语音处理面板 */}
        <TabsContent value="speech" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="h-5 w-5" />
                语音合成
              </CardTitle>
              <CardDescription>
                将文字转换为自然语音
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>要转换的文字</Label>
                <Textarea
                  placeholder="输入要转换为语音的文字内容..."
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>语音模型</Label>
                  <Select value={voiceModel} onValueChange={setVoiceModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceModels.map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>音频格式</Label>
                  <Select value={audioFormat} onValueChange={setAudioFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp3">MP3</SelectItem>
                      <SelectItem value="wav">WAV</SelectItem>
                      <SelectItem value="ogg">OGG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>语音</Label>
                  <Select value={voice} onValueChange={setVoice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">默认语音</SelectItem>
                      <SelectItem value="female">女声</SelectItem>
                      <SelectItem value="male">男声</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>语速</Label>
                  <Input
                    type="number"
                    value={speechSpeed}
                    onChange={(e) => setSpeechSpeed(Number(e.target.value))}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                  />
                </div>
              </div>

              <Button 
                onClick={synthesizeSpeech} 
                disabled={!speechText.trim() || isGenerating}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                生成语音
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 多模态AI面板 */}
        <TabsContent value="multimodal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                多模态AI处理
              </CardTitle>
              <CardDescription>
                文本、图像、音频的智能分析和处理
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>处理任务</Label>
                <Select value={multimodalTask} onValueChange={setMultimodalTask}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {multimodalTasks.map(task => (
                      <SelectItem key={task.value} value={task.value}>
                        {task.icon} {task.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>文本内容 (可选)</Label>
                <Textarea
                  placeholder="输入相关的文本描述或问题..."
                  value={multimodalText}
                  onChange={(e) => setMultimodalText(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>上传图像 (可选)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={(e) => setUploadedImage(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      选择图像
                    </Button>
                    {uploadedImage && (
                      <Badge variant="secondary">
                        {uploadedImage.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>上传音频 (可选)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="audio/*"
                      ref={audioInputRef}
                      onChange={(e) => setUploadedAudio(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => audioInputRef.current?.click()}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      选择音频
                    </Button>
                    {uploadedAudio && (
                      <Badge variant="secondary">
                        {uploadedAudio.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                onClick={processMultimodal} 
                disabled={isGenerating || (!multimodalText.trim() && !uploadedImage && !uploadedAudio)}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                开始处理
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 结果展示区域 */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              处理结果
            </CardTitle>
            <CardDescription>
              共 {results.length} 个结果，成功 {results.filter(r => r.success).length} 个
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  {result.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="default" className="bg-green-500">
                          成功
                        </Badge>
                        {result.data?.cost && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            ¥{result.data.cost.toFixed(4)}
                          </div>
                        )}
                      </div>
                      
                      {result.data?.imageUrl && (
                        <div className="mt-2">
                          <img 
                            src={result.data.imageUrl} 
                            alt="Generated image" 
                            className="max-w-full h-auto rounded border"
                          />
                        </div>
                      )}
                      
                      {result.data?.audioUrl && (
                        <div className="flex items-center gap-2">
                          <audio controls className="flex-1">
                            <source src={result.data.audioUrl} />
                          </audio>
                        </div>
                      )}
                      
                      {result.data?.result && (
                        <div className="p-3 bg-gray-50 rounded">
                          <pre className="text-sm whitespace-pre-wrap">
                            {JSON.stringify(result.data.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{result.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedAIPanel;