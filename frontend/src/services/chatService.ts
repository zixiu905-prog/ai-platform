import { api } from './api';
import { 
  Message, 
  Conversation, 
  ChatRequest, 
  ChatResponse, 
  ConversationListResponse,
  ConversationSettings,
  AIModel 
} from '../types/chat';

class ChatService {
  // 获取对话列表
  async getConversations(page = 1, limit = 20) {
    const response = await api.get<ConversationListResponse>('/chat/conversations', {
      params: { page, limit }
    });
    return response.data!;
  }

  // 获取单个对话详情
  async getConversation(conversationId: string) {
    const response = await api.get<{ conversation: Conversation }>(`/chat/conversations/${conversationId}`);
    return response.data!.conversation;
  }

  // 创建新对话
  async createConversation(title?: string, settings?: ConversationSettings) {
    const response = await api.post<{ conversation: Conversation }>('/chat/conversations', {
      title,
      settings
    });
    return response.data!.conversation;
  }

  // 更新对话设置
  async updateConversation(conversationId: string, updates: Partial<Conversation>) {
    const response = await api.put<{ conversation: Conversation }>(`/chat/conversations/${conversationId}`, updates);
    return response.data!.conversation;
  }

  // 删除对话
  async deleteConversation(conversationId: string) {
    await api.delete(`/chat/conversations/${conversationId}`);
  }

  // 发送消息（普通请求）
  async sendMessage(request: ChatRequest) {
    const response = await api.post<ChatResponse>('/chat/message', request);
    return response.data;
  }

  // 发送消息（流式响应）
  async sendMessageStream(
    request: ChatRequest, 
    onMessage: (message: string) => void,
    onComplete: (response: ChatResponse) => void,
    onError: (error: string) => void
  ) {
    try {
      const response = await fetch(`/api/chat/message/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...request, stream: true })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream reader not available');
      }

      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content') {
                fullContent += parsed.content;
                onMessage(fullContent);
              } else if (parsed.type === 'complete') {
                onComplete(parsed.data);
              } else if (parsed.type === 'error') {
                onError(parsed.error);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // 获取对话中的消息历史
  async getMessages(conversationId: string, page = 1, limit = 50) {
    const response = await api.get<{ messages: Message[]; total: number }>(`/chat/conversations/${conversationId}/messages`, {
      params: { page, limit }
    });
    return response.data;
  }

  // 删除消息
  async deleteMessage(conversationId: string, messageId: string) {
    await api.delete(`/chat/conversations/${conversationId}/messages/${messageId}`);
  }

  // 重新生成AI回复
  async regenerateMessage(conversationId: string, messageId: string) {
    const response = await api.post<ChatResponse>(`/chat/conversations/${conversationId}/messages/${messageId}/regenerate`);
    return response.data;
  }

  // 获取可用的AI模型列表
  async getAvailableModels() {
    const response = await api.get<{ models: AIModel[] }>('/chat/models');
    return response.data!.models;
  }

  // 搜索对话
  async searchConversations(query: string, page = 1, limit = 20) {
    const response = await api.get<ConversationListResponse>('/chat/conversations/search', {
      params: { query, page, limit }
    });
    return response.data;
  }

  // 导出对话
  async exportConversation(conversationId: string, format: 'json' | 'markdown' | 'txt' = 'json') {
    const response = await api.get(`/chat/conversations/${conversationId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  // 获取对话统计信息
  async getConversationStats(conversationId: string) {
    const response = await api.get(`/chat/conversations/${conversationId}/stats`);
    return response.data;
  }

  // 清空对话历史
  async clearConversation(conversationId: string) {
    await api.delete(`/chat/conversations/${conversationId}/messages`);
  }
}

export const chatService = new ChatService();