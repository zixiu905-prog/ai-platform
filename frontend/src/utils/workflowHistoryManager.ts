/**
 * 工作流历史管理器
 * 实现撤销/重做功能
 */

export interface WorkflowState {
  nodes: any[];
  edges: any[];
  viewport: any;
  metadata: {
    lastModified: Date;
    description?: string;
  };
}

export interface HistoryEntry {
  id: string;
  state: WorkflowState;
  timestamp: Date;
  description: string;
  action: 'add' | 'update' | 'delete' | 'move' | 'connect' | 'general';
}

export class WorkflowHistoryManager {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 50;
  private listeners: ((state: WorkflowState) => void)[] = [];

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * 添加新的历史记录
   */
  addHistoryEntry(
    state: WorkflowState, 
    description: string, 
    action: HistoryEntry['action'] = 'general'
  ): void {
    const entry: HistoryEntry = {
      id: this.generateId(),
      state: JSON.parse(JSON.stringify(state)), // 深拷贝
      timestamp: new Date(),
      description,
      action
    };

    // 如果当前不在最新状态，删除后续历史
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 添加新条目
    this.history.push(entry);
    this.currentIndex = this.history.length - 1;

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }

    console.log(`📝 添加历史记录: ${description} (索引: ${this.currentIndex})`);
  }

  /**
   * 撤销
   */
  undo(): WorkflowState | null {
    if (this.canUndo()) {
      this.currentIndex--;
      const state = this.history[this.currentIndex].state;
      this.notifyListeners(state);
      
      console.log(`↩️  撤销: ${this.history[this.currentIndex].description}`);
      return state;
    }
    return null;
  }

  /**
   * 重做
   */
  redo(): WorkflowState | null {
    if (this.canRedo()) {
      this.currentIndex++;
      const state = this.history[this.currentIndex].state;
      this.notifyListeners(state);
      
      console.log(`↪️  重做: ${this.history[this.currentIndex].description}`);
      return state;
    }
    return null;
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): WorkflowState | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex].state;
    }
    return null;
  }

  /**
   * 获取历史记录列表
   */
  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
    console.log('🗑️  历史记录已清空');
  }

  /**
   * 设置初始状态
   */
  setInitialState(state: WorkflowState): void {
    this.clearHistory();
    this.addHistoryEntry(state, '初始状态', 'general');
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener: (state: WorkflowState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(state: WorkflowState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('历史状态监听器错误:', error);
      }
    });
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 导出历史记录
   */
  exportHistory(): string {
    const exportData = {
      history: this.history,
      currentIndex: this.currentIndex,
      exportTime: new Date().toISOString()
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导入历史记录
   */
  importHistory(historyJson: string): void {
    try {
      const importData = JSON.parse(historyJson);
      
      if (importData.history && Array.isArray(importData.history)) {
        this.history = importData.history;
        this.currentIndex = importData.currentIndex || 0;
        console.log('📥 历史记录导入成功');
        
        // 通知监听器当前状态
        const currentState = this.getCurrentState();
        if (currentState) {
          this.notifyListeners(currentState);
        }
      }
    } catch (error) {
      console.error('历史记录导入失败:', error);
      throw new Error('历史记录格式不正确');
    }
  }

  /**
   * 获取操作统计
   */
  getStatistics(): {
    total: number;
    undoAvailable: number;
    redoAvailable: number;
    actions: Record<string, number>;
  } {
    const actions: Record<string, number> = {};
    
    this.history.forEach(entry => {
      actions[entry.action] = (actions[entry.action] || 0) + 1;
    });

    return {
      total: this.history.length,
      undoAvailable: this.currentIndex,
      redoAvailable: Math.max(0, this.history.length - this.currentIndex - 1),
      actions
    };
  }
}

// 创建单例实例
export const workflowHistoryManager = new WorkflowHistoryManager();

// React Hook for using the history manager
export function useWorkflowHistory() {
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);
  const [historySize, setHistorySize] = React.useState(0);

  React.useEffect(() => {
    const updateState = () => {
      setCanUndo(workflowHistoryManager.canUndo());
      setCanRedo(workflowHistoryManager.canRedo());
      setHistorySize(workflowHistoryManager.getHistory().length);
    };

    updateState();

    const unsubscribe = workflowHistoryManager.subscribe(() => {
      updateState();
    });

    return unsubscribe;
  }, []);

  const undo = React.useCallback(() => {
    return workflowHistoryManager.undo();
  }, []);

  const redo = React.useCallback(() => {
    return workflowHistoryManager.redo();
  }, []);

  const addHistory = React.useCallback((
    state: WorkflowState, 
    description: string, 
    action: HistoryEntry['action'] = 'general'
  ) => {
    workflowHistoryManager.addHistoryEntry(state, description, action);
  }, []);

  const clearHistory = React.useCallback(() => {
    workflowHistoryManager.clearHistory();
  }, []);

  const getHistory = React.useCallback(() => {
    return workflowHistoryManager.getHistory();
  }, []);

  const getStatistics = React.useCallback(() => {
    return workflowHistoryManager.getStatistics();
  }, []);

  return {
    canUndo,
    canRedo,
    historySize,
    undo,
    redo,
    addHistory,
    clearHistory,
    getHistory,
    getStatistics
  };
}

// 类型定义补充
import React from 'react';