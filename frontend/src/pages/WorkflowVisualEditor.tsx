import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import WorkflowCanvas from '../components/WorkflowEditor/WorkflowCanvas';
import NodeConfigPanel from '../components/WorkflowEditor/NodeConfigPanel';
import { useWorkflowHistory } from '../utils/workflowHistoryManager';
import { workflowApi } from '../services/workflowApi';

// 节点模板定义
const NODE_TEMPLATES = [
  {
    type: 'start',
    title: '开始',
    description: '工作流开始节点',
    category: 'trigger',
    icon: '▶️',
    color: '#10b981'
  },
  {
    type: 'webhook',
    title: 'Webhook',
    description: 'HTTP触发器',
    category: 'trigger',
    icon: '🔗',
    color: '#8b5cf6'
  },
  {
    type: 'schedule',
    title: '定时触发',
    description: '定时任务触发器',
    category: 'trigger',
    icon: '⏰',
    color: '#f59e0b'
  },
  {
    type: 'http_request',
    title: 'HTTP请求',
    description: '发送HTTP请求',
    category: 'action',
    icon: '🌐',
    color: '#3b82f6'
  },
  {
    type: 'ai_processing',
    title: 'AI处理',
    description: 'AI智能处理节点',
    category: 'action',
    icon: '🤖',
    color: '#ec4899'
  },
  {
    type: 'ai_design_concept',
    title: 'AI设计概念',
    description: 'AI设计概念生成',
    category: 'ai',
    icon: '🎨',
    color: '#f97316'
  },
  {
    type: 'ai_design_layout',
    title: 'AI布局设计',
    description: 'AI布局设计生成',
    category: 'ai',
    icon: '📐',
    color: '#06b6d4'
  },
  {
    type: 'ai_design_color',
    title: 'AI色彩方案',
    description: 'AI色彩方案生成',
    category: 'ai',
    icon: '🎨',
    color: '#84cc16'
  },
  {
    type: 'condition',
    title: '条件判断',
    description: '条件分支控制',
    category: 'control',
    icon: '🔀',
    color: '#f97316'
  },
  {
    type: 'transform',
    title: '数据转换',
    description: '数据格式转换',
    category: 'transform',
    icon: '🔄',
    color: '#84cc16'
  },
  {
    type: 'email',
    title: '邮件发送',
    description: '发送邮件通知',
    category: 'action',
    icon: '📧',
    color: '#0ea5e9'
  },
  {
    type: 'code_execution',
    title: '代码执行',
    description: '执行自定义代码',
    category: 'action',
    icon: '💻',
    color: '#a855f7'
  },
  {
    type: 'database_query',
    title: '数据库查询',
    description: '数据库操作',
    category: 'data',
    icon: '🗄️',
    color: '#14b8a6'
  },
  {
    type: 'file_operation',
    title: '文件操作',
    description: '文件读写操作',
    category: 'data',
    icon: '📁',
    color: '#6366f1'
  },
  {
    type: 'end',
    title: '结束',
    description: '工作流结束节点',
    category: 'control',
    icon: '⏹️',
    color: '#ef4444'
  }
];

interface WorkflowData {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings: {
    timezone: string;
    retryPolicy: string;
    timeout: number;
  };
  status: 'draft' | 'active' | 'paused' | 'error';
  createdAt: string;
  updatedAt: string;
}

export const WorkflowVisualEditor: React.FC = () => {
  const navigate = useNavigate();
  const { workflowId } = useParams<{ workflowId: string }>();
  
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNodeLibrary, setShowNodeLibrary] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // 历史管理
  const { canUndo, canRedo, undo, redo, addHistory, clearHistory } = useWorkflowHistory();

  // 辅助函数：记录历史并更新状态
  const updateWithHistory = useCallback((
    newNodes: WorkflowNode[], 
    newEdges: WorkflowEdge[], 
    description: string, 
    action: 'add' | 'update' | 'delete' | 'move' | 'connect' | 'general' = 'general'
  ) => {
    const currentState = {
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 }, // 默认视口
      metadata: {
        lastModified: new Date(),
        description: workflow?.description
      }
    };

    const newState = {
      nodes: newNodes,
      edges: newEdges,
      viewport: { x: 0, y: 0, zoom: 1 },
      metadata: {
        lastModified: new Date(),
        description: workflow?.description
      }
    };

    // 添加历史记录
    addHistory(currentState, description, action);

    // 更新当前状态
    setNodes(newNodes);
    setEdges(newEdges);
  }, [nodes, edges, workflow?.description, addHistory]);

  // 加载工作流数据
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!workflowId) return;

      try {
        setLoading(true);
        const response = await workflowApi.getWorkflow(workflowId);
        
        if (response.success) {
          const workflowData = response.data;
          setWorkflow(workflowData);
          const loadedNodes = workflowData.nodes || [];
          const loadedEdges = workflowData.edges || [];
          setNodes(loadedNodes);
          setEdges(loadedEdges);

          // 初始化历史记录
          const initialState = {
            nodes: loadedNodes,
            edges: loadedEdges,
            viewport: { x: 0, y: 0, zoom: 1 },
            metadata: {
              lastModified: new Date(),
              description: workflowData.description
            }
          };
          clearHistory();
          addHistory(initialState, '加载工作流', 'general');
        } else {
          // 创建新工作流
          const newWorkflow: WorkflowData = {
            id: workflowId,
            name: '新工作流',
            description: '',
            nodes: [],
            edges: [],
            settings: {
              timezone: 'Asia/Shanghai',
              retryPolicy: 'exponential',
              timeout: 30000
            },
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setWorkflow(newWorkflow);
          setNodes([]);
          setEdges([]);

          // 初始化历史记录
          const initialState = {
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            metadata: {
              lastModified: new Date(),
              description: ''
            }
          };
          clearHistory();
          addHistory(initialState, '创建新工作流', 'general');
        }
      } catch (error) {
        console.error('加载工作流失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflow();
  }, [workflowId]);

  // 获取分类后的节点模板
  const getNodesByCategory = useCallback((category: string) => {
    if (category === 'all') return NODE_TEMPLATES;
    return NODE_TEMPLATES.filter(template => template.category === category);
  }, []);

  // 添加节点到画布
  const handleAddNode = useCallback((template: typeof NODE_TEMPLATES[0]) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type as any,
      position: {
        x: 200 + Math.random() * 200,
        y: 200 + Math.random() * 200
      },
      config: {
        title: template.title,
        description: template.description,
        parameters: {},
        settings: {}
      }
    };

    const newNodes = [...nodes, newNode];
    updateWithHistory(newNodes, edges, `添加${template.title}节点`, 'add');
  }, [nodes, edges, updateWithHistory]);

  // 处理节点点击
  const handleNodeClick = useCallback((node: WorkflowNode) => {
    setSelectedNode(node);
  }, []);

  // 处理节点移动
  const handleNodeMove = useCallback((nodeId: string, position: { x: number; y: number }) => {
    const newNodes = nodes.map(node => 
      node.id === nodeId ? { ...node, position } : node
    );
    updateWithHistory(newNodes, edges, `移动节点位置`, 'move');
  }, [nodes, edges, updateWithHistory]);

  // 处理节点选择
  const handleNodeSelect = useCallback((nodeId: string, selected: boolean) => {
    setSelectedNodes(prev => 
      selected 
        ? [...prev.filter(id => id !== nodeId), nodeId]
        : prev.filter(id => id !== nodeId)
    );
  }, []);

  // 处理画布点击
  const handleCanvasClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedNodes([]);
  }, []);

  // 创建连接
  const handleEdgeCreate = useCallback((from: string, to: string) => {
    // 检查是否已存在连接
    const existingEdge = edges.find(edge => 
      edge.from === from && edge.to === to
    );
    
    if (!existingEdge) {
      const newEdge: WorkflowEdge = {
        from,
        to
      };
      setEdges(prev => [...prev, newEdge]);
    }
  }, [edges]);

  // 删除选中的节点和连接
  const handleDeleteSelected = useCallback(() => {
    const newNodes = nodes.filter(node => !selectedNodes.includes(node.id));
    const newEdges = edges.filter(edge => 
      !selectedNodes.includes(edge.from) && !selectedNodes.includes(edge.to)
    );
    
    updateWithHistory(newNodes, newEdges, `删除${selectedNodes.length}个节点`, 'delete');
    setSelectedNodes([]);
    setSelectedNode(null);
  }, [selectedNodes, nodes, edges, updateWithHistory]);

  // 保存工作流
  const handleSave = useCallback(async () => {
    if (!workflow) return;

    try {
      setSaving(true);
      const updatedWorkflow = {
        ...workflow,
        nodes,
        edges,
        updatedAt: new Date().toISOString()
      };

      const response = await workflowApi.updateWorkflow(workflow.id, updatedWorkflow);
      
      if (response.success) {
        setWorkflow(updatedWorkflow);
        // 显示保存成功提示
        alert('工作流保存成功！');
      }
    } catch (error) {
      console.error('保存工作流失败:', error);
      alert('保存失败，请重试！');
    } finally {
      setSaving(false);
    }
  }, [workflow, nodes, edges]);

  // 运行工作流
  const handleRun = useCallback(async () => {
    if (!workflow) return;

    try {
      const response = await workflowApi.executeWorkflow(workflow.id);
      
      if (response.success) {
        alert('工作流执行成功！');
        navigate(`/workflows/monitor/${workflow.id}`);
      }
    } catch (error) {
      console.error('执行工作流失败:', error);
      alert('执行失败，请检查工作流配置！');
    }
  }, [workflow, navigate]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'z':
            if (!e.shiftKey) {
              e.preventDefault();
              const previousState = undo();
              if (previousState) {
                setNodes(previousState.nodes);
                setEdges(previousState.edges);
              }
            }
            break;
          case 'y':
            if (e.shiftKey) {
              e.preventDefault();
              const nextState = redo();
              if (nextState) {
                setNodes(nextState.nodes);
                setEdges(nextState.edges);
              }
            }
            break;
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodes.length > 0) {
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleDeleteSelected, selectedNodes.length]);

  const categories = [
    { id: 'all', name: '全部', icon: '📦' },
    { id: 'trigger', name: '触发器', icon: '⚡' },
    { id: 'action', name: '动作', icon: '⚙️' },
    { id: 'ai', name: 'AI功能', icon: '🤖' },
    { id: 'control', name: '控制', icon: '🎮' },
    { id: 'data', name: '数据', icon: '💾' },
    { id: 'transform', name: '转换', icon: '🔄' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载工作流编辑器...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/workflows')}
            className="text-gray-600 hover:text-gray-900 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回</span>
          </button>
          
          <div className="h-6 w-px bg-gray-300"></div>
          
          <div>
            <input
              type="text"
              value={workflow?.name || ''}
              onChange={(e) => workflow && setWorkflow({ ...workflow, name: e.target.value })}
              className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              placeholder="工作流名称"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              workflow?.status === 'active' ? 'bg-green-100 text-green-800' :
              workflow?.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              workflow?.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {workflow?.status === 'active' ? '已激活' :
               workflow?.status === 'draft' ? '草稿' :
               workflow?.status === 'paused' ? '已暂停' : '错误'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 撤销按钮 */}
          <button
            onClick={() => {
              const previousState = undo();
              if (previousState) {
                setNodes(previousState.nodes);
                setEdges(previousState.edges);
              }
            }}
            disabled={!canUndo}
            className={`p-2 rounded-lg flex items-center space-x-1 transition-colors ${
              canUndo 
                ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' 
                : 'text-gray-400 cursor-not-allowed'
            }`}
            title="撤销 (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span className="text-xs">撤销</span>
          </button>

          {/* 重做按钮 */}
          <button
            onClick={() => {
              const nextState = redo();
              if (nextState) {
                setNodes(nextState.nodes);
                setEdges(nextState.edges);
              }
            }}
            disabled={!canRedo}
            className={`p-2 rounded-lg flex items-center space-x-1 transition-colors ${
              canRedo 
                ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' 
                : 'text-gray-400 cursor-not-allowed'
            }`}
            title="重做 (Ctrl+Shift+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
            <span className="text-xs">重做</span>
          </button>

          <div className="h-6 w-px bg-gray-300"></div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                <span>保存中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
                </svg>
                <span>保存</span>
              </>
            )}
          </button>

          <button
            onClick={handleRun}
            disabled={!workflow || nodes.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>运行</span>
          </button>

          <div className="h-6 w-px bg-gray-300"></div>

          <button
            onClick={() => setShowNodeLibrary(!showNodeLibrary)}
            className={`p-2 rounded-lg ${
              showNodeLibrary ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
            title="节点库"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 节点库 */}
        {showNodeLibrary && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* 分类标签 */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-3">节点库</h3>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeCategory === category.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 节点列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {getNodesByCategory(activeCategory).map((template, index) => (
                  <div
                    key={`${template.type}_${index}`}
                    onClick={() => handleAddNode(template)}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start space-x-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: template.color }}
                      >
                        <span className="text-lg">{template.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 group-hover:text-blue-600">
                          {template.title}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {template.description}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 工作流画布 */}
        <div className="flex-1 relative">
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            onNodeMove={handleNodeMove}
            onEdgeCreate={handleEdgeCreate}
            onNodeSelect={handleNodeSelect}
            selectedNodes={selectedNodes}
            onCanvasClick={handleCanvasClick}
          />
        </div>

        {/* 节点配置面板 */}
        {selectedNode && (
          <div className="w-96 bg-white border-l border-gray-200">
            <NodeConfigPanel
              node={selectedNode}
              nodeTypes={[]}
              onClose={() => setSelectedNode(null)}
              onUpdateNode={(nodeId, updates) => {
                setNodes(prev => prev.map(node =>
                  node.id === nodeId ? { ...node, ...updates } : node
                ));
                if (selectedNode?.id === nodeId) {
                  setSelectedNode({ ...selectedNode, ...updates });
                }
              }}
            />
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span>节点: {nodes.length}</span>
          <span>连接: {edges.length}</span>
          {selectedNodes.length > 0 && (
            <span className="text-blue-400">
              已选择 {selectedNodes.length} 个节点
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4 text-gray-400">
          <span>按 Ctrl+S 保存</span>
          <span>按 Delete 删除选中节点</span>
          <span>拖拽节点移动 | Shift+点击连接 | 双击编辑</span>
        </div>
      </div>
    </div>
  );
};

export default WorkflowVisualEditor;