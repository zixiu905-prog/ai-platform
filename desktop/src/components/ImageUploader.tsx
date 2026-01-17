import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Button, 
  Space, 
  Image, 
  Progress, 
  message, 
  Modal, 
  Typography, 
  Tooltip,
  Card,
  Tag
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  CameraOutlined,
  PictureOutlined,
  FileImageOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';
import './ImageUploader.css';

const { Text, Title } = Typography;

export interface ImageItem {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  uploadProgress?: number;
  status?: 'uploading' | 'done' | 'error';
  error?: string;
}

interface ImageUploaderProps {
  value?: ImageItem[];
  onChange?: (images: ImageItem[]) => void;
  maxCount?: number;
  maxSize?: number; // MB
  accept?: string;
  showUploadList?: boolean;
  listType?: 'text' | 'picture' | 'picture-card';
  disabled?: boolean;
  preview?: boolean;
  onPreview?: (image: ImageItem) => void;
  onRemove?: (image: ImageItem) => void;
  customUpload?: (file: File, onProgress: (progress: number) => void) => Promise<string>;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value = [],
  onChange,
  maxCount = 8,
  maxSize = 10,
  accept = 'image/*',
  showUploadList = true,
  listType = 'picture-card',
  disabled = false,
  preview = true,
  onPreview,
  onRemove,
  customUpload
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewRotation, setPreviewRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成唯一ID
  const generateId = useCallback(() => {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 获取图片尺寸
  const getImageDimensions = useCallback((file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // 验证文件
  const validateFile = useCallback((file: File): string | null => {
    // 检查类型
    if (!file.type.startsWith('image/')) {
      return '只能上传图片文件！';
    }

    // 检查大小
    if (file.size / 1024 / 1024 > maxSize) {
      return `图片大小不能超过${maxSize}MB！`;
    }

    // 检查数量
    if (value.length >= maxCount) {
      return `最多只能上传${maxCount}张图片！`;
    }

    return null;
  }, [maxSize, maxCount, value.length]);

  // 处理文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      message.error(error);
      return false;
    }

    const id = generateId();
    const url = URL.createObjectURL(file);
    const dimensions = await getImageDimensions(file);

    const imageItem: ImageItem = {
      id,
      file,
      url,
      name: file.name,
      size: file.size,
      type: file.type,
      width: dimensions.width,
      height: dimensions.height,
      status: 'uploading',
      uploadProgress: 0
    };

    const newImages = [...value, imageItem];
    onChange?.(newImages);

    try {
      if (customUpload) {
        const uploadedUrl = await customUpload(file, (progress) => {
          const updatedImages = newImages.map(img => 
            img.id === id ? { ...img, uploadProgress: progress } : img
          );
          onChange?.(updatedImages);
        });
        
        const finalImages = newImages.map(img => 
          img.id === id ? { 
            ...img, 
            url: uploadedUrl, 
            status: 'done' as const,
            uploadProgress: 100
          } : img
        );
        onChange?.(finalImages);
      } else {
        // 模拟上传进度
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          const updatedImages = newImages.map(img => 
            img.id === id ? { ...img, uploadProgress: progress } : img
          );
          onChange?.(updatedImages);
        }
        
        const finalImages = newImages.map(img => 
          img.id === id ? { ...img, status: 'done' as const } : img
        );
        onChange?.(finalImages);
      }
    } catch (error) {
      const errorImages = newImages.map(img => 
        img.id === id ? { 
          ...img, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : '上传失败'
        } : img
      );
      onChange?.(errorImages);
      message.error('图片上传失败');
    }

    return false; // 阻止默认上传行为
  }, [value, onChange, validateFile, generateId, getImageDimensions, customUpload]);

  // 处理文件选择
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      handleFileUpload(file);
    });
  }, [handleFileUpload]);

  // 拖拽上传处理
  const handleDrop: UploadProps['onDrop'] = useCallback((e) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // 点击上传
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 删除图片
  const handleRemove = useCallback((image: ImageItem) => {
    const newImages = value.filter(img => img.id !== image.id);
    onChange?.(newImages);
    onRemove?.(image);
    URL.revokeObjectURL(image.url);
  }, [value, onChange, onRemove]);

  // 预览图片
  const handlePreview = useCallback((image: ImageItem) => {
    setPreviewImage(image);
    setPreviewVisible(true);
    setPreviewScale(1);
    setPreviewRotation(0);
    onPreview?.(image);
  }, [onPreview]);

  // 预览操作
  const handleZoomIn = useCallback(() => {
    setPreviewScale(prev => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPreviewScale(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  const handleRotateLeft = useCallback(() => {
    setPreviewRotation(prev => prev - 90);
  }, []);

  const handleRotateRight = useCallback(() => {
    setPreviewRotation(prev => prev + 90);
  }, []);

  const handleReset = useCallback(() => {
    setPreviewScale(1);
    setPreviewRotation(0);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewVisible(false);
    setPreviewImage(null);
  }, []);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // 渲染上传按钮
  const renderUploadButton = () => {
    if (value.length >= maxCount) {
      return null;
    }

    return (
      <div className="upload-button" onClick={handleUploadClick}>
        <div className="upload-icon">
          <PictureOutlined />
        </div>
        <div className="upload-text">
          <div>上传图片</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            最大 {maxSize}MB
          </Text>
        </div>
      </div>
    );
  };

  // 渲染图片项
  const renderImageItem = (image: ImageItem) => {
    const isUploading = image.status === 'uploading';
    const isError = image.status === 'error';

    return (
      <div key={image.id} className={`image-item ${isError ? 'error' : ''}`}>
        <div className="image-container">
          <img
            src={image.url}
            alt={image.name}
            className="image-thumbnail"
            onClick={() => preview && handlePreview(image)}
          />
          
          {isUploading && (
            <div className="upload-overlay">
              <Progress
                type="circle"
                size={40}
                percent={image.uploadProgress}
                strokeColor={{
                  '0%': '#667eea',
                  '100%': '#764ba2',
                }}
              />
            </div>
          )}

          {isError && (
            <div className="error-overlay">
              <div className="error-icon">
                <ReloadOutlined />
              </div>
              <Text type="danger" style={{ fontSize: 12 }}>
                上传失败
              </Text>
            </div>
          )}
        </div>

        <div className="image-info">
          <Text ellipsis={{ tooltip: image.name }} style={{ fontSize: 12 }}>
            {image.name}
          </Text>
          <div className="image-meta">
            <Tag color="blue" style={{ fontSize: 10, margin: '2px' }}>
              {formatFileSize(image.size)}
            </Tag>
            {image.width && image.height && (
              <Tag style={{ fontSize: 10, margin: '2px' }}>
                {image.width}×{image.height}
              </Tag>
            )}
          </div>
        </div>

        <div className="image-actions">
          <Space size="small">
            {preview && !isUploading && (
              <Tooltip title="预览">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(image)}
                />
              </Tooltip>
            )}
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(image)}
                disabled={disabled}
              />
            </Tooltip>
          </Space>
        </div>
      </div>
    );
  };

  return (
    <div className="image-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={disabled}
      />

      {showUploadList && (
        <div className="upload-list">
          <div className="upload-grid">
            {value.map(renderImageItem)}
            {!disabled && renderUploadButton()}
          </div>
        </div>
      )}

      <Modal
        open={previewVisible}
        onCancel={handleClosePreview}
        footer={null}
        width="90vw"
        style={{ maxWidth: 1200 }}
        className="image-preview-modal"
      >
        {previewImage && (
          <div className="image-preview-content">
            <div className="preview-toolbar">
              <Space>
                <Tooltip title="放大">
                  <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} />
                </Tooltip>
                <Tooltip title="缩小">
                  <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
                </Tooltip>
                <Tooltip title="左旋转">
                  <Button icon={<RotateLeftOutlined />} onClick={handleRotateLeft} />
                </Tooltip>
                <Tooltip title="右旋转">
                  <Button icon={<RotateRightOutlined />} onClick={handleRotateRight} />
                </Tooltip>
                <Tooltip title="重置">
                  <Button icon={<ReloadOutlined />} onClick={handleReset} />
                </Tooltip>
                <Button onClick={handleClosePreview}>关闭</Button>
              </Space>
            </div>
            
            <div className="preview-image-container">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="preview-image"
                style={{
                  transform: `scale(${previewScale}) rotate(${previewRotation}deg)`,
                }}
              />
            </div>
            
            <div className="preview-info">
              <Card size="small">
                <Title level={5}>{previewImage.name}</Title>
                <Space direction="vertical" size="small">
                  <Text>大小: {formatFileSize(previewImage.size)}</Text>
                  <Text>格式: {previewImage.type}</Text>
                  {previewImage.width && previewImage.height && (
                    <Text>尺寸: {previewImage.width} × {previewImage.height}</Text>
                  )}
                  <Text type="secondary">
                    提示: 使用鼠标滚轮可以缩放图片
                  </Text>
                </Space>
              </Card>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ImageUploader;