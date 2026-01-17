import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ChatProvider } from '../../contexts/ChatContext';
import { Message, Conversation, AIModel } from '../../types/chat';
import { chatService } from '../../services/chatService';

// Mock data factory
export class TestDataFactory {
  static createUserMessage(overrides: Partial<Message> = {}): Message {
    return {
      id: 'user-msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: '用户消息',
      status: 'sent',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      ...overrides,
    };
  }

  static createAssistantMessage(overrides: Partial<Message> = {}): Message {
    return {
      id: 'assistant-msg-1',
      conversationId: 'conv-1',
      role: 'assistant',
      content: 'AI回复',
      status: 'completed',
      createdAt: new Date('2024-01-01T10:00:01Z'),
      updatedAt: new Date('2024-01-01T10:00:01Z'),
      ...overrides,
    };
  }

  static createConversation(overrides: Partial<Conversation> = {}): Conversation {
    return {
      id: 'conv-1',
      userId: 'user-1',
      title: '测试对话',
      model: 'glm-4',
      settings: { temperature: 0.7, maxTokens: 4000 },
      isActive: true,
      messageCount: 2,
      totalTokens: 100,
      totalCost: 0.01,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:01Z'),
      messages: [],
      ...overrides,
    };
  }

  static createModel(overrides: Partial<AIModel> = {}): AIModel {
    return {
      id: 'glm-4',
      type: 'text',
      description: 'GLM-4 旗舰文本模型',
      maxTokens: 128000,
      ...overrides,
    };
  }

  static createConversationHistory(count: number): Conversation[] {
    return Array.from({ length: count }, (_, i) =>
      this.createConversation({
        id: `conv-${i}`,
        title: `对话 ${i + 1}`,
        createdAt: new Date(Date.now() - i * 1000 * 60 * 60),
      })
    );
  }

  static createMessageHistory(count: number, conversationId: string = 'conv-1'): Message[] {
    return Array.from({ length: count }, (_, i) => {
      const isUser = i % 2 === 0;
      return isUser
        ? this.createUserMessage({
            id: `msg-${i}`,
            conversationId,
            content: `用户消息 ${Math.floor(i / 2) + 1}`,
          })
        : this.createAssistantMessage({
            id: `msg-${i}`,
            conversationId,
            content: `AI回复 ${Math.floor(i / 2) + 1}`,
          });
    });
  }
}

// Mock API responses
export class MockAPIResponses {
  static getConversationsResponse(conversations: Conversation[], total: number = conversations.length) {
    return {
      conversations,
      total,
      hasMore: false,
    };
  }

  static getMessagesResponse(messages: Message[], total: number = messages.length) {
    return {
      messages,
      total,
    };
  }

  static getChatResponse(message: Message, conversation: Conversation) {
    return {
      message,
      conversation,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        cost: 0.003,
      },
    };
  }
}

// Test utilities
export class ChatTestUtils {
  static renderWithChatProvider(
    ui: React.ReactElement,
    options?: RenderOptions
  ) {
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ChatProvider>
        {children}
      </ChatProvider>
    );

    return render(ui, { wrapper: Wrapper, ...options });
  }

  static async waitForMessageContent(content: string, timeout: number = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for message content: ${content}`));
      }, timeout);

      const checkInterval = setInterval(() => {
        const element = document.querySelector(`[data-content="${content}"]`);
        if (element) {
          clearTimeout(timeoutId);
          clearInterval(checkInterval);
          resolve(element);
        }
      }, 100);
    });
  }

  static mockLocalStorage() {
    const store: Record<string, string> = {};
    
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
    };
  }

  static createMockStream(chunks: string[]) {
    const encoder = new TextEncoder();
    let index = 0;

    return {
      async read() {
        if (index >= chunks.length) {
          return { done: true };
        }
        
        const chunk = chunks[index++];
        return {
          done: false,
          value: encoder.encode(chunk),
        };
      },
    };
  }

  static simulateTyping(element: HTMLElement, text: string, delay: number = 50) {
    return new Promise<void>((resolve) => {
      let index = 0;
      
      const typeChar = () => {
        if (index < text.length) {
          const input = element as HTMLInputElement;
          input.value += text[index];
          fireEvent.change(input, { target: { value: input.value } });
          index++;
          setTimeout(typeChar, delay);
        } else {
          resolve();
        }
      };
      
      typeChar();
    });
  }
}

// Performance testing utilities
export class PerformanceUtils {
  static measureRenderTime(renderFn: () => void): number {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    return end - start;
  }

  static async measureAsyncRenderTime(renderFn: () => Promise<void>): Promise<number> {
    const start = performance.now();
    await renderFn();
    const end = performance.now();
    return end - start;
  }

  static createPerformanceBenchmark(testName: string, iterations: number = 100) {
    return {
      async run(testFn: () => void | Promise<void>) {
        const times: number[] = [];
        
        for (let i = 0; i < iterations; i++) {
          const time = typeof testFn() === 'object'
            ? await this.measureAsyncRenderTime(testFn as () => Promise<void>)
            : this.measureRenderTime(testFn as () => void);
          times.push(time);
        }
        
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        return {
          testName,
          iterations,
          average: avg,
          min,
          max,
          times,
        };
      },
    };
  }
}

// Error simulation utilities
export class ErrorSimulator {
  static simulateNetworkError(message: string = 'Network Error') {
    return new Error(message);
  }

  static simulateServerError(status: number, message: string) {
    const error = new Error(`Server Error: ${status} - ${message}`);
    (error as any).status = status;
    return error;
  }

  static simulateTimeoutError(timeout: number = 5000) {
    return new Error(`Request timeout after ${timeout}ms`);
  }

  static simulateRateLimitError() {
    return new Error('Rate limit exceeded. Please try again later.');
  }
}

// Accessibility testing utilities
export class AccessibilityUtils {
  static checkKeyboardNavigation(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const results = {
      totalFocusable: focusableElements.length,
      hasTabIndex: focusableElements.length > 0,
      canFocusFirst: true,
      canFocusLast: true,
    };

    if (focusableElements.length > 0) {
      const first = focusableElements[0] as HTMLElement;
      const last = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      try {
        first.focus();
        results.canFocusFirst = document.activeElement === first;
        
        last.focus();
        results.canFocusLast = document.activeElement === last;
      } catch (error) {
        results.canFocusFirst = false;
        results.canFocusLast = false;
      }
    }

    return results;
  }

  static checkAriaLabels(container: HTMLElement) {
    const elementsWithAria = container.querySelectorAll('[aria-label], [aria-labelledby], [title]');
    const inputs = container.querySelectorAll('input, textarea, select');
    
    const labeledInputs = Array.from(inputs).filter(input => 
      input.hasAttribute('aria-label') ||
      input.hasAttribute('aria-labelledby') ||
      input.hasAttribute('title') ||
      input.closest('label') ||
      input.id && container.querySelector(`label[for="${input.id}"]`)
    );

    return {
      totalElementsWithAria: elementsWithAria.length,
      totalInputs: inputs.length,
      labeledInputs: labeledInputs.length,
      accessibilityScore: inputs.length > 0 ? (labeledInputs.length / inputs.length) * 100 : 100,
    };
  }
}