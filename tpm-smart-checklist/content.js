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

  let jumpPulseTimer = null;

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
      if (child.getAttribute('data-scr-preview-badge') === 'true') continue;
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

  function getCheckboxState(row, checkbox) {
    if (!checkbox) return 'UNSET';

    if (checkbox.classList.contains('bg-success')) return 'EXECUTED';
    if (checkbox.classList.contains('bg-danger')) return 'NOT_EXECUTED';
    if (checkbox.classList.contains('bg-dark')) return 'UNSET';

    const id = checkbox.getAttribute('id');
    let labelEl = null;
    if (id && row) {
      labelEl = row.querySelector('label[for="' + CSS.escape(id) + '"]');
    }
    if (!labelEl && id) {
      labelEl = document.querySelector('label[for="' + CSS.escape(id) + '"]');
    }
    if (!labelEl && checkbox.parentElement) {
      labelEl = checkbox.parentElement.querySelector('label');
    }

    if (labelEl) {
      const span = labelEl.querySelector('span');
      const rawText = (span ? span.textContent : labelEl.textContent || '').trim().toLowerCase();
      if (rawText === 'executed') return 'EXECUTED';
      if (rawText === 'not executed') return 'NOT_EXECUTED';
      if (rawText === 'unset') return 'UNSET';
    }

    return checkbox.checked ? 'EXECUTED' : 'UNSET';
  }

  function calculateClicksNeeded(currentState, targetState) {
    if (currentState === targetState) return 0;
    if (targetState === 'EXECUTED') {
      if (currentState === 'UNSET') return 1;
      if (currentState === 'NOT_EXECUTED') return 2;
    }
    if (targetState === 'NOT_EXECUTED') {
      if (currentState === 'UNSET') return 2;
      if (currentState === 'EXECUTED') return 1;
    }
    return 0;
  }

  function isRowVisible(row) {
    if (!row || row.hidden) return false;
    const style = window.getComputedStyle(row);
    return style.display !== 'none' && style.visibility !== 'hidden';
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

  function clearJumpHighlight() {
    if (jumpPulseTimer) {
      clearTimeout(jumpPulseTimer);
      jumpPulseTimer = null;
    }
    const jumped = document.querySelectorAll('tr[data-task-id][data-scr-jump="true"]');
    for (const row of jumped) {
      row.removeAttribute('data-scr-jump');
      row.style.outline = row.dataset.scrJumpPrevOutline || '';
      row.style.outlineOffset = row.dataset.scrJumpPrevOffset || '';
      row.style.backgroundColor = row.dataset.scrJumpPrevBg || '';
      delete row.dataset.scrJumpPrevOutline;
      delete row.dataset.scrJumpPrevOffset;
      delete row.dataset.scrJumpPrevBg;
    }
  }

  function clearDryRunPreview() {
    const badges = document.querySelectorAll('[data-scr-preview-badge="true"]');
    for (const badge of badges) {
      badge.remove();
    }

    const highlighted = document.querySelectorAll('tr[data-task-id][data-scr-dryrun="true"]');
    const clearedCount = highlighted.length;
    for (const row of highlighted) {
      row.removeAttribute('data-scr-dryrun');
      row.style.outline = row.dataset.scrPrevOutline || '';
      row.style.outlineOffset = row.dataset.scrPrevOutlineOffset || '';
      row.style.backgroundColor = row.dataset.scrPrevBg || '';
      row.style.color = row.dataset.scrPrevColor || '';
      delete row.dataset.scrPrevOutline;
      delete row.dataset.scrPrevOutlineOffset;
      delete row.dataset.scrPrevBg;
      delete row.dataset.scrPrevColor;

      const mutedEls = row.querySelectorAll('[data-scr-prev-color]');
      for (const el of mutedEls) {
        el.style.color = el.dataset.scrPrevColor || '';
        delete el.dataset.scrPrevColor;
      }
    }

    clearJumpHighlight();
    return clearedCount;
  }

  function applyDryRunHighlight(row, targetState) {
    if (row.getAttribute('data-scr-dryrun') !== 'true') {
      row.dataset.scrPrevOutline = row.style.outline || '';
      row.dataset.scrPrevOutlineOffset = row.style.outlineOffset || '';
      row.dataset.scrPrevBg = row.style.backgroundColor || '';
      row.dataset.scrPrevColor = row.style.color || '';
    }

    const isNotExec = targetState === 'NOT_EXECUTED';
    row.setAttribute('data-scr-dryrun', 'true');
    row.style.outline = isNotExec ? '2px solid #f97316' : '2px solid #22c55e';
    row.style.outlineOffset = '-2px';
    row.style.backgroundColor = isNotExec ? '#ffedd5' : '#dcfce7';
    row.style.color = '#0f172a';

    const textEls = row.querySelectorAll('.fw-bold, .small.text-muted, td');
    for (const el of textEls) {
      if (!Object.prototype.hasOwnProperty.call(el.dataset, 'scrPrevColor')) {
        el.dataset.scrPrevColor = el.style.color || '';
      }
      el.style.color = el.classList.contains('text-muted') ? '#334155' : '#0f172a';
    }

    const taskCell = row.querySelector('td.task-column') || row.querySelector('td:nth-child(1)');
    if (taskCell) {
      const badge = document.createElement('span');
      badge.setAttribute('data-scr-preview-badge', 'true');
      badge.textContent = isNotExec ? 'Dry Run → Not Executed' : 'Dry Run → Executed';
      badge.style.display = 'inline-block';
      badge.style.marginTop = '4px';
      badge.style.padding = '2px 7px';
      badge.style.borderRadius = '4px';
      badge.style.fontSize = '10.5px';
      badge.style.fontWeight = '700';
      badge.style.letterSpacing = '0.02em';
      badge.style.backgroundColor = isNotExec ? '#fed7aa' : '#bbf7d0';
      badge.style.color = isNotExec ? '#9a3412' : '#166534';
      badge.style.border = isNotExec ? '1px solid #fb923c' : '1px solid #4ade80';
      taskCell.appendChild(badge);
    }
  }

  function applyJumpPulse(row) {
    if (!row) return;
    clearJumpHighlight();

    row.dataset.scrJumpPrevOutline = row.style.outline || '';
    row.dataset.scrJumpPrevOffset = row.style.outlineOffset || '';
    row.dataset.scrJumpPrevBg = row.style.backgroundColor || '';
    row.setAttribute('data-scr-jump', 'true');

    row.style.outline = '2px solid #f59e0b';
    row.style.outlineOffset = '-2px';

    if (typeof row.scrollIntoView === 'function') {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (typeof row.animate === 'function') {
      try {
        row.animate(
          [
            { backgroundColor: 'rgba(245, 158, 11, 0.28)', outlineColor: '#f59e0b' },
            { backgroundColor: 'rgba(245, 158, 11, 0.06)', outlineColor: '#fbbf24' },
            { backgroundColor: 'rgba(245, 158, 11, 0.28)', outlineColor: '#f59e0b' }
          ],
          { duration: 850, iterations: 3 }
        );
      } catch (err) {
        // ignore animation unsupported
      }
    }

    jumpPulseTimer = setTimeout(function () {
      clearJumpHighlight();
    }, 2700);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function emitProgress(progressPayload) {
    if (typeof window.__SCR_PROGRESS_CALLBACK__ === 'function') {
      try {
        window.__SCR_PROGRESS_CALLBACK__(progressPayload);
      } catch (err) {
        // ignore sandbox callback error
      }
    }

    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
      try {
        const res = chrome.runtime.sendMessage({
          action: 'SCR_EXECUTE_PROGRESS',
          payload: progressPayload
        });
        if (res && typeof res.catch === 'function') {
          res.catch(function () {});
        }
      } catch (err) {
        // popup may have closed mid-run
      }
    }
  }

  async function transitionCheckbox(row, checkbox, currentState, targetState) {
    const clicksNeeded = calculateClicksNeeded(currentState, targetState);
    if (clicksNeeded === 0) return false;

    checkbox.click();

    if (clicksNeeded === 2) {
      await sleep(100);
      let midState = getCheckboxState(row, checkbox);
      if (midState === currentState) {
        await sleep(60);
        midState = getCheckboxState(row, checkbox);
      }
      if (midState !== targetState) {
        checkbox.click();
      }
    }

    return true;
  }

  function scanRemainingActiveUnset(equipmentMap) {
    const rows = Array.from(document.querySelectorAll('tr[data-task-id]'));
    let remainingCount = 0;
    let firstUnsetRow = null;

    for (const row of rows) {
      if (!isRowVisible(row)) continue;
      const firstCell = row.querySelector('td:nth-child(1)');
      const tag = extractEquipmentTag(firstCell);
      const equipState = tag ? equipmentMap[tag] : null;

      // Strictly only active operator preset units (RUNNING or STANDBY)
      if (equipState !== 'RUNNING' && equipState !== 'STANDBY') {
        continue;
      }

      const checkbox = row.querySelector('input[type="checkbox"][id^="is_executed_"]');
      if (!checkbox || checkbox.disabled) continue;

      if (getCheckboxState(row, checkbox) === 'UNSET') {
        remainingCount++;
        if (!firstUnsetRow) {
          firstUnsetRow = row;
        }
      }
    }

    return { remainingCount: remainingCount, firstUnsetRow: firstUnsetRow };
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

      clearDryRunPreview();

      let paginationInfo = { expanded: false, expandedTo: null };
      if (autoShowAllRows) {
        paginationInfo = await ensureAllRowsDisplayed();
      }

      const rows = Array.from(document.querySelectorAll('tr[data-task-id]'));
      const totalScanned = rows.length;
      const plannedActions = [];
      const plannedRowSet = new Set();
      let setToExecuted = 0;
      let setToNotExecuted = 0;
      let alreadySet = 0;
      let untouchedCount = 0;
      let firstMatchedRow = null;

      for (const row of rows) {
        const taskId = row.getAttribute('data-task-id') || '';
        const firstCell = row.querySelector('td:nth-child(1)');
        const tag = extractEquipmentTag(firstCell);
        const badgeText = extractBadgeText(firstCell);

        if (!matchesSchedule(taskId, badgeText, scheduleFilter, includeEveryShift)) {
          untouchedCount++;
          continue;
        }

        const equipState = tag ? equipmentMap[tag] : null;
        if (equipState !== 'RUNNING' && equipState !== 'STANDBY') {
          // IGNORE or unlisted in active operator preset -> leave untouched
          untouchedCount++;
          continue;
        }

        // Strict Checkbox Boundary: ONLY input[type="checkbox"][id^="is_executed_"]
        const checkbox = row.querySelector('input[type="checkbox"][id^="is_executed_"]');
        if (!checkbox || checkbox.disabled) {
          untouchedCount++;
          continue;
        }

        const taskText = extractTaskText(row);
        const activeExclusions = equipState === 'RUNNING' ? runningExclusions : standbyExclusions;
        const hitKeyword = findMatchedKeyword(taskText, activeExclusions);
        const targetState = hitKeyword ? 'NOT_EXECUTED' : 'EXECUTED';

        const currentState = getCheckboxState(row, checkbox);
        const clicksNeeded = calculateClicksNeeded(currentState, targetState);

        if (clicksNeeded === 0) {
          alreadySet++;
          continue;
        }

        if (!firstMatchedRow) {
          firstMatchedRow = row;
        }

        plannedRowSet.add(row);
        plannedActions.push({
          row: row,
          checkbox: checkbox,
          tag: tag,
          currentState: currentState,
          targetState: targetState
        });
      }

      let remainingUnset = 0;

      if (dryRun) {
        for (const item of plannedActions) {
          applyDryRunHighlight(item.row, item.targetState);
          if (item.targetState === 'EXECUTED') {
            setToExecuted++;
          } else {
            setToNotExecuted++;
          }
        }

        if (firstMatchedRow && typeof firstMatchedRow.scrollIntoView === 'function') {
          firstMatchedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Count active Unset rows that are not part of the planned Dry Run batch
        for (const row of rows) {
          if (plannedRowSet.has(row) || !isRowVisible(row)) continue;
          const firstCell = row.querySelector('td:nth-child(1)');
          const tag = extractEquipmentTag(firstCell);
          const equipState = tag ? equipmentMap[tag] : null;
          if (equipState !== 'RUNNING' && equipState !== 'STANDBY') continue;
          const checkbox = row.querySelector('input[type="checkbox"][id^="is_executed_"]');
          if (!checkbox || checkbox.disabled) continue;
          if (getCheckboxState(row, checkbox) === 'UNSET') {
            remainingUnset++;
          }
        }
      } else {
        const totalToProcess = plannedActions.length;
        let lastProgressSentAt = 0;

        if (totalToProcess > 0) {
          emitProgress({ current: 0, total: totalToProcess, done: false });
          lastProgressSentAt = Date.now();
        }

        for (let i = 0; i < totalToProcess; i++) {
          const item = plannedActions[i];
          await transitionCheckbox(item.row, item.checkbox, item.currentState, item.targetState);
          if (item.targetState === 'EXECUTED') {
            setToExecuted++;
          } else {
            setToNotExecuted++;
          }

          if (delayMs > 0) {
            await sleep(delayMs);
          }

          const completed = i + 1;
          const now = Date.now();
          if (completed === 1 || completed === totalToProcess || now - lastProgressSentAt >= 80) {
            emitProgress({
              current: completed,
              total: totalToProcess,
              tag: item.tag,
              done: completed === totalToProcess
            });
            lastProgressSentAt = now;
          }
        }

        const remainingInfo = scanRemainingActiveUnset(equipmentMap);
        remainingUnset = remainingInfo.remainingCount;
        if (remainingInfo.firstUnsetRow) {
          applyJumpPulse(remainingInfo.firstUnsetRow);
        }
      }

      return {
        ok: true,
        dryRun: dryRun,
        scheduleFilter: scheduleFilter,
        includeEveryShift: includeEveryShift,
        expandedRows: paginationInfo.expanded,
        expandedTo: paginationInfo.expandedTo,
        totalScanned: totalScanned,
        setToExecuted: setToExecuted,
        setToNotExecuted: setToNotExecuted,
        alreadySet: alreadySet,
        untouchedCount: untouchedCount,
        remainingUnset: remainingUnset
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

      if (message.action === 'SCR_CLEAR_DRY_RUN' || message.action === 'SCR_CLEAR_HIGHLIGHTS') {
        const clearedCount = clearDryRunPreview();
        sendResponse({ ok: true, clearedCount: clearedCount });
        return false;
      }

      return false;
    });
  }
})();
