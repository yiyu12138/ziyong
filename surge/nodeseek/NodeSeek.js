/*
 * NodeSeek Cookie 捕获 + 每日签到（Surge 版）
 * 原作：Curtinp118 / Nullwhy
 * 来源：https://github.com/Nullwhy/Egern
 * Surge 适配：yiyu12138
 */

const SCRIPT_NAME = "NodeSeek🎉";
const STORE_KEY = "nodeseek_headers";
const ATTEND_BASE = "https://www.nodeseek.com/api/attendance";

const DEFAULT_HEADERS = {
  Connection: "keep-alive",
  "Accept-Encoding": "gzip, deflate, br",
  Priority: "u=3, i",
  "Content-Type": "text/plain;charset=UTF-8",
  Origin: "https://www.nodeseek.com",
  "refract-sign": "",
  "User-Agent": "Mozilla/5.0",
  "refract-key": "",
  "Sec-Fetch-Mode": "cors",
  Cookie: "",
  Host: "www.nodeseek.com",
  Referer: "https://www.nodeseek.com/",
  "Accept-Language": "zh-CN,zh-Hans;q=0.9",
  Accept: "*/*"
};

const HEADER_KEYS = Object.keys(DEFAULT_HEADERS);

function log(message) {
  console.log(`[${SCRIPT_NAME}] ${message}`);
}

function notify(subtitle, body) {
  log(`${subtitle}: ${body}`);
  $notification.post(SCRIPT_NAME, subtitle, body);
}

function arguments_() {
  const result = {};
  const raw = typeof $argument === "string" ? $argument : "";
  raw.split("&").forEach((item) => {
    const index = item.indexOf("=");
    if (index < 0) return;
    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (key) result[key] = value;
  });
  return result;
}

function isTrue(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function headerValue(headers, key) {
  return headers[key] || headers[key.toLowerCase()] || headers[key.toUpperCase()] || "";
}

function pickHeaders(headers) {
  const saved = {};
  HEADER_KEYS.forEach((key) => {
    const value = headerValue(headers || {}, key);
    if (value) saved[key] = value;
  });
  return saved;
}

function buildAttendHeaders(saved) {
  const headers = {};
  HEADER_KEYS.forEach((key) => {
    headers[key] = (saved && saved[key]) || DEFAULT_HEADERS[key];
  });
  return headers;
}

function captureHeaders() {
  const args = arguments_();
  if (args.capture != null && !isTrue(args.capture)) {
    $done({});
    return;
  }

  const saved = pickHeaders($request.headers || {});
  if (!saved.Cookie) {
    notify("Cookie 失败", "未获取到 Cookie，请确认已登录 NodeSeek");
    $done({});
    return;
  }

  const raw = JSON.stringify(saved);
  if ($persistentStore.read(STORE_KEY) === raw) {
    log("请求头没有变化，无需重复保存");
    $done({});
    return;
  }

  if ($persistentStore.write(raw, STORE_KEY)) {
    notify("Cookie 成功", `已保存 ${Object.keys(saved).length} 个请求头字段`);
  } else {
    notify("Cookie 失败", "写入持久化存储失败");
  }
  $done({});
}

function checkIn() {
  const fixed = isTrue(arguments_().fixed);
  const url = `${ATTEND_BASE}?random=${fixed ? "false" : "true"}`;
  const raw = $persistentStore.read(STORE_KEY);

  if (!raw) {
    notify("缺少 Cookie", "请先访问 NodeSeek 个人页面保存请求头");
    $done();
    return;
  }

  let saved;
  try {
    saved = JSON.parse(raw);
  } catch (error) {
    notify("数据异常", "请重新访问 NodeSeek 个人页面保存请求头");
    $done();
    return;
  }

  log(`开始签到（${fixed ? "固定 5 鸡腿" : "随机鸡腿"}）`);
  $httpClient.post(
    {
      url,
      headers: buildAttendHeaders(saved),
      body: "",
      timeout: 10
    },
    (error, response, data) => {
      if (error) {
        notify("网络错误", String(error));
        $done();
        return;
      }

      const status = response.status || response.statusCode || 0;
      const text = typeof data === "string" ? data : response.body || "";
      let message = "";
      try {
        message = (JSON.parse(text) || {}).message || "";
      } catch (parseError) {}

      const mode = fixed ? "固定" : "随机";
      if (status === 403) {
        notify("被风控", "403，请稍后重试");
      } else if (status === 500) {
        notify("服务器错误", "500");
      } else if (status >= 200 && status < 300) {
        notify(`签到成功（${mode}）`, message || "签到完成");
      } else {
        notify("请求异常", `HTTP ${status}`);
      }
      $done();
    }
  );
}

if (typeof $request !== "undefined" && $request && ($request.url || $request.headers)) {
  captureHeaders();
} else {
  checkIn();
}
