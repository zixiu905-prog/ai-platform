import express from "express";
import { logger } from "@/utils/logger";
import {
  CreateAlipayOrderParams,
} from "@/services/alipayService";
import alipayService from "@/services/alipayService";
import { prisma } from "@/config/database";

const router = express.Router();

/**
 * 创建支付宝网页支付订单
 */
router.post("/web", async (req, res) => {
  try {
    const { outTradeNo, totalAmount, subject, body, userId, planId } = req.body;

    // 验证参数
    if (!outTradeNo || !totalAmount || !subject || !userId) {
      return res.status(400).json({
        success: false,
        message: "参数不完整",
        timestamp: new Date().toISOString(),
      });
    }

    // 创建订单参数
    const orderParams: CreateAlipayOrderParams = {
      outTradeNo,
      totalAmount: totalAmount.toString(),
      subject,
      body: body || "",
      productCode: "FAST_INSTANT_TRADE_PAY",
      timeoutExpress: "30m",
    };

    // 调用支付宝服务创建订单
    const paymentUrl = await alipayService.createWebOrder(orderParams);

    // 在数据库中创建支付记录
    const paymentData: any = {
      userId,
      outTradeNo,
      amount: parseFloat(totalAmount),
      status: "PENDING",
      method: "ALIPAY",
      description: body,
      paymentUrl,
    };

    if (planId) {
      paymentData.planId = planId;
    }

    const payment = await prisma.payments.create({
      data: paymentData,
    });

    res.json({
      success: true,
      data: {
        paymentUrl,
        outTradeNo,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    logger.error("创建支付宝网页支付订单失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "创建订单失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 创建支付宝手机网站支付订单
 */
router.post("/wap", async (req, res) => {
  try {
    const { outTradeNo, totalAmount, subject, body, userId, planId } = req.body;

    // 验证参数
    if (!outTradeNo || !totalAmount || !subject || !userId) {
      return res.status(400).json({
        success: false,
        message: "参数不完整",
        timestamp: new Date().toISOString(),
      });
    }

    // 创建订单参数
    const orderParams: CreateAlipayOrderParams = {
      outTradeNo,
      totalAmount: totalAmount.toString(),
      subject,
      body: body || "",
      productCode: "QUICK_WAP_WAY",
      timeoutExpress: "30m",
    };

    // 调用支付宝服务创建订单
    const paymentUrl = await alipayService.createWapOrder(orderParams);

    // 在数据库中创建支付记录
    const paymentData: any = {
      userId,
      outTradeNo,
      amount: parseFloat(totalAmount),
      status: "PENDING",
      method: "ALIPAY",
      description: body,
      paymentUrl,
    };

    if (planId) {
      paymentData.planId = planId;
    }

    const payment = await prisma.payments.create({
      data: paymentData,
    });

    res.json({
      success: true,
      data: {
        paymentUrl,
        outTradeNo,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    logger.error("创建支付宝手机网站支付订单失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "创建订单失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 创建支付宝APP支付订单
 */
router.post("/app", async (req, res) => {
  try {
    const { outTradeNo, totalAmount, subject, body, userId, planId } = req.body;

    // 验证参数
    if (!outTradeNo || !totalAmount || !subject || !userId) {
      return res.status(400).json({
        success: false,
        message: "参数不完整",
        timestamp: new Date().toISOString(),
      });
    }

    // 创建订单参数
    const orderParams: CreateAlipayOrderParams = {
      outTradeNo,
      totalAmount: totalAmount.toString(),
      subject,
      body: body || "",
      productCode: "QUICK_MSECURITY_PAY",
      timeoutExpress: "30m",
    };

    // 调用支付宝服务创建订单
    const orderString = await alipayService.createAppOrder(orderParams);

    // 在数据库中创建支付记录
    const paymentData: any = {
      userId,
      outTradeNo,
      amount: parseFloat(totalAmount),
      status: "PENDING",
      method: "ALIPAY",
      description: body,
    };

    if (planId) {
      paymentData.planId = planId;
    }

    const payment = await prisma.payments.create({
      data: paymentData,
    });

    res.json({
      success: true,
      data: {
        orderString,
        outTradeNo,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    logger.error("创建支付宝APP支付订单失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "创建订单失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 查询支付宝订单状态
 */
router.get("/query/:outTradeNo", async (req, res) => {
  try {
    const { outTradeNo } = req.params;

    // 查询支付宝订单状态
    const orderResult = await alipayService.queryOrder(outTradeNo);

    // 更新数据库中的支付状态
    let status: "PENDING" | "COMPLETED" | "CANCELLED" = "PENDING";
    if (
      orderResult.code === "10000" &&
      orderResult.trade_status === "TRADE_SUCCESS"
    ) {
      status = "COMPLETED";
    } else if (orderResult.trade_status === "TRADE_CLOSED") {
      status = "CANCELLED";
    }

    await prisma.payments.updateMany({
      where: { outTradeNo: outTradeNo },
      data: {
        status: status as any,
        updatedAt: new Date(),
        transactionId: orderResult.trade_no,
      },
    });

    res.json({
      success: true,
      data: {
        status: orderResult.trade_status,
        outTradeNo,
        tradeNo: orderResult.trade_no,
        amount: orderResult.total_amount,
        payTime: orderResult.send_pay_date,
        buyerId: orderResult.buyer_id,
        buyerLogonId: orderResult.buyer_logon_id,
      },
    });
  } catch (error) {
    logger.error("查询支付宝订单失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "查询订单失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 关闭支付宝订单
 */
router.post("/close/:outTradeNo", async (req, res) => {
  try {
    const { outTradeNo } = req.params;

    // 调用支付宝服务关闭订单
    const success = await alipayService.closeOrder(outTradeNo);

    if (success) {
      // 更新数据库中的支付状态
      await prisma.payments.updateMany({
        where: { outTradeNo },
        data: {
          status: "CANCELLED",
          updatedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      message: success ? "订单已关闭" : "关闭订单失败",
    });
  } catch (error) {
    logger.error("关闭支付宝订单失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "关闭订单失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 申请支付宝退款
 */
router.post("/refund", async (req, res) => {
  try {
    const { outTradeNo, outRequestNo, refundAmount, refundReason } = req.body;

    // 验证参数
    if (!outTradeNo || !outRequestNo || !refundAmount) {
      return res.status(400).json({
        success: false,
        message: "参数不完整",
        timestamp: new Date().toISOString(),
      });
    }

    // 调用支付宝服务申请退款
    const refundResult = await alipayService.refund({
      outTradeNo,
      outRequestNo,
      refundAmount: refundAmount.toString(),
      refundReason: refundReason || "正常退款",
    });

    if (refundResult.code === "10000") {
      // 创建退款记录 - 注释掉，因为refund表不存在
      // await prisma.refund.create({
      //   data: {
      //     paymentId: "", // 需要先查询到payment的ID
      //     outRefundNo: outRequestNo,
      //     outTradeNo,
      //     refundAmount: parseFloat(refundAmount),
      //     status: "PROCESSING",
      //     refundId: refundResult.out_request_no,
      //     reason: refundReason,
      //   },
      // });
    }

    res.json({
      success: refundResult.code === "10000",
      data: {
        refundId: refundResult.out_request_no,
        outRequestNo,
        status: refundResult.code === "10000" ? "COMPLETED" : "FAILED",
        message: refundResult.msg,
      },
    });
  } catch (error) {
    logger.error("申请支付宝退款失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "申请退款失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 查询退款状态
 */
router.get("/refund/query", async (req, res) => {
  try {
    const { outTradeNo, outRequestNo } = req.query;

    if (!outTradeNo || !outRequestNo) {
      return res.status(400).json({
        success: false,
        message: "参数不完整",
        timestamp: new Date().toISOString(),
      });
    }

    // 调用支付宝服务查询退款
    const refundResult = await alipayService.queryRefund(
      outTradeNo as string,
      outRequestNo as string,
    );

    res.json({
      success: refundResult.code === "10000",
      data: {
        outRequestNo: refundResult.out_request_no,
        outTradeNo: refundResult.out_trade_no,
        refundAmount: refundResult.refund_amount,
        status: refundResult.refund_status,
        gmtRefundPay: refundResult.gmt_refund_pay,
      },
    });
  } catch (error) {
    logger.error("查询支付宝退款失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "查询退款失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 支付宝异步通知处理
 */
router.post("/notify", async (req, res) => {
  try {
    // 验证签名
    const isValid = alipayService.verifyNotify(req.body);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "签名验证失败",
        timestamp: new Date().toISOString(),
      });
    }

    // 解析通知数据
    const notifyData = alipayService.parseNotifyData(req.body);

    if (!notifyData) {
      return res.status(400).json({
        success: false,
        message: "通知数据格式错误",
        timestamp: new Date().toISOString(),
      });
    }

    const { outTradeNo, tradeNo, tradeStatus, totalAmount } = notifyData;

    // 更新支付状态
    let status: string = "PENDING";
    if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
      status = "COMPLETED";

      // 处理支付成功的业务逻辑
      await handlePaymentSuccess(outTradeNo, tradeNo, totalAmount);
    } else if (tradeStatus === "TRADE_CLOSED") {
      status = "CANCELLED";
    }

    // 更新数据库
    await prisma.payments.updateMany({
      where: { outTradeNo: outTradeNo },
      data: {
        status: status as any,
        transactionId: tradeNo,
        notifyData: notifyData.raw,
        updatedAt: new Date(),
      },
    });

    // 返回支付宝要求的响应格式
    res.send("success");
  } catch (error) {
    logger.error("处理支付宝异步通知失败:", error);
    res.send("fail");
  }
});

/**
 * 处理支付成功的业务逻辑
 */
async function handlePaymentSuccess(
  outTradeNo: string,
  tradeNo: string,
  amount: any,
) {
  try {
    // 获取支付记录
    const payment = await prisma.payments.findFirst({
      where: { outTradeNo },
      include: {
        users: true,
      },
    });

    if (!payment) {
      throw new Error("支付记录不存在");
    }

    // 如果是订阅计划支付，激活用户订阅
    if (payment.planId) {
      // TODO: 暂时注释掉订阅逻辑，因为缺少subscriptionPlan表
      // // 先查询订阅计划
      // const plan = await prisma.subscriptionPlan.findUnique({
      //   where: { id: payment.planId },
      // });

      // if (plan) {
      //   // 创建或更新订阅记录
      //   await prisma.subscriptions.upsert({
      //     where: { id: payment.planId },
      //     create: {
      //       userId: payment.userId,
      //       planType: plan.name as any,
      //       price: payment.amount,
      //       duration: plan.durationDays || 30,
      //       features: plan.features || {},
      //       startDate: new Date(),
      //       endDate: new Date(
      //         Date.now() + (plan.durationDays || 30) * 24 * 60 * 60 * 1000,
      //       ),
      //       isActive: true,
      //     },
      //     update: {
      //       isActive: true,
      //       startDate: new Date(),
      //       endDate: new Date(
      //         Date.now() + (plan.durationDays || 30) * 24 * 60 * 60 * 1000,
      //       ),
      //     },
      //   });
      // }
    }

    // 如果是点数充值，增加用户点数
    if (payment.description && payment.description.includes("点数充值")) {
      const tokensToAdd = Math.floor(Number(amount) / 100); // 假设1元=100点数
      await prisma.users.update({
        where: { id: payment.userId },
        data: {
          tokenBalance: {
            increment: tokensToAdd,
          },
        },
      });
    }

    console.log(`支付宝支付成功处理完成: ${outTradeNo}`);
  } catch (error) {
    logger.error("处理支付宝支付成功业务逻辑失败:", error);
    throw error;
  }
}

export default router;
