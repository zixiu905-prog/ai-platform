import { io, Socket } from 'socket.io-client';

// WebSocket事件类型
export enum WebSocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
  RECONNECT = 'reconnect',
  RECONNECT_ERROR = 'reconnect_error',
  
  // 用户事件
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  USER_TYPING = 'user:typing',
  
  // 项目事件
  PROJECT_UPDATED = 'project:updated',
  PROJECT_CREATED = 'project:created',
  PROJECT_DELETED = 'project:deleted',
  PROJECT_SHARED = 'project:shared',
  
  // 工作流事件
  WORKFLOW_STARTED = 'workflow:started',
  WORKFLOW_COMPLETED = 'workflow:completed',
  WORKFLOW_FAILED = 'workflow:failed',
  
  // AI事件
  AI_RESPONSE = 'ai:response',
  AI_ERROR = 'ai:error',
  AI_PROGRESS = 'ai:progress',
  
  // 通知事件
  NOTIFICATION = 'notification',
  SYSTEM_MESSAGE = 'system:message',
  
  // 实时协作
  COLLABORATION_JOIN = 'collaboration:join',
  COLLABORATION_LEAVE = 'collaboration:leave',
  COLLABORATION_CURSOR_MOVE = 'collaboration:cursor:move',
  COLLABORATION_EDIT = 'collaboration:edit',
}

// 连接状态
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// WebSocket配置
interface WebSocketConfig {
  url: string;
  token?: string;
  autoConnect: boolean;
  reconnect: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
  timeout: number;
}

// 消息类型
interface WebSocketMessage {
  event: WebSocketEvent;
  data: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

// 事件处理器
type EventHandler = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private eventHandlers: Map<WebSocketEvent, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private connectionTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = {
      url: 'ws://localhost:3001',
      autoConnect: true,
      reconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      timeout: 10000,
      ...config
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * 连接WebSocket
   */
  connect(token?: string) {
    if (this.socket?.connected) {
      console.log('🔌 WebSocket已连接');
      return;
    }

    this.status = ConnectionStatus.CONNECTING;
    console.log('🔌 连接WebSocket:', this.config.url);

    this.socket = io(this.config.url, {
      auth: {
        token: token || this.config.token
      },
      timeout: this.config.timeout,
      reconnection: false, // 手动控制重连
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
    
    // 连接超时处理
    this.connectionTimer = setTimeout(() => {
      if (this.status === ConnectionStatus.CONNECTING) {
        this.status = ConnectionStatus.ERROR;
        console.error('❌ WebSocket连接超时');
        this.emit(WebSocketEvent.CONNECT_ERROR, { message: 'Connection timeout' });
      }
    }, this.config.timeout);
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    this.status = ConnectionStatus.DISCONNECTED;
    this.reconnectAttempts = 0;
    console.log('🔌 WebSocket已断开');
  }

  /**
   * 重新连接
   */
  reconnect() {
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, this.config.reconnectDelay);
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners() {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }

      this.status = ConnectionStatus.CONNECTED;
      this.reconnectAttempts = 0;
      console.log('✅ WebSocket连接成功');
      this.emit(WebSocketEvent.CONNECT, { socketId: this.socket?.id });
    });

    // 连接失败
    this.socket.on('connect_error', (error) => {
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }

      this.status = ConnectionStatus.ERROR;
      console.error('❌ WebSocket连接失败:', error);
      this.emit(WebSocketEvent.CONNECT_ERROR, error);

      // 自动重连
      if (this.config.reconnect && this.reconnectAttempts < this.config.reconnectAttempts) {
        this.attemptReconnect();
      }
    });

    // 断开连接
    this.socket.on('disconnect', (reason) => {
      this.status = ConnectionStatus.DISCONNECTED;
      console.log('🔌 WebSocket断开连接:', reason);
      this.emit(WebSocketEvent.DISCONNECT, { reason });

      // 自动重连
      if (this.config.reconnect && reason !== 'io client disconnect') {
        this.attemptReconnect();
      }
    });

    // 接收消息
    this.socket.onAny((event, data) => {
      this.handleMessage(event as WebSocketEvent, data);
    });

    // 重连尝试
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.status = ConnectionStatus.RECONNECTING;
      this.reconnectAttempts = attemptNumber;
      console.log(`🔄 WebSocket重连尝试 ${attemptNumber}/${this.config.reconnectAttempts}`);
    });

    // 重连成功
    this.socket.on('reconnect', (attemptNumber) => {
      this.status = ConnectionStatus.CONNECTED;
      this.reconnectAttempts = 0;
      console.log(`✅ WebSocket重连成功，尝试次数: ${attemptNumber}`);
      this.emit(WebSocketEvent.RECONNECT, { attempts: attemptNumber });
    });

    // 重连失败
    this.socket.on('reconnect_failed', () => {
      this.status = ConnectionStatus.ERROR;
      console.error('❌ WebSocket重连失败');
      this.emit(WebSocketEvent.RECONNECT_ERROR, { attempts: this.reconnectAttempts });
    });
  }

  /**
   * 尝试重连
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      this.status = ConnectionStatus.ERROR;
      console.error('❌ WebSocket重连次数已达上限');
      this.emit(WebSocketEvent.RECONNECT_ERROR, { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

    console.log(`🔄 ${delay}ms后尝试第${this.reconnectAttempts}次重连`);
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(event: WebSocketEvent, data: any) {
    const message: WebSocketMessage = {
      event,
      data,
      timestamp: new Date()
    };

    // 触发事件处理器
    this.emit(event, data);

    // 记录消息日志
    if (event !== WebSocketEvent.USER_TYPING) {
      console.log(`📨 WebSocket消息: ${event}`, data);
    }
  }

  /**
   * 发送消息
   */
  send(event: WebSocketEvent, data?: any) {
    if (!this.socket?.connected) {
      console.warn('⚠️ WebSocket未连接，无法发送消息:', event);
      return false;
    }

    try {
      this.socket.emit(event, data);
      console.log(`📤 发送WebSocket消息: ${event}`, data);
      return true;
    } catch (error) {
      console.error('❌ 发送WebSocket消息失败:', error);
      return false;
    }
  }

  /**
   * 发送带回调的消息
   */
  sendWithAck(event: WebSocketEvent, data?: any, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket未连接'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('消息发送超时'));
      }, timeout);

      this.socket.emit(event, data, (response: any) => {
        clearTimeout(timer);
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * 加入房间
   */
  joinRoom(roomId: string) {
    // @ts-ignore
    this.send('join-room', { roomId });
  }

  /**
   * 离开房间
   */
  leaveRoom(roomId: string) {
    // @ts-ignore
    this.send('leave-room', { roomId });
  }

  /**
   * 发送协作编辑事件
   */
  sendCollaborationEdit(data: {
    roomId: string;
    fileId: string;
    operation: 'insert' | 'delete' | 'replace';
    position: number;
    content?: string;
    length?: number;
  }) {
    this.send(WebSocketEvent.COLLABORATION_EDIT, data);
  }

  /**
   * 发送光标移动事件
   */
  sendCursorMove(data: {
    roomId: string;
    fileId: string;
    position: number;
    selection?: { start: number; end: number };
  }) {
    this.send(WebSocketEvent.COLLABORATION_CURSOR_MOVE, data);
  }

  /**
   * 发送AI请求
   */
  sendAIRequest(data: {
    type: 'chat' | 'code-completion' | 'analysis' | 'recommendation';
    input: string;
    context?: any;
  }) {
    return this.sendWithAck(WebSocketEvent.AI_RESPONSE, data);
  }

  /**
   * 注册事件处理器
   */
  on(event: WebSocketEvent, handler: EventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * 移除事件处理器
   */
  off(event: WebSocketEvent, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * 移除所有事件处理器
   */
  offAll(event?: WebSocketEvent) {
    if (event) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
    }
  }

  /**
   * 触发事件
   */
  private emit(event: WebSocketEvent, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`事件处理器执行失败 (${event}):`, error);
        }
      });
    }
  }

  /**
   * 获取连接状态
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * 获取Socket ID
   */
  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  /**
   * 获取连接统计信息
   */
  getStats() {
    return {
      status: this.status,
      connected: this.isConnected(),
      socketId: this.getSocketId(),
      reconnectAttempts: this.reconnectAttempts,
      eventHandlers: Object.fromEntries(
        Array.from(this.eventHandlers.entries()).map(([event, handlers]) => [event, handlers.size])
      )
    };
  }

  /**
   * 更新认证token
   */
  updateToken(token: string) {
    this.config.token = token;
    if (this.socket?.connected) {
      this.socket.emit('authenticate', { token });
    }
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<WebSocketConfig>) {
    this.config = { ...this.config, ...config };
    
    // 如果URL改变，重新连接
    if (config.url && config.url !== this.config.url) {
      this.disconnect();
      if (this.config.autoConnect) {
        this.connect();
      }
    }
  }

  /**
   * 获取配置
   */
  getConfig(): WebSocketConfig {
    return { ...this.config };
  }

  /**
   * 销毁服务
   */
  destroy() {
    this.disconnect();
    this.eventHandlers.clear();
  }
}

// 创建全局WebSocket服务实例
const webSocketService = new WebSocketService();

export default webSocketService;
export { WebSocketService };