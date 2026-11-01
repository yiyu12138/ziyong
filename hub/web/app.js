const $ = s => document.querySelector(s);
const state = { q: '', fav: false, items: [], meta: null };
const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sortKey = s => (s || '').replace(/^[\s\u200d\ufe0f\p{Emoji}\p{S}\p{P}]+/u, '');
const cmp = (a, b) => sortKey(a.name).localeCompare(sortKey(b.name), 'zh-Hans-CN', { numeric: true });

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('on'), 2000);
}

async function api(path, opt = {}) {
  opt.headers = Object.assign({ 'Content-Type': 'application/json' }, opt.headers || {});
  let r = await fetch(path.replace(/^\//, ''), opt);
  if (!r.ok) {
    let d = 'HTTP ' + r.status;
    try { d = (await r.json()).detail || d; } catch (e) {}
    throw new Error(d);
  }
  return r.json();
}

function egernLink(v) {
  return 'egern:/modules/new?name=' + encodeURIComponent(v.name) + '&url=' + encodeURIComponent(v.url);
}

function iconHtml(v, cls) {
  const url = /^https?:\/\//.test(v.icon || '') ? v.icon : '';
  return url
    ? `<img class="${cls}" src="${esc(url)}" loading="lazy" onerror="this.replaceWith(document.createTextNode(''))">`
    : `<span class="${cls} ph">${esc((v.name || '?').slice(0, 1))}</span>`;
}

function cardHtml(g) {
  const v = g.variants[0];
  const isRule = v.kind === 'rule' || v.kind === 'sub';
  const action = isRule
    ? `<button class="go" data-act="copy" data-url="${esc(v.url)}">复制链接</button>`
    : `<a class="go" href="${egernLink(v)}" data-act="use" data-id="${v.id}">${v.installed ? '已导入' : '导入'}</a>`;
  return `<article class="card${v.installed ? ' done' : ''}" data-key="${esc(g.key)}">
    <div class="hd">
      ${iconHtml(v, 'ic')}
      <h3 data-act="view" data-id="${v.id}">${esc(v.name)}</h3>
      <button class="star${v.favorite ? ' on' : ''}" data-act="fav" data-id="${v.id}">${v.favorite ? '★' : '☆'}</button>
    </div>
    <p class="desc">${esc(v.desc)}</p>
    <div class="ft"><button class="fold" hidden>展开</button>${action}</div>
  </article>`;
}

function render() {
  const el = $('#list');
  if (!state.items.length) {
    el.innerHTML = `<div class="empty">${state.q || state.fav ? '没找到' : '还没有内容，去「管理」里加'}</div>`;
    return;
  }
  const groups = state.meta.groups.map(g => g.key).filter(k => k !== '全部');
  const buckets = {};
  state.items.forEach(g => {
    const k = g.variants[0].group || '未分类';
    (buckets[k] = buckets[k] || []).push(g);
  });
  const order = [...groups.filter(k => buckets[k]), ...Object.keys(buckets).filter(k => !groups.includes(k))];
  el.innerHTML = order.map(k => `
    <section class="sec" id="sec-${encodeURIComponent(k)}">
      <h2>${esc(k)} <span class="n">${buckets[k].length}</span></h2>
      <div class="grid">${buckets[k].sort(cmp).map(cardHtml).join('')}</div>
    </section>`).join('');
  enhanceDesc();
  markNav();
}

function enhanceDesc() {
  document.querySelectorAll('.desc').forEach(p => {
    if (p.scrollHeight <= p.clientHeight + 2) return;
    const b = p.closest('.card').querySelector('.fold');
    b.hidden = false;
    b.textContent = '展开';
    b.onclick = () => {
      const open = p.classList.toggle('open');
      b.textContent = open ? '收起' : '展开';
    };
  });
}

function renderNav() {
  $('#nav').innerHTML = state.meta.groups.filter(g => g.key !== '全部')
    .map(g => `<a href="#sec-${encodeURIComponent(g.key)}" data-k="${esc(g.key)}">${esc(g.key)}<span class="c">${g.count}</span></a>`).join('');
  $('#brandSub').textContent = `${state.meta.total} 个条目`;
}

function markNav() {
  const secs = [...document.querySelectorAll('.sec')];
  const y = window.scrollY + 120;
  let cur = null;
  secs.forEach(s => { if (s.offsetTop <= y) cur = s; });
  document.querySelectorAll('#nav a').forEach(a => {
    a.classList.toggle('on', !!cur && decodeURIComponent(cur.id.slice(4)) === a.dataset.k);
  });
}

async function load() {
  state.meta = await api('/api/bootstrap');
  renderNav();
  await loadItems();
}

async function loadItems() {
  const p = new URLSearchParams({ group: '全部', tag: '', q: state.q, only_fav: state.fav ? 1 : 0 });
  state.items = await api('/api/plugins?' + p.toString());
  render();
}

$('#q').addEventListener('input', e => {
  clearTimeout(window._qt);
  window._qt = setTimeout(() => { state.q = e.target.value.trim(); loadItems().catch(err => toast(err.message)); }, 220);
});

$('#list').addEventListener('click', async e => {
  const act = e.target.closest('[data-act]');
  if (!act) return;
  const kind = act.dataset.act;
  if (kind === 'fav') {
    try {
      const r = await api(`/api/plugins/${act.dataset.id}/favorite`, { method: 'POST' });
      act.textContent = r.favorite ? '★' : '☆';
      act.classList.toggle('on', r.favorite);
    } catch (err) { toast(err.message); }
    return;
  }
  if (kind === 'copy') {
    try {
      await navigator.clipboard.writeText(act.dataset.url);
      toast('链接已复制');
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = act.dataset.url; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
      toast('链接已复制');
    }
    return;
  }
  if (kind === 'use') {
    api(`/api/plugins/${act.dataset.id}/installed`, { method: 'POST' }).then(() => {
      act.textContent = '已导入';
      act.closest('.card').classList.add('done');
    }).catch(() => {});
    return;
  }
  if (kind === 'view') {
    e.preventDefault();
    try {
      const r = await api(`/api/plugins/${act.dataset.id}/content`);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write('<pre style="white-space:pre-wrap;word-break:break-all;font:12px/1.6 ui-monospace,monospace;padding:16px">' +
          esc(r.text) + '</pre>');
        w.document.title = r.name;
      }
    } catch (err) { toast(err.message); }
  }
});

$('#menuBtn')?.addEventListener('click', () => {
  $('#side').classList.add('on');
  $('#mask').classList.add('on');
});
$('#mask').addEventListener('click', () => {
  $('#side').classList.remove('on');
  $('#mask').classList.remove('on');
});
document.querySelectorAll('#nav a, .sfoot a').forEach(() => {});
$('#nav').addEventListener('click', e => {
  if (e.target.closest('a') && window.innerWidth <= 820) {
    $('#side').classList.remove('on');
    $('#mask').classList.remove('on');
  }
});
window.addEventListener('scroll', markNav, { passive: true });

window.addEventListener('error', e => {
  const b = $('#errbar');
  if (b) { b.style.display = 'block'; b.textContent = 'JS 错误：' + e.message; }
});

load().catch(e => { $('#list').innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`; });
