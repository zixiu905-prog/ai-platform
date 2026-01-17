import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import WorkflowEngine from './workflowEngine';
import SoftwareIntegrationService from './softwareIntegrationService';
import { logger } from '../utils/logger';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: 'error_rate' | 'performance' | 'timeout' | 'resource_usage' | 'custom';
  conditions: {
    threshold?: number;
    operator?: '>' | '<' | '>=' | '<=' | '=' | '!=';
    timeframe?: number; // 时间窗口（秒）
    aggregation?: 'count' | 'avg' | 'sum' | 'max' | 'min';
    metric: string;
  };
  actions: {
    email?: boolean;
    sms?: boolean;
    webhook?: string;
    escalation?: {
      delay: number; // 升级延迟（秒）
      level: 'warning' | 'critical' | 'emergency';
    };
  };
  enabled: boolean;
  userId?: string;
}

export interface ExecutionMetric {
  id: string;
  executionId: string;
  userId: string;
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: any;
}

export interface Alert {
  id: string;
  ruleId: string;
  executionId?: string;
  userId?: string;
  level: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata?: any;
}

export interface MonitoringConfig {
  alertRules: AlertRule[];
  metricsRetention: number; // 指标保留天数
  alertRetention: number; // 告警保留天数
  defaultNotifications: {
    email: boolean;
    sms: boolean;
    webhook: string;
  };
}

export class MonitoringService extends EventEmitter {
  private prisma: PrismaClient;
  private workflowEngine: WorkflowEngine;
  private softwareService: SoftwareIntegrationService;
  private activeAlerts: Map<string, Alert> = new Map();
  private metricsBuffer: Map<string, ExecutionMetric[]> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private config: MonitoringConfig;

  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.config = {
      alertRules: [],
      metricsRetention: 30,
      alertRetention: 90,
      defaultNotifications: {
        email: true,
        sms: false,
        webhook: ''
      }
    };

    this.setupEventListeners();
    this.startMonitoring();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听工作流事件
    this.workflowEngine.on('workflowCompleted', (execution) => {
      this.recordExecutionMetric(execution.id, 'workflow_completion_time', 
        execution.endTime!.getTime() - execution.startTime.getTime(), 'ms');
      this.checkAlerts('workflow_completed', execution);
    });

    this.workflowEngine.on('workflowCancelled', (execution) => {
      this.recordExecutionMetric(execution.id, 'workflow_cancellation', 1, 'count');
      this.checkAlerts('workflow_cancelled', execution);
    });

    // 监听软件服务事件
    this.softwareService.on('softwareConnected', (data) => {
      this.recordExecutionMetric(`software_${data.softwareId}`, 'connection_success', 1, 'count');
      this.checkAlerts('software_connected', data);
    });

    this.softwareService.on('softwareDisconnected', (data) => {
      this.recordExecutionMetric(`software_${data.softwareId}`, 'connection_lost', 1, 'count');
      this.checkAlerts('software_disconnected', data);
    });

    this.softwareService.on('commandExecuted', (data) => {
      if (data.success) {
        this.recordExecutionMetric(data.executionId, 'command_success', 
          data.duration, 'ms');
      } else {
        this.recordExecutionMetric(data.executionId, 'command_failure', 1, 'count');
        this.checkAlerts('command_failed', data);
      }
    });
  }

  /**
   * 启动监控服务
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.flushMetrics();
        await this.checkScheduledAlerts();
        await this.cleanupOldData();
      } catch (error) {
        logger.error('监控服务执行失败:', error);
      }
    }, 30000); // 每30秒执行一次
  }

  /**
   * 记录执行指标
   */
  recordExecutionMetric(
    executionId: string, 
    type: string, 
    value: number, 
    unit: string,
    metadata?: any
  ): void {
    const metric: ExecutionMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      executionId,
      userId: '', // 需要从执行上下文获取
      type,
      value,
      unit,
      timestamp: new Date(),
      metadata
    };

    const buffer = this.metricsBuffer.get(executionId) || [];
    buffer.push(metric);
    this.metricsBuffer.set(executionId, buffer);

    // 检查缓冲区大小，避免内存溢出
    if (buffer.length > 1000) {
      this.flushMetrics();
    }
  }

  /**
   * 刷新指标到数据库
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.size === 0) {
      return;
    }

    try {
      const metricsToInsert: any[] = [];
      
      for (const [executionId, metrics] of this.metricsBuffer.entries()) {
        for (const metric of metrics) {
          metricsToInsert.push({
            id: metric.id,
            executionId: metric.executionId,
            userId: metric.userId,
            type: metric.type,
            value: metric.value,
            unit: metric.unit,
            timestamp: metric.timestamp,
            metadata: metric.metadata || {}
          });
        }
      }

      // 批量插入到数据库
      if (metricsToInsert.length > 0) {
        await this.prisma.executionMetrics.createMany({
          data: metricsToInsert
        });
      }

      // 清空缓冲区
      this.metricsBuffer.clear();
      
      logger.info(`已刷新 ${metricsToInsert.length} 个执行指标到数据库`);
    } catch (error) {
      logger.error('刷新指标到数据库失败:', error);
    }
  }

  /**
   * 检查告警规则
   */
  async checkAlerts(eventType: string, data?: any): Promise<void> {
    try {
      const relevantRules = this.config.alertRules.filter(rule => 
        rule.enabled && this.shouldTriggerRule(rule, eventType, data)
      );

      for (const rule of relevantRules) {
        await this.evaluateAlertRule(rule, eventType, data);
      }
    } catch (error) {
      logger.error('检查告警规则失败:', error);
    }
  }

  /**
   * 判断是否应该触发规则
   */
  private shouldTriggerRule(rule: AlertRule, eventType: string, data?: any): boolean {
    // 这里可以根据事件类型、数据内容等判断
    // 暂时返回true进行所有检查
    return true;
  }

  /**
   * 评估告警规则
   */
  private async evaluateAlertRule(rule: AlertRule, eventType: string, data?: any): Promise<void> {
    try {
      const { conditions } = rule;
      
      // 根据条件获取指标数据
      const metricValue = await this.getMetricValue(conditions.metric, data);
      
      if (metricValue === null) {
        return;
      }

      // 评估条件
      let isTriggered = false;
      
      switch (conditions.operator) {
        case '>':
          isTriggered = metricValue > (conditions.threshold || 0);
          break;
        case '<':
          isTriggered = metricValue < (conditions.threshold || 0);
          break;
        case '>=':
          isTriggered = metricValue >= (conditions.threshold || 0);
          break;
        case '<=':
          isTriggered = metricValue <= (conditions.threshold || 0);
          break;
        case '=':
          isTriggered = metricValue === (conditions.threshold || 0);
          break;
        case '!=':
          isTriggered = metricValue !== (conditions.threshold || 0);
          break;
      }

      if (isTriggered) {
        await this.triggerAlert(rule, eventType, data, metricValue);
      }
    } catch (error) {
      logger.error(`评估告警规则失败 ${rule.id}:`, error);
    }
  }

  /**
   * 获取指标值
   */
  private async getMetricValue(metric: string, data?: any): Promise<number | null> {
    try {
      switch (metric) {
        case 'error_rate':
          return await this.calculateErrorRate();
        case 'avg_execution_time':
          return await this.calculateAvgExecutionTime();
        case 'timeout_rate':
          return await this.calculateTimeoutRate();
        case 'cpu_usage':
          return await this.getCPUUsage();
        case 'memory_usage':
          return await this.getMemoryUsage();
        case 'command_success_rate':
          return await this.calculateCommandSuccessRate();
        default:
          if (data && typeof data[metric] === 'number') {
            return data[metric];
          }
          return null;
      }
    } catch (error) {
      logger.error(`获取指标值失败 ${metric}:`, error);
      return null;
    }
  }

  /**
   * 计算错误率
   */
  private async calculateErrorRate(): Promise<number> {
    try {
      const timeWindow = new Date(Date.now() - 3600000); // 最近1小时
      
      const [failedCount, totalCount] = await Promise.all([
        this.prisma.taskExecution.count({
          where: {
            status: 'FAILED',
            startTime: { gte: timeWindow }
          }
        }),
        this.prisma.taskExecution.count({
          where: {
            startTime: { gte: timeWindow }
          }
        })
      ]);

      return totalCount > 0 ? (failedCount / totalCount) * 100 : 0;
    } catch (error) {
      logger.error('计算错误率失败:', error);
      return 0;
    }
  }

  /**
   * 计算平均执行时间
   */
  private async calculateAvgExecutionTime(): Promise<number> {
    try {
      const timeWindow = new Date(Date.now() - 3600000); // 最近1小时
      
      const executions = await this.prisma.taskExecution.findMany({
        where: {
          status: 'COMPLETED',
          startTime: { gte: timeWindow }
        },
        select: {
          startTime: true,
          endTime: true
        }
      });

      if (executions.length === 0) {
        return 0;
      }

      const durations = executions.map(exec => 
        exec.endTime!.getTime() - exec.startTime.getTime()
      );
      
      return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    } catch (error) {
      logger.error('计算平均执行时间失败:', error);
      return 0;
    }
  }

  /**
   * 计算超时率
   */
  private async calculateTimeoutRate(): Promise<number> {
    try {
      const timeWindow = new Date(Date.now() - 3600000); // 最近1小时
      
      const [timeoutCount, totalCount] = await Promise.all([
        this.prisma.taskExecution.count({
          where: {
            status: 'FAILED',
            error: { contains: 'timeout' },
            startTime: { gte: timeWindow }
          }
        }),
        this.prisma.taskExecution.count({
          where: {
            startTime: { gte: timeWindow }
          }
        })
      ]);

      return totalCount > 0 ? (timeoutCount / totalCount) * 100 : 0;
    } catch (error) {
      logger.error('计算超时率失败:', error);
      return 0;
    }
  }

  /**
   * 获取CPU使用率
   */
  private async getCPUUsage(): Promise<number> {
    try {
      const cpuUsage = process.cpuUsage();
      return (cpuUsage.user + cpuUsage.system) / 1000000; // 转换为毫秒
    } catch (error) {
      logger.error('获取CPU使用率失败:', error);
      return 0;
    }
  }

  /**
   * 获取内存使用率
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      const memUsage = process.memoryUsage();
      return memUsage.heapUsed / memUsage.heapTotal * 100;
    } catch (error) {
      logger.error('获取内存使用率失败:', error);
      return 0;
    }
  }

  /**
   * 计算命令成功率
   */
  private async calculateCommandSuccessRate(): Promise<number> {
    try {
      const timeWindow = new Date(Date.now() - 3600000); // 最近1小时
      
      // 这里应该从软件执行记录获取，暂时返回模拟值
      return 95; // 95%成功率
    } catch (error) {
      logger.error('计算命令成功率失败:', error);
      return 0;
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(
    rule: AlertRule, 
    eventType: string, 
    data?: any, 
    metricValue?: number
  ): Promise<void> {
    try {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const alert: Alert = {
        id: alertId,
        ruleId: rule.id,
        userId: rule.userId,
        level: this.determineAlertLevel(rule, metricValue),
        title: `${rule.name} - ${eventType}`,
        message: this.generateAlertMessage(rule, eventType, data, metricValue),
        triggeredAt: new Date(),
        metadata: {
          ruleType: rule.type,
          eventType,
          metricValue,
          data
        }
      };

      // 保存告警到数据库
      await this.prisma.alert.create({
        data: {
          id: alertId,
          ruleId: rule.id,
          userId: alert.userId,
          level: alert.level,
          title: alert.title,
          message: alert.message,
          triggeredAt: alert.triggeredAt,
          metadata: alert.metadata
        }
      });

      // 添加到活跃告警
      this.activeAlerts.set(alertId, alert);

      // 发送通知
      await this.sendNotifications(alert, rule);

      // 发出告警事件
      this.emit('alertTriggered', alert);

      logger.warn(`触发告警: ${alert.title} - ${alert.message}`);

    } catch (error) {
      logger.error('触发告警失败:', error);
    }
  }

  /**
   * 确定告警级别
   */
  private determineAlertLevel(rule: AlertRule, metricValue?: number): Alert['level'] {
    if (!metricValue) {
      return 'warning';
    }

    const threshold = rule.conditions.threshold || 0;
    const ratio = Math.abs(metricValue - threshold) / threshold;

    if (ratio > 2) {
      return 'emergency';
    } else if (ratio > 1) {
      return 'critical';
    } else if (ratio > 0.5) {
      return 'warning';
    } else {
      return 'info';
    }
  }

  /**
   * 生成告警消息
   */
  private generateAlertMessage(
    rule: AlertRule, 
    eventType: string, 
    data?: any, 
    metricValue?: number
  ): string {
    const { conditions } = rule;
    
    switch (rule.type) {
      case 'error_rate':
        return `错误率 ${metricValue?.toFixed(2)}% 超过阈值 ${conditions.threshold}%`;
      case 'performance':
        return `执行时间 ${metricValue?.toFixed(2)}ms 超过阈值 ${conditions.threshold}ms`;
      case 'timeout':
        return `超时率 ${metricValue?.toFixed(2)}% 超过阈值 ${conditions.threshold}%`;
      case 'resource_usage':
        return `资源使用率 ${metricValue?.toFixed(2)}% 超过阈值 ${conditions.threshold}%`;
      default:
        return `规则 "${rule.name}" 被触发: ${eventType}`;
    }
  }

  /**
   * 发送通知
   */
  private async sendNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    try {
      const { actions } = rule;

      if (actions.email) {
        await this.sendEmailNotification(alert);
      }

      if (actions.sms) {
        await this.sendSMSNotification(alert);
      }

      if (actions.webhook) {
        await this.sendWebhookNotification(alert, actions.webhook);
      }

    } catch (error) {
      logger.error('发送通知失败:', error);
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(alert: Alert): Promise<void> {
    // 这里应该集成邮件服务
    logger.info(`发送邮件告警: ${alert.title} - ${alert.message}`);
  }

  /**
   * 发送短信通知
   */
  private async sendSMSNotification(alert: Alert): Promise<void> {
    // 这里应该集成短信服务
    logger.info(`发送短信告警: ${alert.title}`);
  }

  /**
   * 发送Webhook通知
   */
  private async sendWebhookNotification(alert: Alert, webhook: string): Promise<void> {
    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook请求失败: ${response.status}`);
      }

      logger.info(`Webhook告警发送成功: ${alert.title}`);
    } catch (error) {
      logger.error('发送Webhook通知失败:', error);
    }
  }

  /**
   * 检查计划告警
   */
  private async checkScheduledAlerts(): Promise<void> {
    try {
      // 检查是否有需要升级的告警
      const escalationRules = this.config.alertRules.filter(rule => 
        rule.actions.escalation && rule.enabled
      );

      for (const rule of escalationRules) {
        await this.checkEscalation(rule);
      }
    } catch (error) {
      logger.error('检查计划告警失败:', error);
    }
  }

  /**
   * 检查告警升级
   */
  private async checkEscalation(rule: AlertRule): Promise<void> {
    try {
      const escalationDelay = rule.actions.escalation!.delay;
      const escalationLevel = rule.actions.escalation!.level;
      
      // 查找需要升级的告警
      const cutoffTime = new Date(Date.now() - escalationDelay * 1000);
      
      const alertsToEscalate = await this.prisma.alert.findMany({
        where: {
          ruleId: rule.id,
          triggeredAt: { lt: cutoffTime },
          acknowledgedAt: null,
          resolvedAt: null
        }
      });

      for (const alert of alertsToEscalate) {
        // 升级告警
        await this.prisma.alert.update({
          where: { id: alert.id },
          data: {
            level: escalationLevel,
            message: `[升级] ${alert.message}`
          }
        });

        // 发送升级通知
        await this.sendNotifications({
          ...alert,
          level: escalationLevel,
          message: `[升级] ${alert.message}`
        }, rule);

        logger.warn(`告警升级: ${alert.id} -> ${escalationLevel}`);
      }
    } catch (error) {
      logger.error('检查告警升级失败:', error);
    }
  }

  /**
   * 清理旧数据
   */
  private async cleanupOldData(): Promise<void> {
    try {
      const metricsCutoffDate = new Date(Date.now() - this.config.metricsRetention * 24 * 60 * 60 * 1000);
      const alertsCutoffDate = new Date(Date.now() - this.config.alertRetention * 24 * 60 * 60 * 1000);

      // 清理旧指标
      await this.prisma.executionMetrics.deleteMany({
        where: {
          timestamp: { lt: metricsCutoffDate }
        }
      });

      // 清理旧告警
      await this.prisma.alert.deleteMany({
        where: {
          triggeredAt: { lt: alertsCutoffDate },
          resolvedAt: { not: null }
        }
      });

      logger.info('清理旧数据完成');
    } catch (error) {
      logger.error('清理旧数据失败:', error);
    }
  }

  /**
   * 添加告警规则
   */
  async addAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    try {
      const newRule: AlertRule = {
        ...rule,
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      this.config.alertRules.push(newRule);
      
      await this.prisma.alertRule.create({
        data: {
          id: newRule.id,
          name: newRule.name,
          description: newRule.description,
          type: newRule.type,
          conditions: newRule.conditions,
          actions: newRule.actions,
          enabled: newRule.enabled,
          userId: newRule.userId
        }
      });

      logger.info(`添加告警规则: ${newRule.name}`);
      return newRule;
    } catch (error) {
      logger.error('添加告警规则失败:', error);
      throw error;
    }
  }

  /**
   * 获取告警列表
   */
  async getAlerts(
    userId?: string, 
    level?: Alert['level'], 
    limit: number = 50
  ): Promise<Alert[]> {
    try {
      const where: any = {};
      
      if (userId) {
        where.userId = userId;
      }
      
      if (level) {
        where.level = level;
      }

      const alerts = await this.prisma.alert.findMany({
        where,
        orderBy: { triggeredAt: 'desc' },
        take: limit
      });

      return alerts as Alert[];
    } catch (error) {
      logger.error('获取告警列表失败:', error);
      return [];
    }
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      await this.prisma.alert.update({
        where: { id: alertId, userId },
        data: { acknowledgedAt: new Date() }
      });

      const alert = this.activeAlerts.get(alertId);
      if (alert) {
        alert.acknowledgedAt = new Date();
      }

      logger.info(`告警已确认: ${alertId}`);
      return true;
    } catch (error) {
      logger.error('确认告警失败:', error);
      return false;
    }
  }

  /**
   * 解决告警
   */
  async resolveAlert(alertId: string, userId: string, resolution?: string): Promise<boolean> {
    try {
      await this.prisma.alert.update({
        where: { id: alertId, userId },
        data: { 
          resolvedAt: new Date(),
          message: resolution
        }
      });

      this.activeAlerts.delete(alertId);
      
      logger.info(`告警已解决: ${alertId}`);
      return true;
    } catch (error) {
      logger.error('解决告警失败:', error);
      return false;
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<MonitoringConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      
      // 保存配置到数据库
      await this.prisma.monitoringConfig.upsert({
        where: { id: 'default' },
        update: { config: this.config },
        create: { id: 'default', config: this.config }
      });

      logger.info('监控配置已更新');
    } catch (error) {
      logger.error('更新监控配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取监控统计
   */
  async getMonitoringStats(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<any> {
    try {
      const timeWindow = this.getTimeWindow(timeRange);
      
      const [totalExecutions, successfulExecutions, failedExecutions, totalAlerts] = await Promise.all([
        this.prisma.taskExecution.count({
          where: { startTime: { gte: timeWindow } }
        }),
        this.prisma.taskExecution.count({
          where: { 
            status: 'COMPLETED',
            startTime: { gte: timeWindow }
          }
        }),
        this.prisma.taskExecution.count({
          where: { 
            status: 'FAILED',
            startTime: { gte: timeWindow }
          }
        }),
        this.prisma.alert.count({
          where: { triggeredAt: { gte: timeWindow } }
        })
      ]);

      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
      const errorRate = totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;

      return {
        timeRange,
        timeWindow,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        totalAlerts,
        successRate: successRate.toFixed(2),
        errorRate: errorRate.toFixed(2),
        avgExecutionTime: await this.calculateAvgExecutionTime()
      };
    } catch (error) {
      logger.error('获取监控统计失败:', error);
      return {};
    }
  }

  /**
   * 获取时间窗口
   */
  private getTimeWindow(range: string): Date {
    const now = new Date();
    
    switch (range) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      // 停止监控
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }

      // 刷新剩余指标
      await this.flushMetrics();

      // 清理内存
      this.metricsBuffer.clear();
      this.activeAlerts.clear();

      logger.info('监控服务已清理');
    } catch (error) {
      logger.error('清理监控服务失败:', error);
    }
  }
}

export default MonitoringService;