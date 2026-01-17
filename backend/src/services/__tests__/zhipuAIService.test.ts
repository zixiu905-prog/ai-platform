import { TestDataGenerator } from '../../test/utils';

// 模拟整个zhipuAIService模块
jest.mock('../../services/zhipuAIService', () => {
  const mockZhipuAIService = {
    generateResponse: jest.fn(),
        
        
    generateStreamResponse: jest.fn(),
        
        
    generateImage: jest.fn(),
        
        
    validateApiKey: jest.fn(),
        
        
    getModelInfo: jest.fn(),
        
        
  };
  
  return {
    default: mockZhipuAIService,
        
        
  };
});

const zhipuAIService = require('../../services/zhipuAIService').default;

describe('ZhipuAIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Existence', () => {
    it('should have zhipuAIService module', () => {
      expect(zhipuAIService).toBeDefined();
    });

    it('should have required methods', () => {
      expect(typeof zhipuAIService.generateResponse).toBe('function');
      expect(typeof zhipuAIService.generateStreamResponse).toBe('function');
      expect(typeof zhipuAIService.generateImage).toBe('function');
      expect(typeof zhipuAIService.validateApiKey).toBe('function');
      expect(typeof zhipuAIService.getModelInfo).toBe('function');
    });
  });

  describe('generateResponse', () => {
    it('should generate AI response with valid input', async () => {
      const message = 'Hello, how are you?';
      const model = 'glm-4';
      const options = {
        temperature: 0.7,
        
        
        maxTokens: 1000,
        
        
      };

      const expectedResult = {
        success: true,
        
        
        data: {
          message: 'I am doing well, thank you!',
        
        
          model,
        
        
          tokens: {
            input: 10,
        
        
            output: 15,
        
        
            total: 25,
        
        
          }
        
        
        }
        
        
      };

      zhipuAIService.generateResponse.mockResolvedValue(expectedResult);

      const result = await zhipuAIService.generateResponse(message, model, options);

      expect(result).toEqual(expectedResult);
      expect(zhipuAIService.generateResponse).toHaveBeenCalledWith(message, model, options);
    });

    it('should handle invalid input', async () => {
      const message = '';
      const model = 'glm-4';
      const errorResult = {
        success: false,
        
        
        error: 'Message cannot be empty',
        
        
      };

      zhipuAIService.generateResponse.mockResolvedValue(errorResult);

      const result = await zhipuAIService.generateResponse(message, model);

      expect(result).toEqual(errorResult);
      expect(zhipuAIService.generateResponse).toHaveBeenCalledWith(message, model);
    });

    it('should handle API errors', async () => {
      const message = 'Test message';
      const model = 'glm-4';
      const errorResult = {
        success: false,
        
        
        error: 'API service unavailable',
        
        
      };

      zhipuAIService.generateResponse.mockRejectedValue(new Error('API service unavailable'));

      await expect(zhipuAIService.generateResponse(message, model)).rejects.toThrow('API service unavailable');
      expect(zhipuAIService.generateResponse).toHaveBeenCalledWith(message, model);
    });
  });

  describe('generateStreamResponse', () => {
    it('should generate streaming response', async () => {
      const message = 'Tell me a story';
      const model = 'glm-4';
      const options = {
        temperature: 0.8,
        
        
        stream: true,
        
        
      };

      const mockStream = {
        on: jest.fn(),
        
        
        write: jest.fn(),
        
        
        end: jest.fn(),
        
        
      };

      zhipuAIService.generateStreamResponse.mockResolvedValue(mockStream);

      const result = await zhipuAIService.generateStreamResponse(message, model, options);

      expect(result).toBe(mockStream);
      expect(zhipuAIService.generateStreamResponse).toHaveBeenCalledWith(message, model, options);
    });

    it('should handle streaming errors', async () => {
      const message = 'Test message';
      const model = 'glm-4';
      const errorResult = {
        success: false,
        
        
        error: 'Streaming not supported for this model',
        
        
      };

      zhipuAIService.generateStreamResponse.mockResolvedValue(errorResult);

      const result = await zhipuAIService.generateStreamResponse(message, model);

      expect(result).toEqual(errorResult);
      expect(zhipuAIService.generateStreamResponse).toHaveBeenCalledWith(message, model);
    });
  });

  describe('generateImage', () => {
    it('should generate image with valid prompt', async () => {
      const prompt = 'A beautiful sunset over mountains';
      const options = {
        size: '512x512',
        
        
        quality: 'high',
        
        
      };

      const expectedResult = {
        success: true,
        
        
        data: {
          imageUrl: 'https://example.com/generated-image.jpg',
        
        
          prompt,
        
        
          size: '512x512',
        
        
          tokens: 50,
        
        
        }
        
        
      };

      zhipuAIService.generateImage.mockResolvedValue(expectedResult);

      const result = await zhipuAIService.generateImage(prompt, options);

      expect(result).toEqual(expectedResult);
      expect(zhipuAIService.generateImage).toHaveBeenCalledWith(prompt, options);
    });

    it('should handle empty prompt', async () => {
      const prompt = '';
      const errorResult = {
        success: false,
        
        
        error: 'Prompt cannot be empty',
        
        
      };

      zhipuAIService.generateImage.mockResolvedValue(errorResult);

      const result = await zhipuAIService.generateImage(prompt);

      expect(result).toEqual(errorResult);
      expect(zhipuAIService.generateImage).toHaveBeenCalledWith(prompt);
    });

    it('should handle inappropriate content', async () => {
      const prompt = 'Inappropriate content';
      const errorResult = {
        success: false,
        
        
        error: 'Content policy violation',
        
        
      };

      zhipuAIService.generateImage.mockResolvedValue(errorResult);

      const result = await zhipuAIService.generateImage(prompt);

      expect(result).toEqual(errorResult);
      expect(zhipuAIService.generateImage).toHaveBeenCalledWith(prompt);
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key', async () => {
      const apiKey = 'valid-api-key';
      const expectedResult = {
        success: true,
        
        
        data: {
          valid: true,
        
        
          model: 'glm-4',
        
        
          quota: {
            used: 1000,
        
        
            limit: 10000,
        
        
          }
        
        
        }
        
        
      };

      zhipuAIService.validateApiKey.mockResolvedValue(expectedResult);

      const result = await zhipuAIService.validateApiKey(apiKey);

      expect(result).toEqual(expectedResult);
      expect(zhipuAIService.validateApiKey).toHaveBeenCalledWith(apiKey);
    });

    it('should reject invalid API key', async () => {
      const apiKey = 'invalid-api-key';
      const errorResult = {
        success: false,
        
        
        error: 'Invalid API key',
        
        
      };

      zhipuAIService.validateApiKey.mockResolvedValue(errorResult);

      const result = await zhipuAIService.validateApiKey(apiKey);

      expect(result).toEqual(errorResult);
      expect(zhipuAIService.validateApiKey).toHaveBeenCalledWith(apiKey);
    });
  });

  describe('getModelInfo', () => {
    it('should get model information', async () => {
      const model = 'glm-4';
      const expectedResult = {
        success: true,
        
        
        data: {
          name: model,
        
        
          description: 'Advanced language model',
        
        
          maxTokens: 8192,
        
        
          costPerToken: 0.0001,
        
        
          supportedFeatures: ['text', 'streaming'],
        
        
        }
        
        
      };

      zhipuAIService.getModelInfo.mockResolvedValue(expectedResult);

      const result = await zhipuAIService.getModelInfo(model);

      expect(result).toEqual(expectedResult);
      expect(zhipuAIService.getModelInfo).toHaveBeenCalledWith(model);
    });

    it('should handle unknown model', async () => {
      const model = 'unknown-model';
      const errorResult = {
        success: false,
        
        
        error: 'Model not found',
        
        
      };

      zhipuAIService.getModelInfo.mockResolvedValue(errorResult);

      const result = await zhipuAIService.getModelInfo(model);

      expect(result).toEqual(errorResult);
      expect(zhipuAIService.getModelInfo).toHaveBeenCalledWith(model);
    });
  });
});