// Egern 原生脚本：由 Loon/Surge 老 API 脚本移植（垫片层兼容 $request/$response/$done/$httpClient/$persistentStore）
// 来源：kelee.one/Tool/Loon/Resource/JavaScript/iMaiCai/iMaiCai_remove_ads.js


export default async function (ctx) {
  const __req = ctx.request;
  const $request = {
    url: __req ? __req.url : '',
    method: __req ? __req.method : '',
    headers: __req ? __req.headers : {},
  };
  let $response;
  if (ctx.response) {
    const __body = await ctx.response.text();
    $response = { status: ctx.response.status, headers: ctx.response.headers, body: __body };
  }
  const $persistentStore = {
    read: (k) => ctx.storage.get(k),
    write: (v, k) => ctx.storage.set(k, v),
  };
  const $prefs = $persistentStore;
  const $notify = (title, subtitle, body) => ctx.notify({ title, subtitle, body });
  const __http = async (o, method, cb) => {
    const opt = typeof o === 'string' ? { url: o } : (o || {});
    try {
      const r = await ctx.http[method](opt.url, opt);
      const text = await r.text();
      cb(null, { status: r.status, headers: r.headers, body: text }, text);
    } catch (e) { cb(e); }
  };
  const $httpClient = {
    get: (o, cb) => __http(o, 'get', cb),
    post: (o, cb) => __http(o, 'post', cb),
    put: (o, cb) => __http(o, 'put', cb),
  };
  const $done = (obj) => { throw { __done: obj || {} }; };
  try {
    let data = JSON.parse($response.body);
    data.aidata_dd_resource_config?.data?.customer?.feature_src_list?.ad && delete data.aidata_dd_resource_config.data.customer.feature_src_list.ad;
    $done({ body: JSON.stringify(data) });
  } catch (e) {
    if (e && typeof e === 'object' && '__done' in e) return e.__done;
    console.log('[egern] script error: ' + (e && e.message ? e.message : e));
  }
  return {};
}
