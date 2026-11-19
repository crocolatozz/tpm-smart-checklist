import { createSvgIcon, hydrateIcons } from './icons.js';
import { TPMStorage as Storage } from './storage.js';
import { EQUIPMENT_DB } from './equipment-db.js';

const elVersion = document.getElementById('options-version');
const elDebugBadge = document.getElementById('options-debug-badge');
const elDebugToggle = document.getElementById('debug-mode-toggle');
const elFooterVer = document.getElementById('options-footer-ver');
const elSaveToast = document.getElementById('save-toast');
const elThemeBtn = document.getElementById('options-theme-btn');

const elSkipRunning = document.getElementById('skip-running-input');
const elSkipStandby = document.getElementById('skip-standby-input');
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
const elEquipStatusMsg = document.getElementById('equip-status-msg');
const elEquipList = document.getElementById('equip-list');
const elFilterPills = Array.from(document.querySelectorAll('.pill-btn[data-filter]'));

const elCountAll = document.getElementById('count-all');
const elCountRunning = document.getElementById('count-running');
const elCountStandby = document.getElementById('count-standby');
const elCountIgnore = document.getElementById('count-ignore');

const elExportBtn = document.getElementById('export-json-btn');
const elImportBtn = document.getElementById('import-json-btn');
const elImportFile = document.getElementById('import-file-input');
const elClearHistoryBtn = document.getElementById('clear-history-btn');
const elHistoryList = document.getElementById('history-list');

const elBulkModal = document.getElementById('bulk-modal');
const elBulkModalDesc = document.getElementById('bulk-modal-desc');
const elBulkCloseBtn = document.getElementById('bulk-close-btn');
const elBulkCancelBtn = document.getElementById('bulk-cancel-btn');
const elBulkApplyBtn = document.getElementById('bulk-apply-btn');
const elBulkTextarea = document.getElementById('bulk-textarea');
const elBulkDefaultState = document.getElementById('bulk-default-state');

let currentSettings = Storage.createDefaultSettings();
let selectedOpId = 'op1';
let lastSyncedActiveOp = 'op1';
let activeFilter = 'ALL';
let toastTimer = null;

function showSavedToast(label) {
  elSaveToast.textContent = label || 'Tersimpan';
  elSaveToast.classList.add('is-visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    elSaveToast.classList.remove('is-visible');
  }, 1600);
}

function showEquipNotice(text) {
  elEquipStatusMsg.textContent = text;
  elEquipStatusMsg.classList.remove('is-hidden');
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
  elDebugBadge.replaceChildren(createSvgIcon('bug', 11), document.createTextNode('DEBUG'));
  elScrapeBtn.replaceChildren(createSvgIcon('scan', 14), document.createTextNode('Ambil Tag dari Tab Aktif'));
  elBulkPasteBtn.replaceChildren(createSvgIcon('plus', 14), document.createTextNode('+ Bulk Paste Tag'));
  elResetDefaultBtn.replaceChildren(createSvgIcon('rotate-ccw', 14), document.createTextNode('Reset Default Operator Ini'));
  elExportBtn.replaceChildren(createSvgIcon('download', 14), document.createTextNode('Export JSON'));
  elImportBtn.replaceChildren(createSvgIcon('upload', 14), document.createTextNode('Import JSON'));
  elClearHistoryBtn.replaceChildren(createSvgIcon('trash', 13), document.createTextNode('Bersihkan Riwayat'));
  elBulkCloseBtn.replaceChildren(createSvgIcon('x', 15));
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

function createCompactSwapButton(tagA, tagB) {
  const swapBtn = document.createElement('button');
  swapBtn.type = 'button';
  swapBtn.className = 'btn-swap-icon';
  swapBtn.title = 'Swap A ↔ B (' + tagA + ' ↔ ' + tagB + ')';
  swapBtn.setAttribute('aria-label', 'Swap ' + tagA + ' dan ' + tagB);
  swapBtn.setAttribute('data-swap-a', tagA);
  swapBtn.setAttribute('data-swap-b', tagB);
  swapBtn.appendChild(createSvgIcon('swap', 14));
  return swapBtn;
}

function buildSingleEquipRow(tag, state, inlinePartnerTag, omitGutter) {
  const row = document.createElement('div');
  row.className = 'equip-row';

  const left = document.createElement('div');
  left.className = 'equip-row-left';

  if (!omitGutter) {
    if (inlinePartnerTag) {
      const gutter = document.createElement('span');
      gutter.className = 'equip-gutter';
      gutter.appendChild(createCompactSwapButton(tag, inlinePartnerTag));
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
      pairRows.appendChild(buildSingleEquipRow(tag, state, null, true));
      pairRows.appendChild(buildSingleEquipRow(partnerTag, visibleLookup.get(partnerTag), null, true));

      const swapCol = document.createElement('div');
      swapCol.className = 'equip-pair-swap-col';
      swapCol.appendChild(createCompactSwapButton(tag, partnerTag));

      pairGroup.appendChild(swapCol);
      pairGroup.appendChild(pairRows);
      fragment.appendChild(pairGroup);
    } else {
      renderedTags.add(tag);
      fragment.appendChild(buildSingleEquipRow(tag, state, partnerTag || null, false));
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
  const isDebug = Boolean(settings.debugMode);

  Storage.applyTheme(settings.theme);
  document.body.classList.toggle('is-debug', isDebug);
  elDebugToggle.checked = isDebug;
  elDebugBadge.classList.toggle('is-hidden', !isDebug);
  renderThemeButton(settings.theme);

  if (document.activeElement !== elSkipRunning) {
    elSkipRunning.value = settings.skipRunningKeywords;
  }
  if (document.activeElement !== elSkipStandby) {
    elSkipStandby.value = settings.skipStandbyKeywords;
  }
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
        elEquipStatusMsg.classList.add('is-hidden');
        renderEquipmentList();
      }
    });
  }

  for (const tabBtn of elOpTabs) {
    tabBtn.addEventListener('click', function () {
      selectedOpId = tabBtn.getAttribute('data-op-tab') || 'op1';
      elEquipStatusMsg.classList.add('is-hidden');
      renderEquipmentList();
    });
  }

  elDebugToggle.addEventListener('change', async function () {
    const nextDebug = Boolean(elDebugToggle.checked);
    const updated = await Storage.saveSettings({ debugMode: nextDebug });
    renderAll(updated);
    showSavedToast(nextDebug ? 'Debug Mode ON' : 'Debug Mode OFF');
  });

  elThemeBtn.addEventListener('click', async function () {
    const nextTheme = currentSettings.theme === 'dark' ? 'light' : 'dark';
    const updated = await Storage.saveSettings({ theme: nextTheme });
    renderAll(updated);
    showSavedToast('Tema diperbarui');
  });

  let textSaveTimer = null;
  function scheduleFieldSave() {
    if (textSaveTimer) clearTimeout(textSaveTimer);
    textSaveTimer = setTimeout(async function () {
      const delayVal = Number(elClickDelay.value);
      const updated = await Storage.saveSettings({
        skipRunningKeywords: elSkipRunning.value,
        skipStandbyKeywords: elSkipStandby.value,
        targetUrlPattern: elUrlPattern.value.trim() || '*',
        clickDelayMs: Number.isFinite(delayVal) && delayVal >= 0 ? delayVal : 150
      });
      currentSettings = updated;
      showSavedToast('Pengaturan tersimpan');
    }, 250);
  }

  elSkipRunning.addEventListener('input', scheduleFieldSave);
  elSkipStandby.addEventListener('input', scheduleFieldSave);
  elUrlPattern.addEventListener('input', scheduleFieldSave);
  elClickDelay.addEventListener('input', scheduleFieldSave);

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
    const swapBtn = e.target.closest('button[data-swap-a][data-swap-b]');
    if (swapBtn) {
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
      showSavedToast(tagA + ' → ' + stateB + ' | ' + tagB + ' → ' + stateA);
      showEquipNotice('Status pasangan ditukar: ' + tagA + ' (' + stateB + ') ↔ ' + tagB + ' (' + stateA + ').');
      return;
    }

    const btn = e.target.closest('button[data-tag][data-state]');
    if (!btn) return;
    const tag = btn.getAttribute('data-tag');
    const nextState = btn.getAttribute('data-state');
    const currentMap = (currentSettings.operators && currentSettings.operators[selectedOpId]) || {};
    const nextMap = { ...currentMap, [tag]: nextState };
    const updated = await Storage.saveOperatorMap(selectedOpId, nextMap);
    renderAll(updated);
    showSavedToast(tag + ' → ' + nextState);
  });

  elScrapeBtn.addEventListener('click', async function () {
    try {
      const foundTags = await scrapeActiveTabTags();
      if (foundTags.length === 0) {
        showEquipNotice('Tidak ditemukan baris tr[data-task-id] pada tab aktif.');
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
      showEquipNotice(
        'Ditemukan ' + foundTags.length + ' tag unik di tab aktif (' + addedCount + ' tag baru ditambahkan ke ' + preset.label + ').'
      );
      showSavedToast('Tag tab aktif dimuat');
    } catch (err) {
      showEquipNotice(err && err.message ? err.message : 'Gagal mengambil tag dari tab aktif.');
    }
  });

  elBulkPasteBtn.addEventListener('click', openBulkModal);
  elBulkCloseBtn.addEventListener('click', closeBulkModal);
  elBulkCancelBtn.addEventListener('click', closeBulkModal);

  elBulkApplyBtn.addEventListener('click', async function () {
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
    showEquipNotice(lines.length + ' tag diproses (' + addedCount + ' tag baru) dengan status ' + defaultState + '.');
    showSavedToast('Bulk paste tersimpan');
  });

  elResetDefaultBtn.addEventListener('click', async function () {
    const preset = EQUIPMENT_DB[selectedOpId] || EQUIPMENT_DB.op1;
    const updated = await Storage.resetOperatorDefaults(selectedOpId);
    renderAll(updated);
    showEquipNotice(
      'Daftar equipment ' + preset.label + ' direset ke ' + preset.equipments.length + ' tag default (semua RUNNING).'
    );
    showSavedToast('Reset ' + preset.label);
  });

  elExportBtn.addEventListener('click', function () {
    const payload = JSON.stringify(currentSettings, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tpm-smart-checklist-config.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showSavedToast('JSON diekspor');
  });

  elImportBtn.addEventListener('click', function () {
    elImportFile.click();
  });

  elImportFile.addEventListener('change', async function () {
    const file = elImportFile.files && elImportFile.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = Storage.normalizeState(parsed);
      const updated = await Storage.saveSettings(normalized);
      renderAll(updated);
      showSavedToast('Konfigurasi JSON diimpor');
    } catch (err) {
      showEquipNotice('File JSON tidak valid: ' + (err && err.message ? err.message : 'Format salah'));
    } finally {
      elImportFile.value = '';
    }
  });

  elClearHistoryBtn.addEventListener('click', async function () {
    const updated = await Storage.clearHistory();
    renderAll(updated);
    showSavedToast('Riwayat dibersihkan');
  });
}

init();
