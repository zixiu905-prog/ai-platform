import React, { useRef, useCallback, useState, useEffect } from 'react';
import { WorkflowNode, WorkflowEdge } from '../../types/workflow';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodeClick: (node: WorkflowNode) => void;
  onNodeMove: (nodeId: string, position: { x: number; y: number }) => void;
  onEdgeCreate: (from: string, to: string) => void;
  onNodeSelect: (nodeId: string, selected: boolean) => void;
  selectedNodes: string[];
  onCanvasClick: () => void;
  readonly?: boolean;
}

interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
}

interface ConnectionState {
  isConnecting: boolean;
  fromNode: string | null;
  tempLine: { x1: number; y1: number; x2: number; y2: number } | null;
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  onNodeClick,
  onNodeMove,
  onEdgeCreate,
  onNodeSelect,
  selectedNodes,
  onCanvasClick,
  readonly = false
}) => {
  const canvasRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    nodeId: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 }
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnecting: false,
    fromNode: null,
    tempLine: null
  });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });

  // 获取节点颜色
  const getNodeColor = (nodeType: string): string => {
    const colors: Record<string, string> = {
      start: '#10b981',
      end: '#ef4444',
      webhook: '#8b5cf6',
      http_request: '#3b82f6',
      schedule: '#f59e0b',
      operation: '#06b6d4',
      ai_processing: '#ec4899',
      condition: '#f97316',
      transform: '#84cc16',
      email: '#0ea5e9',
      code_execution: '#a855f7',
      database_query: '#14b8a6',
      file_operation: '#6366f1'
    };
    return colors[nodeType] || '#6b7280';
  };

  // 获取节点图标
  const getNodeIcon = (nodeType: string): string => {
    const icons: Record<string, string> = {
      start: '▶️',
      end: '⏹️',
      webhook: '🔗',
      http_request: '🌐',
      schedule: '⏰',
      operation: '⚙️',
      ai_processing: '🤖',
      condition: '🔀',
      transform: '🔄',
      email: '📧',
      code_execution: '💻',
      database_query: '🗄️',
      file_operation: '📁'
    };
    return icons[nodeType] || '📦';
  };

  // 处理鼠标按下
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;

    if (nodeId) {
      if (e.shiftKey && connectionState.fromNode && connectionState.fromNode !== nodeId) {
        // 创建连接
        onEdgeCreate(connectionState.fromNode, nodeId);
        setConnectionState({ isConnecting: false, fromNode: null, tempLine: null });
      } else if (e.shiftKey) {
        // 开始连接
        setConnectionState({
          isConnecting: true,
          fromNode: nodeId,
          tempLine: { x1: x, y1: y, x2: x, y2: y }
        });
      } else {
        // 开始拖拽节点
        setDragState({
          isDragging: true,
          nodeId,
          startPosition: { x, y },
          currentPosition: { x, y }
        });
        onNodeSelect(nodeId, !selectedNodes.includes(nodeId));
      }
    } else if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      // 中键或Ctrl+左键：开始平移
      setIsPanning(true);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    } else {
      // 点击画布空白处
      onCanvasClick();
    }
  }, [scale, offset, connectionState, selectedNodes, onNodeSelect, onEdgeCreate, onCanvasClick]);

  // 处理鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;

    if (dragState.isDragging && dragState.nodeId) {
      // 拖拽节点
      onNodeMove(dragState.nodeId, { x, y });
      setDragState(prev => ({
        ...prev,
        currentPosition: { x, y }
      }));
    } else if (connectionState.isConnecting && connectionState.fromNode) {
      // 更新临时连接线
      const fromNode = nodes.find(n => n.id === connectionState.fromNode);
      if (fromNode) {
        setConnectionState(prev => ({
          ...prev,
          tempLine: {
            x1: fromNode.position.x + 75,
            y1: fromNode.position.y + 30,
            x2: x,
            y2: y
          }
        }));
      }
    } else if (isPanning) {
      // 平移画布
      const dx = e.clientX - lastPanPosition.x;
      const dy = e.clientY - lastPanPosition.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    }
  }, [dragState, connectionState, isPanning, lastPanPosition, nodes, scale, offset, onNodeMove]);

  // 处理鼠标释放
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      nodeId: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 }
    });
    setConnectionState({
      isConnecting: false,
      fromNode: null,
      tempLine: null
    });
    setIsPanning(false);
  }, []);

  // 处理滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.1), 3);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleChange = newScale - scale;
    const offsetX = -mouseX * scaleChange / scale;
    const offsetY = -mouseY * scaleChange / scale;

    setScale(newScale);
    setOffset(prev => ({
      x: prev.x + offsetX,
      y: prev.y + offsetY
    }));
  }, [scale]);

  // 处理双击节点
  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    onNodeClick(node);
  }, [onNodeClick]);

  // 计算连接路径
  const calculatePath = (edge: WorkflowEdge): string => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);

    if (!fromNode || !toNode) return '';

    const x1 = fromNode.position.x + 150;
    const y1 = fromNode.position.y + 30;
    const x2 = toNode.position.x;
    const y2 = toNode.position.y + 30;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const cx1 = x1 + dx * 0.5;
    const cy1 = y1;
    const cx2 = x2 - dx * 0.5;
    const cy2 = y2;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  };

  return (
    <div className="workflow-canvas-container relative w-full h-full overflow-hidden bg-gray-50 border border-gray-200 rounded-lg">
      <svg
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              fill="#6b7280"
            />
          </marker>
        </defs>

        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          {/* 网格背景 */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="10000" height="10000" fill="url(#grid)" />

          {/* 连接线 */}
          {edges.map((edge, index) => (
            <g key={index}>
              <path
                d={calculatePath(edge)}
                fill="none"
                stroke="#6b7280"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
                className="cursor-pointer hover:stroke-blue-500"
              />
              {edge.condition && (
                <text
                  x={(nodes.find(n => n.id === edge.from)?.position.x || 0) + 75}
                  y={(nodes.find(n => n.id === edge.from)?.position.y || 0) + 20}
                  fill="#374151"
                  fontSize="12"
                  textAnchor="middle"
                >
                  {edge.condition}
                </text>
              )}
            </g>
          ))}

          {/* 临时连接线 */}
          {connectionState.tempLine && (
            <line
              x1={connectionState.tempLine.x1}
              y1={connectionState.tempLine.y1}
              x2={connectionState.tempLine.x2}
              y2={connectionState.tempLine.y2}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
              pointerEvents="none"
            />
          )}

          {/* 节点 */}
          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.position.x}, ${node.position.y})`}
              onMouseDown={(e) => !readonly && handleMouseDown(e, node.id)}
              onDoubleClick={(e) => !readonly && handleNodeDoubleClick(e, node)}
              className={`${readonly ? 'cursor-default' : 'cursor-move'} ${
                selectedNodes.includes(node.id) ? 'opacity-100' : 'opacity-90 hover:opacity-100'
              }`}
            >
              {/* 节点背景 */}
              <rect
                width="150"
                height="60"
                rx="8"
                fill={getNodeColor(node.type)}
                stroke={selectedNodes.includes(node.id) ? '#1f2937' : '#e5e7eb'}
                strokeWidth={selectedNodes.includes(node.id) ? 3 : 1}
                className="transition-all duration-200"
              />

              {/* 节点图标 */}
              <text x="15" y="25" fontSize="20" textAnchor="start" dominantBaseline="middle">
                {getNodeIcon(node.type)}
              </text>

              {/* 节点标题 */}
              <text
                x="75"
                y="25"
                fill="white"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {node.config?.title || node.type}
              </text>

              {/* 节点描述 */}
              {node.config?.description && (
                <text
                  x="75"
                  y="40"
                  fill="white"
                  fontSize="10"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  opacity="0.8"
                >
                  {node.config.description.length > 15 
                    ? node.config.description.substring(0, 15) + '...'
                    : node.config.description
                  }
                </text>
              )}

              {/* 连接点 */}
              {!readonly && (
                <>
                  <circle
                    cx="150"
                    cy="30"
                    r="5"
                    fill="#10b981"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6"
                  />
                  <circle
                    cx="0"
                    cy="30"
                    r="5"
                    fill="#3b82f6"
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6"
                  />
                </>
              )}

              {/* 错误指示器 */}
              {node.config?.error && (
                <circle cx="135" cy="10" r="8" fill="#ef4444">
                  <title>{node.config.error}</title>
                </circle>
              )}
            </g>
          ))}
        </g>
      </svg>

      {/* 工具栏 */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-2 flex items-center space-x-2">
        <button
          onClick={() => setScale(Math.min(scale * 1.2, 3))}
          className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          title="放大"
        >
          🔍+
        </button>
        <button
          onClick={() => setScale(Math.max(scale * 0.8, 0.1))}
          className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          title="缩小"
        >
          🔍-
        </button>
        <button
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          title="重置视图"
        >
          🎯
        </button>
        <div className="text-xs text-gray-600 px-2">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* 提示信息 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 text-xs text-gray-600 max-w-xs">
        <p><strong>操作提示:</strong></p>
        <ul className="mt-1 space-y-1">
          <li>• 拖拽节点移动位置</li>
          <li>• 双击节点编辑配置</li>
          <li>• Shift+点击节点创建连接</li>
          <li>• Ctrl+拖拽平移画布</li>
          <li>• 滚轮缩放画布</li>
        </ul>
      </div>
    </div>
  );
};

export default WorkflowCanvas;