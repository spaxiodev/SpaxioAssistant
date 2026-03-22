/* Spaxio Embedded Form Loader v1.0
 * Fetches form config from the Spaxio API and renders it inline.
 * Usage:
 *   <div id="spaxio-form-FORM_ID"></div>
 *   <script src="https://app.spaxioassistant.com/embed/form.js"
 *           data-form-id="FORM_ID"
 *           data-container="#spaxio-form-FORM_ID"
 *           data-theme="auto"></script>
 */
(function () {
  'use strict';

  var BASE_URL = '__SPAXIO_BASE_URL__';

  function getCurrentScript() {
    if (document.currentScript) return document.currentScript;
    var scripts = document.querySelectorAll('script[data-form-id]');
    return scripts[scripts.length - 1];
  }

  var scriptEl = getCurrentScript();
  if (!scriptEl) return;

  var formId = scriptEl.getAttribute('data-form-id');
  if (!formId) {
    console.warn('[Spaxio] data-form-id is required');
    return;
  }

  var containerId = scriptEl.getAttribute('data-container') || '#spaxio-form-' + formId;
  var theme = scriptEl.getAttribute('data-theme') || 'auto';

  function resolveTheme() {
    if (theme === 'dark') return 'dark';
    if (theme === 'light') return 'light';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function getContainer() {
    if (containerId.startsWith('#')) {
      return document.getElementById(containerId.slice(1));
    }
    if (containerId.startsWith('.')) {
      return document.querySelector(containerId);
    }
    return document.getElementById(containerId);
  }

  function escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var COLORS = {
    light: { bg: '#ffffff', border: '#e2e8f0', text: '#1a202c', muted: '#718096', inputBg: '#f7fafc', btnBg: '#6366f1', btnText: '#ffffff', errorText: '#e53e3e', successBg: '#f0fff4', successText: '#276749' },
    dark: { bg: '#1a1a2e', border: '#2d3748', text: '#f7fafc', muted: '#a0aec0', inputBg: '#2d3748', btnBg: '#6366f1', btnText: '#ffffff', errorText: '#fc8181', successBg: '#1c3829', successText: '#68d391' }
  };

  function getStyles(c, primaryColor) {
    var btn = primaryColor || c.btnBg;
    return [
      '.spx-form { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: ' + c.text + '; background: ' + c.bg + '; padding: 24px; border-radius: 12px; border: 1px solid ' + c.border + '; max-width: 560px; box-sizing: border-box; }',
      '.spx-form * { box-sizing: border-box; }',
      '.spx-field { margin-bottom: 16px; }',
      '.spx-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; color: ' + c.text + '; }',
      '.spx-req { color: #e53e3e; margin-left: 2px; }',
      '.spx-input { width: 100%; padding: 9px 12px; border: 1px solid ' + c.border + '; border-radius: 8px; background: ' + c.inputBg + '; color: ' + c.text + '; font-size: 14px; outline: none; transition: border-color 0.15s; }',
      '.spx-input:focus { border-color: ' + btn + '; box-shadow: 0 0 0 3px ' + btn + '33; }',
      '.spx-textarea { resize: vertical; min-height: 80px; }',
      '.spx-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23718096\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 32px; }',
      '.spx-radio-group, .spx-checkbox-group { display: flex; flex-direction: column; gap: 8px; }',
      '.spx-radio-item, .spx-checkbox-item { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }',
      '.spx-radio-item input, .spx-checkbox-item input { width: 16px; height: 16px; accent-color: ' + btn + '; cursor: pointer; }',
      '.spx-btn { width: 100%; padding: 11px 20px; background: ' + btn + '; color: ' + c.btnText + '; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: opacity 0.15s; }',
      '.spx-btn:hover { opacity: 0.88; }',
      '.spx-btn:disabled { opacity: 0.55; cursor: not-allowed; }',
      '.spx-error { font-size: 13px; color: ' + c.errorText + '; margin-top: 4px; }',
      '.spx-global-error { padding: 10px 14px; background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; color: ' + c.errorText + '; font-size: 14px; margin-bottom: 16px; }',
      '.spx-success { text-align: center; padding: 32px 20px; }',
      '.spx-success-icon { font-size: 40px; margin-bottom: 12px; }',
      '.spx-success-title { font-size: 20px; font-weight: 700; color: ' + c.text + '; margin-bottom: 8px; }',
      '.spx-success-msg { font-size: 15px; color: ' + c.muted + '; }',
      '.spx-estimate { margin-top: 16px; padding: 14px; background: ' + c.inputBg + '; border-radius: 8px; border: 1px solid ' + c.border + '; text-align: center; }',
      '.spx-estimate-label { font-size: 13px; color: ' + c.muted + '; margin-bottom: 4px; }',
      '.spx-estimate-value { font-size: 22px; font-weight: 700; color: ' + btn + '; }',
      '.spx-powered { text-align: center; margin-top: 16px; font-size: 11px; color: ' + c.muted + '; }',
      '.spx-powered a { color: ' + c.muted + '; text-decoration: none; }',
      '.spx-powered a:hover { text-decoration: underline; }'
    ].join('\n');
  }

  function renderField(field) {
    var req = field.required ? '<span class="spx-req" aria-hidden="true">*</span>' : '';
    var label = '<label class="spx-label" for="spx-' + escape(field.field_key) + '">' + escape(field.label) + req + '</label>';
    var placeholder = field.placeholder ? ' placeholder="' + escape(field.placeholder) + '"' : '';
    var required = field.required ? ' required' : '';
    var input = '';

    if (field.field_type === 'textarea') {
      input = '<textarea class="spx-input spx-textarea" id="spx-' + escape(field.field_key) + '" name="' + escape(field.field_key) + '"' + placeholder + required + '></textarea>';
    } else if (field.field_type === 'select') {
      var opts = '<option value="">— Select —</option>';
      (field.options_json || []).forEach(function (o) {
        opts += '<option value="' + escape(o) + '">' + escape(o) + '</option>';
      });
      input = '<select class="spx-input spx-select" id="spx-' + escape(field.field_key) + '" name="' + escape(field.field_key) + '"' + required + '>' + opts + '</select>';
    } else if (field.field_type === 'radio') {
      var radios = '<div class="spx-radio-group">';
      (field.options_json || []).forEach(function (o, idx) {
        radios += '<label class="spx-radio-item"><input type="radio" name="' + escape(field.field_key) + '" value="' + escape(o) + '"' + (idx === 0 && field.required ? ' required' : '') + '> ' + escape(o) + '</label>';
      });
      radios += '</div>';
      input = radios;
    } else if (field.field_type === 'checkbox') {
      input = '<div class="spx-checkbox-group"><label class="spx-checkbox-item"><input type="checkbox" name="' + escape(field.field_key) + '" value="true"' + required + '> ' + escape(field.label) + '</label></div>';
    } else if (field.field_type === 'number') {
      input = '<input class="spx-input" type="number" id="spx-' + escape(field.field_key) + '" name="' + escape(field.field_key) + '"' + placeholder + required + '>';
    } else if (field.field_type === 'date') {
      input = '<input class="spx-input" type="date" id="spx-' + escape(field.field_key) + '" name="' + escape(field.field_key) + '"' + required + '>';
    } else if (field.field_type === 'email') {
      input = '<input class="spx-input" type="email" id="spx-' + escape(field.field_key) + '" name="' + escape(field.field_key) + '"' + placeholder + required + '>';
    } else if (field.field_type === 'phone') {
      input = '<input class="spx-input" type="tel" id="spx-' + escape(field.field_key) + '" name="' + escape(field.field_key) + '"' + placeholder + required + '>';
    } else {
      input = '<input class="spx-input" type="text" id="spx-' + escape(field.field_key) + '" name="' + escape(field.field_key) + '"' + placeholder + required + '>';
    }

    return '<div class="spx-field" data-key="' + escape(field.field_key) + '">' + label + input + '<div class="spx-error" style="display:none" data-error="' + escape(field.field_key) + '"></div></div>';
  }

  function collectAnswers(form) {
    var answers = {};
    var inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(function (el) {
      if (!el.name || el.name === '_spx_customer_name' || el.name === '_spx_customer_email' || el.name === '_spx_customer_phone') return;
      if (el.type === 'radio') {
        if (el.checked) answers[el.name] = el.value;
      } else if (el.type === 'checkbox') {
        answers[el.name] = el.checked ? 'true' : 'false';
      } else {
        if (el.value !== '') answers[el.name] = el.value;
      }
    });
    return answers;
  }

  function renderForm(config, container) {
    var currentTheme = resolveTheme();
    var colors = COLORS[currentTheme];
    var primary = (config.theme_settings && config.theme_settings.primary_color) || null;

    var styleEl = document.createElement('style');
    styleEl.textContent = getStyles(colors, primary);
    container.innerHTML = '';
    container.appendChild(styleEl);

    var formEl = document.createElement('div');
    formEl.className = 'spx-form';

    var fieldsHtml = '';
    (config.fields || []).forEach(function (field) {
      fieldsHtml += renderField(field);
    });

    formEl.innerHTML = [
      '<div class="spx-global-error" id="spx-global-error" style="display:none"></div>',
      fieldsHtml,
      '<div style="display:none" id="spx-submitting"><button class="spx-btn" disabled>Submitting…</button></div>',
      '<div id="spx-submit-btn"><button class="spx-btn" type="button" id="spx-submit">Submit</button></div>',
      '<p class="spx-powered">Powered by <a href="https://spaxioassistant.com" target="_blank" rel="noopener">Spaxio</a></p>'
    ].join('');

    container.appendChild(formEl);

    var submitBtn = document.getElementById('spx-submit');
    var submittingEl = document.getElementById('spx-submitting');
    var submitBtnWrapper = document.getElementById('spx-submit-btn');
    var globalError = document.getElementById('spx-global-error');

    submitBtn.addEventListener('click', function () {
      // Clear previous errors
      globalError.style.display = 'none';
      globalError.textContent = '';
      var errorEls = formEl.querySelectorAll('[data-error]');
      errorEls.forEach(function (el) { el.style.display = 'none'; el.textContent = ''; });

      var answers = collectAnswers(formEl);

      // Extract contact fields from answers
      var nameKeys = ['name', 'customer_name', 'full_name', 'your_name'];
      var emailKeys = ['email', 'customer_email', 'your_email', 'email_address'];
      var phoneKeys = ['phone', 'customer_phone', 'phone_number', 'your_phone'];
      var customerName = '';
      var customerEmail = '';
      var customerPhone = '';
      nameKeys.forEach(function (k) { if (!customerName && answers[k]) customerName = answers[k]; });
      emailKeys.forEach(function (k) { if (!customerEmail && answers[k]) customerEmail = answers[k]; });
      phoneKeys.forEach(function (k) { if (!customerPhone && answers[k]) customerPhone = answers[k]; });

      // Show loading
      submitBtnWrapper.style.display = 'none';
      submittingEl.style.display = '';

      var payload = {
        answers: answers,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone
      };

      fetch(BASE_URL + '/api/embed/submit/' + formId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
        .then(function (result) {
          submittingEl.style.display = 'none';
          if (!result.ok) {
            submitBtnWrapper.style.display = '';
            globalError.textContent = result.data.error || 'Something went wrong. Please try again.';
            globalError.style.display = '';
            return;
          }
          // Show success
          var estimateHtml = result.data.estimate
            ? '<div class="spx-estimate"><div class="spx-estimate-label">Your estimate</div><div class="spx-estimate-value">' + escape(result.data.estimate) + '</div></div>'
            : '';
          formEl.innerHTML = '<div class="spx-success"><div class="spx-success-icon">✓</div><div class="spx-success-title">Thank you!</div><div class="spx-success-msg">' + escape(result.data.success_message || 'Your submission has been received.') + '</div>' + estimateHtml + '</div><p class="spx-powered">Powered by <a href="https://spaxioassistant.com" target="_blank" rel="noopener">Spaxio</a></p>';
        })
        .catch(function () {
          submittingEl.style.display = 'none';
          submitBtnWrapper.style.display = '';
          globalError.textContent = 'Network error. Please try again.';
          globalError.style.display = '';
        });
    });
  }

  function init() {
    var container = getContainer();
    if (!container) {
      console.warn('[Spaxio] Container not found:', containerId);
      return;
    }

    container.innerHTML = '<p style="color:#718096;font-size:14px">Loading form…</p>';

    fetch(BASE_URL + '/api/embed/form/' + formId)
      .then(function (res) {
        if (!res.ok) throw new Error('Form not found (status ' + res.status + ')');
        return res.json();
      })
      .then(function (config) {
        renderForm(config, container);
      })
      .catch(function (err) {
        container.innerHTML = '<p style="color:#e53e3e;font-size:14px">Could not load form. Please try again later.</p>';
        console.error('[Spaxio]', err);
      });

    // Watch for system theme changes when theme=auto
    if (theme === 'auto' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        var c = getContainer();
        if (c) {
          fetch(BASE_URL + '/api/embed/form/' + formId)
            .then(function (r) { return r.json(); })
            .then(function (cfg) { renderForm(cfg, c); })
            .catch(function () {});
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
