/**
 * DeepSeek 余额小组件 · Egern 通用脚本
 *
 * 数据：DeepSeek 官方 GET /user/balance
 * 今日开销：DeepSeek 没有用量接口，用「当天基线 - 当前余额」本地估算，
 *          余额跳升视为充值/赠送，不会把充值算成负开销。
 *
 * 用法：模块里填写 DEEPSEEK_API_KEY → 添加小组件
 */

const API = 'https://api.deepseek.com';
const K_SPEND = 'ds_spend_record';
const K_HIST = 'ds_spend_history';

// ── 小工具 ─────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WD = ['日', '一', '二', '三', '四', '五', '六'];

function symbolOf(cur) {
  return cur === 'CNY' ? '¥' : '$';
}

// ── 余额 ───────────────────────────────────────────
async function getBalance(ctx, token) {
  const res = await ctx.http.get(`${API}/user/balance`, {
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    timeout: 20000,
  });
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    // 网关返回 HTML 错误页时走下面兜底
  }
  if (res.status !== 200) {
    const msg = json && json.error && json.error.message;
    throw new Error(msg ? `余额查询失败：${msg}` : `余额查询失败（${res.status}）`);
  }
  return json;
}

// ── 开销记录 ────────────────────────────────────────
function todaySpend(ctx, total) {
  const today = dateStr(new Date());
  const rec = ctx.storage.getJSON(K_SPEND);
  const hist = ctx.storage.getJSON(K_HIST) || {};

  const valid =
    rec && rec.date === today &&
    typeof rec.baseline === 'number' &&
    typeof rec.toppedUp === 'number' &&
    typeof rec.lastTotal === 'number';

  let spend = 0;
  if (!valid) {
    // 跨天或首次：把前一天最终值落历史，再为今天建档
    if (rec && rec.date && typeof rec.baseline === 'number') {
      hist[rec.date] = Math.max(0, rec.baseline - (rec.lastTotal - rec.toppedUp));
    }
    ctx.storage.setJSON(K_SPEND, { date: today, baseline: total, toppedUp: 0, lastTotal: total });
  } else {
    if (total > rec.lastTotal) rec.toppedUp += total - rec.lastTotal;
    rec.lastTotal = total;
    spend = Math.max(0, rec.baseline - (total - rec.toppedUp));
    ctx.storage.setJSON(K_SPEND, rec);
  }

  hist[today] = spend;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cs = dateStr(cutoff);
  Object.keys(hist).forEach((k) => {
    if (k < cs) delete hist[k];
  });
  ctx.storage.setJSON(K_HIST, hist);
  return spend;
}

function weeklySpend(ctx) {
  const hist = ctx.storage.getJSON(K_HIST) || {};
  const out = [];
  let sum = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateStr(d);
    const v = hist[key] || 0;
    sum += v;
    out.push({ label: i === 0 ? '今' : WD[d.getDay()], value: v });
  }
  return { weekly: out, average: sum / 7 };
}

// ── DSL 构造 ───────────────────────────────────────
function buildWidget(family, d) {
  const { sym, total, spend, weekly, average, granted, toppedUp } = d;

  const T = {
    label: { light: '#1C1C1E', dark: '#FFFFFF' },
    sec: { light: '#8E8E93', dark: '#98989F' },
    red: { light: '#FF3B30', dark: '#FF453A' },
    blue: { light: '#4D6BFE', dark: '#7B90FF' },
    sep: { light: '#E5E5EA', dark: '#3A3A3C' },
  };

  const txt = (text, size, weight, color, extra) =>
    Object.assign(
      { type: 'text', text: String(text), font: { size, weight: weight || 'regular' }, textColor: color },
      extra || {},
    );
  const row = (children, opts) => Object.assign({ type: 'stack', direction: 'row', children }, opts || {});
  const col = (children, opts) => Object.assign({ type: 'stack', direction: 'column', children }, opts || {});
  const sp = (n) => (n == null ? { type: 'spacer' } : { type: 'spacer', length: n });
  const money = (v) => `${sym}${v.toFixed(2)}`;
  const spendText = (v) => (v > 0 ? `-${money(v)}` : `${sym}0.00`);

  const logo = { type: 'image', src: 'sf-symbol:brain.head.profile', width: 15, height: 15, color: T.blue };

  const header = row([logo, sp(4), txt('DeepSeek', 13, 'bold', T.label), sp(), txt('余额', 11, 'medium', T.sec)], {
    alignItems: 'center',
  });

  // 锁屏小圆环：今日开销占 7 日均值比例
  if (family === 'accessoryCircular') {
    const pct = average > 0 ? Math.min(1, spend / average) : 0;
    return {
      type: 'widget',
      children: [
        { type: 'gauge', value: pct, label: { type: 'text', text: 'DS', font: { size: 9 } }, currentValueLabel: txt(`${Math.round(pct * 100)}%`, 11, 'bold') },
      ],
    };
  }

  if (family === 'accessoryInline' || family === 'accessoryRectangular') {
    return {
      type: 'widget',
      children: [txt(`DeepSeek ${money(total)} · 今日 ${spendText(spend)}`, 13, 'semibold', T.label, { lineLimit: 1 })],
    };
  }

  // systemSmall
  if (family === 'systemSmall') {
    return {
      type: 'widget',
      padding: 14,
      gap: 0,
      children: [
        header,
        sp(8),
        txt('余额', 10, 'medium', T.sec),
        txt(money(total), 26, 'bold', T.label, { lineLimit: 1, minScale: 0.6 }),
        sp(),
        txt('今日开销', 10, 'medium', T.sec),
        txt(spendText(spend), 15, 'bold', spend > 0 ? T.red : T.sec),
      ],
    };
  }

  // systemMedium / Large：左数据 + 右 7 日柱状图
  const chartW = family === 'systemMedium' ? 150 : 300;
  const chartH = family === 'systemMedium' ? 104 : 180;
  const maxV = Math.max(average * 2, ...weekly.map((w) => w.value), 0.01);
  const bw = Math.floor((chartW - 6 * 6) / 7);
  const marks = weekly.map((w, i) => {
    const h = Math.max(2, Math.round((w.value / maxV) * (chartH - 18)));
    return { type: 'rect', x: i * (bw + 6), y: chartH - 18 - h, w: bw, h, radius: 3, fill: w.value > average ? T.red : T.blue };
  });
  const labels = weekly.map((w, i) =>
    txt(w.label, 9, 'medium', T.sec, { x: i * (bw + 6), y: chartH - 14, w: bw, h: 12, textAlign: 'center' }),
  );

  const largeExtra =
    family === 'systemLarge'
      ? [
          col([
            row([txt('赠金', 11, 'medium', T.sec), sp(), txt(money(granted), 12, 'semibold', T.label)], { alignItems: 'center' }),
            row([txt('充值余额', 11, 'medium', T.sec), sp(), txt(money(toppedUp), 12, 'semibold', T.label)], { alignItems: 'center' }),
            row([txt('7 日均开销', 11, 'medium', T.sec), sp(), txt(money(average), 12, 'semibold', T.label)], { alignItems: 'center' }),
          ], { gap: 8 }),
        ]
      : [];

  return {
    type: 'widget',
    padding: 14,
    gap: 0,
    children: [
      header,
      sp(6),
      row(
        [
          col(
            [
              txt('余额', 10, 'medium', T.sec),
              txt(money(total), 22, 'bold', T.label, { lineLimit: 1, minScale: 0.6 }),
              sp(6),
              txt('今日开销', 10, 'medium', T.sec),
              txt(spendText(spend), 16, 'bold', spend > 0 ? T.red : T.sec),
            ],
            { alignItems: 'start' },
          ),
          {
            type: 'stack',
            direction: 'column',
            width: chartW,
            height: chartH,
            children: [...marks, ...labels],
          },
        ],
        { alignItems: 'center' },
      ),
      ...largeExtra,
    ],
  };
}

function errorWidget(msg) {
  return {
    type: 'widget',
    padding: 14,
    gap: 6,
    children: [
      { type: 'image', src: 'sf-symbol:exclamationmark.triangle.fill', width: 18, height: 18, color: '#FF9F0A' },
      { type: 'text', text: 'DeepSeek', font: { size: 13, weight: 'bold' } },
      { type: 'text', text: msg, font: { size: 11 } },
    ],
  };
}

// ── 入口 ───────────────────────────────────────────
export default async function (ctx) {
  const family = ctx.widgetFamily || 'systemSmall';
  try {
    const token = (ctx.env.DEEPSEEK_API_KEY || '').trim();
    if (!token) throw new Error('未填写 DEEPSEEK_API_KEY');

    const data = await getBalance(ctx, token);
    if (!data.is_available) throw new Error('账户余额不可用');
    const info = (data.balance_infos || [])[0];
    if (!info) throw new Error('未获取到余额信息');

    const total = parseFloat(info.total_balance) || 0;
    const spend = todaySpend(ctx, total);
    const { weekly, average } = weeklySpend(ctx);

    return buildWidget(family, {
      sym: symbolOf(info.currency),
      total,
      spend,
      weekly,
      average,
      granted: parseFloat(info.granted_balance) || 0,
      toppedUp: parseFloat(info.topped_up_balance) || 0,
    });
  } catch (e) {
    return errorWidget(e instanceof Error ? e.message : String(e));
  }
}
