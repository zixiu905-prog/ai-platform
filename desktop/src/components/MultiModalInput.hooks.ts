/**
 * 多模态输入界面的性能优化钩子
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import type { MultiModalData, InputResult } from './MultiModalInput';

// 防抖钩子
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback;
}

// 节流钩子
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  
  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay]
  ) as T;
  
  return throttledCallback;
}

// 性能监控钩子
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef<number>(Date.now());
  
  useEffect(() => {
    renderCount.current++;
    const renderTime = Date.now() - startTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `${componentName} 渲染 #${renderCount.current}, 耗时: ${renderTime}ms`
      );
    }
    
    // 如果渲染时间过长，显示警告
    if (renderTime > 100) {
      console.warn(
        `${componentName} 渲染时间过长: ${renderTime}ms`
      );
    }
    
    startTime.current = Date.now();
  });
  
  const getPerformanceInfo = useCallback(() => ({
    component: componentName,
    renderCount: renderCount.current,
    lastRenderTime: Date.now() - startTime.current
  }), [componentName]);
  
  return { getPerformanceInfo };
}

// 内存监控钩子
export function useMemoryMonitor() {
  const [memoryUsage, setMemoryUsage] = useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize;
        const total = memory.totalJSHeapSize;
        const percentage = (used / total) * 100;
        
        setMemoryUsage({
          used: Math.round(used / 1024 / 1024), // MB
          total: Math.round(total / 1024 / 1024), // MB
          percentage: Math.round(percentage * 100) / 100
        });
        
        // 内存使用超过80%时警告
        if (percentage > 80) {
          console.warn(`内存使用过高: ${percentage.toFixed(2)}%`);
        }
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return memoryUsage;
}

// 智能加载钩子
export function useSmartLoading(
  items: any[],
  batchSize: number = 10,
  threshold: number = 100
) {
  const [loadedItems, setLoadedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const currentIndex = useRef(0);
  
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    // 模拟加载延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const nextIndex = Math.min(currentIndex.current + batchSize, items.length);
    const newItems = items.slice(currentIndex.current, nextIndex);
    
    setLoadedItems(prev => [...prev, ...newItems]);
    currentIndex.current = nextIndex;
    
    if (nextIndex >= items.length) {
      setHasMore(false);
    }
    
    setIsLoading(false);
  }, [items, batchSize, isLoading, hasMore]);
  
  useEffect(() => {
    // 初始加载
    if (items.length > 0 && loadedItems.length === 0) {
      loadMore();
    }
  }, [items]);
  
  return {
    loadedItems,
    isLoading,
    hasMore,
    loadMore
  };
}

// 优化的输入状态钩子
export function useOptimizedInput() {
  const [input, setInput] = useState<Partial<MultiModalData>>({});
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<InputResult[]>([]);
  
  // 使用防抖优化输入处理
  const debouncedInput = useDebounce((newInput: Partial<MultiModalData>) => {
    setInput(newInput);
  }, 300);
  
  // 使用节流优化提交
  const throttledSubmit = useThrottle(async () => {
    setProcessing(true);
    try {
      // 模拟处理
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result: InputResult = {
        id: `result_${Date.now()}`,
        timestamp: Date.now(),
        type: 'success',
        message: '处理完成'
      };
      
      setResults(prev => [...prev, result]);
      message.success('处理成功');
    } catch (error) {
      message.error('处理失败');
    } finally {
      setProcessing(false);
    }
  }, 1000);
  
  const updateInput = useCallback((updates: Partial<MultiModalData>) => {
    debouncedInput(prev => ({ ...prev, ...updates }));
  }, [debouncedInput]);
  
  const submit = useCallback(() => {
    throttledSubmit();
  }, [throttledSubmit]);
  
  const reset = useCallback(() => {
    setInput({});
    setResults([]);
  }, []);
  
  return {
    input,
    processing,
    results,
    updateInput,
    submit,
    reset
  };
}

// 资源清理钩子
export function useResourceCleanup(resources: (() => void)[]) {
  useEffect(() => {
    return () => {
      resources.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('资源清理失败:', error);
        }
      });
    };
  }, resources);
}

// 错误边界钩子
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);
  
  const captureError = useCallback((error: Error) => {
    console.error('捕获错误:', error);
    setError(error);
    
    // 错误上报（可选）
    if (process.env.NODE_ENV === 'production') {
      // 实际应用中可以上报到错误监控服务
    }
  }, []);
  
  const resetError = useCallback(() => {
    setError(null);
  }, []);
  
  return { error, captureError, resetError };
}