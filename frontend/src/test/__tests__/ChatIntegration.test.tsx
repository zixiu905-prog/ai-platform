import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatProvider } from '../../contexts/ChatContext';
import { ChatInterface } from '../../components/chat/ChatInterface';
import { Message, Conversation, AIModel } from '../../types/chat';
import { chatService } from '../../services/chatService';

// Mock chatService
jest.mock('../../services/chatService');
const mockChatService = chatService as jest.Mocked<typeof chatService>;

// Mock ScrollArea component
jest.mock('../../components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock MessageBubble and MessageInput
jest.mock('../../components/chat/MessageBubble', () => ({
  MessageBubble: ({ message, onRegenerate, onDelete }: any) => (
    <div data-testid={`message-${message.id}`}>
      <div data-testid="message-role">{message.role}</div>
      <div data-testid="message-content">{message.content}</div>
      {onRegenerate && <button data-testid="regenerate-btn" onClick={() => onRegenerate(message.id)}>Regenerate</button>}
      {onDelete && <button data-testid="delete-btn" onClick={() => onDelete(message.id)}>Delete</button>}
    </div>
  ),
}));

jest.mock('../../components/chat/MessageInput', () => ({
  MessageInput: ({ onSendMessage, disabled, placeholder }: any) => (
    <div>
      <input 
        data-testid="message-input" 
        placeholder={placeholder}
        disabled={disabled}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && e.target.value) {
            onSendMessage(e.target.value);
            e.target.value = '';
          }
        }}
      />
      <button 
        data-testid="send-button" 
        disabled={disabled}
        onClick={() => {
          const input = screen.getByTestId('message-input') as HTMLInputElement;
          if (input.value) {
            onSendMessage(input.value);
            input.value = '';
          }
        }}
      >
        Send
      </button>
    </div>
  ),
}));

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChatProvider>
    {children}
  </ChatProvider>
);

// Sample test data
const mockMessages: Message[] = [
  {
    id: '1',
    conversationId: 'conv1',
    role: 'user',
    content: '你好，AI助手',
    status: 'sent',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: '2',
    conversationId: 'conv1',
    role: 'assistant',
    content: '您好！我是AI助手，很高兴为您服务！',
    status: 'completed',
    createdAt: new Date('2024-01-01T10:00:01Z'),
    updatedAt: new Date('2024-01-01T10:00:01Z'),
  },
];

const mockModels: AIModel[] = [
  {
    id: 'glm-4',
    type: 'text',
    description: 'GLM-4 旗舰文本模型',
    maxTokens: 128000,
  },
  {
    id: 'glm-4-plus',
    type: 'text',
    description: 'GLM-4 Plus 增强版',
    maxTokens: 128000,
  },
];

describe('Chat Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ChatInterface Component', () => {
    it('renders empty chat correctly', () => {
      render(
        <TestWrapper>
          <ChatInterface 
            messages={[]} 
            onSendMessage={jest.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText('开始新对话')).toBeInTheDocument();
      expect(screen.getByText('输入消息开始与AI助手对话')).toBeInTheDocument();
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
      expect(screen.getByTestId('send-button')).toBeInTheDocument();
    });

    it('renders messages correctly', () => {
      render(
        <TestWrapper>
          <ChatInterface 
            messages={mockMessages} 
            onSendMessage={jest.fn()}
          />
        </TestWrapper>
      );

      // Check both messages are rendered
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-2')).toBeInTheDocument();
      
      // Check message content
      expect(screen.getByText('你好，AI助手')).toBeInTheDocument();
      expect(screen.getByText('您好！我是AI助手，很高兴为您服务！')).toBeInTheDocument();
      
      // Check message roles
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('assistant')).toBeInTheDocument();
    });

    it('handles message sending', async () => {
      const mockOnSendMessage = jest.fn();
      
      render(
        <TestWrapper>
          <ChatInterface 
            messages={mockMessages} 
            onSendMessage={mockOnSendMessage}
          />
        </TestWrapper>
      );

      const input = screen.getByTestId('message-input') as HTMLInputElement;
      const sendButton = screen.getByTestId('send-button');

      // Test typing and sending
      fireEvent.change(input, { target: { value: '新消息' } });
      expect(input.value).toBe('新消息');

      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('新消息');
        expect(input.value).toBe('');
      });
    });

    it('handles Enter key for sending', async () => {
      const mockOnSendMessage = jest.fn();
      
      render(
        <TestWrapper>
          <ChatInterface 
            messages={mockMessages} 
            onSendMessage={mockOnSendMessage}
          />
        </TestWrapper>
      );

      const input = screen.getByTestId('message-input') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'Enter测试' } });
      fireEvent.keyPress(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Enter测试');
      });
    });

    it('disables input when sending', () => {
      render(
        <TestWrapper>
          <ChatInterface 
            messages={mockMessages} 
            onSendMessage={jest.fn()}
            isSending={true}
          />
        </TestWrapper>
      );

      const input = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    it('shows loading state', () => {
      render(
        <TestWrapper>
          <ChatInterface 
            messages={[]} 
            onSendMessage={jest.fn()}
            isLoading={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('加载对话中...')).toBeInTheDocument();
    });

    it('handles message regeneration', () => {
      const mockOnRegenerate = jest.fn();
      
      render(
        <TestWrapper>
          <ChatInterface 
            messages={mockMessages} 
            onSendMessage={jest.fn()}
            onRegenerateMessage={mockOnRegenerate}
          />
        </TestWrapper>
      );

      const regenerateBtns = screen.getAllByTestId('regenerate-btn');
      fireEvent.click(regenerateBtns[0]);
      
      expect(mockOnRegenerate).toHaveBeenCalledWith('1');
    });

    it('handles message deletion', () => {
      const mockOnDelete = jest.fn();
      
      render(
        <TestWrapper>
          <ChatInterface 
            messages={mockMessages} 
            onSendMessage={jest.fn()}
            onDeleteMessage={mockOnDelete}
          />
        </TestWrapper>
      );

      const deleteBtns = screen.getAllByTestId('delete-btn');
      fireEvent.click(deleteBtns[1]);
      
      expect(mockOnDelete).toHaveBeenCalledWith('2');
    });
  });

  describe('ChatService Integration', () => {
    it('fetches conversations successfully', async () => {
      const mockConversations: Conversation[] = [
        {
          id: 'conv1',
          userId: 'user1',
          title: '测试对话',
          model: 'glm-4',
          settings: { temperature: 0.7 },
          isActive: true,
          messageCount: 2,
          totalTokens: 100,
          totalCost: 0.01,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: mockMessages,
        },
      ];

      mockChatService.getConversations.mockResolvedValue({
        conversations: mockConversations,
        total: 1,
        hasMore: false,
      });

      const result = await mockChatService.getConversations();
      
      expect(mockChatService.getConversations).toHaveBeenCalledWith(1, 20);
      expect(result.conversations).toEqual(mockConversations);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('creates new conversation successfully', async () => {
      const newConversation: Conversation = {
        id: 'conv2',
        userId: 'user1',
        title: '新对话',
        model: 'glm-4',
        settings: { temperature: 0.7 },
        isActive: true,
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
      };

      mockChatService.createConversation.mockResolvedValue(newConversation);

      const result = await mockChatService.createConversation('新对话', { temperature: 0.7 });
      
      expect(mockChatService.createConversation).toHaveBeenCalledWith('新对话', { temperature: 0.7 });
      expect(result).toEqual(newConversation);
    });

    it('sends message successfully', async () => {
      const mockResponse = {
        message: {
          id: '3',
          conversationId: 'conv1',
          role: 'assistant',
          content: 'AI回复',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        conversation: mockMessages[0],
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25,
          cost: 0.0025,
        },
      };

      mockChatService.sendMessage.mockResolvedValue(mockResponse);

      const result = await mockChatService.sendMessage({
        message: '测试消息',
        conversationId: 'conv1',
      });
      
      expect(mockChatService.sendMessage).toHaveBeenCalledWith({
        message: '测试消息',
        conversationId: 'conv1',
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles streaming message', async () => {
      const onMessage = jest.fn();
      const onComplete = jest.fn();
      const onError = jest.fn();

      // Mock fetch for streaming
      global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ 
            done: false, 
            value: new TextEncoder().encode('data: {"type":"content","content":"Hello"}\n') 
          })
          .mockResolvedValueOnce({ 
            done: false, 
            value: new TextEncoder().encode('data: {"type":"complete","data":{"message":{"id":"msg1","content":"Hello World"}}}\n') 
          })
          .mockResolvedValueOnce({ done: true })
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader
        }
      });

      await mockChatService.sendMessageStream(
        { message: 'Test', conversationId: 'conv1' },
        onMessage,
        onComplete,
        onError
      );

      expect(onMessage).toHaveBeenCalledWith('Hello');
      expect(onComplete).toHaveBeenCalledWith({
        message: { id: 'msg1', content: 'Hello World' }
      });
    });

    it('fetches available models', async () => {
      mockChatService.getAvailableModels.mockResolvedValue(mockModels);

      const result = await mockChatService.getAvailableModels();
      
      expect(mockChatService.getAvailableModels).toHaveBeenCalled();
      expect(result).toEqual(mockModels);
      expect(result).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('handles service errors gracefully', async () => {
      mockChatService.getConversations.mockRejectedValue(new Error('Network error'));

      await expect(mockChatService.getConversations()).rejects.toThrow('Network error');
    });

    it('handles streaming errors', async () => {
      const onError = jest.fn();
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await mockChatService.sendMessageStream(
        { message: 'Test', conversationId: 'conv1' },
        jest.fn(),
        jest.fn(),
        onError
      );

      expect(onError).toHaveBeenCalledWith('HTTP error! status: 500');
    });
  });
});