"use strict";
/**
 * 结构化日志系统
 * 替换console.log，提供更好的日志管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.ModuleLogger = exports.Logger = exports.LogLevel = void 0;
exports.createLogger = createLogger;
exports.requestLogger = requestLogger;
exports.rotateLogs = rotateLogs;
exports.errorHandler = errorHandler;
const fs_1 = require("fs");
const path_1 = require("path");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.logFile = process.env.LOG_FILE || './logs/app.log';
        this.logLevel = this.getLogLevelFromEnv();
        this.serviceName = process.env.SERVICE_NAME || 'aidesign-backend';
        // 确保日志目录存在
        const logDir = (0, path_1.join)(process.cwd(), 'logs');
        if (!(0, fs_1.existsSync)(logDir)) {
            (0, fs_1.mkdirSync)(logDir, { recursive: true });
        }
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    getLogLevelFromEnv() {
        const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
        switch (level) {
            case 'ERROR': return LogLevel.ERROR;
            case 'WARN': return LogLevel.WARN;
            case 'INFO': return LogLevel.INFO;
            case 'DEBUG': return LogLevel.DEBUG;
            default: return LogLevel.INFO;
        }
    }
    formatLogEntry(entry) {
        const logData = {
            timestamp: entry.timestamp,
            level: LogLevel[entry.level],
            service: entry.service || this.serviceName,
            message: entry.message,
            ...(entry.context && { context: entry.context }),
            ...(entry.userId && { userId: entry.userId }),
            ...(entry.requestId && { requestId: entry.requestId }),
            ...(entry.stack && { stack: entry.stack })
        };
        return JSON.stringify(logData);
    }
    writeLog(entry) {
        if (entry.level > this.logLevel) {
            return;
        }
        const formattedLog = this.formatLogEntry(entry);
        // 写入文件
        try {
            (0, fs_1.appendFileSync)(this.logFile, formattedLog + '\n');
        }
        catch (error) {
            console.error('写入日志文件失败:', error);
        }
        // 控制台输出（开发环境）
        if (process.env.NODE_ENV !== 'production') {
            const levelColors = {
                [LogLevel.ERROR]: '\x1b[31m', // 红色
                [LogLevel.WARN]: '\x1b[33m', // 黄色
                [LogLevel.INFO]: '\x1b[36m', // 青色
                [LogLevel.DEBUG]: '\x1b[37m' // 白色
            };
            const reset = '\x1b[0m';
            const color = levelColors[entry.level];
            const levelName = LogLevel[entry.level];
            console.log(`${color}[${levelName}]${reset} ${entry.message}`, entry.context || '', entry.userId ? `(用户: ${entry.userId})` : '', entry.requestId ? `(请求: ${entry.requestId})` : '');
        }
    }
    error(message, context, userId, requestId) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: LogLevel.ERROR,
            message,
            context,
            userId,
            requestId,
            service: this.serviceName
        };
        if (context?.error instanceof Error) {
            entry.context = {
                ...context,
                error: context.error.message
            };
            entry.stack = context.error.stack;
        }
        this.writeLog(entry);
    }
    warn(message, context, userId, requestId) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: LogLevel.WARN,
            message,
            context,
            userId,
            requestId,
            service: this.serviceName
        });
    }
    info(message, context, userId, requestId) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: LogLevel.INFO,
            message,
            context,
            userId,
            requestId,
            service: this.serviceName
        });
    }
    debug(message, context, userId, requestId) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: LogLevel.DEBUG,
            message,
            context,
            userId,
            requestId,
            service: this.serviceName
        });
    }
    // 特定模块的日志记录器
    createModuleLogger(moduleName) {
        return new ModuleLogger(this, moduleName);
    }
    // 获取日志统计
    getLogStats() {
        try {
            const fs = require('fs');
            const content = fs.readFileSync(this.logFile, 'utf8');
            const lines = content.split('\n').filter((line) => line.trim());
            const stats = {
                totalLogs: lines.length,
                errorCount: 0,
                warnCount: 0,
                infoCount: 0,
                debugCount: 0
            };
            lines.forEach((line) => {
                try {
                    const logEntry = JSON.parse(line);
                    const level = logEntry.level?.toUpperCase();
                    switch (level) {
                        case 'ERROR':
                            stats.errorCount++;
                            break;
                        case 'WARN':
                            stats.warnCount++;
                            break;
                        case 'INFO':
                            stats.infoCount++;
                            break;
                        case 'DEBUG':
                            stats.debugCount++;
                            break;
                    }
                }
                catch {
                    // 忽略解析错误
                }
            });
            return stats;
        }
        catch {
            return {
                totalLogs: 0,
                errorCount: 0,
                warnCount: 0,
                infoCount: 0,
                debugCount: 0
            };
        }
    }
}
exports.Logger = Logger;
class ModuleLogger {
    constructor(logger, moduleName) {
        this.logger = logger;
        this.moduleName = moduleName;
    }
    getContext(context) {
        return {
            module: this.moduleName,
            ...context
        };
    }
    error(message, context, userId, requestId) {
        this.logger.error(message, this.getContext(context), userId, requestId);
    }
    warn(message, context, userId, requestId) {
        this.logger.warn(message, this.getContext(context), userId, requestId);
    }
    info(message, context, userId, requestId) {
        this.logger.info(message, this.getContext(context), userId, requestId);
    }
    debug(message, context, userId, requestId) {
        this.logger.debug(message, this.getContext(context), userId, requestId);
    }
}
exports.ModuleLogger = ModuleLogger;
// 导出单例实例
exports.logger = Logger.getInstance();
// 创建模块日志记录器的快捷方式
function createLogger(moduleName) {
    return exports.logger.createModuleLogger(moduleName);
}
// 中间件：为Express添加请求日志
function requestLogger(req, res, next) {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = req.user?.id;
    req.requestId = requestId;
    req.startTime = Date.now();
    exports.logger.info('API请求开始', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    }, userId, requestId);
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        exports.logger.info('API请求完成', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        }, userId, requestId);
    });
    next();
}
// 日志轮转函数
function rotateLogs() {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(process.cwd(), 'logs');
    const currentLogFile = path.join(logDir, 'app.log');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveLogFile = path.join(logDir, `app-${timestamp}.log`);
    if (fs.existsSync(currentLogFile)) {
        fs.renameSync(currentLogFile, archiveLogFile);
        exports.logger.info(`日志文件已轮转到: ${archiveLogFile}`);
    }
}
// 错误日志处理器
function errorHandler(error, req, res, next) {
    const requestId = req.requestId;
    const userId = req.user?.id;
    exports.logger.error('未处理的错误', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
    }, userId, requestId);
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
        requestId
    });
}
//# sourceMappingURL=logger.js.map