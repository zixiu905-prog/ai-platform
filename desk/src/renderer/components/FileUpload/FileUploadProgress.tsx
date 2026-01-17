import React from 'react';

interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  speed?: number;
  timeRemaining?: number;
  error?: string;
}

interface FileUploadProgressProps {
  uploads: UploadProgress[];
  onCancel?: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
  className?: string;
}

export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  uploads,
  onCancel,
  onRetry,
  className = ''
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
    return `${Math.round(seconds / 3600)}小时`;
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'uploading':
        return '⬆️';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📁';
    }
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-400';
      case 'uploading':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'uploading':
        return '上传中';
      case 'success':
        return '完成';
      case 'error':
        return '失败';
      default:
        return '未知';
    }
  };

  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
        <span>📤</span>
        <span>上传进度</span>
        <span className="text-sm text-gray-400">({uploads.length})</span>
      </h3>

      <div className="space-y-3">
        {uploads.map((upload) => (
          <div key={upload.fileId} className="bg-gray-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className="text-lg">{getStatusIcon(upload.status)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{upload.fileName}</div>
                  <div className={`text-sm ${getStatusColor(upload.status)}`}>
                    {getStatusText(upload.status)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                {upload.status === 'uploading' && (
                  <>
                    <span className="text-blue-400">{upload.progress}%</span>
                    {upload.speed && (
                      <span className="text-gray-400">
                        {formatFileSize(upload.speed)}/s
                      </span>
                    )}
                    {upload.timeRemaining && (
                      <span className="text-gray-400">
                        剩余 {formatTime(upload.timeRemaining)}
                      </span>
                    )}
                  </>
                )}

                {upload.status === 'pending' && onCancel && (
                  <button
                    onClick={() => onCancel(upload.fileId)}
                    className="text-gray-400 hover:text-red-400 transition"
                    title="取消上传"
                  >
                    ❌
                  </button>
                )}

                {upload.status === 'uploading' && onCancel && (
                  <button
                    onClick={() => onCancel(upload.fileId)}
                    className="text-gray-400 hover:text-red-400 transition"
                    title="取消上传"
                  >
                    ⏹️
                  </button>
                )}

                {upload.status === 'error' && onRetry && (
                  <button
                    onClick={() => onRetry(upload.fileId)}
                    className="text-gray-400 hover:text-blue-400 transition"
                    title="重试上传"
                  >
                    🔄
                  </button>
                )}
              </div>
            </div>

            {/* 进度条 */}
            {upload.status === 'uploading' && (
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            )}

            {/* 错误信息 */}
            {upload.status === 'error' && upload.error && (
              <div className="text-red-400 text-sm mt-2">
                错误: {upload.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 总体统计 */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">
            总计: {uploads.length} 个文件
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-green-400">
              成功: {uploads.filter(u => u.status === 'success').length}
            </div>
            <div className="text-blue-400">
              上传中: {uploads.filter(u => u.status === 'uploading').length}
            </div>
            <div className="text-red-400">
              失败: {uploads.filter(u => u.status === 'error').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadProgress;