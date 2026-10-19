/**
 * 菜品域：仅取数，不做业务校验（菜品均默认上架）
 * 路由见 services/repo/contract.js：
 *   GET /categories
 *   GET /dishes        ?categoryId=xxx
 *   GET /dishes/:id
 */
import { getCategories, getDishes, getDish } from './store.js';
import { HttpError } from './core.js';

export function listCategories() {
  return getCategories();
}

export function listDishes(ctx) {
  const categoryId = (ctx.query && ctx.query.categoryId) || '';
  return getDishes(categoryId);
}

export function getDishDetail(ctx) {
  const dish = getDish(ctx.params.id);
  if (!dish) throw new HttpError(404, '菜品不存在或已下架');
  return dish;
}
