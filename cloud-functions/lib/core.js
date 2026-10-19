/**
 * 服务端核心常量与工具
 * 与小程序端 utils/constants.js、config/index.js 中的业务口径保持一致：
 *   - 起送按「兔头个数」满 10 个（MIN_HEADS）
 *   - 发货时效承诺 7 天（SHIP_PROMISE_DAYS）
 *   - 全场包邮（packagingFee / deliveryFee 恒 0）
 *   - 状态机：pending_payment -> paid -> preparing -> shipped -> completed
 */

// 订单状态枚举（与小程序 utils/constants.js 完全一致）
export const STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PREPARING: 'preparing',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const MIN_HEADS = 10;
export const SHIP_PROMISE_DAYS = 7;
export const STORE_ID = 'store_main';
export const STORE_NAME = '麻辣兔头·旗舰店';

// 模拟支付后自动推进到「备货中」的时长（ms），与 mock 层一致（演示用）
export const AUTO_ADVANCE_PAID_TO_PREPARING = 3000;

/**
 * 业务异常：抛出后被 router 归一化为 { code, message } 响应
 * code 沿用业务码（如 4001 起送不达标、4002 缺物流单号、4003 非法状态流转、404 不存在）
 */
export class HttpError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status || 200;
  }
}

// 本地联调/浏览器调试用 CORS；小程序 wx.request 本身不需要，但开着无害
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

/**
 * 将 '/orders/:orderNo/ship' 风格的路径编译为正则，并收集参数名
 */
export function compilePath(path) {
  const keys = [];
  const pattern = path.replace(/:([a-zA-Z_]+)/g, function (_, key) {
    keys.push(key);
    return '([^/]+)';
  });
  return { regex: new RegExp('^' + pattern + '$'), keys: keys };
}

function pad4(n) {
  n = String(n);
  while (n.length < 4) n = '0' + n;
  return n;
}

export function makeOrderNo() {
  return 'MT' + Date.now().toString(36).toUpperCase() + pad4(Math.floor(Math.random() * 10000));
}

export function makeTimelineEntry(status, note) {
  return { status, at: Date.now(), note: note || '' };
}
