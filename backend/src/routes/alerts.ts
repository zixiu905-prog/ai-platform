import express from "express";
import { logger } from "@/utils/logger";
import { authMiddleware } from "@/middleware/auth";

const router = express.Router();

/**
 * 获取当前活跃告警
 * GET /api/alerts/active
 */
router.get("/active", authMiddleware, async (req, res) => {
  try {
    // 这里应该从AlertManager API获取活跃告警
    // 模拟数据
    const activeAlerts = [
      {
        id: "1",
        name: "HighCPUUsage",
        severity: "warning",
        status: "firing",
        service: "system",
        instance: "server-01",
        summary: "CPU使用率过高",
        description: "实例 server-01 CPU使用率超过80%，当前值: 85%",
        startsAt: new Date(Date.now() - 5 * 60 * 1000),
        labels: {
          severity: "warning",
          service: "system",
          instance: "server-01",
        },
        annotations: {
          summary: "CPU使用率过高",
          description: "实例 server-01 CPU使用率超过80%，当前值: 85%",
        },
      },
      {
        id: "2",
        name: "HighErrorRate",
        severity: "critical",
        status: "firing",
        service: "application",
        instance: "backend-01",
        summary: "HTTP错误率过高",
        description: "HTTP 5xx错误率超过5%，当前值: 7.2%",
        startsAt: new Date(Date.now() - 2 * 60 * 1000),
        labels: {
          severity: "critical",
          service: "application",
          instance: "backend-01",
        },
        annotations: {
          summary: "HTTP错误率过高",
          description: "HTTP 5xx错误率超过5%，当前值: 7.2%",
        },
      },
    ];

    res.json({
      success: true,
      data: {
        alerts: activeAlerts,
        total: activeAlerts.length,
        bySeverity: {
          critical: activeAlerts.filter((a) => a.severity === "critical")
            .length,
          warning: activeAlerts.filter((a) => a.severity === "warning").length,
          info: activeAlerts.filter((a) => a.severity === "info").length,
        },
        byService: {
          system: activeAlerts.filter((a) => a.service === "system").length,
          application: activeAlerts.filter((a) => a.service === "application")
            .length,
          database: activeAlerts.filter((a) => a.service === "database").length,
          cache: activeAlerts.filter((a) => a.service === "cache").length,
          ai: activeAlerts.filter((a) => a.service === "ai").length,
        },
      },
    });
  } catch (error) {
    logger.error("获取活跃告警失败:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 获取告警历史
 * GET /api/alerts/history
 */
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      severity,
      service,
      limit = 50,
      offset = 0,
    } = req.query;

    // 这里应该从数据库或AlertManager获取历史告警
    // 模拟数据
    const alertHistory = [
      {
        id: "3",
        name: "HighMemoryUsage",
        severity: "warning",
        status: "resolved",
        service: "system",
        instance: "server-02",
        summary: "内存使用率过高",
        description: "实例 server-02 内存使用率超过85%",
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 30 * 60 * 1000),
        duration: "1h30m",
      },
      {
        id: "4",
        name: "ServiceDown",
        severity: "critical",
        status: "resolved",
        service: "application",
        instance: "frontend-01",
        summary: "服务下线",
        description: "前端服务实例 frontend-01 已下线",
        startsAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        duration: "1h",
      },
    ];

    res.json({
      success: true,
      data: {
        alerts: alertHistory,
        pagination: {
          total: alertHistory.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      },
    });
  } catch (error) {
    logger.error("获取告警历史失败:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 获取告警统计
 * GET /api/alerts/stats
 */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    // 模拟统计数据
    const stats = {
      today: {
        total: 15,
        critical: 3,
        warning: 8,
        info: 4,
        resolved: 12,
        active: 3,
      },
      week: {
        total: 87,
        critical: 12,
        warning: 45,
        info: 30,
        resolved: 82,
        active: 5,
      },
      month: {
        total: 342,
        critical: 28,
        warning: 189,
        info: 125,
        resolved: 315,
        active: 27,
      },
      trends: {
        cpu: { current: 75, average: 68, peak: 92 },
        memory: { current: 82, average: 78, peak: 95 },
        disk: { current: 45, average: 43, peak: 89 },
        responseTime: { current: 245, average: 189, peak: 890 },
        errorRate: { current: 2.3, average: 1.8, peak: 7.8 },
      },
      topServices: [
        { name: "application", count: 45, percentage: 35 },
        { name: "system", count: 38, percentage: 30 },
        { name: "database", count: 25, percentage: 20 },
        { name: "cache", count: 12, percentage: 10 },
        { name: "ai", count: 6, percentage: 5 },
      ],
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("获取告警统计失败:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 确认告警
 * POST /api/alerts/:alertId/acknowledge
 */
router.post("/:alertId/acknowledge", authMiddleware, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { comment, user } = req.body;

    // 这里应该调用AlertManager API确认告警
    console.log(`告警确认: ${alertId} by ${user} - ${comment}`);
    res.json({
      success: true,
      data: {
        alertId,
        status: "acknowledged",
        acknowledgedBy: user,
        acknowledgedAt: new Date(),
        comment,
      },
    });
  } catch (error) {
    logger.error("确认告警失败:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 静默告警
 * POST /api/alerts/:alertId/silence
 */
router.post("/:alertId/silence", authMiddleware, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { duration, comment, user } = req.body;

    // 这里应该调用AlertManager API静默告警
    console.log(
      `告警静默: ${alertId} by ${user} for ${duration} minutes - ${comment}`,
    );
    res.json({
      success: true,
      data: {
        alertId,
        status: "silenced",
        silencedBy: user,
        silencedAt: new Date(),
        duration,
        silenceEndsAt: new Date(Date.now() + duration * 60 * 1000),
        comment,
      },
    });
  } catch (error) {
    logger.error("静默告警失败:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 解除告警静默
 * DELETE /api/alerts/:alertId/silence
 */
router.delete("/:alertId/silence", authMiddleware, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { user } = req.body;

    // 这里应该调用AlertManager API解除静默
    console.log(`解除静默: ${alertId} by ${user}`);
    res.json({
      success: true,
      data: {
        alertId,
        status: "active",
        unsilencedBy: user,
        unsilencedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("解除静默失败:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 创建告警规则
 * POST /api/alerts/rules
 */
router.post("/rules", authMiddleware, async (req, res) => {
  try {
    const { name, expr, duration, severity, summary, description, labels } =
      req.body;

    // 这里应该创建新的告警规则
    const newRule = {
      id: Date.now().toString(),
      name,
      expr,
      duration: duration || "5m",
      severity: severity || "warning",
      summary,
      description,
      labels: labels || {},
      enabled: true,
      createdAt: new Date(),
      createdBy: req.user?.id,
    };

    console.log("创建告警规则:", newRule);

    res.json({
      success: true,
      data: newRule,
    });
  } catch (error) {
    logger.error("创建告警规则失败:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 获取告警规则列表
 * GET /api/alerts/rules
 */
router.get("/rules", authMiddleware, async (req, res) => {
  try {
    // 模拟告警规则数据
    const rules = [
      {
        id: "1",
        name: "HighCPUUsage",
        expr: '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]) * 100)) > 80',
        duration: "5m",
        severity: "warning",
        summary: "CPU使用率过高",
        description: "实例 {{, $labels.instance }} CPU使用率超过80%",
        enabled: true,
        createdAt: new Date("2024-01-01"),
        lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: "2",
        name: "ServiceDown",
        expr: "up == 0",
        duration: "1m",
        severity: "critical",
        summary: "服务下线",
        description:
          "服务 {{, $labels.job }} 实例 {{, $labels.instance }} 已下线",
        enabled: true,
        createdAt: new Date("2024-01-01"),
        lastTriggered: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
    ];

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    logger.error("获取告警规则失败:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 测试告警规则
 * POST /api/alerts/rules/:ruleId/test
 */
router.post("/rules/:ruleId/test", authMiddleware, async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { timeRange } = req.body;

    // 这里应该测试告警规则
    const testResult = {
      ruleId,
      status: "passed",
      testTime: new Date(),
      timeRange: timeRange || "1h",
      wouldFire: false,
      currentValue: 65,
      threshold: 80,
      message: "规则在指定时间范围内不会触发告警",
    };

    res.json({
      success: true,
      data: testResult,
    });
  } catch (error) {
    logger.error("测试告警规则失败:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Webhook接收告警
 * POST /api/alerts/webhook
 */
router.post("/webhook", async (req, res) => {
  try {
    const { alerts, status } = req.body;

    // 处理来自AlertManager的webhook告警
    console.log("收到告警webhook:", { alerts, status });

    // 这里可以实现自定义的告警处理逻辑
    // 比如发送到企业微信、钉钉、飞书等

    // 示例：发送到企业微信
    for (const alert of alerts) {
      await sendToWechat(alert);
    }
    res.json({
      success: true,
      message: "告警已处理",
    });
  } catch (error) {
    logger.error("处理告警webhook失败:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 发送到企业微信
 */
async function sendToWechat(alert: any) {
  try {
    // 这里实现企业微信机器人发送逻辑
    console.log("发送告警到企业微信:", alert);

    // 示例代码结构
    // const wechatUrl = process.env.WECHAT_WEBHOOK_URL;
    // const message = {
    //   msgtype: 'markdown',
    //   markdown: {
    //     content: generateWechatMessage(alert)
    //   },
    // };
    // await axios.post(wechatUrl, message);
  } catch (error) {
    logger.error("发送企业微信消息失败:", error);
  }
}

export default router;
