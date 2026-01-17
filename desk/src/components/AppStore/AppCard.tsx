import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Star, 
  Heart, 
  Eye, 
  HardDrive,
  DollarSign,
  Calendar
} from 'lucide-react';
import { DesktopApp } from '@/services/appStoreService';

interface AppCardProps {
  app: DesktopApp;
  isFavorite: boolean;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  onDownload: () => void;
  onFavoriteToggle: () => void;
}

export function AppCard({ 
  app, 
  isFavorite, 
  viewMode, 
  onClick, 
  onDownload, 
  onFavoriteToggle 
}: AppCardProps) {
  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const renderPrice = () => {
    if (app.isFree) {
      return <Badge variant="secondary" className="text-green-600">免费</Badge>;
    }
    return (
      <Badge variant="outline" className="flex items-center space-x-1">
        <DollarSign className="h-3 w-3" />
        <span>{app.price} {app.currency}</span>
      </Badge>
    );
  };

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* 应用图标 */}
            <div className="flex-shrink-0">
              <img
                src={app.iconUrl || '/placeholder-app.png'}
                alt={app.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            </div>

            {/* 应用信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold truncate">{app.name}</h3>
                <div className="flex items-center space-x-2">
                  {renderPrice()}
                  {app.isFeatured && (
                    <Badge variant="default" className="bg-yellow-500">
                      热门
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {app.shortDesc || app.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{app.rating.toFixed(1)}</span>
                    <span className="text-xs">({app.ratingCount})</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Download className="h-4 w-4" />
                    <span>{app.downloadCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <HardDrive className="h-4 w-4" />
                    <span>{formatFileSize(app.installSize)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFavoriteToggle();
                    }}
                  >
                    <Heart 
                      className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} 
                    />
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload();
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    下载
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={onClick}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="relative">
            <img
              src={app.iconUrl || '/placeholder-app.png'}
              alt={app.name}
              className="w-20 h-20 rounded-xl object-cover mx-auto"
            />
            {app.isFeatured && (
              <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-xs">
                热门
              </Badge>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle();
            }}
          >
            <Heart 
              className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} 
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <div className="space-y-3">
          {/* 应用名称和价格 */}
          <div className="text-center">
            <h3 className="font-semibold text-lg truncate mb-1">{app.name}</h3>
            <div className="flex justify-center">
              {renderPrice()}
            </div>
          </div>

          {/* 简短描述 */}
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {app.shortDesc || app.description}
          </p>

          {/* 统计信息 */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{app.rating.toFixed(1)}</span>
              <span className="text-muted-foreground text-xs">({app.ratingCount})</span>
            </div>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Download className="h-3 w-3" />
              <span>{app.downloadCount.toLocaleString()}</span>
            </div>
          </div>

          {/* 分类和系统支持 */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              {app.category?.name}
            </Badge>
            {app.supportedOS.slice(0, 2).map(os => (
              <Badge key={os} variant="secondary" className="text-xs">
                {os}
              </Badge>
            ))}
            {app.supportedOS.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{app.supportedOS.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          下载 {formatFileSize(app.installSize)}
        </Button>
      </CardFooter>
    </Card>
  );
}