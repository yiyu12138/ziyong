function b64ToBytes(s) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = String(s).replace(/[^A-Za-z0-9+/]/g, "");
  const out = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    buffer = (buffer << 6) | chars.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

// 三条 gRPC 接口的本地响应（与 Loon 版的 response.body.mock 完全一致）
const MOCKS = {
  "/bilibili.app.interface.v1.Teenagers/ModeStatus": "AAAAABMKEQgCEgl0ZWVuYWdlcnMgAioA",
  "/bilibili.app.interface.v1.Search/DefaultWords": "AAAAACEaHeaQnOe0ouinhumikeOAgeeVquWJp+aIlnVw5Li7KAE=",
  "/bilibili.app.view.v1.View/TFInfo": "AAAAAAA=",
  "/bilibili.app.viewunite.v1.View/PlayPause": "AAAAAAA=",
  "/bilibili.app.viewunite.v1.View/ViewEndPage": "AAAAAAA=",
};

export default async function (ctx) {
  const url = String((ctx.request && ctx.request.url) || "").split("?")[0];
  for (const path of Object.keys(MOCKS)) {
    if (url.endsWith(path)) {
      return { body: b64ToBytes(MOCKS[path]) };
    }
  }
}
