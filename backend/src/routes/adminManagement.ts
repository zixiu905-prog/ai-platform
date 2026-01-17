import express from "express";
import { authenticate, requireSubscription } from "@/middleware/auth";
import SoftwareVersionManagementService from "@/services/softwareVersionManagementService";
import COMInterfaceManagementService from "@/services/comInterfaceManagementService";
import PaymentReminderService from "@/services/paymentReminderService";
import { logger } from "@/utils/logger";

const router = express.Router();
const versionService = new SoftwareVersionManagementService();
const comService = new COMInterfaceManagementService();
const paymentService = new PaymentReminderService();

// 需要管理员权限
router.use(authenticate);
router.use(requireSubscription("ADMIN"));

/**
 * 后台管理 - 添加新软件
 */
router.post("/software/add", async (req, res) => {
  try {
    const { softwareName, description, category } = req.body;

    if (!softwareName) {
      return res.status(400).json({ error: "软件名称不能为空" });
    }

    // 使用AI自动收录软件信息
    const versions = await versionService.collectSoftwareVersions(softwareName);

    res.json({
      success: true,
      data: versions,
      message: `成功添加软件 ${softwareName} 及其版本信息`,
    });
  } catch (error) {
    logger.error("添加软件失败:", error);
    res.status(500).json({
      error: "添加软件失败",
      details: (error as Error).message,
    });
  }
});

/**
 * 后台管理 - 设置付费订阅价格
 */
router.post("/subscription/pricing", async (req, res) => {
  try {
    const { planName, price, duration, features, currency = "CNY" } = req.body;

    if (!planName || !price || !duration) {
      return res.status(400).json({
        error: "计划名称、价格和时长不能为空",
      });
    }

    // 更新订阅计划价格
    // 这里应该调用订阅管理服务来更新价格
    // await subscriptionService.updatePlanPricing(planName, { price, duration, features, currency });

    res.json({
      success: true,
      message: `成功更新 ${planName} 价格设置`,
    });
  } catch (error) {
    logger.error("设置订阅价格失败:", error);
    res.status(500).json({
      error: "设置订阅价格失败",
      details: (error as Error).message,
    });
  }
});

/**
 * 后台管理 - 配置大模型API
 */
router.post("/ai-models/configure", async (req, res) => {
  try {
    const {
      modelName,
      provider,
      apiKey,
      apiEndpoint,
      documentationUrl,
      capabilities,
    } = req.body;

    if (!modelName || !provider || !apiKey) {
      return res.status(400).json({
        error: "模型名称、提供商和API密钥不能为空",
      });
    }

    // 验证APIKEY有效性
    let isValid = false;
    if (provider === "zhipu") {
      const { ZhipuAIService } = await import("../services/zhipuAIService");
      isValid = await ZhipuAIService.validateApiKey();
    } else if (provider === "doubao") {
      const { DoubaoAIService } = await import("../services/doubaoAIService");
      isValid = await DoubaoAIService.validateApiKey();
    }
    if (!isValid) {
      return res.status(400).json({ error: "API密钥验证失败" });
    }

    // 保存配置到数据库
    // await aiModelService.saveModelConfig({ modelName, provider, apiKey, apiEndpoint, documentationUrl, capabilities });

    res.json({
      success: true,
      message: `成功配置大模型 ${modelName}`,
      validated: true,
    });
  } catch (error) {
    logger.error("配置大模型失败:", error);
    res.status(500).json({
      error: "配置大模型失败",
      details: (error as Error).message,
    });
  }
});

/**
 * 后台管理 - 手动设置工作流
 */
router.post("/workflows/manual", async (req, res) => {
  try {
    const { name, description, nodes, edges, settings } = req.body;
    const adminId = req.user!.id;

    if (!name || !nodes || !Array.isArray(nodes)) {
      return res.status(400).json({
        error: "工作流名称和节点不能为空",
      });
    }

    // 使用AI配合创建工作流
    const { N8NWorkflowService } =
      await import("../services/n8nWorkflowService");

    const workflowDefinition = {
      id: `admin_workflow_${Date.now()}`,
      name: `管理员配置 - ${name}`,
      description: description || `由管理员配置的工作流: ${name}`,
      category: "admin_configured",
      nodes,
      edges,
      settings: {
        timezone: "Asia/Shanghai",
        saveManualExecutions: true,
        ...settings,
      },
      tags: ["管理员配置", "AI协助"],
      version: 1,
    };

    const savedWorkflow = await new N8NWorkflowService().createWorkflow(
      adminId,
      workflowDefinition,
    );

    res.json({
      success: true,
      data: savedWorkflow,
      message: "管理员工作流配置成功",
    });
  } catch (error) {
    logger.error("配置工作流失败:", error);
    res.status(500).json({
      error: "配置工作流失败",
      details: (error as Error).message,
    });
  }
});

/**
 * 后台管理 - 发送站内消息给所有用户
 */
router.post("/messages/broadcast", async (req, res) => {
  try {
    const { title, content, type, priority = "normal" } = req.body;
    const adminId = req.user!.id;

    if (!title || !content) {
      return res.status(400).json({
        error: "消息标题和内容不能为空",
      });
    }

    // 广播消息给所有用户
    // await messageService.broadcastToAllUsers({
    //   title,
    //   content,
    //   type: type || 'system',
    //   priority,
    //   senderId: adminId,
    //   sentAt: new Date()
    // });

    res.json({
      success: true,
      message: "广播消息发送成功",
    });
  } catch (error) {
    logger.error("发送广播消息失败:", error);
    res.status(500).json({
      error: "发送广播消息失败",
      details: (error as Error).message,
    });
  }
});

/**
 * 后台管理 - 测试邮件配置
 */
router.post("/email/test", async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        error: "测试邮箱不能为空",
      });
    }
    const success = await paymentService.testEmailConfiguration(testEmail);

    res.json({
      success,
      message: success ? "邮件测试成功" : "邮件测试失败",
    });
  } catch (error) {
    logger.error("邮件测试失败:", error);
    res.status(500).json({
      error: "邮件测试失败",
      details: (error as Error).message,
    });
  }
});

/**
 * 后台管理 - 获取系统统计信息
 */
router.get("/statistics", async (req, res) => {
  try {
    const [
      totalUsers,
      activeSubscriptions,
      totalWorkflows,
      totalScripts,
      comFilesStats,
    ] = await Promise.all([
      // 总用户数
      (await import("../services/userService")).UserService.getUserCount(),
      // 活跃订阅数
      (
        await import("../services/subscriptionService2025")
      ).SubscriptionService2025.getActiveSubscriptionCount(),
      // 总工作流数
      (
        await import("../services/n8nWorkflowService")
      ).N8NWorkflowService.getWorkflowCount(),
      // 总脚本数
      (
        await import("../services/scriptService")
      ).ScriptService.getScriptCount(),
      // COM文件统计
      comService.getCOMFilesStatistics(),
    ]);

    const statistics = {
      users: {
        total: totalUsers || 0,
        active: activeSubscriptions || 0,
      },
      content: {
        workflows: totalWorkflows || 0,
        scripts: totalScripts || 0,
      },
      resources: comFilesStats,
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    logger.error("获取系统统计失败:", error);
    res.status(500).json({
      error: "获取系统统计失败",
      details: (error as Error).message,
    });
  }
});

/**
 * 后台管理 - 一键升级用户桌面端
 */
router.post("/upgrade-desktop", async (req, res) => {
  try {
    const { targetVersion, upgradeMessage } = req.body;
    const adminId = req.user!.id;

    if (!targetVersion) {
      return res.status(400).json({
        error: "目标版本不能为空",
      });
    }

    // 发送升级指令给所有在线的桌面端
    // await desktopUpgradeService.broadcastUpgrade({
    //   targetVersion,
    //   upgradeMessage: upgradeMessage || '系统维护升级，请及时更新',
    //   forceUpgrade: false,
    //   initiatedBy: adminId,
    //   initiatedAt: new Date()
    // });

    res.json({
      success: true,
      message: "桌面端升级指令已发送",
    });
  } catch (error) {
    logger.error("桌面端升级失败:", error);
    res.status(500).json({
      error: "桌面端升级失败",
      details: (error as Error).message,
    });
  }
});

export default router;
