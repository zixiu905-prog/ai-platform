import React, { useState, useCallback } from 'react';
import { Button, Card, List, Progress, Typography, Upload, message } from 'antd';
import { InboxOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { fileManager } from '../services/fileManager';
import { notificationManager } from '../services/notificationManager';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface FileUploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'waiting' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  path?: string;
}

interface FileUploaderProps {
  accept?: string[];
  maxSize?: number; // MB
  maxFiles?: number;
  onUploadComplete?: (files: FileUploadItem[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  accept = ['*'],
  maxSize = 100, // 100MB
  maxFiles = 10,
  onUploadComplete
}) => {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const validateFile = (file: File): string | null => {
    if (accept.length > 0 && !accept.includes('*') && !accept.some(ext => file.name.toLowerCase().endsWith(ext.toLowerCase()))) {
      return `文件类型不支持，仅支持 ${accept.join(', ')}`;
    }
    
    if (file.size > maxSize * 1024 * 1024) {
      return `文件大小超过限制，最大 ${maxSize}MB`;
    }
    
    return null;
  };

  const handleFileSelect = useCallback(async (selectedFiles: File[]) => {
    if (files.length + selectedFiles.length > maxFiles) {
      message.error(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }

    const newFiles: FileUploadItem[] = [];
    const errors: string[] = [];

    for (const file of selectedFiles) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        continue;
      }

      newFiles.push({
        id: `${Date.now()}_${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'waiting',
        progress: 0
      });
    }

    if (errors.length > 0) {
      message.error(errors.join('\n'));
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, maxFiles, accept, maxSize]);

  const handleUpload = async () => {
    if (files.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    setUploading(true);
    const updatedFiles = [...files];

    for (let i = 0; i < updatedFiles.length; i++) {
      const fileItem = updatedFiles[i];
      if (fileItem.status === 'success') continue;

      try {
        updatedFiles[i] = { ...fileItem, status: 'uploading', progress: 0 };
        setFiles([...updatedFiles]);

        const result = await fileManager.uploadFile(fileItem.file, {
          onProgress: (progress) => {
            updatedFiles[i] = { ...updatedFiles[i], progress: progress.percent || 0 };
            setFiles([...updatedFiles]);
          }
        });

        updatedFiles[i] = {
          ...updatedFiles[i],
          status: 'success',
          progress: 100,
          path: result.path
        };
        setFiles([...updatedFiles]);

        await notificationManager.showNotification({
          title: '文件上传成功',
          body: `${fileItem.name} 已成功上传`,
          icon: 'success'
        });

      } catch (error) {
        updatedFiles[i] = {
          ...updatedFiles[i],
          status: 'error',
          error: error instanceof Error ? error.message : '上传失败'
        };
        setFiles([...updatedFiles]);

        await notificationManager.showNotification({
          title: '文件上传失败',
          body: `${fileItem.name} 上传失败: ${error}`,
          icon: 'error'
        });
      }
    }

    setUploading(false);
    
    const completedFiles = updatedFiles.filter(f => f.status === 'success');
    if (completedFiles.length > 0) {
      onUploadComplete?.(completedFiles);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handlePreviewFile = async (fileItem: FileUploadItem) => {
    try {
      if (fileItem.path) {
        await fileManager.openFile(fileItem.path);
      }
    } catch (error) {
      message.error('无法打开文件');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const draggerProps = {
    name: 'file',
    multiple: true,
    accept: accept.includes('*') ? undefined : accept.join(','),
    showUploadList: false,
    beforeUpload: () => false,
    onChange: (info: any) => {
      handleFileSelect(info.fileList.map((f: any) => f.originFileObj));
    }
  };

  return (
    <div className="file-uploader">
      <Card>
        <Title level={4}>文件上传</Title>
        
        <Dragger {...draggerProps} style={{ marginBottom: 16 }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个或批量上传，最多 {maxFiles} 个文件，每个文件最大 {maxSize}MB
            {accept.length > 0 && !accept.includes('*') && (
              <>
                <br />
                支持格式: {accept.join(', ')}
              </>
            )}
          </p>
        </Dragger>

        {files.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>已选择 {files.length} 个文件</Text>
              <div>
                <Button 
                  type="primary" 
                  onClick={handleUpload}
                  loading={uploading}
                  style={{ marginRight: 8 }}
                >
                  {uploading ? '上传中...' : '开始上传'}
                </Button>
                <Button 
                  onClick={() => setFiles([])}
                  disabled={uploading}
                >
                  清空列表
                </Button>
              </div>
            </div>

            <List
              dataSource={files}
              renderItem={(fileItem) => (
                <List.Item
                  key={fileItem.id}
                  actions={[
                    fileItem.status === 'success' && (
                      <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreviewFile(fileItem)}
                      >
                        预览
                      </Button>
                    ),
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveFile(fileItem.id)}
                      disabled={uploading}
                    >
                      删除
                    </Button>
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    title={
                      <div>
                        {fileItem.name}
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {formatFileSize(fileItem.size)}
                        </Text>
                      </div>
                    }
                    description={
                      <div>
                        {fileItem.status === 'uploading' && (
                          <Progress percent={Math.round(fileItem.progress)} size="small" />
                        )}
                        {fileItem.status === 'error' && (
                          <Text type="danger">{fileItem.error}</Text>
                        )}
                        {fileItem.status === 'success' && (
                          <Text type="success">上传成功</Text>
                        )}
                        {fileItem.status === 'waiting' && (
                          <Text type="secondary">等待上传</Text>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Card>
    </div>
  );
};