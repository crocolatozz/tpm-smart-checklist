import { createSvgIcon, hydrateIcons } from './icons.js';
import { TPMStorage as Storage } from './storage.js';

const elVersion = document.getElementById('popup-version');
const elThemeBtn = document.getElementById('theme-toggle-btn');
const elOptionsBtn = document.getElementById('open-options-btn');
const elOpBtns = Array.from(document.querySelectorAll('.op-seg-btn[data-operator]'));
const elAreaLabel = document.getElementById('preset-area-label');
const elRunningChip = document.getElementById('running-count-chip');
const elStandbyChip = document.getElementById('standby-count-chip');
const elScheduleFilter = document.getElementById('schedule-filter');
const elAutoDetectShift = document.getElementById('auto-detect-shift');
const elIncludeEveryShift = document.getElementById('include-every-shift');
const elAutoShowAllRows = document.getElementById('auto-show-all-rows');
const elDryRunBtn = document.getElementById('dry-run-btn');
const elExecuteBtn = document.getElementById('execute-btn');
const elSummaryStatus = document.getElementById('summary-status');

const elStatScanned = document.getElementById('stat-scanned');
const elStatExecuted = document.getElementById('stat-executed');
const elStatNotExecuted = document.getElementById('stat-not-executed');
const elStatAlready = document.getElementById('stat-already');
const elStatUntouched = document.getElementById('stat-untouched');

let currentSettings = Storage.createDefaultSettings();
let isBusy = false;
let hasManualShiftOverride = false;

function renderButtonIcons(theme) {
  hydrateIcons(document);
  elThemeBtn.replaceChildren(createSvgIcon(theme === 'dark' ? 'sun' : 'moon', 15));
  elOptionsBtn.replaceChildren(createSvgIcon('settings', 15));

  elDryRunBtn.replaceChildren(createSvgIcon('eye', 14), document.createTextNode('Dry Run'));
  elExecuteBtn.replaceChildren(createSvgIcon('play', 14), document.createTextNode('Execute'));
}

function renderSettings(settings, isInitialBoot) {
  currentSettings = settings;
  Storage.applyTheme(settings.theme);
  renderButtonIcons(settings.theme);

  const opId = settings.activeOperator || 'op1';
  const preset = Storage.OPERATOR_PRESETS[opId] || Storage.OPERATOR_PRESETS.op1;
  const activeMap = (settings.operators && settings.operators[opId]) || {};

  for (const btn of elOpBtns) {
    const isSelected = btn.getAttribute('data-operator') === opId;
    btn.classList.toggle('is-active', isSelected);
    btn.setAttribute('aria-selected', String(isSelected));
  }

  elAreaLabel.textContent = preset.area;

  const counts = Storage.countEquipmentStates(activeMap);
  elRunningChip.textContent = counts.running + ' Running';
  elStandbyChip.textContent = counts.standby + ' Standby';

  elAutoDetectShift.checked = Boolean(settings.autoDetectShift);
  elIncludeEveryShift.checked = Boolean(settings.includeEveryShift);
  elAutoShowAllRows.checked = Boolean(settings.autoShowAllRows);

  if (isInitialBoot) {
    if (settings.autoDetectShift) {
      elScheduleFilter.value = Storage.detectActiveShiftByHour();
    } else {
      elScheduleFilter.value = settings.lastFilter || 'all';
    }
  } else if (!hasManualShiftOverride && !settings.autoDetectShift) {
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
  elStatExecuted.textContent = String(res.setToExecuted || 0);
  elStatNotExecuted.textContent = String(res.setToNotExecuted || 0);
  elStatAlready.textContent = String(res.alreadySet || 0);
  elStatUntouched.textContent = String(res.untouchedCount || 0);
}

function setBusy(busy) {
  isBusy = busy;
  elDryRunBtn.disabled = busy;
  elExecuteBtn.disabled = busy;
  elScheduleFilter.disabled = busy;
  elAutoDetectShift.disabled = busy;
  elIncludeEveryShift.disabled = busy;
  elAutoShowAllRows.disabled = busy;
  for (const btn of elOpBtns) {
    btn.disabled = busy;
  }
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
    renderSettings(settings, false);

    const tab = await queryActiveTab();
    const tabUrl = tab.url || '';

    if (!Storage.matchesUrlPattern(tabUrl, settings.targetUrlPattern)) {
      setStatus(
        'URL tab aktif tidak cocok dengan pola target (' + settings.targetUrlPattern + ').',
        'error'
      );
      return;
    }

    const opId = settings.activeOperator || 'op1';
    const preset = Storage.OPERATOR_PRESETS[opId] || Storage.OPERATOR_PRESETS.op1;
    const equipmentMap = (settings.operators && settings.operators[opId]) || {};

    setStatus(
      (isDryRun ? 'Menjalankan Dry Run (' : 'Menjalankan Execute (') + preset.label + ')...',
      isDryRun ? 'dry' : ''
    );

    await injectContentScript(tab.id);

    const scheduleFilter = elScheduleFilter.value || 'all';
    const includeEveryShift = Boolean(elIncludeEveryShift.checked);
    const autoShowAllRows = Boolean(elAutoShowAllRows.checked);

    const response = await sendTabMessage(tab.id, {
      action: isDryRun ? 'SCR_DRY_RUN' : 'SCR_EXECUTE',
      payload: {
        operatorId: opId,
        scheduleFilter: scheduleFilter,
        includeEveryShift: includeEveryShift,
        autoShowAllRows: autoShowAllRows,
        equipmentMap: equipmentMap,
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

    const expandedNote = response.expandedRows
      ? ' (tabel diperluas ke ' + response.expandedTo + ')'
      : '';

    const execCount = response.setToExecuted || 0;
    const notExecCount = response.setToNotExecuted || 0;

    if (isDryRun) {
      setStatus(
        'Dry Run (' + preset.label + '): ' + execCount + ' Executed, ' + notExecCount + ' Not Executed' + expandedNote + '.',
        'dry'
      );
    } else {
      setStatus(
        'Execute (' + preset.label + '): ' + execCount + ' Executed, ' + notExecCount + ' Not Executed' + expandedNote + '.',
        'success'
      );
    }

    await Storage.appendHistory({
      timestamp: new Date().toISOString(),
      operatorId: opId,
      operatorLabel: preset.label,
      mode: isDryRun ? 'Dry Run' : 'Execute',
      scheduleFilter: scheduleFilter,
      includeEveryShift: includeEveryShift,
      totalScanned: response.totalScanned,
      setToExecuted: execCount,
      setToNotExecuted: notExecCount,
      alreadySet: response.alreadySet || 0,
      untouchedCount: response.untouchedCount || 0
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
  renderSettings(initial, true);

  Storage.onChanged(function (updated) {
    renderSettings(updated, false);
  });

  for (const btn of elOpBtns) {
    btn.addEventListener('click', async function () {
      const nextOp = btn.getAttribute('data-operator');
      const updated = await Storage.saveSettings({ activeOperator: nextOp });
      renderSettings(updated, false);
    });
  }

  elThemeBtn.addEventListener('click', async function () {
    const nextTheme = currentSettings.theme === 'dark' ? 'light' : 'dark';
    const updated = await Storage.saveSettings({ theme: nextTheme });
    renderSettings(updated, false);
  });

  elOptionsBtn.addEventListener('click', function () {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.location.href = './options.html';
    }
  });

  elScheduleFilter.addEventListener('change', async function () {
    hasManualShiftOverride = true;
    await Storage.saveSettings({ lastFilter: elScheduleFilter.value });
  });

  elAutoDetectShift.addEventListener('change', async function () {
    const enabled = elAutoDetectShift.checked;
    if (enabled) {
      hasManualShiftOverride = false;
      elScheduleFilter.value = Storage.detectActiveShiftByHour();
    }
    await Storage.saveSettings({ autoDetectShift: enabled });
  });

  elIncludeEveryShift.addEventListener('change', async function () {
    await Storage.saveSettings({ includeEveryShift: elIncludeEveryShift.checked });
  });

  elAutoShowAllRows.addEventListener('change', async function () {
    await Storage.saveSettings({ autoShowAllRows: elAutoShowAllRows.checked });
  });

  elDryRunBtn.addEventListener('click', function () {
    triggerRun(true);
  });

  elExecuteBtn.addEventListener('click', function () {
    triggerRun(false);
  });
}

init();
