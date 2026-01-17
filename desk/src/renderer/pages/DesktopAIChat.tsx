import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Mic, 
  MicOff, 
  Settings, 
  Download,
  RefreshCw,
  Bot,
  User,
  Sparkles,
  Zap,
  Brain
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  model?: string;
  tokens?: number;
  cost?: number;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  status: 'online' | 'offline' | 'busy';
  capabilities: string[];
  maxTokens: number;
  costPerToken: number;
}

interface DesktopAIChatProps {
  className?: string;
}

const AI_MODELS: AIModel[] = [
  {
    id: 'glm-4',
    name: '智谱GLM-4',
    provider: '智谱AI',
    status: 'online',
    capabilities: ['text', 'reasoning', 'coding'],
    maxTokens: 128000,
    costPerToken: 0.0001
  },
  {
    id: 'doubao-pro',
    name: '豆包Pro',
    provider: '字节跳动',
    status: 'online',
    capabilities: ['text', 'reasoning', 'multimodal'],
    maxTokens: 32000,
    costPerToken: 0.00008
  },
  {
    id: 'local-llm',
    name: '本地LLM',
    provider: 'Local',
    status: 'offline',
    capabilities: ['text', 'reasoning'],
    maxTokens: 8192,
    costPerToken: 0
  }
];

export const DesktopAIChat: React.FC<DesktopAIChatProps> = ({ className }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 生成AI响应（模拟）
  const generateAIResponse = (userInput: string): string => {
    const responses = [
      `我理解您关于"${userInput}"的问题。这是一个很有趣的话题！`,
      `关于"${userInput}"，我可以为您提供一些详细的解答和建议。`,
      `您提到的"${userInput}"涉及到多个方面，让我为您分析一下：\n\n1. 首先...\n2. 其次...\n3. 最后...`,
      `这是一个很好的问题！对于"${userInput}"，我认为需要考虑以下几点：\n\n• 技术实现\n• 最佳实践\n• 性能优化`,
      `基于您的"${userInput}"问题，我建议您可以考虑以下几个方面来解决问题。`
    ];

    return responses[Math.floor(Math.random() * responses.length)] +
           '\n\n有什么其他问题吗？我很乐意继续为您提供帮助！';
  };

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 模拟AI响应
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(input.trim()),
        role: 'assistant',
        timestamp: new Date(),
        model: selectedModel.name,
        tokens: Math.floor(Math.random() * 500) + 100,
        cost: selectedModel.costPerToken * (Math.floor(Math.random() * 500) + 100)
      };

      setMessages(prev => [...prev, assistantMessage]);
      setTotalTokens(prev => prev + (assistantMessage.tokens || 0));
      setTotalCost(prev => prev + (assistantMessage.cost || 0));
    } catch (error) {
      console.error('发送消息失败:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '抱歉，发送消息时出现了错误。请稍后重试。',
        role: 'assistant',
        timestamp: new Date(),
        model: 'system'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 切换录音状态
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: 实现语音录制功能
  };

  // 清空对话
  const clearChat = () => {
    setMessages([]);
    setTotalCost(0);
    setTotalTokens(0);
  };

  // 导出对话
  const exportChat = () => {
    const chatContent = messages.map(msg => 
      `[${msg.timestamp.toLocaleString()}] ${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`
    ).join('\n\n');

    // 创建下载链接
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 标题栏 */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-blue-500" />
            <CardTitle className="text-xl">AI智能对话</CardTitle>
            <Badge variant={selectedModel.status === 'online' ? 'default' : 'secondary'}>
              {selectedModel.name}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              <Sparkles className="inline h-3 w-3 mr-1" />
              {totalTokens.toLocaleString()} tokens
            </div>
            <div className="text-sm text-muted-foreground">
              ¥{totalCost.toFixed(4)}
            </div>
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={exportChat}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* 设置面板 */}
      {showSettings && (
        <Card className="mx-4 mb-4">
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">选择AI模型</label>
                <div className="grid grid-cols-1 gap-2">
                  {AI_MODELS.map(model => (
                    <div
                      key={model.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedModel.id === model.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedModel(model)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {model.provider} • 最大{model.maxTokens.toLocaleString()} tokens
                          </div>
                        </div>
                        <Badge variant={model.status === 'online' ? 'default' : 'secondary'}>
                          {model.status === 'online' ? '在线' : model.status === 'offline' ? '离线' : '忙碌'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {model.capabilities.map(cap => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 消息列表 */}
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">开始您的AI对话</h3>
                <p className="text-muted-foreground">
                  我是您的AI助手，可以帮助您解答问题、提供建议和协助设计工作。
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  <Badge variant="outline">智能问答</Badge>
                  <Badge variant="outline">代码助手</Badge>
                  <Badge variant="outline">设计建议</Badge>
                  <Badge variant="outline">问题解决</Badge>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white ml-auto'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                    
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        {message.model && <span>{message.model}</span>}
                        {message.tokens && <span>{message.tokens} tokens</span>}
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                      </div>
                    )}
                    
                    {message.role === 'user' && (
                      <div className="text-xs text-blue-100 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse">
                      <Zap className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="text-sm text-gray-600">AI正在思考...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>
      </CardContent>

      {/* 输入区域 */}
      <CardHeader className="pt-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题..."
              disabled={isLoading}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleRecording}
                className={`h-7 w-7 p-0 ${isRecording ? 'text-red-500' : 'text-gray-500'}`}
                disabled={isLoading}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6"
          >
            <Send className="h-4 w-4 mr-2" />
            发送
          </Button>
        </div>
        
        {isRecording && (
          <div className="mt-2 text-sm text-red-500 flex items-center gap-2">
            <div className="animate-pulse">
              <Mic className="h-4 w-4" />
            </div>
            正在录音...
          </div>
        )}
      </CardHeader>
    </div>
  );
};

export default DesktopAIChat;