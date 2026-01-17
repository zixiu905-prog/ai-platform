import { useState, useCallback } from 'react';
import { useChatContext } from '../contexts/ChatContext';
import { chatService } from '../services/chatService';
import { Message, Conversation, ChatRequest, ConversationSettings } from '../types/chat';

export function useChat() {
  const { state, actions } = useChatContext();
  const [streamingContent, setStreamingContent] = useState<string>('');

  // 获取对话列表
  const loadConversations = useCallback(async (page = 1, limit = 20) => {
    try {
      actions.setLoading(true);
      actions.clearError();
      const response = await chatService.getConversations(page, limit);
      actions.setConversations(response.conversations);
    } catch (error) {
      actions.setError(error instanceof Error ? error.message : '加载对话列表失败');
    } finally {
      actions.setLoading(false);
    }
  }, [actions]);

  // 创建新对话
  const createConversation = useCallback(async (title?: string, settings?: ConversationSettings) => {
    try {
      actions.setLoading(true);
      actions.clearError();
      const conversation = await chatService.createConversation(title, settings || undefined);
      actions.addConversation(conversation);
      actions.setCurrentConversation(conversation);
      return conversation;
    } catch (error) {
      actions.setError(error instanceof Error ? error.message : '创建对话失败');
      throw error;
    } finally {
      actions.setLoading(false);
    }
  }, [actions]);

  // 选择对话
  const selectConversation = useCallback(async (conversationId: string) => {
    try {
      actions.setLoading(true);
      actions.clearError();
      const conversation = await chatService.getConversation(conversationId);
      actions.setCurrentConversation(conversation);
      return conversation;
    } catch (error) {
      actions.setError(error instanceof Error ? error.message : '加载对话失败');
      throw error;
    } finally {
      actions.setLoading(false);
    }
  }, [actions]);

  // 删除对话
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      actions.setLoading(true);
      actions.clearError();
      await chatService.deleteConversation(conversationId);
      actions.deleteConversation(conversationId);
    } catch (error) {
      actions.setError(error instanceof Error ? error.message : '删除对话失败');
      throw error;
    } finally {
      actions.setLoading(false);
    }
  }, [actions]);

  // 发送消息（非流式）
  const sendMessage = useCallback(async (request: ChatRequest) => {
    try {
      actions.setSending(true);
      actions.clearError();

      // 如果没有指定对话ID，创建新对话
      let conversationId = request.conversationId;
      if (!conversationId && !state.currentConversation) {
        const newConversation = await createConversation('新对话', (request.settings as any) || undefined);
        conversationId = newConversation.id;
      } else if (!conversationId) {
        conversationId = state.currentConversation!.id;
      }

      // 创建用户消息
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: request.message,
        role: 'user',
        timestamp: new Date(),
        conversationId: conversationId!,
        status: 'sent',
      };

      actions.addMessage(userMessage);

      // 发送到AI
      const response = await chatService.sendMessage({
        ...request,
        conversationId: conversationId!,
      });

      // 添加AI回复
      if (response?.message) {
        actions.addMessage(response.message);
      }
      if (response?.conversation) {
        actions.updateConversation(response.conversation);
      }

      return response;
    } catch (error) {
      actions.setError(error instanceof Error ? error.message : '发送消息失败');
      throw error;
    } finally {
      actions.setSending(false);
    }
  }, [actions, state.currentConversation, createConversation]);

  // 发送消息（流式）
  const sendMessageStream = useCallback(async (request: ChatRequest) => {
    try {
      actions.setSending(true);
      actions.clearError();
      setStreamingContent('');

      // 如果没有指定对话ID，创建新对话
      let conversationId = request.conversationId;
      if (!conversationId && !state.currentConversation) {
        const newConversation = await createConversation('新对话', (request.settings as any) || undefined);
        conversationId = newConversation.id;
      } else if (!conversationId) {
        conversationId = state.currentConversation!.id;
      }

      // 创建用户消息
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: request.message,
        role: 'user',
        timestamp: new Date(),
        conversationId: conversationId!,
        status: 'sent',
      };

      actions.addMessage(userMessage);

      // 创建临时的AI消息用于显示流式内容
      const tempAiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        conversationId: conversationId!,
        status: 'processing',
      };

      actions.addMessage(tempAiMessage);

      // 开始流式发送
      await chatService.sendMessageStream(
        {
          ...request,
          conversationId: conversationId!,
        },
        (content) => {
          setStreamingContent(content);
          actions.updateMessage({
            ...tempAiMessage,
            content,
          });
        },
        (response) => {
          if (response?.message) {
            actions.updateMessage(response.message);
          }
          if (response?.conversation) {
            actions.updateConversation(response.conversation);
          }
          setStreamingContent('');
        },
        (error) => {
          actions.updateMessage({
            ...tempAiMessage,
            status: 'failed',
          });
          actions.setError(error);
          setStreamingContent('');
        }
      );
    } catch (error) {
      actions.setError(error instanceof Error ? error.message : '发送消息失败');
      setStreamingContent('');
    } finally {
      actions.setSending(false);
    }
  }, [actions, state.currentConversation, createConversation]);

  // 重新生成消息
  const regenerateMessage = useCallback(async (messageId: string) => {
    if (!state.currentConversation) return;

    try {
      actions.setSending(true);
      actions.clearError();

      const response = await chatService.regenerateMessage(
        state.currentConversation.id,
        messageId
      );

      // 更新消息
      if (response?.message) {
        actions.updateMessage(response.message);
      }
      if (response?.conversation) {
        actions.updateConversation(response.conversation);
      }

      return response;
    } catch (error) {
      actions.setError(error instanceof Error ? error.message : '重新生成失败');
      throw error;
    } finally {
      actions.setSending(false);
    }
  }, [actions, state.currentConversation]);

  // 删除消息
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!state.currentConversation) return;

    try {
      actions.setLoading(true);
      actions.clearError();

      await chatService.deleteMessage(state.currentConversation.id, messageId);

      // 从当前对话中移除消息
      const updatedConversation = {
        ...state.currentConversation,
        messages: state.currentConversation.messages.filter(msg => msg.id !== messageId),
      };

      actions.updateConversation(updatedConversation);
    } catch (error) {
      actions.setError(error instanceof Error ? error.message : '删除消息失败');
      throw error;
    } finally {
      actions.setLoading(false);
    }
  }, [actions, state.currentConversation]);

  // 更新对话设置
  const updateConversationSettings = useCallback(async (settings: Partial<ConversationSettings>) => {
    if (!state.currentConversation) return;

    try {
      actions.setLoading(true);
      actions.clearError();

      const updatedConversation = await chatService.updateConversation(
        state.currentConversation.id,
        { settings: { ...(state.currentConversation.settings || {}), ...settings } as ConversationSettings }
      );

      actions.updateConversation(updatedConversation);
      actions.updateSettings(settings);
    } catch (error) {
      actions.setError(error instanceof Error ? error.message : '更新设置失败');
      throw error;
    } finally {
      actions.setLoading(false);
    }
  }, [actions, state.currentConversation]);

  return {
    ...state,
    streamingContent,
    actions: {
      loadConversations,
      createConversation,
      selectConversation,
      deleteConversation,
      sendMessage,
      sendMessageStream,
      regenerateMessage,
      deleteMessage,
      updateConversationSettings,
    },
  };
}