import React, { useState, useRef } from 'react';
import { Send, Paperclip, Mic, Square, Settings } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onToggleSettings?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ 
  onSendMessage, 
  onToggleSettings,
  disabled = false,
  placeholder = "输入消息..." 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleVoiceRecord = () => {
    // 语音录制功能（后续实现）
    setIsRecording(!isRecording);
  };

  const handleFileAttach = () => {
    // 文件上传功能（后续实现）
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      console.log('Selected files:', files);
    };
    input.click();
  };

  // 自动调整文本框高度
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  return (
    <form onSubmit={handleSubmit} className="border-t bg-white dark:bg-gray-800 p-4">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        {/* 附件按钮 */}
        <button
          type="button"
          onClick={handleFileAttach}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="添加附件"
        >
          <Paperclip size={20} />
        </button>

        {/* 输入框 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          {/* 字符计数 */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {message.length}/2000
          </div>
        </div>

        {/* 语音录制按钮 */}
        <button
          type="button"
          onClick={handleVoiceRecord}
          className={`p-2 rounded-lg transition-colors ${
            isRecording 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title={isRecording ? "停止录音" : "语音输入"}
        >
          {isRecording ? <Square size={20} /> : <Mic size={20} />}
        </button>

        {/* 设置按钮 */}
        {onToggleSettings && (
          <button
            type="button"
            onClick={onToggleSettings}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="聊天设置"
          >
            <Settings size={20} />
          </button>
        )}

        {/* 发送按钮 */}
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={20} />
        </button>
      </div>
      
      {/* 提示信息 */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-400">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </form>
  );
}