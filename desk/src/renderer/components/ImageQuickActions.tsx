import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  Zap, 
  RefreshCw, 
  Copy, 
  Download, 
  Share2, 
  Heart,
  Palette,
  Camera,
  Brush,
  Layers
} from 'lucide-react';

interface QuickActionPreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  prompt: string;
  negativePrompt?: string;
  style: string;
  category: 'portrait' | 'landscape' | 'abstract' | 'technical';
}

const quickActionPresets: QuickActionPreset[] = [
  {
    id: 'portrait-professional',
    name: '专业人像',
    icon: <Camera className="w-4 h-4" />,
    prompt: 'professional headshot, studio lighting, business attire, sharp focus, high quality',
    style: 'realistic',
    category: 'portrait'
  },
  {
    id: 'character-anime',
    name: '动漫角色',
    icon: <Brush className="w-4 h-4" />,
    prompt: 'anime character, beautiful detailed eyes, colorful hair, studio background, anime style',
    negativePrompt: 'blurry, low quality, realistic',
    style: 'anime',
    category: 'portrait'
  },
  {
    id: 'landscape-nature',
    name: '自然风光',
    icon: <Layers className="w-4 h-4" />,
    prompt: 'beautiful landscape, mountains, lake, sunset, golden hour, cinematic lighting',
    style: 'photorealistic',
    category: 'landscape'
  },
  {
    id: 'cityscape-night',
    name: '夜景城市',
    icon: <Palette className="w-4 h-4" />,
    prompt: 'cityscape at night, neon lights, reflection on wet streets, cyberpunk aesthetic',
    style: 'cinematic',
    category: 'landscape'
  },
  {
    id: 'abstract-geometric',
    name: '几何抽象',
    icon: <Zap className="w-4 h-4" />,
    prompt: 'geometric abstract art, bold colors, clean lines, modern design, minimalist',
    negativePrompt: 'realistic, photorealistic',
    style: 'abstract',
    category: 'abstract'
  },
  {
    id: 'technical-blueprint',
    name: '技术蓝图',
    icon: <Layers className="w-4 h-4" />,
    prompt: 'technical blueprint, engineering drawing, detailed measurements, clean lines, professional',
    style: 'technical',
    category: 'technical'
  }
];

export const ImageQuickActions: React.FC<{
  onSelectPreset: (preset: QuickActionPreset) => void;
  onGenerateMultiple?: (presets: QuickActionPreset[]) => void;
}> = ({ onSelectPreset, onGenerateMultiple }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);

  const categories = [
    { id: 'all', name: '全部' },
    { id: 'portrait', name: '人像' },
    { id: 'landscape', name: '风景' },
    { id: 'abstract', name: '抽象' },
    { id: 'technical', name: '技术' }
  ];

  const filteredPresets = quickActionPresets.filter(preset => {
    const matchesCategory = selectedCategory === 'all' || preset.category === selectedCategory;
    const matchesSearch = preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         preset.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePresetSelect = (preset: QuickActionPreset) => {
    onSelectPreset(preset);
  };

  const handlePresetToggle = (presetId: string) => {
    setSelectedPresets(prev => 
      prev.includes(presetId) 
        ? prev.filter(id => id !== presetId)
        : [...prev, presetId]
    );
  };

  const handleGenerateBatch = () => {
    if (selectedPresets.length > 0 && onGenerateMultiple) {
      const selectedPresetObjects = quickActionPresets.filter(preset => 
        selectedPresets.includes(preset.id)
      );
      onGenerateMultiple(selectedPresetObjects);
    }
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
  };

  return (
    <div className="space-y-4">
      {/* 搜索和筛选 */}
      <div className="flex gap-2">
        <Input
          placeholder="搜索预设..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-1">
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 预设网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPresets.map(preset => (
          <Card key={preset.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {preset.icon}
                  </div>
                  <CardTitle className="text-sm">{preset.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {preset.style}
                  </Badge>
                  <input
                    type="checkbox"
                    checked={selectedPresets.includes(preset.id)}
                    onChange={() => handlePresetToggle(preset.id)}
                    className="ml-2"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">提示词:</p>
                  <p className="text-xs p-2 bg-muted rounded line-clamp-2">
                    {preset.prompt}
                  </p>
                </div>
                
                {preset.negativePrompt && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">负面提示词:</p>
                    <p className="text-xs p-2 bg-red-50 dark:bg-red-950 rounded line-clamp-2">
                      {preset.negativePrompt}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePresetSelect(preset)}
                    className="flex-1"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    使用
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyPrompt(preset.prompt)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 批量生成 */}
      {selectedPresets.length > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">批量生成</h3>
                <p className="text-sm text-muted-foreground">
                  已选择 {selectedPresets.length} 个预设
                </p>
              </div>
              <Button onClick={handleGenerateBatch}>
                <RefreshCw className="w-4 h-4 mr-2" />
                批量生成 ({selectedPresets.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">使用统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">156</div>
              <div className="text-xs text-muted-foreground">总生成次数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">23</div>
              <div className="text-xs text-muted-foreground">本周生成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">12</div>
              <div className="text-xs text-muted-foreground">收藏数量</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">89%</div>
              <div className="text-xs text-muted-foreground">成功率</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};