/**
 * EdgeOne Pages Cloud Functions —— 入口（catch-all）
 *
 * 部署说明：
 *  1. 把本目录（server/cloud-functions）作为项目根下的 cloud-functions 目录推到 Git，
 *     在 EdgeOne Pages 控制台「导入 Git 仓库」时函数目录选 cloud-functions。
 *  2. 平台识别 [[default]].js 为通配入口，所有请求（/dishes、/orders…）都会进入这里。
 *  3. 运行时选 Node.js 20，函数类型务必选「云函数」(Cloud Functions)，
 *     不要选边缘函数（Edge Functions 仅 1MB body / 200ms，跑不动本服务）。
 *  4. 必须绑定已备案的自定义域名（*.edgeone.dev 共享域名无法填入微信请求合法域名）。
 *  5. 部署后把该域名填入小程序 config/index.js 的 config.server.baseUrl，
 *     并把 DATA_SOURCE 切到 'http'，页面零改动即可联调。
 *
 * 入口约定：导出 onRequest(context)；context.request 为 Web 标准 Request。
 * 响应统一包装 { code, message, data }，HTTP 状态恒 200（业务码在 code），
 * 与小程序 services/http/request.js 的解析约定完全一致。
 */
import { dispatch, CORS } from './lib/router.js';

// 解析 Bearer Token（本阶段未接入真实登录，仅透传；userId 暂固定为 demo_user）
function parseAuth(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return { token, userId: 'demo_user' };
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: Object.assign(
      { 'content-type': 'application/json; charset=utf-8' },
      CORS
    ),
  });
}

export async function onRequest(context) {
  const request = context.request;
  const method = (request.method || 'GET').toUpperCase();
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 预检
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // 解析 query
  const query = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });

  // 解析 body（容错：GET/DELETE 或无 body 时回退为空对象）
  let body = {};
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }
    if (!body || typeof body !== 'object') body = {};
  }

  const auth = parseAuth(request);

  const result = await dispatch(method, pathname, { body, query, auth });
  return jsonResponse(result);
}
