import { EQUIPMENT_DB } from './equipment-db.js';

const LOCAL_STORAGE_KEY = 'tpm_smart_checklist_v1_state';
const STORAGE_KEY = 'tpmConfig';

export const OPERATOR_PRESETS = EQUIPMENT_DB;
export const VALID_OPERATOR_IDS = ['op1', 'op2', 'op3'];

const VALID_FILTERS = new Set([
  'all',
  'morning_shift',
  'afternoon_shift',
  'night_shift',
  'every_shift',
  'weekly',
  'optional'
]);

const VALID_STATES = new Set(['RUNNING', 'STANDBY', 'IGNORE']);

export function buildDefaultEquipmentMap(opId) {
  const preset = EQUIPMENT_DB[opId] || EQUIPMENT_DB.op1;
  const map = {};
  for (const item of preset.equipments) {
    map[item.tag] = VALID_STATES.has(item.defaultStatus) ? item.defaultStatus : 'RUNNING';
  }
  return map;
}

function buildAllDefaultOperators() {
  return {
    op1: buildDefaultEquipmentMap('op1'),
    op2: buildDefaultEquipmentMap('op2'),
    op3: buildDefaultEquipmentMap('op3')
  };
}

export function createDefaultSettings() {
  return {
    activeOperator: 'op1',
    theme: 'light',
    lastFilter: 'all',
    autoDetectShift: true,
    includeEveryShift: true,
    autoShowAllRows: true,
    skipRunningKeywords: 'Putar poros',
    skipStandbyKeywords: 'Kelainan suara',
    targetUrlPattern: '*',
    clickDelayMs: 150,
    operators: buildAllDefaultOperators(),
    executionHistory: []
  };
}

function hasChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome && chrome.storage && chrome.storage.local);
}

function normalizeOperatorMap(sourceMap, fallbackOpId) {
  const merged = {};
  if (sourceMap && typeof sourceMap === 'object') {
    for (const [tag, st] of Object.entries(sourceMap)) {
      const cleanTag = String(tag || '').trim();
      if (!cleanTag) continue;
      merged[cleanTag] = VALID_STATES.has(st) ? st : 'RUNNING';
    }
  }
  if (Object.keys(merged).length === 0) {
    return buildDefaultEquipmentMap(fallbackOpId);
  }
  return merged;
}

export function normalizeState(raw) {
  const defaults = createDefaultSettings();
  const src = raw && typeof raw === 'object' ? raw : {};

  const activeOperator = VALID_OPERATOR_IDS.includes(src.activeOperator)
    ? src.activeOperator
    : defaults.activeOperator;

  const rawOps = src.operators && typeof src.operators === 'object' ? src.operators : null;
  const operators = {
    op1: normalizeOperatorMap(
      rawOps && rawOps.op1 ? rawOps.op1 : src.equipmentMap,
      'op1'
    ),
    op2: normalizeOperatorMap(rawOps && rawOps.op2, 'op2'),
    op3: normalizeOperatorMap(rawOps && rawOps.op3, 'op3')
  };

  const delayNum = Number(src.clickDelayMs);
  const historyArr = Array.isArray(src.executionHistory) ? src.executionHistory.slice(0, 20) : [];

  return {
    activeOperator: activeOperator,
    theme: src.theme === 'dark' ? 'dark' : 'light',
    lastFilter: VALID_FILTERS.has(src.lastFilter) ? src.lastFilter : defaults.lastFilter,
    autoDetectShift: typeof src.autoDetectShift === 'boolean' ? src.autoDetectShift : defaults.autoDetectShift,
    includeEveryShift: typeof src.includeEveryShift === 'boolean' ? src.includeEveryShift : defaults.includeEveryShift,
    autoShowAllRows: typeof src.autoShowAllRows === 'boolean' ? src.autoShowAllRows : defaults.autoShowAllRows,
    skipRunningKeywords: typeof src.skipRunningKeywords === 'string'
      ? src.skipRunningKeywords
      : defaults.skipRunningKeywords,
    skipStandbyKeywords: typeof src.skipStandbyKeywords === 'string'
      ? src.skipStandbyKeywords
      : defaults.skipStandbyKeywords,
    targetUrlPattern: typeof src.targetUrlPattern === 'string' && src.targetUrlPattern.trim()
      ? src.targetUrlPattern.trim()
      : defaults.targetUrlPattern,
    clickDelayMs: Number.isFinite(delayNum) && delayNum >= 0
      ? Math.min(5000, Math.round(delayNum))
      : defaults.clickDelayMs,
    operators: operators,
    executionHistory: historyArr
  };
}

function readLocalFallback() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return createDefaultSettings();
    return normalizeState(JSON.parse(raw));
  } catch (err) {
    return createDefaultSettings();
  }
}

function writeLocalFallback(nextState) {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));
  } catch (err) {
    // ignore quota/sandbox errors
  }
}

export function getSettings() {
  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      try {
        chrome.storage.local.get(STORAGE_KEY, function (res) {
          const existing = res && res[STORAGE_KEY];
          if (!existing) {
            const seeded = createDefaultSettings();
            chrome.storage.local.set({ [STORAGE_KEY]: seeded }, function () {
              resolve(seeded);
            });
            return;
          }
          resolve(normalizeState(existing));
        });
        return;
      } catch (err) {
        // fallback below
      }
    }

    const fallback = readLocalFallback();
    writeLocalFallback(fallback);
    resolve(fallback);
  });
}

export async function saveSettings(partial) {
  const current = await getSettings();
  const nextOps = partial && partial.operators
    ? {
        op1: partial.operators.op1 || current.operators.op1,
        op2: partial.operators.op2 || current.operators.op2,
        op3: partial.operators.op3 || current.operators.op3
      }
    : current.operators;

  const merged = normalizeState({
    ...current,
    ...(partial || {}),
    operators: nextOps,
    executionHistory: partial && partial.executionHistory
      ? partial.executionHistory
      : current.executionHistory
  });

  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      try {
        chrome.storage.local.set({ [STORAGE_KEY]: merged }, function () {
          resolve(merged);
        });
        return;
      } catch (err) {
        // fallback below
      }
    }
    writeLocalFallback(merged);
    resolve(merged);
  });
}

export async function saveOperatorMap(opId, nextMap) {
  const validId = VALID_OPERATOR_IDS.includes(opId) ? opId : 'op1';
  const current = await getSettings();
  return saveSettings({
    operators: {
      ...current.operators,
      [validId]: nextMap
    }
  });
}

export async function resetOperatorDefaults(opId) {
  const validId = VALID_OPERATOR_IDS.includes(opId) ? opId : 'op1';
  return saveOperatorMap(validId, buildDefaultEquipmentMap(validId));
}

export async function appendHistory(entry) {
  const current = await getSettings();
  const nextHistory = [entry, ...current.executionHistory].slice(0, 20);
  return saveSettings({ executionHistory: nextHistory });
}

export async function clearHistory() {
  return saveSettings({ executionHistory: [] });
}

export function onChanged(callback) {
  if (typeof callback !== 'function') return function () {};

  if (hasChromeStorage() && chrome.storage.onChanged) {
    const listener = function (changes, areaName) {
      if (areaName !== 'local' || !changes || !changes[STORAGE_KEY]) return;
      callback(normalizeState(changes[STORAGE_KEY].newValue));
    };
    chrome.storage.onChanged.addListener(listener);
    return function () {
      chrome.storage.onChanged.removeListener(listener);
    };
  }

  const storageListener = function (event) {
    if (event.key !== LOCAL_STORAGE_KEY) return;
    callback(readLocalFallback());
  };
  window.addEventListener('storage', storageListener);
  return function () {
    window.removeEventListener('storage', storageListener);
  };
}

export function countEquipmentStates(equipmentMap) {
  let running = 0;
  let standby = 0;
  let ignore = 0;
  const map = equipmentMap || {};
  for (const val of Object.values(map)) {
    if (val === 'RUNNING') running++;
    else if (val === 'STANDBY') standby++;
    else if (val === 'IGNORE') ignore++;
  }
  return {
    running: running,
    standby: standby,
    ignore: ignore,
    total: running + standby + ignore
  };
}

export function matchesUrlPattern(url, pattern) {
  const cleanPattern = String(pattern || '*').trim();
  if (!cleanPattern || cleanPattern === '*') return true;
  const target = String(url || '');
  if (!target) return false;
  const escaped = cleanPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  try {
    return new RegExp('^' + escaped + '$', 'i').test(target);
  } catch (err) {
    return target.toLowerCase().includes(cleanPattern.toLowerCase());
  }
}

export function detectActiveShiftByHour(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date();
  const hour = d.getHours();
  if (hour >= 7 && hour <= 14) return 'morning_shift';
  if (hour >= 15 && hour <= 22) return 'afternoon_shift';
  return 'night_shift';
}

export function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export const TPMStorage = {
  STORAGE_KEY,
  EQUIPMENT_DB,
  OPERATOR_PRESETS,
  VALID_OPERATOR_IDS,
  buildDefaultEquipmentMap,
  createDefaultSettings,
  normalizeState,
  getSettings,
  saveSettings,
  saveOperatorMap,
  resetOperatorDefaults,
  appendHistory,
  clearHistory,
  onChanged,
  countEquipmentStates,
  matchesUrlPattern,
  detectActiveShiftByHour,
  applyTheme
};
