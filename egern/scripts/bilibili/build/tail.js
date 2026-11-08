/* ====================== END UPSTREAM ====================== */
  } catch (__egErr) {
    // bundle 内部异常时不改动流量，避免 App 侧异常
  }
  return __egS.result(ctx);
}

/* ------------------------- 兼容层实现 ------------------------- */

function __egStr(v, d) {
  return v === undefined || v === null || v === "" ? d : String(v);
}

function __egBool(v, d) {
  if (v === undefined || v === null || v === "") return d;
  const s = String(v).toLowerCase();
  return !(s === "false" || s === "0" || s === "no" || s === "off");
}

function __egTimer(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

async function __egBytes(msg) {
  if (!msg) return null;
  try {
    if (typeof msg.arrayBuffer === "function") {
      return new Uint8Array(await msg.arrayBuffer());
    }
  } catch (e) {}
  return null;
}

async function __egInit(ctx, kind, mode) {
  const env = ctx.env || {};
  // 排查开关：一键停用所有脚本
  if (__egBool(env.safeMode, false)) return null;
  const req = ctx.request;
  const fullUrl = String((req && req.url) || "");
  const pathOnly = fullUrl.split("?")[0];

  // 等价于 Loon 的 enable=${...}：按开关跳过不该跑的那条脚本
  if (kind === "request") {
    const isDm = /\/bilibili\.community\.service\.dm\.v1\.DM\/DmSegMobile$/.test(pathOnly);
    if (isDm) {
      if (!__egBool(env.sponsorBlock, false)) return null;
    } else if (!__egBool(env.optimizeRequest, true)) {
      return null;
    }
  }

  let origBody = null;
  let textBody = null;
  if (kind === "request") {
    origBody = await __egBytes(req);
    if (!origBody) origBody = new Uint8Array(0);
  } else if (mode === "binary") {
    origBody = await __egBytes(ctx.response);
    if (!origBody) origBody = new Uint8Array(0);
  } else {
    try { textBody = await ctx.response.text(); } catch (e) { textBody = ""; }
    if (textBody === undefined || textBody === null) textBody = "";
    origBody = textBody;
  }

  // $request / $response 用普通对象承载（Loon 脚本把它们当对象读）
  let request;
  if (kind === "request") {
    request = {
      url: fullUrl,
      method: String((req && req.method) || "GET"),
      headers: (req && req.headers) || {},
      body: origBody,
      bodyBytes: origBody,
    };
  } else {
    request = {
      url: fullUrl,
      method: String((req && req.method) || "GET"),
      headers: (req && req.headers) || {},
      body: new Uint8Array(0),
      bodyBytes: new Uint8Array(0),
    };
  }

  let response;
  if (kind === "response") {
    const r = ctx.response;
    response = {
      status: r && r.status,
      statusCode: r && r.status,
      headers: (r && r.headers) || {},
      body: origBody,
      bodyBytes: origBody,
    };
  } else {
    response = { status: 200, headers: {}, body: new Uint8Array(0) };
  }

  let resolved = false;
  let payload;
  let resolveFn;
  const promise = new Promise(function (r) { resolveFn = r; });

  function $done(o) {
    if (resolved) return;
    resolved = true;
    payload = o;
    resolveFn();
  }

  const store = {
    read: function (k) {
      try { return ctx.storage.get(String(k)); } catch (e) { return null; }
    },
    write: function (v, k) {
      try {
        if (k === undefined || k === null) ctx.storage.set(String(v), "");
        else ctx.storage.set(String(k), String(v));
      } catch (e) {}
    },
  };

  const notify = {
    post: function (title, subtitle, body, opts) {
      try {
        const lines = [subtitle, body].filter(function (x) { return x !== undefined && x !== null && x !== ""; });
        const o = { title: String(title === undefined ? "" : title), body: lines.join("\n") };
        if (opts && typeof opts === "object") {
          if (opts["open-url"] || opts.url) o.url = opts["open-url"] || opts.url;
          if (opts["media-url"]) o.mediaUrl = opts["media-url"];
          if (opts.sound !== undefined) o.sound = opts.sound;
        }
        ctx.notify(o);
      } catch (e) {}
    },
  };

  function httpCall(method) {
    return function (options, cb) {
      const isStr = typeof options === "string";
      const o = isStr ? { url: options } : (options || {});
      const init = {};
      if (o.headers) init.headers = o.headers;
      if (o.body !== undefined && o.body !== null) init.body = o.body;
      if (o.timeout !== undefined) init.timeout = o.timeout;
      if (o.policy !== undefined) init.policy = o.policy;
      if (o["insecure-tls"] !== undefined) init.insecureTls = o["insecure-tls"];
      const bin = o["binary-mode"] === true || o["binary-mode"] === "true";
      ctx.http[method](o.url, init).then(async function (r) {
        try {
          const data = bin ? new Uint8Array(await r.arrayBuffer()) : await r.text();
          if (typeof cb === "function") cb(null, { status: r.status, statusCode: r.status, headers: r.headers, body: data }, data);
        } catch (e) {
          if (typeof cb === "function") cb(String(e));
        }
      }).catch(function (e) {
        if (typeof cb === "function") cb(String(e));
      });
    };
  }

  const utils = {
    ungzip: function (u8) { return __egGunzip(ctx, u8); },
    gzip: function (u8) { return ctx.compress.gzip(u8); },
  };

  return {
    request: request,
    response: response,
    done: $done,
    argument: {
      displayUpList: __egStr(env.displayUpList, "show"),
      purifyComment: __egBool(env.purifyComment, true),
      optimizeRequest: __egBool(env.optimizeRequest, true),
      sponsorBlock: __egBool(env.sponsorBlock, false),
      logLevel: __egStr(env.logLevel, "off"),
    },
    store: store,
    notify: notify,
    http: {
      get: httpCall("get"),
      post: httpCall("post"),
      put: httpCall("put"),
      delete: httpCall("delete"),
      head: httpCall("head"),
      patch: httpCall("patch"),
    },
    loon: "Loon 3.5.1 (998)",
    environment: { "device-model": "iPhone" },
    utils: utils,
    result: async function (c) {
      await Promise.race([promise, __egTimer(10000)]);
      let o = payload;
      if (!o || typeof o !== "object") {
        if (o === undefined && resolved) {
          // $done() 无参数 = 不改动
        }
        return undefined;
      }
      if (o.abort === true) return c.abort();
      // Loon/Surge 的 $done({response}) = 直接伪造响应（本插件用它把重发回来的
      // gRPC 结果交给 App）。必须映射成 ctx.respond，不能当成“改请求”。
      if (o.response && typeof o.response === "object") {
        const r = o.response;
        const resp = { status: r.status !== undefined ? r.status : 200 };
        if (r.headers !== undefined) resp.headers = r.headers;
        const b = r.body !== undefined ? r.body : r.bodyBytes;
        resp.body = b !== undefined ? b : new Uint8Array(0);
        return c.respond(resp);
      }
      const out = {};
      if (kind === "response") {
        if (o.status !== undefined) out.status = o.status;
        if (o.headers !== undefined) out.headers = o.headers;
      } else {
        if (o.url !== undefined) out.url = o.url;
        if (o.method !== undefined) out.method = o.method;
        if (o.headers !== undefined) out.headers = o.headers;
      }
      let body;
      if (o.body !== undefined) body = o.body;
      else if (o.bodyBytes !== undefined) body = o.bodyBytes;
      // body 已经被读过一次，必须原样还回去，否则 Egern 转发时会丢掉请求体
      if (body !== undefined) out.body = body;
      else if (origBody !== null) out.body = origBody;
      if (out.body === "" && mode === "text") return undefined;
      return out;
    },
  };
}

async function __egGunzip(ctx, u8) {
  try {
    const r = await ctx.compress.gunzip(u8);
    return r ? new Uint8Array(r) : u8;
  } catch (e) {
    return u8;
  }
}
