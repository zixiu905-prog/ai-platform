import React, { useState, useCallback } from 'react';
import { 
  Card, 
  Steps, 
  Button, 
  Space, 
  Typography, 
  Alert, 
  Spin, 
  Progress,
  Row,
  Col,
  Statistic,
  Tag,
  message,
  Modal,
  List,
  Descriptions
} from 'antd';
import {
  SendOutlined,
  ClearOutlined,
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import MultiModalInput, { MultiModalData } from './MultiModalInput';
import TextEditor from './TextEditor';
import ImageUploader, { ImageItem } from './ImageUploader';
import AudioRecorder, { AudioItem } from './AudioRecorder';
import DocumentUploader, { DocumentItem } from './DocumentUploader';
import { multiModalInputService, ProcessedInput } from '../services/multiModalInputService';
import './MultiModalInterface.css';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface MultiModalInterfaceProps {
  onSubmit?: (processedData: ProcessedInput) => Promise<void>;
  enableImageAnalysis?: boolean;
  enableAudioTranscription?: boolean;
  enableDocumentExtraction?: boolean;
  showPreview?: boolean;
  debug?: boolean;
}

const MultiModalInterface: React.FC<MultiModalInterfaceProps> = ({
  onSubmit,
  enableImageAnalysis = true,
  enableAudioTranscription = true,
  enableDocumentExtraction = true,
  showPreview = true,
  debug = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [inputData, setInputData] = useState<MultiModalData>({
    timestamp: Date.now()
  });
  const [processedData, setProcessedData] = useState<ProcessedInput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingHistory, setProcessingHistory] = useState<ProcessedInput[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('unified');

  // 处理多模态输入提交
  const handleInputSubmit = useCallback(async (data: MultiModalData) => {
    setIsProcessing(true);
    setInputData(data);
    setCurrentStep(1);

    try {
      const processed = await multiModalInputService.processInput(data, {
        enableImageAnalysis,
        enableAudioTranscription,
        enableDocumentExtraction
      });
      
      setProcessedData(processed);
      setProcessingHistory(prev => [processed, ...prev].slice(0, 10)); // 保留最近10条
      setCurrentStep(2);
      
      if (onSubmit) {
        await onSubmit(processed);
      }
      
      message.success('多模态输入处理完成！');
      
    } catch (error) {
      console.error('处理失败:', error);
      message.error('处理失败，请重试');
      setCurrentStep(0);
    } finally {
      setIsProcessing(false);
    }
  }, [enableImageAnalysis, enableAudioTranscription, enableDocumentExtraction, onSubmit]);

  // 清空输入
  const handleClear = useCallback(() => {
    setInputData({ timestamp: Date.now() });
    setProcessedData(null);
    setCurrentStep(0);
  }, []);

  // 重新处理
  const handleReprocess = useCallback(async () => {
    if (!inputData.text && !inputData.images?.length && !inputData.audio && !inputData.documents?.length) {
      message.warning('请先输入内容');
      return;
    }
    await handleInputSubmit(inputData);
  }, [inputData, handleInputSubmit]);

  // 删除历史记录
  const handleDeleteHistory = useCallback((id: string) => {
    setProcessingHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  // 查看处理详情
  const handleViewDetails = useCallback((processed: ProcessedInput) => {
    setProcessedData(processed);
    setPreviewVisible(true);
  }, []);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // 获取状态图标
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'processing':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#999' }} />;
    }
  }, []);

  // 获取状态颜色
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'processing':
        return 'processing';
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  }, []);

  // 渲染统一输入界面
  const renderUnifiedInput = () => (
    <MultiModalInput
      onSubmit={handleInputSubmit}
      loading={isProcessing}
      placeholder="请输入您的设计需求，可以包含文字、图片、音频、文档等..."
    />
  );

  // 渲染分离输入界面
  const renderSeparatedInput = () => (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card title="文本输入" bordered={false}>
          <TextEditor
            value={inputData.text || ''}
            onChange={(text) => setInputData(prev => ({ ...prev, text }))}
            placeholder="请输入文本内容..."
            maxLength={5000}
            autoSize={{ minRows: 4, maxRows: 8 }}
          />
        </Card>
      </Col>
      
      <Col span={24}>
        <Card title="图片上传" bordered={false}>
          <ImageUploader
            value={inputData.images?.map(img => ({
              id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              file: img,
              url: URL.createObjectURL(img),
              name: img.name,
              size: img.size,
              type: img.type
            }))}
            onChange={(images) => {
              setInputData(prev => ({
                ...prev,
                images: images.map(img => img.file)
              }));
            }}
            maxCount={8}
            maxSize={10}
            preview={true}
          />
        </Card>
      </Col>
      
      <Col span={24}>
        <Card title="音频录制" bordered={false}>
          <AudioRecorder
            value={inputData.audio ? [{
              id: `audio_${Date.now()}`,
              file: inputData.audio,
              url: URL.createObjectURL(inputData.audio),
              name: inputData.audio.name,
              size: inputData.audio.size,
              format: inputData.audio.type.split('/')[1] || 'unknown',
              timestamp: Date.now()
            }] : []}
            onChange={(audios) => {
              setInputData(prev => ({
                ...prev,
                audio: audios.length > 0 ? audios[0].file : undefined
              }));
            }}
            allowUpload={true}
          />
        </Card>
      </Col>
      
      <Col span={24}>
        <Card title="文档上传" bordered={false}>
          <DocumentUploader
            value={inputData.documents?.map(doc => ({
              id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              file: doc,
              url: URL.createObjectURL(doc),
              name: doc.name,
              size: doc.size,
              type: doc.type,
              format: doc.type.split('/')[1] || 'unknown',
              timestamp: Date.now()
            }))}
            onChange={(documents) => {
              setInputData(prev => ({
                ...prev,
                documents: documents.map(doc => doc.file)
              }));
            }}
            maxCount={5}
            maxSize={20}
            enablePreview={true}
            enableExtraction={enableDocumentExtraction}
          />
        </Card>
      </Col>
      
      <Col span={24}>
        <div className="input-actions">
          <Space size="large">
            <Button 
              size="large" 
              onClick={handleClear}
              disabled={isProcessing}
            >
              清空内容
            </Button>
            <Button 
              type="primary" 
              size="large"
              icon={<SendOutlined />}
              onClick={() => handleInputSubmit(inputData)}
              loading={isProcessing}
            >
              提交处理
            </Button>
          </Space>
        </div>
      </Col>
    </Row>
  );

  // 渲染处理结果
  const renderProcessingResult = () => {
    if (!processedData) return null;

    return (
      <Card title="处理结果" bordered={false}>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Statistic
              title="输入类型"
              value={processedData.type}
              valueStyle={{ color: '#1890ff', fontSize: '18px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总大小"
              value={formatFileSize(processedData.metadata.totalSize)}
              valueStyle={{ color: '#52c41a', fontSize: '18px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="处理时间"
              value={`${processedData.metadata.processingTime}ms`}
              valueStyle={{ color: '#faad14', fontSize: '18px' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="预估Tokens"
              value={processedData.metadata.tokens}
              valueStyle={{ color: '#722ed1', fontSize: '18px' }}
            />
          </Col>
        </Row>

        <Descriptions title="内容统计" bordered size="small" style={{ marginTop: 24 }}>
          <Descriptions.Item label="文本">
            <Tag color="blue">{processedData.metadata.itemCount.text} 项</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="图片">
            <Tag color="green">{processedData.metadata.itemCount.images} 项</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="音频">
            <Tag color="orange">{processedData.metadata.itemCount.audio} 项</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="文档">
            <Tag color="purple">{processedData.metadata.itemCount.documents} 项</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="语言">
            <Tag>{processedData.metadata.language}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="置信度">
            <Progress
              percent={Math.round((processedData.metadata.confidence || 0) * 100)}
              size="small"
              style={{ width: 100 }}
            />
          </Descriptions.Item>
        </Descriptions>

        {processedData.error && (
          <Alert
            message="处理错误"
            description={processedData.error}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {debug && (
          <Card title="调试信息" size="small" style={{ marginTop: 16 }}>
            <pre style={{ fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
              {JSON.stringify(processedData, null, 2)}
            </pre>
          </Card>
        )}
      </Card>
    );
  };

  return (
    <div className="multimodal-interface">
      <Card bordered={false}>
        <div className="interface-header">
          <Title level={3}>多模态输入界面</Title>
          <Text type="secondary">支持文本、图片、音频、文档等多种输入方式</Text>
        </div>

        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title="输入内容" icon={<UploadOutlined />} />
          <Step title="处理中" icon={<LoadingOutlined spin={isProcessing} />} />
          <Step title="完成" icon={<CheckCircleOutlined />} />
        </Steps>

        {currentStep === 0 && (
          <div className="input-section">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div className="tab-selector">
                <Space>
                  <Button
                    type={activeTab === 'unified' ? 'primary' : 'default'}
                    onClick={() => setActiveTab('unified')}
                  >
                    统一输入
                  </Button>
                  <Button
                    type={activeTab === 'separated' ? 'primary' : 'default'}
                    onClick={() => setActiveTab('separated')}
                  >
                    分类输入
                  </Button>
                </Space>
              </div>

              {activeTab === 'unified' ? renderUnifiedInput() : renderSeparatedInput()}
            </Space>
          </div>
        )}

        {currentStep === 1 && (
          <div className="processing-section">
            <div className="processing-content">
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Title level={4}>正在处理您的输入...</Title>
                <Paragraph type="secondary">
                  这可能需要几秒钟时间，请耐心等待
                </Paragraph>
                {enableImageAnalysis && <Text>• 正在分析图片内容...</Text>}
                {enableAudioTranscription && <Text>• 正在转录音频...</Text>}
                {enableDocumentExtraction && <Text>• 正在提取文档内容...</Text>}
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="result-section">
            {renderProcessingResult()}
            
            <div className="result-actions">
              <Space size="large">
                <Button 
                  icon={<ClearOutlined />}
                  onClick={handleClear}
                >
                  清空重新输入
                </Button>
                <Button 
                  icon={<UploadOutlined />}
                  onClick={handleReprocess}
                >
                  重新处理
                </Button>
                {showPreview && (
                  <Button 
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => setPreviewVisible(true)}
                  >
                    查看详情
                  </Button>
                )}
              </Space>
            </div>
          </div>
        )}

        {/* 处理历史 */}
        {processingHistory.length > 0 && (
          <Card title="处理历史" bordered={false} style={{ marginTop: 24 }}>
            <List
              dataSource={processingHistory}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewDetails(item)}
                    >
                      查看
                    </Button>,
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteHistory(item.id)}
                    >
                      删除
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={getStatusIcon(item.status)}
                    title={
                      <Space>
                        <span>{item.type} 输入</span>
                        <Tag color={getStatusColor(item.status)}>
                          {item.status === 'processing' && '处理中'}
                          {item.status === 'completed' && '已完成'}
                          {item.status === 'error' && '失败'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <Text type="secondary">
                          {new Date(item.timestamp).toLocaleString()}
                        </Text>
                        <Text type="secondary">
                          {formatFileSize(item.metadata.totalSize)} · 
                          {item.metadata.tokens} tokens · 
                          {item.metadata.processingTime}ms
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* 详情预览模态框 */}
        <Modal
          title="处理详情"
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          footer={[
            <Button key="close" onClick={() => setPreviewVisible(false)}>
              关闭
            </Button>
          ]}
          width="90vw"
          style={{ maxWidth: 1200 }}
        >
          {processedData && (
            <div className="detail-preview">
              <Descriptions title="基本信息" bordered size="small" column={2}>
                <Descriptions.Item label="ID">{processedData.id}</Descriptions.Item>
                <Descriptions.Item label="类型">{processedData.type}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={getStatusColor(processedData.status)}>
                    {processedData.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="时间戳">
                  {new Date(processedData.timestamp).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="总大小">
                  {formatFileSize(processedData.metadata.totalSize)}
                </Descriptions.Item>
                <Descriptions.Item label="处理时间">
                  {processedData.metadata.processingTime}ms
                </Descriptions.Item>
                <Descriptions.Item label="预估Tokens">
                  {processedData.metadata.tokens}
                </Descriptions.Item>
                <Descriptions.Item label="语言">
                  {processedData.metadata.language}
                </Descriptions.Item>
                <Descriptions.Item label="置信度" span={2}>
                  <Progress
                    percent={Math.round((processedData.metadata.confidence || 0) * 100)}
                    status={processedData.status === 'error' ? 'exception' : 'normal'}
                  />
                </Descriptions.Item>
              </Descriptions>

              {processedData.error && (
                <Alert
                  message="处理错误"
                  description={processedData.error}
                  type="error"
                  showIcon
                  style={{ margin: '16px 0' }}
                />
              )}

              {debug && (
                <Card title="完整数据" size="small" style={{ marginTop: 16 }}>
                  <pre style={{ fontSize: 11, maxHeight: 300, overflow: 'auto' }}>
                    {JSON.stringify(processedData, null, 2)}
                  </pre>
                </Card>
              )}
            </div>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default MultiModalInterface;