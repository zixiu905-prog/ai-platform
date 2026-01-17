import express, { Request, Response } from "express";
import { logger } from "@/utils/logger";
import {
  DocumentationService,
  ModelDocumentation,
} from "@/services/documentationService";
import { authenticate, authorize } from "@/middleware/auth";

const router = express.Router();

// 管理员认证中间件
const adminAuth = [authenticate, authorize(["ADMIN", "SUPER_ADMIN"])];

/**
 * 获取特定AI模型的文档
 */
router.get("/:provider", adminAuth, async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;

    if (!["zhipu", "doubao"].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: "无效的AI提供商",
        timestamp: new Date().toISOString(),
      });
    }

    // 先检查缓存
    const cachedDoc =
      await DocumentationService.getCachedDocumentation(provider);
    if (cachedDoc) {
      return res.json({
        success: true,
        data: {
          ...cachedDoc,
          fromCache: true,
        },
      });
    }

    // 获取最新文档
    let documentation: ModelDocumentation | null = null;
    if (provider === "zhipu") {
      documentation = await DocumentationService.fetchZhipuDocumentation();
    } else if (provider === "doubao") {
      documentation = await DocumentationService.fetchDoubaoDocumentation();
    }

    if (!documentation) {
      return res.status(500).json({
        success: false,
        error: "获取文档失败",
        timestamp: new Date().toISOString(),
      });
    }
    res.json({
      success: true,
      data: {
        ...documentation,
        fromCache: false,
      },
    });
  } catch (error) {
    logger.error("获取AI文档失败:", error);
    res.status(500).json({
      success: false,
      error: "获取文档过程中发生错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 获取所有AI模型的文档
 */
router.get("/all", adminAuth, async (req: Request, res: Response) => {
  try {
    const documentations = await DocumentationService.fetchAllDocumentation();

    res.json({
      success: true,
      data: {
        documentations,
        count: documentations.length,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("获取所有AI文档失败:", error);
    res.status(500).json({
      success: false,
      error: "获取文档过程中发生错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 刷新所有AI模型文档和配置
 */
router.post("/refresh", adminAuth, async (req: Request, res: Response) => {
  try {
    const configs = req.body || {};
    await DocumentationService.updateModelConfigurations(configs);

    res.json({
      success: true,
      message: "AI模型配置已根据最新文档更新",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("刷新AI配置失败:", error);
    res.status(500).json({
      success: false,
      error: "刷新配置过程中发生错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 获取文档缓存状态
 */
router.get("/cache-status", adminAuth, async (req: Request, res: Response) => {
  try {
    const [zhipuCache, doubaoCache] = await Promise.all([
      DocumentationService.getCachedDocumentation("zhipu"),
      DocumentationService.getCachedDocumentation("doubao"),
    ]);

    const cacheStatus = {
      zhipu: {
        exists: !!zhipuCache,
        lastUpdated: zhipuCache?.lastUpdated || null,
      },
      doubao: {
        exists: !!doubaoCache,
        lastUpdated: doubaoCache?.lastUpdated || null,
      },
      checkedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: cacheStatus,
    });
  } catch (error) {
    logger.error("获取缓存状态失败:", error);
    res.status(500).json({
      success: false,
      error: "获取缓存状态失败",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
