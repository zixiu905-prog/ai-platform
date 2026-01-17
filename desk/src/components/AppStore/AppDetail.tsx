import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Star, 
  Heart, 
  Eye, 
  HardDrive,
  DollarSign,
  Calendar,
  User,
  Share2,
  ExternalLink,
  Shield,
  Cpu,
  Monitor
} from 'lucide-react';
import { DesktopApp } from '@/services/appStoreService';

interface AppDetailProps {
  app: DesktopApp;
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  onFavoriteToggle: () => void;
  isFavorite: boolean;
}

export function AppDetail({ 
  app, 
  isOpen, 
  onClose, 
  onDownload, 
  onFavoriteToggle, 
  isFavorite 
}: AppDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const renderSystemRequirements = (req: any, title: string) => {
    if (!req || typeof req !== 'object') return null;
    
    return (
      <div className="space-y-2">
        <h4 className="font-medium">{title}</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {Object.entries(req).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-muted-foreground capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}:
              </span>
              <span>{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPrice = () => {
    if (app.isFree) {
      return (
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-green-600 text-lg px-3 py-1">
            免费
          </Badge>
        </div>
      );
    }
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="text-lg px-3 py-1">
          <DollarSign className="h-4 w-4 mr-1" />
          {app.price} {app.currency}
        </Badge>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={app.iconUrl || '/placeholder-app.png'}
                alt={app.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
              <div>
                <DialogTitle className="text-2xl font-bold mb-2">
                  {app.name}
                </DialogTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>v{app.version}</span>
                  <span>•</span>
                  <span>由 {app.developer?.name || '未知开发者'} 开发</span>
                  <span>•</span>
                  <span>{formatDate(app.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              {renderPrice()}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{app.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({app.ratingCount} 评价)</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFavoriteToggle}
                >
                  <Heart 
                    className={`h-4 w-4 mr-1 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} 
                  />
                  {isFavorite ? '已收藏' : '收藏'}
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-1" />
                  分享
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="description">描述</TabsTrigger>
            <TabsTrigger value="requirements">系统要求</TabsTrigger>
            <TabsTrigger value="versions">版本历史</TabsTrigger>
            <TabsTrigger value="reviews">用户评价</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">应用信息</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">分类</span>
                    <Badge variant="outline">{app.category?.name}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">下载量</span>
                    <span className="font-medium">{app.downloadCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">文件大小</span>
                    <span className="font-medium">{formatFileSize(app.installSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">支持系统</span>
                    <div className="flex flex-wrap gap-1">
                      {app.supportedOS.map(os => (
                        <Badge key={os} variant="secondary" className="text-xs">
                          {os}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">主要功能</h3>
                <div className="space-y-2">
                  {app.features.length > 0 ? (
                    app.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无功能介绍</p>
                  )}
                </div>
              </div>
            </div>

            {/* 截图预览 */}
            {app.screenshots && app.screenshots.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">应用截图</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {app.screenshots.map((screenshot, index) => (
                    <img
                      key={index}
                      src={screenshot}
                      alt={`截图 ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(screenshot, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="description" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">应用描述</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {app.description || '暂无详细描述'}
              </p>
            </div>

            <Separator />

            {app.shortDesc && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">简短介绍</h3>
                <p className="text-sm text-muted-foreground">
                  {app.shortDesc}
                </p>
              </div>
            )}

            <Separator />

            {/* 隐私政策和使用条款 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {app.privacyPolicy && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    隐私政策
                  </h4>
                  <Button variant="outline" size="sm">
                    <a href={app.privacyPolicy} target="_blank" rel="noopener noreferrer" className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      查看隐私政策
                    </a>
                  </Button>
                </div>
              )}

              {app.termsOfUse && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center">
                    <Monitor className="h-4 w-4 mr-2" />
                    使用条款
                  </h4>
                  <Button variant="outline" size="sm">
                    <a href={app.termsOfUse} target="_blank" rel="noopener noreferrer" className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      查看使用条款
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requirements" className="space-y-6">
            {renderSystemRequirements(app.minSystemReq, '最低系统要求')}
            
            {app.maxSystemReq && (
              <>
                <Separator />
                {renderSystemRequirements(app.maxSystemReq, '推荐系统要求')}
              </>
            )}

            {/* 额外系统信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">兼容性信息</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">支持 {app.supportedOS.length} 个操作系统</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {app.supportedOS.map(os => (
                      <Badge key={os} variant="outline">
                        {os}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">安装信息</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">文件大小</span>
                    <span className="font-medium">{formatFileSize(app.installSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">当前版本</span>
                    <span className="font-medium">v{app.version}</span>
                  </div>
                  {app.lastVersionUpdate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">最后更新</span>
                      <span className="font-medium">{formatDate(app.lastVersionUpdate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="versions" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">版本历史</h3>
              {app.versions && app.versions.length > 0 ? (
                <div className="space-y-4">
                  {app.versions.map((version) => (
                    <Card key={version.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">v{version.version}</h4>
                              {version.isBeta && <Badge variant="secondary">Beta</Badge>}
                              {version.isStable && <Badge variant="default">稳定版</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              发布于 {formatDate(version.releaseDate)}
                            </p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div>{formatFileSize(version.downloadSize)}</div>
                            <div>{version.downloadCount} 次下载</div>
                          </div>
                        </div>
                        {version.changelog && (
                          <div className="mt-3">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {version.changelog}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">暂无版本历史</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">用户评价</h3>
              {app.reviews && app.reviews.length > 0 ? (
                <div className="space-y-4">
                  {app.reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <img
                              src={review.user?.avatar || '/placeholder-avatar.png'}
                              alt={review.user?.name}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <p className="font-medium">{review.user?.name || '匿名用户'}</p>
                              <div className="flex items-center space-x-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < review.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(review.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {review.isVerified && (
                            <Badge variant="secondary" className="text-xs">
                              已验证
                            </Badge>
                          )}
                        </div>
                        {review.title && (
                          <h4 className="font-medium mb-2">{review.title}</h4>
                        )}
                        <p className="text-sm leading-relaxed">{review.content}</p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <span>{review.isHelpful} 人觉得有帮助</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无用户评价</p>
                  <p className="text-sm text-muted-foreground">成为第一个评价这个应用的用户吧！</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>下载量: {app.downloadCount.toLocaleString()}</span>
            <span>•</span>
            <span>更新时间: {formatDate(app.lastVersionUpdate || app.createdAt)}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
            <Button onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              下载 {app.name}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}