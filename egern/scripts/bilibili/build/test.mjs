// 在 Node 里模拟 Egern ctx，冒烟测试三个适配脚本
const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);

function makeCtx(url, bodyObj, kind) {
  const text = typeof bodyObj === "string" ? bodyObj : JSON.stringify(bodyObj);
  const buf = enc(text);
  return {
    env: {},
    request: {
      url,
      method: "GET",
      headers: { "user-agent": "bili/1.0" },
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    },
    response: {
      status: 200,
      headers: { "content-type": "application/json" },
      text: async () => text,
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    },
    storage: { get: () => null, set: () => {} },
    notify: (o) => console.log("  [notify]", o.title, o.body),
    http: { get: async () => ({ status: 200, headers: {}, text: async () => "[]", arrayBuffer: async () => new ArrayBuffer(0) }) },
    compress: { gunzip: async (u8) => u8, gzip: async (u8) => u8 },
    abort: () => ({ __aborted: true }),
  };
}

async function run(file, url, body) {
  const mod = await import("file://" + file);
  const ret = await mod.default(makeCtx(url, body));
  return ret;
}

const base = process.argv[2];

// 1) 直播间 JSON 脚本
const liveBody = {
  code: 0,
  data: {
    card_list: [{ card_type: "banner_v2" }, { card_type: "normal" }],
    function_card: [{ a: 1 }],
    new_tab_info: { outer_list: [{ biz_id: 33 }, { biz_id: 7 }] },
  },
};
const r1 = await run(base + "/bilibili-json.js",
  "https://api.live.bilibili.com/xlive/app-interface/v2/index/feed?x=1", liveBody);
console.log("json script ->", r1 && r1.body ? dec(typeof r1.body === "string" ? enc(r1.body) : r1.body) : r1);

// 2) proto 响应脚本：喂空 body，确认不炸、返回可用
const emptyBuf = new Uint8Array(5);
const ctx2 = makeCtx("https://app.bilibili.com/bilibili.app.show.v1.Popular/Index", "");
ctx2.response.arrayBuffer = async () => emptyBuf.buffer;
ctx2.response.text = async () => "";
const m2 = await import("file://" + base + "/bilibili-proto-response.js");
const r2 = await m2.default(ctx2);
console.log("proto response ->", r2 === undefined ? "undefined(不改动)" : Object.keys(r2));

// 3) proto 请求脚本：sponsorBlock 默认关，应直接跳过
const ctx3 = makeCtx("https://app.bilibili.com/bilibili.community.service.dm.v1.DM/DmSegMobile", "");
ctx3.request.arrayBuffer = async () => new ArrayBuffer(0);
const m3 = await import("file://" + base + "/bilibili-proto-request.js");
const r3 = await m3.default(ctx3);
console.log("proto request (sponsorBlock=off) ->", r3 === undefined ? "skipped" : r3);
