import express from "express";
import { prisma } from "../config/database";
import crypto from "crypto";
import { authenticate, requireSubscription } from "../middleware/auth";
import { ChatController } from "../controllers/chatController";
import { DoubaoAIService } from "../services/doubaoAIService";

// 临时使用console作为logger，直到logger.ts修复完成
// import { logger } from '../utils/logger';

const logger = {
  info: (message: string, ...args: any[]) =>
    console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) =>
    console.error(`[ERROR] ${message}`, ...args),
  warn: (message: string, ...args: any[]) =>
    console.warn(`[WARN] ${message}`, ...args),
  debug: (message: string, ...args: any[]) =>
    console.debug(`[DEBUG] ${message}`, ...args),
};

const router = express.Router();

// 错误处理辅助函数
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "未知错误";
};

// 安全日志记录函数
const safeLogError = (message: string, error: unknown) => {
  const errorObj =
    typeof error === "object" && error !== null ? error : { message: error };
  logger.error(message, errorObj as Record<string, any>);
};

// 聊天消息接口定义
interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  conversationId: string;
  userId?: string;
}

// 安全获取用户ID的辅助函数
const getUserId = (req: express.Request): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error("用户未认证");
  }
  return userId;
};

// 所有AI相关路由都需要认证
router.use(authenticate);

// 应用订阅检查中间件
router.use(requireSubscription("BASIC"));

/**
 * @route GET /api/ai/models
 * @desc 获取可用的AI模型列表
 * @access Private
 */
router.get("/models", async (_req, res) => {
  try {
    const models = ChatController.getAvailableModels();
    res.json({
      success: true,
      message: "获取AI模型列表成功",
      data: models,
    });
  } catch (error) {
    safeLogError("获取AI模型列表失败:", error);
    res.status(500).json({
      success: false,
      message: "获取AI模型列表失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/ai/chat
 * @desc AI对话接口（非流式）
 * @access Private
 */
router.post("/chat", requireSubscription("basic"), async (req, res) => {
  try {
    const { message, conversationId, model, settings } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "消息内容不能为空",
        timestamp: new Date().toISOString(),
      });
    }
    const userId = getUserId(req);
    const response = await ChatController.sendMessage(userId, {
      message: message.trim(),
      conversationId,
      model,
      settings,
      stream: false,
    });

    res.json({
      success: true,
      message: "AI对话成功",
      data: response,
    });
  } catch (error) {
    safeLogError("AI对话失败:", error);
    res.status(500).json({
      success: false,
      message: "AI对话失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/ai/chat/stream
 * @desc AI对话接口（流式）
 * @access Private
 */
router.post("/chat/stream", requireSubscription("basic"), async (req, res) => {
  try {
    const { message, conversationId, model, settings } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "消息内容不能为空",
        timestamp: new Date().toISOString(),
      });
    }

    // 设置SSE响应头
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });
    const userId = getUserId(req);

    try {
      // 创建或获取对话
      let conversation;
      if (conversationId) {
        conversation = await ChatController.getConversation(
          conversationId,
          userId,
        );
        if (!conversation) {
          throw new Error("对话不存在");
        }
      } else {
        conversation = await ChatController.createConversation(
          userId,
          "新对话",
          model,
          settings,
        );
      }

      // 保存用户消息
      const userMessage = await prisma.chat_messages.create({
        data: {
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          role: "USER",
          content: message.trim(),
          status: "COMPLETED",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 发送用户消息确认
      res.write(
        `data: ${JSON.stringify({
          type: "user_message",
          data: userMessage,
        })}\n\n`,
      );

      // 获取对话历史
      const messages = await prisma.chat_messages.findMany({
        where: {
          conversationId: conversation.id,
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      });

      const aiMessages = messages.map((msg: ChatMessage) => ({
        role: msg.role === "USER" ? "user" : "assistant",
        content: msg.content,
      }));
      if (settings?.systemPrompt) {
        aiMessages.unshift({
          role: "system",
          content: settings.systemPrompt,
        });
      }

      // 调用AI服务（这里需要实现流式调用）
      const selectedModel = model || conversation.model;
      let fullContent = "";
      let messageId = `ai-${Date.now()}`;

      // 创建临时AI消息记录
      const tempAiMessage = await prisma.chat_messages.create({
        data: {
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: "",
          model: selectedModel,
          status: "PROCESSING",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      res.write(
        `data: ${JSON.stringify({
          type: "ai_message_start",
          data: { messageId, model: selectedModel },
        })}\n\n`,
      );

      // 模拟流式响应（实际应该调用AI服务的流式API）
      await simulateAIStream(aiMessages, selectedModel, (chunk) => {
        fullContent += chunk;
        res.write(
          `data: ${JSON.stringify({
            type: "content",
            data: { chunk, content: fullContent },
          })}\n\n`,
        );
      });

      // 更新AI消息
      const updatedMessage = await prisma.chat_messages.update({
        where: {
          id: tempAiMessage.id,
        },
        data: {
          content: fullContent,
          status: "COMPLETED",
          tokens: 100, // 这里应该从AI响应中获取
          cost: 0.01, // 这里应该计算实际成本
          latency: 1000,
        },
      });

      // 更新对话统计
      await prisma.conversations.update({
        where: {
          id: conversation.id,
        },
        data: {
          messageCount: conversation.messageCount + 2,
          totalTokens: BigInt(conversation.totalTokens) + BigInt(100),
          totalCost: conversation.totalCost + 0.01,
          updatedAt: new Date(),
        },
      });

      // 发送完成消息
      res.write(
        `data: ${JSON.stringify({
          type: "complete",
          data: {
            message: updatedMessage,
            conversation: await ChatController.getConversation(
              conversation.id,
              userId,
            ),
            usage: {
              promptTokens: 50,
              completionTokens: 50,
              totalTokens: 100,
              cost: 0.01,
            },
          },
        })}\n\n`,
      );

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      safeLogError("流式对话失败:", error);
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: getErrorMessage(error),
        })}\n\n`,
      );
      res.end();
    }
  } catch (error) {
    safeLogError("设置流式对话失败:", error);
    res.status(500).json({
      success: false,
      message: "设置流式对话失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// 模拟AI流式响应（临时实现）
async function simulateAIStream(
  _messages: any[],
  _model: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  // 这里应该调用真实的AI流式API
  const responses = [
    "您好！我是AI助手，",
    "很高兴为您服务。",
    "请问有什么可以帮助您的吗？",
    "我会尽力回答您的问题。",
  ];

  let fullResponse = "";
  for (const response of responses) {
    onChunk(response);
    fullResponse += response;
    await new Promise((resolve) => setTimeout(resolve, 200)); // 模拟延迟
  }
  return fullResponse;
}

/**
 * @route POST /api/ai/analyze
 * @desc AI分析接口
 * @access Private
 */
router.post("/analyze", requireSubscription("pro"), async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "分析内容不能为空",
        timestamp: new Date().toISOString(),
      });
    }

    // 这里可以调用AI的多模态分析功能
    res.json({
      success: true,
      message: "AI分析功能开发中",
      data: null,
    });
  } catch (error) {
    safeLogError("AI分析失败:", error);
    res.status(500).json({
      success: false,
      message: "AI分析失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/ai/image/generate
 * @desc 生成图像
 * @access Private
 */
router.post(
  "/image/generate",
  requireSubscription("basic"),
  async (req, res) => {
    try {
      const { prompt, model, response_format, size, watermark } = req.body;

      if (!prompt || prompt.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "图像描述不能为空",
          timestamp: new Date().toISOString(),
        });
      }
      const request = {
        model: model || "doubao-seedream-4-5-251128",
        prompt: prompt.trim(),
        response_format: response_format || "url",
        size: size || "2K",
        sequential_image_generation: "disabled" as const,
        stream: false,
        watermark: watermark !== false,
      };

      const response = await DoubaoAIService.generateImage(request);

      res.json({
        success: true,
        message: "图像生成成功",
        data: response,
      });
    } catch (error) {
      safeLogError("图像生成失败:", error);
      res.status(500).json({
        success: false,
        message: "图像生成失败",
        error: getErrorMessage(error),
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * @route POST /api/ai/image/batch
 * @desc 批量生成图像
 * @access Private
 */
router.post("/image/batch", requireSubscription("pro"), async (req, res) => {
  try {
    const { prompts, model, options } = req.body;

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "提示词列表不能为空",
        timestamp: new Date().toISOString(),
      });
    }
    if (prompts.length > 10) {
      return res.status(400).json({
        success: false,
        message: "批量生成最多支持10张图像",
        timestamp: new Date().toISOString(),
      });
    }
    const responses = await DoubaoAIService.generateImages(
      prompts,
      model || "doubao-seedream-4-5-251128",
      options,
    );

    res.json({
      success: true,
      message: `批量图像生成成功，共${prompts.length}张`,
      data: responses,
    });
  } catch (error) {
    safeLogError("批量图像生成失败:", error);
    res.status(500).json({
      success: false,
      message: "批量图像生成失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/ai/image/design
 * @desc AI辅助设计图像生成
 * @access Private
 */
router.post("/image/design", requireSubscription("basic"), async (req, res) => {
  try {
    const { designBrief, style, format } = req.body;

    if (!designBrief || designBrief.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "设计主题不能为空",
        timestamp: new Date().toISOString(),
      });
    }
    const response = await DoubaoAIService.generateDesignImage(
      designBrief.trim(),
      style || "modern",
      format || "2K",
    );

    res.json({
      success: true,
      message: "设计图像生成成功",
      data: response,
    });
  } catch (error) {
    safeLogError("设计图像生成失败:", error);
    res.status(500).json({
      success: false,
      message: "设计图像生成失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/ai/image/interior
 * @desc 室内外设计图像生成
 * @access Private
 */
router.post("/image/interior", requireSubscription("pro"), async (req, res) => {
  try {
    const { spaceType, style, requirements, format } = req.body;

    if (!spaceType) {
      return res.status(400).json({
        success: false,
        message: "空间类型不能为空",
        timestamp: new Date().toISOString(),
      });
    }
    const validSpaces = [
      "living_room",
      "bedroom",
      "kitchen",
      "bathroom",
      "office",
      "garden",
    ];
    if (!validSpaces.includes(spaceType)) {
      return res.status(400).json({
        success: false,
        message: "无效的空间类型",
        timestamp: new Date().toISOString(),
      });
    }
    const response = await DoubaoAIService.generateInteriorDesignImage(
      spaceType,
      style || "modern",
      requirements || "",
      format || "2K",
    );

    res.json({
      success: true,
      message: "室内设计图像生成成功",
      data: response,
    });
  } catch (error) {
    safeLogError("室内设计图像生成失败:", error);
    res.status(500).json({
      success: false,
      message: "室内设计图像生成失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
