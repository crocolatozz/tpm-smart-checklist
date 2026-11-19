import { EQUIPMENT_DB, TASK_KEYWORD_TEMPLATES } from './equipment-db.js';

const LOCAL_STORAGE_KEY = 'tpm_smart_checklist_v1_state';
const STORAGE_KEY = 'tpmConfig';

export const DEFAULT_FIRESTORE_PROJECT_ID = 'urea1b-running-status';
export const RUNNING_STATUS_CHECKER_URL = 'https://crocolatozz.github.io/running-status-checker/';
export const OPERATOR_PRESETS = EQUIPMENT_DB;
export const KEYWORD_TEMPLATES = TASK_KEYWORD_TEMPLATES;
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
const VALID_SYNC_STATUSES = new Set(['offline', 'synced', 'error']);

export function normalizeKeywordArray(raw, fallbackList) {
  if (raw === undefined || raw === null) {
    return Array.isArray(fallbackList) ? fallbackList.slice() : [];
  }
  const source = Array.isArray(raw)
    ? raw
    : String(raw)
        .split(',')
        .map((item) => item.trim());

  const seen = new Set();
  const out = [];
  for (const item of source) {
    const clean = String(item || '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

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
    devMode: false,
    lastFilter: 'all',
    autoDetectShift: true,
    includeEveryShift: true,
    autoShowAllRows: true,
    skipRunningKeywords: ['Putar poros'],
    skipStandbyKeywords: ['Kelainan suara'],
    targetUrlPattern: '*',
    clickDelayMs: 150,
    firestoreProjectId: DEFAULT_FIRESTORE_PROJECT_ID,
    autoPullOnOpen: true,
    lastSyncAt: '',
    syncStatus: 'offline',
    syncMessage: '',
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

  const resolvedDevMode =
    typeof src.devMode === 'boolean'
      ? src.devMode
      : typeof src.debugMode === 'boolean'
        ? src.debugMode
        : false;

  const resolvedProjectId =
    typeof src.firestoreProjectId === 'string' && src.firestoreProjectId.trim()
      ? src.firestoreProjectId.trim()
      : defaults.firestoreProjectId;

  const resolvedAutoPull =
    typeof src.autoPullOnOpen === 'boolean'
      ? src.autoPullOnOpen
      : typeof src.dbAutoPull === 'boolean'
        ? src.dbAutoPull
        : defaults.autoPullOnOpen;

  const resolvedLastSyncAt =
    typeof src.lastSyncAt === 'string'
      ? src.lastSyncAt.trim()
      : typeof src.dbLastSyncAt === 'string'
        ? src.dbLastSyncAt.trim()
        : '';

  const rawSyncStatus = src.syncStatus || src.dbSyncStatus;
  const resolvedSyncStatus = VALID_SYNC_STATUSES.has(rawSyncStatus) ? rawSyncStatus : 'offline';

  return {
    activeOperator: activeOperator,
    theme: src.theme === 'dark' ? 'dark' : 'light',
    devMode: resolvedDevMode,
    lastFilter: VALID_FILTERS.has(src.lastFilter) ? src.lastFilter : defaults.lastFilter,
    autoDetectShift: typeof src.autoDetectShift === 'boolean' ? src.autoDetectShift : defaults.autoDetectShift,
    includeEveryShift: typeof src.includeEveryShift === 'boolean' ? src.includeEveryShift : defaults.includeEveryShift,
    autoShowAllRows: typeof src.autoShowAllRows === 'boolean' ? src.autoShowAllRows : defaults.autoShowAllRows,
    skipRunningKeywords: normalizeKeywordArray(src.skipRunningKeywords, defaults.skipRunningKeywords),
    skipStandbyKeywords: normalizeKeywordArray(src.skipStandbyKeywords, defaults.skipStandbyKeywords),
    targetUrlPattern: typeof src.targetUrlPattern === 'string' && src.targetUrlPattern.trim()
      ? src.targetUrlPattern.trim()
      : defaults.targetUrlPattern,
    clickDelayMs: Number.isFinite(delayNum) && delayNum >= 0
      ? Math.min(5000, Math.round(delayNum))
      : defaults.clickDelayMs,
    firestoreProjectId: resolvedProjectId,
    autoPullOnOpen: resolvedAutoPull,
    lastSyncAt: resolvedLastSyncAt,
    syncStatus: resolvedSyncStatus,
    syncMessage: typeof src.syncMessage === 'string' ? src.syncMessage.trim() : '',
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

function validateProjectId(rawProjectId) {
  const clean = String(rawProjectId || '').trim();
  if (!clean) {
    throw new Error('Firestore Project ID belum diisi.');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    throw new Error('Format Firestore Project ID tidak valid.');
  }
  return clean;
}

function extractFirestoreStringArray(field) {
  const rawValues = field && field.arrayValue && Array.isArray(field.arrayValue.values)
    ? field.arrayValue.values
    : [];
  return rawValues
    .map((v) => (v && typeof v.stringValue === 'string' ? v.stringValue.trim() : ''))
    .filter(Boolean);
}

async function fetchAllEquipmentDocs(projectId, signal) {
  const docs = [];
  let pageToken = '';
  const baseUrl =
    'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(projectId) +
    '/databases/(default)/documents/equipments?pageSize=200';

  do {
    const url = pageToken ? baseUrl + '&pageToken=' + encodeURIComponent(pageToken) : baseUrl;
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: signal
    });
    if (!res.ok) {
      throw new Error('Firestore equipments HTTP ' + res.status);
    }
    const json = await res.json();
    if (Array.isArray(json && json.documents)) {
      docs.push(...json.documents);
    }
    pageToken = (json && json.nextPageToken) || '';
  } while (pageToken);

  return docs;
}

async function fetchTpmConfigDoc(projectId, signal) {
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(projectId) +
    '/databases/(default)/documents/config/tpm_settings';

  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    signal: signal
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error('Firestore config HTTP ' + res.status);
  }
  return res.json();
}

export async function pullFromFirestore(options) {
  const opts = options || {};
  const current = await getSettings();
  const projectId = validateProjectId(
    opts.projectId !== undefined ? opts.projectId : current.firestoreProjectId
  );

  let equipDocs;
  let configDoc;
  try {
    [equipDocs, configDoc] = await Promise.all([
      fetchAllEquipmentDocs(projectId, opts.signal),
      fetchTpmConfigDoc(projectId, opts.signal)
    ]);
  } catch (err) {
    if (!opts.silent) {
      await saveSettings({
        firestoreProjectId: projectId,
        syncStatus: 'error',
        syncMessage: err && err.message ? err.message : 'Gagal terhubung ke Firestore.'
      });
    }
    throw new Error(
      err && err.name === 'AbortError'
        ? 'Koneksi Firestore timeout (cache lokal tetap digunakan).'
        : (err && err.message) || 'Gagal menarik data dari Cloud Firestore.'
    );
  }

  const remoteStatusByTag = new Map();
  for (const doc of equipDocs || []) {
    const fields = (doc && doc.fields) || {};
    const nameTail = doc && typeof doc.name === 'string'
      ? decodeURIComponent(doc.name.split('/').pop() || '')
      : '';
    const tag = String((fields.tag && fields.tag.stringValue) || nameTail).trim();
    const status = String((fields.status && fields.status.stringValue) || '').trim().toUpperCase();
    if (!tag || !VALID_STATES.has(status)) continue;
    remoteStatusByTag.set(tag, status);
  }

  // Empty-data guard: never overwrite local operator maps if Firestore returned 0 valid documents
  let mergedOperators = current.operators;
  let equipmentUpdated = false;
  if (remoteStatusByTag.size > 0) {
    equipmentUpdated = true;
    mergedOperators = {
      op1: { ...(current.operators && current.operators.op1) },
      op2: { ...(current.operators && current.operators.op2) },
      op3: { ...(current.operators && current.operators.op3) }
    };
    for (const opId of VALID_OPERATOR_IDS) {
      const opMap = mergedOperators[opId];
      for (const tag of Object.keys(opMap)) {
        if (remoteStatusByTag.has(tag)) {
          opMap[tag] = remoteStatusByTag.get(tag);
        }
      }
    }
  }

  const configFields = configDoc && configDoc.fields ? configDoc.fields : null;
  const nextSkipRunning = configFields && configFields.skipRunningKeywords !== undefined
    ? extractFirestoreStringArray(configFields.skipRunningKeywords)
    : current.skipRunningKeywords;
  const nextSkipStandby = configFields && configFields.skipStandbyKeywords !== undefined
    ? extractFirestoreStringArray(configFields.skipStandbyKeywords)
    : current.skipStandbyKeywords;

  const syncedAt = new Date().toISOString();
  const nextSettings = await saveSettings({
    firestoreProjectId: projectId,
    operators: mergedOperators,
    skipRunningKeywords: nextSkipRunning,
    skipStandbyKeywords: nextSkipStandby,
    lastSyncAt: syncedAt,
    syncStatus: 'synced',
    syncMessage: equipmentUpdated
      ? 'Pull berhasil (' + remoteStatusByTag.size + ' unit)'
      : 'Pull selesai (0 unit remote; data lokal dipertahankan)'
  });

  return {
    settings: nextSettings,
    remoteUnitCount: remoteStatusByTag.size,
    equipmentUpdated: equipmentUpdated,
    configFound: Boolean(configDoc)
  };
}

export async function pushToFirestore(options) {
  const opts = options || {};
  const current = await getSettings();
  const projectId = validateProjectId(
    opts.projectId !== undefined ? opts.projectId : current.firestoreProjectId
  );

  const uniqueEntries = new Map();
  for (const opId of VALID_OPERATOR_IDS) {
    const opMap = (current.operators && current.operators[opId]) || {};
    for (const [rawTag, rawStatus] of Object.entries(opMap)) {
      const tag = String(rawTag || '').trim();
      const status = String(rawStatus || '').trim().toUpperCase();
      if (!tag) continue;
      if (tag.length > 25) {
        throw new Error('Tag "' + tag + '" melebihi batas 25 karakter aturan Firestore.');
      }
      if (!VALID_STATES.has(status)) {
        throw new Error('Status "' + status + '" tidak valid untuk tag "' + tag + '".');
      }
      uniqueEntries.set(tag, status);
    }
  }

  const nowIso = new Date().toISOString();
  const tasks = Array.from(uniqueEntries.entries());
  const BATCH_SIZE = 8;

  try {
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const chunk = tasks.slice(i, i + BATCH_SIZE);
      await Promise.all(
        chunk.map(async function ([tag, status]) {
          const docUrl =
            'https://firestore.googleapis.com/v1/projects/' +
            encodeURIComponent(projectId) +
            '/databases/(default)/documents/equipments/' +
            encodeURIComponent(tag) +
            '?updateMask.fieldPaths=tag&updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt';

          const res = await fetch(docUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                tag: { stringValue: tag },
                status: { stringValue: status },
                updatedAt: { timestampValue: nowIso }
              }
            })
          });

          if (!res.ok) {
            throw new Error('Gagal menulis tag ' + tag + ' (HTTP ' + res.status + ')');
          }
        })
      );
    }

    const configUrl =
      'https://firestore.googleapis.com/v1/projects/' +
      encodeURIComponent(projectId) +
      '/databases/(default)/documents/config/tpm_settings' +
      '?updateMask.fieldPaths=skipRunningKeywords&updateMask.fieldPaths=skipStandbyKeywords&updateMask.fieldPaths=updatedAt';

    const skipRun = Array.isArray(current.skipRunningKeywords) ? current.skipRunningKeywords : [];
    const skipStby = Array.isArray(current.skipStandbyKeywords) ? current.skipStandbyKeywords : [];

    const cfgRes = await fetch(configUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          skipRunningKeywords: {
            arrayValue: {
              values: skipRun.map((s) => ({ stringValue: s }))
            }
          },
          skipStandbyKeywords: {
            arrayValue: {
              values: skipStby.map((s) => ({ stringValue: s }))
            }
          },
          updatedAt: { timestampValue: nowIso }
        }
      })
    });

    if (!cfgRes.ok) {
      throw new Error('Gagal menulis config/tpm_settings (HTTP ' + cfgRes.status + ')');
    }
  } catch (err) {
    await saveSettings({
      firestoreProjectId: projectId,
      syncStatus: 'error',
      syncMessage: err && err.message ? err.message : 'Push ke Firestore gagal.'
    });
    throw err;
  }

  const nextSettings = await saveSettings({
    firestoreProjectId: projectId,
    lastSyncAt: nowIso,
    syncStatus: 'synced',
    syncMessage: 'Push berhasil (' + tasks.length + ' unit)'
  });

  return {
    settings: nextSettings,
    pushedUnitCount: tasks.length
  };
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
  DEFAULT_FIRESTORE_PROJECT_ID,
  RUNNING_STATUS_CHECKER_URL,
  EQUIPMENT_DB,
  OPERATOR_PRESETS,
  KEYWORD_TEMPLATES,
  VALID_OPERATOR_IDS,
  normalizeKeywordArray,
  buildDefaultEquipmentMap,
  createDefaultSettings,
  normalizeState,
  getSettings,
  saveSettings,
  saveOperatorMap,
  resetOperatorDefaults,
  appendHistory,
  clearHistory,
  pullFromFirestore,
  pushToFirestore,
  onChanged,
  countEquipmentStates,
  matchesUrlPattern,
  detectActiveShiftByHour,
  applyTheme
};
