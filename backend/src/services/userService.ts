import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export class UserService {
  /**
   * 获取用户统计数
   */
  static async getUserCount(): Promise<number> {
    try {
      const count = await prisma.users.count();
      return count;
    } catch (error) {
      logger.error('Failed to get user count:', error);
      return 0;
    }
  }

  /**
   * 获取用户信息
   */
  async getUserById(userId: string): Promise<any> {
    try {
      const user = await prisma.users.findUnique({
        where: { id: userId }
      });
      return user;
    } catch (error) {
      logger.error('Failed to get user by id:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId: string, data: any): Promise<any> {
    try {
      const user = await prisma.users.update({
        where: { id: userId },
        data: { ...data, updatedAt: new Date() }
      });
      return user;
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * 获取活跃用户数
   */
  static async getActiveUserCount(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const count = await prisma.users.count({
        where: {
          updatedAt: {
            gte: thirtyDaysAgo
          }
        }
      });
      return count;
    } catch (error) {
      logger.error('Failed to get active user count:', error);
      return 0;
    }
  }
}

export default UserService;
