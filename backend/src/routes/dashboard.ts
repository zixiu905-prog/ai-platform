import { Router, Request, Response } from "express";
import { prisma } from "@/config/database";
import { logger } from "@/utils/logger";
import { authenticate } from "@/middleware/auth";

const router = Router();

// 获取仪表板统计数据
router.get("/stats", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // 并行获取各项统计数据
    const [
      totalProjects,
      activeProjects,
      totalWorkflows,
      activeWorkflows,
      totalScripts,
      activeScripts,
      connectedSoftwares,
      totalRecommendations,
    ] = await Promise.all([
      // 项目统计
      prisma.projects.count({
        where: userId ? { userId } : {},
      }),
      prisma.projects.count({
        where: {
          ...(userId ? { userId } : {}),
          status: "ACTIVE",
        },
      }),
      // 工作流统计
      prisma.workflows.count({
        where: userId ? { authorId: userId } : {},
      }),
      prisma.workflows.count({
        where: {
          ...(userId ? { authorId: userId } : {}),
          isActive: true,
        },
      }),
      // 脚本统计
      prisma.scripts.count({
        where: userId ? { authorId: userId } : {},
      }),
      prisma.scripts.count({
        where: {
          ...(userId ? { authorId: userId } : {}),
          isActive: true,
        },
      }),
      // 连接的软件数量
      prisma.user_softwares.count({
        where: {
          ...(userId ? { userId } : {}),
          isActive: true,
        },
      }),
      // 推荐总数
      prisma.recommendations.count({
        where: userId ? { userId } : {},
      }),
    ]);

    const stats = {
      totalProjects,
      activeProjects,
      totalWorkflows,
      activeWorkflows,
      totalScripts,
      activeScripts,
      connectedSoftwares,
      totalRecommendations,
    };

    logger.info("Dashboard stats retrieved successfully", { userId, stats });
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
});

// 获取软件连接状态
router.get("/softwares", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const softwares = await prisma.user_softwares.findMany({
      where: {
        ...(userId ? { userId } : {}),
        isActive: true,
      },
      include: {
        software_apis: {
          select: {
            id: true,
            softwareName: true,
            category: true,
            isActive: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({
      success: true,
      data: softwares,
    });
  } catch (error) {
    logger.error("Error fetching softwares:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch softwares",
    });
  }
});

// 获取最近活动
router.get(
  "/recent-activity",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { limit = 10 } = req.query;

      const recentActivity = await Promise.all([
        // 最近的对话
        prisma.conversations.findMany({
          where: userId ? { userId } : {},
          orderBy: { updatedAt: "desc" },
          take: Math.floor(Number(limit) / 3),
        }),
        // 最近的脚本
        prisma.scripts.findMany({
          where: userId ? { authorId: userId } : {},
          orderBy: { updatedAt: "desc" },
          take: Math.floor(Number(limit) / 3),
        }),
        // 最近的工作流
        prisma.workflows.findMany({
          where: userId ? { authorId: userId } : {},
          orderBy: { updatedAt: "desc" },
          take: Math.floor(Number(limit) / 3),
        }),
      ]);

      res.json({
        success: true,
        data: {
          conversations: recentActivity[0],
          scripts: recentActivity[1],
          workflows: recentActivity[2],
        },
      });
    } catch (error) {
      logger.error("Error fetching recent activity:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch recent activity",
      });
    }
  },
);

export default router;
