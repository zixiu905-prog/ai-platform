import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export interface DesktopMessage {
  type: string;
  payload?: any;
  timestamp?: Date;
  userId?: string;
}

export interface DesktopCommand {
  id: string;
  type: string;
  parameters: Record<string, any>;
  timeout?: number;
}

export interface DesktopResponse {
  commandId: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export interface DesktopConnection {
  id: string;
  userId: string;
  socketId: string;
  connectedAt: Date;
  lastActive: Date;
  status: 'active' | 'idle' | 'disconnected';
}

/**
 * 简化的桌面通信服务
 * 原表（desktopConnection、desktopMessage、desktopLog、desktopCommand）不存在
 * 改为纯内存实现
 */
export class DesktopCommunicationService {
  private io: SocketIOServer | null;
  private connections: Map<string, DesktopConnection>;
  private pendingCommands: Map<string, {
    resolve: (response: DesktopResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>;

  constructor() {
    this.io = null;
    this.connections = new Map();
    this.pendingCommands = new Map();
  }

  /**
   * 初始化Socket.IO服务
   */
  initialize(io: SocketIOServer): void {
    this.io = io;

    io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    logger.info('Desktop Communication Service initialized (simplified version)');
  }

  /**
   * 处理新的连接
   */
  private async handleConnection(socket: Socket): Promise<void> {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId as string;

    if (!userId) {
      socket.disconnect();
      logger.warn('Connection rejected: No userId provided');
      return;
    }

    const connection: DesktopConnection = {
      id: socket.id,
      userId,
      socketId: socket.id,
      connectedAt: new Date(),
      lastActive: new Date(),
      status: 'active'
    };

    this.connections.set(socket.id, connection);

    logger.info(`Desktop connected: ${socket.id} for user ${userId}`);

    // 设置消息处理器
    socket.on('message', (data: DesktopMessage) => this.handleMessage(socket, data));
    socket.on('command_response', (response: DesktopResponse) => this.handleCommandResponse(response));
    socket.on('disconnect', () => this.handleDisconnect(socket));
    socket.on('ping', () => socket.emit('pong', { timestamp: new Date() }));
  }

  /**
   * 处理消息
   */
  private async handleMessage(socket: Socket, message: DesktopMessage): Promise<void> {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    connection.lastActive = new Date();
    connection.status = 'active';

    logger.debug(`Message from ${socket.id}:`, message);

    // 不保存到数据库（表不存在）
    // 根据消息类型处理
    switch (message.type) {
      case 'status':
        await this.handleStatusMessage(socket, connection, message.payload);
        break;
      case 'log':
        await this.handleLogMessage(socket, connection, message.payload);
        break;
      case 'notification':
        await this.handleNotificationMessage(socket, connection, message.payload);
        break;
      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * 处理状态消息
   */
  private async handleStatusMessage(socket: Socket, connection: DesktopConnection, payload: any): Promise<void> {
    logger.info(`Status update from ${socket.id}:`, payload);
    socket.emit('status_ack', { success: true, timestamp: new Date() });
  }

  /**
   * 处理日志消息
   */
  private async handleLogMessage(socket: Socket, connection: DesktopConnection, payload: any): Promise<void> {
    logger.info(`Log from ${socket.id}:`, payload);
    socket.emit('log_ack', { success: true, timestamp: new Date() });
  }

  /**
   * 处理通知消息
   */
  private async handleNotificationMessage(socket: Socket, connection: DesktopConnection, payload: any): Promise<void> {
    // 通知其他相关用户
    if (this.io) {
      this.io.to(`user_${connection.userId}`).emit('notification', {
        ...payload,
        fromUserId: connection.userId,
        timestamp: new Date()
      });
    }
  }

  /**
   * 处理命令响应
   */
  private handleCommandResponse(response: DesktopResponse): void {
    const pending = this.pendingCommands.get(response.commandId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCommands.delete(response.commandId);

      if (response.success) {
        pending.resolve(response);
      } else {
        pending.reject(new Error(response.error || 'Command failed'));
      }

      logger.debug(`Command response received for ${response.commandId}`);
    }
  }

  /**
   * 处理断开连接
   */
  private async handleDisconnect(socket: Socket): Promise<void> {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    this.connections.delete(socket.id);

    logger.info(`Desktop disconnected: ${socket.id}`);

    // 清理待处理的命令
    for (const [commandId, pending] of this.pendingCommands.entries()) {
      if (connection.socketId === socket.id) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Connection lost'));
        this.pendingCommands.delete(commandId);
      }
    }
  }

  /**
   * 发送消息到桌面客户端
   */
  async sendMessage(userId: string, message: DesktopMessage): Promise<boolean> {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return false;
    }

    const userConnections = Array.from(this.connections.values()).filter(c => c.userId === userId);

    if (userConnections.length === 0) {
      logger.warn(`No active connection for user ${userId}`);
      return false;
    }

    for (const connection of userConnections) {
      this.io!.to(connection.socketId).emit('message', {
        ...message,
        timestamp: new Date()
      });
    }

    return true;
  }

  /**
   * 发送命令到桌面客户端
   */
  async sendCommand(userId: string, command: DesktopCommand): Promise<DesktopResponse> {
    return new Promise((resolve, reject) => {
      const userConnections = Array.from(this.connections.values()).filter(c => c.userId === userId);

      if (userConnections.length === 0) {
        reject(new Error('No active connection for user'));
        return;
      }

      logger.debug(`Sending command ${command.id} to user ${userId}`);

      // 发送命令
      this.io!.to(userConnections[0].socketId).emit('command', command);

      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(command.id);
        reject(new Error('Command timeout'));
      }, command.timeout || 30000);

      this.pendingCommands.set(command.id, { resolve, reject, timeout });
    });
  }

  /**
   * 获取连接状态
   */
  async getConnectionStatus(userId?: string): Promise<DesktopConnection[]> {
    const connections = Array.from(this.connections.values());

    if (userId) {
      return connections.filter(c => c.userId === userId);
    }

    return connections;
  }

  /**
   * 获取活跃连接数
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 广播消息到所有连接
   */
  async broadcast(message: DesktopMessage): Promise<void> {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }

    this.io.emit('message', {
      ...message,
      timestamp: new Date()
    });
  }

  /**
   * 发送通知给指定用户
   */
  async sendNotification(userId: string, notification: any): Promise<boolean> {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return false;
    }

    const userConnections = Array.from(this.connections.values()).filter(c => c.userId === userId);

    if (userConnections.length === 0) {
      return false;
    }

    for (const connection of userConnections) {
      this.io!.to(connection.socketId).emit('notification', {
        ...notification,
        timestamp: new Date()
      });
    }

    return true;
  }
}

export const desktopCommunicationService = new DesktopCommunicationService();
