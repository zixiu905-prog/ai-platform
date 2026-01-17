import express from "express";
import { logger } from "@/utils/logger";
import { prisma } from "@/config/database";
import wechatPayService from "@/services/wechatPayService";

const router = express.Router();

/**
 * 查询支付记录
 */
router.get("/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payments.findUnique({
      where: { id: paymentId },
      include: { users: true },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "支付记录不存在",
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error("查询支付记录失败:", error);
    res.status(500).json({
      success: false,
      message: "查询失败",
    });
  }
});

/**
 * 获取用户的支付历史
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      prisma.payments.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
        include: { users: true },
      }),
      prisma.payments.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error("获取支付历史失败:", error);
    res.status(500).json({
      success: false,
      message: "获取失败",
    });
  }
});

export default router;
