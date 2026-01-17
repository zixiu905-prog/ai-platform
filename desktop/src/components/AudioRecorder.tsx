import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Button, 
  Space, 
  Progress, 
  Typography, 
  Card, 
  Tooltip, 
  message,
  Slider,
  Row,
  Col,
  Tag,
  Modal,
  Select
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  MicrophoneOutlined,
  StopOutlined,
  ReloadOutlined,
  UploadOutlined,
  SoundOutlined,
  SettingOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import type { SelectProps } from 'antd';
import './AudioRecorder.css';

const { Text, Title } = Typography;
const { Option } = Select;

export interface AudioItem {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  duration?: number;
  format: string;
  sampleRate?: number;
  channels?: number;
  timestamp: number;
}

interface AudioRecorderProps {
  value?: AudioItem[];
  onChange?: (audios: AudioItem[]) => void;
  maxDuration?: number; // 最大录制时长（秒）
  maxFileSize?: number; // 最大文件大小（MB）
  sampleRate?: number; // 采样率
  channels?: 1 | 2; // 声道数
  format?: 'wav' | 'mp3' | 'webm';
  showWaveform?: boolean;
  allowUpload?: boolean;
  disabled?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (audio: AudioItem) => void;
  onAudioPlay?: (audio: AudioItem) => void;
  onAudioPause?: (audio: AudioItem) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  value = [],
  onChange,
  maxDuration = 300, // 5分钟
  maxFileSize = 50,
  sampleRate = 44100,
  channels = 1,
  format = 'wav',
  showWaveform = true,
  allowUpload = true,
  disabled = false,
  onRecordingStart,
  onRecordingStop,
  onAudioPlay,
  onAudioPause
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState<{ [key: string]: number }>({});
  const [duration, setDuration] = useState<{ [key: string]: number }>({});
  const [volume, setVolume] = useState(0.8);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tempSettings, setTempSettings] = useState({
    sampleRate,
    channels,
    format,
    maxDuration
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const levelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化音频上下文
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
  }, []);

  // 获取录音音量级别
  const getRecordingLevel = useCallback(() => {
    if (!analyserRef.current) return 0;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return Math.min(100, (average / 128) * 100);
  }, []);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      initAudioContext();
      
      const constraints = {
        audio: {
          sampleRate: tempSettings.sampleRate,
          channelCount: tempSettings.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // 连接分析器
      const source = audioContextRef.current!.createMediaStreamSource(stream);
      source.connect(analyserRef.current!);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: getMimeType(tempSettings.format)
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: getMimeType(tempSettings.format) });
        const audioFile = new File(
          [audioBlob], 
          `recording_${Date.now()}.${tempSettings.format}`,
          { type: getMimeType(tempSettings.format) }
        );
        
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // 获取音频时长
        const tempAudio = new Audio(audioUrl);
        tempAudio.addEventListener('loadedmetadata', () => {
          const audioItem: AudioItem = {
            id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            file: audioFile,
            url: audioUrl,
            name: audioFile.name,
            size: audioFile.size,
            duration: tempAudio.duration,
            format: tempSettings.format,
            sampleRate: tempSettings.sampleRate,
            channels: tempSettings.channels,
            timestamp: Date.now()
          };
          
          const newAudios = [...value, audioItem];
          onChange?.(newAudios);
          onRecordingStop?.(audioItem);
        });
        
        // 清理流
        stream.getTracks().forEach(track => track.stop());
        source.disconnect();
      };

      mediaRecorder.start(100); // 每100ms收集一次数据
      setIsRecording(true);
      setIsPaused(false);
      
      // 开始计时
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= tempSettings.maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

      // 监听音量
      levelIntervalRef.current = setInterval(() => {
        setRecordingLevel(getRecordingLevel());
      }, 100);

      onRecordingStart?.();
      
    } catch (error) {
      console.error('无法访问麦克风:', error);
      message.error('无法访问麦克风，请检查权限设置');
    }
  }, [value, onChange, tempSettings, getRecordingLevel, onRecordingStart, onRecordingStop]);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      setRecordingLevel(0);
      
      // 清理定时器
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      if (levelIntervalRef.current) {
        clearInterval(levelIntervalRef.current);
        levelIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  // 暂停录音
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      if (levelIntervalRef.current) {
        clearInterval(levelIntervalRef.current);
        setRecordingLevel(0);
      }
    }
  }, [isRecording, isPaused]);

  // 恢复录音
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= tempSettings.maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

      levelIntervalRef.current = setInterval(() => {
        setRecordingLevel(getRecordingLevel());
      }, 100);
    }
  }, [isRecording, isPaused, tempSettings.maxDuration, stopRecording, getRecordingLevel]);

  // 播放音频
  const playAudio = useCallback((audioId: string) => {
    const audio = value.find(a => a.id === audioId);
    if (!audio) return;

    const audioElement = audioElementsRef.current[audioId] || new Audio(audio.url);
    audioElementsRef.current[audioId] = audioElement;
    
    audioElement.volume = volume;
    
    audioElement.addEventListener('ended', () => {
      setIsPlaying(null);
      setPlaybackTime(prev => ({ ...prev, [audioId]: 0 }));
      onAudioPause?.(audio);
    });

    audioElement.addEventListener('timeupdate', () => {
      setPlaybackTime(prev => ({ 
        ...prev, 
        [audioId]: audioElement.currentTime 
      }));
    });

    audioElement.addEventListener('loadedmetadata', () => {
      setDuration(prev => ({ 
        ...prev, 
        [audioId]: audioElement.duration 
      }));
    });

    audioElement.play();
    setIsPlaying(audioId);
    onAudioPlay?.(audio);
  }, [value, volume, onAudioPlay, onAudioPause]);

  // 暂停音频
  const pauseAudio = useCallback((audioId: string) => {
    const audioElement = audioElementsRef.current[audioId];
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(null);
      
      const audio = value.find(a => a.id === audioId);
      if (audio) {
        onAudioPause?.(audio);
      }
    }
  }, [value, onAudioPause]);

  // 删除音频
  const deleteAudio = useCallback((audioId: string) => {
    const newAudios = value.filter(audio => audio.id !== audioId);
    onChange?.(newAudios);
    
    // 清理音频元素
    const audioElement = audioElementsRef.current[audioId];
    if (audioElement) {
      audioElement.pause();
      delete audioElementsRef.current[audioId];
    }
    
    setPlaybackTime(prev => {
      const newState = { ...prev };
      delete newState[audioId];
      return newState;
    });
    
    setDuration(prev => {
      const newState = { ...prev };
      delete newState[audioId];
      return newState;
    });
  }, [value, onChange]);

  // 下载音频
  const downloadAudio = useCallback((audio: AudioItem) => {
    const a = document.createElement('a');
    a.href = audio.url;
    a.download = audio.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // 上传音频文件
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('audio/')) {
        message.error('只能上传音频文件！');
        return;
      }

      if (file.size / 1024 / 1024 > maxFileSize) {
        message.error(`音频文件大小不能超过${maxFileSize}MB！`);
        return;
      }

      const audioUrl = URL.createObjectURL(file);
      
      // 获取音频时长
      const tempAudio = new Audio(audioUrl);
      tempAudio.addEventListener('loadedmetadata', () => {
        const audioItem: AudioItem = {
          id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          file,
          url: audioUrl,
          name: file.name,
          size: file.size,
          duration: tempAudio.duration,
          format: file.type.split('/')[1] || 'unknown',
          timestamp: Date.now()
        };
        
        const newAudios = [...value, audioItem];
        onChange?.(newAudios);
      });
    });
  }, [value, onChange, maxFileSize]);

  // 设置变化
  const handleSettingsChange = useCallback(() => {
    setSettingsVisible(false);
    setTempSettings({
      sampleRate,
      channels,
      format,
      maxDuration
    });
  }, [sampleRate, channels, format, maxDuration]);

  // 应用设置
  const applySettings = useCallback(() => {
    // sampleRate, channels, format, maxDuration 只在下次录音时生效
    setSettingsVisible(false);
    message.success('设置已更新');
  }, [tempSettings]);

  // 格式化时间
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // 获取MIME类型
  const getMimeType = useCallback((format: string) => {
    const mimeTypes: { [key: string]: string } = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'webm': 'audio/webm'
    };
    return mimeTypes[format] || 'audio/wav';
  }, []);

  // 清理资源
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (levelIntervalRef.current) {
        clearInterval(levelIntervalRef.current);
      }
      Object.values(audioElementsRef.current).forEach(audio => {
        audio.pause();
      });
    };
  }, []);

  return (
    <div className="audio-recorder">
      {/* 录音控制区 */}
      <Card className="recording-controls" bordered={false}>
        <div className="controls-header">
          <Title level={4}>音频录制</Title>
          <Space>
            <Tooltip title="录音设置">
              <Button 
                icon={<SettingOutlined />} 
                onClick={() => setSettingsVisible(true)}
                disabled={disabled || isRecording}
              />
            </Tooltip>
          </Space>
        </div>

        <div className="recording-interface">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 录音控制按钮 */}
            <div className="control-buttons">
              <Space size="middle">
                {!isRecording ? (
                  <Button
                    type="primary"
                    size="large"
                    icon={<MicrophoneOutlined />}
                    onClick={startRecording}
                    disabled={disabled}
                    className="record-button"
                  >
                    开始录音
                  </Button>
                ) : (
                  <>
                    {!isPaused ? (
                      <Button
                        danger
                        size="large"
                        icon={<PauseCircleOutlined />}
                        onClick={pauseRecording}
                        className="pause-button"
                      >
                        暂停
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        size="large"
                        icon={<PlayCircleOutlined />}
                        onClick={resumeRecording}
                        className="resume-button"
                      >
                        继续
                      </Button>
                    )}
                    <Button
                      danger
                      size="large"
                      icon={<StopOutlined />}
                      onClick={stopRecording}
                      className="stop-button"
                    >
                      停止
                    </Button>
                  </>
                )}
              </Space>
            </div>

            {/* 录音状态 */}
            {(isRecording || recordingTime > 0) && (
              <div className="recording-status">
                <Row gutter={[16, 16]} align="middle">
                  <Col span={6}>
                    <Text strong>状态:</Text>
                    <Tag color={isRecording ? 'processing' : 'default'} style={{ marginLeft: 8 }}>
                      {isRecording ? (isPaused ? '已暂停' : '录音中') : '已停止'}
                    </Tag>
                  </Col>
                  <Col span={6}>
                    <Text strong>时长:</Text>
                    <Text style={{ marginLeft: 8 }}>
                      {formatTime(recordingTime)} / {formatTime(tempSettings.maxDuration)}
                    </Text>
                  </Col>
                  <Col span={6}>
                    <Text strong>音量:</Text>
                    <Progress
                      percent={recordingLevel}
                      showInfo={false}
                      strokeColor={recordingLevel > 80 ? '#ff4d4f' : '#52c41a'}
                      style={{ width: 100, marginLeft: 8, display: 'inline-block' }}
                    />
                    <Text style={{ marginLeft: 8 }}>{Math.round(recordingLevel)}%</Text>
                  </Col>
                </Row>
              </div>
            )}

            {/* 录音进度条 */}
            {isRecording && (
              <div className="recording-progress">
                <Progress
                  percent={(recordingTime / tempSettings.maxDuration) * 100}
                  strokeColor={{
                    '0%': '#667eea',
                    '100%': '#764ba2',
                  }}
                  trailColor="#f0f0f0"
                />
              </div>
            )}

            {/* 上传按钮 */}
            {allowUpload && !isRecording && (
              <div className="upload-section">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e.target.files)}
                  disabled={disabled}
                />
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                >
                  上传音频文件
                </Button>
              </div>
            )}
          </Space>
        </div>
      </Card>

      {/* 音频列表 */}
      {value.length > 0 && (
        <Card className="audio-list" bordered={false} title="音频文件">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {value.map(audio => (
              <div key={audio.id} className="audio-item">
                <Row gutter={[16, 8]} align="middle">
                  <Col span={2}>
                    <SoundOutlined style={{ fontSize: 24, color: '#667eea' }} />
                  </Col>
                  <Col span={6}>
                    <Text strong ellipsis={{ tooltip: audio.name }}>
                      {audio.name}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatFileSize(audio.size)} · {audio.format.toUpperCase()}
                    </Text>
                  </Col>
                  <Col span={8}>
                    <Space.Compact style={{ width: '100%' }}>
                      <Button
                        icon={isPlaying === audio.id ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                        onClick={() => isPlaying === audio.id ? pauseAudio(audio.id) : playAudio(audio.id)}
                      >
                        {isPlaying === audio.id ? '暂停' : '播放'}
                      </Button>
                      <Button
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => deleteAudio(audio.id)}
                        disabled={disabled}
                      >
                        删除
                      </Button>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={() => downloadAudio(audio)}
                      >
                        下载
                      </Button>
                    </Space.Compact>
                  </Col>
                  <Col span={8}>
                    <div className="playback-progress">
                      <Slider
                        min={0}
                        max={duration[audio.id] || 100}
                        value={playbackTime[audio.id] || 0}
                        tipFormatter={value => formatTime(value || 0)}
                        onChange={(value) => {
                          const audioElement = audioElementsRef.current[audio.id];
                          if (audioElement) {
                            audioElement.currentTime = value;
                            setPlaybackTime(prev => ({ ...prev, [audio.id]: value }));
                          }
                        }}
                        disabled={!duration[audio.id]}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatTime(playbackTime[audio.id] || 0)} / {formatTime(duration[audio.id] || 0)}
                      </Text>
                    </div>
                  </Col>
                </Row>
              </div>
            ))}
          </Space>
        </Card>
      )}

      {/* 设置模态框 */}
      <Modal
        title="录音设置"
        open={settingsVisible}
        onCancel={handleSettingsChange}
        onOk={applySettings}
        okText="应用"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>采样率:</Text>
            <Select
              value={tempSettings.sampleRate}
              onChange={(value) => setTempSettings(prev => ({ ...prev, sampleRate: value }))}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Option value={8000}>8 kHz</Option>
              <Option value={16000}>16 kHz</Option>
              <Option value={22050}>22.05 kHz</Option>
              <Option value={44100}>44.1 kHz</Option>
              <Option value={48000}>48 kHz</Option>
            </Select>
          </div>
          
          <div>
            <Text strong>声道数:</Text>
            <Select
              value={tempSettings.channels}
              onChange={(value) => setTempSettings(prev => ({ ...prev, channels: value }))}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Option value={1}>单声道</Option>
              <Option value={2}>立体声</Option>
            </Select>
          </div>
          
          <div>
            <Text strong>音频格式:</Text>
            <Select
              value={tempSettings.format}
              onChange={(value) => setTempSettings(prev => ({ ...prev, format: value }))}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Option value="wav">WAV</Option>
              <Option value="mp3">MP3</Option>
              <Option value="webm">WebM</Option>
            </Select>
          </div>
          
          <div>
            <Text strong>最大录音时长:</Text>
            <Select
              value={tempSettings.maxDuration}
              onChange={(value) => setTempSettings(prev => ({ ...prev, maxDuration: value }))}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Option value={60}>1分钟</Option>
              <Option value={180}>3分钟</Option>
              <Option value={300}>5分钟</Option>
              <Option value={600}>10分钟</Option>
              <Option value={1800}>30分钟</Option>
            </Select>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default AudioRecorder;