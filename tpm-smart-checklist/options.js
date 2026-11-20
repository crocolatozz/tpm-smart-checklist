import { createSvgIcon, hydrateIcons } from './icons.js';
import { TPMStorage as Storage, RUNNING_STATUS_CHECKER_URL } from './storage.js';
import { EQUIPMENT_DB, TASK_KEYWORD_TEMPLATES } from './equipment-db.js';

const elVersion = document.getElementById('options-version');
const elDevBadge = document.getElementById('options-dev-badge');
const elDevToggle = document.getElementById('dev-mode-toggle');
const elFooterVer = document.getElementById('options-footer-ver');
const elThemeBtn = document.getElementById('options-theme-btn');
const elOpenRscBtn = document.getElementById('open-rsc-btn');

const elSkipRunningSelect = document.getElementById('skip-running-select');
const elSkipRunningPills = document.getElementById('skip-running-pills');
const elSkipStandbySelect = document.getElementById('skip-standby-select');
const elSkipStandbyPills = document.getElementById('skip-standby-pills');

const elOpTabs = Array.from(document.querySelectorAll('.op-tab-btn[data-op-tab]'));
const elOp1Total = document.getElementById('op1-total');
const elOp2Total = document.getElementById('op2-total');
const elOp3Total = document.getElementById('op3-total');

const elSearchInput = document.getElementById('equip-search-input');
const elEquipList = document.getElementById('equip-list');
const elFilterPills = Array.from(document.querySelectorAll('.pill-btn[data-filter]'));

const elCountAll = document.getElementById('count-all');
const elCountRunning = document.getElementById('count-running');
const elCountStandby = document.getElementById('count-standby');
const elCountIgnore = document.getElementById('count-ignore');
const elToastContainer = document.getElementById('toast-container');

let currentSettings = Storage.createDefaultSettings();
let selectedOpId = 'op1';
let lastSyncedActiveOp = 'op1';
let activeFilter = 'ALL';

function showToast(message, variant) {
  const tone = ['success', 'info', 'warning', 'error'].includes(variant) ? variant : 'info';
  const iconMap = {
    success: 'check-circle',
    info: 'info',
    warning: 'alert-triangle',
    error: 'alert-triangle'
  };

  const toast = document.createElement('div');
  toast.className = 'pmr-toast is-' + tone;
  toast.setAttribute('role', 'status');

  const iconWrap = document.createElement('span');
  iconWrap.className = 'pmr-toast-icon';
  iconWrap.appendChild(createSvgIcon(iconMap[tone] || 'info', 15));

  const textWrap = document.createElement('span');
  textWrap.textContent = message;

  toast.appendChild(iconWrap);
  toast.appendChild(textWrap);
  elToastContainer.appendChild(toast);

  while (elToastContainer.children.length > 4) {
    elToastContainer.firstElementChild.remove();
  }

  requestAnimationFrame(function () {
    toast.classList.add('is-visible');
  });

  setTimeout(function () {
    toast.classList.remove('is-visible');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  }, 2600);
}

function renderThemeButton(theme) {
  const isDark = theme === 'dark';
  elThemeBtn.replaceChildren(
    createSvgIcon(isDark ? 'sun' : 'moon', 14),
    document.createTextNode(isDark ? 'Light Mode' : 'Dark Mode')
  );
}

function renderStaticIcons() {
  hydrateIcons(document);
  elDevBadge.replaceChildren(createSvgIcon('code', 11), document.createTextNode('DEV'));
  elOpenRscBtn.replaceChildren(
    createSvgIcon('external-link', 14),
    document.createTextNode('Buka Running Status Checker')
  );
}

function renderKeywordControl(selectEl, pillBoxEl, selectedKeywords, groupKey, isEditable) {
  const selectedList = Array.isArray(selectedKeywords) ? selectedKeywords : [];
  const selectedLower = new Set(selectedList.map((k) => k.toLowerCase()));

  const optionPool = [];
  const seenOption = new Set();
  for (const tpl of TASK_KEYWORD_TEMPLATES) {
    const lower = tpl.toLowerCase();
    if (seenOption.has(lower)) continue;
    seenOption.add(lower);
    optionPool.push(tpl);
  }
  for (const existing of selectedList) {
    const lower = existing.toLowerCase();
    if (seenOption.has(lower)) continue;
    seenOption.add(lower);
    optionPool.push(existing);
  }

  selectEl.replaceChildren();
  const placeholderOpt = document.createElement('option');
  placeholderOpt.value = '';
  placeholderOpt.textContent = isEditable
    ? '+ Pilih kata kunci tugas...'
    : 'Mode baca-saja (aktifkan Dev Mode untuk edit)';
  selectEl.appendChild(placeholderOpt);

  for (const item of optionPool) {
    const opt = document.createElement('option');
    opt.value = item;
    const isChosen = selectedLower.has(item.toLowerCase());
    opt.disabled = isChosen;
    opt.textContent = isChosen ? item + ' (Dipilih)' : item;
    selectEl.appendChild(opt);
  }
  selectEl.value = '';
  selectEl.disabled = !isEditable;

  pillBoxEl.replaceChildren();
  if (selectedList.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'pill-box-empty';
    empty.textContent = 'Belum ada kata kunci dipilih.';
    pillBoxEl.appendChild(empty);
    return;
  }

  for (const kw of selectedList) {
    const pill = document.createElement('span');
    pill.className = 'kw-pill';

    const label = document.createElement('span');
    label.textContent = kw;
    pill.appendChild(label);

    if (isEditable) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'kw-pill-remove';
      removeBtn.setAttribute('aria-label', 'Hapus kata kunci ' + kw);
      removeBtn.setAttribute('data-kw-group', groupKey);
      removeBtn.setAttribute('data-kw-value', kw);
      removeBtn.appendChild(createSvgIcon('x', 11));
      pill.appendChild(removeBtn);
    }

    pillBoxEl.appendChild(pill);
  }
}

function parsePairInfo(tag) {
  const match = /^(.+?\d)(A|B)(M?)$/i.exec(String(tag || '').trim());
  if (!match) return null;
  return {
    base: match[1].toUpperCase(),
    side: match[2].toUpperCase()
  };
}

function findPartnerMap(opId, equipmentMap) {
  const partnerOf = new Map();
  const dbPreset = EQUIPMENT_DB[opId];

  if (dbPreset && Array.isArray(dbPreset.equipments)) {
    for (const item of dbPreset.equipments) {
      if (
        item.pair &&
        Object.prototype.hasOwnProperty.call(equipmentMap, item.tag) &&
        Object.prototype.hasOwnProperty.call(equipmentMap, item.pair)
      ) {
        partnerOf.set(item.tag, item.pair);
      }
    }
  }

  const byBase = new Map();
  for (const tag of Object.keys(equipmentMap || {})) {
    if (partnerOf.has(tag)) continue;
    const info = parsePairInfo(tag);
    if (!info) continue;
    if (!byBase.has(info.base)) {
      byBase.set(info.base, { A: null, B: null });
    }
    const bucket = byBase.get(info.base);
    if (info.side === 'A' && !bucket.A) bucket.A = tag;
    if (info.side === 'B' && !bucket.B) bucket.B = tag;
  }

  for (const bucket of byBase.values()) {
    if (bucket.A && bucket.B) {
      partnerOf.set(bucket.A, bucket.B);
      partnerOf.set(bucket.B, bucket.A);
    }
  }

  return partnerOf;
}

function createCompactSwapButton(tagA, tagB, isEditable) {
  const swapBtn = document.createElement('button');
  swapBtn.type = 'button';
  swapBtn.className = 'btn-swap-icon';
  swapBtn.title = isEditable
    ? 'Tukar status pasangan atas-bawah (' + tagA + ' / ' + tagB + ')'
    : 'Aktifkan Dev Mode untuk menukar status unit';
  swapBtn.setAttribute('aria-label', 'Tukar status ' + tagA + ' dan ' + tagB);
  swapBtn.setAttribute('data-swap-a', tagA);
  swapBtn.setAttribute('data-swap-b', tagB);
  swapBtn.disabled = !isEditable;
  swapBtn.appendChild(createSvgIcon('swap-vertical', 14));
  return swapBtn;
}

function buildSingleEquipRow(tag, state, inlinePartnerTag, omitGutter, isEditable) {
  const row = document.createElement('div');
  row.className = 'equip-row';

  const left = document.createElement('div');
  left.className = 'equip-row-left';

  if (!omitGutter) {
    if (inlinePartnerTag) {
      const gutter = document.createElement('span');
      gutter.className = 'equip-gutter';
      gutter.appendChild(createCompactSwapButton(tag, inlinePartnerTag, isEditable));
      left.appendChild(gutter);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'equip-gutter';
      spacer.setAttribute('aria-hidden', 'true');
      left.appendChild(spacer);
    }
  }

  const tagSpan = document.createElement('span');
  tagSpan.className = 'equip-tag';
  tagSpan.textContent = tag;
  left.appendChild(tagSpan);

  const right = document.createElement('div');
  right.className = 'equip-row-right';

  const seg = document.createElement('div');
  seg.className = 'seg-toggle';
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', 'Status ' + tag);

  const states = [
    { key: 'RUNNING', cls: 'is-running', label: 'RUNNING' },
    { key: 'STANDBY', cls: 'is-standby', label: 'STANDBY' },
    { key: 'IGNORE', cls: 'is-ignore', label: 'IGNORE' }
  ];

  for (const item of states) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seg-opt' + (state === item.key ? ' ' + item.cls : '');
    btn.textContent = item.label;
    btn.setAttribute('data-tag', tag);
    btn.setAttribute('data-state', item.key);
    btn.disabled = !isEditable;
    seg.appendChild(btn);
  }

  right.appendChild(seg);
  row.appendChild(left);
  row.appendChild(right);
  return row;
}

function renderOperatorTabs() {
  const ops = currentSettings.operators || {};
  elOp1Total.textContent = String(Object.keys(ops.op1 || {}).length);
  elOp2Total.textContent = String(Object.keys(ops.op2 || {}).length);
  elOp3Total.textContent = String(Object.keys(ops.op3 || {}).length);

  for (const btn of elOpTabs) {
    const opId = btn.getAttribute('data-op-tab');
    const isSelected = opId === selectedOpId;
    btn.classList.toggle('is-active', isSelected);
    btn.setAttribute('aria-selected', String(isSelected));
  }
}

function renderEquipmentList() {
  renderOperatorTabs();

  const isEditable = Boolean(currentSettings.devMode);
  const map = (currentSettings.operators && currentSettings.operators[selectedOpId]) || {};
  const counts = Storage.countEquipmentStates(map);
  elCountAll.textContent = String(counts.total);
  elCountRunning.textContent = String(counts.running);
  elCountStandby.textContent = String(counts.standby);
  elCountIgnore.textContent = String(counts.ignore);

  const search = (elSearchInput.value || '').trim().toLowerCase();
  const entries = Object.entries(map).filter(([tag, state]) => {
    if (activeFilter !== 'ALL' && state !== activeFilter) return false;
    if (search && !tag.toLowerCase().includes(search)) return false;
    return true;
  });

  if (entries.length === 0) {
    elEquipList.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Tidak ada tag equipment yang sesuai filter.';
    elEquipList.appendChild(empty);
    return;
  }

  const partnerOf = findPartnerMap(selectedOpId, map);
  const visibleLookup = new Map(entries);
  const renderedTags = new Set();
  const fragment = document.createDocumentFragment();

  for (const [tag, state] of entries) {
    if (renderedTags.has(tag)) continue;

    const partnerTag = partnerOf.get(tag);
    if (partnerTag && visibleLookup.has(partnerTag)) {
      renderedTags.add(tag);
      renderedTags.add(partnerTag);

      const pairGroup = document.createElement('div');
      pairGroup.className = 'equip-pair-group';

      const pairRows = document.createElement('div');
      pairRows.className = 'equip-pair-rows';
      pairRows.appendChild(buildSingleEquipRow(tag, state, null, true, isEditable));
      pairRows.appendChild(buildSingleEquipRow(partnerTag, visibleLookup.get(partnerTag), null, true, isEditable));

      const swapCol = document.createElement('div');
      swapCol.className = 'equip-pair-swap-col';
      swapCol.appendChild(createCompactSwapButton(tag, partnerTag, isEditable));

      pairGroup.appendChild(swapCol);
      pairGroup.appendChild(pairRows);
      fragment.appendChild(pairGroup);
    } else {
      renderedTags.add(tag);
      fragment.appendChild(buildSingleEquipRow(tag, state, partnerTag || null, false, isEditable));
    }
  }

  elEquipList.replaceChildren(fragment);
}

function renderAll(settings) {
  currentSettings = settings;
  const isDev = Boolean(settings.devMode);

  Storage.applyTheme(settings.theme);
  document.body.classList.toggle('is-dev', isDev);
  elDevToggle.checked = isDev;
  elDevBadge.classList.toggle('is-hidden', !isDev);
  renderThemeButton(settings.theme);

  renderKeywordControl(elSkipRunningSelect, elSkipRunningPills, settings.skipRunningKeywords, 'running', isDev);
  renderKeywordControl(elSkipStandbySelect, elSkipStandbyPills, settings.skipStandbyKeywords, 'standby', isDev);
  renderEquipmentList();
}

async function silentAutoPullOnOptionsOpen() {
  try {
    const res = await Storage.pullFromFirestore({ silent: true });
    if (res && res.settings) {
      renderAll(res.settings);
    }
  } catch (err) {
    // Keep cached data quietly on network failure
  }
}

async function addKeywordToGroup(groupKey, value) {
  if (!currentSettings.devMode) return;
  const clean = String(value || '').trim();
  if (!clean) return;
  const field = groupKey === 'running' ? 'skipRunningKeywords' : 'skipStandbyKeywords';
  const list = Array.isArray(currentSettings[field]) ? currentSettings[field].slice() : [];
  if (list.some((k) => k.toLowerCase() === clean.toLowerCase())) {
    showToast('Kata kunci "' + clean + '" sudah ada.', 'warning');
    return;
  }
  list.push(clean);
  const updated = await Storage.saveSettings({ [field]: list });
  renderAll(updated);

  try {
    await Storage.pushKeywordsToFirestore({
      skipRunningKeywords: updated.skipRunningKeywords,
      skipStandbyKeywords: updated.skipStandbyKeywords
    });
    showToast('Kata kunci "' + clean + '" ditambahkan & tersimpan ke Firestore.', 'success');
  } catch (err) {
    showToast(
      'Kata kunci "' + clean + '" disimpan lokal (gagal sync Firestore: ' +
      (err && err.message ? err.message : 'offline') + ').',
      'warning'
    );
  }
}

async function removeKeywordFromGroup(groupKey, value) {
  if (!currentSettings.devMode) return;
  const field = groupKey === 'running' ? 'skipRunningKeywords' : 'skipStandbyKeywords';
  const list = Array.isArray(currentSettings[field]) ? currentSettings[field] : [];
  const nextList = list.filter((k) => k.toLowerCase() !== String(value || '').toLowerCase());
  const updated = await Storage.saveSettings({ [field]: nextList });
  renderAll(updated);

  try {
    await Storage.pushKeywordsToFirestore({
      skipRunningKeywords: updated.skipRunningKeywords,
      skipStandbyKeywords: updated.skipStandbyKeywords
    });
    showToast('Kata kunci "' + value + '" dihapus & tersimpan ke Firestore.', 'info');
  } catch (err) {
    showToast(
      'Kata kunci "' + value + '" dihapus lokal (gagal sync Firestore: ' +
      (err && err.message ? err.message : 'offline') + ').',
      'warning'
    );
  }
}

function openRunningStatusChecker() {
  if (typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.create === 'function') {
    chrome.tabs.create({ url: RUNNING_STATUS_CHECKER_URL });
    return;
  }
  const link = document.createElement('a');
  link.href = RUNNING_STATUS_CHECKER_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function init() {
  renderStaticIcons();

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    const manifest = chrome.runtime.getManifest();
    if (manifest && manifest.version) {
      elVersion.textContent = 'v' + manifest.version;
      elFooterVer.textContent = 'v' + manifest.version;
    }
  }

  const urlParams = new URLSearchParams(window.location.search || '');
  const queryOp = urlParams.get('op');

  const initial = await Storage.getSettings();
  lastSyncedActiveOp = initial.activeOperator || 'op1';
  selectedOpId = Storage.VALID_OPERATOR_IDS.includes(queryOp) ? queryOp : lastSyncedActiveOp;
  renderAll(initial);

  silentAutoPullOnOptionsOpen();

  Storage.onChanged(function (updated) {
    if (updated && updated.activeOperator && updated.activeOperator !== lastSyncedActiveOp) {
      lastSyncedActiveOp = updated.activeOperator;
      selectedOpId = updated.activeOperator;
    }
    renderAll(updated);
  });

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (msg) {
      if (msg && msg.action === 'SCR_OPEN_OPERATOR_TAB' && Storage.VALID_OPERATOR_IDS.includes(msg.operatorId)) {
        selectedOpId = msg.operatorId;
        lastSyncedActiveOp = msg.operatorId;
        renderEquipmentList();
      }
    });
  }

  for (const tabBtn of elOpTabs) {
    tabBtn.addEventListener('click', function () {
      selectedOpId = tabBtn.getAttribute('data-op-tab') || 'op1';
      renderEquipmentList();
    });
  }

  elOpenRscBtn.addEventListener('click', openRunningStatusChecker);

  elDevToggle.addEventListener('change', async function () {
    const nextDev = Boolean(elDevToggle.checked);
    const updated = await Storage.saveSettings({ devMode: nextDev });
    renderAll(updated);
    showToast(nextDev ? 'Dev Mode aktif (mode edit terbuka).' : 'Dev Mode nonaktif (mode baca-saja).', 'info');
  });

  elThemeBtn.addEventListener('click', async function () {
    const nextTheme = currentSettings.theme === 'dark' ? 'light' : 'dark';
    const updated = await Storage.saveSettings({ theme: nextTheme });
    renderAll(updated);
    showToast('Tema diubah ke ' + (nextTheme === 'dark' ? 'Dark Mode' : 'Light Mode') + '.', 'info');
  });

  elSkipRunningSelect.addEventListener('change', function () {
    if (!elSkipRunningSelect.value) return;
    addKeywordToGroup('running', elSkipRunningSelect.value);
  });

  elSkipStandbySelect.addEventListener('change', function () {
    if (!elSkipStandbySelect.value) return;
    addKeywordToGroup('standby', elSkipStandbySelect.value);
  });

  document.addEventListener('click', function (e) {
    const removeBtn = e.target.closest('button.kw-pill-remove[data-kw-group][data-kw-value]');
    if (!removeBtn || removeBtn.disabled) return;
    removeKeywordFromGroup(
      removeBtn.getAttribute('data-kw-group'),
      removeBtn.getAttribute('data-kw-value')
    );
  });

  elSearchInput.addEventListener('input', renderEquipmentList);

  for (const pill of elFilterPills) {
    pill.addEventListener('click', function () {
      activeFilter = pill.getAttribute('data-filter') || 'ALL';
      for (const p of elFilterPills) {
        p.classList.toggle('is-active', p === pill);
      }
      renderEquipmentList();
    });
  }

  elEquipList.addEventListener('click', async function (e) {
    if (!currentSettings.devMode) return;

    const swapBtn = e.target.closest('button[data-swap-a][data-swap-b]');
    if (swapBtn && !swapBtn.disabled) {
      const tagA = swapBtn.getAttribute('data-swap-a');
      const tagB = swapBtn.getAttribute('data-swap-b');
      const currentMap = (currentSettings.operators && currentSettings.operators[selectedOpId]) || {};
      const stateA = currentMap[tagA] || 'RUNNING';
      const stateB = currentMap[tagB] || 'RUNNING';
      const nextMap = {
        ...currentMap,
        [tagA]: stateB,
        [tagB]: stateA
      };
      const updated = await Storage.saveOperatorMap(selectedOpId, nextMap);
      renderAll(updated);
      showToast('Status ditukar: ' + tagA + ' (' + stateB + ') / ' + tagB + ' (' + stateA + ')', 'success');
      return;
    }

    const btn = e.target.closest('button[data-tag][data-state]');
    if (!btn || btn.disabled) return;
    const tag = btn.getAttribute('data-tag');
    const nextState = btn.getAttribute('data-state');
    const currentMap = (currentSettings.operators && currentSettings.operators[selectedOpId]) || {};
    const nextMap = { ...currentMap, [tag]: nextState };
    const updated = await Storage.saveOperatorMap(selectedOpId, nextMap);
    renderAll(updated);
    showToast(tag + ' → ' + nextState, 'success');
  });
}

init();
