(function () {
  'use strict';

  if (window.__SCR_CONTENT_LOADED__) {
    return;
  }
  window.__SCR_CONTENT_LOADED__ = true;

  const SCHEDULE_MATCHERS = {
    all: null,
    pagi: /\b(morning|pagi)\b/i,
    sore: /\b(afternoon|sore)\b/i,
    malam: /\b(night|malam)\b/i,
    daily: /\b(daily|harian)\b/i,
    weekly: /\b(weekly|mingguan)\b/i,
    monthly: /\b(monthly|bulanan)\b/i
  };

  function extractEquipmentTag(firstCell) {
    if (!firstCell) return '';
    const parts = [];
    for (const node of firstCell.childNodes) {
      if (node.nodeType === 3) {
        const text = node.textContent.trim();
        if (text) parts.push(text);
      }
    }
    return parts.join(' ').trim();
  }

  function extractBadgeText(firstCell) {
    if (!firstCell) return '';
    const texts = [];
    for (const child of firstCell.children) {
      const t = (child.textContent || '').trim();
      if (t) texts.push(t);
    }
    return texts.join(' ');
  }

  function extractTaskText(row) {
    const taskCell = row.querySelector('td.task-column');
    if (!taskCell) return '';
    const titleEl = taskCell.querySelector('.fw-bold');
    const subEl = taskCell.querySelector('.small.text-muted');
    let raw = '';
    if (titleEl || subEl) {
      const t1 = titleEl ? titleEl.textContent : '';
      const t2 = subEl ? subEl.textContent : '';
      raw = [t1, t2].filter(Boolean).join(' ');
    } else {
      raw = taskCell.textContent || '';
    }
    return raw
      .replace(/^[\s•]+/g, '')
      .replace(/\s*•\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function matchesSchedule(taskId, badgeText, scheduleFilter) {
    if (!scheduleFilter || scheduleFilter === 'all') return true;
    const regex = SCHEDULE_MATCHERS[scheduleFilter];
    if (!regex) return true;
    const combined = String(taskId || '') + ' ' + String(badgeText || '');
    return regex.test(combined);
  }

  function parseKeywordList(raw) {
    return String(raw || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  function findMatchedKeyword(taskText, keywordList) {
    if (!keywordList || keywordList.length === 0) return null;
    const lowerTask = String(taskText || '').toLowerCase();
    for (const kw of keywordList) {
      if (lowerTask.includes(kw)) return kw;
    }
    return null;
  }

  function clearDryRunHighlights() {
    const highlighted = document.querySelectorAll('tr[data-task-id][data-scr-dryrun="true"]');
    for (const row of highlighted) {
      row.removeAttribute('data-scr-dryrun');
      row.style.outline = row.dataset.scrPrevOutline || '';
      row.style.outlineOffset = row.dataset.scrPrevOutlineOffset || '';
      row.style.backgroundColor = row.dataset.scrPrevBg || '';
      delete row.dataset.scrPrevOutline;
      delete row.dataset.scrPrevOutlineOffset;
      delete row.dataset.scrPrevBg;
    }
  }

  function applyDryRunHighlight(row) {
    if (row.getAttribute('data-scr-dryrun') !== 'true') {
      row.dataset.scrPrevOutline = row.style.outline || '';
      row.dataset.scrPrevOutlineOffset = row.style.outlineOffset || '';
      row.dataset.scrPrevBg = row.style.backgroundColor || '';
    }
    row.setAttribute('data-scr-dryrun', 'true');
    row.style.outline = '2px solid #eab308';
    row.style.outlineOffset = '-2px';
    row.style.backgroundColor = 'rgba(250, 204, 21, 0.18)';
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runChecklist(options) {
    if (window.__SCR_IS_RUNNING__) {
      return {
        ok: false,
        busy: true,
        error: 'Eksekusi sedang berjalan. Tunggu hingga selesai.'
      };
    }

    window.__SCR_IS_RUNNING__ = true;

    try {
      const cfg = options || {};
      const dryRun = Boolean(cfg.dryRun);
      const scheduleFilter = String(cfg.scheduleFilter || 'all');
      const equipmentMap = cfg.equipmentMap && typeof cfg.equipmentMap === 'object' ? cfg.equipmentMap : {};
      const runningExclusions = parseKeywordList(cfg.skipRunningKeywords);
      const standbyExclusions = parseKeywordList(cfg.skipStandbyKeywords);
      const delayMs = Math.max(0, Number(cfg.clickDelayMs) >= 0 ? Number(cfg.clickDelayMs) : 150);

      clearDryRunHighlights();

      const rows = Array.from(document.querySelectorAll('tr[data-task-id]'));
      let totalScanned = rows.length;
      let matchedCount = 0;
      let newlyChecked = 0;
      let alreadyChecked = 0;
      let skippedByRule = 0;
      let skippedBySchedule = 0;
      let skippedByEquipment = 0;
      let firstMatchedRow = null;

      for (const row of rows) {
        const taskId = row.getAttribute('data-task-id') || '';
        const firstCell = row.querySelector('td:nth-child(1)');
        const tag = extractEquipmentTag(firstCell);
        const badgeText = extractBadgeText(firstCell);

        if (!matchesSchedule(taskId, badgeText, scheduleFilter)) {
          skippedBySchedule++;
          continue;
        }

        const equipState = tag ? equipmentMap[tag] : null;
        if (equipState !== 'RUNNING' && equipState !== 'STANDBY') {
          skippedByEquipment++;
          continue;
        }

        const taskText = extractTaskText(row);
        const activeExclusions = equipState === 'RUNNING' ? runningExclusions : standbyExclusions;
        const hitKeyword = findMatchedKeyword(taskText, activeExclusions);

        if (hitKeyword) {
          skippedByRule++;
          continue;
        }

        // Strict Checkbox Boundary: ONLY input[type="checkbox"][id^="is_executed_"]
        const checkbox = row.querySelector('input[type="checkbox"][id^="is_executed_"]');
        if (!checkbox) {
          continue;
        }

        if (checkbox.checked) {
          alreadyChecked++;
          continue;
        }

        if (checkbox.disabled) {
          continue;
        }

        matchedCount++;
        if (!firstMatchedRow) {
          firstMatchedRow = row;
        }

        if (dryRun) {
          applyDryRunHighlight(row);
        } else {
          checkbox.click();
          newlyChecked++;
          if (delayMs > 0) {
            await sleep(delayMs);
          }
        }
      }

      if (dryRun && firstMatchedRow && typeof firstMatchedRow.scrollIntoView === 'function') {
        firstMatchedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      return {
        ok: true,
        dryRun: dryRun,
        scheduleFilter: scheduleFilter,
        totalScanned: totalScanned,
        matchedCount: matchedCount,
        newlyChecked: newlyChecked,
        alreadyChecked: alreadyChecked,
        skippedByRule: skippedByRule,
        skippedBySchedule: skippedBySchedule,
        skippedByEquipment: skippedByEquipment
      };
    } finally {
      window.__SCR_IS_RUNNING__ = false;
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
      if (!message || typeof message !== 'object') return false;

      if (message.action === 'SCR_DRY_RUN' || message.action === 'SCR_EXECUTE') {
        runChecklist({
          ...(message.payload || {}),
          dryRun: message.action === 'SCR_DRY_RUN'
        })
          .then((result) => sendResponse(result))
          .catch((err) => sendResponse({ ok: false, error: err && err.message ? err.message : String(err) }));
        return true;
      }

      if (message.action === 'SCR_CLEAR_HIGHLIGHTS') {
        clearDryRunHighlights();
        sendResponse({ ok: true });
        return false;
      }

      return false;
    });
  }
})();
