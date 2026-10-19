/**
 * 购物车域：服务端购物车（按 userId 隔离，内存演示）
 * 路由见 services/repo/contract.js：
 *   GET    /cart         读取
 *   PUT    /cart         整体保存 { items }
 *   DELETE /cart         清空
 *
 * 注：下单时客户端会把 items 直接放进订单草稿，服务端也会顺手清空该用户购物车，
 * 与本地 Storage 购物车互不干扰（前端仍会清本地购物车）。
 */
import { getCart, saveCart, clearCart } from './store.js';
import { HttpError } from './core.js';

function userIdOf(ctx) {
  return (ctx.auth && ctx.auth.userId) || 'demo_user';
}

export function load(ctx) {
  return getCart(userIdOf(ctx));
}

export function save(ctx) {
  const body = ctx.body || {};
  const cart = body.cart || body;
  if (!cart || !Array.isArray(cart.items)) {
    throw new HttpError(400, '购物车数据格式不正确');
  }
  saveCart(userIdOf(ctx), { items: cart.items });
  return getCart(userIdOf(ctx));
}

export function clear(ctx) {
  clearCart(userIdOf(ctx));
  return { items: [], updatedAt: 0 };
}
