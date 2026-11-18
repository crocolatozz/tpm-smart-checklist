(function (global) {
  'use strict';

  const LOCAL_STORAGE_KEY = 'smart_checklist_runner_v1_state';
  const STORAGE_KEY = 'scrConfig';

  const OPERATOR_1_DEFAULT_TAGS = [
    'B-02-U-GA201A',
    'B-02-U-GA201B',
    'B-02-U-GA102A',
    'B-02-U-GA102B',
    'B-02-U-GA405A',
    'B-02-U-GA405B',
    'B-02-U-GA109A',
    'B-02-U-GA109B',
    'B-02-U-GA101A',
    'B-02-U-GA101B',
    'B-02-U-GA103A',
    'B-02-U-GA103B',
    'B-02-U-GA106A',
    'B-02-U-GA106B',
    'B-02-U-GA110A',
    'B-02-U-GA110B',
    'B-02-U-GB101HP',
    'B-02-U-GA107A',
    'B-02-U-GA107B',
    'B-02-U-GA121A',
    'B-02-U-GA121B',
    'B-02-U-GA122AM',
    'B-02-U-GA122BM',
    'B-02-U-GA123M',
    'B-02-U-GA104AM',
    'B-02-U-GA104BM',
    'B-02-U-GB701A',
    'B-02-U-GB701B',
    'B-02-U-GA105AM',
    'B-02-U-GA105B'
  ];

  function buildDefaultEquipmentMap() {
    const map = {};
    for (const tag of OPERATOR_1_DEFAULT_TAGS) {
      map[tag] = 'RUNNING';
    }
    return map;
  }

  function createDefaultSettings() {
    return {
      presetName: 'Operator 1',
      theme: 'light',
      lastFilter: 'all',
      skipRunningKeywords: 'Putar poros',
      skipStandbyKeywords: 'Kelainan suara',
      targetUrlPattern: '*',
      clickDelayMs: 150,
      equipmentMap: buildDefaultEquipmentMap(),
      executionHistory: []
    };
  }

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome && chrome.storage && chrome.storage.local);
  }

  function normalizeState(raw) {
    const defaults = createDefaultSettings();
    const src = raw && typeof raw === 'object' ? raw : {};
    const validStates = new Set(['RUNNING', 'STANDBY', 'IGNORE']);
    const mergedMap = {};

    const sourceMap = src.equipmentMap && typeof src.equipmentMap === 'object'
      ? src.equipmentMap
      : buildDefaultEquipmentMap();

    for (const [tag, st] of Object.entries(sourceMap)) {
      const cleanTag = String(tag || '').trim();
      if (!cleanTag) continue;
      mergedMap[cleanTag] = validStates.has(st) ? st : 'RUNNING';
    }

    if (Object.keys(mergedMap).length === 0) {
      Object.assign(mergedMap, buildDefaultEquipmentMap());
    }

    const delayNum = Number(src.clickDelayMs);
    const historyArr = Array.isArray(src.executionHistory) ? src.executionHistory.slice(0, 20) : [];

    return {
      presetName: 'Operator 1',
      theme: src.theme === 'dark' ? 'dark' : 'light',
      lastFilter: typeof src.lastFilter === 'string' && src.lastFilter ? src.lastFilter : defaults.lastFilter,
      skipRunningKeywords: typeof src.skipRunningKeywords === 'string' ? src.skipRunningKeywords : defaults.skipRunningKeywords,
      skipStandbyKeywords: typeof src.skipStandbyKeywords === 'string' ? src.skipStandbyKeywords : defaults.skipStandbyKeywords,
      targetUrlPattern: typeof src.targetUrlPattern === 'string' && src.targetUrlPattern.trim()
        ? src.targetUrlPattern.trim()
        : defaults.targetUrlPattern,
      clickDelayMs: Number.isFinite(delayNum) && delayNum >= 0 ? Math.min(5000, Math.round(delayNum)) : defaults.clickDelayMs,
      equipmentMap: mergedMap,
      executionHistory: historyArr
    };
  }

  function readLocalFallback() {
    try {
      const raw = global.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return normalizeState(null);
      return normalizeState(JSON.parse(raw));
    } catch (err) {
      return normalizeState(null);
    }
  }

  function writeLocalFallback(nextState) {
    try {
      global.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));
    } catch (err) {
      // ignore quota/sandbox errors
    }
  }

  function getSettings() {
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

  async function saveSettings(partial) {
    const current = await getSettings();
    const merged = normalizeState({
      ...current,
      ...(partial || {}),
      equipmentMap: partial && partial.equipmentMap ? partial.equipmentMap : current.equipmentMap,
      executionHistory: partial && partial.executionHistory ? partial.executionHistory : current.executionHistory
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

  async function resetEquipmentDefaults() {
    return saveSettings({
      equipmentMap: buildDefaultEquipmentMap()
    });
  }

  async function appendHistory(entry) {
    const current = await getSettings();
    const nextHistory = [entry, ...current.executionHistory].slice(0, 20);
    return saveSettings({ executionHistory: nextHistory });
  }

  async function clearHistory() {
    return saveSettings({ executionHistory: [] });
  }

  function onChanged(callback) {
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
    global.addEventListener('storage', storageListener);
    return function () {
      global.removeEventListener('storage', storageListener);
    };
  }

  function countEquipmentStates(equipmentMap) {
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

  function matchesUrlPattern(url, pattern) {
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

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  global.SCRStorage = {
    STORAGE_KEY: STORAGE_KEY,
    OPERATOR_1_DEFAULT_TAGS: OPERATOR_1_DEFAULT_TAGS.slice(),
    buildDefaultEquipmentMap: buildDefaultEquipmentMap,
    createDefaultSettings: createDefaultSettings,
    normalizeState: normalizeState,
    getSettings: getSettings,
    saveSettings: saveSettings,
    resetEquipmentDefaults: resetEquipmentDefaults,
    appendHistory: appendHistory,
    clearHistory: clearHistory,
    onChanged: onChanged,
    countEquipmentStates: countEquipmentStates,
    matchesUrlPattern: matchesUrlPattern,
    applyTheme: applyTheme
  };
})(window);
