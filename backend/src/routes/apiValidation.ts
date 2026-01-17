import express, { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { ApiKeyValidationService } from "@/services/apiKeyValidationService";
import { authenticate, authorize } from "@/middleware/auth";
import { body, validationResult } from "express-validator";

const router = express.Router();

// 管理员认证中间件
const adminAuth = [authenticate, authorize(["ADMIN", "SUPER_ADMIN"])];

/**
 * 验证单个AI模型的API Key
 */
router.post(
  "/validate/:provider",
  adminAuth,
  [
    body("provider")
      .isIn(["zhipu", "doubao"])
      .withMessage("provider必须是zhipu或doubao"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }
      const { provider } = req.params;
      let result;

      if (provider === "zhipu") {
        result = await ApiKeyValidationService.validateZhipuApiKey();
      } else if (provider === "doubao") {
        result = await ApiKeyValidationService.validateDoubaoApiKey();
      }
      res.json({
        success: true,
        data: {
          ...result,
          validatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("API Key验证失败:", error);
      res.status(500).json({
        success: false,
        error: "验证过程中发生错误",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 验证所有AI模型的API Keys
 */
router.post("/validate-all", adminAuth, async (req: Request, res: Response) => {
  try {
    const results = await ApiKeyValidationService.validateAllApiKeys();

    res.json({
      success: true,
      data: {
        results,
        summary: {
          totalValid: results.filter((r) => r.isValid).length,
          totalInvalid: results.filter((r) => !r.isValid).length,
          validatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error("批量API Key验证失败:", error);
    res.status(500).json({
      success: false,
      error: "验证过程中发生错误",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 获取API Keys状态摘要
 */
router.get(
  "/status-summary",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const summary = await ApiKeyValidationService.getApiKeyStatusSummary();

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error("获取API Keys状态失败:", error);
      res.status(500).json({
        success: false,
        error: "获取状态失败",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

export default router;
