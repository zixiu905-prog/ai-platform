import React, { useState, useEffect, useCallback } from 'react';
import WorkflowCanvas from './WorkflowCanvas';
import NodeConfigPanel from './NodeConfigPanel';
import { WorkflowNode, WorkflowEdge, WorkflowDefinition, NodeType } from '../../types/workflow';
import { workflowApi } from '../../services/workflowApi';

interface WorkflowEditorProps {
  workflowId?: string;
  onSave?: (workflow: WorkflowDefinition) => void;
  onCancel?: () => void;
  readonly?: boolean;
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  workflowId,
  onSave,
  onCancel,
  readonly = false
}) => {
  const [workflow, setWorkflow] = useState<WorkflowDefinition>({
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 100 },
        config: { title: '开始' }
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 500, y: 100 },
        config: { title: '结束' }
      }
    ],
    edges: [],
    variables: {},
    settings: {},
    tags: []
  });
  
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [editingNode, setEditingNode] = useState<WorkflowNode | null>(null);
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // 加载工作流数据
  useEffect(() => {
    const loadWorkflow = async () => {
      if (workflowId) {
        try {
          setIsLoading(true);
          const data = await workflowApi.getWorkflow(workflowId);
          setWorkflow(data.definition);
          setWorkflowName(data.name);
          setWorkflowDescription(data.description || '');
        } catch (error) {
          console.error('加载工作流失败:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadWorkflow();
  }, [workflowId]);

  // 加载节点类型
  useEffect(() => {
    const loadNodeTypes = async () => {
      try {
        const types = await workflowApi.getNodeTypes();
        setNodeTypes(types);
      } catch (error) {
        console.error('加载节点类型失败:', error);
      }
    };

    loadNodeTypes();
  }, []);

  // 监听工作流变化
  useEffect(() => {
    setIsDirty(true);
  }, [workflow]);

  // 添加节点
  const addNode = useCallback((nodeType: NodeType, pos: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: `${nodeType.type}-${Date.now()}`,
      type: nodeType.type as any,
      position: pos,
      config: {
        title: nodeType.displayName,
        ...nodeType.defaults.parameters
      },
      parameters: {}
    };

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
  }, []);

  // 更新节点
  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));
  }, []);

  // 删除节点
  const deleteNode = useCallback((nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      edges: prev.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId)
    }));
    setSelectedNodes(prev => prev.filter(id => id !== nodeId));
  }, []);

  // 移动节点
  const handleNodeMove = useCallback((nodeId: string, position: { x: number; y: number }) => {
    updateNode(nodeId, { position });
  }, [updateNode]);

  // 点击节点
  const handleNodeClick = useCallback((node: WorkflowNode) => {
    if (!readonly) {
      setEditingNode(node);
    }
  }, [readonly]);

  // 选择节点
  const handleNodeSelect = useCallback((nodeId: string, selected: boolean) => {
    setSelectedNodes(prev => {
      if (selected) {
        return [...prev, nodeId];
      } else {
        return prev.filter(id => id !== nodeId);
      }
    });
  }, []);

  // 创建连接
  const handleEdgeCreate = useCallback((from: string, to: string) => {
    // 检查是否已存在连接
    const existingEdge = workflow.edges.find(
      edge => edge.from === from && edge.to === to
    );
    
    if (!existingEdge) {
      setWorkflow(prev => ({
        ...prev,
        edges: [...prev.edges, { from, to }]
      }));
    }
  }, [workflow.edges]);

  // 删除连接
  const deleteEdge = useCallback((edgeIndex: number) => {
    setWorkflow(prev => ({
      ...prev,
      edges: prev.edges.filter((_, index) => index !== edgeIndex)
    }));
  }, []);

  // 保存工作流
  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      const workflowData = {
        name: workflowName || '未命名工作流',
        description: workflowDescription,
        category: 'custom',
        definition: workflow,
        settings: workflow.settings,
        tags: workflow.tags || []
      };

      if (workflowId) {
        await workflowApi.updateWorkflow(workflowId, workflowData);
      } else {
        await workflowApi.createWorkflow(workflowData);
      }

      setIsDirty(false);
      onSave?.(workflow);
    } catch (error) {
      console.error('保存工作流失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readonly) return;

      // Delete 键删除选中的节点
      if (e.key === 'Delete' && selectedNodes.length > 0) {
        selectedNodes.forEach(nodeId => deleteNode(nodeId));
      }

      // Ctrl+S 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Escape 取消选择
      if (e.key === 'Escape') {
        setSelectedNodes([]);
        setEditingNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes, deleteNode, handleSave, readonly]);

  if (isLoading && !workflow.nodes.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载工作流中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-lg font-medium bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              placeholder="工作流名称"
              disabled={readonly}
            />
            <span className="text-sm text-gray-500">
              {workflow.nodes.length} 个节点, {workflow.edges.length} 个连接
            </span>
            {isDirty && (
              <span className="text-sm text-orange-600 font-medium">未保存</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {!readonly && (
              <>
                <button
                  onClick={() => addNode(
                    nodeTypes.find(nt => nt.type === 'webhook') || nodeTypes[0],
                    { x: 300, y: 200 }
                  )}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  + 添加节点
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isLoading ? '保存中...' : '保存'}
                </button>
              </>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                {readonly ? '关闭' : '取消'}
              </button>
            )}
          </div>
        </div>

        {/* 节点类型选择器 */}
        {!readonly && nodeTypes.length > 0 && (
          <div className="mt-3 flex items-center space-x-2 overflow-x-auto">
            <span className="text-sm text-gray-600 whitespace-nowrap">快速添加:</span>
            {nodeTypes.map((nodeType) => (
              <button
                key={nodeType.type}
                onClick={() => addNode(
                  nodeType,
                  { x: 200 + Math.random() * 200, y: 150 + Math.random() * 100 }
                )}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-gray-500"
                title={nodeType.description}
              >
                {nodeType.displayName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 主要内容区 */}
      <div className="flex-1 relative overflow-hidden">
        <WorkflowCanvas
          nodes={workflow.nodes}
          edges={workflow.edges}
          onNodeClick={handleNodeClick}
          onNodeMove={handleNodeMove}
          onEdgeCreate={handleEdgeCreate}
          onNodeSelect={handleNodeSelect}
          selectedNodes={selectedNodes}
          onCanvasClick={() => {
            setSelectedNodes([]);
            setEditingNode(null);
          }}
          readonly={readonly}
        />

        {/* 选中节点的操作菜单 */}
        {selectedNodes.length > 0 && !readonly && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2">
            <div className="text-xs text-gray-600 mb-2">
              已选择 {selectedNodes.length} 个节点
            </div>
            <button
              onClick={() => {
                selectedNodes.forEach(nodeId => deleteNode(nodeId));
              }}
              className="w-full px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              删除节点
            </button>
          </div>
        )}
      </div>

      {/* 节点配置面板 */}
      {editingNode && !readonly && (
        <NodeConfigPanel
          node={editingNode}
          onUpdateNode={updateNode}
          onClose={() => setEditingNode(null)}
          nodeTypes={nodeTypes}
        />
      )}

      {/* 工作流信息面板 */}
      {workflowDescription && (
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <div className="text-sm text-gray-600">
            <strong>描述:</strong> {workflowDescription}
          </div>
          {workflow.tags && workflow.tags.length > 0 && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-sm text-gray-600">标签:</span>
              {workflow.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowEditor;