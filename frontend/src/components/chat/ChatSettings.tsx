import React, { useState } from 'react';
import { ConversationSettings, SYSTEM_PROMPTS, DEFAULT_SETTINGS } from '../../types/chat';
import { X, Save, RotateCcw } from 'lucide-react';

interface ChatSettingsProps {
  settings: Partial<ConversationSettings>;
  onUpdateSettings: (settings: Partial<ConversationSettings>) => void;
  onClose: () => void;
}

export function ChatSettings({ settings, onUpdateSettings, onClose }: ChatSettingsProps) {
  const [localSettings, setLocalSettings] = useState<ConversationSettings>({
    ...DEFAULT_SETTINGS,
    ...settings,
  });

  const handleChange = (field: keyof ConversationSettings, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">聊天设置</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 设置内容 */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* AI模型选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">AI 模型</label>
            <select
              value={localSettings.model}
              onChange={(e) => handleChange('model', e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
            </select>
          </div>

          {/* 温度调节 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              创造性 (Temperature): {localSettings.temperature?.toFixed(2) || 0.7}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={localSettings.temperature || 0.7}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>保守</span>
              <span>平衡</span>
              <span>创造</span>
            </div>
          </div>

          {/* 最大Token数 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              最大回复长度
            </label>
            <input
              type="number"
              min="128"
              max="4096"
              step="128"
              value={localSettings.maxTokens || 2048}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 系统提示词 */}
          <div>
            <label className="block text-sm font-medium mb-2">系统提示词</label>
            <textarea
              value={localSettings.systemPrompt || ''}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              placeholder="自定义系统提示词..."
              rows={4}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            
            {/* 预设提示词 */}
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">快速选择预设：</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SYSTEM_PROMPTS).map(([key, prompt]) => (
                  <button
                    key={key}
                    onClick={() => handleChange('systemPrompt', prompt)}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
                  >
                    {key === 'general' && '通用助手'}
                    {key === 'creative' && '创意助手'}
                    {key === 'technical' && '技术专家'}
                    {key === 'analysis' && '分析师'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 功能开关 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-2">功能设置</label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localSettings.enableMemory || false}
                onChange={(e) => handleChange('enableMemory', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">启用记忆功能</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localSettings.enableSearch || false}
                onChange={(e) => handleChange('enableSearch', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">启用搜索增强</span>
            </label>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-4 border-t">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <RotateCcw size={16} />
            重置默认
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Save size={16} />
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}