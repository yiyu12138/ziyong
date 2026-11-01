const $ = s => document.querySelector(s);
const API = p => p.replace(/^\//, '');
let items = [], editing = null;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('on'), 2200);
}

async function req(path, opt = {}) {
  opt.headers = Object.assign({ 'Content-Type': 'application/json' }, opt.headers || {});
  const r = await fetch(API(path), opt);
  if (!r.ok) {
    let d = 'HTTP ' + r.status;
    try { d = (await r.json()).detail || d; } catch (e) {}
    throw new Error(d);
  }
  return r.json();
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function render() {
  const groups = {};
  items.forEach(it => { (groups[it.grp] = groups[it.grp] || []).push(it); });
  const html = Object.keys(groups).sort().map(g => `
    <div style="font-size:11.5px;color:#82828a;margin:14px 4px 2px;letter-spacing:.3px">${esc(g)} · ${groups[g].length}</div>
    ${groups[g].map(it => `
      <div class="item" data-id="${it.id}">
        ${it.icon && /^https?:/.test(it.icon)
          ? `<img src="${esc(it.icon)}" onerror="this.style.display='none'">`
          : `<span class="ph">${esc((it.name || '?').slice(0, 1))}</span>`}
        <div class="info">
          <div class="n">${esc(it.name)}${it.dirty ? '<span class="tagp dirty">待发布</span>' : ''}${it.deleted ? '<span class="tagp del">待删除</span>' : ''}</div>
          <div class="m">${esc(it.slug || (it.source_path || '').split('/').pop() || '-')}</div>
        </div>
      </div>`).join('')}
  `).join('');
  $('#list').innerHTML = html || '<p class="hint">还没有内容，点右上角 ＋ 新建</p>';
}

async function load() {
  items = await req('/api/admin/items');
  render();
  const dirty = items.filter(i => i.dirty || i.deleted).length;
  $('#publishBtn').textContent = dirty ? `发布 (${dirty})` : '发布';
  $('#publishBtn').disabled = !dirty;
}

function openSheet(it) {
  editing = it;
  $('#sheetTitle').textContent = it && it.id ? '编辑条目' : '新建条目';
  $('#f-name').value = it ? it.name || '' : '';
  $('#f-desc').value = it ? it.desc || '' : '';
  $('#f-group').value = it ? it.group || '' : 'Egern 插件';
  $('#f-slug').value = it ? it.slug || '' : '';
  $('#f-icon').value = it ? it.icon || '' : '';
  $('#f-body').value = it ? it.body || '' : '';
  $('#delBtn').style.display = it && it.id ? 'block' : 'none';
  $('#sheet').classList.add('on');
  $('#bar').classList.add('on');
}

function closeSheet() {
  $('#sheet').classList.remove('on');
  $('#bar').classList.remove('on');
  editing = null;
}

$('#list').addEventListener('click', async e => {
  const row = e.target.closest('.item');
  if (!row) return;
  try {
    const full = await req('/api/admin/items/' + row.dataset.id);
    openSheet({
      id: full.id, name: full.name, desc: full.description, group: full.grp,
      slug: full.slug, icon: full.icon, body: full.body || '',
    });
  } catch (err) { toast(err.message); }
});

$('#newBtn').addEventListener('click', () => openSheet(null));
$('#closeBtn').addEventListener('click', closeSheet);
$('#toSite').addEventListener('click', () => { location.href = './'; });

$('#saveBtn').addEventListener('click', async () => {
  const body = {
    name: $('#f-name').value.trim(),
    desc: $('#f-desc').value.trim(),
    group: $('#f-group').value.trim(),
    slug: $('#f-slug').value.trim(),
    icon: $('#f-icon').value.trim(),
    body: $('#f-body').value,
  };
  if (!body.name) { toast('名称必填'); return; }
  try {
    if (editing && editing.id) await req('/api/admin/items/' + editing.id, { method: 'PUT', body: JSON.stringify(body) });
    else await req('/api/admin/items', { method: 'POST', body: JSON.stringify(body) });
    closeSheet();
    toast('已保存，记得点发布');
    await load();
  } catch (e) { toast(e.message); }
});

$('#delBtn').addEventListener('click', async () => {
  if (!editing || !editing.id) return;
  if (!confirm('删除「' + editing.name + '」？发布后会同步删掉仓库里的文件')) return;
  try {
    await req('/api/admin/items/' + editing.id, { method: 'DELETE' });
    closeSheet();
    toast('已标记删除');
    await load();
  } catch (e) { toast(e.message); }
});

$('#publishBtn').addEventListener('click', async () => {
  const btn = $('#publishBtn');
  btn.disabled = true;
  btn.textContent = '发布中…';
  try {
    const r = await req('/api/publish', { method: 'POST' });
    toast(r.published ? `已提交 ${r.published} 个文件` : r.message || '没有改动');
    await load();
  } catch (e) {
    toast(e.message);
    btn.disabled = false;
  }
  btn.textContent = '发布';
});

load().catch(e => { $('#list').innerHTML = '<p class="hint">加载失败：' + esc(e.message) + '</p>'; });


// ---- 分类管理 ----
let cats = [];

async function loadCats() {
  cats = await req('/api/categories');
  document.getElementById('catList').innerHTML = cats.map(c => `
    <div class="item" data-name="${esc(c.name)}">
      <div class="info">
        <div class="n">${esc(c.name)}</div>
        <div class="m">${esc(c.dir || '未绑定目录')} · ${c.n} 个 · ${c.kind}</div>
      </div>
      <button class="btn" data-act="edit" style="padding:6px 10px;font-size:12px">改</button>
      <button class="btn" data-act="del" style="padding:6px 10px;font-size:12px;color:#d1403a">删</button>
    </div>`).join('') || '<p class="hint">还没有分类</p>';
}

document.getElementById('catBtn').addEventListener('click', async () => {
  try { await loadCats(); } catch (e) { toast(e.message); }
  document.getElementById('catSheet').classList.add('on');
});
document.getElementById('catClose').addEventListener('click', () => {
  document.getElementById('catSheet').classList.remove('on');
});

document.getElementById('catList').addEventListener('click', async e => {
  const btn = e.target.closest('[data-act]');
  const row = e.target.closest('.item');
  if (!btn || !row) return;
  const name = row.dataset.name;
  if (btn.dataset.act === 'edit') {
    const dir = prompt('仓库目录（相对仓库根，如 egern/ 或 egern/rules/）', cats.find(c => c.name === name)?.dir || '');
    if (dir === null) return;
    const newName = prompt('分类名称', name);
    if (!newName) return;
    try {
      await req('/api/categories/' + encodeURIComponent(name), {
        method: 'PUT', body: JSON.stringify({ name: newName, dir, kind: cats.find(c => c.name === name)?.kind || 'module' }),
      });
      await loadCats(); toast('已保存');
    } catch (err) { toast(err.message); }
    return;
  }
  if (btn.dataset.act === 'del') {
    if (!confirm('删除分类「' + name + '」?')) return;
    try {
      await req('/api/categories/' + encodeURIComponent(name), { method: 'DELETE' });
      await loadCats();
    } catch (err) { toast(err.message); }
  }
});

document.getElementById('catAdd').addEventListener('click', async () => {
  const name = prompt('分类名称，比如 Egern 插件 / 分流规则 / 某某订阅');
  if (!name) return;
  const dir = prompt('绑定仓库目录（可留空，如 egern/）', '');
  if (dir === null) return;
  try {
    await req('/api/categories', { method: 'POST', body: JSON.stringify({ name, dir, kind: 'module' }) });
    await loadCats();
  } catch (err) { toast(err.message); }
});
