import React, { useState, useEffect } from 'react';
import { useDesktopTheme } from '../../contexts/DesktopThemeContext';

interface VoiceRecording {
  id: string;
  sessionId: string;
  language: string;
  model: string;
  status: string;
  startTime: string;
  endTime?: string;
  fileSize?: number;
  duration?: number;
  format?: string;
  transcription?: string;
  confidence?: number;
  processingTime?: number;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface VoiceHistoryProps {
  onSelectRecording?: (recording: VoiceRecording) => void;
  className?: string;
}

export const VoiceHistory: React.FC<VoiceHistoryProps> = ({
  onSelectRecording,
  className = ''
}) => {
  const { theme } = useDesktopTheme();
  
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecording, setSelectedRecording] = useState<VoiceRecording | null>(null);

  // 加载录音记录
  useEffect(() => {
    loadRecordings();
  }, [pagination.page, statusFilter, searchQuery]);

  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });
      
      const response = await fetch(`/api/voice/history?${params}`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      if (result.success) {
        setRecordings(result.data.recordings);
        setPagination(result.data.pagination);
      }
    } catch (error) {
      console.error('加载录音记录失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecording = async (sessionId: string) => {
    if (!confirm('确定要删除这条录音记录吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/voice/recording/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setRecordings(prev => prev.filter(r => r.sessionId !== sessionId));
        if (selectedRecording?.sessionId === sessionId) {
          setSelectedRecording(null);
        }
      } else {
        alert('删除失败: ' + result.message);
      }
    } catch (error) {
      console.error('删除录音记录失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400';
      case 'PROCESSING': return 'text-blue-400';
      case 'FAILED': return 'text-red-400';
      case 'RECORDING': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '已完成';
      case 'PROCESSING': return '处理中';
      case 'FAILED': return '失败';
      case 'RECORDING': return '录制中';
      default: return '未知';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '未知';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '未知';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getModelDisplayName = (model: string) => {
    const modelNames: Record<string, string> = {
      'whisper-1': 'Whisper v1',
      'azure-speech': 'Azure Speech',
      'ali-nls': '阿里云语音'
    };
    return modelNames[model] || model;
  };

  const getLanguageDisplayName = (language: string) => {
    const languageNames: Record<string, string> = {
      'zh-CN': '中文',
      'en-US': '英文',
      'ja-JP': '日文',
      'ko-KR': '韩文'
    };
    return languageNames[language] || language;
  };

  const filteredRecordings = recordings.filter(recording => {
    const matchesStatus = statusFilter === 'all' || recording.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      (recording.transcription && recording.transcription.toLowerCase().includes(searchQuery.toLowerCase())) ||
      recording.sessionId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className={`voice-history ${className}`}>
      {/* 过滤和搜索 */}
      <div className="mb-6 space-y-4">
        {/* 状态过滤器 */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: '全部' },
            { value: 'COMPLETED', label: '已完成' },
            { value: 'PROCESSING', label: '处理中' },
            { value: 'FAILED', label: '失败' },
            { value: 'RECORDING', label: '录制中' }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                statusFilter === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* 搜索框 */}
        <div>
          <input
            type="text"
            placeholder="搜索录音内容或会话ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 录音记录列表 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-gray-400">加载中...</p>
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎙️</div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">暂无录音记录</h3>
            <p className="text-gray-500">
              {statusFilter !== 'all' || searchQuery 
                ? '没有符合条件的录音记录' 
                : '开始使用语音输入功能吧！'}
            </p>
          </div>
        ) : (
          filteredRecordings.map((recording) => (
            <div
              key={recording.id}
              className={`p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer ${
                selectedRecording?.id === recording.id ? 'border-blue-500 bg-blue-600/10' : ''
              }`}
              onClick={() => {
                setSelectedRecording(recording);
                onSelectRecording?.(recording);
              }}
            >
              <div className="flex items-start justify-between">
                {/* 左侧信息 */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`text-sm font-medium ${getStatusColor(recording.status)}`}>
                      {getStatusText(recording.status)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(recording.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* 识别结果 */}
                  {recording.transcription && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-300 line-clamp-2">
                        {recording.transcription}
                      </p>
                      {recording.confidence && (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">置信度:</span>
                          <div className="flex-1 max-w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${recording.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">
                            {(recording.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 技术信息 */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>会话ID: {recording.sessionId.substring(0, 8)}...</span>
                    <span>语言: {getLanguageDisplayName(recording.language)}</span>
                    <span>模型: {getModelDisplayName(recording.model)}</span>
                    {recording.duration && (
                      <span>时长: {formatDuration(recording.duration)}</span>
                    )}
                    {recording.fileSize && (
                      <span>大小: {formatFileSize(recording.fileSize)}</span>
                    )}
                    {recording.processingTime && (
                      <span>处理: {recording.processingTime}ms</span>
                    )}
                  </div>
                </div>

                {/* 右侧操作按钮 */}
                <div className="flex items-center space-x-2 ml-4">
                  {recording.transcription && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(recording.transcription!);
                        // 这里可以添加提示
                      }}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="复制文本"
                    >
                      📋
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRecording(recording.sessionId);
                    }}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="删除记录"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            
            <span className="text-sm text-gray-400">
              {pagination.page} / {pagination.totalPages}
            </span>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};