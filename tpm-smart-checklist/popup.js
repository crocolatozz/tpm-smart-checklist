import { createSvgIcon, hydrateIcons } from './icons.js';
import { TPMStorage as Storage } from './storage.js';

const elVersion = document.getElementById('popup-version');
const elDevBadge = document.getElementById('popup-dev-badge');
const elThemeBtn = document.getElementById('theme-toggle-btn');
const elOptionsBtn = document.getElementById('open-options-btn');

const elContextCard = document.getElementById('context-card');
const elCtxPageBadge = document.getElementById('ctx-page-badge');
const elCtxDateVal = document.getElementById('ctx-date-val');
const elGuardHint = document.getElementById('execute-guard-hint');

const elPresetCounts = document.getElementById('preset-counts');
const elRunningChip = document.getElementById('running-count-chip');
const elStandbyChip = document.getElementById('standby-count-chip');
const elIgnoreChip = document.getElementById('ignore-count-chip');
const elScheduleFilter = document.getElementById('schedule-filter');
const elDryRunBtn = document.getElementById('dry-run-btn');
const elExecuteBtn = document.getElementById('execute-btn');
const elProgressWrap = document.getElementById('exec-progress-wrap');
const elProgressText = document.getElementById('exec-progress-text');
const elProgressBar = document.getElementById('exec-progress-bar');
const elPopupFeedback = document.getElementById('popup-feedback');

const VALID_SHIFT_KEYS = new Set(['morning_shift', 'afternoon_shift', 'night_shift']);
const SHIFT_LABELS = {
  morning_shift: 'Morning Shift',
  afternoon_shift: 'Afternoon Shift',
  night_shift: 'Night Shift'
};

function resolveValidShiftFilter(rawVal) {
  const clean = String(rawVal || '').trim();
  if (VALID_SHIFT_KEYS.has(clean)) return clean;
  return Storage.detectActiveShiftByHour();
}

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

function renderButtonIcons(theme) {
  hydrateIcons(document);
  elThemeBtn.replaceChildren(createSvgIcon(theme === 'dark' ? 'sun' : 'moon', 15));
  elOptionsBtn.replaceChildren(createSvgIcon('settings', 15));
  elDevBadge.replaceChildren(createSvgIcon('code', 11), document.createTextNode('DEV'));

  elDryRunBtn.replaceChildren(createSvgIcon('eye', 14), document.createTextNode('Dry Run'));
  elExecuteBtn.replaceChildren(createSvgIcon('play', 14), document.createTextNode('Execute'));
}

function updateExecuteAvailability() {
  const isDev = Boolean(currentSettings.devMode);
  const blockedByGuard = !isDev && !pageContext.isValidPage;

  elExecuteBtn.disabled = isBusy || blockedByGuard;
  elGuardHint.classList.toggle('is-hidden', !blockedByGuard);
}

function renderStatusSummary() {
  const hasDetectedOp = Boolean(pageContext && pageContext.isValidPage && pageContext.operatorKey);
  if (!hasDetectedOp) {
    elPresetCounts.classList.add('is-muted');
    elRunningChip.textContent = '0 RUNNING';
    elStandbyChip.textContent = '0 STANDBY';
    elIgnoreChip.textContent = '0 IGNORE';
    return;
  }

  const activeMap =
    (currentSettings.operators && currentSettings.operators[pageContext.operatorKey]) || {};
  const counts = Storage.countEquipmentStates(activeMap);
  elPresetCounts.classList.remove('is-muted');
  elRunningChip.textContent = counts.running + ' RUNNING';
  elStandbyChip.textContent = counts.standby + ' STANDBY';
  elIgnoreChip.textContent = counts.ignore + ' IGNORE';
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
      document.createTextNode('Di luar web TPM Op. 1–3')
    );
  }

  const dateText = (pageContext && pageContext.activeDateFormatted) || '-';
  elCtxDateVal.replaceChildren(
    createSvgIcon('calendar', 12),
    document.createTextNode(dateText)
  );

  renderStatusSummary();
  updateExecuteAvailability();
}

function renderSettings(settings, isInitialBoot) {
  currentSettings = settings;
  const isDev = Boolean(settings.devMode);

  Storage.applyTheme(settings.theme);
  document.body.classList.toggle('is-dev', isDev);
  elDevBadge.classList.toggle('is-hidden', !isDev);
  renderButtonIcons(settings.theme);

  if (isInitialBoot) {
    elScheduleFilter.value = Storage.detectActiveShiftByHour();
  } else {
    elScheduleFilter.value = resolveValidShiftFilter(elScheduleFilter.value);
  }

  renderStatusSummary();
  updateExecuteAvailability();
}

function setFeedback(text, tone) {
  if (!text) {
    elPopupFeedback.textContent = '';
    elPopupFeedback.className = 'popup-feedback is-hidden';
    return;
  }
  elPopupFeedback.textContent = text;
  elPopupFeedback.className = 'popup-feedback' + (tone ? ' is-' + tone : '');
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

function setBusy(busy) {
  isBusy = busy;
  elDryRunBtn.disabled = busy;
  elScheduleFilter.disabled = busy;
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

async function silentAutoPullOnPopupOpen() {
  const controller = new AbortController();
  const timeoutId = setTimeout(function () {
    controller.abort();
  }, 2500);

  try {
    const res = await Storage.pullFromFirestore({
      signal: controller.signal,
      silent: true
    });
    if (res && res.settings) {
      renderSettings(res.settings, false);
    }
  } catch (err) {
    // Silent fallback to local chrome.storage.local cache without blocking UI
  } finally {
    clearTimeout(timeoutId);
  }
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

async function clearPreviewOnActiveTab() {
  try {
    const tab = await queryActiveTab();
    if (!tab || !tab.id) return;
    if (!Storage.matchesUrlPattern(tab.url || '', Storage.LOCKED_CONFIG.targetUrlPattern)) {
      return;
    }
    await injectContentScript(tab.id);
    await sendTabMessage(tab.id, { action: 'SCR_CLEAR_DRY_RUN' });
  } catch (err) {
    // ignore background clear errors
  }
}

async function triggerDryRun() {
  if (isBusy || !currentSettings.devMode) return;
  setBusy(true);

  try {
    const settings = await Storage.getSettings();
    renderSettings(settings, false);

    const tab = await queryActiveTab();
    const tabUrl = tab.url || '';

    if (!Storage.matchesUrlPattern(tabUrl, Storage.LOCKED_CONFIG.targetUrlPattern)) {
      setFeedback('URL tab aktif tidak cocok dengan pola target.', 'error');
      return;
    }

    const opId = (pageContext && pageContext.operatorKey) || settings.activeOperator || 'op1';
    const preset = Storage.OPERATOR_PRESETS[opId] || Storage.OPERATOR_PRESETS.op1;
    const equipmentMap = (settings.operators && settings.operators[opId]) || {};

    setFeedback('Menjalankan Dry Run (' + preset.label + ')...', 'dry');
    hideProgress();

    await injectContentScript(tab.id);

    const scheduleFilter = resolveValidShiftFilter(elScheduleFilter.value);

    const response = await sendTabMessage(tab.id, {
      action: 'SCR_DRY_RUN',
      payload: {
        operatorId: opId,
        scheduleFilter: scheduleFilter,
        autoShowAllRows: true,
        equipmentMap: equipmentMap,
        skipRunningKeywords: settings.skipRunningKeywords,
        skipStandbyKeywords: settings.skipStandbyKeywords,
        clickDelayMs: Storage.LOCKED_CONFIG.clickDelayMs
      }
    });

    if (!response || !response.ok) {
      setFeedback((response && response.error) || 'Gagal memproses tabel checklist.', 'error');
      return;
    }

    const execCount = response.setToExecuted || 0;
    const notExecCount = response.setToNotExecuted || 0;

    setFeedback(
      'Dry Run (' + preset.label + '): ' + execCount + ' Executed, ' + notExecCount + ' Not Executed.',
      'dry'
    );
  } catch (err) {
    setFeedback(err && err.message ? err.message : 'Terjadi kesalahan saat Dry Run.', 'error');
  } finally {
    hideProgress();
    setBusy(false);
  }
}

async function triggerExecuteWorkflow() {
  if (isBusy) return;
  if (!currentSettings.devMode && !pageContext.isValidPage) {
    updateExecuteAvailability();
    return;
  }

  setBusy(true);

  try {
    const settings = await Storage.getSettings();
    renderSettings(settings, false);

    const tab = await queryActiveTab();
    const tabUrl = tab.url || '';

    if (!Storage.matchesUrlPattern(tabUrl, Storage.LOCKED_CONFIG.targetUrlPattern)) {
      setFeedback('Tab aktif bukan web TPM yang sesuai.', 'error');
      setBusy(false);
      return;
    }

    const opId = (pageContext && pageContext.operatorKey) || settings.activeOperator || 'op1';
    const preset = Storage.OPERATOR_PRESETS[opId] || Storage.OPERATOR_PRESETS.op1;
    const equipmentMap = (settings.operators && settings.operators[opId]) || {};
    const scheduleFilter = resolveValidShiftFilter(elScheduleFilter.value);
    const scheduleLabel = SHIFT_LABELS[scheduleFilter] || 'Morning Shift';

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
          autoShowAllRows: true,
          equipmentMap: equipmentMap,
          skipRunningKeywords: settings.skipRunningKeywords,
          skipStandbyKeywords: settings.skipStandbyKeywords,
          clickDelayMs: Storage.LOCKED_CONFIG.clickDelayMs,
          theme: settings.theme,
          devMode: Boolean(settings.devMode)
        }
      },
      function (response) {
        if (chrome.runtime && chrome.runtime.lastError) {
          setFeedback(chrome.runtime.lastError.message, 'error');
          setBusy(false);
          return;
        }
        if (!response || !response.ok) {
          setFeedback((response && response.error) || 'Gagal membuka modal checklist pada tab aktif.', 'error');
          setBusy(false);
          return;
        }

        if (window.top === window.self) {
          window.close();
          return;
        }

        setFeedback('Modal konfirmasi dibuka pada web TPM.', 'success');
        setBusy(false);
      }
    );
  } catch (err) {
    setFeedback(err && err.message ? err.message : 'Gagal terhubung ke web TPM.', 'error');
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
      if (message.action === 'SCR_EXECUTE_PROGRESS' && message.payload && currentSettings.devMode) {
        showProgress(message.payload.current, message.payload.total);
      }
      if (message.action === 'SCR_WORKFLOW_COMPLETE' && message.payload) {
        if (currentSettings.devMode) {
          hideProgress();
          setFeedback(
            'Selesai (' + message.payload.operatorLabel + '): ' +
            (message.payload.setToExecuted || 0) + ' Executed, ' +
            (message.payload.setToNotExecuted || 0) + ' Not Executed.',
            'success'
          );
        }
      }
    });
  }

  const initial = await Storage.getSettings();
  renderSettings(initial, true);

  await Promise.all([
    detectAndSyncPageContext(),
    silentAutoPullOnPopupOpen()
  ]);

  Storage.onChanged(function (updated) {
    renderSettings(updated, false);
  });

  elThemeBtn.addEventListener('click', async function () {
    const nextTheme = currentSettings.theme === 'dark' ? 'light' : 'dark';
    const updated = await Storage.saveSettings({ theme: nextTheme });
    renderSettings(updated, false);
  });

  elOptionsBtn.addEventListener('click', async function () {
    const opId = (pageContext && pageContext.operatorKey) || currentSettings.activeOperator || 'op1';
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
    const validShift = resolveValidShiftFilter(elScheduleFilter.value);
    elScheduleFilter.value = validShift;
    await Storage.saveSettings({ lastFilter: validShift });
    clearPreviewOnActiveTab();
  });

  elDryRunBtn.addEventListener('click', function () {
    triggerDryRun();
  });

  elExecuteBtn.addEventListener('click', function () {
    triggerExecuteWorkflow();
  });
}

init();
