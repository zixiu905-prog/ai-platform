import express from "express";
import { prisma } from "../config/database";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth";
const errorHandler = require("../middleware/errorHandler");
const { asyncHandler, handleJoiError } = errorHandler;
import authService from "../services/authService";
import rateLimit from "express-rate-limit";

const router = express.Router();

// 验证中间件
const validateRequest = (
  req: any,
  res: any,
  next: any,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationError = handleJoiError({ details: errors.array() });
    return res.status(400).json({
      success: false,
      message: validationError.message,
      errors: validationError.details,
    });
  }
  next();
};

// 注册限流
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP 15分钟内最多5次注册尝试
  message: {
    success: false,
    message: "注册请求过于频繁，请15分钟后再试",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 密码重置请求限流
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 限制每个IP 1小时内最多3次密码重置请求
  message: {
    success: false,
    message: "密码重置请求过于频繁，请1小时后再试",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route POST /api/auth/register
 * @desc 用户注册
 * @access Public
 */
router.post(
  "/register",
  registerLimiter,
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("请输入有效的邮箱地址"),
    body("password")
      .isLength({ min: 8, max: 128 })
      .withMessage("密码长度必须在8-128位之间")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      )
      .withMessage(
        "密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符",
      ),
    body("confirmPassword").custom((value: any, { req }: any) => {
      if (value !== req.body.password) {
        throw new Error("确认密码与密码不匹配");
      }
      return true;
    }),
    body("username")
      .optional()
      .isLength({ min: 3, max: 30 })
      .withMessage("用户名长度必须在3-30位之间")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("用户名只能包含字母、数字、下划线和连字符"),
    body("agreeTerms")
      .isBoolean()
      .custom((value: any) => {
        if (!value) {
          throw new Error("请同意服务条款");
        }
        return true;
      }),
  ],
  validateRequest,
  asyncHandler(async (req: any, res: any) => {
    const registerData = {
      email: req.body.email,
      password: req.body.password,
      name: req.body.username || req.body.name,
    };

    const result = await authService.register(registerData);

    if (!result.user || !result.tokens) {
      return res.status(400).json({
        success: false,
        message: result.message || '注册失败'
      });
    }

    const { user, tokens } = result;

    // 设置HTTP-only的refreshToken cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    });

    res.status(201).json({
      success: true,
      message: "注册成功！验证邮件已发送至您的邮箱，请查收并点击链接验证邮箱",
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          emailVerified: user.emailVerified,
        },
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        emailVerificationRequired: !user.emailVerified,
      },
    });
  }),
);

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("请输入有效的邮箱地址"),
    body("password").notEmpty().withMessage("请输入密码"),
    body("rememberMe")
      .optional()
      .isBoolean()
      .withMessage("rememberMe必须为布尔值"),
  ],
  validateRequest,
  asyncHandler(async (req: any, res: any) => {
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password,
    });

    if (!result.user || !result.tokens) {
      return res.status(400).json({
        success: false,
        message: result.message || '登录失败'
      });
    }

    const { user, tokens } = result;

    // 设置HTTP-only的refreshToken cookie
    const maxAge = req.body.rememberMe
      ? 7 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000; // 7天或1天
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge,
    });

    res.json({
      success: true,
      message: "登录成功",
      data: {
        user,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });
  }),
);

/**
 * @route POST /api/auth/logout
 * @desc 用户登出
 * @access Private
 */
router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req: any, res: any) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);

      // 清除cookie
      res.clearCookie("refreshToken");
    }
    res.json({
      success: true,
      message: "登出成功",
    });
  }),
);

/**
 * @route POST /api/auth/refresh
 * @desc 刷新访问令牌
 * @access Public
 */
router.post(
  "/refresh",
  asyncHandler(async (req: any, res: any) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "刷新令牌缺失",
      });
    }
    const result = await authService.refreshToken(refreshToken);

    if (!result.token || !result.refreshToken) {
      return res.status(401).json({
        success: false,
        message: result.message || '刷新令牌失败'
      });
    }

    // 设置新的refreshToken cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    });

    res.json({
      success: true,
      message: "令牌刷新成功",
      data: {
        accessToken: result.token,
        expiresIn: "7d",
      },
    });
  }),
);

/**
 * @route GET /api/auth/me
 * @desc 获取当前用户信息
 * @access Private
 */
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: any, res: any) => {
    const user = await prisma.users.findUnique({
      where: {
        id: req.user!.id,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        emailVerified: true,
        avatar: true,
        name: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }
    res.json({
      success: true,
      message: "获取用户信息成功",
      data: { user },
    });
  }),
);

/**
 * @route POST /api/auth/verify-email
 * @desc 验证邮箱
 * @access Public
 */
router.post(
  "/verify-email",
  [body("token").notEmpty().withMessage("验证令牌不能为空")],
  validateRequest,
  asyncHandler(async (req: any, res: any) => {
    const { token } = req.body;
    const result = await authService.verifyEmail(token);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          user: {
            id: result.user!.id,
            email: result.user!.email,
            emailVerified: result.user!.emailVerified,
          },
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  }),
);

/**
 * @route POST /api/auth/resend-verification
 * @desc 重新发送验证邮件
 * @access Public
 */
router.post(
  "/resend-verification",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("请输入有效的邮箱地址"),
  ],
  validateRequest,
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5分钟
    max: 3, // 限制每个IP 5分钟内最多3次请求
    message: {
      success: false,
      message: "请求过于频繁，请5分钟后再试",
    },
  }),
  asyncHandler(async (req: any, res: any) => {
    const { email } = req.body;
    const result = await authService.resendVerificationEmail(email);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  }),
);

/**
 * @route POST /api/auth/request-password-reset
 * @desc 请求密码重置
 * @access Public
 */
router.post(
  "/request-password-reset",
  passwordResetLimiter,
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("请输入有效的邮箱地址"),
  ],
  validateRequest,
  asyncHandler(async (req: any, res: any) => {
    const result = await authService.requestPasswordReset({ email: req.body.email });

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  }),
);

/**
 * @route POST /api/auth/reset-password
 * @desc 重置密码
 * @access Public
 */
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("重置令牌不能为空"),
    body("newPassword")
      .isLength({ min: 8, max: 128 })
      .withMessage("密码长度必须在8-128位之间")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      )
      .withMessage(
        "密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符",
      ),
    body("confirmPassword").custom((value: any, { req }: any) => {
      if (value !== req.body.newPassword) {
        throw new Error("确认密码与新密码不匹配");
      }
      return true;
    }),
  ],
  validateRequest,
  asyncHandler(async (req: any, res: any) => {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  }),
);

/**
 * @route PUT /api/auth/change-password
 * @desc 修改密码
 * @access Private
 */
router.put(
  "/change-password",
  authenticate,
  [
    body("currentPassword").notEmpty().withMessage("请输入当前密码"),
    body("newPassword")
      .isLength({ min: 8, max: 128 })
      .withMessage("密码长度必须在8-128位之间")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      )
      .withMessage(
        "密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符",
      ),
    body("confirmPassword").custom((value: any, { req }: any) => {
      if (value !== req.body.newPassword) {
        throw new Error("确认密码与新密码不匹配");
      }
      return true;
    }),
  ],
  validateRequest,
  asyncHandler(async (req: any, res: any) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user!.id,
      currentPassword,
      newPassword,
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  }),
);

/**
 * @route PUT /api/auth/profile
 * @desc 更新用户资料
 * @access Private
 */
router.put(
  "/profile",
  authenticate,
  [
    body("username")
      .optional()
      .isLength({ min: 3, max: 30 })
      .withMessage("用户名长度必须在3-30位之间")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("用户名只能包含字母、数字、下划线和连字符"),
    body("name")
      .optional()
      .isLength({ max: 100 })
      .withMessage("名称不能超过100字"),
  ],
  validateRequest,
  asyncHandler(async (req: any, res: any) => {
    const updateData: any = {
      username: req.body.username,
      name: req.body.name,
    };

    // 移除undefined值
    Object.keys(updateData).forEach((key: string) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const user = await prisma.users.update({
      where: {
        id: req.user!.id,
      },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: "资料更新成功",
      data: { user },
    });
  }),
);

export default router;;
