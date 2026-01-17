import React, { useState, useEffect } from 'react';
import { Node, Edge, WorkflowVariable } from './types';
import { useElectronAPI } from '../../contexts/ElectronAPIContext';
import apiService from '../../services/apiService';

interface PropertyPanelProps {
  selectedNode?: Node | null;
  selectedEdge?: Edge | null;
  selectedWorkflow?: any;
  onNodeUpdate?: (node: Node) => void;
  onEdgeUpdate?: (edge: Edge) => void;
  onWorkflowUpdate?: (workflow: any) => void;
  readonly?: boolean;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedNode,
  selectedEdge,
  selectedWorkflow,
  onNodeUpdate,
  onEdgeUpdate,
  onWorkflowUpdate,
  readonly = false
}) => {
  const [softwares, setSoftwares] = useState<any[]>([]);
  const [softwareActions, setSoftwareActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const electronAPI = useElectronAPI();

  // 加载软件列表
  useEffect(() => {
    const loadSoftwares = async () => {
      try {
        const response = await apiService.get('/api/softwares');
        if (response.success) {
          setSoftwares(response.data);
        }
      } catch (error) {
        console.error('加载软件列表失败:', error);
      }
    };
    loadSoftwares();
  }, []);

  // 加载软件操作
  useEffect(() => {
    if (selectedNode?.config?.softwareId) {
      const loadSoftwareActions = async () => {
        try {
          const response = await apiService.get(`/api/softwares/${selectedNode.config.softwareId}/actions`);
          if (response.success) {
            setSoftwareActions(response.data);
          }
        } catch (error) {
          console.error('加载软件操作失败:', error);
        }
      };
      loadSoftwareActions();
    }
  }, [selectedNode?.config?.softwareId]);

  // 更新节点配置
  const updateNodeConfig = (field: string, value: any) => {
    if (selectedNode && onNodeUpdate && !readonly) {
      const updatedNode = {
        ...selectedNode,
        config: {
          ...selectedNode.config,
          [field]: value
        }
      };
      onNodeUpdate(updatedNode);
    }
  };

  // 更新节点参数
  const updateNodeParameter = (paramName: string, value: any) => {
    if (selectedNode && onNodeUpdate && !readonly) {
      const updatedNode = {
        ...selectedNode,
        config: {
          ...selectedNode.config,
          parameters: {
            ...selectedNode.config.parameters,
            [paramName]: value
          }
        }
      };
      onNodeUpdate(updatedNode);
    }
  };

  // 更新边配置
  const updateEdgeConfig = (field: string, value: any) => {
    if (selectedEdge && onEdgeUpdate && !readonly) {
      const updatedEdge = {
        ...selectedEdge,
        [field]: value
      };
      onEdgeUpdate(updatedEdge);
    }
  };

  // 渲染节点属性
  const renderNodeProperties = () => {
    if (!selectedNode) return null;

    return (
      <div className="space-y-6">
        {/* 基本信息 */}
        <div>
          <h4 className="text-white font-semibold mb-3">基本信息</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">节点类型</label>
              <div className="input-glass w-full px-3 py-2 bg-gray-700/50 text-gray-400">
                {selectedNode.type}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">节点名称</label>
              <input
                type="text"
                value={selectedNode.config?.title || ''}
                onChange={(e) => updateNodeConfig('title', e.target.value)}
                className="input-glass w-full"
                placeholder="节点名称"
                disabled={readonly}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">描述</label>
              <textarea
                value={selectedNode.config?.description || ''}
                onChange={(e) => updateNodeConfig('description', e.target.value)}
                className="input-glass w-full resize-none"
                rows={3}
                placeholder="节点描述"
                disabled={readonly}
              />
            </div>
          </div>
        </div>

        {/* 操作节点特有属性 */}
        {selectedNode.type === 'operation' && (
          <div>
            <h4 className="text-white font-semibold mb-3">操作配置</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">目标软件</label>
                <select
                  value={selectedNode.config?.softwareId || ''}
                  onChange={(e) => updateNodeConfig('softwareId', e.target.value)}
                  className="input-glass w-full"
                  disabled={readonly}
                >
                  <option value="">选择软件</option>
                  {softwares.map(software => (
                    <option key={software.id} value={software.id}>
                      {software.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedNode.config?.softwareId && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">操作类型</label>
                  <select
                    value={selectedNode.config?.action || ''}
                    onChange={(e) => updateNodeConfig('action', e.target.value)}
                    className="input-glass w-full"
                    disabled={readonly}
                  >
                    <option value="">选择操作</option>
                    {softwareActions.map(action => (
                      <option key={action.id} value={action.id}>
                        {action.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 操作参数 */}
              {selectedNode.config?.parameters && (
                <div>
                  <h5 className="text-gray-300 text-sm font-medium mb-2">操作参数</h5>
                  <div className="space-y-2">
                    {Object.entries(selectedNode.config.parameters).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-xs text-gray-400 mb-1">{key}</label>
                        <input
                          type="text"
                          value={typeof value === 'string' ? value : JSON.stringify(value)}
                          onChange={(e) => {
                            let parsedValue: any = e.target.value;
                            try {
                              parsedValue = JSON.parse(e.target.value);
                            } catch {
                              // 保持字符串值
                            }
                            updateNodeParameter(key, parsedValue);
                          }}
                          className="input-glass w-full text-sm"
                          placeholder={`参数 ${key}`}
                          disabled={readonly}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 条件节点特有属性 */}
        {selectedNode.type === 'condition' && (
          <div>
            <h4 className="text-white font-semibold mb-3">条件配置</h4>
            <div className="space-y-3">
              {/* 这里可以添加条件规则的编辑界面 */}
              <div className="text-gray-400 text-sm">
                条件规则编辑器（待实现）
              </div>
            </div>
          </div>
        )}

        {/* 验证节点特有属性 */}
        {selectedNode.type === 'validation' && (
          <div>
            <h4 className="text-white font-semibold mb-3">验证规则</h4>
            <div className="space-y-3">
              {/* 这里可以添加验证规则的编辑界面 */}
              <div className="text-gray-400 text-sm">
                验证规则编辑器（待实现）
              </div>
            </div>
          </div>
        )}

        {/* 高级设置 */}
        <div>
          <h4 className="text-white font-semibold mb-3">高级设置</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">超时时间 (秒)</label>
              <input
                type="number"
                value={selectedNode.config?.timeout || 300}
                onChange={(e) => updateNodeConfig('timeout', parseInt(e.target.value) || 300)}
                className="input-glass w-full"
                min="1"
                disabled={readonly}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">重试次数</label>
              <input
                type="number"
                value={selectedNode.config?.retryCount || 0}
                onChange={(e) => updateNodeConfig('retryCount', parseInt(e.target.value) || 0)}
                className="input-glass w-full"
                min="0"
                max="10"
                disabled={readonly}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">错误处理</label>
              <select
                value={selectedNode.config?.onError || 'stop'}
                onChange={(e) => updateNodeConfig('onError', e.target.value)}
                className="input-glass w-full"
                disabled={readonly}
              >
                <option value="stop">停止执行</option>
                <option value="continue">继续执行</option>
                <option value="retry">重试执行</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染边属性
  const renderEdgeProperties = () => {
    if (!selectedEdge) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">连接标签</label>
          <input
            type="text"
            value={selectedEdge.label || ''}
            onChange={(e) => updateEdgeConfig('label', e.target.value)}
            className="input-glass w-full"
            placeholder="连接标签"
            disabled={readonly}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">条件表达式</label>
          <input
            type="text"
            value={selectedEdge.condition || ''}
            onChange={(e) => updateEdgeConfig('condition', e.target.value)}
            className="input-glass w-full"
            placeholder="条件表达式（可选）"
            disabled={readonly}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">线条颜色</label>
          <input
            type="color"
            value={selectedEdge.style?.color || '#3b82f6'}
            onChange={(e) => updateEdgeConfig('style', {
              ...selectedEdge.style,
              color: e.target.value
            })}
            className="input-glass w-full h-10"
            disabled={readonly}
          />
        </div>
      </div>
    );
  };

  // 渲染工作流属性
  const renderWorkflowProperties = () => {
    if (!selectedWorkflow) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">工作流名称</label>
          <input
            type="text"
            value={selectedWorkflow.name || ''}
            onChange={(e) => onWorkflowUpdate?.({ ...selectedWorkflow, name: e.target.value })}
            className="input-glass w-full"
            placeholder="工作流名称"
            disabled={readonly}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">描述</label>
          <textarea
            value={selectedWorkflow.description || ''}
            onChange={(e) => onWorkflowUpdate?.({ ...selectedWorkflow, description: e.target.value })}
            className="input-glass w-full resize-none"
            rows={3}
            placeholder="工作流描述"
            disabled={readonly}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">分类</label>
          <select
            value={selectedWorkflow.category || ''}
            onChange={(e) => onWorkflowUpdate?.({ ...selectedWorkflow, category: e.target.value })}
            className="input-glass w-full"
            disabled={readonly}
          >
            <option value="">选择分类</option>
            <option value="image">图像处理</option>
            <option value="cad">CAD设计</option>
            <option value="3d">3D建模</option>
            <option value="video">视频处理</option>
            <option value="automation">自动化</option>
            <option value="data">数据处理</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="property-panel glass-panel h-full flex flex-col">
      {/* 标题 */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-white font-semibold">属性面板</h3>
      </div>

      {/* 属性内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="loading-spinner w-6 h-6"></div>
            <span className="ml-2 text-gray-400">加载中...</span>
          </div>
        ) : selectedNode ? (
          renderNodeProperties()
        ) : selectedEdge ? (
          renderEdgeProperties()
        ) : selectedWorkflow ? (
          renderWorkflowProperties()
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <p className="text-gray-400 text-sm">选择一个节点、连接或工作流来查看属性</p>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {(selectedNode || selectedEdge) && !readonly && (
        <div className="p-4 border-t border-white/10">
          <div className="flex space-x-2">
            <button className="btn-primary flex-1">保存</button>
            <button className="btn-secondary flex-1">重置</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyPanel;