(() => {
  const exprEl = document.getElementById('expr');
  const resultEl = document.getElementById('result');
  const keypadEl = document.getElementById('keypad');
  const helpBtn = document.getElementById('help-btn');
  const helpPanel = document.getElementById('help-panel');
  const helpClose = document.getElementById('help-close');
  const smartFixBtn = document.getElementById('smart-fix');

  const baseInput = document.getElementById('base-input');
  const baseFrom = document.getElementById('base-from');
  const baseTo = document.getElementById('base-to');
  const baseBtn = document.getElementById('convert-btn');
  const baseOut = document.getElementById('base-output');
  const baseStatus = document.getElementById('base-status');
  let expr = '';

  function setExpr(v) { expr = v; exprEl.textContent = v; }
  function formatNumber(n) {
    if (!isFinite(n)) return 'خطا';
    return Number(n.toPrecision(12)).toString();
  }
  function normalizeInput(s) {
    let x = s.replace(/×/g, '*')
             .replace(/÷/g, '/')
             .replace(/–|−/g, '-')
             .replace(/√/g, 'sqrt')
             .replace(/\^/g, '**');
    x = x.replace(/(\d|\))\s*(?=\()/g, m => m + '*');
    x = x.replace(/(\))\s*(\d|\()/g, (_, a, b) => a + '*' + b);
    x = x.replace(/(\d)\s*(sin|cos|tan|log|sqrt)/g, (_, n, f) => n + '*' + f);
    return x;
  }

  function evaluateExpression(s) {
    const normalized = normalizeInput(s);
    const scope = {
      sqrt: (a) => Math.sqrt(a),
      sin: (a) => Math.sin(a),
      cos: (a) => Math.cos(a),
      tan: (a) => Math.tan(a),
      log: (a) => Math.log(a),
      pi: Math.PI,
      e: Math.E
    };
    let code = normalized.replace(/\bπ\b/g, 'pi').replace(/\be\b/g, 'e');
    const safe = /^[0-9+\-*/.%()\s]*$/.test(code.replace(/\b(pi|e|sqrt|sin|cos|tan|log)\b/g, ''));
    if (!safe) throw new Error('بیان نامعتبر');
    code = code.replace(/\b(sqrt|sin|cos|tan|log)\s*\(/g, (m) => `scope.${m}`);
    const fn = new Function('scope', `with (scope) { return ${code}; }`);
    const val = fn(scope);
    if (typeof val !== 'number' || !isFinite(val)) throw new Error('محاسبه نامعتبر');
    return val;
  }

  function renderResult() {
    if (!expr.trim()) { resultEl.textContent = '0'; return; }
    try {
      const val = evaluateExpression(expr);
      resultEl.textContent = formatNumber(val);
      resultEl.style.color = 'var(--text)';
    } catch {
      resultEl.textContent = 'خطا';
      resultEl.style.color = 'var(--danger)';
    }
  }

  keypadEl.addEventListener('click', (e) => {
    const el = e.target.closest('.key');
    if (!el) return;
    const key = el.getAttribute('data-key');
    if (!key) return;

    if (key === '=') {
      try {
        const val = evaluateExpression(expr);
        const out = formatNumber(val);
        setExpr(String(out));
        resultEl.textContent = out;
      } catch {
        resultEl.textContent = 'خطا';
      }
      return;
    }
    if (key === 'C') { setExpr(''); renderResult(); return; }
    if (key === 'DEL') { setExpr(expr.slice(0, -1)); renderResult(); return; }

    if (key === 'pi') { setExpr(expr + 'π'); renderResult(); return; }
    if (key === 'e') { setExpr(expr + 'e'); renderResult(); return; }

    if (/^(sin\(|cos\(|tan\(|log\(|sqrt\()$/.test(key)) {
      setExpr(expr + key);
      renderResult();
      return;
    }

    setExpr(expr + key);
    renderResult();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); try {
      const val = evaluateExpression(expr);
      setExpr(String(formatNumber(val)));
      resultEl.textContent = formatNumber(val);
    } catch { resultEl.textContent = 'خطا'; } return; }
    if (e.key === 'Backspace') { setExpr(expr.slice(0, -1)); renderResult(); return; }
    const allowed = '0123456789+-*/().^';
    if (allowed.includes(e.key)) { setExpr(expr + e.key); renderResult(); }
  });

  helpBtn.addEventListener('click', () => { helpPanel.style.display = 'block'; });
  helpClose.addEventListener('click', () => { helpPanel.style.display = 'none'; });

  smartFixBtn.addEventListener('click', () => {
    const fixed = normalizeInput(expr);
    try {
      const val = new Function(`return ${fixed}`)();
      setExpr(expr.replace(/\^/g, '**').replace(/×/g, '*').replace(/÷/g, '/').replace(/√/g, 'sqrt'));
      renderResult();
    } catch {
      renderResult();
    }
  });

  function validForBase(ch, base) {
    const d = ch.toLowerCase();
    const digits = '0123456789abcdef'.slice(0, base);
    return digits.includes(d);
  }
  function parseInBase(str, base) {
    const parts = str.trim().split('.');
    const intPart = parts[0];
    const fracPart = parts[1] || '';
    for (const ch of intPart + fracPart) {
      if (!validForBase(ch, base)) throw new Error('رقم نامعتبر برای مبنا');
    }
    let val = 0;
    for (const ch of intPart.toLowerCase()) {
      const digit = '0123456789abcdef'.indexOf(ch);
      val = val * base + (digit >= 0 ? digit : 0);
    }
    let pow = base, frac = 0;
    for (const ch of fracPart.toLowerCase()) {
      const digit = '0123456789abcdef'.indexOf(ch);
      frac += (digit >= 0 ? digit : 0) / pow;
      pow *= base;
    }
    return val + frac;
  }
  function toBaseString(value, base, maxFracDigits = 12) {
    if (!isFinite(value)) return 'خطا';
    const neg = value < 0; value = Math.abs(value);
    const int = Math.floor(value);
    let frac = value - int;
    const digits = '0123456789abcdef';
    let intStr = int === 0 ? '0' : '';
    let n = int;
    while (n > 0) { const d = n % base; intStr = digits[d] + intStr; n = Math.floor(n / base); }
    let fracStr = '', count = 0;
    while (frac > 1e-15 && count < maxFracDigits) {
      frac *= base;
      const d = Math.floor(frac);
      fracStr += digits[d];
      frac -= d;
      count++;
    }
    const out = fracStr ? intStr + '.' + fracStr : intStr;
    return neg ? '-' + out : out;
  }
  baseBtn.addEventListener('click', () => {
    const from = parseInt(baseFrom.value, 10);
    const to = parseInt(baseTo.value, 10);
    const raw = baseInput.value.trim();
    if (!raw) { baseStatus.textContent = 'ورودی خالی است'; baseOut.value = ''; return; }
    try {
      const val = parseInBase(raw, from);
      const out = toBaseString(val, to, 12);
      baseOut.value = out;
      baseStatus.textContent = 'موفق';
      baseStatus.style.color = 'var(--text)';
    } catch (err) {
      baseOut.value = '';
      baseStatus.textContent = err.message || 'خطا در تبدیل';
      baseStatus.style.color = 'var(--danger)';
    }
  });

  setExpr('');
  renderResult();
})();