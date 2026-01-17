import React, { useState, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { Node } from './types';

interface WorkflowNodeProps {
  node: Node;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (nodeId: string, position: { x: number; y: number }) => void;
  onDelete: () => void;
  onConnectionStart: () => void;
  onConnectionEnd: (nodeId: string) => void;
  readonly?: boolean;
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onDrag,
  onDelete,
  onConnectionStart,
  onConnectionEnd,
  readonly = false
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [{ isDragging }, drag] = useDrag({
    type: 'workflow-node-move',
    item: { id: node.id, type: 'workflow-node-move' },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (clientOffset && nodeRef.current) {
        const newPosition = {
          x: clientOffset.x - dragOffset.x,
          y: clientOffset.y - dragOffset.y
        };
        onDrag(node.id, newPosition);
      }
    }
  });

  // 获取节点样式
  const getNodeStyle = () => {
    const baseStyle = "absolute glass-card p-3 rounded-lg cursor-move transition-all duration-200";
    const selectedStyle = isSelected ? "ring-2 ring-blue-500 shadow-lg" : "";
    const draggingStyle = isDragging ? "opacity-50" : "";
    const statusStyle = getStatusStyle(node.status);
    
    return `${baseStyle} ${selectedStyle} ${draggingStyle} ${statusStyle}`;
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'running':
        return 'border-l-4 border-yellow-500';
      case 'completed':
        return 'border-l-4 border-green-500';
      case 'error':
        return 'border-l-4 border-red-500';
      case 'idle':
      default:
        return 'border-l-4 border-gray-500';
    }
  };

  // 获取节点图标
  const getNodeIcon = () => {
    switch (node.type) {
      case 'start':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'end':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        );
      case 'operation':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'condition':
        return (
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'validation':
        return (
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        );
    }
  };

  // 处理连接端口点击
  const handlePortClick = (e: React.MouseEvent, isInput: boolean = false) => {
    e.stopPropagation();
    if (readonly) return;
    
    if (!isConnecting) {
      onConnectionStart();
      setIsConnecting(true);
    } else {
      onConnectionEnd(node.id);
      setIsConnecting(false);
    }
  };

  // 处理节点双击
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!readonly) {
      // 这里可以打开节点配置对话框
      onSelect();
    }
  };

  return (
    <div
      ref={(node) => {
        nodeRef.current = node;
        drag(node);
      }}
      className={getNodeStyle()}
      style={{
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
        width: '120px',
        minHeight: '60px'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* 连接端口 */}
      {!readonly && (
        <>
          {/* 输入端口 */}
          <div
            className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white cursor-pointer hover:scale-125 transition-transform"
            onClick={(e) => handlePortClick(e, true)}
            title="输入连接"
          />
          
          {/* 输出端口 */}
          <div
            className={`absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white cursor-pointer hover:scale-125 transition-transform ${
              isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'
            }`}
            onClick={(e) => handlePortClick(e, false)}
            title="输出连接"
          />
        </>
      )}

      {/* 节点内容 */}
      <div className="flex flex-col items-center space-y-2">
        {/* 图标 */}
        <div className="flex-shrink-0">
          {getNodeIcon()}
        </div>
        
        {/* 标题 */}
        <div className="text-center">
          <div className="text-sm font-medium text-white truncate">
            {node.config?.title || '未命名节点'}
          </div>
          {node.config?.description && (
            <div className="text-xs text-gray-400 truncate mt-1">
              {node.config.description}
            </div>
          )}
        </div>

        {/* 状态指示器 */}
        {node.status && node.status !== 'idle' && (
          <div className="flex items-center space-x-1 text-xs">
            {getStatusIcon(node.status)}
            <span className="text-gray-400">{getStatusText(node.status)}</span>
          </div>
        )}
      </div>

      {/* 删除按钮 */}
      {isSelected && !readonly && (
        <button
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="删除节点"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// 获取状态图标
function getStatusIcon(status: string) {
  switch (status) {
    case 'running':
      return (
        <svg className="w-3 h-3 text-yellow-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'completed':
      return (
        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    default:
      return null;
  }
}

// 获取状态文本
function getStatusText(status: string): string {
  switch (status) {
    case 'running':
      return '运行中';
    case 'completed':
      return '已完成';
    case 'error':
      return '错误';
    default:
      return '';
  }
}

export default WorkflowNode;