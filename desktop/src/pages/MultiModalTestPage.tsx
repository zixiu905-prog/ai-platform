import React, { useState } from 'react';
import { Card, Typography, Switch, Space, message, Alert } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import MultiModalInterface from '../components/MultiModalInterface';
import { ProcessedInput } from '../services/multiModalInputService';
import './MultiModalTestPage.css';

const { Title, Paragraph } = Typography;

const MultiModalTestPage: React.FC = () => {
  const [settings, setSettings] = useState({
    enableImageAnalysis: true,
    enableAudioTranscription: true,
    enableDocumentExtraction: true,
    showPreview: true,
    debug: false
  });

  const [processedData, setProcessedData] = useState<ProcessedInput | null>(null);

  // 处理提交
  const handleSubmit = async (processedData: ProcessedInput) => {
    console.log('处理完成的数据:', processedData);
    setProcessedData(processedData);
    
    // 模拟提交到后端
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('数据已成功提交到处理服务！');
    } catch (error) {
      message.error('提交失败，请重试');
      throw error;
    }
  };

  // 设置变化处理
  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="multimodal-test-page">
      <div className="page-header">
        <Title level={2}>多模态输入测试页面</Title>
        <Paragraph type="secondary">
          这是多模态输入界面的测试环境，您可以在这里测试所有输入功能和处理流程。
        </Paragraph>
      </div>

      <Card title="设置选项" bordered={false} className="settings-card">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div className="setting-item">
            <Space>
              <span>启用图片分析</span>
              <Switch
                checked={settings.enableImageAnalysis}
                onChange={(checked) => handleSettingChange('enableImageAnalysis', checked)}
              />
            </Space>
          </div>
          <div className="setting-item">
            <Space>
              <span>启用音频转录</span>
              <Switch
                checked={settings.enableAudioTranscription}
                onChange={(checked) => handleSettingChange('enableAudioTranscription', checked)}
              />
            </Space>
          </div>
          <div className="setting-item">
            <Space>
              <span>启用文档提取</span>
              <Switch
                checked={settings.enableDocumentExtraction}
                onChange={(checked) => handleSettingChange('enableDocumentExtraction', checked)}
              />
            </Space>
          </div>
          <div className="setting-item">
            <Space>
              <span>显示预览</span>
              <Switch
                checked={settings.showPreview}
                onChange={(checked) => handleSettingChange('showPreview', checked)}
              />
            </Space>
          </div>
          <div className="setting-item">
            <Space>
              <span>调试模式</span>
              <Switch
                checked={settings.debug}
                onChange={(checked) => handleSettingChange('debug', checked)}
              />
            </Space>
          </div>
        </Space>
      </Card>

      <Alert
        message="测试提示"
        description="您可以尝试输入文本、上传图片、录制音频或上传文档来测试多模态输入功能。所有处理都在本地进行，不会实际调用外部API。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <MultiModalInterface
        onSubmit={handleSubmit}
        enableImageAnalysis={settings.enableImageAnalysis}
        enableAudioTranscription={settings.enableAudioTranscription}
        enableDocumentExtraction={settings.enableDocumentExtraction}
        showPreview={settings.showPreview}
        debug={settings.debug}
      />

      {processedData && (
        <Card title="最新处理结果" bordered={false} style={{ marginTop: 24 }}>
          <div className="result-summary">
            <h4>处理摘要</h4>
            <ul>
              <li>输入类型: {processedData.type}</li>
              <li>总大小: {(processedData.metadata.totalSize / 1024 / 1024).toFixed(2)} MB</li>
              <li>处理时间: {processedData.metadata.processingTime} ms</li>
              <li>预估Tokens: {processedData.metadata.tokens}</li>
              <li>语言: {processedData.metadata.language}</li>
              <li>置信度: {Math.round((processedData.metadata.confidence || 0) * 100)}%</li>
            </ul>
            
            {settings.debug && (
              <details>
                <summary>详细数据 (调试模式)</summary>
                <pre style={{ 
                  fontSize: 12, 
                  maxHeight: 300, 
                  overflow: 'auto',
                  background: '#f8fafc',
                  padding: 16,
                  borderRadius: 8,
                  marginTop: 8
                }}>
                  {JSON.stringify(processedData, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default MultiModalTestPage;