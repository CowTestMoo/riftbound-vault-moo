(() => {
  'use strict';

  const APP_KEY = 'riftbound-vault-v2';
  const MAX_SUGGESTIONS = 8;
  const $ = id => document.getElementById(id);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = value => String(value ?? '').trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘`´]/g, "'").replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const key = value => norm(value).replace(/[^a-z0-9]/g, '');
  const cardName = card => card?.fullName || card?.name || card?.cardCode || 'Unknown card';
  const cardSet = card => card?.cardSet || card?.setName || card?.setCode || 'Unknown';
  const cardNumber = card => String(card?.cardNumber || card?.collectorNumber || '');
  const clampQty = value => {
    const n = Number(String(value ?? '').replace(/,/g, '').trim());
    return Number.isFinite(n) ? Math.max(0, Math.min(9999, Math.floor(n))) : 0;
  };

  let catalog = [];
  let indexes = null;
  let parsed = [];
  let resolverIndex = 0;
  let setInputs = new Map();

  function dedupe(cards) {
    return [...new Map((cards || []).filter(Boolean).map(card => [card.cardCode, card])).values()];
  }

  function numberKeys(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return [];
    const out = new Set([key(raw)]);
    const match = raw.match(/^(?:\D*)(\d+)(.*)$/);
    if (match) {
      out.add(String(Number(match[1])));
      out.add(`${Number(match[1])}${key(match[2])}`);
    }
    return [...out].filter(Boolean);
  }

  function pushIndex(map, idxKey, card) {
    if (!idxKey) return;
    const list = map.get(idxKey) || [];
    if (!list.some(item => item.cardCode === card.cardCode)) list.push(card);
    map.set(idxKey, list);
  }

  function buildIndexes(cards) {
    const out = {
      codes: new Map(),
      names: new Map(),
      setNames: new Map(),
      numbers: new Map(),
      setNumbers: new Map(),
      sets: new Map()
    };
    cards.forEach(card => {
      out.codes.set(key(card.cardCode), card);
      const nameKey = key(cardName(card));
      pushIndex(out.names, nameKey, card);
      const setKeys = [card.setCode, card.cardSet, card.setName].filter(Boolean).map(key);
      setKeys.forEach(setKey => {
        pushIndex(out.setNames, `${setKey}|${nameKey}`, card);
        pushIndex(out.sets, setKey, card);
      });
      numberKeys(cardNumber(card)).forEach(numberKey => {
        pushIndex(out.numbers, numberKey, card);
        setKeys.forEach(setKey => pushIndex(out.setNumbers, `${setKey}|${numberKey}`, card));
      });
    });
    return out;
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const prev = Array.from({length: b.length + 1}, (_, i) => i);
    const cur = new Array(b.length + 1);
    for (let i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          cur[j - 1] + 1,
          prev[j] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
    }
    return prev[b.length];
  }

  function tokenScore(a, b) {
    const left = new Set(norm(a).split(/\s+/).filter(Boolean));
    const right = new Set(norm(b).split(/\s+/).filter(Boolean));
    if (!left.size || !right.size) return 0;
    let common = 0;
    left.forEach(token => { if (right.has(token)) common++; });
    return common / Math.max(left.size, right.size);
  }

  function similarity(query, candidate) {
    const qn = norm(query);
    const cn = norm(candidate);
    if (!qn || !cn) return 0;
    if (qn === cn) return 1;
    const qk = key(qn);
    const ck = key(cn);
    if (qk === ck) return 0.995;
    let score = 0;
    if (cn.startsWith(qn) || ck.startsWith(qk)) score = Math.max(score, 0.94);
    if (cn.includes(qn) || ck.includes(qk)) score = Math.max(score, 0.88);
    if (qn.includes(cn) || qk.includes(ck)) score = Math.max(score, 0.84);
    score = Math.max(score, tokenScore(qn, cn) * 0.9);
    if (qk.length >= 3 && ck.length >= 3) {
      const distance = levenshtein(qk, ck);
      const ratio = 1 - distance / Math.max(qk.length, ck.length);
      score = Math.max(score, ratio * 0.92);
    }
    return score;
  }

  function likelyMatches(query, setHint = '', limit = MAX_SUGGESTIONS) {
    const q = norm(query);
    const setKey = key(setHint);
    if (!q) return [];
    const pool = setKey && indexes?.sets.get(setKey)?.length ? indexes.sets.get(setKey) : catalog;
    return pool
      .map(card => ({card, score: Math.max(similarity(q, cardName(card)), similarity(q, card.cardCode) * 0.98)}))
      .filter(row => row.score >= 0.28)
      .sort((a, b) => b.score - a.score || cardName(a.card).localeCompare(cardName(b.card)))
      .slice(0, limit)
      .map(row => row.card);
  }

  function parseLine(line, lineNumber) {
    let raw = String(line || '').trim();
    if (!raw || raw.startsWith('//')) return null;

    let quantity = 1;
    let text = raw;
    let match = text.match(/^(\d+)\s*[x×]\s+(.+)$/i) || text.match(/^(\d+)\s+(.+)$/);
    if (match) {
      quantity = clampQty(match[1]);
      text = match[2].trim();
    } else {
      match = text.match(/^(.+?)\s+[x×]\s*(\d+)$/i);
      if (match) {
        text = match[1].trim();
        quantity = clampQty(match[2]);
      }
    }

    let setHint = '';
    if (text.includes('|')) {
      const parts = text.split('|').map(part => part.trim()).filter(Boolean);
      text = parts.shift() || '';
      setHint = parts.join(' ');
    }

    return {
      id: `bulk-line-${lineNumber}`,
      lineNumber,
      raw,
      query: text,
      setHint,
      qty: quantity,
      status: 'unmatched',
      method: 'No match',
      candidates: [],
      card: null,
      skipped: false
    };
  }

  function exactCandidate(cards, method, row) {
    const unique = dedupe(cards);
    if (unique.length === 1) {
      row.status = 'matched';
      row.method = method;
      row.card = unique[0];
      row.candidates = unique;
      return true;
    }
    if (unique.length > 1) {
      row.status = 'review';
      row.method = method;
      row.candidates = unique;
      return true;
    }
    return false;
  }

  function resolveRow(row) {
    const query = row.query.trim();
    const queryKey = key(query);
    const setKey = key(row.setHint);
    if (!queryKey) return row;

    const code = indexes.codes.get(queryKey);
    if (code) return exactCandidate([code], 'Card code', row), row;

    if (setKey) {
      const setName = indexes.setNames.get(`${setKey}|${queryKey}`) || [];
      if (exactCandidate(setName, 'Set + name', row)) return row;
    }

    const exactNames = indexes.names.get(queryKey) || [];
    if (exactCandidate(exactNames, 'Card name', row)) return row;

    const compact = query.match(/^([a-z0-9]{2,12})[\s#:/-]+(\d+[a-z]?)$/i);
    if (compact) {
      const guessedSet = key(compact[1]);
      const number = compact[2];
      let setNumberCards = [];
      numberKeys(number).forEach(numberKey => setNumberCards.push(...(indexes.setNumbers.get(`${guessedSet}|${numberKey}`) || [])));
      if (exactCandidate(setNumberCards, 'Set + number', row)) return row;
    }

    if (setKey) {
      let setNumberCards = [];
      numberKeys(query).forEach(numberKey => setNumberCards.push(...(indexes.setNumbers.get(`${setKey}|${numberKey}`) || [])));
      if (exactCandidate(setNumberCards, 'Set + number', row)) return row;
    }

    let numberCards = [];
    numberKeys(query).forEach(numberKey => numberCards.push(...(indexes.numbers.get(numberKey) || [])));
    if (/^#?\d+[a-z]?$/i.test(query) && exactCandidate(numberCards, 'Card number', row)) return row;

    const likely = likelyMatches(query, row.setHint);
    row.candidates = likely;
    row.status = likely.length ? 'review' : 'unmatched';
    row.method = likely.length ? 'Likely matches' : 'No safe match';
    return row;
  }

  function analyzePaste() {
    const text = $('bulkEntryText')?.value || '';
    parsed = text.split(/\r?\n/).map((line, i) => parseLine(line, i + 1)).filter(Boolean).map(resolveRow);
    renderPasteAnalysis();
    const firstProblem = parsed.findIndex(row => row.status === 'review' || row.status === 'unmatched');
    if (firstProblem >= 0) resolverIndex = firstProblem;
  }

  function summaryCounts() {
    const matched = parsed.filter(row => row.status === 'matched' && row.card && row.qty > 0);
    const review = parsed.filter(row => row.status === 'review' && !row.skipped);
    const unmatched = parsed.filter(row => row.status === 'unmatched' && !row.skipped);
    const skipped = parsed.filter(row => row.skipped || row.qty === 0);
    return {
      matched: matched.length,
      review: review.length,
      unmatched: unmatched.length,
      skipped: skipped.length,
      copies: matched.reduce((sum, row) => sum + row.qty, 0)
    };
  }

  function rowStatusText(row) {
    if (row.skipped) return 'Skipped';
    if (row.status === 'matched') return `✓ ${row.method}`;
    if (row.status === 'review') return `? ${row.candidates.length} possible`;
    return '! Needs a match';
  }

  function renderPasteAnalysis() {
    const root = $('bulkEntryResults');
    const summary = $('bulkEntrySummary');
    const apply = $('bulkEntryApply');
    const review = $('bulkEntryReview');
    if (!root || !summary || !apply || !review) return;

    if (!parsed.length) {
      summary.innerHTML = '<div><strong>0</strong><small>Lines</small></div><div><strong>0</strong><small>Matched</small></div><div><strong>0</strong><small>Review</small></div><div><strong>0</strong><small>Copies</small></div>';
      root.innerHTML = '<div class="bulk-entry-empty">Paste card names or card codes, then choose Analyze.</div>';
      apply.disabled = true;
      review.hidden = true;
      return;
    }

    const counts = summaryCounts();
    summary.innerHTML = `<div><strong>${parsed.length}</strong><small>Lines</small></div><div class="good"><strong>${counts.matched}</strong><small>Matched</small></div><div class="${counts.review + counts.unmatched ? 'warn' : ''}"><strong>${counts.review + counts.unmatched}</strong><small>Review</small></div><div><strong>${counts.copies}</strong><small>Copies</small></div>`;
    root.innerHTML = parsed.slice(0, 150).map((row, index) => {
      const chosen = row.card ? `${esc(cardName(row.card))}<small>${esc(cardSet(row.card))} ${esc(cardNumber(row.card))}</small>` : '<span class="bulk-entry-muted">Not selected</span>';
      const problem = row.status !== 'matched' && !row.skipped;
      return `<div class="bulk-entry-result-row ${row.status} ${row.skipped ? 'skipped' : ''}"><span class="bulk-entry-line">${row.lineNumber}</span><span><strong>${esc(row.raw)}</strong><small>${esc(row.setHint ? `Set hint: ${row.setHint}` : '')}</small></span><span>${chosen}</span><span>×${row.qty}</span><span><button type="button" class="bulk-entry-status-btn ${problem ? 'needs-review' : ''}" data-bulk-review-row="${index}" ${problem ? '' : 'disabled'}>${esc(rowStatusText(row))}</button></span></div>`;
    }).join('');
    review.hidden = counts.review + counts.unmatched === 0;
    review.textContent = `Resolve ${counts.review + counts.unmatched} Match${counts.review + counts.unmatched === 1 ? '' : 'es'}`;
    apply.disabled = counts.matched === 0 || counts.review + counts.unmatched > 0;
    apply.textContent = counts.matched ? `Add ${counts.copies} Cop${counts.copies === 1 ? 'y' : 'ies'}` : 'Apply Import';
  }

  function cardCandidateHtml(card, index) {
    const owned = Number(window.RiftboundApp?.owned?.(card.cardCode) || 0);
    return `<button type="button" class="bulk-match-card" data-bulk-pick-card="${esc(card.cardCode)}"><span class="bulk-match-image">${card.imageUrl ? `<img src="${esc(card.imageUrl)}" alt="${esc(cardName(card))}" loading="lazy" decoding="async">` : '<span>?</span>'}</span><span class="bulk-match-copy"><strong>${esc(cardName(card))}</strong><small>${esc(cardSet(card))} ${esc(cardNumber(card))}</small><small>${esc(card.cardCode)} • Owned ${owned}</small></span><span class="bulk-match-rank">${index + 1}</span></button>`;
  }

  function unresolvedIndexes() {
    return parsed.map((row, index) => ({row, index})).filter(item => !item.row.skipped && item.row.status !== 'matched').map(item => item.index);
  }

  function openResolver(index = resolverIndex) {
    if (!parsed.length) return;
    const unresolved = unresolvedIndexes();
    if (!unresolved.length) return;
    resolverIndex = unresolved.includes(index) ? index : unresolved[0];
    renderResolver();
    const dialog = $('bulkMatchDialog');
    if (dialog && !dialog.open) dialog.showModal();
  }

  function renderResolver(searchValue = '') {
    const root = $('bulkMatchInner');
    const row = parsed[resolverIndex];
    if (!root || !row) return;
    const unresolved = unresolvedIndexes();
    const position = Math.max(0, unresolved.indexOf(resolverIndex));
    const source = searchValue.trim() ? likelyMatches(searchValue, row.setHint, 12) : (row.candidates.length ? row.candidates : likelyMatches(row.query, row.setHint, 12));
    root.innerHTML = `<div class="modal-head"><div><h2>Choose the Correct Card</h2><p class="bulk-entry-subtitle">${position + 1} of ${unresolved.length} unresolved</p></div><button class="close-btn" type="button" data-bulk-match-close>×</button></div><div class="bulk-match-source"><span>Input line ${row.lineNumber}</span><strong>${esc(row.raw)}</strong>${row.setHint ? `<small>Set hint: ${esc(row.setHint)}</small>` : ''}</div><label class="bulk-match-search">Search all cards<input id="bulkMatchSearch" type="search" autocomplete="off" placeholder="Search a different card" value="${esc(searchValue)}"></label><div class="bulk-match-grid">${source.length ? source.map(cardCandidateHtml).join('') : '<div class="bulk-entry-empty">No likely matches yet. Try searching the card name or card code.</div>'}</div><div class="modal-actions bulk-match-actions"><button id="bulkMatchSkip" class="ghost-btn" type="button">Skip This Line</button><button id="bulkMatchPrev" class="ghost-btn" type="button" ${position <= 0 ? 'disabled' : ''}>Previous</button><button id="bulkMatchNext" class="ghost-btn" type="button" ${position >= unresolved.length - 1 ? 'disabled' : ''}>Next</button></div>`;
  }

  function moveResolver(direction) {
    const unresolved = unresolvedIndexes();
    const position = unresolved.indexOf(resolverIndex);
    const next = unresolved[position + direction];
    if (next === undefined) return;
    resolverIndex = next;
    renderResolver();
  }

  function pickResolverCard(code) {
    const row = parsed[resolverIndex];
    const card = indexes.codes.get(key(code));
    if (!row || !card) return;
    row.card = card;
    row.status = 'matched';
    row.method = 'Your selection';
    row.skipped = false;
    row.candidates = [card];
    renderPasteAnalysis();
    const remaining = unresolvedIndexes();
    if (!remaining.length) {
      $('bulkMatchDialog')?.close();
      return;
    }
    resolverIndex = remaining.find(index => index > resolverIndex) ?? remaining[0];
    renderResolver();
  }

  function skipResolverRow() {
    const row = parsed[resolverIndex];
    if (!row) return;
    row.skipped = true;
    row.status = 'skipped';
    row.card = null;
    renderPasteAnalysis();
    const remaining = unresolvedIndexes();
    if (!remaining.length) {
      $('bulkMatchDialog')?.close();
      return;
    }
    resolverIndex = remaining.find(index => index > resolverIndex) ?? remaining[0];
    renderResolver();
  }

  function readVaultState() {
    try {
      const parsedState = JSON.parse(localStorage.getItem(APP_KEY) || '{}');
      return {inventory:{}, decks:[], loans:[], transactions:[], ...parsedState};
    } catch {
      return {inventory:{}, decks:[], loans:[], transactions:[]};
    }
  }

  function uid() {
    return `txn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function applyCollectionChanges(entries, mode, reason) {
    const state = readVaultState();
    const aggregate = new Map();
    entries.forEach(entry => {
      if (!entry?.card?.cardCode) return;
      const current = aggregate.get(entry.card.cardCode) || {card: entry.card, qty: 0};
      if (mode === 'set') current.qty = clampQty(entry.qty);
      else current.qty += clampQty(entry.qty);
      aggregate.set(entry.card.cardCode, current);
    });

    let changedCards = 0;
    let netCopies = 0;
    for (const [code, entry] of aggregate) {
      const current = Number(state.inventory?.[code]?.owned || 0);
      const minimum = Number(window.RiftboundApp?.decked?.(code) || 0) + Number(window.RiftboundApp?.loaned?.(code) || 0);
      const next = mode === 'set' ? Math.max(minimum, entry.qty) : current + entry.qty;
      const delta = next - current;
      if (!delta) continue;
      state.inventory[code] = {...(state.inventory[code] || {}), owned: next};
      state.transactions.unshift({id: uid(), cardCode: code, delta, reason, at: new Date().toISOString()});
      changedCards++;
      netCopies += delta;
    }

    if (!changedCards) return {changedCards: 0, netCopies: 0};
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    window.RiftboundApp?.reloadState?.();
    window.dispatchEvent(new CustomEvent('riftbound-bulk-entry-applied', {detail:{changedCards, netCopies, mode}}));
    return {changedCards, netCopies};
  }

  function applyPasteImport() {
    const mode = $('bulkEntryPasteMode')?.value || 'add';
    const entries = parsed.filter(row => row.status === 'matched' && row.card && row.qty > 0).map(row => ({card: row.card, qty: row.qty}));
    if (!entries.length) return;
    const result = applyCollectionChanges(entries, mode, mode === 'set' ? 'Bulk paste set quantities' : 'Bulk paste import');
    const msg = $('bulkEntryMessage');
    if (msg) msg.textContent = result.changedCards ? `${result.changedCards} card${result.changedCards === 1 ? '' : 's'} updated. ${Math.abs(result.netCopies)} cop${Math.abs(result.netCopies) === 1 ? 'y' : 'ies'} ${result.netCopies >= 0 ? 'added' : 'removed'}.` : 'No collection quantities changed.';
    if (result.changedCards) {
      parsed = [];
      if ($('bulkEntryText')) $('bulkEntryText').value = '';
      renderPasteAnalysis();
    }
  }

  function setSort(a, b) {
    const an = cardNumber(a);
    const bn = cardNumber(b);
    const ax = Number.parseInt(an, 10);
    const bx = Number.parseInt(bn, 10);
    if (Number.isFinite(ax) && Number.isFinite(bx) && ax !== bx) return ax - bx;
    return an.localeCompare(bn, undefined, {numeric:true}) || cardName(a).localeCompare(cardName(b));
  }

  function availableSets() {
    return [...new Set(catalog.map(cardSet).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function renderSetSelect() {
    const select = $('bulkSetSelect');
    if (!select) return;
    const sets = availableSets();
    const previous = select.value;
    select.innerHTML = sets.map(set => `<option value="${esc(set)}">${esc(set)}</option>`).join('');
    if (sets.includes(previous)) select.value = previous;
    renderSetEntry();
  }

  function renderSetEntry() {
    const root = $('bulkSetRows');
    const select = $('bulkSetSelect');
    if (!root || !select) return;
    const set = select.value;
    const query = norm($('bulkSetSearch')?.value || '');
    const mode = $('bulkSetMode')?.value || 'add';
    const cards = catalog.filter(card => cardSet(card) === set && (!query || norm(`${cardName(card)} ${cardNumber(card)} ${card.cardCode}`).includes(query))).sort(setSort);
    setInputs = new Map();
    root.innerHTML = cards.map(card => {
      const current = Number(window.RiftboundApp?.owned?.(card.cardCode) || 0);
      const value = mode === 'set' ? current : 0;
      setInputs.set(card.cardCode, value);
      return `<div class="bulk-set-row" data-bulk-set-card="${esc(card.cardCode)}"><span class="bulk-set-image">${card.imageUrl ? `<img src="${esc(card.imageUrl)}" alt="${esc(cardName(card))}" loading="lazy" decoding="async">` : '<span>?</span>'}</span><span class="bulk-set-card-copy"><strong>${esc(cardName(card))}</strong><small>${esc(cardSet(card))} ${esc(cardNumber(card))} • ${esc(card.cardCode)}</small></span><span class="bulk-set-owned"><small>Owned</small><strong>${current}</strong></span><label class="bulk-set-qty"><span>${mode === 'set' ? 'Total' : 'Add'}</span><input type="number" min="0" max="9999" step="1" inputmode="numeric" value="${value}" data-bulk-set-qty="${esc(card.cardCode)}" aria-label="${mode === 'set' ? 'Owned total' : 'Copies to add'} for ${esc(cardName(card))}"></label></div>`;
    }).join('') || '<div class="bulk-entry-empty">No cards match this set and search.</div>';
    updateSetSummary();
  }

  function updateSetSummary() {
    const mode = $('bulkSetMode')?.value || 'add';
    let cards = 0;
    let copies = 0;
    document.querySelectorAll('[data-bulk-set-qty]').forEach(input => {
      const code = input.dataset.bulkSetQty;
      const value = clampQty(input.value);
      setInputs.set(code, value);
      const current = Number(window.RiftboundApp?.owned?.(code) || 0);
      if (mode === 'set') {
        if (value !== current) cards++;
        copies += value - current;
      } else if (value > 0) {
        cards++;
        copies += value;
      }
    });
    if ($('bulkSetSummary')) $('bulkSetSummary').textContent = mode === 'set' ? `${cards} card${cards === 1 ? '' : 's'} changing • ${copies >= 0 ? '+' : ''}${copies} net copies` : `${cards} card${cards === 1 ? '' : 's'} • ${copies} copies to add`;
    if ($('bulkSetApply')) {
      $('bulkSetApply').disabled = cards === 0;
      $('bulkSetApply').textContent = mode === 'set' ? 'Save Set Quantities' : `Add ${copies} Cop${copies === 1 ? 'y' : 'ies'}`;
    }
  }

  function applySetEntry() {
    const mode = $('bulkSetMode')?.value || 'add';
    const entries = [];
    document.querySelectorAll('[data-bulk-set-qty]').forEach(input => {
      const code = input.dataset.bulkSetQty;
      const card = indexes.codes.get(key(code));
      const value = clampQty(input.value);
      const current = Number(window.RiftboundApp?.owned?.(code) || 0);
      if (!card) return;
      if (mode === 'set' && value !== current) entries.push({card, qty:value});
      if (mode === 'add' && value > 0) entries.push({card, qty:value});
    });
    if (!entries.length) return;
    const result = applyCollectionChanges(entries, mode, mode === 'set' ? 'Bulk set entry quantities' : 'Bulk set entry');
    const msg = $('bulkEntryMessage');
    if (msg) msg.textContent = result.changedCards ? `${result.changedCards} card${result.changedCards === 1 ? '' : 's'} updated from set entry.` : 'No collection quantities changed.';
    renderSetEntry();
  }

  function switchPanel(panel) {
    document.querySelectorAll('[data-bulk-panel]').forEach(button => button.classList.toggle('active', button.dataset.bulkPanel === panel));
    document.querySelectorAll('.bulk-entry-panel').forEach(section => section.hidden = section.dataset.bulkPanelView !== panel);
    if (panel === 'set') renderSetEntry();
  }

  function openSpreadsheetImporter() {
    $('bulkEntryDialog')?.close();
    const button = $('openSpreadsheetImport');
    if (button) {
      button.click();
      return;
    }
    const msg = $('bulkEntryMessage');
    if (msg) msg.textContent = 'Spreadsheet import is still loading. Try again after the catalog finishes loading.';
  }

  function ensureUI() {
    const bulkAdd = $('bulkAddBtn');
    if (bulkAdd && !$('bulkEntryBtn')) {
      const button = document.createElement('button');
      button.id = 'bulkEntryBtn';
      button.className = 'primary-btn bulk-entry-launch';
      button.type = 'button';
      button.textContent = 'Bulk Entry';
      bulkAdd.insertAdjacentElement('afterend', button);
    }

    if (!$('bulkEntryDialog')) {
      const dialog = document.createElement('dialog');
      dialog.id = 'bulkEntryDialog';
      dialog.className = 'modal bulk-entry-dialog';
      dialog.innerHTML = `<div class="modal-inner bulk-entry-inner"><div class="modal-head"><div><h2>Bulk Entry</h2><p class="bulk-entry-subtitle">Fast collection input with safe card matching.</p></div><button class="close-btn" type="button" data-bulk-entry-close>×</button></div><div class="bulk-entry-tabs"><button type="button" class="active" data-bulk-panel="paste">Paste List</button><button type="button" data-bulk-panel="set">Set Entry</button><button type="button" data-bulk-panel="sheet">Spreadsheet</button></div><section class="bulk-entry-panel" data-bulk-panel-view="paste"><div class="bulk-entry-grid"><div><label class="bulk-entry-label">Paste cards<textarea id="bulkEntryText" spellcheck="false" placeholder="4x Annie\n2 Garen\n1 Jinx | Spiritforged\nOGN-123 x3"></textarea></label><div class="bulk-entry-help">Accepted examples: <strong>4x Card Name</strong>, <strong>Card Name x4</strong>, <strong>4 Card Name</strong>, card code, or <strong>Card Name | Set</strong>.</div></div><div class="bulk-entry-options"><label>Import mode<select id="bulkEntryPasteMode"><option value="add" selected>Add these copies</option><option value="set">Set owned totals</option></select></label><button id="bulkEntryAnalyze" class="primary-btn" type="button">Analyze List</button><button id="bulkEntryReview" class="ghost-btn" type="button" hidden>Resolve Matches</button></div></div><div id="bulkEntrySummary" class="bulk-entry-summary"></div><div id="bulkEntryResults" class="bulk-entry-results"></div><div class="modal-actions"><button id="bulkEntryApply" class="primary-btn" type="button" disabled>Apply Import</button></div></section><section class="bulk-entry-panel" data-bulk-panel-view="set" hidden><div class="bulk-set-toolbar"><label>Set<select id="bulkSetSelect"></select></label><label>Mode<select id="bulkSetMode"><option value="add" selected>Add copies</option><option value="set">Set owned totals</option></select></label><label class="bulk-set-search">Search<input id="bulkSetSearch" type="search" autocomplete="off" placeholder="Filter this set"></label></div><div class="bulk-set-tip">Cards are in collector-number order. Type a quantity, press Tab, and keep going.</div><div id="bulkSetRows" class="bulk-set-rows"></div><div class="bulk-set-footer"><span id="bulkSetSummary">0 cards • 0 copies to add</span><button id="bulkSetApply" class="primary-btn" type="button" disabled>Apply Set Entry</button></div></section><section class="bulk-entry-panel" data-bulk-panel-view="sheet" hidden><div class="bulk-sheet-callout"><div><strong>Excel / CSV importer</strong><p>Use the existing smart spreadsheet importer for full collection sheets. It already pauses on ambiguous cards so you can choose the correct printing.</p></div><button id="bulkOpenSheet" class="primary-btn" type="button">Open Spreadsheet Import</button></div></section><div id="bulkEntryMessage" class="feature-message bulk-entry-message" aria-live="polite"></div></div>`;
      document.body.appendChild(dialog);
    }

    if (!$('bulkMatchDialog')) {
      const resolver = document.createElement('dialog');
      resolver.id = 'bulkMatchDialog';
      resolver.className = 'modal bulk-match-dialog';
      resolver.innerHTML = '<div id="bulkMatchInner" class="modal-inner bulk-match-inner"></div>';
      document.body.appendChild(resolver);
    }

    renderPasteAnalysis();
  }

  function openBulkEntry() {
    ensureUI();
    const dialog = $('bulkEntryDialog');
    if (dialog && !dialog.open) dialog.showModal();
    switchPanel('paste');
    $('bulkEntryText')?.focus();
  }

  document.addEventListener('click', event => {
    const target = event.target;
    if (target.closest('#bulkEntryBtn')) { openBulkEntry(); return; }
    if (target.closest('[data-bulk-entry-close]')) { $('bulkEntryDialog')?.close(); return; }
    if (target.closest('[data-bulk-match-close]')) { $('bulkMatchDialog')?.close(); return; }

    const panelButton = target.closest('[data-bulk-panel]');
    if (panelButton) { switchPanel(panelButton.dataset.bulkPanel); return; }
    if (target.closest('#bulkEntryAnalyze')) { analyzePaste(); return; }
    if (target.closest('#bulkEntryReview')) { openResolver(); return; }
    if (target.closest('#bulkEntryApply')) { applyPasteImport(); return; }
    if (target.closest('#bulkSetApply')) { applySetEntry(); return; }
    if (target.closest('#bulkOpenSheet')) { openSpreadsheetImporter(); return; }

    const rowButton = target.closest('[data-bulk-review-row]');
    if (rowButton) { openResolver(Number(rowButton.dataset.bulkReviewRow)); return; }
    const pick = target.closest('[data-bulk-pick-card]');
    if (pick) { pickResolverCard(pick.dataset.bulkPickCard); return; }
    if (target.closest('#bulkMatchSkip')) { skipResolverRow(); return; }
    if (target.closest('#bulkMatchPrev')) { moveResolver(-1); return; }
    if (target.closest('#bulkMatchNext')) { moveResolver(1); return; }
  });

  document.addEventListener('input', event => {
    if (event.target?.id === 'bulkMatchSearch') { renderResolver(event.target.value); const input = $('bulkMatchSearch'); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } return; }
    if (event.target?.id === 'bulkSetSearch') { renderSetEntry(); return; }
    if (event.target?.matches?.('[data-bulk-set-qty]')) { updateSetSummary(); }
  });

  document.addEventListener('change', event => {
    if (event.target?.id === 'bulkSetSelect' || event.target?.id === 'bulkSetMode') renderSetEntry();
    if (event.target?.id === 'bulkEntryPasteMode') renderPasteAnalysis();
  });

  function initCatalog() {
    catalog = window.RiftboundApp?.getCatalog?.() || [];
    if (!catalog.length) return false;
    indexes = buildIndexes(catalog);
    ensureUI();
    renderSetSelect();
    return true;
  }

  function init() {
    ensureUI();
    if (!initCatalog()) window.addEventListener('riftbound-catalog-ready', initCatalog, {once:true});
  }

  window.RiftboundBulkEntry = {open: openBulkEntry, analyze: analyzePaste};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
