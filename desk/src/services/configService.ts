import Store from 'electron-store';

export interface AppConfig {
  // 用户偏好设置
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    autoSave: boolean;
    fontSize: number;
    fontFamily: string;
    lineNumbers: boolean;
    wordWrap: boolean;
    minimap: boolean;
  };
  
  // AI配置
  ai: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    enableRecommendations: boolean;
    enableCodeAnalysis: boolean;
    enableAutoComplete: boolean;
  };
  
  // 项目配置
  projects: {
    recentProjects: Array<{
      name: string;
      path: string;
      lastOpened: Date;
      type: string;
    }>;
    defaultProjectPath: string;
    autoBackup: boolean;
  };
  
  // 窗口配置
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    maximized: boolean;
    alwaysOnTop: boolean;
  };
  
  // 网络配置
  network: {
    apiBaseUrl: string;
    wsUrl: string;
    timeout: number;
    retryAttempts: number;
    enableOfflineMode: boolean;
  };
  
  // 开发者配置
  developer: {
    enableDevTools: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    enableDebugMode: boolean;
  };
}

export class ConfigService {
  private static instance: ConfigService;
  private store: Store<AppConfig>;
  
  private constructor() {
    this.store = new Store<AppConfig>({
      defaults: this.getDefaultConfig()
    });
  }
  
  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }
  
  private getDefaultConfig(): AppConfig {
    return {
      preferences: {
        theme: 'auto',
        language: 'zh-CN',
        autoSave: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
        lineNumbers: true,
        wordWrap: true,
        minimap: true
      },
      
      ai: {
        apiKey: '',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        enableRecommendations: true,
        enableCodeAnalysis: true,
        enableAutoComplete: true
      },
      
      projects: {
        recentProjects: [],
        defaultProjectPath: '',
        autoBackup: true
      },
      
      window: {
        width: 1400,
        height: 900,
        maximized: false,
        alwaysOnTop: false
      },
      
      network: {
        apiBaseUrl: 'http://localhost:3000',
        wsUrl: 'ws://localhost:3001',
        timeout: 10000,
        retryAttempts: 3,
        enableOfflineMode: false
      },
      
      developer: {
        enableDevTools: false,
        logLevel: 'info',
        enableDebugMode: false
      }
    };
  }
  
  /**
   * 获取完整配置
   */
  getConfig(): AppConfig {
    return this.store.store;
  }
  
  /**
   * 获取配置项
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.store.get(key);
  }
  
  /**
   * 设置配置项
   */
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.store.set(key, value);
  }
  
  /**
   * 更新配置项（部分更新）
   */
  update<K extends keyof AppConfig>(key: K, updates: Partial<AppConfig[K]>): void {
    const current = this.get(key);
    this.set(key, { ...current, ...updates });
  }
  
  /**
   * 重置配置
   */
  reset(): void {
    this.store.clear();
    this.store.store = this.getDefaultConfig();
  }
  
  /**
   * 重置特定配置项
   */
  resetKey<K extends keyof AppConfig>(key: K): void {
    this.store.delete(key);
  }
  
  /**
   * 监听配置变化
  onChanged(callback: (key: string, newValue: any, oldValue: any) => void): void {
    // @ts-ignore
    this.store.onDidChange(null, (key: any, newStoreValue: any, oldStoreValue: any) => {
      callback(key, newStoreValue, oldStoreValue);
    });
  }
    path: string;
    type: string;
  }): void {
    const recentProjects = this.get('projects').recentProjects;
    const existingIndex = recentProjects.findIndex(p => p.path === project.path);
    
    if (existingIndex >= 0) {
      // 更新现有项目
      recentProjects[existingIndex] = {
        ...recentProjects[existingIndex],
        lastOpened: new Date(),
        name: project.name
      };
      
      // 移动到最前面
      recentProjects.splice(existingIndex, 1);
      recentProjects.unshift({
        ...recentProjects[existingIndex],
        lastOpened: new Date()
      });
    } else {
      // 添加新项目
      recentProjects.unshift({
        ...project,
        lastOpened: new Date()
      });
    }
    
    // 限制最近项目数量
    if (recentProjects.length > 10) {
      recentProjects.splice(10);
    }
    
    this.update('projects', { recentProjects });
  }
  
  /**
   * 移除最近项目
   */
  removeRecentProject(path: string): void {
    const recentProjects = this.get('projects').recentProjects;
    const filteredProjects = recentProjects.filter(p => p.path !== path);
    this.update('projects', { recentProjects: filteredProjects });
  }
  
  /**
   * 清空最近项目
   */
  clearRecentProjects(): void {
    this.update('projects', { recentProjects: [] });
  }
  
  /**
   * 获取最近项目
   */
  getRecentProjects(): Array<{
    name: string;
    path: string;
    lastOpened: Date;
    type: string;
  }> {
    return this.get('projects').recentProjects;
  }
  
  /**
   * 导出配置
   */
  exportConfig(): string {
    return JSON.stringify(this.getConfig(), null, 2);
  }
  
  /**
   * 导入配置
   */
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson) as AppConfig;
      // 验证配置结构
      if (this.validateConfig(config)) {
        this.store.store = config;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  
  /**
   * 验证配置结构
   */
  private validateConfig(config: any): config is AppConfig {
    return (
      config &&
      typeof config === 'object' &&
      config.preferences &&
      config.ai &&
      config.projects &&
      config.window &&
      config.network &&
      config.developer
    );
  }
  
  /**
   * 获取主题设置
   */
  getTheme(): 'light' | 'dark' | 'auto' {
    return this.get('preferences').theme;
  }
  
  /**
   * 设置主题
   */
  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.update('preferences', { theme });
  }
  
  /**
   * 获取AI配置
   */
  getAIConfig() {
    return this.get('ai');
  }
  
  /**
   * 设置AI配置
   */
  setAIConfig(aiConfig: Partial<AppConfig['ai']>): void {
    this.update('ai', aiConfig);
  }
  
  /**
   * 获取网络配置
   */
  getNetworkConfig() {
    return this.get('network');
  }
  
  /**
   * 设置网络配置
   */
  setNetworkConfig(networkConfig: Partial<AppConfig['network']>): void {
    this.update('network', networkConfig);
  }
  
  /**
   * 检查是否为开发者模式
   */
  isDeveloperMode(): boolean {
    return this.get('developer').enableDebugMode;
  }
  
  /**
   * 设置开发者模式
   */
  setDeveloperMode(enabled: boolean): void {
    this.update('developer', { enableDebugMode: enabled });
  }
}