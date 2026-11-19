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

const elFsStatusBadge = document.getElementById('fs-status-badge');
const elFsLastSyncText = document.getElementById('fs-last-sync-text');
const elFsAutoPullToggle = document.getElementById('fs-auto-pull-toggle');
const elFsProjectIdInput = document.getElementById('fs-project-id-input');
const elFsPullBtn = document.getElementById('fs-pull-btn');
const elFsPushBtn = document.getElementById('fs-push-btn');
const elPushConfirmPanel = document.getElementById('push-confirm-panel');
const elPushCancelBtn = document.getElementById('push-cancel-btn');
const elPushConfirmBtn = document.getElementById('push-confirm-btn');
const elUrlPattern = document.getElementById('url-pattern-input');
const elClickDelay = document.getElementById('click-delay-input');

const elOpTabs = Array.from(document.querySelectorAll('.op-tab-btn[data-op-tab]'));
const elOp1Total = document.getElementById('op1-total');
const elOp2Total = document.getElementById('op2-total');
const elOp3Total = document.getElementById('op3-total');

const elSearchInput = document.getElementById('equip-search-input');
const elScrapeBtn = document.getElementById('scrape-tab-btn');
const elBulkPasteBtn = document.getElementById('bulk-paste-btn');
const elResetDefaultBtn = document.getElementById('reset-default-btn');
const elEquipList = document.getElementById('equip-list');
const elFilterPills = Array.from(document.querySelectorAll('.pill-btn[data-filter]'));

const elCountAll = document.getElementById('count-all');
const elCountRunning = document.getElementById('count-running');
const elCountStandby = document.getElementById('count-standby');
const elCountIgnore = document.getElementById('count-ignore');

const elClearHistoryBtn = document.getElementById('clear-history-btn');
const elHistoryList = document.getElementById('history-list');

const elBulkModal = document.getElementById('bulk-modal');
const elBulkModalDesc = document.getElementById('bulk-modal-desc');
const elBulkCloseBtn = document.getElementById('bulk-close-btn');
const elBulkCancelBtn = document.getElementById('bulk-cancel-btn');
const elBulkApplyBtn = document.getElementById('bulk-apply-btn');
const elBulkTextarea = document.getElementById('bulk-textarea');
const elBulkDefaultState = document.getElementById('bulk-default-state');
const elToastContainer = document.getElementById('toast-container');

let currentSettings = Storage.createDefaultSettings();
let selectedOpId = 'op1';
let lastSyncedActiveOp = 'op1';
let activeFilter = 'ALL';
let isSyncBusy = false;

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
  elDevBadge.replaceChildren(createSvgIcon('bug', 11), document.createTextNode('DEV'));
  elOpenRscBtn.replaceChildren(
    createSvgIcon('external-link', 14),
    document.createTextNode('Buka Running Status Checker')
  );
  elScrapeBtn.replaceChildren(createSvgIcon('scan', 14), document.createTextNode('Ambil Tag dari Tab Aktif'));
  elBulkPasteBtn.replaceChildren(createSvgIcon('plus', 14), document.createTextNode('Bulk Paste Tag'));
  elResetDefaultBtn.replaceChildren(createSvgIcon('rotate-ccw', 14), document.createTextNode('Reset Default Operator Ini'));
  elFsPullBtn.replaceChildren(createSvgIcon('cloud-download', 14), document.createTextNode('Ambil Data (Pull)'));
  elFsPushBtn.replaceChildren(createSvgIcon('cloud-upload', 14), document.createTextNode('Simpan ke DB (Push)'));
  elClearHistoryBtn.replaceChildren(createSvgIcon('trash', 13), document.createTextNode('Bersihkan Riwayat'));
  elBulkCloseBtn.replaceChildren(createSvgIcon('x', 15));
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

function renderSyncSection(settings) {
  if (document.activeElement !== elFsProjectIdInput) {
    elFsProjectIdInput.value = settings.firestoreProjectId || Storage.DEFAULT_FIRESTORE_PROJECT_ID;
  }
  elFsAutoPullToggle.checked = Boolean(settings.autoPullOnOpen);

  elFsStatusBadge.classList.remove('is-synced', 'is-offline', 'is-error');
  if (settings.syncStatus === 'synced') {
    elFsStatusBadge.classList.add('is-synced');
    elFsStatusBadge.textContent = 'Terhubung · Synced';
  } else if (settings.syncStatus === 'error') {
    elFsStatusBadge.classList.add('is-error');
    elFsStatusBadge.textContent = 'Gagal Sync (Cache Lokal Aktif)';
  } else {
    elFsStatusBadge.classList.add('is-offline');
    elFsStatusBadge.textContent = 'Cache Lokal';
  }

  elFsLastSyncText.textContent = settings.lastSyncAt
    ? 'Sinkron terakhir: ' + formatTimestamp(settings.lastSyncAt)
    : 'Belum pernah sinkronisasi';
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

function formatTimestamp(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (err) {
    return String(iso || '');
  }
}

function renderHistory() {
  const history = currentSettings.executionHistory || [];
  if (history.length === 0) {
    elHistoryList.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Belum ada riwayat eksekusi.';
    elHistoryList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of history) {
    const row = document.createElement('div');
    row.className = 'history-row';

    const main = document.createElement('div');
    main.className = 'history-main';

    const timeEl = document.createElement('span');
    timeEl.className = 'history-time';
    timeEl.textContent = formatTimestamp(item.timestamp);

    const modeEl = document.createElement('span');
    const isDry = item.mode === 'Dry Run';
    modeEl.className = 'history-mode ' + (isDry ? 'is-dry' : 'is-exec');
    modeEl.textContent = isDry ? 'DRY RUN' : 'EXECUTE';

    const opEl = document.createElement('span');
    opEl.className = 'history-op';
    opEl.textContent = item.operatorLabel || 'Operator 1';

    const filterEl = document.createElement('span');
    filterEl.textContent = 'Shift: ' + (item.scheduleFilter || 'all');

    main.appendChild(timeEl);
    main.appendChild(modeEl);
    main.appendChild(opEl);
    main.appendChild(filterEl);

    const statsEl = document.createElement('div');
    statsEl.className = 'history-stats';
    if (Object.prototype.hasOwnProperty.call(item, 'setToExecuted')) {
      const remNote = typeof item.remainingUnset === 'number'
        ? ' · Sisa Unset ' + item.remainingUnset
        : '';
      statsEl.textContent =
        'Scan ' + (item.totalScanned || 0) +
        ' · Exec ' + (item.setToExecuted || 0) +
        ' · NotExec ' + (item.setToNotExecuted || 0) +
        ' · Sudah ' + (item.alreadySet || 0) +
        ' · Lewat ' + (item.untouchedCount || 0) +
        remNote;
    } else {
      statsEl.textContent =
        'Scan ' + (item.totalScanned || 0) +
        ' · Cocok ' + (item.matchedCount || 0) +
        ' · Baru ' + (item.newlyChecked || 0) +
        ' · Sudah ' + (item.alreadyChecked || 0) +
        ' · Lewat ' + (item.skippedByRule || 0);
    }

    row.appendChild(main);
    row.appendChild(statsEl);
    fragment.appendChild(row);
  }

  elHistoryList.replaceChildren(fragment);
}

function renderAll(settings) {
  currentSettings = settings;
  const isDev = Boolean(settings.devMode);

  Storage.applyTheme(settings.theme);
  document.body.classList.toggle('is-dev', isDev);
  elDevToggle.checked = isDev;
  elDevBadge.classList.toggle('is-hidden', !isDev);
  if (!isDev) {
    elPushConfirmPanel.classList.add('is-hidden');
  }
  renderThemeButton(settings.theme);

  renderKeywordControl(elSkipRunningSelect, elSkipRunningPills, settings.skipRunningKeywords, 'running', isDev);
  renderKeywordControl(elSkipStandbySelect, elSkipStandbyPills, settings.skipStandbyKeywords, 'standby', isDev);
  renderSyncSection(settings);

  if (document.activeElement !== elUrlPattern) {
    elUrlPattern.value = settings.targetUrlPattern;
  }
  if (document.activeElement !== elClickDelay) {
    elClickDelay.value = String(settings.clickDelayMs);
  }

  renderEquipmentList();
  renderHistory();
}

function scrapeTagsInPage() {
  const cells = document.querySelectorAll('tr[data-task-id] td:nth-child(1)');
  const seen = new Set();
  const tags = [];
  for (const cell of cells) {
    const parts = [];
    for (const node of cell.childNodes) {
      if (node.nodeType === 3) {
        const t = node.textContent.trim();
        if (t) parts.push(t);
      }
    }
    const tag = parts.join(' ').trim();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

function scrapeActiveTabTags() {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
      reject(new Error('API chrome.tabs/scripting tidak tersedia di mode ini.'));
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs || tabs.length === 0) {
        reject(new Error('Tab aktif tidak ditemukan.'));
        return;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: scrapeTagsInPage
        },
        function (results) {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          const first = Array.isArray(results) && results[0] ? results[0].result : [];
          resolve(Array.isArray(first) ? first : []);
        }
      );
    });
  });
}

function openBulkModal() {
  if (!currentSettings.devMode) return;
  const preset = EQUIPMENT_DB[selectedOpId] || EQUIPMENT_DB.op1;
  elBulkModalDesc.textContent =
    'Tempel daftar tag (satu tag per baris) untuk ditambahkan ke ' + preset.label + '.';
  elBulkTextarea.value = '';
  elBulkModal.classList.remove('is-hidden');
  elBulkTextarea.focus();
}

function closeBulkModal() {
  elBulkModal.classList.add('is-hidden');
}

function setFirestoreSyncBusy(busy) {
  isSyncBusy = busy;
  elFsPullBtn.disabled = busy;
  elFsPushBtn.disabled = busy;
  elPushConfirmBtn.disabled = busy;
  elPushCancelBtn.disabled = busy;
}

async function handlePullFromFirestore(isSilentAuto) {
  if (isSyncBusy) return;
  setFirestoreSyncBusy(true);
  try {
    const projectId = elFsProjectIdInput.value.trim() || currentSettings.firestoreProjectId;
    const res = await Storage.pullFromFirestore({
      projectId: projectId,
      silent: Boolean(isSilentAuto)
    });
    renderAll(res.settings);
    if (res.remoteUnitCount === 0) {
      showToast('Firestore kosong (0 unit), status lokal dipertahankan.', 'warning');
    } else {
      showToast(
        isSilentAuto
          ? 'Auto-Pull Firestore berhasil (' + res.remoteUnitCount + ' unit).'
          : 'Data berhasil ditarik dari Firestore (' + res.remoteUnitCount + ' unit).',
        'success'
      );
    }
  } catch (err) {
    const refreshed = await Storage.getSettings();
    renderAll(refreshed);
    showToast(
      err && err.message ? err.message : 'Gagal menarik data dari Cloud Firestore.',
      isSilentAuto ? 'warning' : 'error'
    );
  } finally {
    setFirestoreSyncBusy(false);
  }
}

async function handlePushToFirestoreConfirmed() {
  if (isSyncBusy || !currentSettings.devMode) return;
  setFirestoreSyncBusy(true);
  try {
    const projectId = elFsProjectIdInput.value.trim() || currentSettings.firestoreProjectId;
    const res = await Storage.pushToFirestore({ projectId: projectId });
    elPushConfirmPanel.classList.add('is-hidden');
    renderAll(res.settings);
    showToast('Berhasil menyimpan ' + res.pushedUnitCount + ' unit & kata kunci ke Firestore.', 'success');
  } catch (err) {
    const refreshed = await Storage.getSettings();
    renderAll(refreshed);
    showToast(
      err && err.message ? err.message : 'Gagal mengirim data ke Cloud Firestore.',
      'error'
    );
  } finally {
    setFirestoreSyncBusy(false);
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
  showToast('Kata kunci "' + clean + '" ditambahkan.', 'success');
}

async function removeKeywordFromGroup(groupKey, value) {
  if (!currentSettings.devMode) return;
  const field = groupKey === 'running' ? 'skipRunningKeywords' : 'skipStandbyKeywords';
  const list = Array.isArray(currentSettings[field]) ? currentSettings[field] : [];
  const nextList = list.filter((k) => k.toLowerCase() !== String(value || '').toLowerCase());
  const updated = await Storage.saveSettings({ [field]: nextList });
  renderAll(updated);
  showToast('Kata kunci "' + value + '" dihapus.', 'info');
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

  if (initial.autoPullOnOpen) {
    handlePullFromFirestore(true);
  }

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

  let fieldSaveTimer = null;
  function scheduleFieldSave() {
    if (fieldSaveTimer) clearTimeout(fieldSaveTimer);
    fieldSaveTimer = setTimeout(async function () {
      const delayVal = Number(elClickDelay.value);
      const updated = await Storage.saveSettings({
        firestoreProjectId: elFsProjectIdInput.value.trim() || Storage.DEFAULT_FIRESTORE_PROJECT_ID,
        targetUrlPattern: elUrlPattern.value.trim() || '*',
        clickDelayMs: Number.isFinite(delayVal) && delayVal >= 0 ? delayVal : 150
      });
      currentSettings = updated;
      showToast('Konfigurasi teknis disimpan.', 'info');
    }, 300);
  }

  elFsProjectIdInput.addEventListener('input', scheduleFieldSave);
  elUrlPattern.addEventListener('input', scheduleFieldSave);
  elClickDelay.addEventListener('input', scheduleFieldSave);

  elFsAutoPullToggle.addEventListener('change', async function () {
    const updated = await Storage.saveSettings({ autoPullOnOpen: Boolean(elFsAutoPullToggle.checked) });
    renderAll(updated);
    showToast(
      updated.autoPullOnOpen ? 'Auto-Ambil saat Popup Dibuka aktif.' : 'Auto-Ambil saat Popup Dibuka dimatikan.',
      'info'
    );
  });

  elFsPullBtn.addEventListener('click', function () {
    elPushConfirmPanel.classList.add('is-hidden');
    handlePullFromFirestore(false);
  });

  elFsPushBtn.addEventListener('click', function () {
    if (!currentSettings.devMode || isSyncBusy) return;
    elPushConfirmPanel.classList.remove('is-hidden');
  });

  elPushCancelBtn.addEventListener('click', function () {
    elPushConfirmPanel.classList.add('is-hidden');
  });

  elPushConfirmBtn.addEventListener('click', function () {
    handlePushToFirestoreConfirmed();
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

  elScrapeBtn.addEventListener('click', async function () {
    if (!currentSettings.devMode) return;
    try {
      const foundTags = await scrapeActiveTabTags();
      if (foundTags.length === 0) {
        showToast('Tidak ditemukan baris tr[data-task-id] pada tab aktif.', 'warning');
        return;
      }
      const currentMap = (currentSettings.operators && currentSettings.operators[selectedOpId]) || {};
      const nextMap = { ...currentMap };
      let addedCount = 0;
      for (const tag of foundTags) {
        if (!Object.prototype.hasOwnProperty.call(nextMap, tag)) {
          nextMap[tag] = 'RUNNING';
          addedCount++;
        }
      }
      const preset = EQUIPMENT_DB[selectedOpId] || EQUIPMENT_DB.op1;
      const updated = await Storage.saveOperatorMap(selectedOpId, nextMap);
      renderAll(updated);
      showToast(
        'Ditemukan ' + foundTags.length + ' tag (' + addedCount + ' baru ke ' + preset.label + ').',
        'success'
      );
    } catch (err) {
      showToast(err && err.message ? err.message : 'Gagal mengambil tag dari tab aktif.', 'error');
    }
  });

  elBulkPasteBtn.addEventListener('click', openBulkModal);
  elBulkCloseBtn.addEventListener('click', closeBulkModal);
  elBulkCancelBtn.addEventListener('click', closeBulkModal);

  elBulkApplyBtn.addEventListener('click', async function () {
    if (!currentSettings.devMode) return;
    const lines = elBulkTextarea.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      closeBulkModal();
      return;
    }

    const defaultState = elBulkDefaultState.value || 'RUNNING';
    const currentMap = (currentSettings.operators && currentSettings.operators[selectedOpId]) || {};
    const nextMap = { ...currentMap };
    let addedCount = 0;
    for (const tag of lines) {
      if (!Object.prototype.hasOwnProperty.call(nextMap, tag)) {
        addedCount++;
      }
      nextMap[tag] = defaultState;
    }

    const updated = await Storage.saveOperatorMap(selectedOpId, nextMap);
    renderAll(updated);
    closeBulkModal();
    showToast(lines.length + ' tag diproses (' + addedCount + ' baru) → ' + defaultState + '.', 'success');
  });

  elResetDefaultBtn.addEventListener('click', async function () {
    if (!currentSettings.devMode) return;
    const preset = EQUIPMENT_DB[selectedOpId] || EQUIPMENT_DB.op1;
    const updated = await Storage.resetOperatorDefaults(selectedOpId);
    renderAll(updated);
    showToast(preset.label + ' direset ke ' + preset.equipments.length + ' unit default.', 'warning');
  });

  elClearHistoryBtn.addEventListener('click', async function () {
    const updated = await Storage.clearHistory();
    renderAll(updated);
    showToast('Riwayat eksekusi dibersihkan.', 'info');
  });
}

init();
