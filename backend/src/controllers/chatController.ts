import { MessageRole, MessageStatus } from '@prisma/client';
import { prisma } from '../config/database';
import crypto from 'crypto';
import { ZhipuAIService, zhipuAIService } from '../services/zhipuAIService';
import { DoubaoAIService } from '../services/doubaoAIService';
import { logger } from '../utils/logger';

export interface ChatRequest {
  message: string;
  conversationId?: string;
  model?: string;
  stream?: boolean;
  settings?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  conversationId: string;
  userId?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  settings: any;
  isActive: boolean;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
  messages?: ChatMessage[];
}

export interface ChatResponse {
  message: ChatMessage;
  conversation: Conversation;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
}

export interface ConversationData {
  id: string;
  title: string;
  userId: string;
  model: string;
  settings: any;
  isActive: boolean;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

export class ChatController {
  /**
   * 获取用户的对话列表
   */
  static async getConversations(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ conversations: ConversationData[]; total: number; hasMore: boolean }> {
    try {
      const skip = (page - 1) * limit;

      const [conversations, total] = await Promise.all([
        prisma.conversations.findMany({
          where: { userId, isActive: true },
          include: {
            chat_messages: {
              orderBy: { createdAt: 'desc' },
              take: 1, // 只获取最后一条消息用于预览
            }
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.conversations.count({
          where: { userId, isActive: true },
        }),
      ]);

      return {
        conversations: conversations.map(conv => ({
          id: conv.id,
          userId: conv.userId,
          title: conv.title,
          model: conv.model,
          settings: conv.settings,
          isActive: conv.isActive,
          messageCount: conv.messageCount,
          totalTokens: Number(conv.totalTokens),
          totalCost: conv.totalCost,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          messages: [],
        })) as ConversationData[],
        total,
        hasMore: skip + conversations.length < total,
      };
    } catch (error) {
      logger.error('获取对话列表失败:', error);
      throw new Error('获取对话列表失败');
    }
  }

  /**
   * 获取单个对话详情
   */
  static async getConversation(
    conversationId: string,
    userId: string
  ): Promise<ConversationData | null> {
    try {
      const conversation = await prisma.conversations.findFirst({
        where: { id: conversationId, userId, isActive: true },
        include: {
          chat_messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!conversation) {
        return null;
      }

      return {
        ...conversation,
        totalTokens: Number(conversation.totalTokens),
        messages: conversation.chat_messages,
      } as ConversationData;
    } catch (error) {
      logger.error('获取对话详情失败:', error);
      throw error;
    }
  }

  /**
   * 创建新对话
   */
  static async createConversation(
    userId: string,
    title: string = '新对话',
    model: string = 'zhipu-pro',
    settings: any = {}
  ): Promise<ConversationData> {
    try {
      const conversation = await prisma.conversations.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          title,
          model,
          settings: JSON.stringify(settings),
          isActive: true,
          messageCount: 0,
          totalTokens: BigInt(0),
          totalCost: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      return {
        ...conversation,
        totalTokens: Number(conversation.totalTokens),
        messages: [],
      } as ConversationData;
    } catch (error) {
      logger.error('创建对话失败:', error);
      throw error;
    }
  }

  /**
   * 更新对话
   */
  static async updateConversation(
    conversationId: string,
    userId: string,
    updates: any
  ): Promise<ConversationData> {
    try {
      const conversation = await prisma.conversations.update({
        where: { id: conversationId, userId },
        data: {
          ...updates,
          settings: updates.settings ? JSON.stringify(updates.settings) : undefined,
          updatedAt: new Date(),
        }
      });

      return {
        ...conversation,
        totalTokens: Number(conversation.totalTokens),
        messages: [],
      } as ConversationData;
    } catch (error) {
      logger.error('更新对话失败:', error);
      throw error;
    }
  }

  /**
   * 删除对话
   */
  static async deleteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      await prisma.conversations.update({
        where: { id: conversationId, userId },
        data: { isActive: false, updatedAt: new Date() }
      });
    } catch (error) {
      logger.error('删除对话失败:', error);
      throw error;
    }
  }

  /**
   * 获取对话消息列表
   */
  static async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: ChatMessage[]; total: number; hasMore: boolean }> {
    try {
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.chat_messages.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
          skip,
          take: limit,
        }),
        prisma.chat_messages.count({
          where: { conversationId },
        }),
      ]);

      return {
        messages,
        total,
        hasMore: skip + messages.length < total,
      };
    } catch (error) {
      logger.error('获取消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送消息（非流式）
   */
  static async sendMessage(
    userId: string,
    request: ChatRequest
  ): Promise<ChatResponse> {
    try {
      let conversation: ConversationData;

      // 获取或创建对话
      if (request.conversationId) {
        const conv = await this.getConversation(request.conversationId, userId);
        if (!conv) {
          throw new Error('对话不存在');
        }
        conversation = conv;
      } else {
        conversation = await this.createConversation(userId, '新对话', request.model, request.settings);
      }

      // 保存用户消息
      const userMessage = await prisma.chat_messages.create({
        data: {
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          role: 'USER',
          content: request.message,
          status: 'COMPLETED',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      // 获取对话历史
      const messages = await prisma.chat_messages.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 20
      });

      const aiMessages = messages.map((msg: ChatMessage) => ({
        role: msg.role === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      }));

      if (request.settings?.systemPrompt) {
        aiMessages.unshift({
          role: 'system',
          content: request.settings.systemPrompt,
        });
      }

      // 调用AI服务
      const selectedModel = request.model || conversation.model;
      let aiResponse: string;

      try {
        if (selectedModel.startsWith('zhipu')) {
          const messages = aiMessages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          } as { role: 'system' | 'user' | 'assistant'; content: string }));
          if (request.settings?.systemPrompt) {
            messages.unshift({
              role: 'system',
              content: request.settings.systemPrompt
            });
          }
          const response = await zhipuAIService.chat(messages);
          aiResponse = response.message;
        } else {
          const response = await DoubaoAIService.generateText(request.message, selectedModel);
          aiResponse = response.output.content;
        }
      } catch (aiError) {
        logger.error('AI服务调用失败:', aiError);
        throw new Error('AI服务暂时不可用，请稍后重试');
      }

      // 保存AI回复
      const assistantMessage = await prisma.chat_messages.create({
        data: {
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: aiResponse,
          status: 'COMPLETED',
          model: selectedModel,
          tokens: aiResponse.length, // 估算token数
          cost: 0.001, // 示例成本
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      // 更新对话统计
      const updatedConversation = await prisma.conversations.update({
        where: { id: conversation.id },
        data: {
          messageCount: conversation.messageCount + 2,
          totalTokens: BigInt(conversation.totalTokens) + BigInt(aiResponse.length),
          totalCost: conversation.totalCost + 0.001,
          updatedAt: new Date(),
        }
      });

      return {
        message: assistantMessage,
        conversation: updatedConversation as any,
        usage: {
          promptTokens: request.message.length,
          completionTokens: aiResponse.length,
          totalTokens: request.message.length + aiResponse.length,
          cost: 0.001,
        }
      };
    } catch (error) {
      logger.error('发送消息失败:', error);
      throw error;
    }
  }

  /**
   * 重新生成消息
   */
  static async regenerateMessage(
    userId: string,
    messageId: string
  ): Promise<ChatMessage> {
    try {
      const message = await prisma.chat_messages.findFirst({
        where: { id: messageId }
      });

      if (!message) {
        throw new Error('消息不存在');
      }

      const conversation = await prisma.conversations.findFirst({
        where: { id: message.conversationId }
      });

      if (!conversation || conversation.userId !== userId) {
        throw new Error('无权访问此消息');
      }

      // 调用AI服务重新生成
      let aiResponse: string;
      const selectedModel = conversation.model;

      if (selectedModel.startsWith('zhipu')) {
        const response = await zhipuAIService.chat([{ role: 'user', content: message.content }]);
        aiResponse = response.message;
      } else {
        const response = await DoubaoAIService.generateText(message.content, selectedModel);
        aiResponse = response.output.content;
      }

      // 更新消息
      const updatedMessage = await prisma.chat_messages.update({
        where: { id: messageId },
        data: {
          content: aiResponse,
          tokens: aiResponse.length,
          cost: 0.001,
          updatedAt: new Date(),
        }
      });

      return updatedMessage;
    } catch (error) {
      logger.error('重新生成消息失败:', error);
      throw error;
    }
  }

  /**
   * 删除消息
   */
  static async deleteMessage(userId: string, messageId: string): Promise<void> {
    try {
      const message = await prisma.chat_messages.findFirst({
        where: { id: messageId }
      });

      if (!message) {
        throw new Error('消息不存在');
      }

      const conversation = await prisma.conversations.findFirst({
        where: { id: message.conversationId, userId }
      });

      if (!conversation) {
        throw new Error('无权删除此消息');
      }

      await prisma.chat_messages.deleteMany({
        where: { id: messageId }
      });
    } catch (error) {
      logger.error('删除消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取可用模型列表
   */
  static getAvailableModels(): Array<{
    id: string;
    type: string;
    description: string;
    maxTokens?: number;
  }> {
    const zhipuModels = ZhipuAIService.getAvailableModels();
    const doubaoModels = DoubaoAIService.getAvailableModels();

    return [...zhipuModels, ...doubaoModels];
  }
}
