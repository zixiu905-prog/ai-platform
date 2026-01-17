import express from "express";
import { createLogger } from "@/utils/logger";
import { AppStoreService } from "@/services/appStoreService";
import { authenticate } from "@/middleware/auth";
import { body, param, query, validationResult } from "express-validator";

const router = express.Router();
const log = createLogger("appStore");
const appStoreService = new AppStoreService();

// 获取应用分类
router.get(
  "/categories",
  async (req: express.Request, res: express.Response) => {
    try {
      const { parentId } = req.query;
      const categories = await appStoreService.getCategories(
        parentId as string,
      );
      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// 创建应用分类 (需要管理员权限)
router.post(
  "/categories",
  authenticate,
  [
    body("name").notEmpty().withMessage("分类名称不能为空"),
    body("description").optional().isString(),
    body("icon").optional().isString(),
    body("color").optional().isString(),
    body("parentId").optional().isUUID(),
    body("sortOrder").optional().isInt({ min: 0 }),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const categoryData = {
        name: req.body.name,
        description: req.body.description,
        icon: req.body.icon,
        color: req.body.color,
        parentId: req.body.parentId,
        sortOrder: req.body.sortOrder || 0,
      };

      const category = await appStoreService.createCategory(categoryData);
      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// 搜索应用
router.get(
  "/apps/search",
  async (req: express.Request, res: express.Response) => {
    try {
      const filters = {
        categoryId: req.query.categoryId as string,
        developerId: req.query.developerId as string,
        isFree:
          req.query.isFree === "true"
            ? true
            : req.query.isFree === "false"
              ? false
              : undefined,
        isFeatured:
          req.query.isFeatured === "true"
            ? true
            : req.query.isFeatured === "false"
              ? false
              : undefined,
        minRating: req.query.minRating
          ? parseInt(req.query.minRating as string)
          : undefined,
        maxPrice: req.query.maxPrice
          ? parseFloat(req.query.maxPrice as string)
          : undefined,
        tags: req.query.tags
          ? (req.query.tags as string).split(",")
          : undefined,
        supportedOS: req.query.supportedOS
          ? (req.query.supportedOS as string).split(",")
          : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as
          | "name"
          | "rating"
          | "downloads"
          | "price"
          | "createdAt",
        sortOrder: req.query.sortOrder as "asc" | "desc",
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await appStoreService.searchApps(filters.search || '', {
        page: filters.page,
        limit: filters.limit,
        categoryId: filters.categoryId,
      });
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 获取热门应用
router.get(
  "/apps/featured",
  async (req: express.Request, res: express.Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const apps = await appStoreService.getFeaturedApps(limit);
      res.json({
        success: true,
        data: apps,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 获取最新应用
router.get(
  "/apps/latest",
  async (req: express.Request, res: express.Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const apps = await appStoreService.getLatestApps(limit);
      res.json({
        success: true,
        data: apps,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 获取应用详情
router.get(
  "/apps/:appId",
  [param("appId").isUUID().withMessage("应用ID格式无效")],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { appId } = req.params;
      const app = await appStoreService.getAppById(appId);

      if (!app) {
        return res.status(404).json({
          success: false,
          error: "应用不存在",
        });
      }
      res.json({
        success: true,
        data: app,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 记录应用下载
router.post(
  "/apps/:appId/download",
  [
    param("appId").isUUID().withMessage("应用ID格式无效"),
    body("userId").optional().isUUID().withMessage("用户ID格式无效"),
    body("ipAddress").optional().isIP().withMessage("IP地址格式无效"),
    body("userAgent").optional().isString(),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { appId } = req.params;
      const { userId, ipAddress, userAgent } = req.body;

      await appStoreService.recordDownload(appId, userId || 'anonymous');

      res.json({
        success: true,
        message: "下载记录成功",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 下载应用文件
router.get(
  "/apps/download",
  async (req: express.Request, res: express.Response) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: "下载URL不能为空",
        });
      }

      // 验证URL安全性
      let downloadUrl: URL;
      try {
        downloadUrl = new URL(url as string);
        if (!["http:", "https:"].includes(downloadUrl.protocol)) {
          throw new Error("不支持的协议");
        }
      } catch (urlError) {
        log.error("URL验证失败:", urlError);
        return res.status(400).json({
          success: false,
          error: "无效的下载URL",
        });
      }

      // 外发下载请求
      const response = await fetch(url as string);

      if (!response.ok) {
        throw new Error("下载失败");
      }

      // 设置响应头
      res.set({
        "Content-Type":
          response.headers.get("content-type") || "application/octet-stream",
        "Content-Length": response.headers.get("content-length"),
        "Cache-Control": "no-cache",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadUrl.pathname.split("/").pop() || "file")}"`,
      });

      // 流式传输文件
      if (response.body) {
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 切换收藏状态
router.post(
  "/apps/:appId/favorite",
  authenticate,
  [
    param("appId").isUUID().withMessage("应用ID格式无效"),
    body("userId").isUUID().withMessage("用户ID格式无效"),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { appId } = req.params;
      const { userId } = req.body;

      // 验证用户权限
      if (
        req.user!.id !== userId &&
        req.user!.role !== "ADMIN" &&
        req.user!.role !== "SUPER_ADMIN"
      ) {
        return res.status(403).json({
          success: false,
          error: "无权操作其他用户的收藏",
        });
      }
      const isFavorite = await appStoreService.toggleFavorite(appId, userId);

      res.json({
        success: true,
        data: { isFavorite },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 获取用户收藏的应用
router.get(
  "/users/:userId/favorites",
  [
    param("userId").isUUID().withMessage("用户ID格式无效"),
    query("page").optional().isInt({ min: 1 }).withMessage("页码必须是正整数"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("每页数量必须在1-100之间"),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { userId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const result = await appStoreService.getUserFavorites(userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 添加应用评价
router.post(
  "/apps/:appId/reviews",
  authenticate,
  [
    param("appId").isUUID().withMessage("应用ID格式无效"),
    body("userId").isUUID().withMessage("用户ID格式无效"),
    body("rating").isInt({ min: 1, max: 5 }).withMessage("评分必须在1-5之间"),
    body("title").optional().isString().withMessage("标题必须是字符串"),
    body("content").notEmpty().withMessage("评价内容不能为空"),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { appId } = req.params;
      const { userId, rating, title, content } = req.body;

      // 验证用户权限
      if (
        req.user!.id !== userId &&
        req.user!.role !== "ADMIN" &&
        req.user!.role !== "SUPER_ADMIN"
      ) {
        return res.status(403).json({
          success: false,
          error: "无权代其他用户评价",
        });
      }
      const reviewData = {
        rating,
        title,
        content,
      };

      const review = await appStoreService.addAppReview(
        appId,
        userId,
        reviewData,
      );

      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 获取应用统计信息
router.get(
  "/apps/:appId/stats",
  [param("appId").isUUID().withMessage("应用ID格式无效")],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { appId } = req.params;
      const stats = await appStoreService.getAppStats(appId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 检查应用更新
router.get(
  "/apps/:appId/updates",
  [
    param("appId").isUUID().withMessage("应用ID格式无效"),
    query("currentVersion").notEmpty().withMessage("当前版本不能为空"),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { appId } = req.params;
      const { currentVersion } = req.query;

      const app = await appStoreService.getAppById(appId);

      if (!app) {
        return res.status(404).json({
          success: false,
          error: "应用不存在",
        });
      }
      const hasUpdate = currentVersion !== app.version;

      res.json({
        success: true,
        data: {
          hasUpdate,
          currentVersion: currentVersion as string,
          latestVersion: app.version,
          updateInfo: hasUpdate ? app : null,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 创建应用 (需要开发者权限)
router.post(
  "/apps",
  authenticate,
  [
    body("name").notEmpty().withMessage("应用名称不能为空"),
    body("description").notEmpty().withMessage("应用描述不能为空"),
    body("categoryId").isUUID().withMessage("分类ID格式无效"),
    body("downloadUrl").isURL().withMessage("下载URL格式无效"),
    body("installSize").isInt({ min: 0 }).withMessage("安装大小必须是非负整数"),
    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("价格必须是非负数"),
    body("supportedOS")
      .optional()
      .isArray()
      .withMessage("支持的系统必须是数组"),
    body("features").optional().isArray().withMessage("功能列表必须是数组"),
    body("tags").optional().isArray().withMessage("标签列表必须是数组"),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      // 检查开发者权限
      if (
        req.user!.role !== "ADMIN" &&
        req.user!.role !== "SUPER_ADMIN" &&
        false
      ) {
        return res.status(403).json({
          success: false,
          error: "需要开发者权限",
        });
      }
      const appData = {
        name: req.body.name,
        description: req.body.description,
        shortDesc: req.body.shortDesc,
        categoryId: req.body.categoryId,
        iconUrl: req.body.iconUrl,
        screenshots: req.body.screenshots || [],
        downloadUrl: req.body.downloadUrl,
        installSize: req.body.installSize,
        minSystemReq: req.body.minSystemReq,
        maxSystemReq: req.body.maxSystemReq,
        supportedOS: req.body.supportedOS || [],
        features: req.body.features || [],
        changelog: req.body.changelog,
        privacyPolicy: req.body.privacyPolicy,
        termsOfUse: req.body.termsOfUse,
        price: req.body.price || 0,
        currency: req.body.currency || "USD",
        tags: req.body.tags || [],
      };

      const app = await appStoreService.createApp(appData, req.user!.id);

      res.json({
        success: true,
        data: app,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 更新应用 (需要所有者权限)
router.put(
  "/apps/:appId",
  authenticate,
  [
    param("appId").isUUID().withMessage("应用ID格式无效"),
    body("name").optional().notEmpty().withMessage("应用名称不能为空"),
    body("description").optional().notEmpty().withMessage("应用描述不能为空"),
    body("categoryId").optional().isUUID().withMessage("分类ID格式无效"),
    body("downloadUrl").optional().isURL().withMessage("下载URL格式无效"),
    body("installSize")
      .optional()
      .isInt({ min: 0 })
      .withMessage("安装大小必须是非负整数"),
    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("价格必须是非负数"),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { appId } = req.params;

      const existingApp = await appStoreService.getAppById(appId);
      if (!existingApp) {
        return res.status(404).json({
          success: false,
          error: "应用不存在",
        });
      }
      const updateData = {
        name: req.body.name,
        description: req.body.description,
        shortDesc: req.body.shortDesc,
        categoryId: req.body.categoryId,
        iconUrl: req.body.iconUrl,
        screenshots: req.body.screenshots,
        downloadUrl: req.body.downloadUrl,
        installSize: req.body.installSize,
        minSystemReq: req.body.minSystemReq,
        maxSystemReq: req.body.maxSystemReq,
        supportedOS: req.body.supportedOS,
        features: req.body.features,
        changelog: req.body.changelog,
        privacyPolicy: req.body.privacyPolicy,
        termsOfUse: req.body.termsOfUse,
        price: req.body.price,
        currency: req.body.currency,
        isActive: req.body.isActive,
        isFeatured: req.body.isFeatured,
        tags: req.body.tags,
      };

      const app = await appStoreService.updateApp(appId, updateData);

      res.json({
        success: true,
        data: app,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 删除应用 (需要所有者权限)
router.delete(
  "/apps/:appId",
  authenticate,
  [param("appId").isUUID().withMessage("应用ID格式无效")],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { appId } = req.params;

      const existingApp = await appStoreService.getAppById(appId);
      if (!existingApp) {
        return res.status(404).json({
          success: false,
          error: "应用不存在",
        });
      }
      await appStoreService.deleteApp(appId);

      res.json({
        success: true,
        message: "应用删除成功",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 添加应用版本
router.post(
  "/apps/:appId/versions",
  authenticate,
  [
    param("appId").isUUID().withMessage("应用ID格式无效"),
    body("version").notEmpty().withMessage("版本号不能为空"),
    body("versionCode").isInt({ min: 1 }).withMessage("版本代码必须是正整数"),
    body("downloadUrl").isURL().withMessage("下载URL格式无效"),
    body("downloadSize")
      .isInt({ min: 0 })
      .withMessage("下载大小必须是非负整数"),
    body("isBeta")
      .optional()
      .isBoolean()
      .withMessage("是否Beta版本必须是布尔值"),
    body("isStable")
      .optional()
      .isBoolean()
      .withMessage("是否稳定版必须是布尔值"),
    body("isActive").optional().isBoolean().withMessage("是否激活必须是布尔值"),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { appId } = req.params;

      const existingApp = await appStoreService.getAppById(appId);
      if (!existingApp) {
        return res.status(404).json({
          success: false,
          error: "应用不存在",
        });
      }
      const versionData = {
        version: req.body.version,
        versionCode: req.body.versionCode,
        changelog: req.body.changelog,
        downloadUrl: req.body.downloadUrl,
        downloadSize: req.body.downloadSize,
        minSystemReq: req.body.minSystemReq,
        maxSystemReq: req.body.maxSystemReq,
        supportedOS: req.body.supportedOS || [],
        isBeta: req.body.isBeta || false,
        isStable: req.body.isStable !== false,
        isActive: req.body.isActive !== false,
      };

      const version = await appStoreService.addAppVersion(appId, versionData);

      res.json({
        success: true,
        data: version,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

export default router;
