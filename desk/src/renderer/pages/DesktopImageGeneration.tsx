import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Download, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-toastify';

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
}

const DesktopImageGeneration: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('doubao-seedream-4-5-251128');
  const [size, setSize] = useState('2K');
  const [responseFormat, setResponseFormat] = useState<'url' | 'b64_json'>('url');
  const [watermark, setWatermark] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<GenerationResponse[]>([]);
  
  // 设计专用参数
  const [designBrief, setDesignBrief] = useState('');
  const [designStyle, setDesignStyle] = useState<'modern' | 'classic' | 'minimalist' | 'industrial' | 'artistic'>('modern');
  const [designFormat, setDesignFormat] = useState('2K');
  
  // 室内设计参数
  const [spaceType, setSpaceType] = useState<'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'office' | 'garden'>('living_room');
  const [interiorStyle, setInteriorStyle] = useState<'chinese' | 'european' | 'american' | 'japanese' | 'nordic' | 'industrial'>('nordic');
  const [requirements, setRequirements] = useState('');
  const [interiorFormat, setInteriorFormat] = useState('2K');
  
  // 批量生成
  const [batchPrompts, setBatchPrompts] = useState<string[]>(['']);

  useEffect(() => {
    // 初始化API
    if (window.electronAPI?.api) {
      window.electronAPI.api.init();
    }
  }, []);

  // 基础图像生成
  const handleBasicGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('请输入图像描述');
      return;
    }

    setLoading(true);
    try {
      const response = await window.electronAPI.api.post('/ai/image/generate', {
        prompt: prompt.trim(),
        model,
        response_format: responseFormat,
        size,
        watermark
      });

      if (response.success) {
        setGeneratedImages(prev => [response.data, ...prev]);
        toast.success('图像生成成功！');
        setPrompt('');
      } else {
        toast.error(response.error || '图像生成失败');
      }
    } catch (error) {
      console.error('图像生成失败:', error);
      toast.error('图像生成失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 设计图像生成
  const handleDesignGenerate = async () => {
    if (!designBrief.trim()) {
      toast.error('请输入设计主题');
      return;
    }

    setLoading(true);
    try {
      const response = await window.electronAPI.api.post('/ai/image/design', {
        designBrief: designBrief.trim(),
        style: designStyle,
        format: designFormat
      });

      if (response.success) {
        setGeneratedImages(prev => [response.data, ...prev]);
        toast.success('设计图像生成成功！');
        setDesignBrief('');
      } else {
        toast.error(response.error || '设计图像生成失败');
      }
    } catch (error) {
      console.error('设计图像生成失败:', error);
      toast.error('设计图像生成失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 室内设计图像生成
  const handleInteriorGenerate = async () => {
    setLoading(true);
    try {
      const response = await window.electronAPI.api.post('/ai/image/interior', {
        spaceType,
        style: interiorStyle,
        requirements: requirements.trim(),
        format: interiorFormat
      });

      if (response.success) {
        setGeneratedImages(prev => [response.data, ...prev]);
        toast.success('室内设计图像生成成功！');
        setRequirements('');
      } else {
        toast.error(response.error || '室内设计图像生成失败');
      }
    } catch (error) {
      console.error('室内设计图像生成失败:', error);
      toast.error('室内设计图像生成失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 批量生成
  const handleBatchGenerate = async () => {
    const validPrompts = batchPrompts.filter(p => p.trim());
    if (validPrompts.length === 0) {
      toast.error('请至少输入一个有效的提示词');
      return;
    }

    setLoading(true);
    try {
      const response = await window.electronAPI.api.post('/ai/image/batch', {
        prompts: validPrompts,
        model,
        options: {
          response_format: responseFormat,
          size,
          watermark
        }
      });

      if (response.success) {
        setGeneratedImages(prev => [...response.data, ...prev]);
        toast.success(`批量生成成功，共${validPrompts.length}张图像！`);
        setBatchPrompts(['']);
      } else {
        toast.error(response.error || '批量图像生成失败');
      }
    } catch (error) {
      console.error('批量图像生成失败:', error);
      toast.error('批量图像生成失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 下载图像
  const handleDownload = async (imageData: ImageData, index: number) => {
    try {
      if (imageData.url) {
        // 如果是URL，使用Electron的下载功能
        if (window.electronAPI?.shell) {
          await window.electronAPI.shell.openExternal(imageData.url);
          toast.info('已在浏览器中打开图像，请右键保存');
        }
      } else if (imageData.b64_json) {
        // 如果是base64，创建下载链接
        const blob = new Blob([Buffer.from(imageData.b64_json, 'base64')], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated-image-${Date.now()}-${index}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('图像下载成功');
      }
    } catch (error) {
      console.error('下载失败:', error);
      toast.error('下载失败');
    }
  };

  // 添加批量提示词输入框
  const addBatchPrompt = () => {
    setBatchPrompts([...batchPrompts, '']);
  };

  const updateBatchPrompt = (index: number, value: string) => {
    const newPrompts = [...batchPrompts];
    newPrompts[index] = value;
    setBatchPrompts(newPrompts);
  };

  const removeBatchPrompt = (index: number) => {
    if (batchPrompts.length > 1) {
      setBatchPrompts(batchPrompts.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Sparkles className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">AI图像生成</h1>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">基础生成</TabsTrigger>
            <TabsTrigger value="design">设计辅助</TabsTrigger>
            <TabsTrigger value="interior">室内设计</TabsTrigger>
            <TabsTrigger value="batch">批量生成</TabsTrigger>
          </TabsList>

          {/* 基础图像生成 */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  基础图像生成
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt">图像描述</Label>
                  <Textarea
                    id="prompt"
                    placeholder="请描述您想要生成的图像，例如：一只可爱的小猫坐在花园里..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="model">模型</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doubao-seedream-4-5-251128">
                          Doubao SeedDream 4.5
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="size">尺寸</Label>
                    <Select value={size} onValueChange={setSize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="512x512">512x512</SelectItem>
                        <SelectItem value="768x768">768x768</SelectItem>
                        <SelectItem value="1024x1024">1024x1024</SelectItem>
                        <SelectItem value="2K">2K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="watermark"
                    checked={watermark}
                    onChange={(e) => setWatermark(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="watermark">添加水印</Label>
                </div>

                <Button 
                  onClick={handleBasicGenerate} 
                  disabled={loading}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* 设计辅助 */}
          <TabsContent value="design" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI辅助设计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="designBrief">设计主题</Label>
                  <Textarea
                    id="designBrief"
                    placeholder="请描述您的设计主题，例如：现代简约风格的公司logo设计..."
                    value={designBrief}
                    onChange={(e) => setDesignBrief(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="designStyle">设计风格</Label>
                    <Select value={designStyle} onValueChange={(value: any) => setDesignStyle(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">现代简约</SelectItem>
                        <SelectItem value="classic">经典传统</SelectItem>
                        <SelectItem value="minimalist">极简主义</SelectItem>
                        <SelectItem value="industrial">工业风格</SelectItem>
                        <SelectItem value="artistic">艺术创作</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="designFormat">输出格式</Label>
                    <Select value={designFormat} onValueChange={setDesignFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="512x512">512x512</SelectItem>
                        <SelectItem value="768x768">768x768</SelectItem>
                        <SelectItem value="1024x1024">1024x1024</SelectItem>
                        <SelectItem value="2K">2K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleDesignGenerate} 
                  disabled={loading}
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
                      生成设计图
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 室内设计 */}
          <TabsContent value="interior" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>室内设计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="spaceType">空间类型</Label>
                    <Select value={spaceType} onValueChange={(value: any) => setSpaceType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="living_room">客厅</SelectItem>
                        <SelectItem value="bedroom">卧室</SelectItem>
                        <SelectItem value="kitchen">厨房</SelectItem>
                        <SelectItem value="bathroom">浴室</SelectItem>
                        <SelectItem value="office">办公室</SelectItem>
                        <SelectItem value="garden">园林景观</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="interiorStyle">设计风格</Label>
                    <Select value={interiorStyle} onValueChange={(value: any) => setInteriorStyle(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chinese">中式风格</SelectItem>
                        <SelectItem value="european">欧式风格</SelectItem>
                        <SelectItem value="american">美式风格</SelectItem>
                        <SelectItem value="japanese">日式风格</SelectItem>
                        <SelectItem value="nordic">北欧风格</SelectItem>
                        <SelectItem value="industrial">工业风格</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="requirements">特殊要求</Label>
                  <Textarea
                    id="requirements"
                    placeholder="请输入特殊设计要求，例如：需要大量储物空间、采光要好、适合有小孩的家庭..."
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="interiorFormat">输出格式</Label>
                  <Select value={interiorFormat} onValueChange={setInteriorFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="512x512">512x512</SelectItem>
                      <SelectItem value="768x768">768x768</SelectItem>
                      <SelectItem value="1024x1024">1024x1024</SelectItem>
                      <SelectItem value="2K">2K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleInteriorGenerate} 
                  disabled={loading}
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
                      生成室内设计图
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 批量生成 */}
          <TabsContent value="batch" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>批量生成</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {batchPrompts.map((prompt, index) => (
                  <div key={index} className="flex gap-2">
                    <Textarea
                      placeholder={`提示词 ${index + 1}`}
                      value={prompt}
                      onChange={(e) => updateBatchPrompt(index, e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    {batchPrompts.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeBatchPrompt(index)}
                      >
                        删除
                      </Button>
                    )}
                  </div>
                ))}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={addBatchPrompt}
                    className="flex-1"
                  >
                    添加提示词
                  </Button>
                  <Button 
                    onClick={handleBatchGenerate} 
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        批量生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        批量生成 ({batchPrompts.filter(p => p.trim()).length})
                      </>
                    )}
                  </Button>
                </div>

                <Alert>
                  <AlertDescription>
                    批量生成最多支持10张图像，需要专业版订阅
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 生成的图像展示 */}
        {generatedImages.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">生成的图像</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedImages.map((response, responseIndex) => (
                response.data.map((imageData, imageIndex) => (
                  <Card key={`${responseIndex}-${imageIndex}`} className="overflow-hidden">
                    <div className="aspect-square bg-gray-100">
                      {imageData.url ? (
                        <img
                          src={imageData.url}
                          alt={`Generated image ${responseIndex}-${imageIndex}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : imageData.b64_json ? (
                        <img
                          src={`data:image/png;base64,${imageData.b64_json}`}
                          alt={`Generated image ${responseIndex}-${imageIndex}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(imageData, imageIndex)}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          下载
                        </Button>
                      </div>
                      {imageData.revised_prompt && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                          {imageData.revised_prompt}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesktopImageGeneration;