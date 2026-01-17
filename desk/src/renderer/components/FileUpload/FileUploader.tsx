import React, { useState, useCallback } from 'react';
import { FileUpload, UploadProgress as FileUploadProgressType, UploadResult } from './FileUpload';
import FileUploadProgress from './FileUploadProgress';

interface FileUploaderProps {
  type?: 'general' | 'avatar' | 'project' | 'script' | 'model' | 'font';
  projectId?: string;
  multiple?: boolean;
  className?: string;
  onUploadComplete?: (results: UploadResult | UploadResult[]) => void;
  onError?: (error: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  type = 'general',
  projectId,
  multiple = false,
  className = '',
  onUploadComplete,
  onError
}) => {
  const [uploads, setUploads] = useState<FileUploadProgressType[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // 根据类型获取允许的文件类型
  const getAllowedTypes = (uploadType: string): string[] => {
    const typeMap: Record<string, string[]> = {
      'avatar': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      'project': ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'avi', 'mov', 'pdf', 'doc', 'docx', 'txt', 'zip'],
      'script': ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'txt'],
      'model': ['obj', 'fbx', 'dae', '3ds', 'blend', 'max', 'c4d', 'jpg', 'png'],
      'font': ['ttf', 'otf', 'woff', 'woff2', 'eot'],
      'general': ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'zip', 'rar']
    };
    return typeMap[uploadType] || typeMap['general'];
  };

  // 获取最大文件大小
  const getMaxSize = (uploadType: string): number => {
    const sizeMap: Record<string, number> = {
      'avatar': 5,      // 5MB
      'project': 100,   // 100MB
      'script': 10,     // 10MB
      'model': 50,      // 50MB
      'font': 10,       // 10MB
      'general': 50     // 50MB
    };
    return sizeMap[uploadType] || sizeMap['general'];
  };

  // 处理上传进度
  const handleProgress = useCallback((progress: any) => {
    setUploads(prev => {
      const existing = prev.find(u => u.fileId === progress.fileId);
      if (existing) {
        return prev.map(u => 
          u.fileId === progress.fileId ? { ...u, ...progress } : u
        );
      } else {
        return [...prev, progress];
      }
    });
  }, []);

  // 处理上传成功
  const handleSuccess = useCallback((result: UploadResult | UploadResult[]) => {
    setIsUploading(false);
    
    // 更新上传状态为成功
    if (Array.isArray(result)) {
      result.forEach(r => {
        handleProgress({
          fileId: r.id,
          fileName: r.originalName,
          progress: 100,
          status: 'success'
        });
      });
    } else {
      handleProgress({
        fileId: result.id,
        fileName: result.originalName,
        progress: 100,
        status: 'success'
      });
    }

    // 清理已完成的上传（延迟一下，让用户看到完成状态）
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.status !== 'success'));
    }, 2000);

    onUploadComplete?.(result);
  }, [handleProgress, onUploadComplete]);

  // 处理上传错误
  const handleError = useCallback((error: string) => {
    setIsUploading(false);
    onError?.(error);
  }, [onError]);

  // 取消上传
  const handleCancel = useCallback((fileId: string) => {
    // 这里应该调用取消上传的API
    setUploads(prev => prev.filter(u => u.fileId !== fileId));
  }, []);

  // 重试上传
  const handleRetry = useCallback((fileId: string) => {
    // 这里应该实现重试逻辑
    setUploads(prev => prev.map(u => 
      u.fileId === fileId 
        ? { ...u, status: 'pending', error: undefined }
        : u
    ));
  }, []);

  // 开始上传时设置状态
  const handleUploadStart = () => {
    setIsUploading(true);
  };

  const allowedTypes = getAllowedTypes(type);
  const maxSize = getMaxSize(type);
  const maxFiles = multiple ? 10 : 1;

  return (
    <div className={className}>
      {/* 文件上传区域 */}
      <FileUpload
        options={{
          type,
          projectId,
          multiple,
          maxFiles,
          maxSize,
          allowedTypes,
          onProgress: handleProgress,
          onSuccess: handleSuccess,
          onError: handleError,
          onUploadStart: handleUploadStart
        }}
        disabled={isUploading}
      >
        {isUploading ? (
          <div className="space-y-2">
            <div className="text-lg">📤</div>
            <div className="font-semibold">上传中...</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📁</div>
            <div className="text-lg font-semibold">
              {type === 'avatar' && '上传头像'}
              {type === 'project' && '上传项目文件'}
              {type === 'script' && '上传脚本'}
              {type === 'model' && '上传3D模型'}
              {type === 'font' && '上传字体文件'}
              {type === 'general' && '上传文件'}
            </div>
            {multiple && (
              <div className="text-sm text-gray-400">
                可同时上传最多 {maxFiles} 个文件
              </div>
            )}
          </div>
        )}
      </FileUpload>

      {/* 上传信息提示 */}
      <div className="mt-4 text-sm text-gray-400 space-y-1">
        <div>
          <strong>支持格式:</strong> {allowedTypes.join(', ')}
        </div>
        <div>
          <strong>文件大小:</strong> 最大 {maxSize}MB
        </div>
        {type === 'avatar' && (
          <div>
            <strong>建议:</strong> 正方形图片，至少 200x200 像素
          </div>
        )}
        {type === 'model' && (
          <div>
            <strong>支持:</strong> OBJ, FBX, DAE, 3DS, BLEND 等格式
          </div>
        )}
      </div>

      {/* 上传进度显示 */}
      {uploads.length > 0 && (
        <div className="mt-6">
          <FileUploadProgress
            uploads={uploads}
            onCancel={handleCancel}
            onRetry={handleRetry}
          />
        </div>
      )}
    </div>
  );
};

export default FileUploader;