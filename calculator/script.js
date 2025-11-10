'use strict';

const calculatorEl = document.getElementById('calculator');
const buttons = document.querySelectorAll('.btn');
const resultEl = document.getElementById('result');
const historyEl = document.getElementById('history'); 
const themeBtn = document.getElementById('themeBtn');
const replayBtn = document.getElementById('replay');

const historyBtn = document.getElementById('historyBtn'); // new
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');


let currentInput = '';
let undoStack = [];
let completedHistory = []; // stores {expr, result}

function pushUndo(state) {
  if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== state) {
    undoStack.push(state);
    if (undoStack.length > 120) undoStack.shift();
  }
}
function popUndo() {
  if (undoStack.length === 0) return null;
  return undoStack.pop();
}
function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return n;
  if (Math.abs(n - Math.round(n)) < 1e-9) return Number(n).toLocaleString();
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 8 });
}
function computePreview(expr) {
  if (!expr || expr.trim() === '') return null;
  let jsExpr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  jsExpr = jsExpr.replace(/([0-9.]+)%/g, '($1*0.01)');
  jsExpr = jsExpr.replace(/[+\-*/. ]+$/, '');
  if (jsExpr.trim() === '') return null;
  try {
    const value = Function('"use strict";return (' + jsExpr + ')')();
    if (!isFinite(value)) return null;
    return value;
  } catch (e) {
    return null;
  }
}
function updateDisplay() {
  if (historyEl) historyEl.textContent = currentInput || '0';
  const preview = computePreview(currentInput);
  if (preview !== null && resultEl) {
    resultEl.textContent = formatNumber(preview);
  } else if (resultEl) {
    const tokens = currentInput.trim().split(/\s+/);
    const last = tokens[tokens.length - 1] || '';
    resultEl.textContent = last ? last : '0';
  }
}


function renderHistory() {
  if (!historyList) return;
  historyList.innerHTML = '';
  if (completedHistory.length === 0) {
    const el = document.createElement('div');
    el.className = 'muted';
    el.textContent = 'No calculations yet';
    historyList.appendChild(el);
    return;
  }

  const arr = completedHistory.slice().reverse();
  arr.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.tabIndex = 0;
    row.dataset.idx = (completedHistory.length - 1 - idx);
    const expr = document.createElement('div');
    expr.className = 'history-expr';
    expr.textContent = item.expr;
    const val = document.createElement('div');
    val.className = 'history-val';
    val.textContent = formatNumber(item.result);
    row.appendChild(expr);
    row.appendChild(val);

    row.addEventListener('click', () => {
      pushUndo(currentInput);
      currentInput = item.expr;
      updateDisplay();
      closeHistoryPanel();
    });

    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        row.click();
      }
    });

    historyList.appendChild(row);
  });
}

function addHistoryEntry(expr, value) {
  completedHistory.push({ expr, result: value });
  if (completedHistory.length > 200) completedHistory.shift();
  renderHistory();
}

function clearHistory() {
  completedHistory = [];
  renderHistory();
}


function openHistoryPanel() {
  if (!historyPanel) return;
  historyPanel.classList.add('open');
  historyPanel.setAttribute('aria-hidden', 'false');
}
function closeHistoryPanel() {
  if (!historyPanel) return;
  historyPanel.classList.remove('open');
  historyPanel.setAttribute('aria-hidden', 'true');
}
function toggleHistoryPanel() {
  if (!historyPanel) return;
  if (historyPanel.classList.contains('open')) closeHistoryPanel();
  else openHistoryPanel();
}
if (historyBtn) {
  historyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleHistoryPanel();
  });
}
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearHistory();
  });
}
document.addEventListener('click', (e) => {
  if (!historyPanel) return;
  if (!historyPanel.classList.contains('open')) return;
  const isInside = historyPanel.contains(e.target) || (historyBtn && historyBtn.contains(e.target));
  if (!isInside) closeHistoryPanel();
});


buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const value = btn.dataset.value;
    pushUndo(currentInput);

    if (value === 'AC') { currentInput = ''; updateDisplay(); return; }

    if (value === '+/-') {
      const tokens = currentInput.trim().split(/\s+/);
      let last = tokens.pop() || '';
      if (!last) { popUndo(); return; }
      if (/^[+\-×÷%]$/.test(last)) { popUndo(); return; }
      last = last.startsWith('-') ? last.slice(1) : '-' + last;
      tokens.push(last);
      currentInput = tokens.join(' ').trim();
      updateDisplay();
      return;
    }

    if (value === '%') {
      if (currentInput === '' || /\s$/.test(currentInput)) { popUndo(); return; }
      currentInput += '%';
      updateDisplay();
      return;
    }

    if (value === '=') {
      const preview = computePreview(currentInput);
      if (preview === null) { popUndo(); return; }
      addHistoryEntry(currentInput, preview);
      currentInput = String(preview);
      updateDisplay();
      return;
    }

    if (['+', '-', '*', '/'].includes(value)) {
      const symbol = value === '*' ? '×' : value === '/' ? '÷' : value === '-' ? '−' : '+';
      currentInput = currentInput.trim();
      if (currentInput === '') { popUndo(); return; }
      if (/[+\-×÷%]$/.test(currentInput)) currentInput = currentInput.replace(/[+\-×÷%]+$/, symbol + ' ');
      else currentInput += ' ' + symbol + ' ';
      updateDisplay();
      return;
    }

    if (/^[0-9.]$/.test(value)) {
      const tokens = currentInput.trim().split(/\s+/);
      const last = tokens[tokens.length - 1] || '';
      if (value === '.' && last.includes('.')) { popUndo(); return; }
      currentInput += value;
      updateDisplay();
      return;
    }

    popUndo();
  });
});


if (replayBtn) {
  replayBtn.addEventListener('click', () => {
    const prev = popUndo();
    if (prev === null) return;
    currentInput = prev;
    updateDisplay();
  });
}

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    themeBtn.textContent = isDark ? '☀' : '☾';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}


window.addEventListener('load', () => {
  const saved = localStorage.getItem('theme') || localStorage.getItem('calc-theme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    if (themeBtn) themeBtn.textContent = '☀';
  } else {
    document.body.classList.remove('dark');
    if (themeBtn) themeBtn.textContent = '☾';
  }

  renderHistory();
  updateDisplay();
});
