import { createSvgIcon, hydrateIcons } from './icons.js';
import { TPMStorage as Storage } from './storage.js';

const elVersion = document.getElementById('popup-version');
const elDebugBadge = document.getElementById('popup-debug-badge');
const elThemeBtn = document.getElementById('theme-toggle-btn');
const elOptionsBtn = document.getElementById('open-options-btn');

const elContextCard = document.getElementById('context-card');
const elCtxPageBadge = document.getElementById('ctx-page-badge');
const elCtxDateVal = document.getElementById('ctx-date-val');
const elGuardHint = document.getElementById('execute-guard-hint');

const elOpBtns = Array.from(document.querySelectorAll('.op-seg-btn[data-operator]'));
const elOperatorLabel = document.getElementById('preset-operator-label');
const elRunningChip = document.getElementById('running-count-chip');
const elStandbyChip = document.getElementById('standby-count-chip');
const elScheduleFilter = document.getElementById('schedule-filter');
const elAutoDetectShift = document.getElementById('auto-detect-shift');
const elIncludeEveryShift = document.getElementById('include-every-shift');
const elAutoShowAllRows = document.getElementById('auto-show-all-rows');
const elDryRunBtn = document.getElementById('dry-run-btn');
const elClearDryRunBtn = document.getElementById('clear-dry-run-btn');
const elExecuteBtn = document.getElementById('execute-btn');
const elProgressWrap = document.getElementById('exec-progress-wrap');
const elProgressText = document.getElementById('exec-progress-text');
const elProgressBar = document.getElementById('exec-progress-bar');
const elSummaryBox = document.getElementById('summary-box');
const elSummaryStatus = document.getElementById('summary-status');

const elStatScanned = document.getElementById('stat-scanned');
const elStatExecuted = document.getElementById('stat-executed');
const elStatNotExecuted = document.getElementById('stat-not-executed');
const elStatAlready = document.getElementById('stat-already');
const elStatUntouched = document.getElementById('stat-untouched');
const elStatRemainingUnset = document.getElementById('stat-remaining-unset');

let currentSettings = Storage.createDefaultSettings();
let pageContext = {
  isValidPage: false,
  operatorKey: null,
  operatorLabel: null,
  rawAreaLabel: '',
  activeDateFormatted: '-',
  activeDateISO: ''
};
let isBusy = false;
let hasManualShiftOverride = false;

function renderButtonIcons(theme) {
  hydrateIcons(document);
  elThemeBtn.replaceChildren(createSvgIcon(theme === 'dark' ? 'sun' : 'moon', 15));
  elOptionsBtn.replaceChildren(createSvgIcon('settings', 15));
  elDebugBadge.replaceChildren(createSvgIcon('bug', 11), document.createTextNode('DEBUG'));

  elDryRunBtn.replaceChildren(createSvgIcon('eye', 14), document.createTextNode('Dry Run'));
  elClearDryRunBtn.replaceChildren(createSvgIcon('x', 13), document.createTextNode('Clear'));
  elExecuteBtn.replaceChildren(createSvgIcon('play', 14), document.createTextNode('Execute'));
}

function updateExecuteAvailability() {
  const isDebug = Boolean(currentSettings.debugMode);
  const blockedByGuard = !isDebug && !pageContext.isValidPage;

  elExecuteBtn.disabled = isBusy || blockedByGuard;
  elGuardHint.classList.toggle('is-hidden', !blockedByGuard);
}

function renderPageContext() {
  const valid = Boolean(pageContext && pageContext.isValidPage && pageContext.operatorLabel);

  elContextCard.classList.toggle('is-valid', valid);
  elContextCard.classList.toggle('is-invalid', !valid);

  elCtxPageBadge.classList.toggle('is-valid', valid);
  elCtxPageBadge.classList.toggle('is-warn', !valid);

  if (valid) {
    elCtxPageBadge.replaceChildren(
      createSvgIcon('check-circle', 12),
      document.createTextNode(pageContext.operatorLabel)
    );
  } else {
    elCtxPageBadge.replaceChildren(
      createSvgIcon('alert-triangle', 12),
      document.createTextNode('Di luar halaman Operator 1–3')
    );
  }

  const dateText = (pageContext && pageContext.activeDateFormatted) || '-';
  elCtxDateVal.replaceChildren(
    createSvgIcon('calendar', 12),
    document.createTextNode(dateText)
  );

  updateExecuteAvailability();
}

function renderSettings(settings, isInitialBoot) {
  currentSettings = settings;
  const isDebug = Boolean(settings.debugMode);

  Storage.applyTheme(settings.theme);
  document.body.classList.toggle('is-debug', isDebug);
  elDebugBadge.classList.toggle('is-hidden', !isDebug);
  renderButtonIcons(settings.theme);

  const opId = settings.activeOperator || 'op1';
  const preset = Storage.OPERATOR_PRESETS[opId] || Storage.OPERATOR_PRESETS.op1;
  const activeMap = (settings.operators && settings.operators[opId]) || {};

  for (const btn of elOpBtns) {
    const isSelected = btn.getAttribute('data-operator') === opId;
    btn.classList.toggle('is-active', isSelected);
    btn.setAttribute('aria-selected', String(isSelected));
  }

  if (elOperatorLabel) {
    elOperatorLabel.textContent = preset.label;
  }

  const counts = Storage.countEquipmentStates(activeMap);
  elRunningChip.textContent = counts.running + ' Running';
  elStandbyChip.textContent = counts.standby + ' Standby';

  elAutoDetectShift.checked = Boolean(settings.autoDetectShift);
  elIncludeEveryShift.checked = Boolean(settings.includeEveryShift);
  elAutoShowAllRows.checked = isDebug ? Boolean(settings.autoShowAllRows) : true;

  if (isInitialBoot) {
    if (settings.autoDetectShift) {
      elScheduleFilter.value = Storage.detectActiveShiftByHour();
    } else {
      elScheduleFilter.value = settings.lastFilter || 'all';
    }
  } else if (!hasManualShiftOverride && !settings.autoDetectShift) {
    elScheduleFilter.value = settings.lastFilter || 'all';
  }

  updateExecuteAvailability();
}

function setStatus(text, tone) {
  elSummaryStatus.textContent = text;
  elSummaryStatus.classList.remove('is-error', 'is-success', 'is-dry');
  elSummaryBox.classList.toggle('has-error', tone === 'error');
  if (tone === 'error') elSummaryStatus.classList.add('is-error');
  if (tone === 'success') elSummaryStatus.classList.add('is-success');
  if (tone === 'dry') elSummaryStatus.classList.add('is-dry');
}

function showProgress(current, total) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeCurrent = Math.min(safeTotal, Math.max(0, Number(current) || 0));
  const pct = safeTotal > 0 ? Math.round((safeCurrent / safeTotal) * 100) : 0;
  elProgressWrap.classList.remove('is-hidden');
  elProgressText.textContent =
    safeTotal > 0
      ? 'Memproses ' + safeCurrent + ' / ' + safeTotal + ' baris...'
      : 'Memindai baris checklist...';
  elProgressBar.style.width = pct + '%';
}

function hideProgress() {
  elProgressWrap.classList.add('is-hidden');
  elProgressBar.style.width = '0%';
}

function updateSummaryNumbers(res) {
  const remaining = Number(res.remainingUnset) || 0;
  elStatScanned.textContent = String(res.totalScanned || 0);
  elStatExecuted.textContent = String(res.setToExecuted || 0);
  elStatNotExecuted.textContent = String(res.setToNotExecuted || 0);
  elStatAlready.textContent = String(res.alreadySet || 0);
  elStatUntouched.textContent = String(res.untouchedCount || 0);
  elStatRemainingUnset.textContent = String(remaining);
  elStatRemainingUnset.classList.toggle('is-warn', remaining > 0);
}

function setBusy(busy) {
  isBusy = busy;
  elDryRunBtn.disabled = busy;
  elClearDryRunBtn.disabled = busy;
  elScheduleFilter.disabled = busy;
  elAutoDetectShift.disabled = busy;
  elIncludeEveryShift.disabled = busy;
  elAutoShowAllRows.disabled = busy;
  for (const btn of elOpBtns) {
    btn.disabled = busy;
  }
  updateExecuteAvailability();
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

async function detectAndSyncPageContext() {
  try {
    const tab = await queryActiveTab();
    if (!tab || !tab.id) {
      renderPageContext();
      return;
    }
    await injectContentScript(tab.id);
    const ctx = await sendTabMessage(tab.id, { action: 'GET_PAGE_CONTEXT' });
    if (ctx && typeof ctx === 'object') {
      pageContext = {
        isValidPage: Boolean(ctx.isValidPage),
        operatorKey: ctx.operatorKey || null,
        operatorLabel: ctx.operatorLabel || null,
        rawAreaLabel: ctx.rawAreaLabel || '',
        activeDateFormatted: ctx.activeDateFormatted || '-',
        activeDateISO: ctx.activeDateISO || ''
      };

      if (pageContext.isValidPage && pageContext.operatorKey && currentSettings.activeOperator !== pageContext.operatorKey) {
        const synced = await Storage.saveSettings({ activeOperator: pageContext.operatorKey });
        renderSettings(synced, false);
      }
    }
  } catch (err) {
    pageContext = {
      isValidPage: false,
      operatorKey: null,
      operatorLabel: null,
      rawAreaLabel: '',
      activeDateFormatted: '-',
      activeDateISO: ''
    };
  }
  renderPageContext();
}

async function clearPreviewOnActiveTab(options) {
  const opts = options || {};
  try {
    const tab = await queryActiveTab();
    if (!tab || !tab.id) return;
    if (!Storage.matchesUrlPattern(tab.url || '', currentSettings.targetUrlPattern)) {
      if (opts.updateStatus) {
        setStatus('URL tab aktif tidak cocok dengan pola target.', 'error');
      }
      return;
    }
    await injectContentScript(tab.id);
    const res = await sendTabMessage(tab.id, { action: 'SCR_CLEAR_DRY_RUN' });
    if (opts.updateStatus) {
      const count = res && typeof res.clearedCount === 'number' ? res.clearedCount : 0;
      setStatus(
        count > 0
          ? 'Pratinjau Dry Run dibersihkan (' + count + ' baris).'
          : 'Tidak ada sorotan Dry Run yang aktif.',
        ''
      );
    }
  } catch (err) {
    if (opts.updateStatus) {
      setStatus(err && err.message ? err.message : 'Gagal membersihkan pratinjau Dry Run.', 'error');
    }
  }
}

async function triggerDryRun() {
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

    setStatus('Menjalankan Dry Run (' + preset.label + ')...', 'dry');
    hideProgress();

    await injectContentScript(tab.id);

    const scheduleFilter = elScheduleFilter.value || 'all';
    const includeEveryShift = Boolean(elIncludeEveryShift.checked);
    const autoShowAllRows = settings.debugMode ? Boolean(elAutoShowAllRows.checked) : true;

    const response = await sendTabMessage(tab.id, {
      action: 'SCR_DRY_RUN',
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

    setStatus(
      'Dry Run (' + preset.label + '): ' + execCount + ' Executed, ' + notExecCount + ' Not Executed' + expandedNote + '.',
      'dry'
    );

    await Storage.appendHistory({
      timestamp: new Date().toISOString(),
      operatorId: opId,
      operatorLabel: preset.label,
      mode: 'Dry Run',
      scheduleFilter: scheduleFilter,
      includeEveryShift: includeEveryShift,
      totalScanned: response.totalScanned,
      setToExecuted: execCount,
      setToNotExecuted: notExecCount,
      alreadySet: response.alreadySet || 0,
      untouchedCount: response.untouchedCount || 0,
      remainingUnset: response.remainingUnset || 0
    });
  } catch (err) {
    setStatus(err && err.message ? err.message : 'Terjadi kesalahan saat Dry Run.', 'error');
  } finally {
    hideProgress();
    setBusy(false);
  }
}

async function triggerExecuteWorkflow() {
  if (isBusy) return;
  if (!currentSettings.debugMode && !pageContext.isValidPage) {
    updateExecuteAvailability();
    return;
  }

  setBusy(true);

  try {
    const settings = await Storage.getSettings();
    renderSettings(settings, false);

    const tab = await queryActiveTab();
    const tabUrl = tab.url || '';

    if (!Storage.matchesUrlPattern(tabUrl, settings.targetUrlPattern)) {
      setStatus(
        'Tab aktif bukan halaman web TPM yang sesuai (' + settings.targetUrlPattern + ').',
        'error'
      );
      setBusy(false);
      return;
    }

    const opId = !settings.debugMode && pageContext.operatorKey
      ? pageContext.operatorKey
      : (settings.activeOperator || 'op1');
    const preset = Storage.OPERATOR_PRESETS[opId] || Storage.OPERATOR_PRESETS.op1;
    const equipmentMap = (settings.operators && settings.operators[opId]) || {};
    const scheduleFilter = elScheduleFilter.value || 'all';
    const selectedOpt = elScheduleFilter.options[elScheduleFilter.selectedIndex];
    const scheduleLabel = selectedOpt ? selectedOpt.textContent.trim() : scheduleFilter;
    const includeEveryShift = Boolean(elIncludeEveryShift.checked);
    const autoShowAllRows = settings.debugMode ? Boolean(elAutoShowAllRows.checked) : true;

    await injectContentScript(tab.id);

    chrome.tabs.sendMessage(
      tab.id,
      {
        action: 'SCR_START_WORKFLOW',
        payload: {
          operatorId: opId,
          operatorLabel: preset.label,
          activeDateFormatted: pageContext.activeDateFormatted || '-',
          scheduleFilter: scheduleFilter,
          scheduleLabel: scheduleLabel,
          includeEveryShift: includeEveryShift,
          autoShowAllRows: autoShowAllRows,
          equipmentMap: equipmentMap,
          skipRunningKeywords: settings.skipRunningKeywords,
          skipStandbyKeywords: settings.skipStandbyKeywords,
          clickDelayMs: settings.clickDelayMs,
          theme: settings.theme,
          debugMode: Boolean(settings.debugMode)
        }
      },
      function (response) {
        if (chrome.runtime && chrome.runtime.lastError) {
          setStatus(chrome.runtime.lastError.message, 'error');
          setBusy(false);
          return;
        }
        if (!response || !response.ok) {
          setStatus((response && response.error) || 'Gagal membuka modal checklist pada tab aktif.', 'error');
          setBusy(false);
          return;
        }

        if (window.top === window.self) {
          window.close();
          return;
        }

        setStatus('Modal konfirmasi dibuka pada halaman web TPM.', 'success');
        setBusy(false);
      }
    );
  } catch (err) {
    setStatus(err && err.message ? err.message : 'Gagal terhubung ke halaman web TPM.', 'error');
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

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (message) {
      if (!message || typeof message !== 'object') return;
      if (message.action === 'SCR_EXECUTE_PROGRESS' && message.payload && currentSettings.debugMode) {
        showProgress(message.payload.current, message.payload.total);
      }
      if (message.action === 'SCR_WORKFLOW_COMPLETE' && message.payload) {
        if (currentSettings.debugMode) {
          hideProgress();
          updateSummaryNumbers(message.payload);
          setStatus(
            'Selesai (' + message.payload.operatorLabel + '): ' +
            (message.payload.setToExecuted || 0) + ' Executed, ' +
            (message.payload.setToNotExecuted || 0) + ' Not Executed.',
            'success'
          );
        }
        Storage.appendHistory(message.payload);
      }
    });
  }

  const initial = await Storage.getSettings();
  renderSettings(initial, true);

  await detectAndSyncPageContext();

  Storage.onChanged(function (updated) {
    renderSettings(updated, false);
  });

  for (const btn of elOpBtns) {
    btn.addEventListener('click', async function () {
      const nextOp = btn.getAttribute('data-operator');
      const updated = await Storage.saveSettings({ activeOperator: nextOp });
      renderSettings(updated, false);
      clearPreviewOnActiveTab({ updateStatus: false });
    });
  }

  elThemeBtn.addEventListener('click', async function () {
    const nextTheme = currentSettings.theme === 'dark' ? 'light' : 'dark';
    const updated = await Storage.saveSettings({ theme: nextTheme });
    renderSettings(updated, false);
  });

  elOptionsBtn.addEventListener('click', async function () {
    const opId = currentSettings.activeOperator || 'op1';
    await Storage.saveSettings({ activeOperator: opId });
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
      try {
        const res = chrome.runtime.sendMessage({ action: 'SCR_OPEN_OPERATOR_TAB', operatorId: opId });
        if (res && typeof res.catch === 'function') res.catch(function () {});
      } catch (err) {
        // ignore if options page not open yet
      }
    }
    const targetPath = 'options.html?op=' + encodeURIComponent(opId);

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create && chrome.runtime && chrome.runtime.getURL) {
      chrome.tabs.create({ url: chrome.runtime.getURL(targetPath) });
    } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.location.href = './' + targetPath;
    }
  });

  elScheduleFilter.addEventListener('change', async function () {
    hasManualShiftOverride = true;
    await Storage.saveSettings({ lastFilter: elScheduleFilter.value });
    clearPreviewOnActiveTab({ updateStatus: false });
  });

  elAutoDetectShift.addEventListener('change', async function () {
    const enabled = elAutoDetectShift.checked;
    if (enabled) {
      hasManualShiftOverride = false;
      elScheduleFilter.value = Storage.detectActiveShiftByHour();
    }
    await Storage.saveSettings({ autoDetectShift: enabled });
    clearPreviewOnActiveTab({ updateStatus: false });
  });

  elIncludeEveryShift.addEventListener('change', async function () {
    await Storage.saveSettings({ includeEveryShift: elIncludeEveryShift.checked });
    clearPreviewOnActiveTab({ updateStatus: false });
  });

  elAutoShowAllRows.addEventListener('change', async function () {
    await Storage.saveSettings({ autoShowAllRows: elAutoShowAllRows.checked });
  });

  elDryRunBtn.addEventListener('click', function () {
    triggerDryRun();
  });

  elClearDryRunBtn.addEventListener('click', function () {
    if (isBusy) return;
    clearPreviewOnActiveTab({ updateStatus: true });
  });

  elExecuteBtn.addEventListener('click', function () {
    triggerExecuteWorkflow();
  });
}

init();
