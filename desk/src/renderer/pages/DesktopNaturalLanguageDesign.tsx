import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  Settings, 
  History, 
  Play, 
  Download,
  Image,
  Palette,
  Box,
  FileText,
  Layers
} from 'lucide-react';
import { toast } from 'react-toastify';

interface DesignCommand {
  id: string;
  input: string;
  output: string;
  software: string;
  action: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  timestamp: Date;
}

interface Software {
  name: string;
  icon: React.ReactNode;
  description: string;
  status: 'installed' | 'not_installed' | 'unknown';
}

const DesktopNaturalLanguageDesign: React.FC = () => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [commands, setCommands] = useState<DesignCommand[]>([]);
  const [selectedSoftware, setSelectedSoftware] = useState<string>('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const electronAPI = (window as any).electronAPI;

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // 初始化软件列表
    initializeSoftwareList();
    // 加载历史命令
    loadCommandHistory();
  }, []);

  const initializeSoftwareList = async () => {
    try {
      const response = await electronAPI?.software?.status();
      if (response?.success && response?.data) {
        const installed = response.data.installed || [];
        
        const software: Software[] = [
          {
            name: 'auto',
            icon: <Sparkles className="w-4 h-4" />,
            description: '自动选择最适合的软件',
            status: 'installed'
          },
          {
            name: 'photoshop',
            icon: <Image className="w-4 h-4" />,
            description: 'Adobe Photoshop - 图像处理',
            status: installed.includes('photoshop') ? 'installed' : 'not_installed'
          },
          {
            name: 'illustrator',
            icon: <Palette className="w-4 h-4" />,
            description: 'Adobe Illustrator - 矢量设计',
            status: installed.includes('illustrator') ? 'installed' : 'not_installed'
          },
          {
            name: 'autocad',
            icon: <Box className="w-4 h-4" />,
            description: 'AutoCAD - 2D/3D 设计',
            status: installed.includes('autocad') ? 'installed' : 'not_installed'
          },
          {
            name: 'blender',
            icon: <Layers className="w-4 h-4" />,
            description: 'Blender - 3D 建模渲染',
            status: installed.includes('blender') ? 'installed' : 'not_installed'
          },
          {
            name: 'premiere',
            icon: <FileText className="w-4 h-4" />,
            description: 'Adobe Premiere - 视频编辑',
            status: installed.includes('premiere') ? 'installed' : 'not_installed'
          }
        ];
        
        setSoftwareList(software);
      }
    } catch (error) {
      console.error('获取软件状态失败:', error);
      toast.error('无法获取软件状态');
    }
  };

  const loadCommandHistory = async () => {
    try {
      const stored = localStorage.getItem('design-commands');
      if (stored) {
        const history = JSON.parse(stored);
        setCommands(history.slice(-10)); // 只保留最近10条
      }
    } catch (error) {
      console.error('加载命令历史失败:', error);
    }
  };

  const saveCommandHistory = (newCommand: DesignCommand) => {
    const updatedCommands = [...commands, newCommand];
    const limited = updatedCommands.slice(-20); // 只保留最近20条
    setCommands(limited);
    localStorage.setItem('design-commands', JSON.stringify(limited));
  };

  const executeCommand = async (command: string, software: string = selectedSoftware) => {
    if (!command.trim()) {
      toast.warning('请输入设计指令');
      return;
    }

    setIsProcessing(true);
    const newCommand: DesignCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      input: command.trim(),
      output: '',
      software,
      action: '',
      status: 'processing',
      timestamp: new Date()
    };

    saveCommandHistory(newCommand);

    try {
      // 调用AI分析自然语言指令
      const aiResponse = await electronAPI?.api?.post('/ai/analyze', {
        content: command,
        type: 'design_command',
        context: {
          software,
          availableSoftware: softwareList.filter(s => s.status === 'installed').map(s => s.name)
        }
      });

      if (!aiResponse?.success) {
        throw new Error(aiResponse?.error || 'AI分析失败');
      }

      const aiResult = aiResponse.data.data;
      let targetSoftware = software;
      let action = aiResult.action || 'unknown';
      let parameters = aiResult.parameters || {};

      // 如果是自动选择软件，让AI决定使用哪个软件
      if (software === 'auto' && aiResult.software) {
        targetSoftware = aiResult.software;
      }

      // 更新命令信息
      const updatedCommand = {
        ...newCommand,
        software: targetSoftware,
        action,
        status: 'pending' as const
      };

      setCommands(prev => prev.map(cmd => 
        cmd.id === newCommand.id ? updatedCommand : cmd
      ));

      // 执行具体的设计操作
      const executionResult = await executeDesignAction(targetSoftware, action, parameters);
      
      // 更新命令状态
      const finalCommand = {
        ...updatedCommand,
        output: executionResult.message || executionResult.data?.description || '操作完成',
        status: executionResult.success ? 'completed' : 'error',
        error: executionResult.success ? undefined : executionResult.error
      };

      setCommands(prev => prev.map(cmd =>
        cmd.id === newCommand.id ? { ...finalCommand, output: finalCommand.output as string } as DesignCommand : cmd
      ));

      if (executionResult.success) {
        toast.success(`${targetSoftware} 操作完成`);
      } else {
        toast.error(executionResult.error || '操作失败');
      }

    } catch (error) {
      console.error('执行命令失败:', error);
      
      const errorCommand = {
        ...newCommand,
        status: 'error' as const,
        error: error instanceof Error ? error.message : '未知错误'
      };

      setCommands(prev => prev.map(cmd => 
        cmd.id === newCommand.id ? errorCommand : cmd
      ));

      toast.error('执行命令失败');
    } finally {
      setIsProcessing(false);
      setInput('');
    }
  };

  const executeDesignAction = async (software: string, action: string, parameters: any) => {
    try {
      switch (software) {
        case 'photoshop':
          return await electronAPI?.photoshop?.executeCommand?.(action, parameters);
        case 'autocad':
          return await electronAPI?.autocad?.executeCommand?.(action, parameters);
        case 'blender':
          return await electronAPI?.blender?.executeCommand?.(action, parameters);
        case 'illustrator':
          return await electronAPI?.illustrator?.executeCommand?.(action, parameters);
        case 'premiere':
          return await electronAPI?.premiere?.executeCommand?.(action, parameters);
        default:
          return { success: false, error: `不支持的软件: ${software}` };
      }
    } catch (error) {
      console.error(`执行${software}操作失败:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '操作失败' 
      };
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand(input, selectedSoftware);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // 停止录音
      setIsRecording(false);
      // 这里应该调用语音识别服务
      // 简化版本，暂时不实现
    } else {
      // 开始录音
      setIsRecording(true);
      // 这里应该调用语音识别服务
      // 简化版本，暂时不实现
    }
  };

  const clearHistory = () => {
    setCommands([]);
    localStorage.removeItem('design-commands');
    toast.success('命令历史已清除');
  };

  const exportHistory = () => {
    const dataStr = JSON.stringify(commands, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `design-commands-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('命令历史已导出');
  };

  const retryCommand = (command: DesignCommand) => {
    executeCommand(command.input, command.software);
  };

  const getStatusColor = (status: DesignCommand['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: DesignCommand['status']) => {
    switch (status) {
      case 'pending': return '等待中';
      case 'processing': return '处理中';
      case 'completed': return '已完成';
      case 'error': return '错误';
      default: return '未知';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">自然语言设计助手</h1>
            <Badge variant="secondary">Beta</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4 mr-1" />
              设置
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
            >
              <History className="w-4 h-4 mr-1" />
              清除历史
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportHistory}
            >
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：输入区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 软件选择 */}
            <Card>
              <CardHeader>
                <CardTitle>目标软件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {softwareList.map((software) => (
                    <button
                      key={software.name}
                      onClick={() => setSelectedSoftware(software.name)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedSoftware === software.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${software.status === 'not_installed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={software.status === 'not_installed'}
                    >
                      <div className="flex items-center gap-2">
                        {software.icon}
                        <div className="text-left">
                          <div className="font-medium text-sm">{software.name}</div>
                          <div className="text-xs text-gray-500">{software.description}</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Badge 
                          variant={software.status === 'installed' ? 'default' : 'secondary'}
                          size="sm"
                        >
                          {software.status === 'installed' ? '已安装' : '未安装'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 输入区域 */}
            <Card>
              <CardHeader>
                <CardTitle>设计指令</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  ref={inputRef}
                  placeholder="请用自然语言描述您想要完成的设计任务，例如：
• 创建一个800x600像素的新文档
• 画一个蓝色的圆形
• 给这个图层添加投影效果
• 导出为JPG格式"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows={4}
                  className="min-h-[120px]"
                />

                <div className="flex gap-3">
                  <Button
                    onClick={() => executeCommand(input, selectedSoftware)}
                    disabled={isProcessing || !input.trim()}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        执行指令
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={toggleRecording}
                    disabled={isProcessing}
                    className={isRecording ? 'bg-red-50 border-red-200 text-red-600' : ''}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4 mr-2" />
                        停止录音
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        语音输入
                      </>
                    )}
                  </Button>
                </div>

                <Alert>
                  <AlertDescription>
                    💡 <strong>提示：</strong>使用自然语言描述您的需求，AI会自动分析并执行相应的设计操作。
                    您也可以使用快捷键 <kbd>Enter</kbd> 快速发送指令。
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：命令历史 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  命令历史
                </CardTitle>
              </CardHeader>
              <CardContent>
                {commands.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无命令历史
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {commands.map((command) => (
                      <div
                        key={command.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge 
                            variant="outline"
                            className={`${getStatusColor(command.status)} text-white`}
                          >
                            {getStatusText(command.status)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(command.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <div className="mb-2">
                          <div className="text-sm font-medium mb-1">输入：</div>
                          <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            {command.input}
                          </div>
                        </div>

                        <div className="mb-2">
                          <div className="text-sm font-medium mb-1">软件：</div>
                          <Badge variant="secondary" size="sm">
                            {command.software}
                          </Badge>
                        </div>

                        {command.output && (
                          <div className="mb-2">
                            <div className="text-sm font-medium mb-1">输出：</div>
                            <div className="text-sm text-gray-700 bg-green-50 p-2 rounded">
                              {command.output}
                            </div>
                          </div>
                        )}

                        {command.error && (
                          <div className="mb-2">
                            <div className="text-sm font-medium mb-1 text-red-600">错误：</div>
                            <div className="text-sm text-red-700 bg-red-50 p-2 rounded">
                              {command.error}
                            </div>
                          </div>
                        )}

                        {command.status === 'error' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryCommand(command)}
                            className="w-full"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            重试
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 使用提示 */}
            <Card>
              <CardHeader>
                <CardTitle>使用示例</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="p-2 bg-blue-50 rounded border-l-4 border-blue-300">
                    <strong>Photoshop：</strong><br />
                    • "创建一个1920x1080的新文档"<br />
                    • "给图层添加10像素的投影"<br />
                    • "应用模糊滤镜效果"
                  </div>
                  
                  <div className="p-2 bg-green-50 rounded border-l-4 border-green-300">
                    <strong>AutoCAD：</strong><br />
                    • "绘制一个半径50的圆"<br />
                    • "添加尺寸标注"<br />
                    • "设置图层为红色"
                  </div>
                  
                  <div className="p-2 bg-purple-50 rounded border-l-4 border-purple-300">
                    <strong>Blender：</strong><br />
                    • "创建一个立方体"<br />
                    • "添加金属材质"<br />
                    • "设置简单三点照明"
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopNaturalLanguageDesign;