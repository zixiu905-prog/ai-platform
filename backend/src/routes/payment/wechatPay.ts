import express from "express";
import { logger } from "@/utils/logger";
import {
  CreateOrderParams,
} from "@/services/wechatPayService";
import wechatPayService from "@/services/wechatPayService";
import { prisma } from "@/config/database";

const router = express.Router();

/**
 * 创建微信扫码支付订单
 */
router.post("/native", async (req, res) => {
  try {
    const { outTradeNo, description, amount, userId, planId } = req.body;

    // 验证参数
    if (!outTradeNo || !description || !amount || !userId) {
      return res.status(400).json({
        success: false,
        message: "参数不完整",
        timestamp: new Date().toISOString(),
      });
    }

    // 创建订单参数
    const orderParams: CreateOrderParams = {
      outTradeNo,
      description,
      amount: {
        total: Math.round(amount * 100), // 转换为分
        currency: "CNY",
      },
    };

    // 调用微信支付服务创建订单
    const result = await wechatPayService.createNativeOrder(orderParams);

    // 在数据库中创建支付记录
    const paymentData: any = {
      userId,
      outTradeNo,
      amount,
      status: "PENDING",
      method: "WECHAT_PAY",
      description,
      paymentUrl: result.code_url,
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
        codeUrl: result.code_url,
        outTradeNo,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    logger.error("创建微信扫码支付订单失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "创建订单失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 创建微信JSAPI支付订单
 */
router.post("/jsapi", async (req, res) => {
  try {
    const { outTradeNo, description, amount, userId, planId, openid } =
      req.body;

    // 验证参数
    if (!outTradeNo || !description || !amount || !userId || !openid) {
      return res.status(400).json({
        success: false,
        message: "参数不完整",
        timestamp: new Date().toISOString(),
      });
    }

    // 创建订单参数
    const orderParams: CreateOrderParams = {
      outTradeNo,
      description,
      amount: {
        total: Math.round(amount * 100), // 转换为分
        currency: "CNY",
      },
      payer: { openid },
    };

    // 调用微信支付服务创建订单
    const result = await wechatPayService.createJSAPIOrder(orderParams);

    // 生成JSAPI支付参数
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = Math.random().toString(36).substring(2);
    const pkg = `prepay_id=${result.prepay_id}`;
    const signType = "RSA";

    // 这里需要生成签名，简化处理
    const paySign = "generated_pay_sign"; // 实际需要生成真实签名

    // 在数据库中创建支付记录
    const paymentData: any = {
      userId,
      outTradeNo,
      amount,
      status: "PENDING",
      method: "WECHAT_PAY",
      description,
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
        appId: process.env.WECHAT_APP_ID,
        timeStamp: timestamp,
        nonceStr,
        package: pkg,
        signType,
        paySign,
        outTradeNo,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    logger.error("创建微信JSAPI支付订单失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "创建订单失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 创建微信H5支付订单
 */
router.post("/h5", async (req, res) => {
  try {
    const { outTradeNo, description, amount, userId, planId } = req.body;

    // 验证参数
    if (!outTradeNo || !description || !amount || !userId) {
      return res.status(400).json({
        success: false,
        message: "参数不完整",
        timestamp: new Date().toISOString(),
      });
    }

    // 创建订单参数
    const orderParams: CreateOrderParams = {
      outTradeNo,
      description,
      amount: {
        total: Math.round(amount * 100), // 转换为分
        currency: "CNY",
      },
    };

    // 调用微信支付服务创建订单
    const result = await wechatPayService.createH5Order(orderParams);

    // 在数据库中创建支付记录
    const paymentData: any = {
      userId,
      outTradeNo,
      amount,
      status: "PENDING",
      method: "WECHAT_PAY",
      description,
      paymentUrl: result.h5_url,
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
        h5Url: result.h5_url,
        outTradeNo,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    logger.error("创建微信H5支付订单失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "创建订单失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 查询订单状态
 */
router.get("/query/:outTradeNo", async (req, res) => {
  try {
    const { outTradeNo } = req.params;

    // 查询微信支付订单状态
    const orderResult = await wechatPayService.queryOrder(outTradeNo);

    // 更新数据库中的支付状态
    let status: string = "PENDING";
    if (orderResult.trade_state === "COMPLETED") {
      status = "COMPLETED";
    } else if (orderResult.trade_state === "CLOSED") {
      status = "CANCELLED";
    } else if (orderResult.trade_state === "REFUND") {
      status = "REFUNDED";
    }

    await prisma.payments.updateMany({
      where: { outTradeNo },
      data: {
        status: status as any,
        updatedAt: new Date(),
        transactionId: orderResult.transaction_id,
      },
    });

    res.json({
      success: true,
      data: {
        status: orderResult.trade_state,
        outTradeNo,
        transactionId: orderResult.transaction_id,
        amount: orderResult.amount?.total,
        paidTime: orderResult.success_time,
      },
    });
  } catch (error) {
    logger.error("查询微信支付订单失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "查询订单失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 关闭订单
 */
router.post("/close/:outTradeNo", async (req, res) => {
  try {
    const { outTradeNo } = req.params;

    // 调用微信支付服务关闭订单
    await wechatPayService.closeOrder(outTradeNo);

    // 更新数据库中的支付状态
    await prisma.payments.updateMany({
      where: { outTradeNo },
      data: {
        status: "CANCELLED",
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "订单已关闭",
    });
  } catch (error) {
    logger.error("关闭微信支付订单失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "关闭订单失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 申请退款
 */
router.post("/refund", async (req, res) => {
  try {
    const { outTradeNo, outRefundNo, refundAmount, totalAmount } = req.body;

    // 验证参数
    if (!outTradeNo || !outRefundNo || !refundAmount || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "参数不完整",
        timestamp: new Date().toISOString(),
      });
    }

    // 调用微信支付服务申请退款
    const refundResult = await wechatPayService.refund({
      outTradeNo,
      outRefundNo,
      refundAmount: Math.round(refundAmount * 100),
      totalAmount: Math.round(totalAmount * 100),
    });

    res.json({
      success: true,
      data: {
        refundId: refundResult.refund_id,
        outRefundNo,
        status: refundResult.status,
      },
    });
  } catch (error) {
    logger.error("申请微信支付退款失败:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "申请退款失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 微信支付回调处理
 */
router.post("/notify", async (req, res) => {
  try {
    const headers = req.headers;
    const body = JSON.stringify(req.body);

    // 验证签名
    const isValid = await wechatPayService.verifyNotify(headers);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "签名验证失败",
        timestamp: new Date().toISOString(),
      });
    }

    // 解密回调数据
    const decryptedData = wechatPayService.decryptNotifyData(
      req.body.resource.ciphertext,
      req.body.resource.associated_data,
      req.body.resource.nonce,
    );

    const { out_trade_no, transaction_id, trade_state, amount } = decryptedData;

    // 更新支付状态
    let status: "PENDING" | "COMPLETED" = "PENDING";
    if (trade_state === "COMPLETED") {
      status = "COMPLETED";

      // 处理支付成功的业务逻辑
      await handlePaymentSuccess(out_trade_no, transaction_id, amount.total);
    }

    // 更新数据库
    await prisma.payments.updateMany({
      where: { outTradeNo: out_trade_no },
      data: {
        status: status as any,
        transactionId: transaction_id,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "success",
    });
  } catch (error) {
    logger.error("处理微信支付回调失败:", error);
    res.status(500).json({
      success: false,
      message: "处理回调失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 处理支付成功的业务逻辑
 */
async function handlePaymentSuccess(
  outTradeNo: string,
  transactionId: string,
  amount: any,
) {
  try {
    // 获取支付记录
    const payment = await prisma.payments.findFirst({
      where: { outTradeNo },
      include: { users: true },
    });

    if (!payment) {
      throw new Error("支付记录不存在");
    }

    // 如果是订阅计划支付，激活用户订阅
    // TODO: 暂时注释掉，简化处理
    // if (payment.planId) {
    //   const plan = await prisma.subscriptions.findUnique({
    //     where: { id: payment.planId },
    //   });

    //   if (plan) {
    //     logger.info('处理订阅:', { planId: payment.planId });
    //   }
    // }

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

    console.log(`支付成功处理完成: ${outTradeNo}`);
  } catch (error) {
    logger.error("处理支付成功业务逻辑失败:", error);
    throw error;
  }
}

export default router;
