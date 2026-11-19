/**
 * TPM Smart Checklist — Centralized Google Sheets Backend (Google Apps Script)
 * Deploy as Web App:
 * - Execute as: Me
 * - Who has access: Anyone (protected via SECRET_TOKEN)
 */

const SECRET_TOKEN = 'CHANGE_THIS_SECRET_TOKEN';
const SHEET_EQUIPMENT = 'Equipment_Master';
const SHEET_CONFIG = 'App_Config';
const VALID_OPERATORS = ['op1', 'op2', 'op3'];
const VALID_STATUSES = ['RUNNING', 'STANDBY', 'IGNORE'];

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheets(ss) {
  let equipSheet = ss.getSheetByName(SHEET_EQUIPMENT);
  if (!equipSheet) {
    equipSheet = ss.insertSheet(SHEET_EQUIPMENT);
    equipSheet.appendRow(['operator_id', 'tag', 'pair', 'status', 'updated_at']);
    equipSheet.setFrozenRows(1);
  } else if (equipSheet.getLastRow() === 0) {
    equipSheet.appendRow(['operator_id', 'tag', 'pair', 'status', 'updated_at']);
    equipSheet.setFrozenRows(1);
  }

  let configSheet = ss.getSheetByName(SHEET_CONFIG);
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEET_CONFIG);
    configSheet.appendRow(['config_key', 'config_value', 'updated_at']);
    configSheet.setFrozenRows(1);
  } else if (configSheet.getLastRow() === 0) {
    configSheet.appendRow(['config_key', 'config_value', 'updated_at']);
    configSheet.setFrozenRows(1);
  }

  return { equipSheet: equipSheet, configSheet: configSheet };
}

function parseJsonSafe(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function readMasterData(ss) {
  const sheets = ensureSheets(ss);
  const equipValues = sheets.equipSheet.getDataRange().getValues();
  const configValues = sheets.configSheet.getDataRange().getValues();

  const operators = { op1: {}, op2: {}, op3: {} };
  const equipmentPairs = { op1: {}, op2: {}, op3: {} };
  let latestUpdatedAt = '';

  for (let i = 1; i < equipValues.length; i++) {
    const row = equipValues[i];
    const opId = String(row[0] || '').trim();
    const tag = String(row[1] || '').trim();
    const pair = String(row[2] || '').trim();
    const rawStatus = String(row[3] || '').trim().toUpperCase();
    const updatedAt = String(row[4] || '').trim();

    if (VALID_OPERATORS.indexOf(opId) === -1 || !tag) continue;
    const status = VALID_STATUSES.indexOf(rawStatus) !== -1 ? rawStatus : 'RUNNING';
    operators[opId][tag] = status;
    if (pair) {
      equipmentPairs[opId][tag] = pair;
    }
    if (updatedAt && updatedAt > latestUpdatedAt) {
      latestUpdatedAt = updatedAt;
    }
  }

  let skipRunningKeywords = null;
  let skipStandbyKeywords = null;

  for (let i = 1; i < configValues.length; i++) {
    const row = configValues[i];
    const key = String(row[0] || '').trim();
    const val = String(row[1] || '').trim();
    const updatedAt = String(row[2] || '').trim();

    if (key === 'skipRunningKeywords') {
      const parsed = parseJsonSafe(val, null);
      skipRunningKeywords = Array.isArray(parsed)
        ? parsed
        : val.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    } else if (key === 'skipStandbyKeywords') {
      const parsed = parseJsonSafe(val, null);
      skipStandbyKeywords = Array.isArray(parsed)
        ? parsed
        : val.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    if (updatedAt && updatedAt > latestUpdatedAt) {
      latestUpdatedAt = updatedAt;
    }
  }

  return {
    updatedAt: latestUpdatedAt || new Date().toISOString(),
    data: {
      operators: operators,
      equipmentPairs: equipmentPairs,
      skipRunningKeywords: skipRunningKeywords,
      skipStandbyKeywords: skipStandbyKeywords
    }
  };
}

function writeMasterData(ss, payload) {
  const sheets = ensureSheets(ss);
  const nowIso = new Date().toISOString();
  const operators = payload && payload.operators ? payload.operators : {};
  const pairs = payload && payload.equipmentPairs ? payload.equipmentPairs : {};

  const equipRows = [['operator_id', 'tag', 'pair', 'status', 'updated_at']];
  for (let i = 0; i < VALID_OPERATORS.length; i++) {
    const opId = VALID_OPERATORS[i];
    const opMap = operators[opId] && typeof operators[opId] === 'object' ? operators[opId] : {};
    const opPairs = pairs[opId] && typeof pairs[opId] === 'object' ? pairs[opId] : {};
    const tags = Object.keys(opMap);
    for (let j = 0; j < tags.length; j++) {
      const tag = String(tags[j] || '').trim();
      if (!tag) continue;
      const rawStatus = String(opMap[tag] || 'RUNNING').trim().toUpperCase();
      const status = VALID_STATUSES.indexOf(rawStatus) !== -1 ? rawStatus : 'RUNNING';
      const pair = String(opPairs[tag] || '').trim();
      equipRows.push([opId, tag, pair, status, nowIso]);
    }
  }

  sheets.equipSheet.clearContents();
  sheets.equipSheet.getRange(1, 1, equipRows.length, 5).setValues(equipRows);
  sheets.equipSheet.setFrozenRows(1);

  const skipRun = Array.isArray(payload && payload.skipRunningKeywords)
    ? payload.skipRunningKeywords
    : [];
  const skipStby = Array.isArray(payload && payload.skipStandbyKeywords)
    ? payload.skipStandbyKeywords
    : [];

  const configRows = [
    ['config_key', 'config_value', 'updated_at'],
    ['skipRunningKeywords', JSON.stringify(skipRun), nowIso],
    ['skipStandbyKeywords', JSON.stringify(skipStby), nowIso]
  ];

  sheets.configSheet.clearContents();
  sheets.configSheet.getRange(1, 1, configRows.length, 3).setValues(configRows);
  sheets.configSheet.setFrozenRows(1);
  SpreadsheetApp.flush();

  return nowIso;
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const token = String(params.token || '').trim();
    if (!token || token !== SECRET_TOKEN) {
      return jsonResponse({ status: 'error', message: 'Unauthorized: Secret Token tidak valid.' });
    }

    const ss = getOrCreateSpreadsheet();
    const result = readMasterData(ss);
    return jsonResponse({
      status: 'ok',
      data: result.data,
      updatedAt: result.updatedAt
    });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err && err.message ? err.message : String(err) });
  }
}

function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = parseJsonSafe(rawBody, {});
    const token = String(body.secretToken || '').trim();
    if (!token || token !== SECRET_TOKEN) {
      return jsonResponse({ status: 'error', message: 'Unauthorized: Secret Token tidak valid.' });
    }

    const action = String(body.action || 'push').trim().toLowerCase();
    const ss = getOrCreateSpreadsheet();

    if (action === 'pull') {
      const result = readMasterData(ss);
      return jsonResponse({
        status: 'ok',
        data: result.data,
        updatedAt: result.updatedAt
      });
    }

    if (action === 'push') {
      const updatedAt = writeMasterData(ss, body.payload || {});
      return jsonResponse({
        status: 'ok',
        data: body.payload || {},
        updatedAt: updatedAt
      });
    }

    return jsonResponse({ status: 'error', message: 'Action tidak dikenal: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err && err.message ? err.message : String(err) });
  }
}
