import React, { ReactNode, forwardRef } from 'react';
import { Button, ButtonProps } from './button';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { Loader2 } from 'lucide-react';

interface MobileButtonProps extends Omit<ButtonProps, 'size' | 'variant'> {
  children: ReactNode;
  variant?: 'default' | 'mobile' | 'desktop';
  mobileSize?: 'sm' | 'md' | 'lg' | 'xl';
  hapticFeedback?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  touchArea?: 'normal' | 'large';
  // 覆盖Button的size属性
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  (
    {
      children,
      variant = 'default',
      mobileSize = 'md',
      hapticFeedback = false,
      loading = false,
      fullWidth = false,
      touchArea = 'normal',
      className = '',
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const { isMobile, isTablet } = useMobileDetection();

    // 触摸反馈
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isMobile && hapticFeedback && 'vibrate' in navigator) {
        // 震动反馈
        navigator.vibrate(10);
      }
      
      onClick?.(e);
    };

    // 响应式尺寸
    const getSizeClasses = () => {
      if (variant === 'mobile' || (isMobile || isTablet)) {
        const sizeClasses = {
          sm: 'min-h-[44px] px-3 py-2 text-sm',
          md: 'min-h-[48px] px-4 py-3 text-base',
          lg: 'min-h-[52px] px-6 py-4 text-lg',
          xl: 'min-h-[56px] px-8 py-5 text-xl'
        };
        return sizeClasses[mobileSize];
      }

      // 对于桌面端，使用Button的size属性或默认值
      return '';
    };

    // 触摸区域大小
    const getTouchAreaClasses = () => {
      if (!isMobile && !isTablet) return '';
      
      const areaClasses = {
        normal: '',
        large: 'min-w-[120px]'
      };
      return areaClasses[touchArea];
    };

    const buttonClasses = cn(
      // 基础样式
      'relative overflow-hidden transition-all duration-200',
      
      // 移动端优化
      {
        'touch-manipulation': isMobile,
        'select-none': isMobile,
        'active:scale-95': isMobile,
        'focus:ring-2 focus:ring-offset-2': isMobile,
        'min-w-[44px] min-h-[44px]': isMobile, // iOS建议的最小触摸目标
      },
      
      // 尺寸类
      getSizeClasses(),

      // 触摸区域
      getTouchAreaClasses(),

      // 全宽
      fullWidth && (isMobile || isTablet) && 'w-full',

      // 自定义类
      className
    );

    return (
      <Button
        {...props}
        ref={ref}
        className={buttonClasses}
        onClick={handleClick}
        disabled={disabled || loading}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        <span className={loading ? 'opacity-70' : ''}>
          {children}
        </span>
      </Button>
    );
  }
);

MobileButton.displayName = 'MobileButton';