import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

export interface WebSocketConfig {
  url: string;
  token?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface TaskMessage {
  id: string;
  type: 'ai_command' | 'automation_task' | 'file_operation' | 'system_command';
  command: string;
  parameters?: any;
  timestamp: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface StatusMessage {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  result?: any;
  error?: string;
  timestamp: number;
}

export class WebSocketClient extends EventEmitter {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private isConnecting = false;
  private reconnectCount = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;

  constructor(config: WebSocketConfig) {
    super();
    this.config = config;
    this.maxReconnectAttempts = config.reconnectAttempts || 5;
    this.reconnectDelay = config.reconnectDelay || 3000;
  }

  on(event: string, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  async connect(): Promise<boolean> {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      return true;
    }

    this.isConnecting = true;
    
    try {
      return new Promise((resolve, reject) => {
        const connectionOptions: any = {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true
        };

        if (this.config.token) {
          connectionOptions.auth = { token: this.config.token };
        }

        this.socket = io(this.config.url, connectionOptions);

        this.socket.on('connect', () => {
          console.log('WebSocket连接已建立');
          this.isConnecting = false;
          this.reconnectCount = 0;
          this.emit('connected');
          resolve(true);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket连接已断开:', reason);
          this.emit('disconnected', reason);
          
          if (reason === 'io server disconnect') {
            // 服务器主动断开，需要重新连接
            this.handleReconnect();
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket连接错误:', error);
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        });

        // 任务相关事件
        this.socket.on('task', (task: TaskMessage) => {
          console.log('收到新任务:', task);
          this.emit('task', task);
        });

        this.socket.on('task_cancel', (taskId: string) => {
          console.log('任务被取消:', taskId);
          this.emit('task_cancel', taskId);
        });

        // 状态确认
        this.socket.on('status_acknowledged', (data: { taskId: string; timestamp: number }) => {
          console.log('状态已确认:', data);
          this.emit('status_acknowledged', data);
        });

        // 心跳检测
        this.socket.on('ping', () => {
          this.socket?.emit('pong');
        });

        // 认证相关
        this.socket.on('authenticated', (data) => {
          console.log('认证成功:', data);
          this.emit('authenticated', data);
        });

        this.socket.on('authentication_error', (error) => {
          console.error('认证失败:', error);
          this.emit('authentication_error', error);
        });
      });
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectCount >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectCount++;
    console.log(`尝试重连 (${this.reconnectCount}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('重连失败:', error);
        this.handleReconnect();
      }
    }, this.reconnectDelay * this.reconnectCount);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectCount = 0;
  }

  sendStatus(status: StatusMessage): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('status', status);
      console.log('发送状态:', status);
    } else {
      console.warn('WebSocket未连接，无法发送状态');
    }
  }

  sendHeartbeat(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('heartbeat', {
        timestamp: Date.now(),
        clientInfo: {
          platform: process.platform,
          version: '1.0.0',
          capabilities: ['photoshop', 'autocad', 'blender', 'file_operations']
        }
      });
    }
  }

  authenticate(token: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('authenticate', { token });
      this.config.token = token;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    if (this.socket?.connected) return 'connected';
    if (this.isConnecting) return 'connecting';
    if (this.reconnectCount >= this.maxReconnectAttempts) return 'error';
    return 'disconnected';
  }

  getConfig(): WebSocketConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// 单例模式的WebSocket管理器
export class WebSocketManager extends EventEmitter {
  private static instance: WebSocketManager | null = null;
  private client: WebSocketClient | null = null;

  private constructor() {
    super();
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  on(event: string, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  async initialize(config: WebSocketConfig): Promise<boolean> {
    try {
      this.client = new WebSocketClient(config);
      
      // 转发客户端事件
      this.client.on('connected', () => this.emit('connected'));
      this.client.on('disconnected', (reason) => this.emit('disconnected', reason));
      this.client.on('error', (error) => this.emit('error', error));
      this.client.on('task', (task) => this.emit('task', task));
      this.client.on('task_cancel', (taskId) => this.emit('task_cancel', taskId));
      this.client.on('authenticated', (data) => this.emit('authenticated', data));
      this.client.on('authentication_error', (error) => this.emit('authentication_error', error));

      return await this.client.connect();
    } catch (error) {
      console.error('WebSocket初始化失败:', error);
      return false;
    }
  }

  sendStatus(status: StatusMessage): void {
    this.client?.sendStatus(status);
  }

  isConnected(): boolean {
    return this.client?.isConnected() || false;
  }

  disconnect(): void {
    this.client?.disconnect();
    this.client = null;
  }

  getClient(): WebSocketClient | null {
    return this.client;
  }
}