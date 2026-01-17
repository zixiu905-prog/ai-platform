import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { ChatInterface } from '../components/chat/ChatInterface';
import { ConversationList } from '../components/chat/ConversationList';
import { ChatSettings } from '../components/chat/ChatSettings';
import { ChatErrorBoundary } from '../components/chat/ChatErrorBoundary';
import { 
  ConversationsLoading, 
  EmptyState, 
  StreamingIndicator,
  ConnectionStatus 
} from '../components/chat/ChatLoadingStates';
import { AlertCircle, MessageSquare, Plus } from 'lucide-react';

export function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const {
    conversations,
    currentConversation,
    isLoading,
    isSending,
    streamingContent,
    error,
    actions: {
      loadConversations,
      createConversation,
      selectConversation,
      deleteConversation,
      sendMessageStream,
      regenerateMessage,
      deleteMessage,
      updateConversationSettings,
    },
  } = useChat();

  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 初始化加载
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 处理URL参数中的对话ID
  useEffect(() => {
    if (conversationId) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        selectConversation(conversationId);
      } else {
        // 如果URL中的对话ID不存在，清除URL参数
        navigate('/chat', { replace: true });
      }
    }
  }, [conversationId, conversations, navigate, selectConversation]);

  // 创建新对话
  const handleNewConversation = async () => {
    try {
      const newConversation = await createConversation('新对话');
      navigate(`/chat/${newConversation.id}`, { replace: true });
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // 选择对话
  const handleSelectConversation = async (id: string) => {
    navigate(`/chat/${id}`, { replace: true });
  };

  // 删除对话
  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      if (currentConversation?.id === id) {
        navigate('/chat', { replace: true });
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  // 重命名对话
  const handleRenameConversation = async (id: string, title: string) => {
    try {
      const conversation = conversations.find(c => c.id === id);
      if (conversation) {
        // 这里需要调用更新API
        // await chatService.updateConversation(id, { title });
        console.log('Renaming conversation:', id, title);
        // 临时解决方案：重新加载对话列表
        loadConversations();
      }
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  };

  // 发送消息
  const handleSendMessage = async (message: string) => {
    try {
      if (!currentConversation) {
        await handleNewConversation();
        return;
      }

      await sendMessageStream({
        message,
        conversationId: currentConversation.id,
        stream: true,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // 重新生成消息
  const handleRegenerateMessage = async (messageId: string) => {
    try {
      await regenerateMessage(messageId);
    } catch (error) {
      console.error('Failed to regenerate message:', error);
    }
  };

  // 删除消息
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // 更新对话设置
  const handleUpdateSettings = async (settings: any) => {
    try {
      if (currentConversation) {
        await updateConversationSettings(settings);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  return (
    <ChatErrorBoundary>
      <div className="h-screen flex bg-white dark:bg-gray-900">
        {/* 侧边栏 - 对话列表 */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden`}>
          {isLoading && conversations.length === 0 ? (
            <ConversationsLoading />
          ) : (
            <ConversationList
              conversations={conversations}
              currentConversationId={currentConversation?.id}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={handleRenameConversation}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* 主聊天区域 */}
        <div className="flex-1 flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-5 h-5 space-y-1">
                  <div className="w-full h-0.5 bg-current"></div>
                  <div className="w-full h-0.5 bg-current"></div>
                  <div className="w-full h-0.5 bg-current"></div>
                </div>
              </button>
              <h1 className="text-lg font-semibold">
                {currentConversation?.title || 'AI 对话'}
              </h1>
              <ConnectionStatus isConnected={true} isConnecting={isSending} />
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ⚙️
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => window.location.reload()}
                className="ml-auto text-xs underline"
              >
                刷新页面
              </button>
            </div>
          )}

          {/* 流式指示器 */}
          <StreamingIndicator isVisible={isSending} />

          {/* 聊天界面 */}
          <ChatErrorBoundary
            fallback={({ onRetry }) => (
              <EmptyState
                title="对话加载失败"
                description="无法加载对话内容，请检查网络连接或重试"
                action={{
                  label: '重试',
                  onClick: onRetry || (() => window.location.reload())
                }}
              />
            )}
          >
            <ChatInterface
              messages={currentConversation?.messages || []}
              onSendMessage={handleSendMessage}
              onRegenerateMessage={handleRegenerateMessage}
              onDeleteMessage={handleDeleteMessage}
              onToggleSettings={() => setShowSettings(!showSettings)}
              isLoading={isLoading}
              isSending={isSending}
              streamingContent={streamingContent}
              placeholder={currentConversation ? "继续对话..." : "开始新对话..."}
            />
          </ChatErrorBoundary>
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <ChatSettings
            settings={currentConversation?.settings || {}}
            onUpdateSettings={handleUpdateSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </ChatErrorBoundary>
  );
}

export default Chat;