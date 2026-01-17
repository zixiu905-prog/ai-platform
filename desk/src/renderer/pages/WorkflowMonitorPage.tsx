import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useElectronAPI } from '../contexts/ElectronAPIContext';
import apiService from '../services/apiService';
import { WorkflowExecution } from '../components/WorkflowDesigner/types';

interface WorkflowMonitorPageProps {}

const WorkflowMonitorPage: React.FC<WorkflowMonitorPageProps> = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const electronAPI = useElectronAPI();
  
  const [workflow, setWorkflow] = useState<any>(null);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [realtimeLogs, setRealtimeLogs] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载工作流信息
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!workflowId) return;
      
      try {
        const response = await apiService.get(`/api/workflows/${workflowId}`);
        if (response.success) {
          setWorkflow(response.data);
        }
      } catch (error) {
        console.error('加载工作流失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflow();
  }, [workflowId]);

  // 加载执行记录
  useEffect(() => {
    const loadExecution = async () => {
      if (!workflowId) return;

      try {
        const response = await apiService.get(`/api/workflows/${workflowId}/executions`, {
          params: { limit: 1, orderBy: 'startTime', order: 'desc' }
        });
        if (response.success && response.data.length > 0) {
          const currentExecution = response.data[0];
          setExecution(currentExecution);
          setIsMonitoring(currentExecution.status === 'running');
        }
      } catch (error) {
        console.error('加载执行记录失败:', error);
      }
    };

    loadExecution();
  }, [workflowId]);

  // 实时日志更新
  useEffect(() => {
    if (!isMonitoring || !workflowId) return;

    // 这里可以连接WebSocket来获取实时日志
    const interval = setInterval(async () => {
      try {
        const response = await apiService.get(`/api/workflows/${workflowId}/logs`);
        if (response.success) {
          setRealtimeLogs(response.data);
        }
      } catch (error) {
        console.error('获取实时日志失败:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, workflowId]);

  // 停止执行
  const handleStop = async () => {
    if (!execution?.id) return;

    try {
      const response = await apiService.post(`/api/workflows/executions/${execution.id}/stop`);
      if (response.success) {
        setIsMonitoring(false);
        setExecution(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }
    } catch (error) {
      console.error('停止执行失败:', error);
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'completed':
        return 'text-green-400 bg-green-500/20';
      case 'failed':
        return 'text-red-400 bg-red-500/20';
      case 'cancelled':
        return 'text-gray-400 bg-gray-500/20';
      case 'paused':
        return 'text-orange-400 bg-orange-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '执行失败';
      case 'cancelled':
        return '已取消';
      case 'paused':
        return '已暂停';
      default:
        return '未知状态';
    }
  };

  // 格式化时间
  const formatDuration = (startTime: Date, endTime?: Date) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();
    
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-monitor h-full flex flex-col bg-gray-900">
      {/* 页面头部 */}
      <div className="glass-panel p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/workflows')}
              className="btn-glass flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>返回</span>
            </button>
            
            <div className="h-6 w-px bg-gray-600"></div>
            
            <div>
              <h1 className="text-xl font-semibold text-white">{workflow?.name}</h1>
              <p className="text-sm text-gray-400">工作流执行监控</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {execution && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(execution.status)}`}>
                {getStatusText(execution.status)}
              </div>
            )}
            
            {isMonitoring && (
              <button
                onClick={handleStop}
                className="btn-secondary flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                <span>停止执行</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧执行信息 */}
        <div className="w-80 border-r border-white/10 p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* 执行概览 */}
            {execution && (
              <div className="glass-card p-4">
                <h3 className="text-white font-semibold mb-3">执行概览</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">执行ID</span>
                    <span className="text-white text-sm font-mono">{execution.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">开始时间</span>
                    <span className="text-white text-sm">
                      {new Date(execution.startTime).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">执行时长</span>
                    <span className="text-white text-sm">
                      {formatDuration(execution.startTime, execution.endTime)}
                    </span>
                  </div>
                  {execution.error && (
                    <div className="mt-3">
                      <span className="text-gray-400 text-sm">错误信息</span>
                      <div className="mt-1 p-2 bg-red-500/20 rounded text-red-400 text-sm">
                        {execution.error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 节点执行状态 */}
            {execution?.nodeExecutions && (
              <div className="glass-card p-4">
                <h3 className="text-white font-semibold mb-3">节点执行状态</h3>
                <div className="space-y-2">
                  {execution.nodeExecutions.map(nodeExec => (
                    <div key={nodeExec.id} className="flex items-center justify-between p-2 glass rounded">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          nodeExec.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                          nodeExec.status === 'completed' ? 'bg-green-500' :
                          nodeExec.status === 'failed' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}></div>
                        <span className="text-white text-sm">{nodeExec.nodeId}</span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        {nodeExec.duration ? `${nodeExec.duration}ms` : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧日志区域 */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <div className="glass-panel p-3 mb-4 flex items-center justify-between">
            <h3 className="text-white font-semibold">实时日志</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setRealtimeLogs([])}
                className="btn-glass text-sm"
              >
                清除日志
              </button>
            </div>
          </div>

          <div className="flex-1 glass-panel p-4 overflow-y-auto font-mono text-sm">
            {realtimeLogs.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>暂无日志输出</p>
              </div>
            ) : (
              <div className="space-y-1">
                {realtimeLogs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="text-gray-500 text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`text-xs font-medium ${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'info' ? 'text-blue-400' :
                      'text-gray-400'
                    }`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-gray-300 flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowMonitorPage;