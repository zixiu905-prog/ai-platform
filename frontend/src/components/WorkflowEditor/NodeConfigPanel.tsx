import React, { useState, useEffect } from 'react';
import { WorkflowNode, NodeType } from '../../types/workflow';

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  onUpdateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  onClose: () => void;
  nodeTypes: NodeType[];
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  onUpdateNode,
  onClose,
  nodeTypes
}) => {
  const [config, setConfig] = useState(node?.config || {});
  const [parameters, setParameters] = useState(node?.parameters || {});
  const [credentials, setCredentials] = useState(node?.credentials || {});

  const nodeType = nodeTypes.find(nt => nt.type === node?.type);

  useEffect(() => {
    if (node) {
      setConfig(node.config || {});
      setParameters(node.parameters || {});
      setCredentials(node.credentials || {});
    }
  }, [node]);

  if (!node) {
    return null;
  }

  const handleSave = () => {
    onUpdateNode(node.id, {
      config,
      parameters,
      credentials
    });
    onClose();
  };

  const renderParameterField = (name: string, param: any, value: any, onChange: (val: any) => void) => {
    switch (param.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={param.placeholder || param.displayName}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder={param.placeholder || param.displayName}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={param.validation?.min}
            max={param.validation?.max}
          />
        );
      
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm text-gray-700">{param.displayName}</label>
          </div>
        );
      
      case 'select':
        return (
          <select
            value={value || param.default || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {param.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'json':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : (value || '')}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                onChange(e.target.value);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={6}
            placeholder={param.placeholder || 'JSON 格式'}
          />
        );
      
      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => onChange(e.target.files?.[0])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={param.placeholder || param.displayName}
          />
        );
    }
  };

  const renderNodeSpecificConfig = () => {
    switch (node.type) {
      case 'webhook':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Webhook 配置</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HTTP 方法</label>
              <select
                value={parameters.httpMethod || 'POST'}
                onChange={(e) => setParameters(prev => ({ ...prev, httpMethod: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">路径</label>
              <input
                type="text"
                value={parameters.path || ''}
                onChange={(e) => setParameters(prev => ({ ...prev, path: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/webhook/my-endpoint"
              />
            </div>
          </div>
        );
      
      case 'http_request':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">HTTP 请求配置</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">请求方法</label>
              <select
                value={parameters.method || 'GET'}
                onChange={(e) => setParameters(prev => ({ ...prev, method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={parameters.url || ''}
                onChange={(e) => setParameters(prev => ({ ...prev, url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">请求头 (JSON)</label>
              <textarea
                value={typeof parameters.headers === 'object' ? JSON.stringify(parameters.headers, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    setParameters(prev => ({ ...prev, headers }));
                  } catch {
                    // 忽略无效JSON
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={3}
                placeholder='{"Content-Type": "application/json"}'
              />
            </div>
            {(parameters.method === 'POST' || parameters.method === 'PUT' || parameters.method === 'PATCH') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">请求体 (JSON)</label>
                <textarea
                  value={typeof parameters.body === 'object' ? JSON.stringify(parameters.body, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const body = JSON.parse(e.target.value);
                      setParameters(prev => ({ ...prev, body }));
                    } catch {
                      setParameters(prev => ({ ...prev, body: e.target.value }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={4}
                  placeholder='{"key": "value"}'
                />
              </div>
            )}
          </div>
        );
      
      case 'ai_processing':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">AI 处理配置</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
              <select
                value={parameters.model || 'gpt-4'}
                onChange={(e) => setParameters(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="glm-4">GLM-4</option>
                <option value="doubao">豆包</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">提示词</label>
              <textarea
                value={parameters.prompt || ''}
                onChange={(e) => setParameters(prev => ({ ...prev, prompt: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="输入AI处理的提示词..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">输入字段</label>
              <input
                type="text"
                value={parameters.input || ''}
                onChange={(e) => setParameters(prev => ({ ...prev, input: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入数据字段名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最大Token数</label>
              <input
                type="number"
                value={parameters.maxTokens || 1000}
                onChange={(e) => setParameters(prev => ({ ...prev, maxTokens: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="4000"
              />
            </div>
          </div>
        );
      
      case 'operation':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">软件操作配置</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">软件ID</label>
              <input
                type="text"
                value={config.softwareId || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, softwareId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="photoshop, blender, autocad..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">操作</label>
              <input
                type="text"
                value={config.action || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, action: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="resizeImage, applyFilter..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">参数 (JSON)</label>
              <textarea
                value={typeof config.parameters === 'object' ? JSON.stringify(config.parameters, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const parameters = JSON.parse(e.target.value);
                    setConfig(prev => ({ ...prev, parameters }));
                  } catch {
                    setConfig(prev => ({ ...prev, parameters: e.target.value }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={4}
                placeholder='{"width": 1920, "height": 1080}'
              />
            </div>
          </div>
        );
      
      case 'email':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">邮件发送配置</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">收件人</label>
              <input
                type="email"
                value={parameters.to || ''}
                onChange={(e) => setParameters(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">主题</label>
              <input
                type="text"
                value={parameters.subject || ''}
                onChange={(e) => setParameters(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="邮件主题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">正文</label>
              <textarea
                value={parameters.body || ''}
                onChange={(e) => setParameters(prev => ({ ...prev, body: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
                placeholder="邮件正文内容..."
              />
            </div>
          </div>
        );
      
      case 'schedule':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">定时触发配置</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cron 表达式</label>
              <input
                type="text"
                value={parameters.cronExpression || '0 9 * * *'}
                onChange={(e) => setParameters(prev => ({ ...prev, cronExpression: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 9 * * *"
              />
              <p className="text-xs text-gray-500 mt-1">格式: 分 时 日 月 星期</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">时区</label>
              <select
                value={parameters.timezone || 'Asia/Shanghai'}
                onChange={(e) => setParameters(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Asia/Shanghai">Asia/Shanghai</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-gray-500">
            此节点类型暂不支持配置编辑
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">节点配置</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <span className="sr-only">关闭</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-2">
          <p className="text-sm text-gray-600">{nodeType?.description || node.type}</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">基本信息</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">节点名称</label>
            <input
              type="text"
              value={config.title || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="节点名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={config.description || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="节点描述"
            />
          </div>
        </div>

        {/* 节点特定配置 */}
        {renderNodeSpecificConfig()}

        {/* 高级选项 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">高级选项</h4>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={node.continueOnFail || false}
              onChange={(e) => onUpdateNode(node.id, { continueOnFail: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm text-gray-700">失败时继续执行</label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={node.retryOnFail || false}
              onChange={(e) => onUpdateNode(node.id, { retryOnFail: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm text-gray-700">失败时重试</label>
          </div>
          {node.retryOnFail && (
            <div className="ml-6 space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最大重试次数</label>
                <input
                  type="number"
                  value={node.maxTries || 3}
                  onChange={(e) => onUpdateNode(node.id, { maxTries: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">重试间隔 (毫秒)</label>
                <input
                  type="number"
                  value={node.waitBetweenTries || 1000}
                  onChange={(e) => onUpdateNode(node.id, { waitBetweenTries: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="100"
                  step="100"
                />
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            保存
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeConfigPanel;