import React, { InputHTMLAttributes, forwardRef, useState, useEffect } from 'react';
import { Input } from './input';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { Eye, EyeOff } from 'lucide-react';

interface MobileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  mobileType?: 'text' | 'number' | 'password' | 'email' | 'tel';
  keyboardType?: 'default' | 'numeric' | 'email' | 'phone' | 'url';
  autoComplete?: string;
  clearable?: boolean;
  showPasswordToggle?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  (
    {
      label,
      error,
      helperText,
      mobileType = 'text',
      keyboardType = 'default',
      clearable = false,
      showPasswordToggle = false,
      maxLength,
      autoFocus = false,
      className = '',
      type,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const { isMobile, isTablet } = useMobileDetection();
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // 移动端输入类型映射
    const getInputType = () => {
      if (type === 'password') {
        return showPassword ? 'text' : 'password';
      }
      
      if ((isMobile || isTablet) && mobileType !== 'text') {
        return mobileType;
      }
      
      return type || 'text';
    };

    // 获取键盘类型
    const getInputMode = (): any => {
      const modeMap: Record<string, any> = {
        numeric: 'numeric',
        email: 'email',
        phone: 'tel',
        url: 'url'
      };

      return modeMap[keyboardType] || 'text';
    };

    // 处理值变化
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      // 数字类型验证
      if (mobileType === 'number' && newValue !== undefined && newValue !== null) {
        const numericValue = newValue.replace(/[^0-9.-]/g, '');
        if (numericValue !== newValue) {
          e.target.value = numericValue;
        }
      }
      
      onChange?.(e);
    };

    // 清空输入
    const handleClear = () => {
      const event = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(event);
    };

    // 切换密码显示
    const togglePassword = () => {
      setShowPassword(!showPassword);
    };

    // 自动对焦
    useEffect(() => {
      if (autoFocus && ref && 'current' in ref && ref.current) {
        setTimeout(() => {
          (ref.current as HTMLInputElement).focus();
        }, 100);
      }
    }, [autoFocus, ref]);

    const inputType = getInputType();
    const inputMode = getInputMode();

    const inputClasses = cn(
      'w-full transition-all duration-200',
      {
        // 移动端优化
        'text-lg md:text-base': isMobile || isTablet,
        'min-h-[44px] md:min-h-[38px]': isMobile || isTablet, // 最小触摸目标
        'touch-manipulation': isMobile,
        'select-none': isMobile,
        'active:scale-[1.02]': isMobile,
        
        // 焦点状态
        'ring-2 ring-offset-2': (isMobile || isTablet) && isFocused,
        'ring-blue-500': (isMobile || isTablet) && isFocused,
        
        // 错误状态
        'border-red-500': error,
        'focus:border-red-600': error,
        
        // 默认状态
        'border-gray-300': !error,
        'focus:border-blue-500': !error
      },
      className
    );

    const wrapperClasses = cn(
      'relative',
      {
        'mb-2': label || helperText || error
      }
    );

    return (
      <div className={wrapperClasses}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
            {label}
          </label>
        )}
        
        <div className="relative">
          <Input
            {...props}
            ref={ref}
            type={inputType}
            inputMode={inputMode}
            maxLength={maxLength}
            className={inputClasses}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          
          {/* 清空按钮 */}
          {clearable && value && (isMobile || isTablet) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              style={{ minWidth: '44px', minHeight: '44px' }} // 最小触摸目标
            >
              ×
            </button>
          )}
          
          {/* 密码显示切换 */}
          {showPasswordToggle && type === 'password' && (isMobile || isTablet) && (
            <button
              type="button"
              onClick={togglePassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          
          {/* 字符计数 */}
          {maxLength && value && (isMobile || isTablet) && (
            <div className="absolute right-2 top-full mt-1 text-xs text-gray-500">
              {String(value)?.length || 0}/{maxLength}
            </div>
          )}
        </div>
        
        {/* 错误信息 */}
        {error && (
          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
        
        {/* 帮助文本 */}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';