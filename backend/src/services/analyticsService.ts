import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import ExcelJS from 'exceljs';

export interface AnalyticsQuery {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  metrics?: string[];
  filters?: any;
}

export interface AnalyticsExportOptions {
  format: 'excel' | 'csv' | 'json' | 'pdf';
  chartData?: boolean;
  rawData?: boolean;
  summary?: boolean;
}

export class AnalyticsService {
  private readonly defaultMetrics = [
    'users',
    'revenue',
    'ai_usage',
    'subscriptions',
    'payments',
    'engagement'
  ];

  /**
   * 获取综合分析数据
   */
  async getAnalytics(query: AnalyticsQuery): Promise<any> {
    try {
      const { startDate, endDate, groupBy = 'day', metrics = this.defaultMetrics } = query;

      console.log(`📊 获取分析数据: ${JSON.stringify({ startDate, endDate, groupBy, metrics })}`);

      const results: any = {};

      // 并行获取各种指标数据
      const promises = metrics.map(metric => this.getMetricData(metric, query));
      const metricResults = await Promise.all(promises);

      // 组合结果
      metrics.forEach((metric, index) => {
        results[metric] = metricResults[index];
      });

      return results;
    } catch (error) {
      logger.error('获取分析数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个指标数据
   */
  private async getMetricData(metric: string, query: AnalyticsQuery): Promise<any> {
    const { startDate, endDate, groupBy, userId } = query;

    switch (metric) {
      case 'users':
        return this.getUserMetrics(startDate, endDate, groupBy, userId);
      case 'revenue':
        return this.getRevenueMetrics(startDate, endDate, groupBy, userId);
      case 'ai_usage':
        return this.getAIUsageMetrics(startDate, endDate, groupBy, userId);
      case 'subscriptions':
        return this.getSubscriptionMetrics(startDate, endDate, groupBy, userId);
      case 'payments':
        return this.getPaymentMetrics(startDate, endDate, groupBy, userId);
      case 'engagement':
        return this.getEngagementMetrics(startDate, endDate, groupBy, userId);
      default:
        return {};
    }
  }

  /**
   * 获取用户指标
   */
  private async getUserMetrics(startDate?: Date, endDate?: Date, groupBy?: string, userId?: string): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (userId) where.id = userId;

    const [totalUsers, activeUsers, newUsers] = await Promise.all([
      prisma.users.count({ where }),
      prisma.users.count({ where: { ...where, lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.users.count({ where: { ...where, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } })
    ]);

    return {
      total: totalUsers,
      active: activeUsers,
      new: newUsers,
      retentionRate: activeUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0
    };
  }

  /**
   * 获取收入指标
   */
  private async getRevenueMetrics(startDate?: Date, endDate?: Date, groupBy?: string, userId?: string): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (userId) where.userId = userId;

    const payments = await prisma.payments.findMany({
      where: {
        ...where,
        status: 'COMPLETED'
      }
    });

    const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const averageOrderValue = payments.length > 0 ? totalRevenue / payments.length : 0;

    return {
      total: totalRevenue,
      average: averageOrderValue,
      transactions: payments.length
    };
  }

  /**
   * 获取AI使用指标
   */
  private async getAIUsageMetrics(startDate?: Date, endDate?: Date, groupBy?: string, userId?: string): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (userId) where.userId = userId;

    // 暂时返回空数据，因为 aiUsage 表不存在
    return {
      requests: 0,
      tokens: {
        input: 0,
        output: 0,
        total: 0
      },
      images: 0
    };
  }

  /**
   * 获取订阅指标
   */
  private async getSubscriptionMetrics(startDate?: Date, endDate?: Date, groupBy?: string, userId?: string): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (userId) where.userId = userId;

    const [totalSubscriptions, activeSubscriptions, cancelledSubscriptions] = await Promise.all([
      prisma.subscriptions.count({ where }),
      prisma.subscriptions.count({ where: { ...where, status: 'active' } }),
      prisma.subscriptions.count({ where: { ...where, status: 'cancelled' } })
    ]);

    return {
      total: totalSubscriptions,
      active: activeSubscriptions,
      cancelled: cancelledSubscriptions,
      churnRate: totalSubscriptions > 0 ? (cancelledSubscriptions / totalSubscriptions * 100).toFixed(2) : 0
    };
  }

  /**
   * 获取支付指标
   */
  private async getPaymentMetrics(startDate?: Date, endDate?: Date, groupBy?: string, userId?: string): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (userId) where.userId = userId;

    const payments = await prisma.payments.findMany({ where });

    const completed = payments.filter(p => p.status === 'COMPLETED').length;
    const failed = payments.filter(p => p.status === 'FAILED').length;
    const pending = payments.filter(p => p.status === 'PENDING').length;

    return {
      total: payments.length,
      completed,
      failed,
      pending,
      successRate: payments.length > 0 ? (completed / payments.length * 100).toFixed(2) : 0
    };
  }

  /**
   * 获取用户参与度指标
   */
  private async getEngagementMetrics(startDate?: Date, endDate?: Date, groupBy?: string, userId?: string): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (userId) where.userId = userId;

    const [loginCount, projectCount, workflowCount] = await Promise.all([
      prisma.audit_logs.count({ where: { ...where, action: 'LOGIN' } }),
      prisma.projects.count({ where }),
      prisma.workflows.count({ where })
    ]);

    return {
      logins: loginCount,
      projects: projectCount,
      workflows: workflowCount
    };
  }

  /**
   * 导出分析数据
   */
  async exportAnalytics(query: AnalyticsQuery, options: AnalyticsExportOptions): Promise<string> {
    try {
      const data = await this.getAnalytics(query);

      const exportPath = join(process.cwd(), 'exports', `analytics-${Date.now()}.${options.format}`);

      switch (options.format) {
        case 'excel':
          return this.exportToExcel(data, exportPath, options);
        case 'csv':
          return this.exportToCSV(data, exportPath);
        case 'json':
          return this.exportToJSON(data, exportPath);
        case 'pdf':
          throw new Error('PDF导出功能尚未实现');
        default:
          throw new Error(`不支持的导出格式: ${options.format}`);
      }
    } catch (error) {
      logger.error('导出分析数据失败:', error);
      throw error;
    }
  }

  /**
   * 导出为Excel
   */
  private async exportToExcel(data: any, filePath: string, options: AnalyticsExportOptions): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const summarySheet = workbook.addWorksheet('Summary');

    // 添加汇总数据
    Object.keys(data).forEach((key, index) => {
      summarySheet.addRow([key, JSON.stringify(data[key])]);
    });

    // 保存文件
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }

  /**
   * 导出为CSV
   */
  private exportToCSV(data: any, filePath: string): string {
    const csvContent = Object.entries(data)
      .map(([key, value]) => `${key},"${JSON.stringify(value)}"`)
      .join('\n');

    writeFileSync(filePath, csvContent);

    return filePath;
  }

  /**
   * 导出为JSON
   */
  private exportToJSON(data: any, filePath: string): string {
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  /**
   * 获取实时分析数据
   */
  async getRealTimeAnalytics(): Promise<any> {
    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [
        activeUsers,
        requestsLastHour,
        revenueLastHour
      ] = await Promise.all([
        prisma.users.count({
          where: { lastLoginAt: { gte: hourAgo } }
        }),
        prisma.audit_logs.count({
          where: { createdAt: { gte: hourAgo } }
        }),
        prisma.payments.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: hourAgo }
          },
          _sum: { amount: true }
        })
      ]);

      return {
        timestamp: now.toISOString(),
        activeUsers,
        requestsLastHour,
        revenueLastHour: revenueLastHour._sum.amount || 0
      };
    } catch (error) {
      logger.error('获取实时分析数据失败:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
