// AI对话功能相关类型定义

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  conversationId: string;
  status?: 'sending' | 'sent' | 'failed' | 'processing';
  metadata?: {
    model?: string;
    tokens?: number;
    cost?: number;
    latency?: number;
  };
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  settings?: ConversationSettings;
  metadata?: {
    messageCount: number;
    totalTokens: number;
    totalCost: number;
  };
}

export interface ConversationSettings {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  enableMemory?: boolean;
  enableSearch?: boolean;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  settings?: Partial<ConversationSettings>;
  stream?: boolean;
}

export interface ChatResponse {
  message: Message;
  conversation: Conversation;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
}

export interface ChatStreamResponse {
  id: string;
  event: 'message' | 'error' | 'done';
  data: {
    content?: string;
    message?: Message;
    conversation?: Conversation;
    error?: string;
  };
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  settings: ConversationSettings;
}

export interface ChatAction {
  type: 'SET_CONVERSATIONS' | 'ADD_CONVERSATION' | 'UPDATE_CONVERSATION' | 
       'DELETE_CONVERSATION' | 'SET_CURRENT_CONVERSATION' | 'ADD_MESSAGE' | 
       'UPDATE_MESSAGE' | 'SET_LOADING' | 'SET_SENDING' | 'SET_ERROR' | 
       'UPDATE_SETTINGS' | 'CLEAR_ERROR';
  payload?: any;
}

// AI模型配置
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  costPerToken: number;
  capabilities: string[];
}

export const DEFAULT_SETTINGS: ConversationSettings = {
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: '',
  enableMemory: true,
  enableSearch: false,
};

// 预设的系统提示词
export const SYSTEM_PROMPTS = {
  general: '你是一个有用的AI助手，能够回答各种问题并提供帮助。',
  creative: '你是一个富有创造力的AI，擅长生成创意内容、故事和想法。',
  technical: '你是一个技术专家，擅长编程、系统设计和技术问题解决。',
  analysis: '你是一个分析师，擅长数据分析、市场研究和商业洞察。',
};