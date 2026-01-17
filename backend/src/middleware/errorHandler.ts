// @ts-nocheck
const express = require('express');

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误类
 */
class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * 认证错误类
 */
class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 授权错误类
 */
class AuthorizationError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * 资源未找到错误类
 */
class NotFoundError extends AppError {
  constructor(message = '资源未找到') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

/**
 * 冲突错误类
 */
class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * 速率限制错误类
 */
class RateLimitError extends AppError {
  constructor(message = '请求过于频繁') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// 获取logger（延迟导入避免循环依赖）
let logger = null;
const getLogger = () => {
  if (!logger) {
    logger = require('../utils/logger');
  }
  return logger;
};

/**
 * 全局错误处理中间件
 */
const errorHandler = (error, req, res, next) => {
  const logger = getLogger();
  
  let statusCode = 500;
  let message = '服务器内部错误';
  let code = 'INTERNAL_SERVER_ERROR';
  let details = undefined;

  // 处理自定义错误
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'APP_ERROR';

    if (error instanceof ValidationError) {
      details = error.details;
    }
  }
  // 处理JWT错误
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的访问令牌';
    code = 'INVALID_TOKEN';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '访问令牌已过期';
    code = 'TOKEN_EXPIRED';
  }
  // 处理语法错误
  else if (error instanceof SyntaxError) {
    statusCode = 400;
    message = '请求格式错误';
    code = 'SYNTAX_ERROR';
  }
  // 处理其他已知错误
  else if (error.message) {
    message = error.message;
  }

  // 记录错误日志
  const errorLog = {
    message: error.message,
    stack: error.stack,
    statusCode,
    code,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get ? req.get('User-Agent') : undefined,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  };

  if (statusCode >= 500) {
    logger.error('服务器错误:', errorLog);
  } else {
    logger.warn('客户端错误:', errorLog);
  }

  // 构建响应
  const response = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString()
  };

  // 开发环境添加详细信息
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.details = details;
  } else if (details) {
    // 生产环境只显示安全的详细信息
    response.details = typeof details === 'string' ? details : undefined;
  }

  res.status(statusCode).json(response);
};

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`路由 ${req.method} ${req.path} 不存在`);
  next(error);
};

/**
 * 异步错误捕获包装器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Joi验证错误处理
 */
const handleJoiError = (error) => {
  const details = error.details.map((detail) => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));

  return new ValidationError('数据验证失败', details);
};

/**
 * 创建API响应
 */
const createResponse = (success, message, data, meta) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  return response;
};

/**
 * 创建成功响应
 */
const successResponse = (message = '操作成功', data, meta) => {
  return createResponse(true, message, data, meta);
};

/**
 * 创建错误响应
 */
const errorResponse = (message = '操作失败', data) => {
  return createResponse(false, message, data);
};

// 导出
module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleJoiError,
  createResponse,
  successResponse,
  errorResponse
};
