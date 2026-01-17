import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  memoryUsage: number;
  bundleSize: number;
  apiResponseTime: number;
  renderTime: number;
}

export interface PerformanceThreshold {
  name: string;
    value: number;
    unit: string;
    good: number;
    needsImprovement: number;
    poor: number;
}

export class PerformanceService extends EventEmitter {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private thresholds: PerformanceThreshold[] = [];
  private isMonitoring = false;

  constructor() {
    super();
    this.initializeThresholds();
  }

  /**
   * 开始性能监控
   */
  startMonitoring(): void {
    if (this.isMonitoring || typeof window === 'undefined') {
      return;
    }

    this.isMonitoring = true;
    this.setupObservers();
    this.measureInitialMetrics();
    
    console.log('性能监控已启动');
    this.emit('monitoring-started');
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    this.cleanupObservers();
    
    console.log('性能监控已停止');
    this.emit('monitoring-stopped');
  }

  /**
   * 初始化性能阈值
   */
  private initializeThresholds(): void {
    this.thresholds = [
      {
        name: '首次内容绘制',
        value: 0,
        unit: 'ms',
        good: 1000,
        needsImprovement: 3000,
        poor: Infinity
      },
      {
        name: '最大内容绘制',
        value: 0,
        unit: 'ms',
        good: 2500,
        needsImprovement: 4000,
        poor: Infinity
      },
      {
        name: '累积布局偏移',
        value: 0,
        unit: '',
        good: 0.1,
        needsImprovement: 0.25,
        poor: Infinity
      },
      {
        name: '首次输入延迟',
        value: 0,
        unit: 'ms',
        good: 100,
        needsImprovement: 300,
        poor: Infinity
      },
      {
        name: '内存使用',
        value: 0,
        unit: 'MB',
        good: 50,
        needsImprovement: 100,
        poor: 200
      },
      {
        name: 'API响应时间',
        value: 0,
        unit: 'ms',
        good: 200,
        needsImprovement: 500,
        poor: 1000
      }
    ];
  }

  /**
   * 设置性能观察器
   */
  private setupObservers(): void {
    if (!window.performance || !window.PerformanceObserver) {
      console.warn('Performance API 不支持');
      return;
    }

    // 观察导航性能
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.pageLoadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
            this.metrics.firstContentfulPaint = this.getFirstContentfulPaint();
            this.emit('navigation-metrics', this.metrics);
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);
    } catch (error) {
      console.warn('导航性能观察失败:', error);
    }

    // 观察绘制性能
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'largest-contentful-paint') {
            this.metrics.largestContentfulPaint = entry.startTime;
            this.emit('lcp-metrics', { lcp: entry.startTime });
          }
        }
      });
      paintObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(paintObserver);
    } catch (error) {
      console.warn('LCP 观察失败:', error);
    }

    // 观察布局偏移
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.metrics.cumulativeLayoutShift = clsValue;
        this.emit('cls-metrics', { cls: clsValue });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('CLS 观察失败:', error);
    }

    // 观察长任务
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.emit('long-task', { duration: entry.duration });
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (error) {
      console.warn('长任务观察失败:', error);
    }

    // 观察资源加载
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.emit('resource-loaded', {
              name: entry.name,
              size: (entry as any).transferSize || 0,
              duration: entry.duration
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('资源加载观察失败:', error);
    }
  }

  /**
   * 测量初始指标
   */
  private measureInitialMetrics(): void {
    if (!window.performance) return;

    // 页面加载时间
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
    }

    // 内存使用
    if ((performance as any).memory) {
      this.metrics.memoryUsage = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
    }

    // 首次内容绘制
    this.metrics.firstContentfulPaint = this.getFirstContentfulPaint();
  }

  /**
   * 获取首次内容绘制时间
   */
  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry ? Math.round(fcpEntry.startTime) : 0;
  }

  /**
   * 记录API响应时间
   */
  recordApiResponseTime(url: string, duration: number): void {
    this.metrics.apiResponseTime = duration;
    
    // 更新阈值
    const threshold = this.thresholds.find(t => t.name === 'API响应时间');
    if (threshold) {
      threshold.value = duration;
    }

    this.emit('api-response-time', { url, duration });
  }

  /**
   * 记录渲染时间
   */
  recordRenderTime(componentName: string, duration: number): void {
    this.metrics.renderTime = duration;
    this.emit('render-time', { componentName, duration });
  }

  /**
   * 记录包大小
   */
  recordBundleSize(size: number): void {
    this.metrics.bundleSize = size;
    this.emit('bundle-size', { size });
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return {
      pageLoadTime: this.metrics.pageLoadTime || 0,
      firstContentfulPaint: this.metrics.firstContentfulPaint || 0,
      largestContentfulPaint: this.metrics.largestContentfulPaint || 0,
      cumulativeLayoutShift: this.metrics.cumulativeLayoutShift || 0,
      timeToInteractive: this.metrics.timeToInteractive || 0,
      memoryUsage: this.metrics.memoryUsage || 0,
      bundleSize: this.metrics.bundleSize || 0,
      apiResponseTime: this.metrics.apiResponseTime || 0,
      renderTime: this.metrics.renderTime || 0
    };
  }

  /**
   * 获取性能评分
   */
  getPerformanceScore(): number {
    const metrics = this.getMetrics();
    const weights = {
      fcp: 0.25,
      lcp: 0.25,
      cls: 0.15,
      fid: 0.15,
      tti: 0.1,
      memory: 0.1
    };

    const scores = {
      fcp: this.getScore(metrics.firstContentfulPaint, [1000, 3000]),
      lcp: this.getScore(metrics.largestContentfulPaint, [2500, 4000]),
      cls: this.getScore(1 - metrics.cumulativeLayoutShift, [0.9, 0.75]),
      fid: this.getScore(this.getTimeToInteractive(), [100, 300]),
      tti: this.getScore(this.getTimeToInteractive(), [3800, 7300]),
      memory: this.getScore(100 - (metrics.memoryUsage / 2), [50, 25])
    };

    const weightedScore = 
      scores.fcp * weights.fcp +
      scores.lcp * weights.lcp +
      scores.cls * weights.cls +
      scores.fid * weights.fid +
      scores.tti * weights.tti +
      scores.memory * weights.memory;

    return Math.round(weightedScore);
  }

  /**
   * 获取评分 (0-100)
   */
  private getScore(value: number, thresholds: [number, number]): number {
    const [good, needsImprovement] = thresholds;
    if (value >= good) return 100;
    if (value >= needsImprovement) return 50 + ((value - needsImprovement) / (good - needsImprovement)) * 50;
    return (value / needsImprovement) * 50;
  }

  /**
   * 获取可交互时间
   */
  private getTimeToInteractive(): number {
    if (!window.performance) return 0;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return 0;

    return navigation.domInteractive - navigation.fetchStart;
  }

  /**
   * 获取性能建议
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.firstContentfulPaint > 1800) {
      recommendations.push('首次内容绘制时间过长，建议优化关键资源加载');
    }

    if (metrics.largestContentfulPaint > 4000) {
      recommendations.push('最大内容绘制时间过长，建议优化图片和CSS加载');
    }

    if (metrics.cumulativeLayoutShift > 0.25) {
      recommendations.push('累积布局偏移过高，建议为图片和广告设置固定尺寸');
    }

    if (metrics.memoryUsage > 100) {
      recommendations.push('内存使用量较高，建议检查内存泄漏并优化数据结构');
    }

    if (metrics.apiResponseTime > 500) {
      recommendations.push('API响应时间较长，建议优化服务器性能或使用缓存');
    }

    if (metrics.renderTime > 16) {
      recommendations.push('渲染时间过长，建议使用React.memo和useMemo优化组件');
    }

    return recommendations;
  }

  /**
   * 清理观察器
   */
  private cleanupObservers(): void {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('清理性能观察器失败:', error);
      }
    });
    this.observers = [];
  }

  /**
   * 生成性能报告
   */
  generateReport(): {
    metrics: PerformanceMetrics;
    score: number;
    thresholds: PerformanceThreshold[];
    recommendations: string[];
    timestamp: number;
  } {
    const metrics = this.getMetrics();
    const score = this.getPerformanceScore();
    const recommendations = this.getRecommendations();

    // 更新阈值当前值
    this.thresholds[0].value = metrics.firstContentfulPaint;
    this.thresholds[1].value = metrics.largestContentfulPaint;
    this.thresholds[2].value = metrics.cumulativeLayoutShift;
    this.thresholds[4].value = metrics.memoryUsage;
    this.thresholds[5].value = metrics.apiResponseTime;

    return {
      metrics,
      score,
      thresholds: [...this.thresholds],
      recommendations,
      timestamp: Date.now()
    };
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

export const performanceService = new PerformanceService();