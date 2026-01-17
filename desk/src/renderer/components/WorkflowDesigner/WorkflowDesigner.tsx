import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import WorkflowCanvas from './WorkflowCanvas';
import NodePalette from './NodePalette';
import PropertyPanel from './PropertyPanel';
import { Node, Edge, Workflow, WorkflowExecution } from './types';
import { useElectronAPI } from '../../contexts/ElectronAPIContext';
import apiService from '../../services/apiService';

interface WorkflowDesignerProps {
  workflowId?: string;
  templateId?: string;
  readonly?: boolean;
  onSave?: (workflow: Workflow) => void;
  onExecute?: (workflowId: string) => void;
}

const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  workflowId,
  templateId,
  readonly = false,
  onSave,
  onExecute
}) => {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [executionHistory, setExecutionHistory] = useState<WorkflowExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(false);
  
  const electronAPI = useElectronAPI();
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef<string>('');

  // 加载工作流数据
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        let workflowData: Workflow | null = null;

        if (workflowId) {
          // 加载现有工作流
          const response = await apiService.get<Workflow>(`/api/workflows/${workflowId}`);
          if (response.success) {
            workflowData = response.data;
          }
        } else if (templateId) {
          // 加载模板
          const response = await apiService.get(`/api/workflows/templates/${templateId}`);
          if (response.success) {
            workflowData = response.data;
          }
        }

        if (workflowData) {
          setWorkflow(workflowData);
          setNodes(workflowData.nodes || []);
          setEdges(workflowData.edges || []);
          lastSavedRef.current = JSON.stringify(workflowData);
        } else {
          // 创建新工作流
          const newWorkflow: Workflow = {
            id: `workflow-${Date.now()}`,
            name: '新工作流',
            description: '',
            category: 'automation',
            tags: [],
            nodes: [
              {
                id: 'start',
                type: 'start',
                position: { x: 100, y: 200 },
                config: { title: '开始', description: '工作流开始' },
                status: 'idle'
              },
              {
                id: 'end',
                type: 'end',
                position: { x: 700, y: 200 },
                config: { title: '结束', description: '工作流结束' },
                status: 'idle'
              }
            ],
            edges: [],
            variables: [],
            settings: {
              timeout: 3600,
              retryPolicy: {
                maxRetries: 3,
                retryDelay: 1000,
                exponentialBackoff: true
              },
              errorHandling: {
                stopOnError: true,
                notifyOnError: true
              }
            },
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: '1.0.0',
              category: 'automation',
              difficulty: 'beginner'
            }
          };
          setWorkflow(newWorkflow);
          setNodes(newWorkflow.nodes);
          setEdges(newWorkflow.edges);
          lastSavedRef.current = JSON.stringify(newWorkflow);
        }
      } catch (error) {
        console.error('加载工作流失败:', error);
      }
    };

    loadWorkflow();
  }, [workflowId, templateId]);

  // 加载执行历史
  useEffect(() => {
    if (workflowId) {
      const loadExecutionHistory = async () => {
        try {
          const response = await apiService.get<WorkflowExecution[]>(`/api/workflows/${workflowId}/executions`);
          if (response.success) {
            setExecutionHistory(response.data);
          }
        } catch (error) {
          console.error('加载执行历史失败:', error);
        }
      };
      loadExecutionHistory();
    }
  }, [workflowId]);

  // 检查未保存的更改
  useEffect(() => {
    if (workflow) {
      const currentWorkflow = { ...workflow, nodes, edges };
      const currentJson = JSON.stringify(currentWorkflow);
      setHasUnsavedChanges(currentJson !== lastSavedRef.current);
    }
  }, [workflow, nodes, edges]);

  // 节点变化处理
  const handleNodesChange = useCallback((newNodes: Node[]) => {
    setNodes(newNodes);
  }, []);

  // 边变化处理
  const handleEdgesChange = useCallback((newEdges: Edge[]) => {
    setEdges(newEdges);
  }, []);

  // 保存工作流
  const handleSave = useCallback(async () => {
    if (!workflow || readonly) return;

    setIsSaving(true);
    try {
      const updatedWorkflow = { ...workflow, nodes, edges };
      updatedWorkflow.metadata.updatedAt = new Date().toISOString();

      const response = await apiService.post('/api/workflows', updatedWorkflow);
      if (response.success) {
        setWorkflow(response.data);
        lastSavedRef.current = JSON.stringify(response.data);
        setHasUnsavedChanges(false);
        onSave?.(response.data);
      }
    } catch (error) {
      console.error('保存工作流失败:', error);
    } finally {
      setIsSaving(false);
    }
  }, [workflow, nodes, edges, readonly, onSave]);

  // 执行工作流
  const handleExecute = useCallback(async () => {
    if (!workflowId || isExecuting) return;

    setIsExecuting(true);
    try {
      const response = await apiService.post(`/api/workflows/${workflowId}/execute`);
      if (response.success) {
        // 刷新执行历史
        const historyResponse = await apiService.get<WorkflowExecution[]>(`/api/workflows/${workflowId}/executions`);
        if (historyResponse.success) {
          setExecutionHistory(historyResponse.data);
        }
        onExecute?.(workflowId);
      }
    } catch (error) {
      console.error('执行工作流失败:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [workflowId, isExecuting, onExecute]);

  // 导出工作流
  const handleExport = useCallback(() => {
    if (!workflow) return;

    const exportData = {
      version: '1.0',
      workflow: { ...workflow, nodes, edges },
      metadata: {
        exportedAt: new Date().toISOString(),
        // @ts-ignore - user property may not exist
        exportedBy: (electronAPI as any)?.user?.id,
        format: 'json'
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [workflow, nodes, edges, electronAPI]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'e':
            e.preventDefault();
            handleExecute();
            break;
          case 'z':
            e.preventDefault();
            // 撤销操作
            break;
          case 'y':
            e.preventDefault();
            // 重做操作
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleExecute]);

  // 切换选择状态
  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const handleEdgeSelect = useCallback((edge: Edge | null) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="workflow-designer h-full flex flex-col bg-gray-900">
        {/* 工具栏 */}
        <div className="glass-panel p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-white font-semibold">
                {workflow?.name || '工作流设计器'}
              </h2>
              {hasUnsavedChanges && (
                <span className="text-yellow-400 text-sm">● 未保存</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* 视图控制 */}
              <div className="flex items-center space-x-1 glass rounded-lg p-1">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-2 rounded ${showGrid ? 'bg-white/20 text-white' : 'text-gray-400'} hover:text-white`}
                  title="显示网格"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowMinimap(!showMinimap)}
                  className={`p-2 rounded ${showMinimap ? 'bg-white/20 text-white' : 'text-gray-400'} hover:text-white`}
                  title="小地图"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </button>
              </div>

              <div className="w-px h-6 bg-gray-600"></div>

              {/* 操作按钮 */}
              {!readonly && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !hasUnsavedChanges}
                    className={`btn-primary ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className={`btn-secondary ${isExecuting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isExecuting ? '执行中...' : '执行'}
                  </button>
                </>
              )}
              
              <button onClick={handleExport} className="btn-glass">
                导出
              </button>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧节点面板 */}
          {!readonly && (
            <div className="w-80 border-r border-white/10">
              <NodePalette />
            </div>
          )}

          {/* 中间画布 */}
          <div className="flex-1 relative" ref={canvasRef}>
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onNodeSelect={handleNodeSelect}
              onEdgeSelect={handleEdgeSelect}
              selectedNode={selectedNode}
              readonly={readonly}
            />

            {/* 小地图 */}
            {showMinimap && (
              <div className="absolute bottom-4 left-4 w-48 h-32 glass-panel rounded-lg">
                <div className="text-xs text-gray-400 p-2">小地图</div>
                {/* 小地图内容 */}
              </div>
            )}
          </div>

          {/* 右侧属性面板 */}
          <div className="w-80 border-l border-white/10">
            <PropertyPanel
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              selectedWorkflow={workflow}
              onNodeUpdate={(node) => {
                const newNodes = nodes.map(n => n.id === node.id ? node : n);
                handleNodesChange(newNodes);
              }}
              onEdgeUpdate={(edge) => {
                const newEdges = edges.map(e => e.id === edge.id ? edge : e);
                handleEdgesChange(newEdges);
              }}
              onWorkflowUpdate={setWorkflow}
              readonly={readonly}
            />
          </div>
        </div>

        {/* 底部状态栏 */}
        <div className="glass-panel px-4 py-2 border-t border-white/10">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-4">
              <span>节点: {nodes.length}</span>
              <span>连接: {edges.length}</span>
              <span>执行历史: {executionHistory.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              {workflow?.status === 'active' && (
                <span className="flex items-center text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  活跃
                </span>
              )}
              <span>快捷键: Ctrl+S 保存 | Ctrl+E 执行</span>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default WorkflowDesigner;