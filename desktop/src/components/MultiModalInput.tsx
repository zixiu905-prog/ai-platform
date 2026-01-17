import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Upload, Button, Input, Space, Card, Typography, Tabs, Progress, message } from 'antd';
import { 
  TextOutlined, 
  PictureOutlined, 
  AudioOutlined, 
  FileTextOutlined,
  SendOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CameraOutlined,
  MicrophoneOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';
import { 
  useDebounce, 
  useThrottle, 
  usePerformanceMonitor, 
  useMemoryMonitor,
  useOptimizedInput 
} from './MultiModalInput.hooks';
import { performanceOptimizationService } from '../services/performanceOptimizationService';
import './MultiModalInput.css';
import './MultiModalInput.optimized.css';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

export interface MultiModalData {
  text?: string;
  images?: File[];
  audio?: File;
  documents?: File[];
  timestamp: number;
}

interface MultiModalInputProps {
  onSubmit: (data: MultiModalData) => Promise<void>;
  loading?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const MultiModalInput: React.FC<MultiModalInputProps> = ({
  onSubmit,
  loading = false,
  placeholder = '请输入您的设计需求或上传相关文件...',
  maxLength = 5000
}) => {
  // 性能监控
  usePerformanceMonitor('MultiModalInput');
  const memoryUsage = useMemoryMonitor();
  
  // 优化的输入状态
  const { input, processing, updateInput, submit, reset } = useOptimizedInput();
  
  const [imageFiles, setImageFiles] = useState<UploadFile[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [documentFiles, setDocumentFiles] = useState<UploadFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeTab, setActiveTab] = useState('text');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 初始化性能优化服务
  useEffect(() => {
    performanceOptimizationService.initialize({
      enableBatching: true,
      batchSize: 5,
      enableCaching: true,
      cacheSize: 50,
      enableLazyLoading: true,
      compressionLevel: 6
    });
  }, []);

  // 防抖的文本输入处理
  const debouncedTextChange = useDebounce((value: string) => {
    updateInput({ text: value });
  }, 300);
  
  // 优化的文本输入处理
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      debouncedTextChange(value);
    }
  }, [maxLength, debouncedTextChange]);

  // 图片上传处理
  const handleImageUpload: UploadProps['onChange'] = useCallback(({ fileList }) => {
    setImageFiles(fileList);
  }, []);

  const beforeImageUpload = useCallback((file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片大小不能超过10MB！');
      return false;
    }
    return true;
  }, []);

  // 音频录制功能
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `recording_${Date.now()}.wav`, { type: 'audio/wav' });
        setAudioFile(audioFile);
        setAudioURL(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // 开始计时
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('无法访问麦克风:', error);
      message.error('无法访问麦克风，请检查权限设置');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // 停止计时
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingTime(0);
    }
  }, [isRecording]);

  // 音频上传处理
  const handleAudioUpload: UploadProps['beforeUpload'] = useCallback((file) => {
    const isAudio = file.type.startsWith('audio/');
    if (!isAudio) {
      message.error('只能上传音频文件！');
      return false;
    }
    const isLt50M = file.size / 1024 / 1024 < 50;
    if (!isLt50M) {
      message.error('音频文件大小不能超过50MB！');
      return false;
    }
    setAudioFile(file);
    setAudioURL(URL.createObjectURL(file));
    return false; // 阻止自动上传
  }, []);

  // 文档上传处理
  const handleDocumentUpload: UploadProps['onChange'] = useCallback(({ fileList }) => {
    setDocumentFiles(fileList);
  }, []);

  const beforeDocumentUpload = useCallback((file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      message.error('不支持的文档格式！');
      return false;
    }
    
    const isLt20M = file.size / 1024 / 1024 < 20;
    if (!isLt20M) {
      message.error('文档大小不能超过20MB！');
      return false;
    }
    
    return true;
  }, []);

  // 优化的清除功能
  const clearImages = useCallback(() => {
    setImageFiles([]);
    updateInput({ images: undefined });
  }, [updateInput]);

  const clearAudio = useCallback(() => {
    setAudioFile(null);
    setAudioURL('');
    audioChunksRef.current = [];
    updateInput({ audio: undefined });
  }, [updateInput]);

  const clearDocuments = useCallback(() => {
    setDocumentFiles([]);
    updateInput({ documents: undefined });
  }, [updateInput]);

  const clearAll = useCallback(() => {
    reset();
    setImageFiles([]);
    setAudioFile(null);
    setAudioURL('');
    setDocumentFiles([]);
    audioChunksRef.current = [];
    clearImages();
    clearAudio();
    clearDocuments();
  }, [clearImages, clearAudio, clearDocuments]);

  // 提交处理
  const handleSubmit = useCallback(async () => {
    if (!text.trim() && imageFiles.length === 0 && !audioFile && documentFiles.length === 0) {
      message.warning('请至少提供一种输入内容');
      return;
    }

    const data: MultiModalData = {
      timestamp: Date.now()
    };

    if (text.trim()) {
      data.text = text;
    }

    if (imageFiles.length > 0) {
      data.images = imageFiles.map(file => file.originFileObj as File).filter(Boolean);
    }

    if (audioFile) {
      data.audio = audioFile;
    }

    if (documentFiles.length > 0) {
      data.documents = documentFiles.map(file => file.originFileObj as File).filter(Boolean);
    }

    try {
      await onSubmit(data);
      clearAll();
      message.success('提交成功！');
    } catch (error) {
      console.error('提交失败:', error);
      message.error('提交失败，请重试');
    }
  }, [text, imageFiles, audioFile, documentFiles, onSubmit, clearAll]);

  // 格式化录音时间
  const formatRecordingTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 节流的提交处理
  const throttledSubmit = useThrottle(async () => {
    const data: MultiModalData = {
      text: input.text,
      images: imageFiles.map(f => f.originFileObj!).filter(Boolean),
      audio: audioFile,
      documents: documentFiles.map(f => f.originFileObj!).filter(Boolean),
      timestamp: Date.now()
    };
    
    await performanceOptimizationService.measureAsync('submit', async () => {
      await onSubmit(data);
    });
  }, 1000);

  // 性能优化的渲染
  const renderPerformanceInfo = useMemo(() => {
    if (process.env.NODE_ENV === 'development' && memoryUsage) {
      return (
        <div className="performance-info" style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
          内存使用: {memoryUsage.used}MB / {memoryUsage.total}MB ({memoryUsage.percentage}%)
        </div>
      );
    }
    return null;
  }, [memoryUsage]);

  return (
    <Card className="multimodal-input-container" bordered={false}>
      <div className="input-header">
        <Title level={4}>多模态输入</Title>
        <Text type="secondary">支持文本、图片、音频、文档等多种输入方式</Text>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} className="optimized-tabs">
        <TabPane 
          tab={
            <span>
              <TextOutlined />
              文本输入
            </span>
          } 
          key="text"
        >
          <TextArea
            value={input.text || ''}
            onChange={handleTextChange}
            placeholder={placeholder}
            rows={6}
            maxLength={maxLength}
            className="optimized-input"
            showCount
            className="text-input"
          />
        </TabPane>

        <TabPane 
          tab={
            <span>
              <PictureOutlined />
              图片上传
            </span>
          } 
          key="images"
        >
          <Upload
            listType="picture-card"
            fileList={imageFiles}
            onChange={handleImageUpload}
            beforeUpload={beforeImageUpload}
            multiple
            accept="image/*"
            className="image-upload"
          >
            {imageFiles.length >= 8 ? null : (
              <div>
                <PictureOutlined />
                <div style={{ marginTop: 8 }}>上传图片</div>
              </div>
            )}
          </Upload>
          {imageFiles.length > 0 && (
            <Button 
              size="small" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={clearImages}
              style={{ marginTop: 8 }}
            >
              清除所有图片
            </Button>
          )}
        </TabPane>

        <TabPane 
          tab={
            <span>
              <AudioOutlined />
              音频输入
            </span>
          } 
          key="audio"
        >
          <div className="audio-input">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Button
                  type={isRecording ? 'danger' : 'primary'}
                  icon={isRecording ? <PauseCircleOutlined /> : <MicrophoneOutlined />}
                  onClick={isRecording ? stopRecording : startRecording}
                  loading={isRecording}
                >
                  {isRecording ? `停止录音 (${formatRecordingTime(recordingTime)})` : '开始录音'}
                </Button>
                
                <Upload
                  beforeUpload={handleAudioUpload}
                  accept="audio/*"
                  showUploadList={false}
                >
                  <Button icon={<Upload />}>上传音频</Button>
                </Upload>
              </Space>

              {audioURL && (
                <div className="audio-preview">
                  <audio controls src={audioURL} style={{ width: '100%' }} />
                  <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={clearAudio}
                    style={{ marginTop: 8 }}
                  >
                    删除音频
                  </Button>
                </div>
              )}

              {isRecording && (
                <div className="recording-indicator">
                  <span className="recording-dot"></span>
                  <Text type="danger">正在录音中...</Text>
                </div>
              )}
            </Space>
          </div>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <FileTextOutlined />
              文档上传
            </span>
          } 
          key="documents"
        >
          <Upload
            fileList={documentFiles}
            onChange={handleDocumentUpload}
            beforeUpload={beforeDocumentUpload}
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            className="document-upload"
          >
            <Button icon={<Upload />}>上传文档</Button>
          </Upload>
          {documentFiles.length > 0 && (
            <Button 
              size="small" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={clearDocuments}
              style={{ marginTop: 8 }}
            >
              清除所有文档
            </Button>
          )}
        </TabPane>
      </Tabs>

      <div className="input-actions">
        <Space>
          <Button onClick={clearAll} disabled={loading || processing} className="optimized-button">
            清空全部
          </Button>
          <Button 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={throttledSubmit}
            loading={loading || processing}
            className="optimized-button"
          >
            提交
          </Button>
        </Space>
      </div>
      
      {renderPerformanceInfo}
    </Card>
  );
};

export default MultiModalInput;