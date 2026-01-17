import React, { useState, useEffect } from 'react';
import { useDesktopTheme } from '../../contexts/DesktopThemeContext';

interface VoiceSettings {
  language: string;
  model: string;
  autoSubmit: boolean;
  confidenceThreshold: number;
  maxDuration: number;
  audioQuality: string;
  noiseReduction: boolean;
  enablePunctuation: boolean;
}

interface VoiceModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  supportedLanguages: string[];
  maxDuration: number;
  maxFileSize: number;
  quality: string;
}

interface VoiceControlPanelProps {
  onSettingsChange?: (settings: VoiceSettings) => void;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({
  onSettingsChange,
  isOpen,
  onClose,
  className = ''
}) => {
  const { theme } = useDesktopTheme();
  
  const [settings, setSettings] = useState<VoiceSettings>({
    language: 'zh-CN',
    model: 'whisper-1',
    autoSubmit: false,
    confidenceThreshold: 0.7,
    maxDuration: 300,
    audioQuality: 'medium',
    noiseReduction: true,
    enablePunctuation: true
  });
  
  const [availableModels, setAvailableModels] = useState<VoiceModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // 加载设置和模型列表
  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadModels();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/voice/settings', {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('加载语音设置失败:', error);
    }
  };

  const loadModels = async () => {
    try {
      const response = await fetch('/api/voice/models', {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setAvailableModels(result.data);
      }
    } catch (error) {
      console.error('加载语音模型失败:', error);
    }
  };

  const handleSettingChange = (key: keyof VoiceSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const saveSettings = async () => {
    try {
      setIsLoading(true);
      setSaveStatus('saving');

      const response = await fetch('/api/voice/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings),
        credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('保存语音设置失败:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSettings = () => {
    const defaultSettings: VoiceSettings = {
      language: 'zh-CN',
      model: 'whisper-1',
      autoSubmit: false,
      confidenceThreshold: 0.7,
      maxDuration: 300,
      audioQuality: 'medium',
      noiseReduction: true,
      enablePunctuation: true
    };
    setSettings(defaultSettings);
    onSettingsChange?.(defaultSettings);
  };

  const getSaveButtonText = () => {
    switch (saveStatus) {
      case 'saving': return '保存中...';
      case 'saved': return '已保存';
      case 'error': return '保存失败';
      default: return '保存设置';
    }
  };

  const getSaveButtonStyle = () => {
    const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200";
    switch (saveStatus) {
      case 'saving': return `${baseStyle} bg-gray-600 text-white cursor-not-allowed`;
      case 'saved': return `${baseStyle} bg-green-600 text-white`;
      case 'error': return `${baseStyle} bg-red-600 text-white`;
      default: return `${baseStyle} bg-blue-600 hover:bg-blue-700 text-white`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`voice-control-panel ${className}`}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">语音设置</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* 设置内容 */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
            <div className="space-y-6">
              {/* 基本设置 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">基本设置</h3>
                
                {/* 语言选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    识别语言
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="zh-CN">中文 (简体)</option>
                    <option value="en-US">English (US)</option>
                    <option value="ja-JP">日本語</option>
                    <option value="ko-KR">한국어</option>
                    <option value="fr-FR">Français</option>
                    <option value="de-DE">Deutsch</option>
                    <option value="es-ES">Español</option>
                    <option value="it-IT">Italiano</option>
                  </select>
                </div>

                {/* 模型选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    识别模型
                  </label>
                  <select
                    value={settings.model}
                    onChange={(e) => handleSettingChange('model', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.provider}) - {model.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 音频质量 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    音频质量
                  </label>
                  <div className="flex space-x-3">
                    {['low', 'medium', 'high'].map((quality) => (
                      <label key={quality} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="quality"
                          value={quality}
                          checked={settings.audioQuality === quality}
                          onChange={(e) => handleSettingChange('audioQuality', e.target.value)}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
                        />
                        <span className="text-sm text-gray-300">
                          {quality === 'low' ? '低质量' : quality === 'medium' ? '中等质量' : '高质量'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* 高级设置 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">高级设置</h3>
                
                {/* 置信度阈值 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    置信度阈值: {(settings.confidenceThreshold * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={settings.confidenceThreshold}
                    onChange={(e) => handleSettingChange('confidenceThreshold', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>低 (10%)</span>
                    <span>高 (100%)</span>
                  </div>
                </div>

                {/* 最大录制时长 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    最大录制时长: {Math.floor(settings.maxDuration / 60)}分钟
                  </label>
                  <input
                    type="range"
                    min="60"
                    max="600"
                    step="60"
                    value={settings.maxDuration}
                    onChange={(e) => handleSettingChange('maxDuration', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1分钟</span>
                    <span>10分钟</span>
                  </div>
                </div>
              </div>

              {/* 功能开关 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">功能选项</h3>
                
                <div className="space-y-3">
                  {/* 自动提交 */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="text-sm font-medium text-gray-300">自动提交识别结果</div>
                      <div className="text-xs text-gray-500">录制完成后自动进行语音识别</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoSubmit}
                      onChange={(e) => handleSettingChange('autoSubmit', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                    />
                  </label>

                  {/* 降噪 */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="text-sm font-medium text-gray-300">噪音抑制</div>
                      <div className="text-xs text-gray-500">自动减少背景噪音</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.noiseReduction}
                      onChange={(e) => handleSettingChange('noiseReduction', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                    />
                  </label>

                  {/* 标点符号 */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="text-sm font-medium text-gray-300">自动添加标点</div>
                      <div className="text-xs text-gray-500">在识别文本中自动添加标点符号</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enablePunctuation}
                      onChange={(e) => handleSettingChange('enablePunctuation', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* 模型信息 */}
              {availableModels.find(m => m.id === settings.model) && (
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">当前模型信息</h4>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>提供商: {availableModels.find(m => m.id === settings.model)?.provider}</div>
                    <div>支持语言: {availableModels.find(m => m.id === settings.model)?.supportedLanguages.join(', ')}</div>
                    <div>最大时长: {Math.floor((availableModels.find(m => m.id === settings.model)?.maxDuration || 0) / 60)}分钟</div>
                    <div>质量等级: {availableModels.find(m => m.id === settings.model)?.quality}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700">
            <button
              onClick={resetSettings}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              重置默认
            </button>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveSettings}
                disabled={isLoading}
                className={getSaveButtonStyle()}
              >
                {getSaveButtonText()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};