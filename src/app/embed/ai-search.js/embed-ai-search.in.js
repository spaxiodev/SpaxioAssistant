/**
 * Spaxio AI Search embed loader — injected __SPAXIO_BASE_URL__ at serve time.
 * Supports takeover mode (existing website search bar) and widget mode.
 */
(function () {
  var BASE_URL = '__SPAXIO_BASE_URL__';
  var scripts = document.getElementsByTagName('script');
  var me = document.currentScript || scripts[scripts.length - 1];
  function resolveBaseUrl(raw) {
    var v = (raw || '').trim();
    if (v && v.indexOf('__SPAXIO_BASE_URL__') === -1) {
      return v.replace(/\/$/, '');
    }
    try {
      var scriptSrc = me && me.src ? me.src : '';
      if (!scriptSrc) return '';
      var u = new URL(scriptSrc, window.location.href);
      return (u.origin || '').replace(/\/$/, '');
    } catch (_e) {
      return '';
    }
  }
  var BASE = resolveBaseUrl(BASE_URL);
  var widgetId = me.getAttribute('data-widget-id');
  if (!widgetId || !BASE) return;
  var initKey = '__spaxioAiSearchInit__' + BASE + '::' + widgetId;
  if (window[initKey]) return;
  window[initKey] = true;

  var sessionId = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  var history = [];
  var langAttr = me.getAttribute('data-locale');
  var lang = (langAttr && langAttr.trim() ? langAttr.trim() : navigator.language || 'en').slice(0, 2);

  var STR = {
    en: {
      open: 'AI search',
      placeholder: 'Describe what you need…',
      search: 'Search',
      close: 'Close',
      noResults: 'No matching products yet. Try refining your request.',
      view: 'View',
      loading: 'Searching…',
    },
    fr: {
      open: 'Recherche IA',
      placeholder: 'Décrivez ce que vous cherchez…',
      search: 'Rechercher',
      close: 'Fermer',
      noResults: 'Aucun produit correspondant. Précisez votre demande.',
      view: 'Voir',
      loading: 'Recherche…',
    },
  };
  function t(key) {
    var pack = STR[lang] || STR.en;
    return pack[key] || STR.en[key] || key;
  }

  var root = null;
  var btn = null;
  var panel = null;
  var takeoverMode = false;
  var modeInitialized = false;
  var quickPrompts = [];
  var boundSearchInput = null;
  var aiSearchEnabled = true;

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function badgeLabel(b) {
    if (lang === 'fr') {
      if (b === 'recommended') return 'Recommandé';
      if (b === 'best_value') return 'Bon rapport qualité-prix';
      if (b === 'popular') return 'Populaire';
      if (b === 'premium') return 'Option premium';
    }
    if (b === 'recommended') return 'Recommended';
    if (b === 'best_value') return 'Best value';
    if (b === 'popular') return 'Popular';
    if (b === 'premium') return 'Premium option';
    return b;
  }

  function renderResults(data) {
    var html = '';
    html +=
      '<div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;background:linear-gradient(180deg,#f8fafc,#fff);' +
      (takeoverMode ? 'border-radius:12px 12px 0 0;' : 'border-radius:16px 16px 0 0;') +
      '">';
    if (!takeoverMode) {
      html +=
        '<input id="spaxio-ai-q" type="search" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid #cbd5e1;font-size:14px;" placeholder="' +
        esc(t('placeholder')) +
        '" />';
    }
    html += '<div style="' + (takeoverMode ? '' : 'margin-top:8px;') + 'display:flex;flex-wrap:wrap;gap:6px;">';
    var prompts = data.quick_prompts || [];
    for (var i = 0; i < prompts.length; i++) {
      html +=
        '<button type="button" class="spaxio-pill" data-q="' +
        esc(prompts[i]) +
        '" style="font-size:12px;padding:4px 10px;border-radius:9999px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;">' +
        esc(prompts[i]) +
        '</button>';
    }
    html += '</div></div>';

    var results = data.results || [];
    if (results.length === 0) {
      html += '<div style="padding:16px;font-size:14px;color:#64748b;">' + esc(t('noResults')) + '</div>';
      var sug = data.fallback_suggestions || [];
      if (sug.length) {
        html += '<ul style="margin:0 16px 16px;padding:0;list-style:none;font-size:13px;color:#475569;">';
        for (var j = 0; j < sug.length; j++) {
          html += '<li style="padding:6px 0;border-bottom:1px solid #f1f5f9;">' + esc(sug[j]) + '</li>';
        }
        html += '</ul>';
      }
    } else {
      for (var k = 0; k < results.length; k++) {
        var r = results[k];
        html += '<div style="display:flex;gap:12px;padding:14px;border-bottom:1px solid #f1f5f9;align-items:flex-start;">';
        if (r.image_url) {
          html +=
            '<img src="' +
            esc(r.image_url) +
            '" alt="" width="64" height="64" style="object-fit:cover;border-radius:10px;flex-shrink:0;" />';
        }
        html += '<div style="flex:1;min-width:0;">';
        html += '<div style="font-weight:600;font-size:14px;line-height:1.3;">' + esc(r.title) + '</div>';
        if (r.price != null) {
          html += '<div style="font-size:14px;margin-top:4px;color:#0f172a;">$' + esc(String(r.price)) + '</div>';
        }
        if (r.match_explanation) {
          html += '<div style="font-size:12px;color:#64748b;margin-top:6px;line-height:1.4;">' + esc(r.match_explanation) + '</div>';
        }
        if (r.badges && r.badges.length) {
          html += '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">';
          for (var b = 0; b < r.badges.length; b++) {
            html +=
              '<span style="font-size:11px;padding:2px 8px;border-radius:9999px;background:#ecfeff;color:#0369a1;">' +
              esc(badgeLabel(r.badges[b])) +
              '</span>';
          }
          html += '</div>';
        }
        if (r.product_url) {
          html +=
            '<a href="' +
            esc(r.product_url) +
            '" target="_blank" rel="noopener noreferrer" data-pid="' +
            esc(r.id) +
            '" class="spaxio-cta" style="display:inline-block;margin-top:8px;font-size:13px;font-weight:600;color:#0284c7;">' +
            esc(t('view')) +
            ' →</a>';
        }
        html += '</div></div>';
      }
    }

    var ch = data.content_hits || [];
    if (ch.length) {
      html += '<div style="padding:12px 14px;font-size:12px;font-weight:600;color:#64748b;">Helpful pages</div>';
      for (var c = 0; c < ch.length; c++) {
        var h = ch[c];
        html += '<div style="padding:8px 14px 12px;font-size:13px;color:#334155;border-bottom:1px solid #f8fafc;">' + esc(h.snippet.slice(0, 200)) + '…</div>';
      }
    }

    html +=
      (takeoverMode
        ? ''
        : '<div style="padding:10px;text-align:right;border-top:1px solid #f1f5f9;"><button type="button" id="spaxio-ai-close" style="border:0;background:transparent;color:#64748b;cursor:pointer;font-size:13px;">' +
          esc(t('close')) +
          '</button></div>');

    panel.innerHTML = html;

    var input = document.getElementById('spaxio-ai-q');
    if (input) {
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') runSearch(input.value);
      });
    }
    if (!takeoverMode) {
      var closeBtn = document.getElementById('spaxio-ai-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          panel.style.display = 'none';
        });
      }
    }
    var pills = panel.querySelectorAll('.spaxio-pill');
    for (var p = 0; p < pills.length; p++) {
      pills[p].addEventListener('click', function (ev) {
        var q = ev.currentTarget.getAttribute('data-q');
        if (q) runSearch(q);
      });
    }
    var ctas = panel.querySelectorAll('.spaxio-cta');
    for (var x = 0; x < ctas.length; x++) {
      ctas[x].addEventListener('click', function (ev) {
        var pid = ev.currentTarget.getAttribute('data-pid');
        if (pid) {
            fetch(BASE + '/api/widget/ai-search/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              widgetId: widgetId,
              eventType: 'click',
              productId: pid,
              sessionId: sessionId,
              locale: lang,
            }),
          }).catch(function () {});
        }
      });
    }
  }

  function runSearch(q) {
    if (!q || !q.trim()) return;
    if (!panel) return;
    if (!aiSearchEnabled) {
      panel.style.display = 'block';
      panel.innerHTML = '<div style="padding:16px;color:#b91c1c;font-size:14px;">' + esc('AI Search is not enabled for this widget.') + '</div>';
      return;
    }
    panel.style.display = 'block';
    if (boundSearchInput) boundSearchInput.setAttribute('aria-busy', 'true');
    panel.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">' + esc(t('loading')) + '</div>';
    history.push({ role: 'user', content: q.trim() });
    fetch(BASE + '/api/widget/ai-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widgetId: widgetId,
        query: q.trim(),
        sessionId: sessionId,
        language: lang,
        conversationHistory: history.slice(-8),
      }),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, status: r.status, data: data };
        });
      })
      .then(function (res) {
        var data = res.data || {};
        if (!res.ok) {
          var err =
            data.error ||
            (res.status === 403 ? 'AI Search is not available for this widget.' : 'Search request failed');
          panel.innerHTML = '<div style="padding:16px;color:#b91c1c;font-size:14px;">' + esc(err) + '</div>';
          if (boundSearchInput) boundSearchInput.removeAttribute('aria-busy');
          return;
        }
        if (data.error) {
          panel.innerHTML = '<div style="padding:16px;color:#b91c1c;font-size:14px;">' + esc(data.error) + '</div>';
          if (boundSearchInput) boundSearchInput.removeAttribute('aria-busy');
          return;
        }
        renderResults(data);
        history.push({
          role: 'assistant',
          content: data.intent_summary || '',
        });
        if (boundSearchInput) boundSearchInput.removeAttribute('aria-busy');
      })
      .catch(function () {
        panel.innerHTML = '<div style="padding:16px;color:#b91c1c;">Network error</div>';
        if (boundSearchInput) boundSearchInput.removeAttribute('aria-busy');
      });
  }

  function getSearchInput() {
    function isUsableInput(el) {
      if (!el || el.tagName !== 'INPUT' || el.disabled) return false;
      if (el.type && String(el.type).toLowerCase() === 'hidden') return false;
      if (el.getClientRects && el.getClientRects().length === 0) return false;
      var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
      return true;
    }

    var explicitSelector = me.getAttribute('data-search-selector');
    if (explicitSelector) {
      var selected = document.querySelector(explicitSelector);
      if (isUsableInput(selected)) return selected;
    }
    var candidates = document.querySelectorAll(
      'input[type="search"], input[type="text"], input[name*="search" i], input[id*="search" i], input[name="q" i], input[id="q" i], input[name*="query" i], input[id*="query" i], form[role="search"] input'
    );
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (isUsableInput(el)) return el;
    }
    return null;
  }

  function initWidgetMode() {
    if (modeInitialized) return;
    root = document.createElement('div');
    root.id = 'spaxio-ai-search-root';
    root.style.cssText =
      'position:fixed;z-index:2147483000;bottom:96px;right:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;';
    document.body.appendChild(root);

    btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = t('open');
    btn.style.cssText =
      'border:0;border-radius:9999px;padding:12px 18px;font-weight:600;cursor:pointer;box-shadow:0 10px 40px rgba(15,23,42,0.18);background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;';
    root.appendChild(btn);

    panel = document.createElement('div');
    panel.style.cssText =
      'display:none;width:min(420px,calc(100vw - 32px));max-height:70vh;overflow:auto;margin-top:10px;border-radius:16px;background:#fff;color:#0f172a;box-shadow:0 24px 80px rgba(15,23,42,0.25);border:1px solid rgba(148,163,184,0.35);';
    root.appendChild(panel);

    btn.addEventListener('click', function () {
      if (panel.style.display === 'block') {
        panel.style.display = 'none';
        return;
      }
      panel.style.display = 'block';
      if (!panel.innerHTML) {
        renderResults({ results: [], quick_prompts: quickPrompts, fallback_suggestions: [] });
        var inp = document.getElementById('spaxio-ai-q');
        if (inp) inp.focus();
      }
    });
    modeInitialized = true;
  }

  function initTakeoverMode() {
    if (modeInitialized) return true;
    boundSearchInput = getSearchInput();
    if (!boundSearchInput) return false;
    takeoverMode = true;

    var host = document.createElement('div');
    host.id = 'spaxio-ai-search-results';
    host.style.cssText =
      'display:none;margin-top:10px;border-radius:12px;background:#fff;color:#0f172a;box-shadow:0 10px 32px rgba(15,23,42,0.16);border:1px solid rgba(148,163,184,0.35);max-height:70vh;overflow:auto;';

    var searchForm = boundSearchInput.form || boundSearchInput.closest('form');
    var parent = searchForm || boundSearchInput.parentElement;
    if (!parent || !parent.parentNode) return false;
    if (searchForm && searchForm.parentNode) {
      searchForm.parentNode.insertBefore(host, searchForm.nextSibling);
    } else {
      parent.parentNode.insertBefore(host, parent.nextSibling);
    }
    panel = host;

    var submitHandler = function (ev) {
      if (ev) ev.preventDefault();
      runSearch(boundSearchInput.value);
    };
    if (searchForm) {
      searchForm.addEventListener('submit', submitHandler);
    }
    boundSearchInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        runSearch(boundSearchInput.value);
      }
    });

    renderResults({ results: [], quick_prompts: quickPrompts, fallback_suggestions: [] });
    modeInitialized = true;
    return true;
  }

  function initTakeoverWithRetry(displayMode) {
    var maxAttempts = 24; // ~12s total at 500ms
    var attempts = 0;
    var timer = null;

    function tryInit() {
      if (initTakeoverMode()) {
        if (timer) clearInterval(timer);
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) return;
      if (timer) clearInterval(timer);
      if (displayMode === 'replace_search') {
        // In strict replace mode, never show floating fallback.
        console.warn('[Spaxio AI Search] replace_search mode enabled but no search input was found.');
        return;
      }
      initWidgetMode();
    }

    if (document.readyState === 'loading') {
      document.addEventListener(
        'DOMContentLoaded',
        function () {
          tryInit();
          timer = setInterval(tryInit, 500);
        },
        { once: true }
      );
      return;
    }

    tryInit();
    timer = setInterval(tryInit, 500);
  }

  fetch(BASE + '/api/widget/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetId: widgetId }),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (cfg) {
      var aiSearch = cfg && cfg.aiSearch ? cfg.aiSearch : {};
      aiSearchEnabled = aiSearch.enabled === true;
      quickPrompts = Array.isArray(aiSearch.quickPrompts) ? aiSearch.quickPrompts : [];
      var displayMode = typeof aiSearch.displayMode === 'string' ? aiSearch.displayMode : 'modal';
      if (!aiSearchEnabled) return;
      var wantsTakeover = displayMode === 'replace_search' || displayMode === 'beside_search';
      if (wantsTakeover) {
        initTakeoverWithRetry(displayMode);
        return;
      }
      initWidgetMode();
    })
    .catch(function () {
      initWidgetMode();
    });
})();

