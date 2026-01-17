/**
 * 结构化日志系统
 * 替换console.log，提供更好的日志管理
 */
export declare enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    userId?: string;
    requestId?: string;
    service?: string;
    stack?: string;
}
export declare class Logger {
    private static instance;
    private logFile;
    private logLevel;
    private serviceName;
    constructor();
    static getInstance(): Logger;
    private getLogLevelFromEnv;
    private formatLogEntry;
    private writeLog;
    error(message: string, context?: any, userId?: string, requestId?: string): void;
    warn(message: string, context?: any, userId?: string, requestId?: string): void;
    info(message: string, context?: any, userId?: string, requestId?: string): void;
    debug(message: string, context?: any, userId?: string, requestId?: string): void;
    createModuleLogger(moduleName: string): ModuleLogger;
    getLogStats(): {
        totalLogs: number;
        errorCount: number;
        warnCount: number;
        infoCount: number;
        debugCount: number;
    };
}
export declare class ModuleLogger {
    private logger;
    private moduleName;
    constructor(logger: Logger, moduleName: string);
    private getContext;
    error(message: string, context?: Record<string, any>, userId?: string, requestId?: string): void;
    warn(message: string, context?: Record<string, any>, userId?: string, requestId?: string): void;
    info(message: string, context?: Record<string, any>, userId?: string, requestId?: string): void;
    debug(message: string, context?: Record<string, any>, userId?: string, requestId?: string): void;
}
export declare const logger: Logger;
export declare function createLogger(moduleName: string): ModuleLogger;
export declare function requestLogger(req: any, res: any, next: any): void;
export declare function rotateLogs(): void;
export declare function errorHandler(error: Error, req: any, res: any, next: any): void;
//# sourceMappingURL=logger.d.ts.map