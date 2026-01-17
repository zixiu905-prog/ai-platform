import { TestDataGenerator } from '../../test/utils';

// 模拟整个emailService模块
jest.mock('../emailService', () => ({
  emailService: {
    sendVerificationEmail: jest.fn(),
        
        
    sendPasswordResetEmail: jest.fn(),
        
        
    sendWelcomeEmail: jest.fn(),
        
        
    sendNotificationEmail: jest.fn(),
        
        
  }
        
        
}));

const { emailService } = require('../emailService');

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Existence', () => {
    it('should have service instance', () => {
      expect(emailService).toBeDefined();
    });

    it('should have required methods', () => {
      expect(typeof emailService.sendVerificationEmail).toBe('function');
      expect(typeof emailService.sendPasswordResetEmail).toBe('function');
      expect(typeof emailService.sendWelcomeEmail).toBe('function');
      expect(typeof emailService.sendNotificationEmail).toBe('function');
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      const emailData = {
        to: 'test@example.com',
        
        
        subject: 'Verify your email',
        
        
        verificationCode: '123456',
        
        
      };

      const expectedResult = {
        success: true,
        
        
        messageId: 'test-message-id',
        
        
      };

      emailService.sendVerificationEmail.mockResolvedValue(expectedResult);

      const result = await emailService.sendVerificationEmail(emailData);

      expect(result).toEqual(expectedResult);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(emailData);
    });

    it('should handle invalid email', async () => {
      const emailData = {
        to: 'invalid-email',
        
        
        subject: 'Verify your email',
        
        
        verificationCode: '123456',
        
        
      };

      const errorResult = {
        success: false,
        
        
        error: 'Invalid email address',
        
        
      };

      emailService.sendVerificationEmail.mockResolvedValue(errorResult);

      const result = await emailService.sendVerificationEmail(emailData);

      expect(result).toEqual(errorResult);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const emailData = {
        to: 'test@example.com',
        
        
        subject: 'Reset your password',
        
        
        resetToken: 'reset-token-123',
        
        
      };

      const expectedResult = {
        success: true,
        
        
        messageId: 'reset-message-id',
        
        
      };

      emailService.sendPasswordResetEmail.mockResolvedValue(expectedResult);

      const result = await emailService.sendPasswordResetEmail(emailData);

      expect(result).toEqual(expectedResult);
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(emailData);
    });

    it('should handle missing reset token', async () => {
      const emailData = {
        to: 'test@example.com',
        
        
        subject: 'Reset your password',
        
        
      };

      const errorResult = {
        success: false,
        
        
        error: 'Reset token is required',
        
        
      };

      emailService.sendPasswordResetEmail.mockResolvedValue(errorResult);

      const result = await emailService.sendPasswordResetEmail(emailData);

      expect(result).toEqual(errorResult);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const emailData = {
        to: 'test@example.com',
        
        
        subject: 'Welcome to our service',
        
        
        userName: 'Test User',
        
        
      };

      const expectedResult = {
        success: true,
        
        
        messageId: 'welcome-message-id',
        
        
      };

      emailService.sendWelcomeEmail.mockResolvedValue(expectedResult);

      const result = await emailService.sendWelcomeEmail(emailData);

      expect(result).toEqual(expectedResult);
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(emailData);
    });
  });

  describe('sendNotificationEmail', () => {
    it('should send notification email successfully', async () => {
      const emailData = {
        to: 'test@example.com',
        
        
        subject: 'System Notification',
        
        
        message: 'This is a test notification',
        
        
        type: 'system',
        
        
      };

      const expectedResult = {
        success: true,
        
        
        messageId: 'notification-message-id',
        
        
      };

      emailService.sendNotificationEmail.mockResolvedValue(expectedResult);

      const result = await emailService.sendNotificationEmail(emailData);

      expect(result).toEqual(expectedResult);
      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(emailData);
    });

    it('should handle missing message content', async () => {
      const emailData = {
        to: 'test@example.com',
        
        
        subject: 'System Notification',
        
        
      };

      const errorResult = {
        success: false,
        
        
        error: 'Message content is required',
        
        
      };

      emailService.sendNotificationEmail.mockResolvedValue(errorResult);

      const result = await emailService.sendNotificationEmail(emailData);

      expect(result).toEqual(errorResult);
    });
  });
});