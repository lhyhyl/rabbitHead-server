/**
 * 订单域：服务端权威定价 + 状态机 + 业务红线
 * 路由见 services/repo/contract.js：
 *   POST   /orders                      创建（服务端做起送校验：满 MIN_HEADS 个兔头）
 *   GET    /orders                      列表（创建时间倒序）
 *   GET    /orders/:orderNo             详情
 *   PATCH  /orders/:orderNo/status      状态推进 { status, note, extra }
 *   POST   /orders/:orderNo/pay         模拟支付 -> 已支付
 *   POST   /orders/:orderNo/ship        商家填单号发货 { carrier, trackingNo }
 *   POST   /orders/:orderNo/cancel      取消 { reason }
 *   POST   /orders/:orderNo/confirm     确认签收 -> 已完成
 *
 * 业务红线（与小程序 mock 层、models/order.js 完全一致）：
 *  - 金额一律整数「分」，服务端权威计算，前端不做二次定价
 *  - 起送按「兔头个数」满 MIN_HEADS（而非订单件数）
 *  - 全场包邮：packagingFee / deliveryFee 恒 0
 *  - 物流单号必须由商家人工填写，服务端**绝不**自动生成/补全
 *  - 状态机：pending_payment -> paid -> preparing -> shipped -> completed
 *            pending_payment / paid 可取消
 */
import {
  STATUS,
  MIN_HEADS,
  STORE_ID,
  STORE_NAME,
  AUTO_ADVANCE_PAID_TO_PREPARING,
  HttpError,
  makeOrderNo,
  makeTimelineEntry,
} from './core.js';
import {
  getDish,
  getOrder,
  listOrders,
  saveOrder,
  clearCart,
  countHeads,
} from './store.js';

// 自动推进演示用定时器（实例级，冷启动重置，仅演示）
const timers = {};

// 合法状态流转表（与 models/order.js TRANSITIONS 一致）
const TRANSITIONS = {
  [STATUS.PENDING_PAYMENT]: [STATUS.PAID, STATUS.CANCELLED],
  [STATUS.PAID]: [STATUS.PREPARING, STATUS.CANCELLED],
  [STATUS.PREPARING]: [STATUS.SHIPPED],
  [STATUS.SHIPPED]: [STATUS.COMPLETED],
  [STATUS.COMPLETED]: [],
  [STATUS.CANCELLED]: [],
};

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).indexOf(to) > -1;
}

function clearTimers(orderNo) {
  if (timers[orderNo]) {
    clearTimeout(timers[orderNo]);
    delete timers[orderNo];
  }
}

/**
 * 状态流转：校验合法性 + 记录 timeline + 打时间戳 + 合并 extra
 */
function applyTransition(order, status, note, extra) {
  if (!canTransition(order.status, status)) {
    throw new HttpError(
      4003,
      '订单状态不允许从 ' + order.status + ' 变更为 ' + status
    );
  }
  const now = Date.now();
  const next = Object.assign({}, order, {
    status,
    updatedAt: now,
    timeline: order.timeline.concat([makeTimelineEntry(status, note)]),
  });
  if (status === STATUS.PAID) next.paidAt = now;
  if (status === STATUS.COMPLETED) next.completedAt = now;
  if (status === STATUS.CANCELLED) next.cancelledAt = now;
  return Object.assign(next, extra || {});
}

/**
 * 由菜品目录权威重算单条明细（单价 = 菜品价 + 各规格加价）
 * 不信任客户端传来的 unitPrice，金额以服务端为准。
 */
function buildLine(item) {
  const dish = getDish(item.dishId);
  if (!dish) throw new HttpError(4004, '菜品不存在或已下架：' + item.dishId);

  const quantity = item.quantity;
  if (!quantity || quantity < 1 || quantity !== (quantity | 0)) {
    throw new HttpError(400, '购买数量必须为正整数：' + dish.name);
  }

  let priceDelta = 0;
  const selectedSpecs = Array.isArray(item.selectedSpecs) ? item.selectedSpecs : [];
  const specMap = {};
  (dish.specGroups || []).forEach((g) => {
    specMap[g.groupId] = g;
  });
  selectedSpecs.forEach((sp) => {
    const group = specMap[sp.groupId];
    const opt = group && group.options.find((o) => o.optionId === sp.optionId);
    if (opt) priceDelta += opt.priceDelta;
  });

  const unitPrice = dish.price + priceDelta;
  return {
    dishId: dish._id,
    dishSnapshot: {
      name: dish.name,
      image: (dish.images && dish.images[0]) || '',
      price: dish.price,
      headCount: dish.headCount || 0,
    },
    selectedSpecs: selectedSpecs.map((sp) => ({
      groupId: sp.groupId,
      groupName: sp.groupName,
      optionId: sp.optionId,
      optionName: sp.optionName,
      priceDelta: sp.priceDelta || 0,
    })),
    quantity,
    unitPrice,
    subtotal: unitPrice * quantity,
    remark: (item.remark || '').toString().slice(0, 100),
  };
}

function buildRegion(address) {
  return (
    (address.region || '').trim() ||
    [address.province, address.city, address.district].filter(Boolean).join('')
  );
}

// ---------------- 创建订单 ----------------
export function createOrder(ctx) {
  const draft = ctx.body || {};
  const items = Array.isArray(draft.items) ? draft.items : [];
  if (!items.length) throw new HttpError(400, '购物车为空，无法下单');

  const lines = items.map(buildLine);

  // 起送规则：按「兔头个数」计算（非订单件数）
  const heads = countHeads(lines);
  if (heads < MIN_HEADS) {
    throw new HttpError(
      4001,
      '本店满 ' + MIN_HEADS + ' 个兔头起送，当前 ' + heads + ' 个兔头'
    );
  }

  const addr = draft.address || {};
  if (!addr.contactName || !addr.contactPhone || !addr.detail) {
    throw new HttpError(400, '收货信息不完整');
  }

  const now = Date.now();
  const itemsTotal = lines.reduce((s, it) => s + it.subtotal, 0);
  const packagingFee = 0; // 全场包邮
  const deliveryFee = 0; // 全场包邮

  const order = {
    orderNo: makeOrderNo(),
    userId: (ctx.auth && ctx.auth.userId) || 'demo_user',
    storeId: STORE_ID,
    storeName: STORE_NAME,
    items: lines,
    pricing: {
      itemsTotal,
      packagingFee,
      deliveryFee,
      discount: 0,
      totalAmount: itemsTotal + packagingFee + deliveryFee,
    },
    fulfillment: {
      method: 'express',
      addressSnapshot: {
        contactName: addr.contactName,
        contactPhone: addr.contactPhone,
        region: buildRegion(addr),
        detail: addr.detail,
      },
    },
    remark: (draft.remark || '').toString().slice(0, 200),
    status: STATUS.PENDING_PAYMENT,
    timeline: [makeTimelineEntry(STATUS.PENDING_PAYMENT, '订单已提交，等待支付')],
    payInfo: null,
    logistics: null,
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    completedAt: null,
    cancelledAt: null,
  };

  saveOrder(order);
  clearCart(order.userId);
  return order;
}

// ---------------- 读取 ----------------
export function listOrdersHandler() {
  return listOrders();
}

export function getOrderDetail(ctx) {
  const order = getOrder(ctx.params.orderNo);
  if (!order) throw new HttpError(404, '订单不存在');
  return order;
}

// ---------------- 通用状态推进 ----------------
export function updateStatus(ctx) {
  const order = getOrder(ctx.params.orderNo);
  if (!order) throw new HttpError(404, '订单不存在');
  const status = (ctx.body && ctx.body.status) || '';
  const note = (ctx.body && ctx.body.note) || '';
  const extra = (ctx.body && ctx.body.extra) || null;
  return saveOrder(applyTransition(order, status, note, extra));
}

// ---------------- 模拟支付 ----------------
export function pay(ctx) {
  const order = getOrder(ctx.params.orderNo);
  if (!order) throw new HttpError(404, '订单不存在');
  if (order.status !== STATUS.PENDING_PAYMENT) {
    throw new HttpError(4003, '仅「待支付」订单可支付，当前状态：' + order.status);
  }
  const paid = saveOrder(
    applyTransition(order, STATUS.PAID, '支付成功（模拟）', {
      payInfo: {
        method: 'mock',
        paidAt: Date.now(),
        transactionId: 'MOCK' + Date.now(),
      },
    })
  );
  scheduleAutoAdvance(order.orderNo);
  return paid;
}

/**
 * 演示用自动推进：已支付 -> 备货中（仅推进到备货，不再自动发货）
 * 注意：Serverless 实例在不活跃时可能被冻结，定时器属尽力而为；
 * 即便未触发，运营也可手动 PATCH 推进或依赖状态机合法性校验。
 */
function scheduleAutoAdvance(orderNo) {
  clearTimers(orderNo);
  timers[orderNo] = setTimeout(() => {
    const order = getOrder(orderNo);
    if (!order || order.status !== STATUS.PAID) return;
    saveOrder(applyTransition(order, STATUS.PREPARING, '商家备货中，等待填写物流单号'));
  }, AUTO_ADVANCE_PAID_TO_PREPARING);
}

// ---------------- 发货（人工填单号） ----------------
export function ship(ctx) {
  const carrier = ((ctx.body && ctx.body.carrier) || '').toString().trim();
  const trackingNo = ((ctx.body && ctx.body.trackingNo) || '').toString().trim();
  // 红线：单号必须人工填写，服务端绝不生成/补全
  if (!trackingNo) throw new HttpError(4002, '请先填写快递单号');

  let order = getOrder(ctx.params.orderNo);
  if (!order) throw new HttpError(404, '订单不存在');
  if (order.status === STATUS.PENDING_PAYMENT) {
    throw new HttpError(4003, '订单未支付，无法发货');
  }
  if (order.status === STATUS.CANCELLED) {
    throw new HttpError(4003, '订单已取消，无法发货');
  }
  if (order.status === STATUS.SHIPPED || order.status === STATUS.COMPLETED) {
    throw new HttpError(4003, '该订单已发货/已完成，无需重复填写');
  }
  // 仍处于「已支付」时先推进到备货中，保证状态机合法
  if (order.status === STATUS.PAID) {
    order = saveOrder(applyTransition(order, STATUS.PREPARING, '商家备货中'));
  }
  clearTimers(ctx.params.orderNo);
  return saveOrder(
    applyTransition(
      order,
      STATUS.SHIPPED,
      '商家已发货：' + (carrier || '快递') + ' ' + trackingNo,
      {
        logistics: {
          carrier: carrier || '快递',
          trackingNo,
          shippedAt: Date.now(),
          receivedAt: null,
        },
      }
    )
  );
}

// ---------------- 取消 ----------------
export function cancel(ctx) {
  const order = getOrder(ctx.params.orderNo);
  if (!order) throw new HttpError(404, '订单不存在');
  if (order.status !== STATUS.PENDING_PAYMENT && order.status !== STATUS.PAID) {
    throw new HttpError(4003, '当前状态不可取消：' + order.status);
  }
  const reason = (ctx.body && ctx.body.reason) || '';
  clearTimers(ctx.params.orderNo);
  return saveOrder(
    applyTransition(
      order,
      STATUS.CANCELLED,
      reason ? '用户取消订单：' + reason : '用户取消订单',
      { cancelReason: reason }
    )
  );
}

// ---------------- 确认签收 ----------------
export function confirmReceive(ctx) {
  const order = getOrder(ctx.params.orderNo);
  if (!order) throw new HttpError(404, '订单不存在');
  if (order.status !== STATUS.SHIPPED) {
    throw new HttpError(4003, '仅「已发货」订单可确认签收，当前状态：' + order.status);
  }
  clearTimers(ctx.params.orderNo);
  return saveOrder(applyTransition(order, STATUS.COMPLETED, '用户确认签收'));
}
