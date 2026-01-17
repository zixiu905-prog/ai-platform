import React, { useState } from 'react';
import { VoiceRecorder } from './VoiceRecorder';
import { VoiceControlPanel } from './VoiceControlPanel';
import { VoiceHistory } from './VoiceHistory';

export interface VoiceSettings {
  language: string;
  model: string;
  autoSubmit: boolean;
  confidenceThreshold: number;
  maxDuration: number;
  audioQuality: string;
  noiseReduction: boolean;
  enablePunctuation: boolean;
}

interface VoiceRecording {
  id: string;
  sessionId: string;
  transcription?: string;
  confidence?: number;
  status: string;
  language: string;
  model: string;
  duration?: number;
  fileSize?: number;
  createdAt: string;
}

interface VoiceInputProps {
  onTranscriptionComplete?: (text: string, confidence: number) => void;
  onError?: (error: string) => void;
  showHistory?: boolean;
  showSettings?: boolean;
  compactMode?: boolean;
  className?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscriptionComplete,
  onError,
  showHistory = true,
  showSettings: showSettingsProp = true,
  compactMode = false,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'recorder' | 'history'>('recorder');
  const [showSettings, setShowSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    language: 'zh-CN',
    model: 'whisper-1',
    autoSubmit: false,
    confidenceThreshold: 0.7,
    maxDuration: 300,
    audioQuality: 'medium',
    noiseReduction: true,
    enablePunctuation: true
  });

  const handleRecordingStart = () => {
    console.log('语音录制开始');
  };

  const handleRecordingStop = (audioBlob: Blob) => {
    console.log('语音录制停止，音频大小:', audioBlob.size);
  };

  const handleTranscriptionComplete = (text: string, confidence: number) => {
    console.log('语音识别完成:', { text, confidence });
    onTranscriptionComplete?.(text, confidence);
  };

  const handleError = (error: string) => {
    console.error('语音输入错误:', error);
    onError?.(error);
  };

  const handleSettingsChange = (newSettings: VoiceSettings) => {
    setVoiceSettings(newSettings);
  };

  const handleRecordingSelect = (recording: VoiceRecording) => {
    // 可以选择历史记录中的文本
    if (recording.transcription) {
      onTranscriptionComplete?.(recording.transcription, recording.confidence || 0);
    }
  };

  if (compactMode) {
    // 紧凑模式：只显示录制器
    return (
      <div className={`voice-input-compact ${className}`}>
        <div className="flex items-center space-x-2">
          <VoiceRecorder
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
            onTranscriptionComplete={handleTranscriptionComplete}
            onError={handleError}
            maxDuration={voiceSettings.maxDuration}
          />

          {showSettingsProp && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="语音设置"
            >
              ⚙️
            </button>
          )}
        </div>

        {showSettingsProp && (
          <VoiceControlPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            onSettingsChange={handleSettingsChange}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`voice-input ${className}`}>
      {/* 标签页导航 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('recorder')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'recorder'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🎤 语音录制
          </button>
          
          {showHistory && (
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📋 历史记录
            </button>
          )}
        </div>

        {showSettingsProp && (
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="语音设置"
          >
            ⚙️
          </button>
          )}
      </div>

      {/* 标签页内容 */}
      <div className="min-h-[400px]">
        {activeTab === 'recorder' && (
          <div className="space-y-6">
            {/* 录制器 */}
            <VoiceRecorder
              onRecordingStart={handleRecordingStart}
              onRecordingStop={handleRecordingStop}
              onTranscriptionComplete={handleTranscriptionComplete}
              onError={handleError}
              maxDuration={voiceSettings.maxDuration}
            />

            {/* 当前设置显示 */}
            <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-3">当前设置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">语言:</span>
                  <span className="text-gray-300">{voiceSettings.language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">模型:</span>
                  <span className="text-gray-300">{voiceSettings.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">最大时长:</span>
                  <span className="text-gray-300">{Math.floor(voiceSettings.maxDuration / 60)}分钟</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">置信度阈值:</span>
                  <span className="text-gray-300">{(voiceSettings.confidenceThreshold * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">音频质量:</span>
                  <span className="text-gray-300">
                    {voiceSettings.audioQuality === 'low' ? '低' : 
                     voiceSettings.audioQuality === 'medium' ? '中' : '高'}质量
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">自动提交:</span>
                  <span className="text-gray-300">{voiceSettings.autoSubmit ? '开启' : '关闭'}</span>
                </div>
              </div>
              
              {/* 功能特性 */}
              <div className="mt-4 flex flex-wrap gap-2">
                {voiceSettings.noiseReduction && (
                  <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                    🎧 降噪
                  </span>
                )}
                {voiceSettings.enablePunctuation && (
                  <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                    ✏️ 自动标点
                  </span>
                )}
                {voiceSettings.autoSubmit && (
                  <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded text-xs">
                    ⚡ 自动提交
                  </span>
                )}
              </div>
            </div>

            {/* 使用提示 */}
            <div className="p-4 bg-blue-600/10 rounded-lg border border-blue-600/30">
              <h3 className="text-sm font-medium text-blue-400 mb-2">💡 使用提示</h3>
              <ul className="text-xs text-blue-300 space-y-1">
                <li>• 点击"开始录制"按钮开始语音输入</li>
                <li>• 保持清晰发音，距离麦克风适中距离</li>
                <li>• 支持最长 {Math.floor(voiceSettings.maxDuration / 60)} 分钟连续录制</li>
                <li>• 识别完成后会自动显示文本内容</li>
                {voiceSettings.autoSubmit && (
                  <li>• 当前已开启自动提交，录制完成后会自动识别</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'history' && showHistory && (
          <VoiceHistory
            onSelectRecording={handleRecordingSelect}
          />
        )}
      </div>

      {/* 设置面板 */}
      {showSettingsProp && (
        <VoiceControlPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onSettingsChange={handleSettingsChange}
        />
      )}
    </div>
  );
};

// 导出子组件供外部使用
export { VoiceRecorder } from './VoiceRecorder';
export { VoiceControlPanel } from './VoiceControlPanel';
export { VoiceHistory } from './VoiceHistory';