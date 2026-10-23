/*
 * DeepSeek 余额面板 · Egern / Surge 通用版
 * API: https://api.deepseek.com/user/balance
 * 参数: argument={{{APIKey}}} 或直接 argument=sk-xxxx
 */

const API_URL = "https://api.deepseek.com/user/balance";
const TZ_OFFSET = 8 * 60 * 60 * 1000; // Asia/Shanghai

function nowHM() {
  const d = new Date(Date.now() + TZ_OFFSET);
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return p(d.getUTCHours()) + ":" + p(d.getUTCMinutes());
}

function parseKey(raw) {
  let s = (raw === undefined || raw === null) ? "" : String(raw).trim();
  try { s = decodeURIComponent(s); } catch (e) {}
  // 兼容 key=value / a=1&b=2 之类的写法
  const m = s.match(/sk-[A-Za-z0-9_\-]{6,}/);
  if (m) return m[0];
  if (s.indexOf("=") !== -1) {
    const parts = s.split(/[&,]/);
    for (const p of parts) {
      const i = p.indexOf("=");
      if (i === -1) continue;
      const v = p.slice(i + 1).trim();
      if (v && v.indexOf("{{{") === -1) return v;
    }
  }
  return s;
}

function fmt(v) {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  return n.toFixed(2);
}

function done(o) { $done(o); }

const RAW = (typeof $argument !== "undefined" && $argument !== null) ? $argument : "";
const KEY = parseKey(RAW);

if (!KEY || KEY.indexOf("{{{") !== -1 || /^sk-x+$/i.test(KEY) || KEY.length < 10) {
  done({
    title: "DeepSeek 余额",
    content: "未配置 API Key\n请在模块参数里填写 APIKey",
    style: "error",
    icon: "exclamationmark.triangle"
  });
} else {
  $httpClient.get({
    url: API_URL,
    headers: {
      "Accept": "application/json",
      "Authorization": "Bearer " + KEY,
      "User-Agent": "Egern-DeepSeek-Balance/1.0"
    },
    timeout: 15
  }, function (err, resp, body) {
    if (err) {
      done({
        title: "DeepSeek 余额",
        content: "请求失败\n" + String(err),
        style: "error",
        icon: "wifi.exclamationmark"
      });
      return;
    }
    const code = resp && (resp.status || resp.statusCode) ? (resp.status || resp.statusCode) : 0;
    if (code && code !== 200) {
      let hint = "HTTP " + code;
      if (code === 401) hint += " · Key 无效";
      if (code === 402) hint += " · 余额不足";
      if (code === 429) hint += " · 请求过于频繁";
      done({
        title: "DeepSeek 余额",
        content: hint,
        style: "error",
        icon: "xmark.octagon"
      });
      return;
    }

    let data = null;
    try {
      data = typeof body === "string" ? JSON.parse(body) : body;
    } catch (e) {
      done({
        title: "DeepSeek 余额",
        content: "返回解析失败\n" + String(body).slice(0, 120),
        style: "error",
        icon: "questionmark.circle"
      });
      return;
    }

    const infos = (data && data.balance_infos) || [];
    if (!infos.length) {
      done({
        title: "DeepSeek 余额",
        content: "无余额信息\n账户可用: " + (data && data.is_available ? "是" : "否"),
        style: "alert",
        icon: "creditcard"
      });
      return;
    }

    const SYM = { CNY: "¥", USD: "$" };
    const lines = [];
    let totalCNY = 0;
    for (const it of infos) {
      const sym = SYM[it.currency] || (it.currency ? it.currency + " " : "");
      const total = Number(it.total_balance) || 0;
      if (it.currency === "CNY") totalCNY = total;
      lines.push(it.currency + "  " + sym + fmt(total));
      const sub = [];
      if (it.topped_up_balance !== undefined) sub.push("充值 " + sym + fmt(it.topped_up_balance));
      if (it.granted_balance !== undefined) sub.push("赠金 " + sym + fmt(it.granted_balance));
      if (sub.length) lines.push(sub.join(" · "));
    }
    lines.push("更新 " + nowHM());

    done({
      title: "DeepSeek 余额",
      content: lines.join("\n"),
      style: data.is_available === false ? "alert" : (totalCNY > 0 ? "good" : "alert"),
      icon: "creditcard"
    });
  });
}
