import React, { useState, useCallback, useRef } from 'react';
import { useElectronAPI } from '../../contexts/ElectronAPIContext';
import apiService from '../../services/apiService';

// 类型定义
interface UploadOptions {
  type?: 'general' | 'avatar' | 'project' | 'script' | 'model' | 'font';
  projectId?: string;
  description?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // MB
  allowedTypes?: string[];
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (result: UploadResult | UploadResult[]) => void;
  onError?: (error: string) => void;
  onUploadStart?: () => void;
}

interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  speed?: number;
  timeRemaining?: number;
  error?: string;
}

interface UploadResult {
  id: string;
  filename: string;
  originalName: string;
  size: string;
  type: string;
  mimeType: string;
  url: string;
  fullPath: string;
  uploadedAt: string;
}

interface FileUploadProps {
  children: React.ReactNode;
  options?: UploadOptions;
  className?: string;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  children,
  options = {},
  className = '',
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const electronAPI = useElectronAPI();

  // 默认选项
  const uploadOptions: UploadOptions = {
    type: 'general',
    multiple: false,
    maxFiles: 10,
    maxSize: 100,
    allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt'],
    ...options
  };

  // 验证文件
  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // 检查文件大小
      if (file.size > uploadOptions.maxSize! * 1024 * 1024) {
        errors.push(`文件 ${file.name} 超过大小限制 (${uploadOptions.maxSize}MB)`);
        continue;
      }

      // 检查文件类型
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!uploadOptions.allowedTypes?.includes(fileExtension || '')) {
        errors.push(`文件类型 ${fileExtension} 不被支持`);
        continue;
      }

      valid.push(file);
    }

    // 检查文件数量
    if (uploadOptions.multiple && valid.length > uploadOptions.maxFiles!) {
      errors.push(`最多只能上传 ${uploadOptions.maxFiles} 个文件`);
    }

    return { valid, errors };
  };

  // 处理文件上传
  const handleFiles = useCallback(async (files: File[]) => {
    if (disabled || files.length === 0) return;

    uploadOptions.onUploadStart?.();

    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      uploadOptions.onError?.(errors.join('; '));
      return;
    }

    if (valid.length === 0) return;

    // 对于大文件，使用分块上传
    const largeFiles = valid.filter(file => file.size > 10 * 1024 * 1024); // 10MB以上使用分块上传
    const smallFiles = valid.filter(file => file.size <= 10 * 1024 * 1024);

    try {
      const results: UploadResult[] = [];

      // 处理小文件
      if (smallFiles.length > 0) {
        const smallResults = await uploadSmallFiles(smallFiles);
        results.push(...smallResults);
      }

      // 处理大文件
      for (const largeFile of largeFiles) {
        const largeResult = await uploadLargeFile(largeFile);
        results.push(largeResult);
      }

      uploadOptions.onSuccess?.(uploadOptions.multiple ? results : results[0]);
    } catch (error) {
      uploadOptions.onError?.(error instanceof Error ? error.message : '上传失败');
    }
  }, [uploadOptions, disabled]);

  // 上传小文件
  const uploadSmallFiles = async (files: File[]): Promise<UploadResult[]> => {
    const formData = new FormData();
    
    // 添加上传参数
    formData.append('type', uploadOptions.type!);
    if (uploadOptions.projectId) {
      formData.append('projectId', uploadOptions.projectId);
    }
    if (uploadOptions.description) {
      formData.append('description', uploadOptions.description);
    }

    // 添加文件
    if (uploadOptions.multiple) {
      files.forEach(file => {
        formData.append('files', file);
      });
    } else {
      formData.append('file', files[0]);
    }

    const endpoint = uploadOptions.multiple ? '/api/upload/multiple' : '/api/upload/single';
    
    const response = await fetch(`http://localhost:3001${endpoint}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || '上传失败');
    }

    return uploadOptions.multiple ? result.data : [result.data];
  };

  // 上传大文件（分块上传）
  const uploadLargeFile = async (file: File): Promise<UploadResult> => {
    const chunkSize = 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(file.size / chunkSize);
    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建进度跟踪
    const progressItem: UploadProgress = {
      fileId,
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    };
    setUploadProgress(prev => [...prev, progressItem]);

    try {
      // 初始化分块上传
      const initResponse = await apiService.post('/api/upload/chunk/init', {
        filename: file.name,
        totalSize: file.size,
        totalChunks,
        type: uploadOptions.type,
        hash: await calculateFileHash(file)
      });

      if (!initResponse.success) {
        throw new Error(initResponse.message);
      }

      const { uploadId } = initResponse.data;

      // 上传分块
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', new Blob([chunk]), `chunk_${chunkIndex}`);

        await fetch(`http://localhost:3001/api/upload/chunk/${uploadId}/${chunkIndex}`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        // 更新进度
        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        setUploadProgress(prev => 
          prev.map(item => 
            item.fileId === fileId 
              ? { ...item, progress }
              : item
          )
        );

        uploadOptions.onProgress?.({
          fileId,
          fileName: file.name,
          progress,
          status: 'uploading'
        });
      }

      // 完成分块上传
      const completeResponse = await apiService.post(`/api/upload/chunk/${uploadId}/complete`, {
        type: uploadOptions.type,
        projectId: uploadOptions.projectId,
        description: uploadOptions.description
      });

      if (!completeResponse.success) {
        throw new Error(completeResponse.message);
      }

      // 更新状态为成功
      setUploadProgress(prev => 
        prev.map(item => 
          item.fileId === fileId 
            ? { ...item, progress: 100, status: 'success' }
            : item
        )
      );

      return completeResponse.data;
    } catch (error) {
      // 更新状态为失败
      setUploadProgress(prev => 
        prev.map(item => 
          item.fileId === fileId 
            ? { 
                ...item, 
                status: 'error', 
                error: error instanceof Error ? error.message : '上传失败' 
              }
            : item
        )
      );
      throw error;
    }
  };

  // 计算文件哈希
  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // 拖拽事件处理
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  // 点击事件处理
  const handleClick = () => {
    if (disabled) return;

    if (electronAPI?.dialog) {
      // 使用Electron的文件选择对话框
      electronAPI.dialog.openFile().then((result) => {
        if (result) {
          // 将文件路径转换为File对象（这里简化处理）
          const fileName = result.fileName;
          const file = new File([], fileName);
          handleFiles([file]);
        }
      });
    } else {
      // 使用原生文件输入
      fileInputRef.current?.click();
    }
  };

  // 文件输入变化处理
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    
    // 清空输入框，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/30'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple={uploadOptions.multiple}
          accept={uploadOptions.allowedTypes?.map(ext => `.${ext}`).join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        {/* 拖拽提示 */}
        {isDragging ? (
          <div className="space-y-2">
            <div className="text-4xl">📁</div>
            <div className="text-lg font-semibold text-blue-400">松开以上传文件</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-4xl">☁️</div>
            <div>
              <div className="text-lg font-semibold">拖拽文件到此处</div>
              <div className="text-gray-400">或者点击选择文件</div>
            </div>
            
            {/* 限制提示 */}
            <div className="text-sm text-gray-500 space-y-1">
              <div>支持格式: {uploadOptions.allowedTypes?.join(', ')}</div>
              <div>最大大小: {uploadOptions.maxSize}MB</div>
              {uploadOptions.multiple && (
                <div>最多文件: {uploadOptions.maxFiles}</div>
              )}
            </div>
          </div>
        )}

        {/* 自定义子组件 */}
        {!isDragging && children}
      </div>

      {/* 上传进度显示 */}
      {uploadProgress.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadProgress.map((progress) => (
            <div key={progress.fileId} className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    progress.status === 'success' ? 'bg-green-500' :
                    progress.status === 'error' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`} />
                  <span className="text-sm font-medium truncate max-w-xs">
                    {progress.fileName}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {progress.status === 'uploading' && (
                    <span className="text-sm text-blue-400">{progress.progress}%</span>
                  )}
                  {progress.status === 'success' && (
                    <span className="text-sm text-green-400">✓ 完成</span>
                  )}
                  {progress.status === 'error' && (
                    <span className="text-sm text-red-400">✗ 失败</span>
                  )}
                </div>
              </div>
              
              {progress.status === 'uploading' && (
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              )}
              
              {progress.error && (
                <div className="text-xs text-red-400 mt-1">{progress.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
export { UploadProgress, UploadResult, type UploadOptions };