import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Settings, 
  Save, 
  Upload, 
  Download, 
  RefreshCw,
  Zap,
  Palette,
  Layers,
  Camera
} from 'lucide-react';

interface AdvancedSettings {
  // 基础设置
  seed: number | null;
  steps: number;
  cfgScale: number;
  sampler: string;
  scheduler: string;
  
  // 图像设置
  width: number;
  height: number;
  aspectRatio: string;
  
  // 高级设置
  clipSkip: number;
  vae: string;
  controlnet: boolean;
  lora: boolean;
  
  // 性能设置
  batchCount: number;
  batchSize: number;
  tiling: boolean;
  
  // 输出设置
  format: string;
  quality: number;
  metadata: boolean;
  watermark: boolean;
}

interface ModelConfig {
  id: string;
  name: string;
  type: 'stable-diffusion' | 'dalle' | 'midjourney' | 'custom';
  size: string;
  description: string;
}

export const ImageAdvancedSettings: React.FC<{
  settings: AdvancedSettings;
  onSettingsChange: (settings: AdvancedSettings) => void;
  onApplyPreset?: (preset: AdvancedSettings) => void;
}> = ({ settings, onSettingsChange, onApplyPreset }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [customPresets, setCustomPresets] = useState<AdvancedSettings[]>([]);
  const [presetName, setPresetName] = useState('');

  const models: ModelConfig[] = [
    {
      id: 'doubao-seedream-4-5-251128',
      name: '豆包梦想 4.5',
      type: 'stable-diffusion',
      size: '2K',
      description: '高质量图像生成模型'
    },
    {
      id: 'dalle-3',
      name: 'DALL-E 3',
      type: 'dalle',
      size: '1K',
      description: 'OpenAI的图像生成模型'
    }
  ];

  const samplers = [
    { value: 'DPM++ 2M Karras', label: 'DPM++ 2M Karras' },
    { value: 'DPM++ SDE Karras', label: 'DPM++ SDE Karras' },
    { value: 'Euler a', label: 'Euler a' },
    { value: 'Euler', label: 'Euler' },
    { value: 'DDIM', label: 'DDIM' },
    { value: 'LCM', label: 'LCM (快速)' }
  ];

  const schedulers = [
    { value: 'Karras', label: 'Karras' },
    { value: 'Exponential', label: 'Exponential' },
    { value: 'Linear', label: 'Linear' },
    { value: 'SDE', label: 'SDE' }
  ];

  const aspectRatios = [
    { value: '1:1', label: '正方形 (1:1)', width: 512, height: 512 },
    { value: '4:3', label: '横向 (4:3)', width: 512, height: 384 },
    { value: '3:4', label: '纵向 (3:4)', width: 384, height: 512 },
    { value: '16:9', label: '宽屏 (16:9)', width: 512, height: 288 },
    { value: '9:16', label: '竖屏 (9:16)', width: 288, height: 512 }
  ];

  const presetConfigs = [
    {
      name: '高质量',
      settings: {
        ...settings,
        steps: 30,
        cfgScale: 7,
        sampler: 'DPM++ 2M Karras',
        scheduler: 'Karras'
      }
    },
    {
      name: '快速',
      settings: {
        ...settings,
        steps: 15,
        cfgScale: 6,
        sampler: 'LCM',
        scheduler: 'Karras'
      }
    },
    {
      name: '细节丰富',
      settings: {
        ...settings,
        steps: 50,
        cfgScale: 8,
        sampler: 'DPM++ SDE Karras',
        scheduler: 'Exponential'
      }
    }
  ];

  const updateSettings = (key: keyof AdvancedSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const updateAspectRatio = (ratio: string) => {
    const config = aspectRatios.find(r => r.value === ratio);
    if (config) {
      onSettingsChange({
        ...settings,
        aspectRatio: ratio,
        width: config.width,
        height: config.height
      });
    }
  };

  const savePreset = () => {
    if (presetName.trim()) {
      const newPreset = { ...settings };
      setCustomPresets([...customPresets, newPreset]);
      setPresetName('');
    }
  };

  const exportPresets = () => {
    const dataStr = JSON.stringify(customPresets, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'image-generation-presets.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importPresets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setCustomPresets([...customPresets, ...imported]);
        } catch (error) {
          console.error('Failed to import presets:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const randomizeSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1000000);
    updateSettings('seed', randomSeed);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          高级设置
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">基础</TabsTrigger>
            <TabsTrigger value="image">图像</TabsTrigger>
            <TabsTrigger value="advanced">高级</TabsTrigger>
            <TabsTrigger value="presets">预设</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            {/* 种子设置 */}
            <div className="space-y-2">
              <Label>种子值</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={settings.seed || ''}
                  onChange={(e) => updateSettings('seed', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="随机"
                  className="flex-1"
                />
                <Button variant="outline" onClick={randomizeSeed}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 采样步数 */}
            <div className="space-y-2">
              <Label>采样步数 ({settings.steps})</Label>
              <Slider
                value={settings.steps}
                onChange={(value) => updateSettings('steps', value)}
                min={1}
                max={100}
                step={1}
              />
            </div>

            {/* CFG Scale */}
            <div className="space-y-2">
              <Label>CFG Scale ({settings.cfgScale})</Label>
              <Slider
                value={settings.cfgScale}
                onChange={(value) => updateSettings('cfgScale', value)}
                min={1}
                max={30}
                step={0.5}
              />
            </div>

            {/* 采样器 */}
            <div className="space-y-2">
              <Label>采样器</Label>
              <Select value={settings.sampler} onValueChange={(value) => updateSettings('sampler', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {samplers.map(sampler => (
                    <SelectItem key={sampler.value} value={sampler.value}>
                      {sampler.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 调度器 */}
            <div className="space-y-2">
              <Label>调度器</Label>
              <Select value={settings.scheduler} onValueChange={(value) => updateSettings('scheduler', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schedulers.map(scheduler => (
                    <SelectItem key={scheduler.value} value={scheduler.value}>
                      {scheduler.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-6">
            {/* 宽高比 */}
            <div className="space-y-2">
              <Label>宽高比</Label>
              <Select value={settings.aspectRatio} onValueChange={updateAspectRatio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aspectRatios.map(ratio => (
                    <SelectItem key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 自定义尺寸 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>宽度</Label>
                <Input
                  type="number"
                  value={settings.width}
                  onChange={(e) => updateSettings('width', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>高度</Label>
                <Input
                  type="number"
                  value={settings.height}
                  onChange={(e) => updateSettings('height', parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* 输出格式 */}
            <div className="space-y-2">
              <Label>输出格式</Label>
              <Select value={settings.format} onValueChange={(value) => updateSettings('format', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PNG">PNG</SelectItem>
                  <SelectItem value="JPEG">JPEG</SelectItem>
                  <SelectItem value="WEBP">WebP</SelectItem>
                  <SelectItem value="TIFF">TIFF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 质量设置 */}
            <div className="space-y-2">
              <Label>质量 ({settings.quality}%)</Label>
              <Slider
                value={settings.quality}
                onChange={(value) => updateSettings('quality', value)}
                min={10}
                max={100}
                step={5}
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            {/* CLIP Skip */}
            <div className="space-y-2">
              <Label>CLIP Skip ({settings.clipSkip})</Label>
              <Slider
                value={settings.clipSkip}
                onChange={(value) => updateSettings('clipSkip', value)}
                min={1}
                max={12}
                step={1}
              />
            </div>

            {/* ControlNet */}
            <div className="flex items-center justify-between">
              <Label>启用 ControlNet</Label>
              <Switch
                checked={settings.controlnet}
                onCheckedChange={(checked) => updateSettings('controlnet', checked)}
              />
            </div>

            {/* LoRA */}
            <div className="flex items-center justify-between">
              <Label>启用 LoRA</Label>
              <Switch
                checked={settings.lora}
                onCheckedChange={(checked) => updateSettings('lora', checked)}
              />
            </div>

            {/* 批量设置 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>批次数量</Label>
                <Input
                  type="number"
                  value={settings.batchCount}
                  onChange={(e) => updateSettings('batchCount', parseInt(e.target.value))}
                  min={1}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>批次大小</Label>
                <Input
                  type="number"
                  value={settings.batchSize}
                  onChange={(e) => updateSettings('batchSize', parseInt(e.target.value))}
                  min={1}
                  max={8}
                />
              </div>
            </div>

            {/* 平铺 */}
            <div className="flex items-center justify-between">
              <Label>启用平铺</Label>
              <Switch
                checked={settings.tiling}
                onCheckedChange={(checked) => updateSettings('tiling', checked)}
              />
            </div>

            {/* 元数据 */}
            <div className="flex items-center justify-between">
              <Label>保存元数据</Label>
              <Switch
                checked={settings.metadata}
                onCheckedChange={(checked) => updateSettings('metadata', checked)}
              />
            </div>

            {/* 水印 */}
            <div className="flex items-center justify-between">
              <Label>添加水印</Label>
              <Switch
                checked={settings.watermark}
                onCheckedChange={(checked) => updateSettings('watermark', checked)}
              />
            </div>
          </TabsContent>

          <TabsContent value="presets" className="space-y-6">
            {/* 预设配置 */}
            <div className="grid grid-cols-3 gap-2">
              {presetConfigs.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => onApplyPreset?.(preset.settings)}
                  className="h-auto p-3"
                >
                  <div className="text-center">
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {preset.settings.steps}步 | CFG:{preset.settings.cfgScale}
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            {/* 自定义预设管理 */}
            <div className="space-y-4 border rounded-lg p-4">
              <h3 className="font-medium">自定义预设</h3>
              
              <div className="flex gap-2">
                <Input
                  placeholder="预设名称"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={savePreset} disabled={!presetName.trim()}>
                  <Save className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={exportPresets}>
                  <Download className="w-4 h-4 mr-2" />
                  导出预设
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importPresets}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    导入预设
                  </Button>
                </div>
              </div>

              {customPresets.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {customPresets.map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => onApplyPreset?.(preset)}
                      className="h-auto p-2"
                    >
                      <div className="text-sm">
                        预设 {index + 1}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};