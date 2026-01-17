import React, { useState } from 'react';
import { useDrag } from 'react-dnd';

interface NodePaletteProps {
  onNodeSelect?: (nodeType: string) => void;
  readonly?: boolean;
}

interface NodeType {
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  color: string;
}

const NODE_TYPES: NodeType[] = [
  {
    type: 'start',
    name: '开始',
    description: '工作流的开始节点',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    category: 'control',
    color: 'from-green-500 to-green-600'
  },
  {
    type: 'end',
    name: '结束',
    description: '工作流的结束节点',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
    category: 'control',
    color: 'from-red-500 to-red-600'
  },
  {
    type: 'operation',
    name: '操作',
    description: '执行具体的操作任务',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    category: 'action',
    color: 'from-blue-500 to-blue-600'
  },
  {
    type: 'condition',
    name: '条件',
    description: '基于条件进行分支判断',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    category: 'control',
    color: 'from-purple-500 to-purple-600'
  },
  {
    type: 'validation',
    name: '验证',
    description: '验证数据的格式和内容',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    category: 'data',
    color: 'from-orange-500 to-orange-600'
  },
  {
    type: 'data',
    name: '数据',
    description: '数据输入、处理或输出',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    category: 'data',
    color: 'from-cyan-500 to-cyan-600'
  },
  {
    type: 'transform',
    name: '转换',
    description: '数据格式转换或处理',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    category: 'data',
    color: 'from-indigo-500 to-indigo-600'
  }
];

const NodePalette: React.FC<NodePaletteProps> = ({ onNodeSelect, readonly = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 按分类分组节点类型
  const categories = [
    { id: 'all', name: '全部', icon: '🔧' },
    { id: 'control', name: '控制', icon: '⚡' },
    { id: 'action', name: '操作', icon: '🚀' },
    { id: 'data', name: '数据', icon: '📊' }
  ];

  // 过滤节点类型
  const filteredNodeTypes = NODE_TYPES.filter(nodeType => {
    const matchesSearch = nodeType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nodeType.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || nodeType.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="node-panel glass-panel h-full flex flex-col">
      {/* 标题 */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-white font-semibold mb-3">节点库</h3>
        
        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜索节点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-glass w-full pl-10 pr-4 py-2 text-sm"
            disabled={readonly}
          />
          <svg 
            className="w-4 h-4 text-gray-400 absolute left-3 top-3" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="p-4 border-b border-white/10">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              disabled={readonly}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'glass text-gray-300 hover:text-white hover:bg-white/10'
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
        {filteredNodeTypes.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">没有找到匹配的节点</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNodeTypes.map(nodeType => (
              <DraggableNodeType
                key={nodeType.type}
                nodeType={nodeType}
                onSelect={() => onNodeSelect?.(nodeType.type)}
                readonly={readonly}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-gray-400">
          <p>💡 提示：拖拽节点到画布</p>
          <p>🔗 点击连接端口创建连线</p>
          <p>⚡ 双击节点进行配置</p>
        </div>
      </div>
    </div>
  );
};

// 可拖拽的节点类型组件
interface DraggableNodeTypeProps {
  nodeType: NodeType;
  onSelect?: () => void;
  readonly?: boolean;
}

const DraggableNodeType: React.FC<DraggableNodeTypeProps> = ({ 
  nodeType, 
  onSelect, 
  readonly = false 
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'workflow-node',
    item: { type: nodeType.type, nodeType: nodeType.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !readonly
  });

  return (
    <div
      ref={drag}
      className={`glass-card p-3 cursor-pointer transition-all duration-200 hover:scale-105 ${
        isDragging ? 'opacity-50' : ''
      } ${readonly ? 'cursor-not-allowed opacity-60' : 'hover:shadow-lg'}`}
      onClick={() => !readonly && onSelect?.()}
    >
      <div className="flex items-center space-x-3">
        {/* 图标 */}
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${nodeType.color} flex items-center justify-center flex-shrink-0`}>
          <div className="text-white">
            {nodeType.icon}
          </div>
        </div>
        
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm truncate">
            {nodeType.name}
          </div>
          <div className="text-gray-400 text-xs truncate mt-1">
            {nodeType.description}
          </div>
        </div>

        {/* 拖拽指示器 */}
        {isDragging && (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        )}
      </div>
    </div>
  );
};

export default NodePalette;