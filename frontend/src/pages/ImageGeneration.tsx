import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { 
  Loader2, 
  Download, 
  RefreshCw, 
  Sparkles, 
  Image as ImageIcon,
  Palette,
  Settings,
  Zap,
  Eye,
  Grid3X3,
  Maximize2,
  Wand2
} from 'lucide-react';
import { toast } from 'sonner';

interface ImageData {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

interface GenerationResponse {
  id: string;
  object: string;
  created: number;
  data: ImageData[];
  cost?: number;
  model?: string;
}

interface GenerationHistory {
  id: string;
  prompt: string;
  model: string;
  size: string;
  images: ImageData[];
  created_at: string;
  cost: number;
}

const ImageGeneration: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('single');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('dall-e-3');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard');
  const [style, setStyle] = useState<'natural' | 'vivid'>('natural');
  const [responseFormat, setResponseFormat] = useState<'url' | 'b64_json'>('url');
  const [generatedImages, setGeneratedImages] = useState<GenerationResponse[]>([]);
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 批量生成
  const [batchPrompts, setBatchPrompts] = useState<string[]>(['', '', '', '']);
  const [batchGenerating, setBatchGenerating] = useState(false);
  
  // 设计专用参数
  const [designType, setDesignType] = useState<'logo' | 'poster' | 'banner' | 'icon' | 'illustration'>('logo');
  const [colorScheme, setColorScheme] = useState<string[]>(['blue', 'white']);
  const [designStyle, setDesignStyle] = useState<'modern' | 'classic' | 'minimalist' | 'industrial' | 'artistic'>('modern');
  
  // 创意增强参数
  const [creativityLevel, setCreativityLevel] = useState([50]);
  const [detailLevel, setDetailLevel] = useState([70]);
  const [iterations, setIterations] = useState([1]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/ai/image/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('请输入图像描述');
      return;
    }

    setLoading(true);
    setProgress(0);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const requestBody: any = {
        prompt,
        model,
        size,
        quality,
        style,
        n: iterations[0],
        response_format: responseFormat
      };

      // 如果是设计模式，添加设计参数
      if (activeTab === 'design') {
        requestBody.design_type = designType;
        requestBody.color_scheme = colorScheme;
        requestBody.design_style = designStyle;
        requestBody.creativity_level = creativityLevel[0];
        requestBody.detail_level = detailLevel[0];
      }

      const response = await fetch('/api/ai/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const result: GenerationResponse = await response.json();
        setGeneratedImages(prev => [result, ...prev]);
        
        // 显示成本信息
        if (result.cost) {
          toast.success(`图像生成成功！成本: ¥${result.cost.toFixed(4)}`);
        } else {
          toast.success('图像生成成功！');
        }
        
        // 刷新历史记录
        loadHistory();
      } else {
        const error = await response.json();
        toast.error(error.message || '图像生成失败');
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const generateBatch = async () => {
    const validPrompts = batchPrompts.filter(p => p.trim());
    if (validPrompts.length === 0) {
      toast.error('请至少输入一个有效的图像描述');
      return;
    }

    setBatchGenerating(true);
    
    try {
      const response = await fetch('/api/ai/image/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompts: validPrompts,
          model,
          size,
          quality,
          style,
          n: 1
        })
      });

      if (response.ok) {
        const results: GenerationResponse[] = await response.json();
        setGeneratedImages(prev => [...results, ...prev]);
        toast.success(`批量生成成功！共生成 ${results.length} 张图像`);
        loadHistory();
      } else {
        const error = await response.json();
        toast.error(error.message || '批量生成失败');
      }
    } catch (error) {
      toast.error('网络错误，请重试');
    } finally {
      setBatchGenerating(false);
    }
  };

  const downloadImage = async (imageData: ImageData, index: number) => {
    try {
      if (imageData.url) {
        // 从URL下载
        const response = await fetch(imageData.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated_image_${Date.now()}_${index}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (imageData.b64_json) {
        // 从base64下载
        const a = document.createElement('a');
        a.href = `data:image/png;base64,${imageData.b64_json}`;
        a.download = `generated_image_${Date.now()}_${index}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      toast.success('图像下载成功');
    } catch (error) {
      toast.error('下载失败');
    }
  };

  const renderImageCard = (response: GenerationResponse, responseIndex: number) => (
    <Card key={response.id} className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            生成结果 #{responseIndex + 1}
          </div>
          <div className="flex items-center gap-2">
            {response.model && (
              <Badge variant="secondary">{response.model}</Badge>
            )}
            {response.cost && (
              <Badge variant="outline">¥{response.cost.toFixed(4)}</Badge>
            )}
          </div>
        </CardTitle>
        {response.data[0]?.revised_prompt && (
          <p className="text-sm text-gray-600">
            优化后描述: {response.data[0].revised_prompt}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {response.data.map((imageData, imageIndex) => (
            <div key={imageIndex} className="relative group">
              {imageData.url ? (
                <img 
                  src={imageData.url} 
                  alt={`Generated image ${imageIndex + 1}`}
                  className="w-full h-auto rounded-lg shadow-md transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              ) : imageData.b64_json ? (
                <img 
                  src={`data:image/png;base64,${imageData.b64_json}`}
                  alt={`Generated image ${imageIndex + 1}`}
                  className="w-full h-auto rounded-lg shadow-md transition-transform group-hover:scale-105"
                />
              ) : null}
              
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadImage(imageData, imageIndex)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.open(imageData.url, '_blank');
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-blue-600" />
          AI图像生成
        </h1>
        <p className="text-gray-600 mt-2">使用先进的AI技术生成高质量图像</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="single">单图生成</TabsTrigger>
          <TabsTrigger value="batch">批量生成</TabsTrigger>
          <TabsTrigger value="design">设计专用</TabsTrigger>
          <TabsTrigger value="history">历史记录</TabsTrigger>
        </TabsList>

        {/* 单图生成 */}
        <TabsContent value="single" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                图像生成设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prompt">图像描述</Label>
                    <Textarea
                      id="prompt"
                      placeholder="描述您想要生成的图像，例如：一只可爱的橙色猫咪坐在樱花树下，阳光明媚，超写实风格"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="model">AI模型</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                          <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
                          <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
                          <SelectItem value="doubao-seedream">豆包SeedDream</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="size">图像尺寸</Label>
                      <Select value={size} onValueChange={setSize}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="256x256">256x256</SelectItem>
                          <SelectItem value="512x512">512x512</SelectItem>
                          <SelectItem value="1024x1024">1024x1024</SelectItem>
                          <SelectItem value="1024x1792">1024x1792 (竖版)</SelectItem>
                          <SelectItem value="1792x1024">1792x1024 (横版)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quality">图像质量</Label>
                      <Select value={quality} onValueChange={(value: string) => setQuality(value as 'standard' | 'hd')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">标准</SelectItem>
                          <SelectItem value="hd">高清</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="style">图像风格</Label>
                      <Select value={style} onValueChange={(value: string) => setStyle(value as 'natural' | 'vivid')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="natural">自然</SelectItem>
                          <SelectItem value="vivid">鲜艳</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>高级设置</Label>
                    <Switch
                      checked={showAdvanced}
                      onCheckedChange={setShowAdvanced}
                    />
                  </div>

                  {showAdvanced && (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <div>
                        <Label>生成数量: {iterations[0]}</Label>
                        <Slider
                          value={iterations}
                          onValueChange={setIterations}
                          max={4}
                          min={1}
                          step={1}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label>创意程度: {creativityLevel[0]}%</Label>
                        <Slider
                          value={creativityLevel}
                          onValueChange={setCreativityLevel}
                          max={100}
                          min={0}
                          step={10}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label>细节程度: {detailLevel[0]}%</Label>
                        <Slider
                          value={detailLevel}
                          onValueChange={setDetailLevel}
                          max={100}
                          min={0}
                          step={10}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label>响应格式</Label>
                        <Select value={responseFormat} onValueChange={(value: string) => setResponseFormat(value as 'url' | 'b64_json')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="url">URL链接</SelectItem>
                            <SelectItem value="b64_json">Base64编码</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={generateImage}
                      disabled={loading || !prompt.trim()}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          生成图像
                        </>
                      )}
                    </Button>

                    {loading && (
                      <div className="space-y-2">
                        <Progress value={progress} className="w-full" />
                        <p className="text-sm text-center text-gray-600">生成进度: {progress}%</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 批量生成 */}
        <TabsContent value="batch" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
                批量生成
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>批量描述 (最多4个)</Label>
                  {batchPrompts.map((prompt, index) => (
                    <Textarea
                      key={index}
                      placeholder={`图像描述 ${index + 1}`}
                      value={prompt}
                      onChange={(e) => {
                        const newPrompts = [...batchPrompts];
                        newPrompts[index] = e.target.value;
                        setBatchPrompts(newPrompts);
                      }}
                      rows={3}
                    />
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>AI模型</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                          <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
                          <SelectItem value="doubao-seedream">豆包SeedDream</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>图像尺寸</Label>
                      <Select value={size} onValueChange={setSize}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="512x512">512x512</SelectItem>
                          <SelectItem value="1024x1024">1024x1024</SelectItem>
                          <SelectItem value="1024x1792">1024x1792</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={generateBatch}
                    disabled={batchGenerating || !batchPrompts.some(p => p.trim())}
                    className="w-full"
                  >
                    {batchGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        批量生成中...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        开始批量生成
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 设计专用 */}
        <TabsContent value="design" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                设计专用生成
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <Label>设计类型</Label>
                  <Select value={designType} onValueChange={(value: any) => setDesignType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="logo">Logo设计</SelectItem>
                      <SelectItem value="poster">海报设计</SelectItem>
                      <SelectItem value="banner">横幅设计</SelectItem>
                      <SelectItem value="icon">图标设计</SelectItem>
                      <SelectItem value="illustration">插画设计</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>设计风格</Label>
                  <Select value={designStyle} onValueChange={(value: any) => setDesignStyle(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">现代风格</SelectItem>
                      <SelectItem value="classic">经典风格</SelectItem>
                      <SelectItem value="minimalist">极简风格</SelectItem>
                      <SelectItem value="industrial">工业风格</SelectItem>
                      <SelectItem value="artistic">艺术风格</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>色彩方案</Label>
                  <Select value={colorScheme[0]} onValueChange={(value) => setColorScheme([value])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">蓝色系</SelectItem>
                      <SelectItem value="red">红色系</SelectItem>
                      <SelectItem value="green">绿色系</SelectItem>
                      <SelectItem value="purple">紫色系</SelectItem>
                      <SelectItem value="black">黑白系</SelectItem>
                      <SelectItem value="gradient">渐变色</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="design-brief">设计要求</Label>
                <Textarea
                  id="design-brief"
                  placeholder="详细描述您的设计需求，包括品牌理念、目标受众、使用场景等..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="mt-1"
                />
              </div>

              <Button
                onClick={generateImage}
                disabled={loading || !prompt.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    设计生成中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    生成设计
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 历史记录 */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  生成历史
                </div>
                <Button onClick={loadHistory} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无生成历史</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{item.model}</Badge>
                          <Badge variant="outline">{item.size}</Badge>
                          <Badge>¥{item.cost.toFixed(4)}</Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{item.prompt}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {item.images.map((image, imageIndex) => (
                          <div key={imageIndex} className="relative group">
                            {image.url ? (
                              <img 
                                src={image.url} 
                                alt={`History image ${imageIndex + 1}`}
                                className="w-full h-auto rounded cursor-pointer transition-transform group-hover:scale-105"
                                onClick={() => window.open(image.url, '_blank')}
                              />
                            ) : image.b64_json ? (
                              <img 
                                src={`data:image/png;base64,${image.b64_json}`}
                                alt={`History image ${imageIndex + 1}`}
                                className="w-full h-auto rounded cursor-pointer transition-transform group-hover:scale-105"
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 生成结果 */}
      {generatedImages.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold">生成结果</h2>
          {generatedImages.map((response, index) => renderImageCard(response, index))}
        </div>
      )}

      <Alert className="mt-8">
        <AlertDescription>
          <strong>使用提示：</strong>
          图像生成会消耗API配额，请合理使用。高质量和大幅面图像成本更高。
          生成的图像可以用于商业用途，但请遵守相关法律法规。
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ImageGeneration;