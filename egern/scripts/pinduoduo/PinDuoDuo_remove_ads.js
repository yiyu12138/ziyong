// Egern 原生脚本：由 Loon/Surge 老 API 脚本移植（垫片层兼容 $request/$response/$done/$httpClient/$persistentStore）
// 来源：kelee.one/Tool/Loon/Resource/JavaScript/PinDuoDuo/PinDuoDuo_remove_ads.js
// 说明：原脚本会把页面 chunk 替换成 kelee.one 上的定制 JS（该资源已下线且无镜像），
// 该段替换逻辑已移除，其余（移除开屏 gif 容器、精简 __NEXT_DATA__）保持原样。

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
    https://t.me/ibilibili
    2026-07-11 20:05:34
    */
    let body = $response.body || "";

    const oldChunk = "https://pfile.pddpic.com/mdkd/mdkd/_next/static/chunks/9410-b8806e870a26db7d.js";
    const newChunk = "https://kelee.one/Resource/JavaScript/PinDuoDuo/9410-b8806e870a26db7d.js";

    function replaceAllText(text, from, to) {
      let pos = text.indexOf(from);
      while (pos !== -1) {
        text = text.slice(0, pos) + to + text.slice(pos + from.length);
        pos = text.indexOf(from, pos + to.length);
      }
      return text;
    }

    function removeGifContainer(html) {
      const marker = "index_gif-container";
      let pos = html.indexOf(marker);

      while (pos !== -1) {
        const open = html.lastIndexOf("<div", pos);
        if (open === -1) break;

        let i = open;
        let depth = 0;
        let end = -1;

        while (i < html.length) {
          const nextOpen = html.indexOf("<div", i);
          const nextClose = html.indexOf("</div>", i);
          if (nextClose === -1) break;

          if (nextOpen !== -1 && nextOpen < nextClose) {
            depth++;
            i = nextOpen + 4;
          } else {
            depth--;
            i = nextClose + 6;
            if (depth === 0) {
              end = i;
              break;
            }
          }
        }

        if (end === -1) break;

        html = html.slice(0, open) + html.slice(end);
        pos = html.indexOf(marker, open);
      }

      return html;
    }

    function trimNextData(html) {
      const idNeedle = 'id="__NEXT_DATA__"';
      const idPos = html.indexOf(idNeedle);
      if (idPos === -1) return html;

      const tagStart = html.lastIndexOf("<script", idPos);
      if (tagStart === -1) return html;

      const contentStart = html.indexOf(">", tagStart);
      if (contentStart === -1) return html;

      const tagEnd = html.indexOf("</script>", contentStart);
      if (tagEnd === -1) return html;

      const jsonText = html.slice(contentStart + 1, tagEnd);

      try {
        const data = JSON.parse(jsonText);
        const serverData = data &&
          data.props &&
          data.props.pageProps &&
          data.props.pageProps.serverData;

        if (Array.isArray(serverData)) {
          data.props.pageProps.serverData = serverData.filter(item =>
            item &&
            (item.key === "fastBindCMobilePreCheck" ||
             item.key === "queryStationPackageInfo")
          );
        }

        return html.slice(0, contentStart + 1) +
          JSON.stringify(data) +
          html.slice(tagEnd);
      } catch (e) {
        return html;
      }
    }

    // [egern] 跳过死链 chunk 替换
    body = removeGifContainer(body);
    body = trimNextData(body);

    $done({ body });
  } catch (e) {
    if (e && typeof e === 'object' && '__done' in e) return e.__done;
    console.log('[egern] script error: ' + (e && e.message ? e.message : e));
  }
  return {};
}
