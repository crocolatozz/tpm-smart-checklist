(function () {
  'use strict';

  if (window.__SCR_CONTENT_LOADED__) {
    return;
  }
  window.__SCR_CONTENT_LOADED__ = true;

  const SHIFT_MATCHERS = {
    morning_shift: /morning_shift|morning\s+shift/i,
    afternoon_shift: /afternoon_shift|afternoon\s+shift/i,
    night_shift: /night_shift|night\s+shift/i,
    every_shift: /every_shift|every\s+shift/i,
    weekly: /\bweekly\b/i,
    optional: /\boptional\b/i
  };

  const SHIFT_WITH_EVERY = new Set([
    'morning_shift',
    'afternoon_shift',
    'night_shift'
  ]);

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

  function matchesSchedule(taskId, badgeText, scheduleFilter, includeEveryShift) {
    if (!scheduleFilter || scheduleFilter === 'all') return true;
    const regex = SHIFT_MATCHERS[scheduleFilter];
    if (!regex) return true;

    const combined = String(taskId || '') + ' ' + String(badgeText || '');
    if (regex.test(combined)) {
      return true;
    }

    if (includeEveryShift && SHIFT_WITH_EVERY.has(scheduleFilter)) {
      return SHIFT_MATCHERS.every_shift.test(combined);
    }

    return false;
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

  function scoreLengthOption(opt) {
    if (!opt) return -1;
    const val = String(opt.value || '').trim();
    const txt = String(opt.textContent || '').trim().toLowerCase();
    if (val === '-1' || txt === 'all' || txt === 'semua') {
      return Number.POSITIVE_INFINITY;
    }
    const num = Number(val);
    if (Number.isFinite(num) && num > 0) {
      return num;
    }
    return -1;
  }

  function isTargetLengthSelect(selectEl) {
    if (!selectEl || selectEl.disabled) return false;
    if (selectEl.matches('select[name*="_length"], .dataTables_length select')) {
      return true;
    }
    for (const opt of selectEl.options) {
      const val = String(opt.value || '').trim();
      const txt = String(opt.textContent || '').trim().toLowerCase();
      const num = Number(val);
      if (
        val === '-1' ||
        val === '300' ||
        val === '500' ||
        (Number.isFinite(num) && num >= 250) ||
        txt === 'all' ||
        txt === 'semua'
      ) {
        return true;
      }
    }
    return false;
  }

  async function ensureAllRowsDisplayed() {
    const prioritySelects = Array.from(
      document.querySelectorAll('select[name*="_length"], .dataTables_length select')
    );
    const allSelects = Array.from(document.querySelectorAll('select'));
    const candidates = Array.from(new Set([...prioritySelects, ...allSelects])).filter(isTargetLengthSelect);

    let expanded = false;
    let expandedTo = null;

    for (const selectEl of candidates) {
      let bestOption = null;
      let bestScore = -1;

      for (const opt of selectEl.options) {
        if (opt.disabled) continue;
        const score = scoreLengthOption(opt);
        if (score > bestScore) {
          bestScore = score;
          bestOption = opt;
        }
      }

      if (!bestOption || bestScore <= 0) continue;

      const selectedOpt = selectEl.options[selectEl.selectedIndex];
      const currentScore = scoreLengthOption(selectedOpt);

      if (currentScore < bestScore) {
        selectEl.value = bestOption.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        expanded = true;
        expandedTo = String(bestOption.textContent || bestOption.value).trim();
        break;
      }
    }

    if (expanded) {
      await sleep(600);
    }

    return { expanded: expanded, expandedTo: expandedTo };
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
      const includeEveryShift = Boolean(cfg.includeEveryShift);
      const autoShowAllRows = cfg.autoShowAllRows !== false;
      const equipmentMap = cfg.equipmentMap && typeof cfg.equipmentMap === 'object' ? cfg.equipmentMap : {};
      const runningExclusions = parseKeywordList(cfg.skipRunningKeywords);
      const standbyExclusions = parseKeywordList(cfg.skipStandbyKeywords);
      const delayMs = Math.max(0, Number(cfg.clickDelayMs) >= 0 ? Number(cfg.clickDelayMs) : 150);

      clearDryRunHighlights();

      let paginationInfo = { expanded: false, expandedTo: null };
      if (autoShowAllRows) {
        paginationInfo = await ensureAllRowsDisplayed();
      }

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

        if (!matchesSchedule(taskId, badgeText, scheduleFilter, includeEveryShift)) {
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
        includeEveryShift: includeEveryShift,
        expandedRows: paginationInfo.expanded,
        expandedTo: paginationInfo.expandedTo,
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
