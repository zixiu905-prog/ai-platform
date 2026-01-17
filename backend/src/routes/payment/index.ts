import express from "express";
import wechatPayRoutes from "@/routes/payment/wechatPay";
import queryRoutes from "@/routes/payment/query";
import alipayRoutes from "@/routes/payment/alipay";

const router = express.Router();

// 注册微信支付路由
router.use("/wechat", wechatPayRoutes);

// 注册支付宝路由
router.use("/alipay", alipayRoutes);

// 注册支付查询路由
router.use("/query", queryRoutes);

export default router;
