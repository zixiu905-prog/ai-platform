import crypto from 'crypto';
import { logger } from '../utils/logger';
import axios from 'axios';

export interface AlipayConfig {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  gateway: string;
  notifyUrl: string;
  returnUrl?: string;
}

export interface CreateAlipayOrderParams {
  outTradeNo: string;    // 商户订单号
  totalAmount: string;  // 订单总金额，单位为元
  subject: string;      // 订单标题
  body?: string;        // 订单描述
  productCode?: string;  // 产品码
  timeoutExpress?: string; // 订单超时时间
}

export interface AlipayResponse {
  code: string;
  msg: string;
  sign?: string;
  data?: any;
  trade_status?: string;
  trade_no?: string;
  total_amount?: string;
  send_pay_date?: string;
  buyer_id?: string;
  buyer_logon_id?: string;
  out_request_no?: string;
  out_trade_no?: string;
  refund_status?: string;
  refund_amount?: string;
  gmt_refund_pay?: string;
}

export interface RefundParams {
  outTradeNo: string;     // 原订单号
  outRequestNo: string;   // 退款请求号
  refundAmount: string;   // 退款金额
  refundReason?: string;  // 退款原因
}

export class AlipayService {
  private config: AlipayConfig;
  private readonly DEFAULT_FORMAT = 'json';
  private readonly DEFAULT_CHARSET = 'utf-8';
  private readonly DEFAULT_VERSION = '1.0';
  private readonly DEFAULT_SIGN_TYPE = 'RSA2';

  constructor(config: AlipayConfig) {
    this.config = config;
  }

  /**
   * 生成签名
   */
  private generateSign(params: Record<string, any>): string {
    // 排序参数
    const sortedParams = Object.keys(params)
      .sort()
      .filter(key => params[key] !== undefined && params[key] !== '' && key !== 'sign')
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    // 构建签名字符串
    const signString = Object.keys(sortedParams)
      .map(key => `${key}=${sortedParams[key]}`)
      .join('&');

    // RSA2签名
    const sign = crypto
      .createSign('RSA-SHA256')
      .update(signString, 'utf8')
      .sign(this.config.privateKey, 'base64');

    return sign;
  }

  /**
   * 验证签名
   */
  private verifySign(params: Record<string, any>, sign: string): boolean {
    // 排序参数
    const sortedParams = Object.keys(params)
      .sort()
      .filter(key => params[key] !== undefined && params[key] !== '' && key !== 'sign')
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    // 构建签名字符串
    const signString = Object.keys(sortedParams)
      .map(key => `${key}=${sortedParams[key]}`)
      .join('&');

    // RSA2验证
    const verify = crypto
      .createVerify('RSA-SHA256')
      .update(signString, 'utf8')
      .verify(this.config.alipayPublicKey, sign, 'base64');

    return verify;
  }

  /**
   * 创建支付宝订单
   */
  async createOrder(params: CreateAlipayOrderParams): Promise<string> {
    try {
      const bizContent = {
        out_trade_no: params.outTradeNo,
        total_amount: params.totalAmount,
        subject: params.subject,
        body: params.body,
        product_code: params.productCode || 'FAST_INSTANT_TRADE_PAY',
        timeout_express: params.timeoutExpress || '30m'
      };

      const requestParams = {
        app_id: this.config.appId,
        method: 'alipay.trade.page.pay',
        format: this.DEFAULT_FORMAT,
        charset: this.DEFAULT_CHARSET,
        sign_type: this.DEFAULT_SIGN_TYPE,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        version: this.DEFAULT_VERSION,
        notify_url: this.config.notifyUrl,
        return_url: this.config.returnUrl,
        biz_content: JSON.stringify(bizContent),
        sign: ''
      };

      requestParams.sign = this.generateSign(requestParams);

      // 构建支付URL
      const payUrl = `${this.config.gateway}?${Object.keys(requestParams).map(key => `${key}=${encodeURIComponent((requestParams as any)[key])}`).join('&')}`;

      logger.info('创建支付宝订单成功:', { outTradeNo: params.outTradeNo });

      return payUrl;
    } catch (error) {
      logger.error('创建支付宝订单失败:', error);
      throw new Error(`创建订单失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 查询订单
   */
  async queryOrder(outTradeNo: string): Promise<AlipayResponse> {
    try {
      const bizContent = {
        out_trade_no: outTradeNo
      };

      const requestParams = {
        app_id: this.config.appId,
        method: 'alipay.trade.query',
        format: this.DEFAULT_FORMAT,
        charset: this.DEFAULT_CHARSET,
        sign_type: this.DEFAULT_SIGN_TYPE,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        version: this.DEFAULT_VERSION,
        biz_content: JSON.stringify(bizContent),
        sign: ''
      };

      requestParams.sign = this.generateSign(requestParams);

      const response = await axios.post(this.config.gateway, requestParams);

      if (response.data.alipay_trade_query_response) {
        return response.data.alipay_trade_query_response;
      }

      throw new Error('查询订单失败');
    } catch (error) {
      logger.error('查询支付宝订单失败:', error);
      throw new Error(`查询订单失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 退款
   */
  async refund(params: RefundParams): Promise<AlipayResponse> {
    try {
      const bizContent = {
        out_trade_no: params.outTradeNo,
        out_request_no: params.outRequestNo,
        refund_amount: params.refundAmount,
        refund_reason: params.refundReason
      };

      const requestParams = {
        app_id: this.config.appId,
        method: 'alipay.trade.refund',
        format: this.DEFAULT_FORMAT,
        charset: this.DEFAULT_CHARSET,
        sign_type: this.DEFAULT_SIGN_TYPE,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        version: this.DEFAULT_VERSION,
        biz_content: JSON.stringify(bizContent),
        sign: ''
      };

      requestParams.sign = this.generateSign(requestParams);

      const response = await axios.post(this.config.gateway, requestParams);

      if (response.data.alipay_trade_refund_response) {
        return response.data.alipay_trade_refund_response;
      }

      throw new Error('退款失败');
    } catch (error) {
      logger.error('支付宝退款失败:', error);
      throw new Error(`退款失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证异步通知
   */
  verifyNotify(params: Record<string, any>): boolean {
    const sign = params.sign;
    delete params.sign;

    return this.verifySign(params, sign);
  }

  /**
   * 关闭订单
   */
  async closeOrder(outTradeNo: string): Promise<AlipayResponse> {
    try {
      const bizContent = {
        out_trade_no: outTradeNo
      };

      const requestParams = {
        app_id: this.config.appId,
        method: 'alipay.trade.close',
        format: this.DEFAULT_FORMAT,
        charset: this.DEFAULT_CHARSET,
        sign_type: this.DEFAULT_SIGN_TYPE,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        version: this.DEFAULT_VERSION,
        biz_content: JSON.stringify(bizContent)
      };

      const sign = this.generateSign(requestParams);
      (requestParams as any).sign = sign;

      const response = await axios.post(this.config.gateway, requestParams);

      if (response.data.alipay_trade_close_response) {
        return response.data.alipay_trade_close_response;
      }

      throw new Error('关闭订单失败');
    } catch (error) {
      logger.error('关闭支付宝订单失败:', error);
      throw new Error(`关闭订单失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 创建支付宝网页支付订单
   */
  async createWebOrder(params: CreateAlipayOrderParams): Promise<string> {
    return this.createOrder({
      ...params,
      productCode: params.productCode || 'FAST_INSTANT_TRADE_PAY'
    });
  }

  /**
   * 创建支付宝手机网站支付订单
   */
  async createWapOrder(params: CreateAlipayOrderParams): Promise<string> {
    return this.createOrder({
      ...params,
      productCode: params.productCode || 'QUICK_WAP_WAY'
    });
  }

  /**
   * 创建支付宝APP支付订单
   */
  async createAppOrder(params: CreateAlipayOrderParams): Promise<string> {
    try {
      const bizContent = {
        out_trade_no: params.outTradeNo,
        total_amount: params.totalAmount,
        subject: params.subject,
        body: params.body,
        product_code: params.productCode || 'QUICK_MSECURITY_PAY',
        timeout_express: params.timeoutExpress || '30m'
      };

      const requestParams: Record<string, any> = {
        app_id: this.config.appId,
        method: 'alipay.trade.app.pay',
        format: this.DEFAULT_FORMAT,
        charset: this.DEFAULT_CHARSET,
        sign_type: this.DEFAULT_SIGN_TYPE,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        version: this.DEFAULT_VERSION,
        notify_url: this.config.notifyUrl,
        biz_content: JSON.stringify(bizContent),
        sign: ''
      };

      requestParams.sign = this.generateSign(requestParams);

      // 返回订单字符串
      const orderString = Object.keys(requestParams)
        .map(key => `${key}=${encodeURIComponent(requestParams[key])}`)
        .join('&');

      logger.info('创建支付宝APP订单成功:', { outTradeNo: params.outTradeNo });

      return orderString;
    } catch (error) {
      logger.error('创建支付宝APP订单失败:', error);
      throw new Error(`创建订单失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 查询退款
   */
  async queryRefund(outTradeNo: string, outRequestNo: string): Promise<AlipayResponse> {
    try {
      const bizContent = {
        out_trade_no: outTradeNo,
        out_request_no: outRequestNo
      };

      const requestParams = {
        app_id: this.config.appId,
        method: 'alipay.trade.fastpay.refund.query',
        format: this.DEFAULT_FORMAT,
        charset: this.DEFAULT_CHARSET,
        sign_type: this.DEFAULT_SIGN_TYPE,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        version: this.DEFAULT_VERSION,
        biz_content: JSON.stringify(bizContent),
        sign: ''
      };

      requestParams.sign = this.generateSign(requestParams);

      const response = await axios.post(this.config.gateway, requestParams);

      if (response.data.alipay_trade_fastpay_refund_query_response) {
        return response.data.alipay_trade_fastpay_refund_query_response;
      }

      throw new Error('查询退款失败');
    } catch (error) {
      logger.error('查询支付宝退款失败:', error);
      throw new Error(`查询退款失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析异步通知数据
   */
  parseNotifyData(params: Record<string, any>): {
    outTradeNo: string;
    tradeNo: string;
    tradeStatus: string;
    totalAmount: string;
    raw: any;
  } | null {
    try {
      return {
        outTradeNo: params.out_trade_no,
        tradeNo: params.trade_no,
        tradeStatus: params.trade_status,
        totalAmount: params.total_amount,
        raw: params
      };
    } catch (error) {
      logger.error('解析异步通知数据失败:', error);
      return null;
    }
  }
}

export default new AlipayService({
  appId: process.env.ALIPAY_APP_ID || '',
  privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
  notifyUrl: process.env.ALIPAY_NOTIFY_URL || ''
});
