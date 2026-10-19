/**
 * 内存数据存储（演示用）
 * 真实上线时：把这里的数组换成数据库（腾讯云 MySQL/Postgres 或 Supabase），
 * 仅需改本文件与 order.js 的数据读写，其余路由/契约不变。
 *
 * 注意：Serverless 实例冷启动会重置内存 -> 仅适合演示联调；
 * 生产环境务必使用外部持久化存储。
 */
import { STATUS, MIN_HEADS, STORE_ID, STORE_NAME } from './core.js';

// ---------------- 规格组定义（与小程序 mock 一致） ----------------
const SPICE = {
  groupId: 'spice', groupName: '辣度', type: 'single', required: true, defaultOptionId: 'spice_medium',
  options: [
    { optionId: 'spice_mild', optionName: '微辣', priceDelta: 0 },
    { optionId: 'spice_medium', optionName: '中辣', priceDelta: 0 },
    { optionId: 'spice_hot', optionName: '特辣', priceDelta: 0 },
  ],
};
const PORTION = {
  groupId: 'portion', groupName: '份量', type: 'single', required: false,
  options: [
    { optionId: 'portion_std', optionName: '标准', priceDelta: 0 },
    { optionId: 'portion_large', optionName: '加量（+50%）', priceDelta: 300 },
  ],
};
const EXTRA = {
  groupId: 'extra', groupName: '加料', type: 'multiple', required: false,
  options: [
    { optionId: 'extra_peanut', optionName: '加卤花生', priceDelta: 100 },
    { optionId: 'extra_bamboo', optionName: '加笋干', priceDelta: 150 },
    { optionId: 'extra_kelp', optionName: '加海带结', priceDelta: 120 },
  ],
};

// ---------------- 分类 ----------------
export const categories = [
  { _id: 'cat_signature', name: '招牌兔头', sortOrder: 1, status: 'on' },
  { _id: 'cat_stew', name: '卤味荤菜', sortOrder: 2, status: 'on' },
  { _id: 'cat_veg', name: '素菜小吃', sortOrder: 3, status: 'on' },
  { _id: 'cat_drink', name: '饮品', sortOrder: 4, status: 'on' },
  { _id: 'cat_combo', name: '超值套餐', sortOrder: 5, status: 'on' },
];

// ---------------- 菜品（金额单位：分） ----------------
// headCount：每份折算的「兔头个数」。兔头类=1；含兔头套餐按实际=2；其余（兔腿/兔丁/卤味/饮品）不填=0 不计入起送
export const dishes = [
  { _id: 'd_001', name: '麻辣兔头', images: ['/assets/dishes/d_001.jpg'], price: 1200, originalPrice: 1500, headCount: 1, categoryId: 'cat_signature', specGroups: [SPICE, EXTRA], monthlySales: 3268, description: '招牌必点！新鲜兔头现卤现拌，麻辣鲜香，连骨头都要吮干净。真空包装，冷藏保质期 7 天。', tags: ['招牌', '热销'], status: 'on', sortOrder: 1 },
  { _id: 'd_002', name: '五香兔头', images: ['/assets/dishes/d_002.jpg'], price: 1200, originalPrice: 0, headCount: 1, categoryId: 'cat_signature', specGroups: [EXTRA], monthlySales: 1580, description: '不吃辣的朋友选这个！二十余味香料老卤慢炖，回味甘香。', tags: ['不辣推荐'], status: 'on', sortOrder: 2 },
  { _id: 'd_003', name: '香辣兔腿', images: ['/assets/dishes/d_003.jpg'], price: 1500, originalPrice: 0, categoryId: 'cat_signature', specGroups: [SPICE, EXTRA], monthlySales: 2140, description: '兔腿肉厚过瘾，外酥里嫩，一只就能吃饱。', tags: ['热销'], status: 'on', sortOrder: 3 },
  { _id: 'd_004', name: '冷吃兔丁', images: ['/assets/dishes/d_004.jpg'], price: 2600, originalPrice: 3200, categoryId: 'cat_signature', specGroups: [SPICE, PORTION, EXTRA], monthlySales: 986, description: '自贡做法冷吃兔，辣椒里找肉丁，越嚼越香，下酒绝配。', tags: ['下酒菜'], status: 'on', sortOrder: 4 },
  { _id: 'd_005', name: '卤鸭脖', images: ['/assets/dishes/d_005.jpg'], price: 800, originalPrice: 0, categoryId: 'cat_stew', specGroups: [SPICE], monthlySales: 4521, description: '经典卤味，肉质紧实有嚼劲，追剧必备。', tags: ['热销'], status: 'on', sortOrder: 1 },
  { _id: 'd_006', name: '卤鸭锁骨', images: ['/assets/dishes/d_006.jpg'], price: 900, originalPrice: 0, categoryId: 'cat_stew', specGroups: [SPICE], monthlySales: 1876, description: '锁骨上的活肉最香，先啃肉再吸髓。', tags: [], status: 'on', sortOrder: 2 },
  { _id: 'd_007', name: '卤鸭翅', images: ['/assets/dishes/d_007.jpg'], price: 700, originalPrice: 0, categoryId: 'cat_stew', specGroups: [SPICE], monthlySales: 1342, description: '皮糯肉香，卤香入骨。', tags: [], status: 'on', sortOrder: 3 },
  { _id: 'd_008', name: '卤莲藕', images: ['/assets/dishes/d_008.jpg'], price: 500, originalPrice: 0, categoryId: 'cat_veg', specGroups: [SPICE], monthlySales: 2210, description: '粉藕卤制，口感粉糯，吸饱了老卤的精华。', tags: ['素食'], status: 'on', sortOrder: 1 },
  { _id: 'd_009', name: '卤毛豆', images: ['/assets/dishes/d_009.jpg'], price: 500, originalPrice: 0, categoryId: 'cat_veg', specGroups: [SPICE], monthlySales: 1980, description: '翠绿爽口，咸香适中，夏日宵夜黄金搭档。', tags: [], status: 'on', sortOrder: 2 },
  { _id: 'd_010', name: '卤土豆片', images: ['/assets/dishes/d_010.jpg'], price: 600, originalPrice: 0, categoryId: 'cat_veg', specGroups: [SPICE], monthlySales: 1123, description: '薄切土豆片，脆糯交织，辣得过瘾。', tags: [], status: 'on', sortOrder: 3 },
  { _id: 'd_011', name: '冰镇酸梅汤', images: ['/assets/dishes/d_011.jpg'], price: 600, originalPrice: 0, categoryId: 'cat_drink', specGroups: [], monthlySales: 2890, description: '古法熬制酸梅汤，解辣神器，冰镇后口感更佳。', tags: ['解辣'], status: 'on', sortOrder: 1 },
  { _id: 'd_012', name: '招牌双拼套餐', images: ['/assets/dishes/d_012.jpg'], price: 4800, originalPrice: 5600, headCount: 2, categoryId: 'cat_combo', specGroups: [SPICE], monthlySales: 760, description: '2 个麻辣兔头 + 1 根兔腿 + 1 份卤鸭脖，一次吃全，比单点省 8 元。', tags: ['超值'], status: 'on', sortOrder: 1 },
];

// ---------------- 地址（演示种子） ----------------
export const addresses = [
  {
    _id: 'addr_001',
    contactName: '王小姐',
    contactPhone: '13812348888',
    province: '四川省',
    city: '成都市',
    district: '武侯区',
    detail: '天府三街 99 号腾讯大厦 B 座 1501',
    isDefault: true,
  },
];

// ---------------- 订单（演示种子：1 已发货 / 1 已完成） ----------------
function buildSeedOrders() {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const mk = (seed, status, lines, carrier, trackingNo, shippedAt, completedAt) => {
    const createdAt = now - seed * DAY;
    const paidAt = createdAt + 60000;
    const preparingAt = createdAt + 300000;
    const shipAt = shippedAt != null ? shippedAt : createdAt + 3600000;
    const compAt = completedAt != null ? completedAt : now - 5 * DAY;
    const timeline = [
      { status: STATUS.PENDING_PAYMENT, at: createdAt, note: '订单已提交，等待支付' },
      { status: STATUS.PAID, at: paidAt, note: '支付成功（模拟）' },
      { status: STATUS.PREPARING, at: preparingAt, note: '商家备货中' },
      { status: STATUS.SHIPPED, at: shipAt, note: carrier + ' ' + trackingNo },
    ];
    if (status === STATUS.COMPLETED) {
      timeline.push({ status: STATUS.COMPLETED, at: compAt, note: '用户确认签收' });
    }
    return {
      orderNo: 'MT' + (now - seed * DAY).toString(36).toUpperCase() + '0000',
      userId: 'demo_user',
      storeId: STORE_ID,
      storeName: STORE_NAME,
      items: lines,
      pricing: { itemsTotal: lines.reduce((s, it) => s + it.subtotal, 0), packagingFee: 0, deliveryFee: 0, discount: 0, totalAmount: lines.reduce((s, it) => s + it.subtotal, 0) },
      fulfillment: { method: 'express', addressSnapshot: { contactName: '王小姐', contactPhone: '13812348888', region: '四川省成都市武侯区', detail: '天府三街 99 号腾讯大厦 B 座 1501' } },
      remark: '',
      status: status,
      timeline: timeline,
      payInfo: { method: 'mock', paidAt: paidAt, transactionId: 'MOCK' + seed },
      logistics: status === STATUS.SHIPPED || status === STATUS.COMPLETED
        ? { carrier: carrier, trackingNo: trackingNo, shippedAt: shipAt, receivedAt: compAt }
        : null,
      createdAt: createdAt, updatedAt: shipAt, paidAt: paidAt, completedAt: compAt, cancelledAt: null,
    };
  };
  return [
    mk(2, STATUS.SHIPPED,
      [
        { dishId: 'd_001', dishSnapshot: { name: '麻辣兔头', image: '/assets/dishes/d_001.jpg', price: 1200 }, selectedSpecs: [{ groupId: 'spice', groupName: '辣度', optionId: 'spice_medium', optionName: '中辣', priceDelta: 0 }], quantity: 12, unitPrice: 1200, subtotal: 14400, remark: '' },
        { dishId: 'd_005', dishSnapshot: { name: '卤鸭脖', image: '/assets/dishes/d_005.jpg', price: 800 }, selectedSpecs: [{ groupId: 'spice', groupName: '辣度', optionId: 'spice_mild', optionName: '微辣', priceDelta: 0 }], quantity: 4, unitPrice: 800, subtotal: 3200, remark: '多套一个袋子' },
      ], '顺丰速运', 'SF1234567890', now - 2 * DAY + 3600000, null),
    mk(6, STATUS.COMPLETED,
      [
        { dishId: 'd_003', dishSnapshot: { name: '香辣兔腿', image: '/assets/dishes/d_003.jpg', price: 1500 }, selectedSpecs: [{ groupId: 'spice', groupName: '辣度', optionId: 'spice_hot', optionName: '特辣', priceDelta: 0 }, { groupId: 'extra', groupName: '加料', optionId: 'extra_peanut', optionName: '加卤花生', priceDelta: 100 }], quantity: 10, unitPrice: 1600, subtotal: 16000, remark: '' },
      ], '京东物流', 'JD9876543210', now - 6 * DAY + 7200000, now - 5 * DAY),
  ];
}

// 运行时内存集合（冷启动重置：仅演示）
const state = {
  orders: buildSeedOrders(),
  carts: {}, // userId -> { items, updatedAt }
};

// ---------------- 读取类 ----------------
export function getCategories() {
  return categories.filter((c) => c.status !== 'off').slice().sort((a, b) => a.sortOrder - b.sortOrder);
}
export function getDishes(categoryId) {
  return dishes
    .filter((d) => d.status === 'on')
    .filter((d) => !categoryId || d.categoryId === categoryId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
export function getDish(id) {
  return dishes.find((d) => d._id === id && d.status === 'on') || null;
}
export function listOrders() {
  return state.orders.slice().sort((a, b) => b.createdAt - a.createdAt);
}
export function getOrder(orderNo) {
  return state.orders.find((o) => o.orderNo === orderNo) || null;
}
export function listAddresses() {
  return addresses.slice().sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
}
export function getDefaultAddress() {
  return addresses.find((a) => a.isDefault) || addresses[0] || null;
}
export function getCart(userId) {
  return state.carts[userId] || { items: [], updatedAt: 0 };
}

// ---------------- 写入类 ----------------
export function saveOrder(order) {
  const idx = state.orders.findIndex((o) => o.orderNo === order.orderNo);
  if (idx > -1) state.orders[idx] = order;
  else state.orders.unshift(order);
  return order;
}
export function saveCart(userId, cart) {
  state.carts[userId] = { items: (cart && cart.items) || [], updatedAt: Date.now() };
  return true;
}
export function clearCart(userId) {
  state.carts[userId] = { items: [], updatedAt: Date.now() };
  return true;
}
export function saveAddress(address) {
  const isNew = !address._id;
  const record = Object.assign({}, address, { _id: address._id || 'addr_' + Date.now().toString(36), isDefault: !!address.isDefault });
  if (record.isDefault) addresses.forEach((a) => { a.isDefault = false; });
  if (isNew) addresses.unshift(record);
  else {
    const idx = addresses.findIndex((a) => a._id === record._id);
    if (idx > -1) addresses[idx] = record;
  }
  if (!addresses.some((a) => a.isDefault) && addresses.length) addresses[0].isDefault = true;
  return record;
}
export function removeAddress(addressId) {
  const idx = addresses.findIndex((a) => a._id === addressId);
  if (idx > -1) addresses.splice(idx, 1);
  if (addresses.length && !addresses.some((a) => a.isDefault)) addresses[0].isDefault = true;
  return true;
}
export function setDefaultAddress(addressId) {
  addresses.forEach((a) => { a.isDefault = a._id === addressId; });
  return true;
}

// 折兔头个数（与小程序 models/cart.js.countHeads 一致）
export function countHeads(items) {
  return (items || []).reduce(function (sum, it) {
    return sum + ((it.dishSnapshot && it.dishSnapshot.headCount) || 0) * it.quantity;
  }, 0);
}
