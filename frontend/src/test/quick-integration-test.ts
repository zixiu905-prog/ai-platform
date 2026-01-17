import { chatService } from '../services/chatService';
import { TestDataFactory, MockAPIResponses } from './utils/ChatTestUtils';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class QuickIntegrationTest {
  private results: TestResult[] = [];

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - startTime,
      });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });
      console.error(`❌ ${name} - FAILED:`, error);
    }
  }

  private async testBackendConnection(): Promise<void> {
    const response = await fetch('http://127.0.0.1:3001/api/test/db-status');
    if (!response.ok) {
      throw new Error(`Backend connection failed: ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Backend status check failed: ${data.message}`);
    }
  }

  private async testAPIEndpoints(): Promise<void> {
    const endpoints = [
      '/api/test/db-status',
      '/api/test/ai-config', 
      '/api/test/models',
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(`http://127.0.0.1:3001${endpoint}`);
      if (!response.ok) {
        throw new Error(`Endpoint ${endpoint} returned ${response.status}`);
      }
    }
  }

  private async testChatServiceCreation(): Promise<void> {
    // Test that chatService is properly instantiated
    if (!chatService) {
      throw new Error('ChatService not properly instantiated');
    }

    // Test method existence
    const requiredMethods = [
      'getConversations',
      'createConversation', 
      'sendMessage',
      'getAvailableModels',
      'sendMessageStream',
    ];

    for (const method of requiredMethods) {
      if (typeof (chatService as any)[method] !== 'function') {
        throw new Error(`ChatService missing method: ${method}`);
      }
    }
  }

  private async testDataFactory(): Promise<void> {
    // Test TestDataFactory
    const userMessage = TestDataFactory.createUserMessage();
    const assistantMessage = TestDataFactory.createAssistantMessage();
    const conversation = TestDataFactory.createConversation();
    const model = TestDataFactory.createModel();

    if (!userMessage.id || !assistantMessage.id || !conversation.id || !model.id) {
      throw new Error('TestDataFactory created invalid data');
    }

    // Test batch creation
    const conversations = TestDataFactory.createConversationHistory(5);
    const messages = TestDataFactory.createMessageHistory(10);

    if (conversations.length !== 5 || messages.length !== 10) {
      throw new Error('TestDataFactory batch creation failed');
    }
  }

  private async testMockAPIResponses(): Promise<void> {
    const conversation = TestDataFactory.createConversation();
    const message = TestDataFactory.createAssistantMessage();

    const response = MockAPIResponses.getChatResponse(message, conversation);
    
    if (!response.message || !response.conversation || !response.usage) {
      throw new Error('MockAPIResponses created invalid response');
    }

    const conversationsResponse = MockAPIResponses.getConversationsResponse([conversation]);
    if (conversationsResponse.conversations.length !== 1) {
      throw new Error('MockAPIResponses conversations response invalid');
    }
  }

  private async testErrorHandling(): Promise<void> {
    try {
      await fetch('http://127.0.0.1:3001/api/nonexistent-endpoint');
      // If we get here, the error handling test needs adjustment
      const response = await fetch('http://127.0.0.1:3001/api/nonexistent-endpoint');
      if (response.ok) {
        throw new Error('Expected 404 but got success');
      }
    } catch (error) {
      // Expected - network error or 404
      if (!(error instanceof Error)) {
        throw new Error('Error handling test failed - invalid error type');
      }
    }
  }

  private async testPerformance(): Promise<void> {
    const startTime = performance.now();
    
    // Create a large number of test objects
    const conversations = TestDataFactory.createConversationHistory(100);
    const messages = TestDataFactory.createMessageHistory(200);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (conversations.length !== 100 || messages.length !== 200) {
      throw new Error('Performance test data creation failed');
    }
    
    // Should complete within 100ms
    if (duration > 100) {
      throw new Error(`Performance test too slow: ${duration.toFixed(2)}ms`);
    }
  }

  private async testTypeSafety(): Promise<void> {
    // Test that our types are properly structured
    const conversation = TestDataFactory.createConversation();
    
    // Check required fields
    const requiredFields = ['id', 'userId', 'title', 'model', 'settings', 'isActive'];
    for (const field of requiredFields) {
      if (!(field in conversation)) {
        throw new Error(`Conversation missing required field: ${field}`);
      }
    }

    const message = TestDataFactory.createUserMessage();
    const messageRequiredFields = ['id', 'conversationId', 'role', 'content', 'status'];
    for (const field of messageRequiredFields) {
      if (!(field in message)) {
        throw new Error(`Message missing required field: ${field}`);
      }
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Quick Integration Tests...\n');

    await this.runTest('Backend Connection', () => this.testBackendConnection());
    await this.runTest('API Endpoints', () => this.testAPIEndpoints());
    await this.runTest('ChatService Creation', () => this.testChatServiceCreation());
    await this.runTest('TestDataFactory', () => this.testDataFactory());
    await this.runTest('MockAPIResponses', () => this.testMockAPIResponses());
    await this.runTest('Error Handling', () => this.testErrorHandling());
    await this.runTest('Performance', () => this.testPerformance());
    await this.runTest('Type Safety', () => this.testTypeSafety());

    this.printResults();
  }

  private printResults(): void {
    console.log('\n📊 Test Results:');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => r.passed).length;
    const total = this.results.length;

    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = `(${result.duration}ms)`;
      console.log(`${status} ${result.name.padEnd(25)} ${duration}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('='.repeat(50));
    console.log(`Total: ${total}, Passed: ${passed}, Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);

    if (failed === 0) {
      console.log('\n🎉 All tests passed! Integration is working correctly.');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Please check the errors above.`);
    }
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  const testRunner = new QuickIntegrationTest();
  testRunner.runAllTests().catch(console.error);
}

export { QuickIntegrationTest };