import express from "express";
import { prisma } from "@/config/database";
import { authenticate, requireSubscription } from "@/middleware/auth";
import { ChatController } from "@/controllers/chatController";
import { logger } from "@/utils/logger";

const router = express.Router();

// 错误处理辅助函数
const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "未知错误";
};

// 安全获取用户ID的辅助函数
const getUserId = (req: express.Request): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error("用户未认证");
  }
  return userId;
};

// 所有对话相关路由都需要认证
router.use(authenticate);

/**
 * @route GET /api/chat/conversations
 * @desc 获取用户的对话列表
 * @access Private
 */
router.get("/conversations", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "分页参数无效",
      });
    }
    const userId = getUserId(req);
    const result = await ChatController.getConversations(userId, page, limit);

    res.json({
      success: true,
      message: "获取对话列表成功",
      data: result,
    });
  } catch (error) {
    logger.error("获取对话列表失败:", error);
    res.status(500).json({
      success: false,
      message: "获取对话列表失败",
      error: getErrorMessage(error),
    });
  }
});

/**
 * @route GET /api/chat/conversations/:id
 * @desc 获取单个对话详情
 * @access Private
 */
router.get("/conversations/:id", async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = getUserId(req);

    const conversation = await ChatController.getConversation(
      conversationId as string,
      userId,
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "对话不存在",
      });
    }
    res.json({
      success: true,
      message: "获取对话详情成功",
      data: { conversation },
    });
  } catch (error) {
    logger.error("获取对话详情失败:", error);
    res.status(500).json({
      success: false,
      message: "获取对话详情失败",
      error: getErrorMessage(error),
    });
  }
});

/**
 * @route POST /api/chat/conversations
 * @desc 创建新对话
 * @access Private
 */
router.post(
  "/conversations",
  requireSubscription("basic"),
  async (req, res) => {
    try {
      const { title, model, settings } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: "对话标题不能为空",
        });
      }
      const userId = getUserId(req);
      const conversation = await ChatController.createConversation(
        userId,
        title,
        model,
        settings,
      );

      res.status(201).json({
        success: true,
        message: "创建对话成功",
        data: conversation,
      });
    } catch (error) {
      logger.error("创建对话失败:", error);
      res.status(500).json({
        success: false,
        message: "创建对话失败",
        error: getErrorMessage(error),
      });
    }
  },
);

/**
 * @route PUT /api/chat/conversations/:id
 * @desc 更新对话
 * @access Private
 */
router.put("/conversations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, settings } = req.body;

    const userId = getUserId(req);
    const conversation = await ChatController.updateConversation(id, userId, {
      title,
      settings,
    });

    res.json({
      success: true,
      message: "更新对话成功",
      data: conversation,
    });
  } catch (error) {
    logger.error("更新对话失败:", error);
    res.status(500).json({
      success: false,
      message: "更新对话失败",
      error: getErrorMessage(error),
    });
  }
});

/**
 * @route DELETE /api/chat/conversations/:id
 * @desc 删除对话
 * @access Private
 */
router.delete("/conversations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const userId = getUserId(req);
    await ChatController.deleteConversation(id, userId);

    res.json({
      success: true,
      message: "删除对话成功",
    });
  } catch (error) {
    logger.error("删除对话失败:", error);
    res.status(500).json({
      success: false,
      message: "删除对话失败",
      error: getErrorMessage(error),
    });
  }
});

/**
 * @route GET /api/chat/conversations/:id/messages
 * @desc 获取对话消息历史
 * @access Private
 */
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const userId = getUserId(req);
    const messages = await ChatController.getMessages(id, userId, Number(page), Number(limit));

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    logger.error("获取对话消息失败:", error);
    res.status(500).json({
      success: false,
      message: "获取对话消息失败",
      error: getErrorMessage(error),
    });
  }
});

/**
 * @route POST /api/chat/conversations/:id/messages
 * @desc 发送消息
 * @access Private
 */
router.post(
  "/conversations/:id/messages",
  requireSubscription("basic"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { message, model, settings, stream = false } = req.body;

      if (!message || message.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "消息内容不能为空",
        });
      }
      const userId = getUserId(req);
      const response = await ChatController.sendMessage(userId, {
        conversationId: id,
        message: message.trim(),
        model,
        settings,
        stream,
      });

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error("发送消息失败:", error);
      res.status(500).json({
        success: false,
        message: "发送消息失败",
        error: getErrorMessage(error),
      });
    }
  },
);

/**
 * @route DELETE /api/chat/conversations/:id/messages/:messageId
 * @desc 删除消息
 * @access Private
 */
router.delete("/conversations/:id/messages/:messageId", async (req, res) => {
  try {
    const { id, messageId } = req.params;

    const userId = getUserId(req);
    await ChatController.deleteMessage(userId, messageId);

    res.json({
      success: true,
      message: "删除消息成功",
    });
  } catch (error) {
    logger.error("删除消息失败:", error);
    res.status(500).json({
      success: false,
      message: "删除消息失败",
      error: getErrorMessage(error),
    });
  }
});

export default router;
