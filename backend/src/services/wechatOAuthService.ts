import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export interface LoginResult {
  user: any;
  isNewUser: boolean;
}

export class WechatOAuthService {
  async getAuthorizeUrl(state: string): Promise<string> {
    return 'https://open.weixin.qq.com/mock';
  }

  static getOAuthConfig() {
    return {
      isConfigured: false
    };
  }

  static generateState(): string {
    return 'mock-state-' + Date.now();
  }

  static generateAuthUrl(state: string): string {
    return 'https://open.weixin.qq.com/connect/oauth2/authorize?state=' + state;
  }

  static async handleWechatLogin(code: string, state: string, currentUserId?: string): Promise<LoginResult> {
    logger.warn('WechatOAuthService.handleWechatLogin - WeChat OAuth not implemented');
    // Mock implementation
    const mockUser = await prisma.users.findFirst();
    if (!mockUser) {
      throw new Error('No users found for mock login');
    }
    return {
      user: mockUser,
      isNewUser: false
    };
  }

  static async unlinkWechatAccount(userId: string): Promise<void> {
    logger.warn('WechatOAuthService.unlinkWechatAccount - WeChat OAuth not implemented');
  }

  static async checkWechatBinding(userId: string): Promise<boolean> {
    logger.warn('WechatOAuthService.checkWechatBinding - WeChat OAuth not implemented');
    return false;
  }

  static async refreshAccessToken(userId: string): Promise<{ access_token: string; expires_in: number }> {
    logger.warn('WechatOAuthService.refreshAccessToken - WeChat OAuth not implemented');
    return {
      access_token: '',
      expires_in: 0
    };
  }
}

export const wechatOAuthService = new WechatOAuthService();
