import React from 'react';
import { Message } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ScrollArea } from '../ui/scroll-area';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onToggleSettings?: () => void;
  isLoading?: boolean;
  isSending?: boolean;
  streamingContent?: string;
  placeholder?: string;
}

export function ChatInterface({
  messages,
  onSendMessage,
  onRegenerateMessage,
  onDeleteMessage,
  onToggleSettings,
  isLoading = false,
  isSending = false,
  streamingContent = '',
  placeholder = "输入消息...",
}: ChatInterfaceProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">加载对话中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 消息列表 */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-semibold mb-2">开始新对话</h2>
              <p className="text-gray-400">输入消息开始与AI助手对话</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onRegenerate={onRegenerateMessage}
                onDelete={onDeleteMessage}
                isStreaming={streamingContent.length > 0 && message.role === 'assistant' && message.status === 'processing'}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 输入框 */}
      <MessageInput
        onSendMessage={onSendMessage}
        onToggleSettings={onToggleSettings}
        disabled={isSending}
        placeholder={placeholder}
      />
    </div>
  );
}