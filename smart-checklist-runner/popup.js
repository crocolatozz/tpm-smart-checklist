(function () {
  'use strict';

  const Icons = window.SCRIcons;
  const Storage = window.SCRStorage;

  const elVersion = document.getElementById('popup-version');
  const elThemeBtn = document.getElementById('theme-toggle-btn');
  const elOptionsBtn = document.getElementById('open-options-btn');
  const elRunningChip = document.getElementById('running-count-chip');
  const elStandbyChip = document.getElementById('standby-count-chip');
  const elScheduleFilter = document.getElementById('schedule-filter');
  const elDryRunBtn = document.getElementById('dry-run-btn');
  const elExecuteBtn = document.getElementById('execute-btn');
  const elSummaryStatus = document.getElementById('summary-status');

  const elStatScanned = document.getElementById('stat-scanned');
  const elStatMatched = document.getElementById('stat-matched');
  const elStatChecked = document.getElementById('stat-checked');
  const elStatAlready = document.getElementById('stat-already');
  const elStatSkipped = document.getElementById('stat-skipped');

  let currentSettings = Storage.createDefaultSettings();
  let isBusy = false;

  function renderButtonIcons(theme) {
    Icons.hydrateIcons(document);
    elThemeBtn.replaceChildren(Icons.createSvgIcon(theme === 'dark' ? 'sun' : 'moon', 15));
    elOptionsBtn.replaceChildren(Icons.createSvgIcon('settings', 15));

    elDryRunBtn.replaceChildren(Icons.createSvgIcon('eye', 14), document.createTextNode('Dry Run'));
    elExecuteBtn.replaceChildren(Icons.createSvgIcon('play', 14), document.createTextNode('Execute'));
  }

  function renderSettings(settings) {
    currentSettings = settings;
    Storage.applyTheme(settings.theme);
    renderButtonIcons(settings.theme);

    const counts = Storage.countEquipmentStates(settings.equipmentMap);
    elRunningChip.textContent = counts.running + ' Running';
    elStandbyChip.textContent = counts.standby + ' Standby';

    if (elScheduleFilter.value !== settings.lastFilter) {
      elScheduleFilter.value = settings.lastFilter || 'all';
    }
  }

  function setStatus(text, tone) {
    elSummaryStatus.textContent = text;
    elSummaryStatus.classList.remove('is-error', 'is-success', 'is-dry');
    if (tone === 'error') elSummaryStatus.classList.add('is-error');
    if (tone === 'success') elSummaryStatus.classList.add('is-success');
    if (tone === 'dry') elSummaryStatus.classList.add('is-dry');
  }

  function updateSummaryNumbers(res) {
    elStatScanned.textContent = String(res.totalScanned || 0);
    elStatMatched.textContent = String(res.matchedCount || 0);
    elStatChecked.textContent = String(res.newlyChecked || 0);
    elStatAlready.textContent = String(res.alreadyChecked || 0);
    elStatSkipped.textContent = String(res.skippedByRule || 0);
  }

  function setBusy(busy) {
    isBusy = busy;
    elDryRunBtn.disabled = busy;
    elExecuteBtn.disabled = busy;
    elScheduleFilter.disabled = busy;
  }

  function queryActiveTab() {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
        reject(new Error('API chrome.tabs tidak tersedia di mode standalone ini.'));
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (chrome.runtime && chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!tabs || tabs.length === 0) {
          reject(new Error('Tidak ada tab aktif yang ditemukan.'));
          return;
        }
        resolve(tabs[0]);
      });
    });
  }

  function injectContentScript(tabId) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.scripting || !chrome.scripting.executeScript) {
        reject(new Error('API chrome.scripting tidak tersedia.'));
        return;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ['content.js']
        },
        function (results) {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(results);
        }
      );
    });
  }

  function sendTabMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, function (response) {
        if (chrome.runtime && chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  async function triggerRun(isDryRun) {
    if (isBusy) return;
    setBusy(true);

    try {
      const settings = await Storage.getSettings();
      renderSettings(settings);

      const tab = await queryActiveTab();
      const tabUrl = tab.url || '';

      if (!Storage.matchesUrlPattern(tabUrl, settings.targetUrlPattern)) {
        setStatus(
          'URL tab aktif tidak cocok dengan pola target (' + settings.targetUrlPattern + ').',
          'error'
        );
        return;
      }

      setStatus(isDryRun ? 'Menjalankan Dry Run...' : 'Menjalankan Execute...', isDryRun ? 'dry' : '');

      await injectContentScript(tab.id);

      const scheduleFilter = elScheduleFilter.value || 'all';
      const response = await sendTabMessage(tab.id, {
        action: isDryRun ? 'SCR_DRY_RUN' : 'SCR_EXECUTE',
        payload: {
          scheduleFilter: scheduleFilter,
          equipmentMap: settings.equipmentMap,
          skipRunningKeywords: settings.skipRunningKeywords,
          skipStandbyKeywords: settings.skipStandbyKeywords,
          clickDelayMs: settings.clickDelayMs
        }
      });

      if (!response || !response.ok) {
        setStatus((response && response.error) || 'Gagal memproses tabel checklist.', 'error');
        return;
      }

      updateSummaryNumbers(response);

      if (isDryRun) {
        setStatus(
          'Dry Run selesai: ' + response.matchedCount + ' baris siap dicentang.',
          'dry'
        );
      } else {
        setStatus(
          'Execute selesai: ' + response.newlyChecked + ' item berhasil dicentang.',
          'success'
        );
      }

      await Storage.appendHistory({
        timestamp: new Date().toISOString(),
        mode: isDryRun ? 'Dry Run' : 'Execute',
        scheduleFilter: scheduleFilter,
        totalScanned: response.totalScanned,
        matchedCount: response.matchedCount,
        newlyChecked: response.newlyChecked,
        alreadyChecked: response.alreadyChecked,
        skippedByRule: response.skippedByRule
      });
    } catch (err) {
      setStatus(err && err.message ? err.message : 'Terjadi kesalahan saat eksekusi.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function init() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
      const manifest = chrome.runtime.getManifest();
      if (manifest && manifest.version) {
        elVersion.textContent = 'v' + manifest.version;
      }
    }

    const initial = await Storage.getSettings();
    renderSettings(initial);

    Storage.onChanged(function (updated) {
      renderSettings(updated);
    });

    elThemeBtn.addEventListener('click', async function () {
      const nextTheme = currentSettings.theme === 'dark' ? 'light' : 'dark';
      const updated = await Storage.saveSettings({ theme: nextTheme });
      renderSettings(updated);
    });

    elOptionsBtn.addEventListener('click', function () {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.location.href = './options.html';
      }
    });

    elScheduleFilter.addEventListener('change', async function () {
      await Storage.saveSettings({ lastFilter: elScheduleFilter.value });
    });

    elDryRunBtn.addEventListener('click', function () {
      triggerRun(true);
    });

    elExecuteBtn.addEventListener('click', function () {
      triggerRun(false);
    });
  }

  init();
})();
