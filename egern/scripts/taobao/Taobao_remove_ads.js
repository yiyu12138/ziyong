// Egern 原生脚本：由 Loon/Surge 老 API 脚本移植（垫片层兼容 $request/$response/$done/$httpClient/$persistentStore）
// 来源：kelee.one/Tool/Loon/Resource/JavaScript/Taobao/Taobao_remove_ads.js


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
    /*
    脚本引用https://raw.githubusercontent.com/RuCu6/QuanX/main/Scripts/myBlockAds.js
    */
    // 2024-01-12 09:10

    const url = $request.url;
    const isResp = typeof $response !== "undefined";
    let body = $response.body;

    switch (isResp) {
      // 淘宝-开屏视频广告
      case /^https:\/\/guide-acs\.m\.taobao\.com\/gw\/mtop\.taobao\.cloudvideo\.video\.query/.test(url):
        try {
          let obj = JSON.parse(body);
          if (obj?.data?.duration) {
            obj.data.duration = "0";
          }
          if (obj?.data?.resources?.length > 0) {
            obj.data.resources = [];
          }
          if (obj?.data?.caches?.length > 0) {
            obj.data.caches = [];
          }
          if (obj?.data?.respTimeInMs) {
            obj.data.respTimeInMs = "3818332800000";
          }
          body = JSON.stringify(obj);
        } catch (err) {
          console.log(`淘宝-开屏视频广告, 出现异常: ` + err);
        }
        break;
      // 淘宝-开屏图片广告
      case /^https:\/\/guide-acs\.m\.taobao\.com\/gw\/mtop\.taobao\.wireless\.home\.splash\.awesome\.get/.test(url):
        try {
          let obj = JSON.parse(body);
          if (obj?.data?.containers?.splash_home_base) {
            let splash = obj.data.containers.splash_home_base;
            if (splash?.base?.sections?.length > 0) {
              for (let items of splash.base.sections) {
                if ("taobao-splash" in items.bizData) {
                  if (items?.bizData?.["taobao-splash"]?.data?.length > 0) {
                    for (let item of items.bizData["taobao-splash"].data) {
                      item.waitTime = "0";
                      item.times = "0";
                      item.hotStart = "false";
                      item.haveVoice = "false";
                      item.hideTBLogo = "false";
                      item.enable4G = "false";
                      item.coldStart = "false";
                      item.waitTime = "0";
                      item.startTime = "3818332800000";
                      item.endTime = "3818419199000";
                      item.gmtStart = "2090-12-31 00:00:00";
                      item.gmtEnd = "2090-12-31 23:59:59";
                      item.gmtStartMs = "3818332800000";
                      item.gmtEndMs = "3818419199000";
                      if (item?.imgUrl) {
                        item.imgUrl = "";
                      }
                      if (item?.videoUrl) {
                        item.videoUrl = "";
                      }
                    }
                  }
                }
              }
            }
          }
          body = JSON.stringify(obj);
        } catch (err) {
          console.log(`淘宝-开屏图片广告, 出现异常: ` + err);
        }
        break;
      // 淘宝-开屏活动
      case /^https:\/\/poplayer\.template\.alibaba\.com\/\w+\.json/.test(url):
        try {
          let obj = JSON.parse(body);
          if (obj?.res?.images?.length > 0) {
            obj.res.images = [];
          }
          if (obj?.res?.videos?.length > 0) {
            obj.res.videos = [];
          }
          if (obj?.enable) {
            obj.enable = false;
          }
          if (obj?.mainRes?.images?.length > 0) {
            obj.mainRes.images = [];
          }
          body = JSON.stringify(obj);
        } catch (err) {
          console.log(`淘宝-开屏活动, 出现异常: ` + err);
        }
        break;
      default:
        $done({});
    }

    $done({ body });
  } catch (e) {
    if (e && typeof e === 'object' && '__done' in e) return e.__done;
    console.log('[egern] script error: ' + (e && e.message ? e.message : e));
  }
  return {};
}
