import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  TrendingUp, 
  Layout, 
  Pen, 
  Image, 
  Home, 
  TreePine,
  Play,
  Download,
  Eye,
  Heart,
  Settings,
  Sparkles
} from 'lucide-react';
import { toast } from 'react-toastify';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedTime: string;
  softwareRequirements: string[];
  tags: string[];
  preview?: string;
}

interface Category {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const DesignTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [popularTemplates, setPopularTemplates] = useState<Template[]>([]);
  const [recommendations, setRecommendations] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();

  const difficulties = [
    { value: 'beginner', label: '初级', color: 'bg-green-100 text-green-800' },
    { value: 'intermediate', label: '中级', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'advanced', label: '高级', color: 'bg-red-100 text-red-800' }
  ];

  const categoryIcons = {
    material: <Layout className="w-5 h-5" />,
    graphics: <Pen className="w-5 h-5" />,
    photoshop: <Image className="w-5 h-5" />,
    interior: <Home className="w-5 h-5" />,
    landscape: <TreePine className="w-5 h-5" />
  };

  useEffect(() => {
    loadCategories();
    loadTemplates();
    loadPopularTemplates();
    loadRecommendations();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery, selectedDifficulty]);

  const loadCategories = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      const response = await electronAPI?.api?.get('/api/design-templates/categories');
      
      if (response?.success) {
        const cats = response.data.map((cat: any) => ({
          ...cat,
          icon: categoryIcons[cat.value as keyof typeof categoryIcons] || <Sparkles className="w-5 h-5" />
        }));
        setCategories(cats);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const electronAPI = (window as any).electronAPI;
      const response = await electronAPI?.api?.get('/api/design-templates');
      
      if (response?.success) {
        setTemplates(response.data || []);
      }
    } catch (error) {
      console.error('加载模板失败:', error);
      toast.error('加载模板失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPopularTemplates = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      const response = await electronAPI?.api?.get('/api/design-templates/popular');
      
      if (response?.success) {
        setPopularTemplates(response.data || []);
      }
    } catch (error) {
      console.error('加载热门模板失败:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      const response = await electronAPI?.api?.get('/api/design-templates/recommendations');
      
      if (response?.success) {
        setRecommendations(response.data || []);
      }
    } catch (error) {
      console.error('加载推荐模板失败:', error);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // 按分类筛选
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // 按难度筛选
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(template => template.difficulty === selectedDifficulty);
    }

    // 按搜索关键词筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const electronAPI = (window as any).electronAPI;
      const response = await electronAPI?.api?.post(`/api/design-templates/${templateId}/use`, {
        name: `基于模板创建的工作流`,
        description: `从设计模板创建的工作流实例`
      });

      if (response?.success) {
        toast.success('基于模板创建工作流成功');
        navigate(`/workflows/designer/${response.data.id}`);
      } else {
        toast.error(response?.error || '创建工作流失败');
      }
    } catch (error) {
      console.error('使用模板失败:', error);
      toast.error('使用模板失败，请稍后重试');
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    const diff = difficulties.find(d => d.value === difficulty);
    return (
      <Badge variant="secondary" className={diff?.color}>
        {diff?.label}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category as keyof typeof categoryIcons] || <Sparkles className="w-5 h-5" />;
  };

  const TemplateCard = ({ template }: { template: Template }) => (
    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
              {template.name}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {template.description}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleUseTemplate(template.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Play className="w-3 h-3 mr-1" />
            使用
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {getCategoryIcon(template.category)}
          <span className="text-sm text-gray-500">
            {categories.find(c => c.value === template.category)?.label}
          </span>
          {getDifficultyBadge(template.difficulty)}
        </div>

        <div className="flex flex-wrap gap-1">
          {template.tags.map((tag, index) => (
            <Badge key={index} variant="outline" size="sm">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{template.estimatedTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Settings className="w-4 h-4" />
            <span>{template.softwareRequirements.join(', ')}</span>
          </div>
        </div>

        {template.preview && (
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={template.preview}
              alt={template.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-200');
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">设计模板库</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Layout className="w-4 h-4 mr-1" />
              网格
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <Filter className="w-4 h-4 mr-1" />
              列表
            </Button>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="搜索模板..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有分类</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center gap-2">
                        {category.icon}
                        {category.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="难度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有难度</SelectItem>
                  {difficulties.map((difficulty) => (
                    <SelectItem key={difficulty.value} value={difficulty.value}>
                      {difficulty.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">
              所有模板 ({filteredTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="popular">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                热门模板
              </div>
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                为您推荐
              </div>
            </TabsTrigger>
          </TabsList>

          {/* 所有模板 */}
          <TabsContent value="all">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">未找到模板</h3>
                <p className="text-gray-500">尝试调整搜索条件或筛选器</p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }>
                {filteredTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* 热门模板 */}
          <TabsContent value="popular">
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }>
              {popularTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </TabsContent>

          {/* 推荐模板 */}
          <TabsContent value="recommendations">
            {recommendations.length === 0 ? (
              <Alert>
                <AlertDescription>
                  <strong>个性化推荐：</strong> 使用更多设计模板后，系统会为您推荐更合适的模板。
                  您可以从"所有模板"中选择任意模板开始使用。
                </AlertDescription>
              </Alert>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }>
                {recommendations.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 使用提示 */}
        <Alert className="mt-8">
          <AlertDescription>
            <strong>使用提示：</strong>
            <br />
            • 选择适合您需求的模板，点击"使用"按钮创建工作流实例<br />
            • 可以在工作流设计器中对模板进行自定义调整<br />
            • 模板支持多种设计软件，请确保已安装相应软件<br />
            • 建议从简单的模板开始，熟悉后再使用复杂模板
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default DesignTemplates;