import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Node, Edge } from './types';
import WorkflowNode from './WorkflowNode';

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeSelect: (node: Node | null) => void;
  onEdgeSelect?: (edge: Edge | null) => void;
  selectedNode: Node | null;
  readonly?: boolean;
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onEdgeSelect,
  selectedNode,
  readonly = false
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1200, height: 800 });
  const [scale, setScale] = useState(1);

  // 处理画布拖拽
  const [, drop] = useDrop({
    accept: 'workflow-node',
    drop: (item: { type: string }, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (offset.x - rect.left - viewBox.x) / scale;
        const y = (offset.y - rect.top - viewBox.y) / scale;

        const newNode: Node = {
          id: `node-${Date.now()}`,
          type: item.type as 'start' | 'end' | 'operation' | 'condition' | 'validation' | 'data' | 'transform',
          position: { x, y },
          config: getNodeConfig(item.type),
          status: 'idle'
        };

        onNodesChange([...nodes, newNode]);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  // 处理节点拖拽
  const handleNodeDrag = useCallback((nodeId: string, newPosition: { x: number; y: number }) => {
    const updatedNodes = nodes.map(node =>
      node.id === nodeId ? { ...node, position: newPosition } : node
    );
    onNodesChange(updatedNodes);
  }, [nodes, onNodesChange]);

  // 处理连接创建
  const handleConnectionCreate = useCallback((fromNode: string, toNode: string) => {
    const existingEdge = edges.find(edge => 
      edge.from === fromNode && edge.to === toNode
    );
    
    if (!existingEdge && fromNode !== toNode) {
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        from: fromNode,
        to: toNode
      };
      onEdgesChange([...edges, newEdge]);
    }
    setConnectionStart(null);
  }, [edges, onEdgesChange]);

  // 处理节点删除
  const handleNodeDelete = useCallback((nodeId: string) => {
    const updatedNodes = nodes.filter(node => node.id !== nodeId);
    const updatedEdges = edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId);
    onNodesChange(updatedNodes);
    onEdgesChange(updatedEdges);
    if (selectedNode?.id === nodeId) {
      onNodeSelect(null);
    }
  }, [nodes, edges, selectedNode, onNodesChange, onEdgesChange, onNodeSelect]);

  // 处理边删除
  const handleEdgeDelete = useCallback((edgeId: string) => {
    const updatedEdges = edges.filter(edge => edge.id !== edgeId);
    onEdgesChange(updatedEdges);
  }, [edges, onEdgesChange]);

  // 处理缩放
  const handleZoom = useCallback((delta: number) => {
    setScale(prev => Math.max(0.1, Math.min(3, prev + delta)));
  }, []);

  // 处理平移
  const handlePan = useCallback((dx: number, dy: number) => {
    setViewBox(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readonly) return;
      
      if (e.key === 'Delete' && selectedNode) {
        handleNodeDelete(selectedNode.id);
      }
      if (e.ctrlKey && e.key === '=' ) {
        handleZoom(0.1);
      }
      if (e.ctrlKey && e.key === '-') {
        handleZoom(-0.1);
      }
      if (e.ctrlKey && e.key === '0') {
        setScale(1);
        setViewBox({ x: 0, y: 0, width: 1200, height: 800 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readonly, selectedNode, handleNodeDelete, handleZoom]);

  // 鼠标位置追踪
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - viewBox.x) / scale;
      const y = (e.clientY - rect.top - viewBox.y) / scale;
      setMousePosition({ x, y });
    }
  };

  return (
    <div className="workflow-canvas w-full h-full relative overflow-hidden bg-gray-900/50">
      {/* 工具栏 */}
      {!readonly && (
        <div className="absolute top-4 left-4 z-10 glass-panel p-2 rounded-lg">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleZoom(0.1)}
              className="p-2 rounded hover:bg-white/10"
              title="放大"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-2 rounded hover:bg-white/10"
              title="缩小"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <button
              onClick={() => { setScale(1); setViewBox({ x: 0, y: 0, width: 1200, height: 800 }); }}
              className="p-2 rounded hover:bg-white/10"
              title="重置视图"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <div className="w-px h-4 bg-gray-600 mx-1"></div>
            <span className="text-xs text-gray-400">{Math.round(scale * 100)}%</span>
          </div>
        </div>
      )}

      {/* 网格背景 */}
      <div className="absolute inset-0 pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* 主画布 */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onClick={() => onNodeSelect(null)}
        onDrop={(e) => {
          e.preventDefault();
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        style={{
          transform: `scale(${scale}) translate(${viewBox.x}px, ${viewBox.y}px)`,
          transformOrigin: 'top left'
        }}
      >
        {/* 连接线 */}
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '2000px', height: '2000px' }}>
          {edges.map(edge => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const fromX = fromNode.position.x + 60; // 节点中心
            const fromY = fromNode.position.y + 30;
            const toX = toNode.position.x + 60;
            const toY = toNode.position.y + 30;

            return (
              <g key={edge.id}>
                <path
                  d={`M ${fromX} ${fromY} C ${fromX + 100} ${fromY} ${toX - 100} ${toY} ${toX} ${toY}`}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  fill="none"
                  className="drop-shadow-lg"
                />
                <polygon
                  points={`${toX},${toY} ${toX-8},${toY-4} ${toX-8},${toY+4}`}
                  fill="#3b82f6"
                />
                {!readonly && (
                  <circle
                    cx={(fromX + toX) / 2}
                    cy={(fromY + toY) / 2}
                    r="8"
                    fill="#ef4444"
                    className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdgeDelete(edge.id);
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* 临时连接线 */}
          {connectionStart && (
            <path
              d={`M ${nodes.find(n => n.id === connectionStart)?.position.x + 60 || 0} 
                     ${nodes.find(n => n.id === connectionStart)?.position.y + 30 || 0} 
                     C ${mousePosition.x} ${mousePosition.y - 50} ${mousePosition.x} ${mousePosition.y - 50} 
                     ${mousePosition.x} ${mousePosition.y}`}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
              opacity="0.5"
            />
          )}
        </svg>

        {/* 节点 */}
        {nodes.map(node => (
          <WorkflowNode
            key={node.id}
            node={node}
            isSelected={selectedNode?.id === node.id}
            onSelect={() => onNodeSelect(node)}
            onDrag={handleNodeDrag}
            onDelete={() => handleNodeDelete(node.id)}
            onConnectionStart={() => setConnectionStart(node.id)}
            onConnectionEnd={(toNodeId) => {
              if (connectionStart) {
                handleConnectionCreate(connectionStart, toNodeId);
              }
            }}
            readonly={readonly}
          />
        ))}
      </div>

      {/* 状态栏 */}
      <div className="absolute bottom-4 right-4 glass-panel px-3 py-2 rounded-lg text-xs text-gray-400">
        <span>节点: {nodes.length} | 连接: {edges.length} | 鼠标: ({Math.round(mousePosition.x)}, {Math.round(mousePosition.y)})</span>
      </div>
    </div>
  );
};

// 获取节点配置
function getNodeConfig(type: string): any {
  switch (type) {
    case 'start':
      return { title: '开始', description: '工作流开始节点' };
    case 'end':
      return { title: '结束', description: '工作流结束节点' };
    case 'operation':
      return { 
        title: '操作节点', 
        description: '执行具体操作',
        softwareId: '',
        action: '',
        parameters: {}
      };
    case 'condition':
      return { 
        title: '条件判断', 
        description: '基于条件进行分支',
        conditions: []
      };
    case 'validation':
      return { 
        title: '数据验证', 
        description: '验证输入数据',
        rules: []
      };
    default:
      return { title: '未知节点', description: '' };
  }
}

export default WorkflowCanvas;