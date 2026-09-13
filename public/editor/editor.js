/* Private essay workspace. No credentials are embedded in this file. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const essay = $('research');
  let slug = 'ghost-in-kyoto', baseline, published, revision = null, savedAt = null;
  let dirty = false, generation = 0, timer, saving = null, preview = false, loading = false, conflict = false;
  let pendingRecovery = null, activeRegion = null, linkRange = null, panel = null;
  const localKey = () => `molt-essay-draft-v1:${slug}`;
  const date = value => new Date(value).toLocaleString([], {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'});
  const regions = () => Object.fromEntries([...essay.querySelectorAll('[data-region]')].map(el => [el.dataset.region, el.innerHTML]));
  const readLocal = () => { try { return JSON.parse(localStorage.getItem(localKey())); } catch { return null; } };
  const clearLocal = () => { try { localStorage.removeItem(localKey()); } catch { /* Private browsing can disable local storage. */ } };
  function setStatus(text, state = '') { $('save-status').textContent = text; $('save-status').dataset.state = state; $('save').disabled = !dirty || loading || Boolean(saving) || conflict; }
  function notice(text) { $('editor-notice').textContent = text; $('editor-notice').hidden = !text; }
  function stash() {
    if (!baseline) return;
    try { localStorage.setItem(localKey(), JSON.stringify({version:baseline.version, revision, regions:regions(), at:Date.now()})); }
    catch { notice('This browser cannot keep a recovery copy. Keep this page open until the draft has saved.'); }
  }
  async function api(path, body, method = body ? 'POST' : 'GET') {
    const response = await fetch(path, {method, cache:'no-store', credentials:'same-origin', headers: body ? {'Content-Type':'application/json'} : {}, ...(body ? {body:JSON.stringify(body)} : {})});
    const result = await response.json().catch(() => ({error:'The server did not respond. Please try again.'}));
    if (!response.ok) { const error = new Error(result.error); error.status = response.status; throw error; }
    return result;
  }
  function setEditable() {
    essay.querySelectorAll('[data-region]').forEach((el, i) => {
      el.contentEditable = String(!preview && !loading && !pendingRecovery);
      el.spellcheck = true;
      el.setAttribute('role', 'textbox');
      el.setAttribute('aria-multiline', 'true');
      el.setAttribute('aria-label', `Essay text, section ${i + 1}`);
    });
    document.querySelectorAll('.format-tools button').forEach(b => b.disabled = preview || loading || Boolean(pendingRecovery));
    document.querySelectorAll('.document-tools button').forEach(b => b.disabled = loading || !baseline);
  }
  function applyRegions(values) {
    essay.querySelectorAll('[data-region]').forEach(el => { if (typeof values[el.dataset.region] === 'string') el.innerHTML = values[el.dataset.region]; });
  }
  function changed() {
    if (pendingRecovery || loading || preview) return;
    dirty = true; generation++; stash(); setStatus('Unsaved changes');
    clearTimeout(timer); timer = setTimeout(() => save().catch(() => {}), 1800);
  }
  async function save() {
    clearTimeout(timer);
    if (saving) { await saving; if (dirty) return save(); return; }
    if (!dirty || !baseline || pendingRecovery) return;
    if (conflict) throw new Error('Resolve the newer draft before saving.');
    const atGeneration = generation;
    const payload = {version:baseline.version, revision, regions:regions()};
    setStatus('Saving…');
    const job = api(`/api/essay-drafts?slug=${slug}`, payload);
    saving = job; $('save').disabled = true;
    try {
      const result = await job;
      revision = result.id; savedAt = result.updatedAt;
      if (generation === atGeneration) { dirty = false; clearLocal(); }
      else stash();
      notice('');
    } catch (error) {
      conflict = error.status === 409;
      stash(); notice(error.status === 401 ? 'Your editor session expired. Open your private access link in another tab, then return here and save.' : error.message || 'You are offline. Your unsaved text is kept in this browser; retry when connected.');
      setStatus('Not saved — text kept here', 'error');
      throw error;
    } finally { saving = null; $('save').disabled = !dirty || conflict; }
    setStatus(dirty ? 'Unsaved changes' : `Saved ${date(savedAt)}`, dirty ? '' : 'saved');
    if (dirty) timer = setTimeout(() => save().catch(() => {}), 800);
    if (panel === 'changes') showChanges();
  }
  function closePanel() {
    panel = null; $('review-panel').hidden = true;
    $('changes').setAttribute('aria-expanded', 'false'); $('history').setAttribute('aria-expanded', 'false');
  }
  async function load(next) {
    loading = true; setEditable(); $('essay-select').disabled = true; setStatus('Loading…');
    try {
      const data = await api(`/api/essay-drafts?slug=${next}`);
      slug = next; published = data.published; baseline = data.draft?.baseline || published;
      revision = data.draft?.id || null; savedAt = data.draft?.updatedAt || null;
      essay.innerHTML = baseline.template;
      if (data.draft) applyRegions(data.draft.regions);
      dirty = false; conflict = false; generation = 0; activeRegion = null;
      $('essay-select').value = slug;
      $('published-link').href = `/#/findings/${slug}`;
      const url = new URL(location.href); url.searchParams.set('essay', slug); history.replaceState(null, '', url);
      document.title = `Edit ${baseline.title} · Machines of Loving Taste`;
      const local = readLocal();
      pendingRecovery = local && JSON.stringify(local.regions) !== JSON.stringify(regions()) ? local : null;
      $('recovery').hidden = !pendingRecovery;
      notice(baseline.version !== published.version ? 'The published essay has changed since this draft began. This draft keeps your original text and figures so we can review the differences together.' : '');
      closePanel(); setStatus(savedAt ? `Saved ${date(savedAt)}` : 'Published version · no draft yet', savedAt ? 'saved' : '');
      essay.setAttribute('aria-busy', 'false');
    } catch (error) { notice(error.message); setStatus('Could not load essay', 'error'); $('essay-select').value = slug; }
    finally { loading = false; setEditable(); $('essay-select').disabled = false; }
  }
  function plain(html) {
    const div = document.createElement('div'); div.innerHTML = html;
    div.querySelectorAll('p,div,h1,h2,h3,li,blockquote').forEach(el => el.append('\n\n'));
    div.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
    return div.textContent.replace(/\n{3,}/g, '\n\n').trim();
  }
  function element(tag, text, className) { const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; return el; }
  function openPanel(name, title) {
    panel = name; const el = $('review-panel'); el.replaceChildren(element('h2', title)); el.hidden = false;
    $('changes').setAttribute('aria-expanded', String(name === 'changes')); $('history').setAttribute('aria-expanded', String(name === 'history'));
    return el;
  }
  function showChanges() {
    const el = openPanel('changes', 'Your changes');
    const values = regions(); let count = 0;
    for (const id of Object.keys(baseline.regions)) {
      if (values[id] === baseline.regions[id]) continue;
      count++;
      const pair = element('div', '', 'change-pair');
      for (const [label, html] of [['Published when you began', baseline.regions[id]], ['Your draft', values[id]]]) {
        const col = element('div', ''); col.append(element('span', label, 'change-label'), element('p', plain(html) || '(Text removed)')); pair.append(col);
      }
      el.append(pair);
    }
    if (!count) el.append(element('p', 'No changes from the published version you started with.'));
    else el.insertBefore(element('p', `${count} text section${count === 1 ? '' : 's'} changed. These drafts are available for us to review together.`), el.children[1]);
  }
  async function showHistory() {
    const el = openPanel('history', 'Previous saves');
    el.append(element('p', 'Loading…'));
    try {
      const result = await api(`/api/essay-drafts?slug=${slug}&history=1`);
      if (panel !== 'history') return;
      el.lastChild.remove();
      if (!result.history.length) el.append(element('p', 'Earlier versions will appear here as you save changes.'));
      for (const item of result.history) {
        const row = element('div', '', 'history-row');
        const stamp = item.key.split('_')[0].replace(/T(\d+)-(\d+)-(\d+)-(\d+)Z$/, 'T$1:$2:$3.$4Z');
        row.append(element('span', date(stamp)));
        const button = element('button', 'Review'); button.type = 'button'; row.append(button); el.append(row);
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const {draft} = await api(`/api/essay-drafts?slug=${slug}&revision=${encodeURIComponent(item.key)}`);
            if (panel !== 'history') return;
            el.querySelector('.history-detail')?.remove();
            const detail = element('div', '', 'history-detail');
            detail.append(element('h3', `Saved ${date(draft.updatedAt)}`), element('div', Object.values(draft.regions).map(plain).join('\n\n'), 'history-preview'));
            const restore = element('button', 'Use this version'); restore.type = 'button';
            restore.disabled = draft.baseline.version !== baseline.version || Boolean(pendingRecovery) || loading;
            restore.addEventListener('click', () => { applyRegions(draft.regions); if (preview) $('preview').click(); changed(); closePanel(); notice('Previous text restored. It will save as a new draft, keeping the current version in history.'); });
            detail.append(restore); el.append(detail);
          } catch (error) { notice(error.message); }
          finally { button.disabled = false; }
        });
      }
    } catch (error) { el.lastChild.textContent = error.message; }
  }
  async function enterWorkspace() {
    $('unlock').hidden = true; $('workspace').hidden = false; $('lock').hidden = false;
    const chosen = new URL(location.href).searchParams.get('essay');
    await load(['ghost-in-kyoto','shared-canon'].includes(chosen) ? chosen : slug);
  }
  $('unlock-form').addEventListener('submit', async event => {
    event.preventDefault(); $('unlock-status').textContent = 'Opening…';
    try { await api('/api/editor-session', {key:$('editor-key').value.trim()}); $('editor-key').value = ''; await enterWorkspace(); }
    catch (error) { $('unlock-status').textContent = error.message; }
  });
  $('save').addEventListener('click', () => save().catch(() => {}));
  $('essay-select').addEventListener('change', async event => {
    const next = event.target.value;
    $('essay-select').disabled = true;
    try { await save(); if (pendingRecovery) throw new Error('Choose whether to restore your unsaved text before switching essays.'); await load(next); window.scrollTo({top:0, behavior:'instant'}); }
    catch (error) { $('essay-select').value = slug; notice(error.message); }
    finally { $('essay-select').disabled = false; }
  });
  essay.addEventListener('input', changed);
  essay.addEventListener('focusin', event => { activeRegion = event.target.closest('[data-region]'); });
  essay.addEventListener('paste', event => {
    if (!event.target.closest('[contenteditable="true"]')) return;
    event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
  });
  essay.addEventListener('click', event => { if (!preview && event.target.closest('[data-region] a')) event.preventDefault(); });
  document.querySelectorAll('[data-command],[data-block]').forEach(button => {
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => {
      if (!activeRegion || !essay.contains(activeRegion)) return;
      activeRegion.focus();
      if (button.dataset.command) document.execCommand(button.dataset.command);
      else {
        document.execCommand('formatBlock', false, button.dataset.block);
        const node = window.getSelection()?.anchorNode;
        const block = (node?.nodeType === 1 ? node : node?.parentElement)?.closest('p,h1,h2,h3');
        if (block && activeRegion.contains(block)) block.className = button.dataset.block === 'p' ? 'rs-p' : 'rs-crosshead';
      }
      changed();
    });
  });
  $('add-link').addEventListener('mousedown', event => event.preventDefault());
  $('add-link').addEventListener('click', () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !activeRegion?.contains(selection.anchorNode)) { notice('Select the words you want to link first.'); return; }
    linkRange = selection.getRangeAt(0).cloneRange(); $('link-url').value = ''; $('link-dialog').showModal();
  });
  $('link-dialog').addEventListener('close', () => {
    if ($('link-dialog').returnValue !== 'save' || !linkRange) return;
    const url = $('link-url').value.trim();
    if (!/^https?:\/\//i.test(url)) { notice('Use a web address beginning with https:// or http://.'); return; }
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(linkRange);
    document.execCommand('createLink', false, url); changed(); linkRange = null;
  });
  $('preview').addEventListener('click', () => { preview = !preview; document.body.classList.toggle('is-preview', preview); $('preview').textContent = preview ? 'Keep editing' : 'Preview'; $('preview').setAttribute('aria-pressed', String(preview)); setEditable(); });
  $('changes').addEventListener('click', () => { if (panel === 'changes') closePanel(); else showChanges(); });
  $('history').addEventListener('click', () => { if (panel === 'history') closePanel(); else showHistory(); });
  $('recover').addEventListener('click', () => {
    if (!pendingRecovery) return;
    if (pendingRecovery.version !== baseline.version) { notice('This recovery copy belongs to an older edition. Keep this page open and ask me to recover it before discarding it.'); return; }
    const recovered = pendingRecovery; pendingRecovery = null; $('recovery').hidden = true;
    applyRegions(recovered.regions); if (preview) $('preview').click(); setEditable(); changed();
    if (recovered.revision !== revision) notice('Recovered text will save as a new draft. The previous saved text will remain in History.');
  });
  $('discard-recovery').addEventListener('click', () => { pendingRecovery = null; clearLocal(); $('recovery').hidden = true; setEditable(); });
  $('download').addEventListener('click', () => {
    if (!baseline) return;
    const clone = essay.cloneNode(true); clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Essay draft</title><base href="https://machinesoflovingtaste.com/"><link rel="stylesheet" href="/editor/site.css"><link rel="stylesheet" href="/editor/editor.css"></head><body class="editor-page"><main class="editor-main">' + clone.outerHTML + '</main></body></html>';
    const url = URL.createObjectURL(new Blob([html], {type:'text/html'}));
    const a = document.createElement('a'); a.href = url; a.download = `${slug}-draft.html`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('lock').addEventListener('click', async () => {
    try { await save(); if (pendingRecovery) { notice('Resolve the unsaved recovery copy before locking.'); return; } await api('/api/editor-session', {}, 'DELETE'); $('workspace').hidden = true; $('unlock').hidden = false; $('lock').hidden = true; $('unlock-status').textContent = 'The editor is locked. Your saved drafts are safe.'; essay.replaceChildren(); baseline = null; }
    catch (error) { notice(error.message); }
  });
  window.addEventListener('beforeunload', event => { if (dirty || saving) { stash(); event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('pagehide', () => { if (dirty) stash(); });
  window.addEventListener('online', () => { if (dirty && !conflict) save().catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty) save().catch(() => {}); });
  document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && baseline) { event.preventDefault(); save().catch(() => {}); } });
  async function init() {
    const secret = new URLSearchParams(location.hash.slice(1)).get('key');
    if (secret) history.replaceState(null, '', location.pathname + location.search);
    try {
      const session = secret ? await api('/api/editor-session', {key:secret}) : await api('/api/editor-session');
      if (session.authenticated) await enterWorkspace();
    } catch (error) { $('unlock-status').textContent = error.message; }
  }
  init();
})();
