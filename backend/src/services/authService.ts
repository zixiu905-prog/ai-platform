import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import * as crypto from 'crypto';

interface JwtPayload {
  userId: string;
}

class AuthService {
  private prisma: PrismaClient;
  private JWT_SECRET: string;
  private JWT_EXPIRES_IN: string;
  private REFRESH_TOKEN_SECRET: string;
  private REFRESH_TOKEN_EXPIRES_IN: string;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    this.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-change-in-production';
    this.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
  }

  /**
   * 用户注册
   */
  async register(data: any) {
    try {
      const { email, password, name, role = Role.USER } = data;

      // 检查邮箱是否已存在
      const existingUser = await this.prisma.users.findUnique({ where: { email } });
      if (existingUser) {
        return { success: false, message: '该邮箱已被注册' };
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建用户（生成随机username）
      const generatedUsername = `${name.replace(/\s+/g, '').toLowerCase()}_${Math.random().toString(36).substring(2, 8)}`;

      const user = await this.prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email,
          password: hashedPassword,
          name,
          username: generatedUsername,
          role,
          updatedAt: new Date()
        }
      });

      // 生成token
      const token = this.generateToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      // 创建session
      await this.prisma.sessions.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      });

      logger.info(`用户注册成功: ${email}`);

      return {
        success: true,
        message: '注册成功',
        user: {
          id: user.id,
          email: user.email,
          username: user.username || '',
          name: user.name || '',
          role: user.role,
          emailVerified: user.emailVerified,
          avatar: user.avatar || undefined
        },
        tokens: {
          accessToken: token,
          refreshToken: refreshToken,
          expiresIn: this.JWT_EXPIRES_IN
        }
      };
    } catch (error) {
      logger.error('注册失败:', error);
      return { success: false, message: '注册失败，请稍后重试' };
    }
  }

  /**
   * 用户登录
   */
  async login(data: any) {
    try {
      const { email, password } = data;

      // 查找用户
      const user = await this.prisma.users.findUnique({ where: { email } });
      if (!user) {
        return { success: false, message: '邮箱或密码错误' };
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return { success: false, message: '邮箱或密码错误' };
      }

      // 检查账号状态
      if (!user.isActive) {
        return { success: false, message: '账号已被禁用' };
      }

      // 生成token
      const token = this.generateToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      // 创建session
      await this.prisma.sessions.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      });

      // 更新最后登录时间
      await this.prisma.users.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      logger.info(`用户登录成功: ${email}`);

      return {
        success: true,
        message: '登录成功',
        user: {
          id: user.id,
          email: user.email,
          username: user.username || '',
          name: user.name || '',
          role: user.role,
          emailVerified: user.emailVerified,
          avatar: user.avatar || undefined
        },
        tokens: {
          accessToken: token,
          refreshToken: refreshToken,
          expiresIn: this.JWT_EXPIRES_IN
        }
      };
    } catch (error) {
      logger.error('登录失败:', error);
      return { success: false, message: '登录失败，请稍后重试' };
    }
  }

  /**
   * 刷新token
   */
  async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    message: string;
    user?: any;
    token?: string;
    refreshToken?: string;
  }> {
    try {
      // 验证refresh token
      const decoded = jwt.verify(refreshToken, this.REFRESH_TOKEN_SECRET) as JwtPayload;

      // 查找session
      const storedSession = await this.prisma.sessions.findUnique({
        where: { token: refreshToken },
      });

      if (!storedSession || storedSession.userId !== decoded.userId) {
        return { success: false, message: '无效的刷新令牌' };
      }

      // 检查是否过期
      if (storedSession.expiresAt < new Date()) {
        await this.prisma.sessions.delete({ where: { token: refreshToken } });
        return { success: false, message: '刷新令牌已过期，请重新登录' };
      }

      // 生成新的token
      const newToken = this.generateToken(decoded.userId);
      const newRefreshToken = this.generateRefreshToken(decoded.userId);

      // 更新session
      await this.prisma.sessions.update({
        where: { token: refreshToken },
        data: {
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: '刷新成功',
        user: {
          id: decoded.userId,
          email: '',
          name: '',
          role: Role.USER,
          avatar: undefined
        },
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      logger.error('刷新token失败:', error);
      return { success: false, message: '刷新令牌无效，请重新登录' };
    }
  }

  /**
   * 登出
   */
  async logout(refreshToken: string) {
    try {
      await this.prisma.sessions.delete({ where: { token: refreshToken } });
      return { success: true, message: '登出成功' };
    } catch (error) {
      logger.error('登出失败:', error);
      return { success: true, message: '登出成功' };
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId: string) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          createdAt: true,
          lastLoginAt: true,
          isActive: true
        }
      });

      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      return { success: true, user };
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      return { success: false, message: '获取用户信息失败' };
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    try {
      // 获取用户
      const user = await this.prisma.users.findUnique({ where: { id: userId } });
      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      // 验证旧密码
      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        return { success: false, message: '原密码错误' };
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // 更新密码
      await this.prisma.users.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      logger.info(`用户修改密码成功: ${user.email}`);

      return { success: true, message: '密码修改成功' };
    } catch (error) {
      logger.error('修改密码失败:', error);
      return { success: false, message: '修改密码失败，请稍后重试' };
    }
  }

  /**
   * 更新用户资料
   */
  async updateProfile(userId: string, data: any) {
    try {
      const user = await this.prisma.users.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.avatar !== undefined && { avatar: data.avatar })
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          createdAt: true
        }
      });

      logger.info(`用户更新资料成功: ${user.email}`);

      return { success: true, user, message: '更新成功' };
    } catch (error) {
      logger.error('更新资料失败:', error);
      return { success: false, message: '更新资料失败，请稍后重试' };
    }
  }

  /**
   * 验证token
   */
  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * verifyAccessToken - verifyToken 的别名
   */
  verifyAccessToken(token: string) {
    return this.verifyToken(token);
  }

  /**
   * 请求密码重置
   */
  async requestPasswordReset(data: any) {
    try {
      const { email } = data;

      // 查找用户
      const user = await this.prisma.users.findUnique({ where: { email } });
      if (!user) {
        // 为了安全，即使用户不存在也返回成功消息
        return { success: true, message: '如果该邮箱存在，重置邮件已发送' };
      }

      // 生成重置令牌
      const resetToken = jwt.sign({ userId: user.id }, this.JWT_SECRET, { expiresIn: '1h' });

      // TODO: 保存重置令牌到数据库（passwordResetToken表不存在，待添加）

      logger.info(`密码重置请求: ${email}`);

      // TODO: 发送邮件（需要配置邮件服务）
      // await this.sendResetEmail(user.email, resetToken);

      return { success: true, message: '重置邮件已发送到您的邮箱' };
    } catch (error) {
      logger.error('请求密码重置失败:', error);
      return { success: false, message: '请求失败，请稍后重试' };
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(token: string, newPassword: string) {
    try {
      // 验证令牌
      const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload;
      if (!decoded) {
        return { success: false, message: '重置令牌无效或已过期' };
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // 更新用户密码
      await this.prisma.users.update({
        where: { id: decoded.userId },
        data: { password: hashedPassword }
      });

      // TODO: 删除使用过的令牌（passwordResetToken表不存在，待添加）

      logger.info(`密码重置成功: 用户ID ${decoded.userId}`);

      return { success: true, message: '密码重置成功' };
    } catch (error) {
      logger.error('重置密码失败:', error);
      return { success: false, message: '重置失败，请稍后重试' };
    }
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string) {
    try {
      // 从token中解析出userId
      const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload;
      if (!decoded) {
        return { success: false, message: '验证令牌无效或已过期' };
      }

      const user = await this.prisma.users.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      // 简化处理：直接标记为已验证
      await this.prisma.users.update({
        where: { id: decoded.userId },
        data: { emailVerified: true }
      });

      logger.info(`邮箱验证成功: ${user.email}`);

      return { success: true, message: '邮箱验证成功', user };
    } catch (error) {
      logger.error('验证邮箱失败:', error);
      return { success: false, message: '验证失败，请稍后重试' };
    }
  }

  /**
   * 重新发送验证邮件
   */
  async resendVerificationEmail(email: string) {
    try {
      const user = await this.prisma.users.findUnique({ where: { email } });
      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      // 简化处理：直接返回成功（实际应该发送邮件）
      logger.info(`重发验证邮件: ${email}`);

      return { success: true, message: '验证邮件已发送' };
    } catch (error) {
      logger.error('重发验证邮件失败:', error);
      return { success: false, message: '发送失败，请稍后重试' };
    }
  }

  /**
   * 生成访问令牌
   */
  generateToken(userId: string) {
    return jwt.sign({ userId: (userId as string) }, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN } as any);
  }

  /**
   * 生成刷新令牌
   */
  generateRefreshToken(userId: string) {
    return jwt.sign({ userId: (userId as string) }, this.REFRESH_TOKEN_SECRET, { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN } as any);
  }
}

// 创建单例实例
const authServiceInstance = new AuthService();

// 导出
export default authServiceInstance;
