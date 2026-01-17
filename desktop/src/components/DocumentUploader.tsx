import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Button, 
  Space, 
  Typography, 
  Card, 
  Progress, 
  message, 
  Modal,
  Table,
  Tag,
  Tooltip,
  List,
  Descriptions,
  Alert,
  Spin
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import './DocumentUploader.css';

const { Text, Title, Paragraph } = Typography;
const { Dragger } = Upload;

export interface DocumentItem {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  type: string;
  format: string;
  pages?: number;
  uploadProgress?: number;
  status?: 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
  content?: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
    keywords?: string[];
  };
  extractedText?: string;
  thumbnail?: string;
  timestamp: number;
}

interface DocumentUploaderProps {
  value?: DocumentItem[];
  onChange?: (documents: DocumentItem[]) => void;
  maxCount?: number;
  maxSize?: number; // MB
  accept?: string;
  showUploadList?: boolean;
  disabled?: boolean;
  enablePreview?: boolean;
  enableExtraction?: boolean;
  customUpload?: (file: File, onProgress: (progress: number) => void) => Promise<string>;
  onPreview?: (document: DocumentItem) => void;
  onExtract?: (document: DocumentItem) => void;
  onRemove?: (document: DocumentItem) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  value = [],
  onChange,
  maxCount = 10,
  maxSize = 20,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf',
  showUploadList = true,
  disabled = false,
  enablePreview = true,
  enableExtraction = true,
  customUpload,
  onPreview,
  onExtract,
  onRemove
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成唯一ID
  const generateId = useCallback(() => {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 获取文件图标
  const getFileIcon = useCallback((type: string) => {
    if (type.includes('pdf')) return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    if (type.includes('word') || type.includes('doc')) return <FileWordOutlined style={{ color: '#1890ff' }} />;
    if (type.includes('sheet') || type.includes('excel')) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    if (type.includes('presentation') || type.includes('ppt')) return <FilePptOutlined style={{ color: '#faad14' }} />;
    if (type.includes('text') || type.includes('txt')) return <FileTextOutlined style={{ color: '#666' }} />;
    return <FileOutlined style={{ color: '#999' }} />;
  }, []);

  // 获取文档格式
  const getDocumentFormat = useCallback((type: string, name: string) => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || name.endsWith('.doc')) return 'DOC';
    if (type.includes('word') || name.endsWith('.docx')) return 'DOCX';
    if (type.includes('sheet') || name.endsWith('.xls')) return 'XLS';
    if (type.includes('sheet') || name.endsWith('.xlsx')) return 'XLSX';
    if (type.includes('presentation') || name.endsWith('.ppt')) return 'PPT';
    if (type.includes('presentation') || name.endsWith('.pptx')) return 'PPTX';
    if (type.includes('text') || name.endsWith('.txt')) return 'TXT';
    if (type.includes('rtf')) return 'RTF';
    return 'Unknown';
  }, []);

  // 验证文件
  const validateFile = useCallback((file: File): string | null => {
    // 检查大小
    if (file.size / 1024 / 1024 > maxSize) {
      return `文档大小不能超过${maxSize}MB！`;
    }

    // 检查数量
    if (value.length >= maxCount) {
      return `最多只能上传${maxCount}个文档！`;
    }

    // 检查类型
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/rtf'
    ];

    if (!allowedTypes.includes(file.type)) {
      return '不支持的文档格式！';
    }

    return null;
  }, [maxSize, maxCount, value.length]);

  // 提取文档内容（模拟）
  const extractDocumentContent = useCallback(async (document: DocumentItem): Promise<string> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 模拟文本提取
        const sampleContent = `
文档标题：${document.name}
文件大小：${(document.size / 1024 / 1024).toFixed(2)} MB
文件类型：${document.format}
创建时间：${new Date(document.timestamp).toLocaleString()}

这是从${document.name}中提取的示例文本内容。
在实际应用中，这里会调用文档解析服务来提取真实的文本内容。

支持的功能：
1. 文本内容提取
2. 文档元数据读取
3. 图片提取（PDF）
4. 表格数据解析
5. 样式信息保留

注意：当前为模拟演示，生产环境需要集成专业的文档解析服务。
        `.trim();
        resolve(sampleContent);
      }, 2000 + Math.random() * 2000); // 2-4秒随机延迟
    });
  }, []);

  // 提取文档元数据（模拟）
  const extractDocumentMetadata = useCallback(async (document: DocumentItem) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const metadata = {
          title: document.name.replace(/\.[^/.]+$/, ''),
          author: 'AiDesign User',
          subject: 'Design Document',
          creator: 'Desktop Application',
          producer: 'Document Parser v1.0',
          creationDate: new Date(document.timestamp).toISOString(),
          modificationDate: new Date(document.timestamp).toISOString(),
          keywords: ['design', 'document', 'aidesign']
        };
        resolve(metadata);
      }, 1000 + Math.random() * 1000); // 1-2秒随机延迟
    });
  }, []);

  // 处理文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      message.error(error);
      return false;
    }

    const id = generateId();
    const url = URL.createObjectURL(file);
    const format = getDocumentFormat(file.type, file.name);

    const documentItem: DocumentItem = {
      id,
      file,
      url,
      name: file.name,
      size: file.size,
      type: file.type,
      format,
      status: 'uploading',
      uploadProgress: 0,
      timestamp: Date.now()
    };

    const newDocuments = [...value, documentItem];
    onChange?.(newDocuments);

    try {
      let finalDocuments = newDocuments;

      if (customUpload) {
        const uploadedUrl = await customUpload(file, (progress) => {
          const updatedDocuments = newDocuments.map(doc => 
            doc.id === id ? { ...doc, uploadProgress: progress } : doc
          );
          onChange?.(updatedDocuments);
        });
        
        finalDocuments = newDocuments.map(doc => 
          doc.id === id ? { 
            ...doc, 
            url: uploadedUrl, 
            status: 'done' as const,
            uploadProgress: 100
          } : doc
        );
        onChange?.(finalDocuments);
      } else {
        // 模拟上传进度
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          const updatedDocuments = newDocuments.map(doc => 
            doc.id === id ? { ...doc, uploadProgress: progress } : doc
          );
          onChange?.(updatedDocuments);
        }
        
        finalDocuments = newDocuments.map(doc => 
          doc.id === id ? { ...doc, status: 'done' as const } : doc
        );
        onChange?.(finalDocuments);
      }

      // 自动提取元数据
      if (enableExtraction) {
        const metadata = await extractDocumentMetadata(documentItem);
        const updatedDocuments = (await onChange?.(finalDocuments)) || finalDocuments;
        const metadataUpdatedDocuments = updatedDocuments.map(doc => 
          doc.id === id ? { ...doc, metadata: metadata as any, status: 'processing' as const } : doc
        );
        onChange?.(metadataUpdatedDocuments);

        // 提取文本内容
        const extractedText = await extractDocumentContent(documentItem);
        const contentUpdatedDocuments = metadataUpdatedDocuments.map(doc => 
          doc.id === id ? { 
            ...doc, 
            extractedText,
            status: 'done' as const 
          } : doc
        );
        onChange?.(contentUpdatedDocuments);
      }

    } catch (error) {
      const errorDocuments = newDocuments.map(doc => 
        doc.id === id ? { 
          ...doc, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : '处理失败'
        } : doc
      );
      onChange?.(errorDocuments);
      message.error('文档处理失败');
    }

    return false; // 阻止默认上传行为
  }, [value, onChange, validateFile, generateId, getDocumentFormat, customUpload, enableExtraction, extractDocumentMetadata, extractDocumentContent]);

  // 处理文件选择
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      handleFileUpload(file);
    });
  }, [handleFileUpload]);

  // 删除文档
  const handleRemove = useCallback((document: DocumentItem) => {
    const newDocuments = value.filter(doc => doc.id !== document.id);
    onChange?.(newDocuments);
    onRemove?.(document);
    URL.revokeObjectURL(document.url);
  }, [value, onChange, onRemove]);

  // 预览文档
  const handlePreview = useCallback((document: DocumentItem) => {
    setPreviewDocument(document);
    setPreviewVisible(true);
    onPreview?.(document);
  }, [onPreview]);

  // 重新提取内容
  const handleReExtract = useCallback(async (document: DocumentItem) => {
    setExtractingId(document.id);
    try {
      const extractedText = await extractDocumentContent(document);
      const updatedDocuments = value.map(doc => 
        doc.id === document.id ? { ...doc, extractedText } : doc
      );
      onChange?.(updatedDocuments);
      onExtract?.(document);
      message.success('内容提取完成');
    } catch (error) {
      message.error('内容提取失败');
    } finally {
      setExtractingId(null);
    }
  }, [value, onChange, extractDocumentContent, onExtract]);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // 获取状态图标
  const getStatusIcon = useCallback((status: DocumentItem['status']) => {
    switch (status) {
      case 'uploading':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'processing':
        return <LoadingOutlined style={{ color: '#faad14' }} />;
      case 'done':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#999' }} />;
    }
  }, []);

  // 渲染文档列表
  const renderDocumentList = () => {
    if (value.length === 0) {
      return (
        <div className="empty-state">
          <FileTextOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
          <Text type="secondary">暂无文档，请上传文件</Text>
        </div>
      );
    }

    const columns: ColumnsType<DocumentItem> = [
      {
        title: '文档',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: DocumentItem) => (
          <Space>
            {getFileIcon(record.type)}
            <div>
              <Text strong ellipsis={{ tooltip: text }} style={{ maxWidth: 200 }}>
                {text}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatFileSize(record.size)}
              </Text>
            </div>
          </Space>
        )
      },
      {
        title: '格式',
        dataIndex: 'format',
        key: 'format',
        render: (format: string) => (
          <Tag color="blue">{format}</Tag>
        )
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: DocumentItem['status'], record: DocumentItem) => (
          <Space>
            {getStatusIcon(status)}
            <Text>
              {status === 'uploading' && '上传中'}
              {status === 'processing' && '处理中'}
              {status === 'done' && '已完成'}
              {status === 'error' && '失败'}
            </Text>
            {status === 'uploading' && (
              <Progress 
                percent={record.uploadProgress} 
                size="small" 
                style={{ width: 80, margin: 0 }}
              />
            )}
          </Space>
        )
      },
      {
        title: '提取内容',
        dataIndex: 'extractedText',
        key: 'extractedText',
        render: (text: string, record: DocumentItem) => (
          <Space>
            {text ? (
              <Tag color="green">已提取</Tag>
            ) : (
              <Tag color="orange">未提取</Tag>
            )}
            {enableExtraction && record.status === 'done' && (
              <Button
                size="small"
                type="link"
                loading={extractingId === record.id}
                onClick={() => handleReExtract(record)}
              >
                {text ? '重新提取' : '提取'}
              </Button>
            )}
          </Space>
        )
      },
      {
        title: '操作',
        key: 'actions',
        render: (_, record: DocumentItem) => (
          <Space>
            {enablePreview && record.status === 'done' && (
              <Tooltip title="预览">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(record)}
                />
              </Tooltip>
            )}
            <Tooltip title="下载">
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = record.url;
                  a.download = record.name;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              />
            </Tooltip>
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(record)}
                disabled={disabled}
              />
            </Tooltip>
          </Space>
        )
      }
    ];

    return (
      <Table
        dataSource={value}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="middle"
        className="document-table"
      />
    );
  };

  return (
    <div className="document-uploader">
      {showUploadList && (
        <div className="upload-area">
          <Dragger
            accept={accept}
            multiple
            disabled={disabled}
            beforeUpload={() => false} // 阻止默认上传
            onChange={({ fileList }) => {
              const files = fileList.map(item => item.originFileObj).filter(Boolean) as File[];
              handleFileSelect(files as any);
            }}
            className="upload-dragger"
          >
            <p className="ant-upload-drag-icon">
              <FileTextOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持单个或批量上传，严格禁止上传公司数据或其他敏感信息
            </p>
          </Dragger>
        </div>
      )}

      <div className="document-list">
        <Card title={`文档列表 (${value.length}/${maxCount})`} bordered={false}>
          {renderDocumentList()}
        </Card>
      </div>

      {/* 预览模态框 */}
      <Modal
        title={`文档预览 - ${previewDocument?.name}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        width="80vw"
        style={{ maxWidth: 1000 }}
        className="document-preview-modal"
      >
        {previewDocument && (
          <div className="document-preview-content">
            <Descriptions title="文档信息" bordered size="small" column={2}>
              <Descriptions.Item label="文件名">{previewDocument.name}</Descriptions.Item>
              <Descriptions.Item label="格式">{previewDocument.format}</Descriptions.Item>
              <Descriptions.Item label="大小">{formatFileSize(previewDocument.size)}</Descriptions.Item>
              <Descriptions.Item label="上传时间">
                {new Date(previewDocument.timestamp).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            {previewDocument.metadata && (
              <Descriptions title="元数据" bordered size="small" column={2} style={{ marginTop: 24 }}>
                {previewDocument.metadata.title && (
                  <Descriptions.Item label="标题">{previewDocument.metadata.title}</Descriptions.Item>
                )}
                {previewDocument.metadata.author && (
                  <Descriptions.Item label="作者">{previewDocument.metadata.author}</Descriptions.Item>
                )}
                {previewDocument.metadata.subject && (
                  <Descriptions.Item label="主题">{previewDocument.metadata.subject}</Descriptions.Item>
                )}
                {previewDocument.metadata.creator && (
                  <Descriptions.Item label="创建者">{previewDocument.metadata.creator}</Descriptions.Item>
                )}
              </Descriptions>
            )}

            {previewDocument.extractedText ? (
              <div style={{ marginTop: 24 }}>
                <Title level={5}>提取内容</Title>
                <Card size="small">
                  <Paragraph>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                      {previewDocument.extractedText}
                    </pre>
                  </Paragraph>
                </Card>
              </div>
            ) : (
              <Alert
                message="暂无提取内容"
                description="请点击文档列表中的'提取'按钮来提取文档内容"
                type="info"
                style={{ marginTop: 24 }}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentUploader;