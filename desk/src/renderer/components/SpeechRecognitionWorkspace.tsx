import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Settings, 
  Command, 
  History, 
  Play, 
  Pause,
  Trash2,
  Edit,
  Plus,
  Save,
  Upload,
  Download,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface SpeechCommand {
  id: string;
  name: string;
  keywords: string[];
  action: string;
  parameters?: Record<string, any>;
  category: 'photoshop' | 'autocad' | 'blender' | 'general';
  enabled: boolean;
  aliases: string[];
}

interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  duration: number;
  language: string;
  words: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  segments: Array<{
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
    speaker?: number;
  }>;
}

interface SpeechConfig {
  language: string;
  format: string;
  sampleRate: number;
  channels: number;
  enablePunctuation: boolean;
  enableTimestamps: boolean;
  enableWordConfidence: boolean;
  maxRecordingTime: number;
  silenceTimeout: number;
}

export const SpeechRecognitionWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState('recognize');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [recognitionHistory, setRecognitionHistory] = useState<Array<{
    id: string;
    result: SpeechRecognitionResult;
    timestamp: Date;
    command?: SpeechCommand;
  }>>([]);
  const [commands, setCommands] = useState<SpeechCommand[]>([]);
  const [editingCommand, setEditingCommand] = useState<SpeechCommand | null>(null);
  const [config, setConfig] = useState<SpeechConfig>({
    language: 'zh-CN',
    format: 'wav',
    sampleRate: 16000,
    channels: 1,
    enablePunctuation: true,
    enableTimestamps: true,
    enableWordConfidence: true,
    maxRecordingTime: 60,
    silenceTimeout: 3000
  });
  const [realtimeMode, setRealtimeMode] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const electronAPI = (window as any).electronAPI;

  useEffect(() => {
    loadCommands();
    loadHistory();
    
    // 设置事件监听器
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === ' ') {
        e.preventDefault();
        toggleRecording();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 100);
      }, 100);
    } else if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
  }, [isRecording]);

  const loadCommands = async () => {
    try {
      // 加载默认命令
      const defaultCommands: SpeechCommand[] = [
        {
          id: 'open-photoshop',
          name: '打开Photoshop',
          keywords: ['打开', '启动', '运行', 'photoshop', 'PS'],
          action: 'launch_software',
          parameters: { software: 'photoshop' },
          category: 'photoshop',
          enabled: true,
          aliases: ['启动PS', '打开PS']
        },
        {
          id: 'new-document',
          name: '新建文档',
          keywords: ['新建', '创建', '文档', '文件'],
          action: 'new_document',
          parameters: {},
          category: 'general',
          enabled: true,
          aliases: ['新建文档', '创建文件']
        },
        {
          id: 'save-file',
          name: '保存文件',
          keywords: ['保存', '存储', '存档'],
          action: 'save_file',
          parameters: {},
          category: 'general',
          enabled: true,
          aliases: ['保存文档']
        },
        {
          id: 'open-autocad',
          name: '打开AutoCAD',
          keywords: ['打开', '启动', '运行', 'autocad', 'CAD'],
          action: 'launch_software',
          parameters: { software: 'autocad' },
          category: 'autocad',
          enabled: true,
          aliases: ['启动CAD', '打开CAD']
        },
        {
          id: 'open-blender',
          name: '打开Blender',
          keywords: ['打开', '启动', '运行', 'blender', '三维'],
          action: 'launch_software',
          parameters: { software: 'blender' },
          category: 'blender',
          enabled: true,
          aliases: ['启动blender', '打开三维软件']
        },
        {
          id: 'batch-process',
          name: '批量处理',
          keywords: ['批量', '批处理', '批量操作'],
          action: 'batch_process',
          parameters: {},
          category: 'general',
          enabled: true,
          aliases: ['批量处理']
        },
        {
          id: 'generate-image',
          name: '生成图像',
          keywords: ['生成', '创建', '图像', '图片', 'AI'],
          action: 'generate_image',
          parameters: {},
          category: 'general',
          enabled: true,
          aliases: ['AI生成', '图片生成']
        },
        {
          id: 'export-file',
          name: '导出文件',
          keywords: ['导出', '输出', '另存为'],
          action: 'export_file',
          parameters: {},
          category: 'general',
          enabled: true,
          aliases: ['文件导出']
        }
      ];
      setCommands(defaultCommands);
    } catch (error) {
      console.error('Failed to load commands:', error);
    }
  };

  const loadHistory = async () => {
    try {
      // 模拟加载历史记录
      const mockHistory: Array<{
        id: string;
        result: SpeechRecognitionResult;
        timestamp: Date;
        command?: SpeechCommand;
      }> = [
        {
          id: '1',
          result: {
            text: '打开Photoshop',
            confidence: 0.95,
            duration: 2.3,
            language: 'zh-CN',
            words: [],
            segments: []
          },
          timestamp: new Date(Date.now() - 60000),
          command: commands.find(c => c.id === 'open-photoshop')
        },
        {
          id: '2',
          result: {
            text: '新建文档',
            confidence: 0.88,
            duration: 1.8,
            language: 'zh-CN',
            words: [],
            segments: []
          },
          timestamp: new Date(Date.now() - 120000),
          command: commands.find(c => c.id === 'new-document')
        }
      ];
      setRecognitionHistory(mockHistory);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      setIsProcessing(true);
      
      // 检查麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      setIsRecording(true);
      setRecordingTime(0);
      setCurrentText('');
      setPartialText('');
      
      if (realtimeMode) {
        // 启动实时识别
        console.log('Starting realtime recognition');
      } else {
        console.log('Starting normal recording');
      }
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsProcessing(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(false);
      
      // 模拟识别结果
      const mockResult: SpeechRecognitionResult = {
        text: currentText || partialText || '语音识别测试',
        confidence: 0.92,
        duration: recordingTime / 1000,
        language: config.language,
        words: [],
        segments: []
      };
      
      const command = recognizeCommand(mockResult.text);
      
      const newHistoryItem = {
        id: Date.now().toString(),
        result: mockResult,
        timestamp: new Date(),
        command
      };
      
      setRecognitionHistory(prev => [newHistoryItem, ...prev]);
      setCurrentText(mockResult.text);
      
      if (command) {
        await executeCommand(command);
      }
      
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const recognizeCommand = (text: string): SpeechCommand | null => {
    const normalizedText = text.toLowerCase().trim();
    
    for (const command of commands) {
      if (!command.enabled) continue;
      
      for (const keyword of command.keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          return command;
        }
      }
      
      for (const alias of command.aliases) {
        if (normalizedText.includes(alias.toLowerCase())) {
          return command;
        }
      }
    }
    
    return null;
  };

  const executeCommand = async (command: SpeechCommand) => {
    try {
      console.log('Executing command:', command);
      
      switch (command.action) {
        case 'launch_software':
          const software = command.parameters?.software;
          if (software) {
            await electronAPI.software.launch(software);
          }
          break;
          
        case 'new_document':
          await electronAPI.software.executeCommand('photoshop', {
            action: 'new_document'
          });
          break;
          
        case 'save_file':
          await electronAPI.software.executeCommand('photoshop', {
            action: 'save'
          });
          break;
          
        case 'batch_process':
          await electronAPI.photoshop.batchProcess({
            inputFolder: '',
            outputFolder: '',
            operations: []
          });
          break;
          
        case 'generate_image':
          // 切换到图像生成标签页
          setActiveTab('image');
          break;
          
        case 'export_file':
          await electronAPI.software.executeCommand('photoshop', {
            action: 'export'
          });
          break;
          
        default:
          console.log('Unknown command action:', command.action);
      }
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  };

  const toggleCommand = (commandId: string) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === commandId ? { ...cmd, enabled: !cmd.enabled } : cmd
    ));
  };

  const saveCommand = (command: SpeechCommand) => {
    if (editingCommand) {
      // 更新现有命令
      setCommands(prev => prev.map(cmd => 
        cmd.id === editingCommand.id ? command : cmd
      ));
      setEditingCommand(null);
    } else {
      // 添加新命令
      const newCommand = {
        ...command,
        id: Date.now().toString()
      };
      setCommands(prev => [...prev, newCommand]);
    }
  };

  const deleteCommand = (commandId: string) => {
    setCommands(prev => prev.filter(cmd => cmd.id !== commandId));
  };

  const exportCommands = () => {
    const dataStr = JSON.stringify(commands, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'speech-commands.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (confidence >= 0.7) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">语音识别工作台</h1>
        <div className="flex items-center gap-2">
          <Badge variant={realtimeMode ? 'default' : 'secondary'}>
            {realtimeMode ? '实时模式' : '录音模式'}
          </Badge>
          <Switch
            checked={realtimeMode}
            onCheckedChange={setRealtimeMode}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recognize" className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            语音识别
          </TabsTrigger>
          <TabsTrigger value="commands" className="flex items-center gap-2">
            <Command className="w-4 h-4" />
            语音命令
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            识别历史
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recognize" className="space-y-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                语音录制
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 录音控制 */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Button
                    size="lg"
                    onClick={toggleRecording}
                    disabled={isProcessing}
                    className={`w-24 h-24 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
                  >
                    {isRecording ? (
                      <MicOff className="w-12 h-12" />
                    ) : (
                      <Mic className="w-12 h-12" />
                    )}
                  </Button>
                  
                  {isRecording && (
                    <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-red-300 animate-pulse" />
                  )}
                </div>

                <div className="text-center space-y-2">
                  <p className="text-2xl font-mono">
                    {formatTime(recordingTime)}
                  </p>
                  
                  {partialText && realtimeMode && (
                    <div className="bg-muted p-3 rounded-lg min-w-[300px]">
                      <p className="text-sm text-muted-foreground mb-1">实时识别：</p>
                      <p className="text-lg">{partialText}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 音频可视化 */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2">
                  <Volume2 className="w-6 h-6 text-muted-foreground" />
                  <div className="flex space-x-1">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary rounded-full"
                        style={{
                          height: isRecording ? Math.random() * 30 + 10 : 2
                        }}
                      />
                    ))}
                  </div>
                  <Volume2 className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>

              {/* 当前识别结果 */}
              {currentText && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium mb-2">识别结果</h3>
                      <p className="text-lg">{currentText}</p>
                    </div>
                    <div className="ml-4">
                      {getConfidenceIcon(0.92)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commands" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Command className="w-5 h-5" />
                  语音命令管理
                </div>
                <Button onClick={() => setEditingCommand({} as SpeechCommand)}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加命令
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingCommand && (
                <Card className="mb-4 border-primary">
                  <CardHeader>
                    <CardTitle>
                      {editingCommand.id ? '编辑命令' : '添加新命令'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>命令名称</Label>
                        <Input
                          value={editingCommand.name || ''}
                          onChange={(e) => setEditingCommand(prev => prev ? {...prev, name: e.target.value} : null)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>类别</Label>
                        <Select
                          value={editingCommand.category || 'general'}
                          onValueChange={(value) => setEditingCommand(prev => prev ? {...prev, category: value as any} : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">通用</SelectItem>
                            <SelectItem value="photoshop">Photoshop</SelectItem>
                            <SelectItem value="autocad">AutoCAD</SelectItem>
                            <SelectItem value="blender">Blender</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>关键词（用逗号分隔）</Label>
                      <Input
                        value={editingCommand.keywords?.join(', ') || ''}
                        onChange={(e) => setEditingCommand(prev => prev ? {...prev, keywords: e.target.value.split(',').map(k => k.trim())} : null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>别名（用逗号分隔）</Label>
                      <Input
                        value={editingCommand.aliases?.join(', ') || ''}
                        onChange={(e) => setEditingCommand(prev => prev ? {...prev, aliases: e.target.value.split(',').map(a => a.trim())} : null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>动作</Label>
                      <Input
                        value={editingCommand.action || ''}
                        onChange={(e) => setEditingCommand(prev => prev ? {...prev, action: e.target.value} : null)}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={() => saveCommand(editingCommand)}>
                        <Save className="w-4 h-4 mr-2" />
                        保存
                      </Button>
                      <Button variant="outline" onClick={() => setEditingCommand(null)}>
                        取消
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">命令列表</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportCommands}>
                      <Download className="w-4 h-4 mr-2" />
                      导出
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {commands.map(command => (
                    <Card key={command.id} className={command.enabled ? '' : 'opacity-60'}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{command.name}</h4>
                          <Switch
                            checked={command.enabled}
                            onCheckedChange={() => toggleCommand(command.id)}
                          />
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">关键词：</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {command.keywords.map((keyword, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-muted-foreground">动作：</span>
                            <span className="ml-1">{command.action}</span>
                          </div>
                          
                          <div>
                            <span className="text-muted-foreground">类别：</span>
                            <Badge variant="outline" className="ml-1">
                              {command.category}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingCommand(command)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            编辑
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCommand(command.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            删除
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  识别历史
                </div>
                <Button variant="outline" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  清空历史
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recognitionHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无识别历史
                </div>
              ) : (
                <div className="space-y-4">
                  {recognitionHistory.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {item.timestamp.toLocaleString()}
                          </span>
                          {item.command && (
                            <Badge variant="default" className="text-xs">
                              {item.command.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getConfidenceIcon(item.result.confidence)}
                          <span className={`text-sm ${getConfidenceColor(item.result.confidence)}`}>
                            {(item.result.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-base mb-2">{item.result.text}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>语言: {item.result.language}</span>
                        <span>时长: {item.result.duration.toFixed(1)}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                识别设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>识别语言</Label>
                    <Select
                      value={config.language}
                      onValueChange={(value) => setConfig(prev => ({...prev, language: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh-CN">中文</SelectItem>
                        <SelectItem value="en-US">English</SelectItem>
                        <SelectItem value="ja-JP">日本語</SelectItem>
                        <SelectItem value="ko-KR">한국어</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>音频格式</Label>
                    <Select
                      value={config.format}
                      onValueChange={(value) => setConfig(prev => ({...prev, format: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wav">WAV</SelectItem>
                        <SelectItem value="mp3">MP3</SelectItem>
                        <SelectItem value="flac">FLAC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>采样率 (Hz)</Label>
                    <Select
                      value={config.sampleRate.toString()}
                      onValueChange={(value) => setConfig(prev => ({...prev, sampleRate: parseInt(value)}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8000">8000</SelectItem>
                        <SelectItem value="16000">16000</SelectItem>
                        <SelectItem value="44100">44100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>启用标点符号</Label>
                    <Switch
                      checked={config.enablePunctuation}
                      onCheckedChange={(checked) => setConfig(prev => ({...prev, enablePunctuation: checked}))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>启用时间戳</Label>
                    <Switch
                      checked={config.enableTimestamps}
                      onCheckedChange={(checked) => setConfig(prev => ({...prev, enableTimestamps: checked}))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>启用词级置信度</Label>
                    <Switch
                      checked={config.enableWordConfidence}
                      onCheckedChange={(checked) => setConfig(prev => ({...prev, enableWordConfidence: checked}))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>最大录音时间 (秒)</Label>
                    <Input
                      type="number"
                      value={config.maxRecordingTime}
                      onChange={(e) => setConfig(prev => ({...prev, maxRecordingTime: parseInt(e.target.value)}))}
                      min={1}
                      max={300}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>静音超时 (毫秒)</Label>
                    <Input
                      type="number"
                      value={config.silenceTimeout}
                      onChange={(e) => setConfig(prev => ({...prev, silenceTimeout: parseInt(e.target.value)}))}
                      min={0}
                      max={10000}
                      step={500}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Alert>
                  <AlertDescription>
                    <Globe className="w-4 h-4 inline mr-2" />
                    语音识别需要稳定的网络连接和良好的麦克风质量。建议在安静的环境中使用以获得最佳识别效果。
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};