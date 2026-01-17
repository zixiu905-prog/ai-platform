import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from?: string;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;
  private static emailTemplates: any = {
    payment_reminder: {
      subject: '余额提醒 - 请及时充值',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">余额提醒</h2>
          <p>尊敬的 {{userName}}：</p>
          <p>您好！我们注意到您的账户余额已低于阈值。</p>
          <p style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
            当前余额：¥{{currentBalance}}<br>
            阈值：¥{{threshold}}<br>
            逾期天数：{{daysOverdue}}天
          </p>
          <p>为了避免影响您的使用，请及时充值。</p>
          <a href="{{baseUrl}}/billing" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">立即充值</a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            如果您不想再收到此类提醒，可以在账户设置中关闭。
          </p>
        </div>
      `,
      variables: ['baseUrl', 'userName', 'currentBalance', 'daysOverdue', 'threshold']
    }
  };

  constructor(config?: EmailConfig) {
    this.config = config || {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      },
      from: process.env.EMAIL_FROM || 'noreply@example.com'
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth
    });

    logger.info('Email Service initialized');
  }

  /**
   * 获取邮件模板
   */
  static getEmailTemplates() {
    return EmailService.emailTemplates;
  }

  /**
   * 发送邮件
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const mailOptions = {
        from: this.config.from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent successfully: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 批量发送邮件
   */
  async sendBulkEmail(recipients: string[], options: Omit<EmailOptions, 'to'>): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      const result = await this.sendEmail({ ...options, to: recipient });
      if (result.success) {
        success++;
      } else {
        failed++;
        errors.push(`${recipient}: ${result.error}`);
      }

      // 防止被限制，添加延迟
      await this.delay(100);
    }

    logger.info(`Bulk email sent: ${success} success, ${failed} failed`);

    return { success, failed, errors };
  }

  /**
   * 发送欢迎邮件
   */
  async sendWelcomeEmail(email: string, name: string, verificationUrl?: string): Promise<boolean> {
    const html = this.getWelcomeTemplate(name, verificationUrl);

    const result = await this.sendEmail({
      to: email,
      subject: '欢迎加入我们',
      html
    });

    return result.success;
  }

  /**
   * 发送验证邮件
   */
  async sendVerificationEmail(email: string, name: string, verificationUrl: string): Promise<boolean> {
    const html = this.getVerificationTemplate(name, verificationUrl);

    const result = await this.sendEmail({
      to: email,
      subject: '验证您的邮箱地址',
      html
    });

    return result.success;
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email: string, name: string, resetUrl: string, tokenExpiry: string): Promise<boolean> {
    const html = this.getPasswordResetTemplate(name, resetUrl, tokenExpiry);

    const result = await this.sendEmail({
      to: email,
      subject: '重置您的密码',
      html
    });

    return result.success;
  }

  /**
   * 发送通知邮件
   */
  async sendNotificationEmail(email: string, name: string, title: string, content: string): Promise<boolean> {
    const html = this.getNotificationTemplate(name, title, content);

    const result = await this.sendEmail({
      to: email,
      subject: title,
      html
    });

    return result.success;
  }

  /**
   * 欢迎邮件模板
   */
  private getWelcomeTemplate(name: string, verificationUrl?: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">欢迎加入我们，${name}！</h2>
        <p>感谢您注册我们的服务。我们很高兴您加入我们的社区。</p>
        ${verificationUrl ? `
        <p>请点击以下链接验证您的邮箱地址：</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">验证邮箱</a>
        ` : ''}
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          如果您没有注册此账户，请忽略此邮件。
        </p>
      </div>
    `;
  }

  /**
   * 验证邮件模板
   */
  private getVerificationTemplate(name: string, verificationUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">验证您的邮箱地址</h2>
        <p>您好，${name}！</p>
        <p>请点击以下链接验证您的邮箱地址：</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">验证邮箱</a>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          此链接将在24小时后失效。如果您没有请求验证，请忽略此邮件。
        </p>
      </div>
    `;
  }

  /**
   * 密码重置邮件模板
   */
  private getPasswordResetTemplate(name: string, resetUrl: string, tokenExpiry: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">重置您的密码</h2>
        <p>您好，${name}！</p>
        <p>我们收到了重置您账户密码的请求。请点击以下链接重置您的密码：</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">重置密码</a>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          此链接将在${tokenExpiry}后失效。如果您没有请求重置密码，请忽略此邮件。
        </p>
      </div>
    `;
  }

  /**
   * 通知邮件模板
   */
  private getNotificationTemplate(name: string, title: string, content: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${title}</h2>
        <p>您好，${name}！</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
          ${content}
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          如果您不想再收到此类邮件，请联系我们取消订阅。
        </p>
      </div>
    `;
  }

  /**
   * 验证邮箱格式
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 测试邮件配置
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      logger.info('Email connection test passed');
      return { success: true };
    } catch (error) {
      logger.error('Email connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<EmailConfig>): void {
    this.config = { ...this.config, ...config };
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth
    });
    logger.info('Email configuration updated');
  }

  /**
   * 获取当前配置
   */
  getConfig(): EmailConfig {
    return { ...this.config };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取欠费用户列表
   */
  async getOverdueUsers(threshold: number): Promise<any[]> {
    // 这里需要查询数据库，暂时返回空数组
    // 实际实现应该从数据库查询余额低于阈值的用户
    return [];
  }

  /**
   * 发送付费提醒邮件
   */
  async sendPaymentReminder(reminder: any): Promise<{ success: boolean; error?: string }> {
    const { email, userName, currentBalance, threshold, daysOverdue } = reminder;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    const template = EmailService.emailTemplates.payment_reminder;
    let html = template.html;

    // 替换模板变量
    template.variables?.forEach((variable: string) => {
      let value: string;
      if (variable === 'baseUrl') {
        value = baseUrl;
      } else if (variable === 'userName') {
        value = userName;
      } else if (variable === 'currentBalance') {
        value = String(currentBalance);
      } else if (variable === 'daysOverdue') {
        value = String(daysOverdue);
      } else if (variable === 'threshold') {
        value = String(threshold);
      } else {
        value = '';
      }
      html = html.replace(new RegExp(`{{${variable}}}`, 'g'), value);
    });

    return await this.sendEmail({
      to: email,
      subject: template.subject,
      html
    });
  }

  /**
   * 批量发送付费提醒邮件
   */
  async sendBulkPaymentReminders(threshold: number): Promise<{ success: number; failed: number; total: number; errors: string[] }> {
    const overdueUsers = await this.getOverdueUsers(threshold);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const reminder of overdueUsers) {
      try {
        const result = await this.sendPaymentReminder(reminder);
        if (result.success) {
          success++;
        } else {
          failed++;
          errors.push(`${reminder.email}: ${result.error}`);
        }
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        errors.push(`${reminder.email}: ${errorMsg}`);
      }

      // 防止被限制，添加延迟
      await this.delay(100);
    }

    return { success, failed, total: overdueUsers.length, errors };
  }
}

export const emailService = new EmailService();
