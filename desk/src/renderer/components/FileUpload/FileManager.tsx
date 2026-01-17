import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';

// 类型定义
interface FileItem {
  id: string;
  name: string;
  type: string;
  size: string;
  mimeType: string;
  url: string;
  fullPath: string;
  uploadedAt: string;
  metadata?: any;
}

interface FileManagerProps {
  type?: 'all' | 'image' | 'video' | 'document' | 'script' | 'model';
  projectId?: string;
  onSelect?: (files: FileItem[]) => void;
  multiSelect?: boolean;
  className?: string;
}

export const FileManager: React.FC<FileManagerProps> = ({
  type = 'all',
  projectId,
  onSelect,
  multiSelect = false,
  className = ''
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadFiles();
  }, [type, projectId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      let url = '/api/files';
      
      const params = new URLSearchParams();
      if (type !== 'all') params.append('type', type);
      if (projectId) params.append('projectId', projectId);
      if (searchQuery) params.append('search', searchQuery);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);
      
      const response = await apiService.get(`${url}?${params.toString()}`);
      
      if (response.success) {
        setFiles(response.data);
      }
    } catch (error) {
      console.error('加载文件列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 文件选择处理
  const handleFileSelect = (fileId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (multiSelect) {
      setSelectedFiles(prev => {
        if (prev.includes(fileId)) {
          return prev.filter(id => id !== fileId);
        } else {
          return [...prev, fileId];
        }
      });
    } else {
      setSelectedFiles([fileId]);
    }
  };

  // 全选处理
  const handleSelectAll = () => {
    if (multiSelect) {
      setSelectedFiles(files.map(f => f.id));
    }
  };

  // 清除选择
  const handleClearSelection = () => {
    setSelectedFiles([]);
  };

  // 删除文件
  const handleDelete = async (fileId: string) => {
    if (!confirm('确定要删除这个文件吗？')) return;

    try {
      const response = await apiService.delete(`/api/upload/${fileId}`);
      if (response.success) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        setSelectedFiles(prev => prev.filter(id => id !== fileId));
      }
    } catch (error) {
      console.error('删除文件失败:', error);
      alert('删除文件失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedFiles.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedFiles.length} 个文件吗？`)) return;

    try {
      await Promise.all(
        selectedFiles.map(fileId => apiService.delete(`/api/upload/${fileId}`))
      );
      
      setFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)));
      setSelectedFiles([]);
    } catch (error) {
      console.error('批量删除失败:', error);
      alert('删除文件失败');
    }
  };

  // 获取文件图标
  const getFileIcon = (mimeType: string, fileName: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return '📝';
    if (mimeType.includes('excel') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return '📊';
    if (mimeType.includes('powerpoint') || fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return '🗜️';
    if (mimeType.includes('javascript') || fileName.endsWith('.js')) return '📜';
    if (mimeType.includes('python') || fileName.endsWith('.py')) return '🐍';
    if (mimeType.includes('java') || fileName.endsWith('.java')) return '☕';
    if (mimeType.includes('font')) return '🔤';
    if (mimeType.includes('model') || fileName.endsWith('.obj') || fileName.endsWith('.fbx')) return '🎮';
    return '📄';
  };

  // 格式化文件大小
  const formatFileSize = (sizeStr: string): string => {
    const size = parseFloat(sizeStr);
    if (size < 1) return `${(size * 1024).toFixed(0)} KB`;
    return `${size.toFixed(2)} MB`;
  };

  // 格式化日期
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 排序文件
  const sortFiles = (files: FileItem[]): FileItem[] => {
    return [...files].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
        case 'size':
          comparison = parseFloat(a.size) - parseFloat(b.size);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // 过滤文件
  const filteredFiles = sortFiles(files).filter(file => {
    if (!searchQuery) return true;
    return file.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-white">加载文件列表中...</div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 ${className}`}>
      {/* 工具栏 */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 搜索框 */}
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />

            {/* 排序选择 */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                setSortBy(sort as any);
                setSortOrder(order as any);
              }}
              className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none"
            >
              <option value="date-desc">最新优先</option>
              <option value="date-asc">最旧优先</option>
              <option value="name-asc">名称 A-Z</option>
              <option value="name-desc">名称 Z-A</option>
              <option value="size-asc">大小递增</option>
              <option value="size-desc">大小递减</option>
            </select>

            {/* 视图模式切换 */}
            <div className="flex items-center space-x-2 border border-gray-600 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600' : 'hover:bg-gray-700'} transition`}
              >
                ⊞
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600' : 'hover:bg-gray-700'} transition`}
              >
                ☰
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* 批量操作 */}
            {selectedFiles.length > 0 && (
              <>
                <span className="text-sm text-gray-400">
                  已选择 {selectedFiles.length} 个文件
                </span>
                <button
                  onClick={handleBatchDelete}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  删除
                </button>
                {onSelect && (
                  <button
                    onClick={() => {
                      const selectedFileItems = files.filter(f => selectedFiles.includes(f.id));
                      onSelect(selectedFileItems);
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    确认选择
                  </button>
                )}
                <button
                  onClick={handleClearSelection}
                  className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  取消选择
                </button>
              </>
            )}
            
            {selectedFiles.length === 0 && files.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                全选
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 文件列表/网格 */}
      <div className="p-4">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-4">📁</div>
            <div className="text-lg">没有找到文件</div>
            <div className="text-sm mt-2">
              {searchQuery ? '尝试其他搜索关键词' : '开始上传文件'}
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredFiles.map(file => (
                  <div
                    key={file.id}
                    onClick={() => handleFileSelect(file.id, file as any)}
                    className={`relative group cursor-pointer rounded-lg border-2 transition-all ${
                      selectedFiles.includes(file.id)
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'
                    }`}
                  >
                    {/* 选择指示器 */}
                    {selectedFiles.includes(file.id) && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="aspect-square bg-gray-700 rounded-lg flex items-center justify-center mb-2">
                        <span className="text-4xl">
                          {getFileIcon(file.mimeType, file.name)}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="font-medium text-sm truncate" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatFileSize(file.size)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(file.uploadedAt)}
                        </div>
                      </div>
                    </div>

                    {/* 悬停操作 */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(file.url, '_blank');
                        }}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                        title="预览"
                      >
                        👁️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(file.url);
                        }}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                        title="复制链接"
                      >
                        📋
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.id);
                        }}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map(file => (
                  <div
                    key={file.id}
                    onClick={() => handleFileSelect(file.id, file as any)}
                    className={`flex items-center space-x-4 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedFiles.includes(file.id)
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'
                    }`}
                  >
                    {/* 选择框 */}
                    <div className={`w-4 h-4 rounded border-2 ${
                      selectedFiles.includes(file.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-500'
                    }`}>
                      {selectedFiles.includes(file.id) && (
                        <div className="text-white text-xs flex items-center justify-center h-full">
                          ✓
                        </div>
                      )}
                    </div>

                    {/* 文件图标 */}
                    <div className="text-2xl">
                      {getFileIcon(file.mimeType, file.name)}
                    </div>

                    {/* 文件信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" title={file.name}>
                        {file.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(file.url, '_blank');
                        }}
                        className="p-1 hover:bg-gray-600 rounded transition"
                        title="预览"
                      >
                        👁️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(file.url);
                        }}
                        className="p-1 hover:bg-gray-600 rounded transition"
                        title="复制链接"
                      >
                        📋
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.id);
                        }}
                        className="p-1 hover:bg-gray-600 rounded transition"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部统计 */}
      {filteredFiles.length > 0 && (
        <div className="border-t border-gray-700 p-4 text-sm text-gray-400">
          共 {filteredFiles.length} 个文件
          {searchQuery && ` (搜索 "${searchQuery}" 的结果)`}
        </div>
      )}
    </div>
  );
};