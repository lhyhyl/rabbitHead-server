/**
 * 路由表 + 分发器
 *
 * 这里的 method/path 与小程序 services/repo/contract.js 逐条对应（根路径，无 /api 前缀），
 * 这样前端的 services/http/request.js 无需任何改动即可切换 DATA_SOURCE='http'。
 * 若日后在 contract.js 增删接口，务必同步更新本表。
 */
import { compilePath, HttpError, CORS } from './core.js';
import * as dish from './dish.js';
import * as cart from './cart.js';
import * as order from './order.js';
import * as address from './address.js';

// method, path（含 :param）, 处理函数
const ROUTES = [
  // 菜品
  { method: 'GET', path: '/categories', handler: dish.listCategories },
  { method: 'GET', path: '/dishes', handler: dish.listDishes },
  { method: 'GET', path: '/dishes/:id', handler: dish.getDishDetail },

  // 购物车
  { method: 'GET', path: '/cart', handler: cart.load },
  { method: 'PUT', path: '/cart', handler: cart.save },
  { method: 'DELETE', path: '/cart', handler: cart.clear },

  // 订单
  { method: 'POST', path: '/orders', handler: order.createOrder },
  { method: 'GET', path: '/orders', handler: order.listOrdersHandler },
  { method: 'GET', path: '/orders/:orderNo', handler: order.getOrderDetail },
  { method: 'PATCH', path: '/orders/:orderNo/status', handler: order.updateStatus },
  { method: 'POST', path: '/orders/:orderNo/pay', handler: order.pay },
  { method: 'POST', path: '/orders/:orderNo/ship', handler: order.ship },
  { method: 'POST', path: '/orders/:orderNo/cancel', handler: order.cancel },
  { method: 'POST', path: '/orders/:orderNo/confirm', handler: order.confirmReceive },

  // 地址
  { method: 'GET', path: '/addresses', handler: address.list },
  { method: 'GET', path: '/addresses/default', handler: address.getDefault },
  { method: 'POST', path: '/addresses', handler: address.save },
  { method: 'DELETE', path: '/addresses/:id', handler: address.remove },
  { method: 'POST', path: '/addresses/:id/default', handler: address.setDefault },
];

// 预编译路径
const COMPILED = ROUTES.map((r) => {
  const c = compilePath(r.path);
  return Object.assign({}, r, { regex: c.regex, keys: c.keys });
});

/**
 * 匹配路由，并抽取路径参数
 * 返回 { route, params }；找不到返回 null
 * 若路径命中但 method 不对，通过 methodMismatch 标记（用于返回 405）
 */
function matchRoute(method, pathname) {
  let methodMismatch = false;
  for (const r of COMPILED) {
    const m = r.regex.exec(pathname);
    if (m) {
      if (r.method === method) {
        const params = {};
        r.keys.forEach((k, i) => {
          params[k] = decodeURIComponent(m[i + 1]);
        });
        return { route: r, params, methodMismatch: false };
      }
      methodMismatch = true;
    }
  }
  return { route: null, params: {}, methodMismatch };
}

/**
 * 分发请求
 * @returns {{ code: number, message: string, data: any }}
 */
export async function dispatch(method, pathname, ctx) {
  const hit = matchRoute(method, pathname);
  if (!hit.route) {
    if (hit.methodMismatch) {
      return { code: 405, message: '请求方法不被允许', data: null };
    }
    return { code: 404, message: '接口不存在：' + method + ' ' + pathname, data: null };
  }
  try {
    const handlerCtx = Object.assign({}, ctx, { params: hit.params });
    const data = await hit.route.handler(handlerCtx);
    return { code: 0, message: 'ok', data: data === undefined ? null : data };
  } catch (err) {
    if (err instanceof HttpError) {
      return { code: err.code, message: err.message, data: null };
    }
    // 未知异常：返回 500 业务码，避免泄露堆栈
    return { code: 500, message: (err && err.message) || '服务器内部错误', data: null };
  }
}

export { CORS };
