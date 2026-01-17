import { Socket, Server } from "socket.io";
import * as jwt from "jsonwebtoken";
import { redisService } from "./redis";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
  softwareInfo?: any;
}
/**
 * Socket.IO认证中间件
 */
const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void,
) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("认证令牌缺失"));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(new Error("服务器配置错误"));
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    socket.userId = decoded.userId;

    next();
  } catch (error) {
    console.warn("Socket认证失败:", error);
    next(new Error("认证失败"));
  }
};

/**
 * 初始化Socket.IO
 */
export const initSocketIO = (io: Server) => {
  // 使用认证中间件
  io.use(authenticateSocket);

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.info(`用户连接: ${socket.userId}, Socket ID: ${socket.id}`);

    // 加入用户专属房间
    if (socket.userId) {
      socket.join(`user_${socket.userId}`);

      // 设置用户在线状态
      redisService.setUserOnline(socket.userId, socket.id);
    }

    // 处理用户消息
    socket.on("user_message", async (data) => {
      try {
        console.info("收到用户消息:", {
          userId: socket.userId,

          message: data,
        });

        // 广播消息回用户
        socket.emit("message_response", {
          type: "user_message",
          data: {
            id: Date.now(),
            content: `收到消息: ${data.content}`,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error("处理用户消息失败:", error);
        socket.emit("error", {
          type: "user_message_error",
          details: (error as Error).message,
        });
      }
    });

    // 处理AI调用请求
    socket.on("ai_call", async (data) => {
      try {
        console.info("收到AI调用请求:", {
          userId: socket.userId,
          model: data.model,
          prompt: data.prompt?.substring(0, 100) + "...",
        });

        // 模拟AI响应
        setTimeout(() => {
          socket.emit("ai_response", {
            type: "ai_call_response",
            data: {
              id: data.id || Date.now(),
              model: data.model,
              response: "这是AI模型的模拟响应。实际实现将调用真实的AI服务。",
              timestamp: new Date().toISOString(),
            },
          });
        }, 1000);
      } catch (error) {
        console.error("AI调用失败:", error);
        socket.emit("error", {
          type: "ai_call_error",
          details: (error as Error).message,
        });
      }
    });

    // 处理软件连接请求
    socket.on("software_connect", async (data) => {
      try {
        console.info("收到软件连接请求:", {
          userId: socket.userId,
          software: data.software,
        });

        // 模拟软件连接
        socket.softwareInfo = data;

        socket.emit("software_response", {
          type: "software_connect_response",
          data: {
            software: data.software,
            status: "connected",
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error("软件连接失败:", error);
        socket.emit("error", {
          type: "software_connect_error",
          details: (error as Error).message,
        });
      }
    });

    // 处理工作流执行请求
    socket.on("workflow_execute", async (data) => {
      try {
        console.info("收到工作流执行请求:", {
          userId: socket.userId,
          workflowId: data.workflowId,
        });

        // 模拟工作流执行
        socket.emit("workflow_response", {
          type: "workflow_execute_response",
          data: {
            id: data.id || Date.now(),
            workflowId: data.workflowId,
            status: "completed",
            result: "工作流执行完成（模拟）",
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error("工作流执行失败:", error);
        socket.emit("error", {
          type: "workflow_execute_error",
          details: (error as Error).message,
        });
      }
    });

    // 处理心跳
    socket.on("ping", () => {
      socket.emit("pong", {
        timestamp: new Date().toISOString(),
      });
    });

    // 处理断开连接
    socket.on("disconnect", (reason) => {
      console.info(`用户断开连接: ${socket.userId}, 原因: ${reason}`);

      // 设置用户离线状态
      if (socket.userId) {
        redisService.setUserOffline(socket.userId);
      }

      // 清理临时数据
      if (socket.softwareInfo) {
        console.info("清理软件连接信息:", {
          userId: socket.userId,
          software: socket.softwareInfo.software,
        });
      }
    });

    // 发送连接成功消息
    socket.emit("connected", {
      type: "connection_success",
      data: {
        socketId: socket.id,
        timestamp: new Date().toISOString(),
        message: "连接成功",
      },
    });

    // 处理任务分发请求
    socket.on("task_request", async (data) => {
      try {
        console.info("收到任务请求:", {
          userId: socket.userId,

          taskType: data.taskType,
        });

        // 这里可以连接到AI服务获取任务
        // 暂时返回模拟任务
        const mockTask = {
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: data.taskType || "ai_command",
          command: "创建一个新的设计文档",
          parameters: {
            software: "photoshop",
            documentType: "web",
            dimensions: { width: 1920, height: 1080 },
          },
          timestamp: Date.now(),
          priority: "medium",
        };

        socket.emit("task", mockTask);
      } catch (error) {
        console.error("任务分发失败:", error);
        socket.emit("error", {
          type: "task_request_error",
          details: (error as Error).message,
        });
      }
    });

    // 处理状态更新
    socket.on("status", async (data) => {
      try {
        console.info("收到状态更新:", {
          userId: socket.userId,
          taskId: data.taskId,
          status: data.status,
        });

        // 将状态确认发送回客户端
        socket.emit("status_acknowledged", {
          taskId: data.taskId,
          timestamp: Date.now(),
        });

        // 如果需要，可以将状态保存到数据库
        // await saveTaskStatus(socket.userId, data);
      } catch (error) {
        console.error("状态更新处理失败:", error);
        socket.emit("error", {
          type: "status_update_error",
          details: (error as Error).message,
        });
      }
    });

    // 处理认证请求（用于桌面端重新认证）
    socket.on("authenticate", async (data) => {
      try {
        if (!data.token) {
          socket.emit("authentication_error", { message: "令牌缺失" });
          return;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          socket.emit("authentication_error", { message: "服务器配置错误" });
          return;
        }

        const decoded = jwt.verify(data.token, jwtSecret) as any;
        socket.userId = decoded.userId;

        // 更新用户在线状态
        if (socket.userId) {
          redisService.setUserOnline(socket.userId, socket.id);
        }

        socket.emit("authenticated", {
          userId: socket.userId,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("认证失败:", error);
        socket.emit("authentication_error", {
          message: "认证失败",
          details: (error as Error).message,
        });
      }
    });

    // 处理客户端能力注册
    socket.on("register_capabilities", async (data) => {
      try {
        console.info("注册客户端能力:", {
          userId: socket.userId,

          capabilities: data.capabilities,
        });

        // 保存客户端能力信息
        socket.softwareInfo = { capabilities: data.capabilities };

        socket.emit("capabilities_registered", {
          capabilities: data.capabilities,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("能力注册失败:", error);
        socket.emit("error", {
          type: "capabilities_registration_error",
          details: (error as Error).message,
        });
      }
    });

    // 处理软件操作结果
    socket.on("software_operation_result", async (data) => {
      try {
        console.info("收到软件操作结果:", {
          userId: socket.userId,
          operation: data.operation,
          success: data.success,
        });

        // 可以将结果保存到数据库或转发给其他服务
        // await saveOperationResult(socket.userId, data);
      } catch (error) {
        console.error("软件操作结果处理失败:", error);
      }
    });

    // 处理文件操作请求
    socket.on("file_operation", async (data) => {
      try {
        console.info("收到文件操作请求:", {
          userId: socket.userId,
          operation: data.operation,
          filePath: data.filePath,
        });

        // 这里可以处理文件上传、下载等操作
        socket.emit("file_operation_response", {
          operationId: data.operationId,
          status: "completed",
          result: "文件操作完成（模拟）",
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("文件操作失败:", error);
        socket.emit("error", {
          type: "file_operation_error",
          details: (error as Error).message,
        });
      }
    });
  });
  // 处理服务器级别错误
  io.on("error", (error) => {
    console.error("Socket.IO服务器错误:", error);
  });

  console.info("Socket.IO服务器初始化完成");
};

export default initSocketIO;
