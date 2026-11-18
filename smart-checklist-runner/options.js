(function () {
  'use strict';

  const Icons = window.SCRIcons;
  const Storage = window.SCRStorage;

  const elVersion = document.getElementById('options-version');
  const elFooterVer = document.getElementById('options-footer-ver');
  const elSaveToast = document.getElementById('save-toast');
  const elThemeBtn = document.getElementById('options-theme-btn');

  const elSkipRunning = document.getElementById('skip-running-input');
  const elSkipStandby = document.getElementById('skip-standby-input');
  const elUrlPattern = document.getElementById('url-pattern-input');
  const elClickDelay = document.getElementById('click-delay-input');

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
  const elBulkCloseBtn = document.getElementById('bulk-close-btn');
  const elBulkCancelBtn = document.getElementById('bulk-cancel-btn');
  const elBulkApplyBtn = document.getElementById('bulk-apply-btn');
  const elBulkTextarea = document.getElementById('bulk-textarea');
  const elBulkDefaultState = document.getElementById('bulk-default-state');

  let currentSettings = Storage.createDefaultSettings();
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
      Icons.createSvgIcon(isDark ? 'sun' : 'moon', 14),
      document.createTextNode(isDark ? 'Light Mode' : 'Dark Mode')
    );
  }

  function renderStaticIcons() {
    Icons.hydrateIcons(document);
    elScrapeBtn.replaceChildren(Icons.createSvgIcon('scan', 14), document.createTextNode('Ambil Tag dari Tab Aktif'));
    elBulkPasteBtn.replaceChildren(Icons.createSvgIcon('plus', 14), document.createTextNode('+ Bulk Paste Tag'));
    elResetDefaultBtn.replaceChildren(Icons.createSvgIcon('rotate-ccw', 14), document.createTextNode('Reset 30 Tag Default'));
    elExportBtn.replaceChildren(Icons.createSvgIcon('download', 14), document.createTextNode('Export JSON'));
    elImportBtn.replaceChildren(Icons.createSvgIcon('upload', 14), document.createTextNode('Import JSON'));
    elClearHistoryBtn.replaceChildren(Icons.createSvgIcon('trash', 13), document.createTextNode('Bersihkan Riwayat'));
    elBulkCloseBtn.replaceChildren(Icons.createSvgIcon('x', 15));
  }

  function renderEquipmentList() {
    const map = currentSettings.equipmentMap || {};
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

    const fragment = document.createDocumentFragment();
    for (const [tag, state] of entries) {
      const row = document.createElement('div');
      row.className = 'equip-row';

      const tagSpan = document.createElement('span');
      tagSpan.className = 'equip-tag';
      tagSpan.textContent = tag;

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
      row.appendChild(tagSpan);
      row.appendChild(right);
      fragment.appendChild(row);
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

      const filterEl = document.createElement('span');
      filterEl.textContent = 'Filter: ' + (item.scheduleFilter || 'all');

      main.appendChild(timeEl);
      main.appendChild(modeEl);
      main.appendChild(filterEl);

      const statsEl = document.createElement('div');
      statsEl.className = 'history-stats';
      statsEl.textContent =
        'Scan ' + (item.totalScanned || 0) +
        ' · Cocok ' + (item.matchedCount || 0) +
        ' · Baru ' + (item.newlyChecked || 0) +
        ' · Sudah ' + (item.alreadyChecked || 0) +
        ' · Lewat ' + (item.skippedByRule || 0);

      row.appendChild(main);
      row.appendChild(statsEl);
      fragment.appendChild(row);
    }

    elHistoryList.replaceChildren(fragment);
  }

  function renderAll(settings) {
    currentSettings = settings;
    Storage.applyTheme(settings.theme);
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

    const initial = await Storage.getSettings();
    renderAll(initial);

    Storage.onChanged(function (updated) {
      renderAll(updated);
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
      const btn = e.target.closest('button[data-tag][data-state]');
      if (!btn) return;
      const tag = btn.getAttribute('data-tag');
      const nextState = btn.getAttribute('data-state');
      const nextMap = { ...currentSettings.equipmentMap, [tag]: nextState };
      const updated = await Storage.saveSettings({ equipmentMap: nextMap });
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
        const nextMap = { ...currentSettings.equipmentMap };
        let addedCount = 0;
        for (const tag of foundTags) {
          if (!Object.prototype.hasOwnProperty.call(nextMap, tag)) {
            nextMap[tag] = 'RUNNING';
            addedCount++;
          }
        }
        const updated = await Storage.saveSettings({ equipmentMap: nextMap });
        renderAll(updated);
        showEquipNotice(
          'Ditemukan ' + foundTags.length + ' tag unik di tab aktif (' + addedCount + ' tag baru ditambahkan).'
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
      const nextMap = { ...currentSettings.equipmentMap };
      let addedCount = 0;
      for (const tag of lines) {
        if (!Object.prototype.hasOwnProperty.call(nextMap, tag)) {
          addedCount++;
        }
        nextMap[tag] = defaultState;
      }

      const updated = await Storage.saveSettings({ equipmentMap: nextMap });
      renderAll(updated);
      closeBulkModal();
      showEquipNotice(lines.length + ' tag diproses (' + addedCount + ' tag baru) dengan status ' + defaultState + '.');
      showSavedToast('Bulk paste tersimpan');
    });

    elResetDefaultBtn.addEventListener('click', async function () {
      const updated = await Storage.resetEquipmentDefaults();
      renderAll(updated);
      showEquipNotice('Daftar equipment direset ke 30 tag default Operator 1 (semua RUNNING).');
      showSavedToast('Reset ke 30 tag default');
    });

    elExportBtn.addEventListener('click', function () {
      const payload = JSON.stringify(currentSettings, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-checklist-runner-config.json';
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
})();
