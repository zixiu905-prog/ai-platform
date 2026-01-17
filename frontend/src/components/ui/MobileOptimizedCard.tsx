import React, { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from './card';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';

interface MobileOptimizedCardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  mobilePadding?: 'tight' | 'normal' | 'loose';
  mobileHeight?: 'auto' | 'compact' | 'full';
  mobileBorder?: boolean;
  mobileShadow?: boolean;
  onTap?: () => void;
}

export const MobileOptimizedCard: React.FC<MobileOptimizedCardProps> = ({
  children,
  title,
  className = '',
  mobilePadding = 'normal',
  mobileHeight = 'auto',
  mobileBorder = true,
  mobileShadow = false,
  onTap
}) => {
  const { isMobile, capabilities } = useMobileDetection();

  const mobileClasses = cn(
    // 移动端优化样式
    {
      // 触摸友好
      'touch-manipulation': capabilities.touchSupport && isMobile,
      
      // 响应式内边距
      'p-2 md:p-4': mobilePadding === 'tight' && isMobile,
      'p-3 md:p-6': mobilePadding === 'normal' && isMobile,
      'p-4 md:p-8': mobilePadding === 'loose' && isMobile,
      
      // 移动端高度
      'h-auto md:h-auto': mobileHeight === 'auto' && isMobile,
      'min-h-[200px] md:min-h-[300px]': mobileHeight === 'compact' && isMobile,
      'h-screen md:h-auto': mobileHeight === 'full' && isMobile,
      
      // 移动端边框
      'border-0 md:border': !mobileBorder && isMobile,
      
      // 移动端阴影
      'shadow-sm md:shadow': mobileShadow && isMobile,
    },
    className
  );

  const cardContent = (
    <Card className={mobileClasses}>
      {title && (
        <CardHeader className="pb-2 md:pb-4">
          <h3 className="text-lg md:text-xl font-semibold text-center md:text-left">
            {title}
          </h3>
        </CardHeader>
      )}
      <CardContent className="space-y-3 md:space-y-4">
        {children}
      </CardContent>
    </Card>
  );

  // 移动端添加触摸事件处理
  if (isMobile && onTap) {
    return (
      <div 
        className="cursor-pointer"
        onTouchEnd={(e) => {
          e.preventDefault();
          onTap();
        }}
        onClick={onTap}
      >
        {cardContent}
      </div>
    );
  }

  return cardContent;
};