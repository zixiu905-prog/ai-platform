import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import { 
  ImageIcon, 
  Download, 
  Play, 
  Pause, 
  RotateCcw, 
  Star, 
  Trash2, 
  Copy,
  Settings,
  Sparkles,
  History,
  Layers,
  Zap,
  Sliders
} from 'lucide-react';
import { ImageQuickActions } from './ImageQuickActions';
import { ImageAdvancedSettings } from './ImageAdvancedSettings';

interface ImageGenerationConfig {
  model: string;
  prompt: string;
  negativePrompt?: string;
  size: '1K' | '2K' | '4K';
  quality: number;
  steps: number;
  cfgScale: number;
  sampler: string;
  seed?: number;
  style?: string;
  watermark: boolean;
}

interface GenerationTask {
  id: string;
  config: ImageGenerationConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  estimatedTime?: number;
  priority: string;
}

interface ImageGenerationHistory {
  id: string;
  task: GenerationTask;
  savedTo: string[];
  tags: string[];
  rating?: number;
  notes?: string;
  favorited: boolean;
}

const extractTagsFromPrompt = (prompt: string): string[] => {
  return prompt.toLowerCase()
    .split(/[\s,]+/)
    .filter(word => word.length > 2)
    .slice(0, 10);
};

export const ImageGenerationWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState('generate');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [config, setConfig] = useState<ImageGenerationConfig>({
    model: 'doubao-seedream-4-5-251128',
    prompt: '',
    size: '2K',
    quality: 80,
    steps: 20,
    cfgScale: 7,
    sampler: 'DPM++ 2M Karras',
    watermark: true
  });
  const [advancedSettings, setAdvancedSettings] = useState({
    seed: null,
    steps: 20,
    cfgScale: 7,
    sampler: 'DPM++ 2M Karras',
    scheduler: 'Karras',
    width: 512,
    height: 512,
    aspectRatio: '1:1',
    clipSkip: 1,
    vae: 'default',
    controlnet: false,
    lora: false,
    batchCount: 1,
    batchSize: 1,
    tiling: false,
    format: 'PNG',
    quality: 80,
    metadata: true,
    watermark: true
  });
  const [activeTasks, setActiveTasks] = useState<GenerationTask[]>([]);
  const [history, setHistory] = useState<ImageGenerationHistory[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<GenerationTask | null>(null);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 从window获取electronAPI
  const electronAPI = (window as any).electronAPI;

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadActiveTasks, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadHistory = async () => {
    try {
      const response = await electronAPI.imageGeneration.getActiveTasks();
      if (response.success && response.data) {
        const historyData = response.data.map((task: any) => ({
          id: task.id,
          task: task,
          savedTo: [],
          tags: extractTagsFromPrompt(task.config.prompt),
          favorited: false
        }));
        setHistory(historyData);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const loadActiveTasks = async () => {
    try {
      const response = await electronAPI.imageGeneration.getActiveTasks();
      if (response.success) {
        setActiveTasks(response.data);
      }
    } catch (error) {
      console.error('Failed to load active tasks:', error);
    }
  };

  const handleSelectPreset = (preset: any) => {
    setPrompt(preset.prompt);
    if (preset.negativePrompt) {
      setNegativePrompt(preset.negativePrompt);
    }
    setConfig(prev => ({
      ...prev,
      prompt: preset.prompt,
      negativePrompt: preset.negativePrompt || ''
    }));
  };

  const handleGenerateMultiple = async (presets: any[]) => {
    setIsGenerating(true);
    try {
      const configs = presets.map(preset => ({
        ...config,
        prompt: preset.prompt,
        negativePrompt: preset.negativePrompt || ''
      }));
      
      const response = await electronAPI.imageGeneration.generateBatch(configs);
      if (response.success) {
        setActiveTasks(prev => [...prev, ...response.data]);
      }
    } catch (error) {
      console.error('Batch generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAdvancedPreset = (preset: any) => {
    setAdvancedSettings(preset);
    // 同时更新基础配置
    setConfig(prev => ({
      ...prev,
      steps: preset.steps,
      cfgScale: preset.cfgScale,
      sampler: preset.sampler
    }));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      return;
    }

    setIsGenerating(true);
    
    try {
      const generationConfig = { ...config, prompt, negativePrompt };
      
      // 调用实际API生成图片
      const response = await electronAPI.imageGeneration.generate(generationConfig);
      
      if (response.success) {
        const newTask = response.data;
        setActiveTasks(prev => [...prev, newTask]);
        
        // 开始轮询任务状态
        const pollInterval = setInterval(async () => {
          try {
            const taskResponse = await electronAPI.imageGeneration.getTask(newTask.id);
            if (taskResponse.success) {
              const updatedTask = taskResponse.data;
              setActiveTasks(prev => prev.map(task => 
                task.id === newTask.id ? updatedTask : task
              ));
              
              if (updatedTask.status === 'completed' || updatedTask.status === 'failed') {
                clearInterval(pollInterval);
                loadHistory();
                setIsGenerating(false);
              }
            }
          } catch (error) {
            console.error('Failed to poll task status:', error);
          }
        }, 2000);
      } else {
        console.error('Failed to start generation:', response.error);
        setIsGenerating(false);
      }

    } catch (error) {
      console.error('Generation failed:', error);
      setIsGenerating(false);
    }
  };

  const handleOptimizePrompt = async () => {
    try {
      // 调用提示词优化API
      const response = await electronAPI.imageGeneration.optimizePrompt(prompt);
      if (response.success) {
        const { optimizedPrompt, suggestions, improvements } = response.data;
        setPromptSuggestions(suggestions);
        if (improvements.length > 0) {
          // 可以显示改进建议
          console.log('Prompt improvements:', improvements);
        }
      }
    } catch (error) {
      console.error('Failed to optimize prompt:', error);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      const response = await electronAPI.imageGeneration.cancelTask(taskId);
      if (response.success) {
        setActiveTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: 'cancelled' } : task
        ));
      }
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  const handleSaveImage = async (taskId: string) => {
    try {
      const response = await electronAPI.imageGeneration.save(taskId);
      if (response.success) {
        console.log('Image saved to:', response.data.savePath);
        // 可以显示保存成功的提示
      }
    } catch (error) {
      console.error('Failed to save image:', error);
    }
  };

  const handleToggleFavorite = async (historyId: string) => {
    try {
      const response = await electronAPI.imageGeneration.toggleFavorite(historyId);
      if (response.success) {
        setHistory(prev => prev.map(h => 
          h.id === historyId ? { ...h, favorited: response.data.favorited } : h
        ));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    try {
      const response = await electronAPI.imageGeneration.deleteHistory(historyId);
      if (response.success) {
        setHistory(prev => prev.filter(h => h.id !== historyId));
      }
    } catch (error) {
      console.error('Failed to delete history:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Pause className="w-3 h-3" /> },
      processing: { variant: 'default', icon: <RotateCcw className="w-3 h-3" /> },
      completed: { variant: 'default', icon: <Sparkles className="w-3 h-3" /> },
      failed: { variant: 'destructive', icon: <Trash2 className="w-3 h-3" /> },
      cancelled: { variant: 'secondary', icon: <Pause className="w-3 h-3" /> }
    };

    const config = variants[status] || variants.pending;
    
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI图像生成工作台</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => loadHistory()}>
            <History className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            图像生成
          </TabsTrigger>
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            快速操作
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            任务管理
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            高级设置
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            历史记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                图像生成配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 提示词输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">提示词</label>
                <div className="flex gap-2">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="请描述您想要生成的图像..."
                    className="flex-1 min-h-[100px]"
                  />
                  <Button
                    variant="outline"
                    onClick={handleOptimizePrompt}
                    className="self-start"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    优化
                  </Button>
                </div>
                {promptSuggestions.length > 0 && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">建议添加：</p>
                    <div className="flex flex-wrap gap-2">
                      {promptSuggestions.map((suggestion, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => setPrompt(prev => `${prev}, ${suggestion}`)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 负面提示词 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">负面提示词</label>
                <Textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="描述不希望出现在图像中的内容..."
                  className="min-h-[60px]"
                />
              </div>

              {/* 基础设置 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">图像尺寸</label>
                  <Select value={config.size} onValueChange={(value: any) => setConfig(prev => ({ ...prev, size: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1K">1K (1024x1024)</SelectItem>
                      <SelectItem value="2K">2K (2048x2048)</SelectItem>
                      <SelectItem value="4K">4K (4096x4096)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">质量</label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={config.quality}
                      onChange={(value) => setConfig(prev => ({ ...prev, quality: value }))}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm w-10">{config.quality}%</span>
                  </div>
                </div>
              </div>

              {/* 高级设置 */}
              <div>
                <Button
                  variant="outline"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="mb-4"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {showAdvanced ? '隐藏' : '显示'}高级设置
                </Button>

                {showAdvanced && (
                  <div className="space-y-4 p-4 border rounded-md">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">采样步数</label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={config.steps}
                            onChange={(value) => setConfig(prev => ({ ...prev, steps: value }))}
                            min={1}
                            max={50}
                            step={1}
                            className="flex-1"
                          />
                          <span className="text-sm w-8">{config.steps}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">CFG Scale</label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={config.cfgScale}
                            onChange={(value) => setConfig(prev => ({ ...prev, cfgScale: value }))}
                            min={1}
                            max={20}
                            step={0.5}
                            className="flex-1"
                          />
                          <span className="text-sm w-10">{config.cfgScale}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">采样器</label>
                        <Select value={config.sampler} onValueChange={(value) => setConfig(prev => ({ ...prev, sampler: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DPM++ 2M Karras">DPM++ 2M Karras</SelectItem>
                            <SelectItem value="DPM++ SDE Karras">DPM++ SDE Karras</SelectItem>
                            <SelectItem value="Euler a">Euler a</SelectItem>
                            <SelectItem value="Euler">Euler</SelectItem>
                            <SelectItem value="DDIM">DDIM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="watermark"
                          checked={config.watermark}
                          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, watermark: checked }))}
                        />
                        <label htmlFor="watermark" className="text-sm font-medium">
                          添加水印
                        </label>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">种子值</label>
                        <Input
                          type="number"
                          value={config.seed || ''}
                          onChange={(e) => setConfig(prev => ({ ...prev, seed: e.target.value ? parseInt(e.target.value) : undefined }))}
                          placeholder="随机"
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 生成按钮 */}
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    生成图像
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick" className="space-y-6">
          <ImageQuickActions
            onSelectPreset={handleSelectPreset}
            onGenerateMultiple={handleGenerateMultiple}
          />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <ImageAdvancedSettings
            settings={advancedSettings}
            onSettingsChange={setAdvancedSettings}
            onApplyPreset={handleApplyAdvancedPreset}
          />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>当前任务</CardTitle>
            </CardHeader>
            <CardContent>
              {activeTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无活动任务
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(task.status)}
                          <span className="text-sm text-muted-foreground">
                            {task.createdAt.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {task.status === 'processing' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelTask(task.id)}
                            >
                              取消
                            </Button>
                          )}
                          {task.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSaveImage(task.id)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              保存
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {task.status === 'processing' && (
                        <div className="space-y-2">
                          <Progress value={task.progress} className="w-full" />
                          <p className="text-sm text-muted-foreground">
                            进度: {task.progress}% - 预计剩余: {Math.round(((task.estimatedTime || 0) * (100 - task.progress)) / 100 / 1000)}秒
                          </p>
                        </div>
                      )}
                      
                      <p className="text-sm mt-2">{task.config.prompt}</p>
                      
                      {task.error && (
                        <Alert className="mt-2">
                          <AlertDescription>{task.error}</AlertDescription>
                        </Alert>
                      )}
                      
                      {task.result?.url && (
                        <div className="mt-4">
                          <img 
                            src={task.result.url} 
                            alt="Generated image"
                            className="max-w-full h-auto rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>历史记录</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无历史记录
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.map((item) => (
                    <div key={item.id} className="border rounded-lg overflow-hidden">
                      <div className="aspect-square bg-muted relative">
                        {item.task.result?.url && (
                          <img 
                            src={item.task.result.url} 
                            alt="Generated image"
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleFavorite(item.id)}
                          >
                            <Star className={`w-4 h-4 ${item.favorited ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm line-clamp-2 mb-2">{item.task.config.prompt}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {item.task.config.size}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(item.task.config.prompt)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteHistory(item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};