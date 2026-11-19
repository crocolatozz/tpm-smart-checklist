(function () {
  'use strict';

  if (window.__SCR_CONTENT_LOADED__) {
    return;
  }
  window.__SCR_CONTENT_LOADED__ = true;

  const MODAL_HOST_ID = 'tpm-smart-checklist-modal-host';

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
  let activeModalState = null;

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

  function countConfiguredUnits(equipmentMap) {
    let running = 0;
    let standby = 0;
    const map = equipmentMap && typeof equipmentMap === 'object' ? equipmentMap : {};
    for (const val of Object.values(map)) {
      if (val === 'RUNNING') running++;
      else if (val === 'STANDBY') standby++;
    }
    return { running: running, standby: standby };
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
    }, 2800);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function safeRuntimeSend(message) {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
      try {
        const res = chrome.runtime.sendMessage(message);
        if (res && typeof res.catch === 'function') {
          res.catch(function () {});
        }
      } catch (err) {
        // popup may have closed mid-run
      }
    }
  }

  function emitProgress(progressPayload, localCallback) {
    if (typeof localCallback === 'function') {
      try {
        localCallback(progressPayload);
      } catch (err) {
        // ignore
      }
    }

    if (typeof window.__SCR_PROGRESS_CALLBACK__ === 'function') {
      try {
        window.__SCR_PROGRESS_CALLBACK__(progressPayload);
      } catch (err) {
        // ignore sandbox callback error
      }
    }

    safeRuntimeSend({
      action: 'SCR_EXECUTE_PROGRESS',
      payload: progressPayload
    });
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

  async function runChecklist(options, onProgressLocal) {
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
      const autoJumpOnFinish = cfg.autoJumpOnFinish !== false;
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
      let firstRemainingUnsetRow = null;

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

        emitProgress({ current: 0, total: totalToProcess, done: false }, onProgressLocal);
        lastProgressSentAt = Date.now();

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
            emitProgress(
              {
                current: completed,
                total: totalToProcess,
                tag: item.tag,
                done: completed === totalToProcess
              },
              onProgressLocal
            );
            lastProgressSentAt = now;
          }
        }

        const remainingInfo = scanRemainingActiveUnset(equipmentMap);
        remainingUnset = remainingInfo.remainingCount;
        firstRemainingUnsetRow = remainingInfo.firstUnsetRow;
        if (autoJumpOnFinish && firstRemainingUnsetRow) {
          applyJumpPulse(firstRemainingUnsetRow);
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
        remainingUnset: remainingUnset,
        firstRemainingUnsetRow: firstRemainingUnsetRow
      };
    } finally {
      window.__SCR_IS_RUNNING__ = false;
    }
  }

  /* ==================== ISOLATED SHADOW DOM MODAL ==================== */

  function createShadowSvg(name, size) {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVG_NS, 'svg');
    const px = Number(size) || 18;
    svg.setAttribute('width', String(px));
    svg.setAttribute('height', String(px));
    svg.setAttribute('viewBox', name === 'smart-logo' ? '0 0 128 128' : '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');

    if (name === 'smart-logo') {
      const bg = document.createElementNS(SVG_NS, 'rect');
      bg.setAttribute('x', '8');
      bg.setAttribute('y', '8');
      bg.setAttribute('width', '112');
      bg.setAttribute('height', '112');
      bg.setAttribute('rx', '28');
      bg.setAttribute('fill', '#2563eb');
      svg.appendChild(bg);

      const check = document.createElementNS(SVG_NS, 'path');
      check.setAttribute('d', 'M32 68 L52 88 L88 48');
      check.setAttribute('stroke', '#ffffff');
      check.setAttribute('stroke-width', '14');
      check.setAttribute('stroke-linecap', 'round');
      check.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(check);

      const spark = document.createElementNS(SVG_NS, 'path');
      spark.setAttribute('d', 'M94 14 L99.5 28.5 L114 34 L99.5 39.5 L94 54 L88.5 39.5 L74 34 L88.5 28.5 Z');
      spark.setAttribute('fill', '#fbbf24');
      spark.setAttribute('stroke', '#ffffff');
      spark.setAttribute('stroke-width', '2.5');
      spark.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(spark);
      return svg;
    }

    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const pathsByIcon = {
      'check-circle': [
        { tag: 'path', attrs: { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' } },
        { tag: 'path', attrs: { d: 'm9 11 3 3L22 4' } }
      ],
      'alert-triangle': [
        { tag: 'path', attrs: { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' } },
        { tag: 'path', attrs: { d: 'M12 9v4' } },
        { tag: 'path', attrs: { d: 'M12 17h.01' } }
      ],
      info: [
        { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
        { tag: 'path', attrs: { d: 'M12 16v-4' } },
        { tag: 'path', attrs: { d: 'M12 8h.01' } }
      ],
      'arrow-right': [
        { tag: 'path', attrs: { d: 'M5 12h14' } },
        { tag: 'path', attrs: { d: 'm12 5 7 7-7 7' } }
      ]
    };

    const defs = pathsByIcon[name] || [];
    for (const def of defs) {
      const node = document.createElementNS(SVG_NS, def.tag);
      for (const [k, v] of Object.entries(def.attrs)) {
        node.setAttribute(k, v);
      }
      svg.appendChild(node);
    }
    return svg;
  }

  function getShadowModalCss() {
    return `
      :host {
        all: initial;
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      .tpm-backdrop {
        --bg-card: #ffffff;
        --bg-subtle: #f8fafc;
        --bg-inset: #eef2f6;
        --border-color: #dce3ec;
        --border-strong: #c4cedb;
        --text-primary: #0f172a;
        --text-secondary: #475569;
        --text-muted: #64748b;
        --accent: #2563eb;
        --accent-hover: #1d4ed8;
        --accent-soft: rgba(37, 99, 235, 0.12);
        --green: #16a34a;
        --green-soft: rgba(22, 163, 74, 0.14);
        --amber: #b45309;
        --amber-bg: #fffbeb;
        --amber-border: #fcd34d;
        --amber-soft: rgba(217, 119, 6, 0.16);

        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }

      .tpm-backdrop[data-theme="dark"] {
        --bg-card: #111827;
        --bg-subtle: #161f30;
        --bg-inset: #0d1422;
        --border-color: rgba(255, 255, 255, 0.12);
        --border-strong: rgba(255, 255, 255, 0.2);
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --text-muted: #94a3b8;
        --accent: #3b82f6;
        --accent-hover: #2563eb;
        --accent-soft: rgba(59, 130, 246, 0.18);
        --green: #22c55e;
        --green-soft: rgba(34, 197, 94, 0.18);
        --amber: #fbbf24;
        --amber-bg: rgba(245, 158, 11, 0.14);
        --amber-border: rgba(245, 158, 11, 0.45);
        --amber-soft: rgba(245, 158, 11, 0.18);
      }

      .tpm-modal {
        width: 100%;
        max-width: 430px;
        background: var(--bg-card);
        color: var(--text-primary);
        border: 1px solid var(--border-strong);
        border-radius: 14px;
        box-shadow: 0 24px 56px rgba(0, 0, 0, 0.42);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        animation: tpmPop 150ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes tpmPop {
        from { opacity: 0; transform: scale(0.97) translateY(4px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }

      .tpm-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .tpm-icon-badge {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .tpm-icon-badge.is-success {
        background: var(--green-soft);
        color: var(--green);
      }

      .tpm-icon-badge.is-warn {
        background: var(--amber-soft);
        color: var(--amber);
      }

      .tpm-title {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        line-height: 1.3;
        color: var(--text-primary);
      }

      .tpm-sub {
        margin: 2px 0 0;
        font-size: 12.5px;
        color: var(--text-muted);
      }

      .tpm-info-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-subtle);
      }

      .tpm-info-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;
      }

      .tpm-info-key {
        color: var(--text-muted);
        font-weight: 500;
      }

      .tpm-info-val {
        color: var(--text-primary);
        font-weight: 700;
        text-align: right;
      }

      .tpm-unit-chips {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .tpm-unit-chip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 12px;
        border-radius: 9px;
        border: 1px solid var(--border-color);
        background: var(--bg-subtle);
        font-size: 12.5px;
        font-weight: 600;
      }

      .tpm-unit-chip.is-running .tpm-chip-num {
        color: var(--green);
      }

      .tpm-unit-chip.is-standby .tpm-chip-num {
        color: var(--amber);
      }

      .tpm-chip-num {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 15px;
        font-weight: 700;
      }

      .tpm-progress-box {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-subtle);
      }

      .tpm-progress-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        font-variant-numeric: tabular-nums;
      }

      .tpm-progress-tag {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11.5px;
        color: var(--text-muted);
        min-height: 16px;
      }

      .tpm-progress-track {
        width: 100%;
        height: 8px;
        border-radius: 999px;
        background: var(--bg-inset);
        overflow: hidden;
      }

      .tpm-progress-fill {
        width: 0%;
        height: 100%;
        border-radius: 999px;
        background: var(--accent);
        transition: width 110ms linear;
      }

      .tpm-banner {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        padding: 10px 12px;
        border-radius: 9px;
        border: 1px solid var(--amber-border);
        background: var(--amber-bg);
        color: var(--amber);
        font-size: 12.5px;
        font-weight: 600;
        line-height: 1.45;
      }

      .tpm-banner svg {
        flex-shrink: 0;
        margin-top: 1px;
      }

      .tpm-remain-note {
        font-size: 12.5px;
        color: var(--text-secondary);
        line-height: 1.45;
        margin: 0;
      }

      .tpm-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 2px;
      }

      .tpm-btn {
        height: 36px;
        padding: 0 15px;
        border-radius: 8px;
        border: 1px solid var(--border-strong);
        background: var(--bg-subtle);
        color: var(--text-primary);
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: background-color 140ms ease, border-color 140ms ease;
      }

      .tpm-btn:hover {
        background: var(--bg-inset);
      }

      .tpm-btn:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }

      .tpm-btn-primary {
        background: var(--accent);
        border-color: var(--accent);
        color: #ffffff;
      }

      .tpm-btn-primary:hover {
        background: var(--accent-hover);
        border-color: var(--accent-hover);
      }
    `;
  }

  function lockBackgroundScroll() {
    const htmlOverflow = document.documentElement ? document.documentElement.style.overflow : '';
    const bodyOverflow = document.body ? document.body.style.overflow : '';
    if (document.documentElement) document.documentElement.style.overflow = 'hidden';
    if (document.body) document.body.style.overflow = 'hidden';
    return function restore() {
      if (document.documentElement) document.documentElement.style.overflow = htmlOverflow;
      if (document.body) document.body.style.overflow = bodyOverflow;
    };
  }

  function closeActiveModal() {
    if (!activeModalState) return;
    if (typeof activeModalState.restoreScroll === 'function') {
      activeModalState.restoreScroll();
      activeModalState.restoreScroll = null;
    }
    if (typeof activeModalState.removeKeyListener === 'function') {
      activeModalState.removeKeyListener();
      activeModalState.removeKeyListener = null;
    }
    if (activeModalState.host && activeModalState.host.parentNode) {
      activeModalState.host.parentNode.removeChild(activeModalState.host);
    }
    activeModalState = null;
  }

  function openWorkflowModal(payload) {
    if (activeModalState || document.getElementById(MODAL_HOST_ID)) {
      return { ok: true, alreadyOpen: true };
    }

    const host = document.createElement('div');
    host.id = MODAL_HOST_ID;
    const shadow = host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = getShadowModalCss();

    const backdrop = document.createElement('div');
    backdrop.className = 'tpm-backdrop';
    backdrop.setAttribute('data-theme', payload.theme === 'dark' ? 'dark' : 'light');
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'tpm-modal';
    backdrop.appendChild(modal);
    shadow.appendChild(styleEl);
    shadow.appendChild(backdrop);

    document.documentElement.appendChild(host);

    const restoreScroll = lockBackgroundScroll();

    const state = {
      host: host,
      modal: modal,
      backdrop: backdrop,
      stage: 'confirm',
      restoreScroll: restoreScroll,
      removeKeyListener: null,
      onEnter: null,
      onEscape: null
    };
    activeModalState = state;

    function handleKeyDown(e) {
      if (!activeModalState) return;
      if (state.stage === 'progress') {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (e.key === 'Escape' && typeof state.onEscape === 'function') {
        e.preventDefault();
        e.stopPropagation();
        state.onEscape();
      } else if (e.key === 'Enter' && typeof state.onEnter === 'function') {
        e.preventDefault();
        e.stopPropagation();
        state.onEnter();
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    state.removeKeyListener = function () {
      window.removeEventListener('keydown', handleKeyDown, true);
    };

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop && state.stage !== 'progress' && typeof state.onEscape === 'function') {
        state.onEscape();
      }
    });

    function renderWarningNoRows() {
      state.stage = 'warning';
      modal.replaceChildren();

      const header = document.createElement('div');
      header.className = 'tpm-header';
      const iconBox = document.createElement('div');
      iconBox.className = 'tpm-icon-badge is-warn';
      iconBox.appendChild(createShadowSvg('alert-triangle', 20));
      const titleWrap = document.createElement('div');
      const title = document.createElement('h2');
      title.className = 'tpm-title';
      title.textContent = 'Tabel Checklist Tidak Ditemukan';
      const sub = document.createElement('p');
      sub.className = 'tpm-sub';
      sub.textContent = 'Tidak ada baris checklist (0 baris) pada halaman web TPM ini.';
      titleWrap.appendChild(title);
      titleWrap.appendChild(sub);
      header.appendChild(iconBox);
      header.appendChild(titleWrap);

      const note = document.createElement('p');
      note.className = 'tpm-remain-note';
      note.textContent = 'Pastikan Anda membuka halaman daftar checklist web TPM yang sudah menampilkan tabel equipment sebelum menjalankan Smart Checklist.';

      const actions = document.createElement('div');
      actions.className = 'tpm-actions';
      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'tpm-btn tpm-btn-primary';
      okBtn.textContent = 'Tutup';
      okBtn.addEventListener('click', closeActiveModal);
      actions.appendChild(okBtn);

      modal.appendChild(header);
      modal.appendChild(note);
      modal.appendChild(actions);

      state.onEscape = closeActiveModal;
      state.onEnter = closeActiveModal;
      okBtn.focus();
    }

    function renderStage3(result) {
      state.stage = 'completion';
      if (typeof state.restoreScroll === 'function') {
        state.restoreScroll();
        state.restoreScroll = null;
      }
      modal.replaceChildren();

      const unitCounts = countConfiguredUnits(payload.equipmentMap);
      const remainingCount = Number(result.remainingUnset) || 0;
      const firstUnsetRow = result.firstRemainingUnsetRow || null;

      const header = document.createElement('div');
      header.className = 'tpm-header';
      const iconBox = document.createElement('div');
      iconBox.className = 'tpm-icon-badge is-success';
      iconBox.appendChild(createShadowSvg('check-circle', 20));
      const titleWrap = document.createElement('div');
      const title = document.createElement('h2');
      title.className = 'tpm-title';
      title.textContent = 'Telah dilakukan Smart Checklist';
      const sub = document.createElement('p');
      sub.className = 'tpm-sub';
      sub.textContent = (payload.operatorLabel || 'Operator 1') + ' · ' + (payload.scheduleLabel || 'Semua Jadwal');
      titleWrap.appendChild(title);
      titleWrap.appendChild(sub);
      header.appendChild(iconBox);
      header.appendChild(titleWrap);

      const unitChips = document.createElement('div');
      unitChips.className = 'tpm-unit-chips';

      const runningChip = document.createElement('div');
      runningChip.className = 'tpm-unit-chip is-running';
      const runLbl = document.createElement('span');
      runLbl.textContent = 'Unit Running';
      const runVal = document.createElement('span');
      runVal.className = 'tpm-chip-num';
      runVal.textContent = String(unitCounts.running);
      runningChip.appendChild(runLbl);
      runningChip.appendChild(runVal);

      const standbyChip = document.createElement('div');
      standbyChip.className = 'tpm-unit-chip is-standby';
      const stbyLbl = document.createElement('span');
      stbyLbl.textContent = 'Unit Standby';
      const stbyVal = document.createElement('span');
      stbyVal.className = 'tpm-chip-num';
      stbyVal.textContent = String(unitCounts.standby);
      standbyChip.appendChild(stbyLbl);
      standbyChip.appendChild(stbyVal);

      unitChips.appendChild(runningChip);
      unitChips.appendChild(standbyChip);

      const banner = document.createElement('div');
      banner.className = 'tpm-banner';
      banner.appendChild(createShadowSvg('alert-triangle', 16));
      const bannerText = document.createElement('span');
      bannerText.textContent =
        'Operator tetap wajib menekan tombol "Save" bawaan web TPM untuk menyimpan perubahan secara permanen.';
      banner.appendChild(bannerText);

      const remainNote = document.createElement('p');
      remainNote.className = 'tpm-remain-note';

      const actions = document.createElement('div');
      actions.className = 'tpm-actions';

      if (remainingCount === 0) {
        remainNote.textContent = 'Seluruh task unit aktif (Running / Standby) pada tampilan saat ini sudah terisi.';
        const doneBtn = document.createElement('button');
        doneBtn.type = 'button';
        doneBtn.className = 'tpm-btn tpm-btn-primary';
        doneBtn.textContent = 'Selesai';
        doneBtn.addEventListener('click', closeActiveModal);
        actions.appendChild(doneBtn);

        state.onEscape = closeActiveModal;
        state.onEnter = closeActiveModal;

        modal.appendChild(header);
        modal.appendChild(unitChips);
        modal.appendChild(banner);
        modal.appendChild(remainNote);
        modal.appendChild(actions);
        doneBtn.focus();
      } else {
        remainNote.textContent =
          'Masih terdapat ' + remainingCount + ' baris unit aktif (Running / Standby) yang berstatus Unset.';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'tpm-btn';
        closeBtn.textContent = 'Tutup';
        closeBtn.addEventListener('click', closeActiveModal);

        function jumpToFirstRemaining() {
          closeActiveModal();
          if (firstUnsetRow) {
            applyJumpPulse(firstUnsetRow);
          }
        }

        const jumpBtn = document.createElement('button');
        jumpBtn.type = 'button';
        jumpBtn.className = 'tpm-btn tpm-btn-primary';
        jumpBtn.appendChild(document.createTextNode('Loncat ke Sisa (' + remainingCount + ')'));
        jumpBtn.appendChild(createShadowSvg('arrow-right', 15));
        jumpBtn.addEventListener('click', jumpToFirstRemaining);

        actions.appendChild(closeBtn);
        actions.appendChild(jumpBtn);

        state.onEscape = closeActiveModal;
        state.onEnter = jumpToFirstRemaining;

        modal.appendChild(header);
        modal.appendChild(unitChips);
        modal.appendChild(banner);
        modal.appendChild(remainNote);
        modal.appendChild(actions);
        jumpBtn.focus();
      }
    }

    async function startStage2Execution() {
      state.stage = 'progress';
      state.onEscape = null;
      state.onEnter = null;
      modal.replaceChildren();

      const header = document.createElement('div');
      header.className = 'tpm-header';
      header.appendChild(createShadowSvg('smart-logo', 36));
      const titleWrap = document.createElement('div');
      const title = document.createElement('h2');
      title.className = 'tpm-title';
      title.textContent = 'Menjalankan Smart Checklist...';
      const sub = document.createElement('p');
      sub.className = 'tpm-sub';
      sub.textContent = 'Mohon tunggu, sedang memperbarui status checkbox web TPM.';
      titleWrap.appendChild(title);
      titleWrap.appendChild(sub);
      header.appendChild(titleWrap);

      const progBox = document.createElement('div');
      progBox.className = 'tpm-progress-box';
      const progLabel = document.createElement('div');
      progLabel.className = 'tpm-progress-label';
      progLabel.textContent = 'Memindai baris checklist...';
      const progTrack = document.createElement('div');
      progTrack.className = 'tpm-progress-track';
      const progFill = document.createElement('div');
      progFill.className = 'tpm-progress-fill';
      progTrack.appendChild(progFill);
      const progTag = document.createElement('div');
      progTag.className = 'tpm-progress-tag';
      progTag.textContent = '';

      progBox.appendChild(progLabel);
      progBox.appendChild(progTrack);
      progBox.appendChild(progTag);

      modal.appendChild(header);
      modal.appendChild(progBox);

      const result = await runChecklist(
        {
          ...payload,
          dryRun: false,
          autoJumpOnFinish: false
        },
        function (prog) {
          const total = Math.max(0, Number(prog.total) || 0);
          const current = Math.min(total, Math.max(0, Number(prog.current) || 0));
          const pct = total > 0 ? Math.round((current / total) * 100) : 100;
          progLabel.textContent =
            total > 0
              ? 'Memproses ' + current + ' / ' + total + ' baris...'
              : 'Memeriksa baris checklist...';
          progFill.style.width = pct + '%';
          if (prog.tag) {
            progTag.textContent = 'Equipment: ' + prog.tag;
          }
        }
      );

      if (!result || !result.ok) {
        closeActiveModal();
        return;
      }

      if ((result.totalScanned || 0) === 0) {
        renderWarningNoRows();
        return;
      }

      safeRuntimeSend({
        action: 'SCR_WORKFLOW_COMPLETE',
        payload: {
          timestamp: new Date().toISOString(),
          operatorId: payload.operatorId || 'op1',
          operatorLabel: payload.operatorLabel || 'Operator 1',
          mode: 'Execute',
          scheduleFilter: payload.scheduleFilter || 'all',
          includeEveryShift: Boolean(payload.includeEveryShift),
          totalScanned: result.totalScanned,
          setToExecuted: result.setToExecuted,
          setToNotExecuted: result.setToNotExecuted,
          alreadySet: result.alreadySet,
          untouchedCount: result.untouchedCount,
          remainingUnset: result.remainingUnset
        }
      });

      renderStage3(result);
    }

    function renderStage1Confirmation() {
      state.stage = 'confirm';
      modal.replaceChildren();

      const header = document.createElement('div');
      header.className = 'tpm-header';
      header.appendChild(createShadowSvg('smart-logo', 36));
      const titleWrap = document.createElement('div');
      const title = document.createElement('h2');
      title.className = 'tpm-title';
      title.textContent = 'Konfirmasi Smart Checklist';
      const sub = document.createElement('p');
      sub.className = 'tpm-sub';
      sub.textContent = 'Periksa operator dan jadwal sebelum mengisi checklist web TPM.';
      titleWrap.appendChild(title);
      titleWrap.appendChild(sub);
      header.appendChild(titleWrap);

      const grid = document.createElement('div');
      grid.className = 'tpm-info-grid';

      const rowsData = [
        { k: 'Operator', v: payload.operatorLabel || 'Operator 1' },
        { k: 'Shift / Jadwal', v: payload.scheduleLabel || payload.scheduleFilter || 'Semua Jadwal' },
        { k: 'Task Every Shift', v: payload.includeEveryShift ? 'Disertakan' : 'Tidak disertakan' }
      ];

      for (const item of rowsData) {
        const r = document.createElement('div');
        r.className = 'tpm-info-row';
        const k = document.createElement('span');
        k.className = 'tpm-info-key';
        k.textContent = item.k;
        const v = document.createElement('span');
        v.className = 'tpm-info-val';
        v.textContent = item.v;
        r.appendChild(k);
        r.appendChild(v);
        grid.appendChild(r);
      }

      const actions = document.createElement('div');
      actions.className = 'tpm-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'tpm-btn';
      cancelBtn.textContent = 'Batal';
      cancelBtn.addEventListener('click', closeActiveModal);

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'tpm-btn tpm-btn-primary';
      confirmBtn.textContent = 'Ya, Jalankan';
      confirmBtn.addEventListener('click', startStage2Execution);

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);

      modal.appendChild(header);
      modal.appendChild(grid);
      modal.appendChild(actions);

      state.onEscape = closeActiveModal;
      state.onEnter = startStage2Execution;
      confirmBtn.focus();
    }

    const initialRowCount = document.querySelectorAll('tr[data-task-id]').length;
    if (initialRowCount === 0) {
      renderWarningNoRows();
    } else {
      renderStage1Confirmation();
    }

    return { ok: true, opened: true };
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
      if (!message || typeof message !== 'object') return false;

      if (message.action === 'SCR_START_WORKFLOW') {
        const res = openWorkflowModal(message.payload || {});
        sendResponse(res);
        return false;
      }

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
