(() => {
  'use strict';

  const APP_KEY = 'riftbound-vault-v2';
  const $ = id => document.getElementById(id);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const norm = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  let draft = null;
  let renderQueued = false;
  let loanListObserver = null;

  function baseState() {
    return {inventory:{},decks:[],loans:[],transactions:[]};
  }
  function readState() {
    try { return {...baseState(), ...JSON.parse(localStorage.getItem(APP_KEY) || '{}')}; }
    catch { return baseState(); }
  }
  function saveState(state) {
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    window.RiftboundApp?.reloadState?.();
    scheduleRender();
  }
  function catalog() { return window.RiftboundApp?.getCatalog?.() || []; }
  function byCode(code) { return window.RiftboundApp?.getCard?.(code) || catalog().find(card => card.cardCode === code); }
  function cardName(code) { const card = byCode(code); return card?.fullName || card?.name || code || 'Unknown card'; }
  function groupKey(loan) { return loan.groupId || loan.id; }
  function active(loan) { return !loan.returnedAt && Number(loan.qty || 0) > 0; }

  function groups(state = readState()) {
    const map = new Map();
    for (const loan of state.loans || []) {
      const key = groupKey(loan);
      if (!map.has(key)) map.set(key, {id:key, records:[]});
      map.get(key).records.push(loan);
    }
    return [...map.values()].map(group => {
      const records = group.records;
      const activeRecords = records.filter(active);
      const latest = records.slice().sort((a,b) => String(b.borrowedAt || '').localeCompare(String(a.borrowedAt || '')))[0] || {};
      const borrower = activeRecords[0]?.borrower || latest.borrower || 'Unknown';
      const notes = activeRecords[0]?.notes ?? latest.notes ?? '';
      const borrowedAt = records.map(x => x.borrowedAt).filter(Boolean).sort()[0] || new Date().toISOString();
      const returnedAt = activeRecords.length ? null : records.map(x => x.returnedAt).filter(Boolean).sort().at(-1) || null;
      const items = new Map();
      for (const record of activeRecords) items.set(record.cardCode, (items.get(record.cardCode) || 0) + Number(record.qty || 0));
      return {...group, borrower, notes, borrowedAt, returnedAt, activeRecords, items};
    }).sort((a,b) => String(b.borrowedAt).localeCompare(String(a.borrowedAt)));
  }

  function groupItemHtml(group) {
    const entries = [...group.items.entries()];
    const copies = entries.reduce((sum,[,qty]) => sum + Number(qty || 0), 0);
    const when = new Date(group.borrowedAt || Date.now()).toLocaleDateString();
    const returned = !entries.length;
    const itemLines = entries.length
      ? entries.map(([code,qty]) => `<li><span>${esc(cardName(code))}</span><strong>×${qty}</strong></li>`).join('')
      : '<li class="loan-group-returned-copy">All cards returned</li>';
    return `<article class="list-card loan-group-card" data-loan-group-ui data-loan-group-id="${esc(group.id)}">
      <div class="loan-group-main">
        <div class="loan-group-heading"><div><h3>${esc(group.borrower)}</h3><p>${returned ? 'Returned' : `${entries.length} card type${entries.length === 1 ? '' : 's'} • ${copies} cop${copies === 1 ? 'y' : 'ies'}`} • ${esc(when)}</p></div>${returned ? '<span class="status-pill">Returned</span>' : ''}</div>
        <ul class="loan-group-items">${itemLines}</ul>
        ${group.notes ? `<p class="loan-group-notes">${esc(group.notes)}</p>` : ''}
      </div>
      <div class="feature-card-actions loan-group-actions">
        <button class="ghost-btn" type="button" data-edit-loan-group="${esc(group.id)}">Edit</button>
        ${returned ? '' : `<button class="primary-btn" type="button" data-return-loan-group="${esc(group.id)}">Return All</button>`}
        <button class="danger-btn" type="button" data-delete-loan-group="${esc(group.id)}">Delete</button>
      </div>
    </article>`;
  }

  function renderLoanGroups() {
    renderQueued = false;
    const root = $('loanList');
    if (!root) return;
    const all = groups();
    const current = all.filter(group => group.activeRecords.length);
    const recent = all.filter(group => !group.activeRecords.length).slice(0, 8);
    const html = `${current.length ? current.map(groupItemHtml).join('') : '<div class="empty-state" data-loan-group-ui>Nothing is currently loaned out.</div>'}${recent.length ? `<div class="history-divider" data-loan-group-ui>Recent returns</div>${recent.map(groupItemHtml).join('')}` : ''}`;
    if (root.dataset.loanGrouped === '1' && root.innerHTML === html) return;
    root.dataset.loanGrouped = '1';
    root.innerHTML = html;
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(renderLoanGroups);
  }

  function draftLimit(code) {
    const baseline = Number(draft?.baseline?.[code] || 0);
    const available = Number(window.RiftboundApp?.available?.(code) || 0);
    return Math.max(0, baseline + available);
  }

  function searchCards(query) {
    const needle = norm(query).trim();
    return catalog().filter(card => {
      const code = card.cardCode;
      if (draftLimit(code) <= 0 && !draft?.items?.[code]) return false;
      if (!needle) return true;
      return norm(`${card.fullName || card.name || ''} ${card.cardSet || ''} ${card.cardNumber || ''} ${code}`).includes(needle);
    }).slice(0, 35);
  }

  function openEditor(groupId = '') {
    const state = readState();
    const existing = groupId ? groups(state).find(group => group.id === groupId) : null;
    const baseline = {};
    if (existing) existing.activeRecords.forEach(record => { baseline[record.cardCode] = (baseline[record.cardCode] || 0) + Number(record.qty || 0); });
    draft = {
      id: existing?.id || uid('loan-group'),
      isNew: !existing,
      borrower: existing?.borrower || '',
      notes: existing?.notes || '',
      borrowedAt: existing?.borrowedAt || new Date().toISOString(),
      items: {...baseline},
      baseline
    };

    const dialog = $('loanDialog');
    if (!dialog) return;
    dialog.innerHTML = `<div class="modal-inner feature-editor loan-group-editor">
      <div class="modal-head"><div><h2>${existing ? 'Edit Loan' : 'Loan Cards'}</h2><p class="detail-meta">Keep every card for one borrower together in a single loan.</p></div><button class="close-btn" type="button" data-loan-manager-close>×</button></div>
      <div class="feature-form-grid"><label>Borrower<input id="loanGroupBorrower" value="${esc(draft.borrower)}" placeholder="Name"></label><label>Notes<input id="loanGroupNotes" value="${esc(draft.notes)}" placeholder="Optional"></label></div>
      <div class="loan-editor-layout"><div><h3>Add cards</h3><div class="feature-search"><input id="loanGroupSearch" type="search" autocomplete="off" placeholder="Search available cards"></div><div id="loanGroupSearchResults" class="feature-search-results"></div></div><div><h3>Cards in this loan</h3><div id="loanGroupSelected" class="feature-selected-list"></div></div></div>
      <div id="loanGroupMessage" class="feature-message" aria-live="polite"></div>
      <div class="modal-actions"><button class="primary-btn" id="saveLoanGroupBtn" type="button">${existing ? 'Save Changes' : 'Create Loan'}</button></div>
    </div>`;
    if (!dialog.open) dialog.showModal();
    renderSearch('');
    renderSelected();
    setTimeout(() => $('loanGroupBorrower')?.focus(), 0);
  }

  function renderSearch(query = '') {
    const root = $('loanGroupSearchResults');
    if (!root || !draft) return;
    const cards = searchCards(query);
    root.innerHTML = cards.length ? cards.map(card => {
      const current = Number(draft.items[card.cardCode] || 0);
      const max = draftLimit(card.cardCode);
      return `<div class="feature-search-row">${card.imageUrl ? `<img src="${esc(card.imageUrl)}" alt="" loading="lazy" decoding="async">` : ''}<span><strong>${esc(card.fullName || card.name || card.cardCode)}</strong><small>${esc(card.cardSet || '')} • ${Math.max(0, max - current)} more available</small></span><button type="button" data-loan-group-add="${esc(card.cardCode)}" ${current >= max ? 'disabled' : ''}>+</button></div>`;
    }).join('') : '<div class="recent-empty">No available cards match.</div>';
  }

  function renderSelected() {
    const root = $('loanGroupSelected');
    if (!root || !draft) return;
    const entries = Object.entries(draft.items).filter(([,qty]) => Number(qty) > 0);
    root.innerHTML = entries.length ? entries.map(([code,qty]) => `<div class="selected-card-row loan-selected-row"><span><strong>${esc(cardName(code))}</strong><small>Up to ${draftLimit(code)} in this loan</small></span><div><button type="button" data-loan-group-minus="${esc(code)}">−</button><b>${qty}</b><button type="button" data-loan-group-plus="${esc(code)}" ${Number(qty) >= draftLimit(code) ? 'disabled' : ''}>+</button><button class="loan-remove-item" type="button" data-loan-group-remove="${esc(code)}">Remove</button></div></div>`).join('') : '<div class="recent-empty">Add one or more cards from the search results.</div>';
  }

  function adjustDraft(code, delta) {
    if (!draft) return;
    const current = Number(draft.items[code] || 0);
    const next = Math.max(0, Math.min(draftLimit(code), current + delta));
    if (next) draft.items[code] = next;
    else delete draft.items[code];
    renderSelected();
    renderSearch($('loanGroupSearch')?.value || '');
  }

  function logAction(state, action, extra = {}) {
    state.transactions = [{id:uid('evt'), type:'activity', action, at:new Date().toISOString(), ...extra}, ...(state.transactions || [])].slice(0,500);
  }

  function saveDraft() {
    if (!draft) return;
    const borrower = ($('loanGroupBorrower')?.value || '').trim();
    const notes = ($('loanGroupNotes')?.value || '').trim();
    const message = $('loanGroupMessage');
    const desired = Object.fromEntries(Object.entries(draft.items).filter(([,qty]) => Number(qty) > 0));
    if (!borrower) { if (message) message.textContent = 'Enter who is borrowing these cards.'; return; }
    if (!Object.keys(desired).length) { if (message) message.textContent = 'Add at least one card to the loan.'; return; }
    for (const [code,qty] of Object.entries(desired)) {
      if (Number(qty) > draftLimit(code)) { if (message) message.textContent = `Not enough available copies of ${cardName(code)}.`; return; }
    }

    const state = readState();
    const now = new Date().toISOString();
    const records = (state.loans || []).filter(loan => groupKey(loan) === draft.id);
    const activeByCode = new Map();
    records.filter(active).forEach(record => {
      const list = activeByCode.get(record.cardCode) || [];
      list.push(record);
      activeByCode.set(record.cardCode, list);
    });

    const touched = new Set();
    for (const [code,qty] of Object.entries(desired)) {
      const existing = activeByCode.get(code) || [];
      if (existing.length) {
        const primary = existing[0];
        primary.groupId = draft.id;
        primary.borrower = borrower;
        primary.notes = notes;
        primary.qty = Number(qty);
        primary.returnedAt = null;
        primary.updatedAt = now;
        existing.slice(1).forEach(record => { record.returnedAt = now; record.updatedAt = now; });
      } else {
        state.loans.push({id:uid('loan'), groupId:draft.id, borrower, cardCode:code, qty:Number(qty), notes, borrowedAt:now, returnedAt:null, updatedAt:now});
      }
      touched.add(code);
    }

    for (const [code,recordsForCode] of activeByCode.entries()) {
      if (touched.has(code)) continue;
      recordsForCode.forEach(record => { record.returnedAt = now; record.updatedAt = now; record.borrower = borrower; record.notes = notes; record.groupId = draft.id; });
    }

    records.forEach(record => { record.borrower = borrower; record.notes = notes; record.groupId = draft.id; });
    const summary = Object.entries(desired).map(([code,qty]) => `${qty}× ${cardName(code)}`).join(', ');
    logAction(state, `${draft.isNew ? 'Created' : 'Updated'} loan to ${borrower}: ${summary}`, {loanGroupId:draft.id});
    saveState(state);
    $('loanDialog')?.close();
    draft = null;
  }

  function returnGroup(groupId) {
    const state = readState();
    const group = groups(state).find(item => item.id === groupId);
    if (!group) return;
    const now = new Date().toISOString();
    group.activeRecords.forEach(record => { record.returnedAt = now; record.updatedAt = now; record.groupId = groupId; });
    logAction(state, `Returned all cards from ${group.borrower}`, {loanGroupId:groupId});
    saveState(state);
  }

  function deleteGroup(groupId) {
    const state = readState();
    const group = groups(state).find(item => item.id === groupId);
    if (!group) return;
    state.loans = (state.loans || []).filter(loan => groupKey(loan) !== groupId);
    logAction(state, `Deleted loan record for ${group.borrower}`, {loanGroupId:groupId});
    saveState(state);
  }

  function onClick(event) {
    const target = event.target;
    const newLoan = target.closest('#newLoanBtn');
    if (newLoan) { event.preventDefault(); event.stopImmediatePropagation(); openEditor(); return; }
    const close = target.closest('[data-loan-manager-close]');
    if (close) { event.preventDefault(); event.stopImmediatePropagation(); $('loanDialog')?.close(); return; }
    const edit = target.closest('[data-edit-loan-group]');
    if (edit) { event.preventDefault(); event.stopImmediatePropagation(); openEditor(edit.dataset.editLoanGroup); return; }
    const returnAll = target.closest('[data-return-loan-group]');
    if (returnAll) { event.preventDefault(); event.stopImmediatePropagation(); returnGroup(returnAll.dataset.returnLoanGroup); return; }
    const removeGroup = target.closest('[data-delete-loan-group]');
    if (removeGroup) { event.preventDefault(); event.stopImmediatePropagation(); deleteGroup(removeGroup.dataset.deleteLoanGroup); return; }
    const add = target.closest('[data-loan-group-add]');
    if (add) { event.preventDefault(); event.stopImmediatePropagation(); adjustDraft(add.dataset.loanGroupAdd, 1); return; }
    const plus = target.closest('[data-loan-group-plus]');
    if (plus) { event.preventDefault(); event.stopImmediatePropagation(); adjustDraft(plus.dataset.loanGroupPlus, 1); return; }
    const minus = target.closest('[data-loan-group-minus]');
    if (minus) { event.preventDefault(); event.stopImmediatePropagation(); adjustDraft(minus.dataset.loanGroupMinus, -1); return; }
    const remove = target.closest('[data-loan-group-remove]');
    if (remove) { event.preventDefault(); event.stopImmediatePropagation(); if (draft) delete draft.items[remove.dataset.loanGroupRemove]; renderSelected(); renderSearch($('loanGroupSearch')?.value || ''); return; }
    const save = target.closest('#saveLoanGroupBtn');
    if (save) { event.preventDefault(); event.stopImmediatePropagation(); saveDraft(); }
  }

  function observeLoanList() {
    const root = $('loanList');
    if (!root || loanListObserver) return;
    loanListObserver = new MutationObserver(() => {
      if (!root.querySelector('[data-loan-group-ui]')) scheduleRender();
    });
    loanListObserver.observe(root, {childList:true, subtree:false});
  }

  function init() {
    document.addEventListener('click', onClick, true);
    document.addEventListener('input', event => {
      if (event.target.id === 'loanGroupSearch') renderSearch(event.target.value);
    });
    window.addEventListener('riftbound-catalog-ready', scheduleRender);
    window.addEventListener('riftbound-cloud-restored', () => setTimeout(scheduleRender, 0));
    window.addEventListener('riftbound-ui-render', () => setTimeout(scheduleRender, 0));
    observeLoanList();
    scheduleRender();
    setTimeout(() => { observeLoanList(); scheduleRender(); }, 500);
  }

  window.RiftboundLoans = {open:openEditor, render:renderLoanGroups};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();