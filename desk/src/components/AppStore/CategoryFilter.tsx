import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { AppCategory } from '@/services/appStoreService';

interface CategoryFilterProps {
  categories: AppCategory[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      onCategoryChange('');
    } else {
      onCategoryChange(categoryId);
    }
  };

  const handleClearSelection = () => {
    onCategoryChange('');
  };

  // 获取顶级分类
  const topLevelCategories = categories.filter(cat => !cat.parentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">应用分类</h3>
        {selectedCategory && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSelection}
          >
            <X className="h-4 w-4 mr-1" />
            清除筛选
          </Button>
        )}
      </div>

      {/* 顶级分类 */}
      <div className="flex flex-wrap gap-2">
        {topLevelCategories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryClick(category.id)}
            className="flex items-center space-x-2"
          >
            {category.icon && (
              <span className="text-sm">{category.icon}</span>
            )}
            <span>{category.name}</span>
            {category.color && (
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: category.color }}
              />
            )}
          </Button>
        ))}
      </div>

      {/* 子分类 - 如果有选中分类，显示其子分类 */}
      {selectedCategory && (
        <div className="space-y-2">
          {categories
            .filter(cat => cat.parentId === selectedCategory)
            .map((subcategory) => (
              <Button
                key={subcategory.id}
                variant={selectedCategory === subcategory.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleCategoryClick(subcategory.id)}
                className="justify-start"
              >
                {subcategory.icon && (
                  <span className="text-sm mr-2">{subcategory.icon}</span>
                )}
                <span>{subcategory.name}</span>
              </Button>
            ))}
        </div>
      )}

      {/* 显示当前选中的分类路径 */}
      {selectedCategory && (
        <div className="flex items-center space-x-2 p-2 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground">当前选择:</span>
          {(() => {
            const selectedCat = categories.find(cat => cat.id === selectedCategory);
            if (!selectedCat) return null;
            
            return (
              <Badge variant="secondary" className="flex items-center space-x-1">
                {selectedCat.icon && (
                  <span className="text-sm">{selectedCat.icon}</span>
                )}
                <span>{selectedCat.name}</span>
              </Badge>
            );
          })()}
        </div>
      )}
    </div>
  );
}