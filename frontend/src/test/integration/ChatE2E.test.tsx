import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatProvider } from '../../contexts/ChatContext';
import { Chat } from '../../pages/Chat';
import { chatService } from '../../services/chatService';

// Mock the chat service
jest.mock('../../services/chatService');
const mockChatService = chatService as jest.Mocked<typeof chatService>;

// Mock the API
jest.mock('../../lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ conversationId: 'test-conv-id' }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChatProvider>
    {children}
  </ChatProvider>
);

// Mock data
const mockConversation = {
  id: 'test-conv-id',
  userId: 'test-user-id',
  title: '测试对话',
  model: 'glm-4',
  settings: { temperature: 0.7, maxTokens: 4000 },
  isActive: true,
  messageCount: 2,
  totalTokens: 100,
  totalCost: 0.01,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  messages: [
    {
      id: '1',
      conversationId: 'test-conv-id',
      role: 'user' as const,
      content: '你好，AI助手',
      status: 'sent' as const,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: '2',
      conversationId: 'test-conv-id',
      role: 'assistant' as const,
      content: '您好！我是AI助手，很高兴为您服务！',
      status: 'completed' as const,
      createdAt: new Date('2024-01-01T10:00:01Z'),
      updatedAt: new Date('2024-01-01T10:00:01Z'),
    },
  ],
};

const mockModels = [
  {
    id: 'glm-4',
    type: 'text' as const,
    description: 'GLM-4 旗舰文本模型',
    maxTokens: 128000,
  },
  {
    id: 'glm-4-plus',
    type: 'text' as const,
    description: 'GLM-4 Plus 增强版',
    maxTokens: 128000,
  },
];

describe('Chat End-to-End Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  describe('Full Chat Flow', () => {
    it('loads conversation and displays messages', async () => {
      mockChatService.getConversation.mockResolvedValue(mockConversation);
      mockChatService.getAvailableModels.mockResolvedValue(mockModels);

      render(
        <TestWrapper>
          <Chat />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('测试对话')).toBeInTheDocument();
      });

      // Check messages are displayed
      expect(screen.getByText('你好，AI助手')).toBeInTheDocument();
      expect(screen.getByText('您好！我是AI助手，很高兴为您服务！')).toBeInTheDocument();
    });

    it('creates new conversation when no ID provided', async () => {
      mockChatService.getAvailableModels.mockResolvedValue(mockModels);
      mockChatService.createConversation.mockResolvedValue({
        ...mockConversation,
        id: 'new-conv-id',
        title: '新对话',
        messages: [],
      });

      // Mock useParams to return undefined
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useParams: () => ({}),
      }));

      render(
        <TestWrapper>
          <Chat />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChatService.createConversation).toHaveBeenCalledWith();
      });
    });

    it('sends message and receives response', async () => {
      mockChatService.getConversation.mockResolvedValue(mockConversation);
      mockChatService.getAvailableModels.mockResolvedValue(mockModels);

      const mockResponse = {
        message: {
          id: '3',
          conversationId: 'test-conv-id',
          role: 'assistant' as const,
          content: '这是我的回复',
          status: 'completed' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        conversation: mockConversation,
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
          cost: 0.003,
        },
      };

      mockChatService.sendMessage.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <Chat />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('测试对话')).toBeInTheDocument();
      });

      // Find and fill message input
      const messageInput = screen.getByPlaceholderText(/输入消息/) as HTMLInputElement;
      fireEvent.change(messageInput, { target: { value: '新消息测试' } });

      // Send message
      const sendButton = screen.getByText('发送');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockChatService.sendMessage).toHaveBeenCalledWith({
          message: '新消息测试',
          conversationId: 'test-conv-id',
        });
      });
    });

    it('handles streaming messages', async () => {
      mockChatService.getConversation.mockResolvedValue(mockConversation);
      mockChatService.getAvailableModels.mockResolvedValue(mockModels);

      // Mock fetch for streaming
      global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
      let streamController: ReadableStreamDefaultController<any>;

      const mockStream = new ReadableStream({
        start(controller) {
          streamController = controller;
        }
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: {"type":"content","content":"流式"}\n')
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: {"type":"content","content":"回复"}\n')
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: {"type":"complete","data":{"message":{"id":"4","content":"流式回复"}}}\n')
              })
              .mockResolvedValueOnce({ done: true })
          })
        }
      });

      render(
        <TestWrapper>
          <Chat />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('您好！我是AI助手，很高兴为您服务！')).toBeInTheDocument();
      });

      // Send streaming message
      const messageInput = screen.getByPlaceholderText(/输入消息/) as HTMLInputElement;
      fireEvent.change(messageInput, { target: { value: '测试流式回复' } });

      const sendButton = screen.getByText('发送');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Error Scenarios', () => {
    it('handles conversation loading error', async () => {
      mockChatService.getConversation.mockRejectedValue(new Error('Conversation not found'));
      mockChatService.getAvailableModels.mockResolvedValue(mockModels);

      render(
        <TestWrapper>
          <Chat />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/加载失败/)).toBeInTheDocument();
      });
    });

    it('handles message sending error', async () => {
      mockChatService.getConversation.mockResolvedValue(mockConversation);
      mockChatService.getAvailableModels.mockResolvedValue(mockModels);
      mockChatService.sendMessage.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <Chat />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('您好！我是AI助手，很高兴为您服务！')).toBeInTheDocument();
      });

      const messageInput = screen.getByPlaceholderText(/输入消息/) as HTMLInputElement;
      fireEvent.change(messageInput, { target: { value: '错误测试' } });

      const sendButton = screen.getByText('发送');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/消息发送失败/)).toBeInTheDocument();
      });
    });

    it('handles empty message submission', async () => {
      mockChatService.getConversation.mockResolvedValue(mockConversation);
      mockChatService.getAvailableModels.mockResolvedValue(mockModels);

      render(
        <TestWrapper>
          <Chat />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('测试对话')).toBeInTheDocument();
      });

      const sendButton = screen.getByText('发送');
      fireEvent.click(sendButton);

      // Should not call sendMessage for empty message
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Settings Integration', () => {
    it('changes AI model', async () => {
      mockChatService.getConversation.mockResolvedValue(mockConversation);
      mockChatService.getAvailableModels.mockResolvedValue(mockModels);

      render(
        <TestWrapper>
          <Chat />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('测试对话')).toBeInTheDocument();
      });

      // Open settings
      const settingsButton = screen.getByText('设置');
      fireEvent.click(settingsButton);

      // Change model
      await waitFor(() => {
        const modelSelect = screen.getByDisplayValue('GLM-4 旗舰文本模型');
        fireEvent.change(modelSelect, { target: { value: 'glm-4-plus' } });
      });

      // Save settings
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockChatService.updateConversation).toHaveBeenCalledWith('test-conv-id', {
          model: 'glm-4-plus',
          settings: expect.objectContaining({}),
        });
      });
    });

    it('updates conversation settings', async () => {
      mockChatService.getConversation.mockResolvedValue(mockConversation);
      mockChatService.getAvailableModels.mockResolvedValue(mockModels);

      render(
        <TestWrapper>
          <Chat />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('测试对话')).toBeInTheDocument();
      });

      // Open settings
      const settingsButton = screen.getByText('设置');
      fireEvent.click(settingsButton);

      // Change temperature
      await waitFor(() => {
        const temperatureSlider = screen.getByDisplayValue('0.7');
        fireEvent.change(temperatureSlider, { target: { value: '0.9' } });
      });

      // Save settings
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockChatService.updateConversation).toHaveBeenCalledWith('test-conv-id', {
          settings: expect.objectContaining({
            temperature: 0.9,
          }),
        });
      });
    });
  });

  describe('Performance Tests', () => {
    it('handles large number of messages', async () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        conversationId: 'test-conv-id',
        role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `Message ${i + 1}`,
        status: 'completed' as const,
        createdAt: new Date(Date.now() - i * 1000),
        updatedAt: new Date(Date.now() - i * 1000),
      }));

      const conversationWithManyMessages = {
        ...mockConversation,
        messages: manyMessages,
        messageCount: 100,
      };

      mockChatService.getConversation.mockResolvedValue(conversationWithManyMessages);
      mockChatService.getAvailableModels.mockResolvedValue(mockModels);

      const startTime = performance.now();

      render(
        <TestWrapper>
          <Chat />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Message 1')).toBeInTheDocument();
        expect(screen.getByText('Message 100')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });
  });
});