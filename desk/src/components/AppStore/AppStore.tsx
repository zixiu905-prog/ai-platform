import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Download, 
  Star, 
  Filter, 
  Heart, 
  Eye,
  Clock,
  Trophy,
  Grid3X3,
  List,
  Package
} from 'lucide-react';
import { AppStoreService, DesktopApp, AppCategory, AppSearchFilters } from '@/services/appStoreService';
import { AppCard } from './AppCard';
import { AppDetail } from './AppDetail';
import { CategoryFilter } from './CategoryFilter';

interface AppStoreProps {
  userId?: string;
  onAppDownload?: (app: DesktopApp) => void;
  onAppFavorite?: (appId: string, isFavorite: boolean) => void;
}

export function AppStore({ userId, onAppDownload, onAppFavorite }: AppStoreProps) {
  const [apps, setApps] = useState<DesktopApp[]>([]);
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [selectedApp, setSelectedApp] = useState<DesktopApp | null>(null);
  const [featuredApps, setFeaturedApps] = useState<DesktopApp[]>([]);
  const [latestApps, setLatestApps] = useState<DesktopApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'downloads' | 'price' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('featured');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const appStoreService = new AppStoreService();

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await appStoreService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  }, []);

  const loadFeaturedApps = useCallback(async () => {
    try {
      const featuredData = await appStoreService.getFeaturedApps(12);
      setFeaturedApps(featuredData);
    } catch (error) {
      console.error('加载热门应用失败:', error);
    }
  }, []);

  const loadLatestApps = useCallback(async () => {
    try {
      const latestData = await appStoreService.getLatestApps(12);
      setLatestApps(latestData);
    } catch (error) {
      console.error('加载最新应用失败:', error);
    }
  }, []);

  const loadApps = useCallback(async (filters: AppSearchFilters = {}) => {
    setLoading(true);
    try {
      const result = await appStoreService.searchApps({
        ...filters,
        page,
        limit: 20,
        sortBy,
        sortOrder
      });
      setApps(result.apps);
      setTotal(result.total);
    } catch (error) {
      console.error('加载应用失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder]);

  const loadUserFavorites = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await appStoreService.getUserFavorites(userId, 1, 100);
      const favoriteIds = new Set(result.apps.map(app => app.id));
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('加载用户收藏失败:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadCategories();
    loadFeaturedApps();
    loadLatestApps();
    if (userId) {
      loadUserFavorites();
    }
  }, [loadCategories, loadFeaturedApps, loadLatestApps, loadUserFavorites]);

  useEffect(() => {
    if (activeTab === 'search') {
      loadApps({
        search: searchQuery,
        categoryId: selectedCategory,
        sortBy,
        sortOrder
      });
    }
  }, [activeTab, searchQuery, selectedCategory, sortBy, sortOrder, page, loadApps]);

  const handleSearch = useCallback(() => {
    setPage(1);
    setActiveTab('search');
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setPage(1);
    setActiveTab('search');
  }, []);

  const handleSortChange = useCallback((newSortBy: string) => {
    setSortBy(newSortBy as any);
    setPage(1);
  }, []);

  const handleAppClick = useCallback((app: DesktopApp) => {
    setSelectedApp(app);
  }, []);

  const handleDownload = useCallback((app: DesktopApp) => {
    // 记录下载
    appStoreService.recordDownload(app.id, userId);
    if (onAppDownload) {
      onAppDownload(app);
    }
  }, [userId, onAppDownload, appStoreService]);

  const handleFavoriteToggle = useCallback(async (appId: string) => {
    if (!userId) return;
    
    try {
      const isFavorite = await appStoreService.toggleFavorite(appId, userId);
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (isFavorite) {
          newFavorites.add(appId);
        } else {
          newFavorites.delete(appId);
        }
        return newFavorites;
      });
      
      if (onAppFavorite) {
        onAppFavorite(appId, isFavorite);
      }
    } catch (error) {
      console.error('切换收藏状态失败:', error);
    }
  }, [userId, onAppFavorite, appStoreService]);

  const renderAppCard = useCallback((app: DesktopApp) => {
    const isFavorite = favorites.has(app.id);
    
    return (
      <AppCard
        key={app.id}
        app={app}
        isFavorite={isFavorite}
        viewMode={viewMode}
        onClick={() => handleAppClick(app)}
        onDownload={() => handleDownload(app)}
        onFavoriteToggle={() => handleFavoriteToggle(app.id)}
      />
    );
  }, [favorites, viewMode, handleAppClick, handleDownload, handleFavoriteToggle]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 头部导航 */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Package className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">应用商店</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                筛选
              </Button>
            </div>
          </div>

          {/* 搜索栏 */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="搜索应用..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>
              搜索
            </Button>
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">名称</SelectItem>
                <SelectItem value="rating">评分</SelectItem>
                <SelectItem value="downloads">下载量</SelectItem>
                <SelectItem value="price">价格</SelectItem>
                <SelectItem value="createdAt">发布时间</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      {showFilters && (
        <div className="border-b bg-card p-4">
          <div className="container mx-auto">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto px-4 py-6 h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="featured" className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>热门应用</span>
              </TabsTrigger>
              <TabsTrigger value="latest" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>最新发布</span>
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <span>搜索结果</span>
                {total > 0 && <Badge variant="secondary">{total}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center space-x-2">
                <Heart className="h-4 w-4" />
                <span>我的收藏</span>
                {favorites.size > 0 && <Badge variant="secondary">{favorites.size}</Badge>}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-6">
              <TabsContent value="featured" className="mt-0">
                <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                  {featuredApps.map(renderAppCard)}
                </div>
              </TabsContent>

              <TabsContent value="latest" className="mt-0">
                <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                  {latestApps.map(renderAppCard)}
                </div>
              </TabsContent>

              <TabsContent value="search" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">正在加载应用...</div>
                  </div>
                ) : apps.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">没有找到相关应用</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                      {apps.map(renderAppCard)}
                    </div>
                    {/* 分页 */}
                    {total > 20 && (
                      <div className="flex justify-center mt-6 space-x-2">
                        <Button
                          variant="outline"
                          disabled={page === 1}
                          onClick={() => setPage(page - 1)}
                        >
                          上一页
                        </Button>
                        <span className="px-4 py-2 text-sm text-muted-foreground">
                          第 {page} 页，共 {Math.ceil(total / 20)} 页
                        </span>
                        <Button
                          variant="outline"
                          disabled={page >= Math.ceil(total / 20)}
                          onClick={() => setPage(page + 1)}
                        >
                          下一页
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="favorites" className="mt-0">
                {favorites.size === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">还没有收藏的应用</p>
                    </div>
                  </div>
                ) : (
                  <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                    {apps.filter(app => favorites.has(app.id)).map(renderAppCard)}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* 应用详情弹窗 */}
      {selectedApp && (
        <AppDetail
          app={selectedApp}
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          onDownload={() => handleDownload(selectedApp)}
          onFavoriteToggle={() => handleFavoriteToggle(selectedApp.id)}
          isFavorite={favorites.has(selectedApp.id)}
        />
      )}
    </div>
  );
}