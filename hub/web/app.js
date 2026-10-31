const state = { group: '全部', tag: '', q: '', list: [], meta: null, editing: null, sel: {}, sort: 'az' };
const $ = s => document.querySelector(s);
const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const GH = '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('on'), 2200);
}

async function api(path, opt = {}) {
  opt.headers = Object.assign({ 'Content-Type': 'application/json' }, opt.headers || {});
  const tk = localStorage.getItem('egern_token');
  if (tk) opt.headers['x-auth-token'] = tk;
  let r = await fetch(path, opt);
  if (r.status === 401) {
    const v = prompt('输入管理口令');
    if (v) { localStorage.setItem('egern_token', v); return api(path, opt); }
    throw new Error('未授权');
  }
  if (!r.ok) {
    let detail = 'HTTP ' + r.status;
    try { detail = (await r.json()).detail || detail; } catch (e) {}
    throw new Error(detail);
  }
  return r.json();
}

function egernLink(v) {
  return 'egern:/modules/new?name=' + encodeURIComponent(v.name) + '&url=' + encodeURIComponent(v.url);
}

function variantOf(g) {
  const i = state.sel[g.key] || 0;
  return g.variants[Math.min(i, g.variants.length - 1)];
}

function cardHtml(g) {
  const v = variantOf(g);
  const vers = g.variants.length > 1
    ? `<div class="vers">${g.variants.map((x, i) =>
        `<button class="ver${i === (state.sel[g.key] || 0) ? ' on' : ''}" data-v="${i}">${esc(x.group)}</button>`).join('')}</div>`
    : '';
  return `<article class="card${v.installed ? ' done' : ''}" data-key="${esc(g.key)}">
    <div class="hd">
      <h2>${esc(v.name)}</h2>
      ${g.unread ? '<span class="dot" title="已更新"></span>' : ''}
      <button class="star${v.favorite ? ' on' : ''}" data-act="fav" data-id="${v.id}">${v.favorite ? '★' : '☆'}</button>
    </div>
    ${vers}
    <p class="desc">${esc(v.desc)}</p>
    <div class="ft">
      ${v.is_self ? '<button class="more-btn" data-act="edit" data-id="' + v.id + '" title="编辑">⋯</button>' : ''}
      <a class="go" href="${egernLink(v)}" data-act="use" data-id="${v.id}">${v.installed ? '已导入' : '导入'}</a>
    </div>
  </article>`;
}

function enhanceDesc(root) {
  root.querySelectorAll('.desc').forEach(p => {
    if (p.scrollHeight <= p.clientHeight + 2) return;
    const b = document.createElement('button');
    b.className = 'fold'; b.textContent = '展开';
    b.addEventListener('click', e => {
      e.stopPropagation();
      const open = p.classList.toggle('open');
      b.textContent = open ? '收起' : '展开';
    });
    const ft = p.closest('.card').querySelector('.ft');
    if (ft) ft.insertAdjacentElement('afterbegin', b);
    else p.insertAdjacentElement('afterend', b);
  });
}

function renderList() {
  const el = $('#list');
  if (!state.list.length) {
    const empty = (!state.q && !state.tag && state.group === '全部' && !(state.meta && state.meta.total))
      ? '还没有插件，点右上角 ＋ 添加' : '没找到，换个词试试';
    el.innerHTML = `<div class="empty">${empty}</div>`;
    return;
  }
  el.innerHTML = sorted(state.list).map(cardHtml).join('');
  enhanceDesc(el);
}

function renderTabs() {
  const label = k => k === 'Official' ? '官方' : k;
  $('#tabs').innerHTML = (state.meta.groups || []).map(g =>
    `<button class="tab${g.key === state.group ? ' on' : ''}" data-g="${esc(g.key)}">${esc(label(g.key))}<span class="n">${g.count}</span></button>`
  ).join('');
}

const sortKey = s => (s || '').replace(/^[\s\u200d\ufe0f\p{Emoji}\p{S}\p{P}]+/u, '');

function sorted(list) {
  const cmp = (a, b) => sortKey(a.name).localeCompare(sortKey(b.name), 'zh-Hans-CN', { numeric: true });
  if (state.sort === 'az') return [...list].sort(cmp);
  if (state.sort === 'za') return [...list].sort((a, b) => cmp(b, a));
  return list;
}

async function loadMeta() {
  state.meta = await api('/api/bootstrap');
  const s = state.meta.sync_enabled
    ? (state.meta.last_sync ? `上次同步 ${state.meta.last_sync.slice(5, 16)}` : '尚未同步')
    : '手动维护';
  $('#sub').textContent = `${state.meta.total} 个插件 · ${s}` + (state.meta.unread ? ` · ${state.meta.unread} 个有更新` : '');
  $('#syncBtn').style.display = state.meta.sync_enabled ? '' : 'none';
  renderTabs();
}

async function loadList() {
  const p = new URLSearchParams({ group: state.group, tag: state.tag, q: state.q });
  state.list = await api('/api/plugins?' + p.toString());
  renderList();
}

async function refresh() { await loadMeta(); await loadList(); }

$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('.tab'); if (!b) return;
  state.group = b.dataset.g; loadMeta().then(loadList).catch(err => toast(err.message));
});
let qt;
$('#q').addEventListener('input', e => {
  clearTimeout(qt);
  qt = setTimeout(() => { state.q = e.target.value.trim(); loadList().catch(err => toast(err.message)); }, 220);
});

$('#list').addEventListener('click', async e => {
  const card = e.target.closest('.card'); if (!card) return;
  const g = state.list.find(x => x.key === card.dataset.key);
  if (!g) return;

  const verBtn = e.target.closest('.ver');
  if (verBtn) {
    state.sel[g.key] = Number(verBtn.dataset.v);
    const tmp = document.createElement('div');
    tmp.innerHTML = cardHtml(g);
    const fresh = tmp.firstElementChild;
    card.replaceWith(fresh);
    enhanceDesc(fresh);
    return;
  }

  const act = e.target.closest('[data-act]');
  if (!act) return;
  const id = act.dataset.id;
  let v0 = null;

  if (act.dataset.act === 'fav') {
    e.preventDefault();
    try {
      const r = await api(`/api/plugins/${id}/favorite`, { method: 'POST' });
      act.textContent = r.favorite ? '★' : '☆';
      act.classList.toggle('on', r.favorite);
      const v = g.variants.find(x => String(x.id) === id);
      if (v) v.favorite = r.favorite;
      g.favorite = g.variants.some(x => x.favorite);
      loadList().catch(() => {});
    } catch (err) { toast(err.message); }
    return;
  }
  if (act.dataset.act === 'edit') {
    e.preventDefault();
    openForm(g.variants.find(x => String(x.id) === id)); return;
  }
  if (act.dataset.act === 'use') {
    if (v0 = g.variants.find(x => String(x.id) === id), v0 && (v0.args || []).length) {
      e.preventDefault();
      openArgs(g, v0);
      return;
    }
    api(`/api/plugins/${id}/installed`, { method: 'POST' }).then(() => {
      act.textContent = '已导入';
      card.classList.add('done');
      const v = g.variants.find(x => String(x.id) === id);
      if (v) { v.installed = true; v.unread = false; }
      g.installed = g.variants.some(x => x.installed);
      const dot = card.querySelector('.dot'); if (dot) dot.remove();
    }).catch(() => {});
  }
});

$('#syncBtn').addEventListener('click', async () => {
  const btn = $('#syncBtn');
  btn.classList.add('spin');
  try {
    const r = await api('/api/sync', { method: 'POST' });
    toast(`同步完成：新增 ${r.added}，更新 ${r.updated}`);
    await refresh();
  } catch (e) { toast(e.message); }
  btn.classList.remove('spin');
});

function openForm(it) {
  state.editing = it || null;
  $('#sheetTitle').textContent = it ? '编辑插件' : '添加插件';
  $('#f-name').value = it ? it.name : '';
  $('#f-desc').value = it ? it.desc : '';
  $('#f-url').value = it ? it.url : '';
  $('#f-author').value = it ? it.author : '';
  $('#f-author_url').value = it ? it.author_url : '';
  $('#f-repo_url').value = it ? it.repo_url : '';
  $('#probeHint').textContent = '读取后自动填名称、说明、作者、仓库';
  $('#f-group').value = it ? (it.group || '') : '';
  state.formTags = new Set((state.meta && state.meta.groups ? state.meta.groups.map(g => g.key) : []).filter(k => k !== '全部'));
  renderTagPick();
  $('#delBtn').style.display = it ? 'block' : 'none';
  $('#mask').classList.add('on');
  $('#sheet').classList.add('on');
  $('#bar').classList.add('on');
}

function renderTagPick() {
  const cur = $('#f-group').value.trim();
  const set = ['去广告', '工具', '订阅', ...state.formTags];
  const uniq = [...new Set(set.filter(Boolean))];
  $('#tagPick').innerHTML = uniq.map(t =>
    `<button class="tag${cur === t ? ' on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('');
}

function closeForm() {
  $('#mask').classList.remove('on');
  $('#sheet').classList.remove('on');
  $('#bar').classList.remove('on');
  state.editing = null;
}

$('#addBtn').addEventListener('click', () => openForm(null));
$('#closeBtn').addEventListener('click', closeForm);
$('#mask').addEventListener('click', closeForm);
$('#tagPick').addEventListener('click', e => {
  const b = e.target.closest('.tag'); if (!b) return;
  $('#f-group').value = b.dataset.t;
  renderTagPick();
});
$('#f-group').addEventListener('input', renderTagPick);

$('#probeBtn').addEventListener('click', async () => {
  const url = $('#f-url').value.trim();
  if (!url) { toast('先填模块地址'); return; }
  $('#probeHint').textContent = '读取中…';
  try {
    const m = await api('/api/fetch-meta', { method: 'POST', body: JSON.stringify({ url }) });
    if (m.name) $('#f-name').value = m.name;
    if (m.desc) $('#f-desc').value = m.desc;
    if (m.author) $('#f-author').value = m.author;
    if (m.author_url) $('#f-author_url').value = m.author_url;
    if (m.repo_url) $('#f-repo_url').value = m.repo_url;
    $('#probeHint').textContent = '已识别' + (m.has_script ? '（含脚本）' : '');
  } catch (e) {
    $('#probeHint').textContent = '读取失败：' + e.message;
  }
});

$('#saveBtn').addEventListener('click', async () => {
  const body = {
    name: $('#f-name').value.trim(),
    desc: $('#f-desc').value.trim(),
    url: $('#f-url').value.trim(),
    author: $('#f-author').value.trim(),
    author_url: $('#f-author_url').value.trim(),
    repo_url: $('#f-repo_url').value.trim(),
    group: $('#f-group').value.trim() || '自用',
    tags: '',
  };
  if (!body.name || !body.url) { toast('名称和模块地址必填'); return; }
  try {
    if (state.editing) await api('/api/plugins/' + state.editing.id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/plugins', { method: 'POST', body: JSON.stringify(body) });
    closeForm(); toast('已保存'); await refresh();
  } catch (e) { toast(e.message); }
});

$('#delBtn').addEventListener('click', async () => {
  if (!state.editing) return;
  if (!confirm('删除「' + state.editing.name + '」？')) return;
  try {
    await api('/api/plugins/' + state.editing.id, { method: 'DELETE' });
    closeForm(); toast('已删除'); await refresh();
  } catch (e) { toast(e.message); }
});

refresh().catch(e => { $('#sub').textContent = '加载失败：' + e.message; });

// ---- 参数自定义 ----
let argTarget = null, argGroup = null;

function openArgs(g, v) {
  argTarget = v; argGroup = g;
  const items = v.args || [];
  const body = $('#argBody');
  const parts = [`<p class="arg-note">${esc(v.name)} · 这些参数 Surge 会做成设置页，Egern 不认。改完点「应用并导入」，会生成一份改好参数的模块给你。</p>`];
  items.forEach(a => {
    if (a.v === '--' || !a.v) {
      parts.push(`<div class="arg-title">${esc(a.k)}</div>`);
      return;
    }
    parts.push(`<label class="arg-in"><span>${esc(a.k)}</span><input data-k="${esc(a.k)}" value="${esc(a.v)}" autocapitalize="off" autocorrect="off" spellcheck="false"></label>`);
  });
  if (items.length <= 1) parts.push('<p class="arg-note">这个模块没有可调项。</p>');
  body.innerHTML = parts.join('');
  $('#mask2').classList.add('on');
  $('#argSheet').classList.add('on');
  $('#argBar').classList.add('on');
}

function closeArgs() {
  $('#mask2').classList.remove('on');
  $('#argSheet').classList.remove('on');
  $('#argBar').classList.remove('on');
  argTarget = null;
}

function markUsed(id) {
  api(`/api/plugins/${'$'}{id}/installed`, { method: 'POST' }).catch(() => {});
}

$('#argClose').addEventListener('click', closeArgs);
$('#mask2').addEventListener('click', closeArgs);

$('#argDefault').addEventListener('click', () => {
  if (!argTarget) return;
  const url = 'egern:/modules/new?name=' + encodeURIComponent(argTarget.name) + '&url=' + encodeURIComponent(argTarget.url);
  api(`/api/plugins/${argTarget.id}/installed`, { method: 'POST' }).catch(() => {});
  closeArgs();
  window.location.href = url;
});

$('#argApply').addEventListener('click', async () => {
  if (!argTarget) return;
  const values = {};
  document.querySelectorAll('#argBody input[data-k]').forEach(i => { values[i.dataset.k] = i.value; });
  try {
    const r = await api(`/api/plugins/${argTarget.id}/customize`, { method: 'POST', body: JSON.stringify({ values }) });
    const abs = location.origin + r.url;
    const url = 'egern:/modules/new?name=' + encodeURIComponent(r.name) + '&url=' + encodeURIComponent(abs);
    api(`/api/plugins/${argTarget.id}/installed`, { method: 'POST' }).catch(() => {});
    closeArgs();
    window.location.href = url;
  } catch (e) { toast(e.message); }
});
