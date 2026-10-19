/**
 * 地址域：服务端地址簿（内存演示）
 * 路由见 services/repo/contract.js：
 *   GET    /addresses            列表（默认置顶）
 *   GET    /addresses/default    默认地址
 *   POST   /addresses            新增/更新（带 _id 为更新）
 *   DELETE /addresses/:id        删除
 *   POST   /addresses/:id/default 设为默认
 */
import {
  listAddresses,
  getDefaultAddress,
  saveAddress,
  removeAddress,
  setDefaultAddress,
} from './store.js';
import { HttpError } from './core.js';

export function list() {
  return listAddresses();
}

export function getDefault() {
  const addr = getDefaultAddress();
  if (!addr) throw new HttpError(404, '暂无收货地址');
  return addr;
}

export function save(ctx) {
  const body = ctx.body || {};
  if (!body.contactName || !body.contactPhone || !body.detail) {
    throw new HttpError(400, '收货人、手机号、详细地址均必填');
  }
  return saveAddress(body);
}

export function remove(ctx) {
  removeAddress(ctx.params.id);
  return true;
}

export function setDefault(ctx) {
  setDefaultAddress(ctx.params.id);
  return true;
}
