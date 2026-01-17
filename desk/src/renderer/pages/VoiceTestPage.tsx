import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceInput } from '../components/VoiceInput';

const VoiceTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [transcriptionResult, setTranscriptionResult] = useState<string>('');
  const [errorLog, setErrorLog] = useState<string[]>([]);

  const handleTranscriptionComplete = (text: string, confidence: number) => {
    const result = `识别成功 (${(confidence * 100).toFixed(1)}%): ${text}`;
    setTranscriptionResult(result);
    setErrorLog([]);
  };

  const handleError = (error: string) => {
    setErrorLog(prev => [...prev, new Date().toLocaleTimeString() + ': ' + error]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 头部导航 */}
      <div className="border-b border-gray-700 bg-gray-800/50 backdrop-blur px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">语音功能测试</h1>
          <button
            onClick={() => navigate('/ai-chat')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            返回AI聊天
          </button>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：语音输入测试 */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">语音输入测试</h2>
              
              {/* 完整版语音输入 */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">完整版语音输入</h3>
                <VoiceInput
                  onTranscriptionComplete={handleTranscriptionComplete}
                  onError={handleError}
                  compactMode={false}
                />
              </div>

              {/* 紧凑版语音输入 */}
              <div>
                <h3 className="text-lg font-medium mb-3">紧凑版语音输入</h3>
                <VoiceInput
                  onTranscriptionComplete={handleTranscriptionComplete}
                  onError={handleError}
                  compactMode={true}
                />
              </div>
            </div>
          </div>

          {/* 右侧：结果显示 */}
          <div className="space-y-6">
            {/* 识别结果 */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">识别结果</h2>
              {transcriptionResult ? (
                <div className="p-4 bg-green-600/20 border border-green-600/50 rounded-lg">
                  <p className="text-green-400">{transcriptionResult}</p>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  等待语音输入...
                </div>
              )}
            </div>

            {/* 错误日志 */}
            {errorLog.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4">错误日志</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {errorLog.map((error, index) => (
                    <div key={index} className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setErrorLog([])}
                  className="mt-3 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  清除日志
                </button>
              </div>
            )}

            {/* 使用说明 */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">使用说明</h2>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400">1.</span>
                  <span>点击"开始录制"按钮开始语音输入</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400">2.</span>
                  <span>对着麦克风清晰地说出您想要转换的文字</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400">3.</span>
                  <span>点击"停止录制"结束录音</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400">4.</span>
                  <span>系统会自动将语音转换为文字</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400">5.</span>
                  <span>可以通过设置面板调整语音识别参数</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
                <p className="text-yellow-400 text-xs">
                  <strong>注意：</strong>首次使用需要允许浏览器访问麦克风权限
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceTestPage;