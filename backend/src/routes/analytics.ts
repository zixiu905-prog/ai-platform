import express from "express";
import { logger } from "@/utils/logger";
import { AnalyticsService, AnalyticsQuery } from "@/services/analyticsService";
import { authMiddleware } from "@/middleware/auth";
import { authorize } from "@/middleware/auth";

const router = express.Router();
const analyticsService = new AnalyticsService();

/**
 * 获取分析数据
 * POST /api/analytics/data
 */
router.post(
  "/data",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const query: AnalyticsQuery = req.body;

      // 验证查询参数
      if (!query.startDate || !query.endDate) {
        return res.status(400).json({
          success: false,
          error: "请提供开始和结束日期",
          timestamp: new Date().toISOString(),
        });
      }
      const analyticsData = await analyticsService.getAnalytics(query);

      res.json({
        success: true,
        data: analyticsData,
      });
    } catch (error) {
      logger.error("获取分析数据失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 导出分析数据
 * POST /api/analytics/export
 */
router.post(
  "/export",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { query, options } = req.body;

      if (!query || !options) {
        return res.status(400).json({
          success: false,
          error: "请提供查询参数和导出选项",
          timestamp: new Date().toISOString(),
        });
      }
      const filePath = await analyticsService.exportAnalytics(query, options);

      res.json({
        success: true,
        data: {
          downloadUrl: filePath,
          format: options.format,
          fileSize: "123KB",
        },
      });
    } catch (error) {
      logger.error("导出分析数据失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取实时指标
 * GET /api/analytics/realtime
 */
router.get(
  "/realtime",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const realtimeData = await analyticsService.getRealtimeMetrics();

      res.json({
        success: true,
        data: realtimeData,
      });
    } catch (error) {
      logger.error("获取实时指标失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取用户仪表板数据
 * GET /api/analytics/dashboard
 */
router.get(
  "/dashboard",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const dashboardData = await analyticsService.getDashboardData();

      res.json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      logger.error("获取仪表板数据失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取趋势数据
 * GET /api/analytics/trends
 */
router.get(
  "/trends",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { metric, period } = req.query;

      if (!metric || !period) {
        return res.status(400).json({
          success: false,
          error: "请提供指标和周期参数",
          timestamp: new Date().toISOString(),
        });
      }
      const trendData = await analyticsService.getTrendData(
        metric as string,
        period as string,
      );

      res.json({
        success: true,
        data: trendData,
      });
    } catch (error) {
      logger.error("获取趋势数据失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取用户分组数据
 * GET /api/analytics/segments
 */
router.get(
  "/segments",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { segmentType } = req.query;

      const segmentData = await analyticsService.getUserSegments(
        segmentType as string,
      );

      res.json({
        success: true,
        data: segmentData,
      });
    } catch (error) {
      logger.error("获取用户分组数据失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取转化漏斗数据
 * GET /api/analytics/funnel
 */
router.get(
  "/funnel",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { funnelType } = req.query;

      const funnelData = await analyticsService.getFunnelData(
        funnelType as string,
      );

      res.json({
        success: true,
        data: funnelData,
      });
    } catch (error) {
      logger.error("获取转化漏斗数据失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取热力图数据
 * GET /api/analytics/heatmap
 */
router.get(
  "/heatmap",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { mapType } = req.query;

      const heatmapData = await analyticsService.getHeatmapData(
        mapType as string,
      );

      res.json({
        success: true,
        data: heatmapData,
      });
    } catch (error) {
      logger.error("获取热力图数据失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取自定义报告
 * POST /api/analytics/custom-report
 */
router.post(
  "/custom-report",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { reportConfig } = req.body;

      if (!reportConfig) {
        return res.status(400).json({
          success: false,
          error: "请提供报告配置",
          timestamp: new Date().toISOString(),
        });
      }
      const reportData =
        await analyticsService.generateCustomReport(reportConfig);

      res.json({
        success: true,
        data: reportData,
      });
    } catch (error) {
      logger.error("获取自定义报告失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取预测数据
 * GET /api/analytics/forecast
 */
router.get(
  "/forecast",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { metric, period } = req.query;

      const forecastData = await analyticsService.getForecastData(
        metric as string,
        period as string,
      );

      res.json({
        success: true,
        data: forecastData,
      });
    } catch (error) {
      logger.error("获取预测数据失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取比较分析数据
 * POST /api/analytics/comparison
 */
router.post(
  "/comparison",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { period1, period2, metrics } = req.body;

      if (!period1 || !period2 || !metrics) {
        return res.status(400).json({
          success: false,
          error: "请提供比较周期和指标",
          timestamp: new Date().toISOString(),
        });
      }
      const comparisonData = await analyticsService.getComparisonData(
        period1,
        period2,
        metrics,
      );

      res.json({
        success: true,
        data: comparisonData,
      });
    } catch (error) {
      logger.error("获取比较分析数据失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取告警配置
 * GET /api/analytics/alerts
 */
router.get(
  "/alerts",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const alerts = await analyticsService.getAlerts();

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      logger.error("获取告警配置失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 更新告警配置
 * PUT /api/analytics/alerts/:id
 */
router.put(
  "/alerts/:id",
  authMiddleware,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const alertConfig = req.body;

      const updatedAlert = await analyticsService.updateAlert(id, alertConfig);

      res.json({
        success: true,
        data: updatedAlert,
      });
    } catch (error) {
      logger.error("更新告警配置失败:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

export default router;
