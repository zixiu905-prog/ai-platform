import React from 'react';
import { Message } from '../../types/chat';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Bot, User, RotateCcw, Trash2, Copy, Check } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  isStreaming?: boolean;
}

export function MessageBubble({ 
  message, 
  onRegenerate, 
  onDelete, 
  isStreaming = false 
}: MessageBubbleProps) {
  const [copied, setCopied] = React.useState(false);
  const [showActions, setShowActions] = React.useState(false);

  const isUser = message.role === 'user';
  const isProcessing = message.status === 'processing' && isStreaming;

  const copyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex gap-3 p-4 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* 头像 */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-green-500 text-white'
      }`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* 消息内容 */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block p-3 rounded-lg ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
        }`}>
          <div className="whitespace-pre-wrap break-words">
            {isProcessing ? (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            ) : (
              message.content || <span className="text-gray-400 italic">消息为空</span>
            )}
          </div>
          
          {/* 消息状态和时间 */}
          <div className={`flex items-center gap-2 mt-1 text-xs ${
            isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
          }`}>
            <span>
              {formatDistanceToNow(message.timestamp, { 
                addSuffix: true, 
                locale: zhCN 
              })}
            </span>
            {message.status === 'failed' && (
              <span className="text-red-500">发送失败</span>
            )}
            {message.status === 'sending' && (
              <span>发送中...</span>
            )}
            {message.metadata?.tokens && (
              <span>{message.metadata.tokens} tokens</span>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        {showActions && !isProcessing && (
          <div className={`flex gap-2 mt-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <button
              onClick={copyMessage}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="复制"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            
            {!isUser && onRegenerate && (
              <button
                onClick={() => onRegenerate(message.id)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="重新生成"
              >
                <RotateCcw size={16} />
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-red-500"
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}