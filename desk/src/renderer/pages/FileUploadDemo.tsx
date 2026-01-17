import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload, UploadResult } from '../components/FileUpload/FileUpload';
import { FileUploader } from '../components/FileUpload/FileUploader';
import { FileManager } from '../components/FileUpload/FileManager';

export const FileUploadDemo: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upload' | 'manager'>('upload');
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);

  const handleUploadComplete = (results: UploadResult | UploadResult[]) => {
    if (Array.isArray(results)) {
      setUploadResults(prev => [...results, ...prev]);
    } else {
      setUploadResults(prev => [results, ...prev]);
    }
  };

  const handleError = (error: string) => {
    alert(`上传失败: ${error}`);
  };

  const handleFileSelect = (files: any[]) => {
    setSelectedFiles(files);
  };

  const clearUploadHistory = () => {
    setUploadResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* 头部 */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white transition"
            >
              ← 返回
            </button>
            <h1 className="text-2xl font-bold">文件上传系统</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* 标签页导航 */}
        <div className="border-b border-gray-700 mb-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-3 px-1 border-b-2 transition ${
                activeTab === 'upload' 
                  ? 'border-blue-500 text-white' 
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              文件上传
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`py-3 px-1 border-b-2 transition ${
                activeTab === 'manager' 
                  ? 'border-blue-500 text-white' 
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              文件管理
            </button>
          </div>
        </div>

        {/* 上传页面 */}
        {activeTab === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 基础文件上传 */}
            <div>
              <h2 className="text-xl font-semibold mb-4">基础上传</h2>
              <FileUpload
                options={{
                  multiple: true,
                  maxSize: 50,
                  allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'zip'],
                  onSuccess: handleUploadComplete,
                  onError: handleError
                } as any}
              >
                <div className="space-y-2">
                  <div className="text-lg">📁</div>
                  <div className="font-semibold">选择或拖拽文件</div>
                  <div className="text-sm text-gray-400">
                    支持多文件上传，最大50MB
                  </div>
                </div>
              </FileUpload>
            </div>

            {/* 头像上传 */}
            <div>
              <h2 className="text-xl font-semibold mb-4">头像上传</h2>
              <FileUploader
                type="avatar"
                onUploadComplete={(result) => {
                  alert('头像上传成功!');
                  console.log('Avatar upload result:', result);
                }}
                onError={handleError}
              />
            </div>

            {/* 项目文件上传 */}
            <div>
              <h2 className="text-xl font-semibold mb-4">项目文件上传</h2>
              <FileUploader
                type="project"
                multiple={true}
                onUploadComplete={handleUploadComplete}
                onError={handleError}
              />
            </div>

            {/* 脚本上传 */}
            <div>
              <h2 className="text-xl font-semibold mb-4">脚本上传</h2>
              <FileUploader
                type="script"
                multiple={true}
                onUploadComplete={handleUploadComplete}
                onError={handleError}
              />
            </div>
          </div>
        )}

        {/* 文件管理页面 */}
        {activeTab === 'manager' && (
          <div>
            <FileManager
              type="all"
              multiSelect={true}
              onSelect={handleFileSelect}
              className="mb-8"
            />

            {/* 选中的文件 */}
            {selectedFiles.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  已选择 {selectedFiles.length} 个文件
                </h3>
                <div className="space-y-2">
                  {selectedFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <div className="font-medium">{file.name}</div>
                          <div className="text-sm text-gray-400">{file.size}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        {file.uploadedAt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 上传历史 */}
        {uploadResults.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">最近上传</h3>
              <button
                onClick={clearUploadHistory}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                清空历史
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadResults.slice(0, 9).map((result, index) => (
                <div key={`${result.id}-${index}`} className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">📄</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" title={result.originalName}>
                        {result.originalName}
                      </div>
                      <div className="text-sm text-gray-400">
                        {result.size} • {new Date(result.uploadedAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-400 mt-1">
                        {result.type}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={() => window.open(result.url, '_blank')}
                      className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                    >
                      查看
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.url)}
                      className="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 transition"
                    >
                      复制链接
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 功能说明 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 p-6">
            <div className="text-3xl mb-3">📤</div>
            <h3 className="text-lg font-semibold mb-2">多文件上传</h3>
            <p className="text-gray-400 text-sm">
              支持同时上传多个文件，自动处理大文件分块上传
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 p-6">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold mb-2">文件类型验证</h3>
            <p className="text-gray-400 text-sm">
              根据上传类型自动验证文件格式和大小限制
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold mb-2">分块上传</h3>
            <p className="text-gray-400 text-sm">
              大文件自动分块上传，支持断点续传和进度显示
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 p-6">
            <div className="text-3xl mb-3">👁️</div>
            <h3 className="text-lg font-semibold mb-2">文件预览</h3>
            <p className="text-gray-400 text-sm">
              支持图片、文档等文件类型的在线预览
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 p-6">
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="text-lg font-semibold mb-2">安全控制</h3>
            <p className="text-gray-400 text-sm">
              完整的权限验证和文件安全扫描
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 p-6">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">使用统计</h3>
            <p className="text-gray-400 text-sm">
              详细的文件使用统计和存储管理
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};