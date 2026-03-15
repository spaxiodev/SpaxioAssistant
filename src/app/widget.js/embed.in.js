(function() {
  'use strict';
  var script = document.currentScript || [].slice.call(document.querySelectorAll('script[data-widget-id], script[data-agent-id]')).pop();
  var widgetId = script && script.getAttribute('data-widget-id');
  var agentId = script && script.getAttribute('data-agent-id');
  var positionPresetOverride = (script && script.getAttribute('data-position-preset')) || null;
  if (!widgetId && !agentId) return;

  var base = (script && script.getAttribute('data-base-url')) || "__SPAXIO_BASE_URL__";
  if (!base || base === '__SPAXIO_BASE_URL__' || base.indexOf('localhost') !== -1) {
    try {
      if (script && script.src) base = new URL(script.src).origin;
    } catch (e) {}
  }
  var baseOrigin = (function() { try { return new URL(base).origin; } catch (e) { return ''; } })();
  if (typeof window !== 'undefined' && window.location && window.location.origin && baseOrigin) {
    try {
      var cur = new URL(window.location.origin);
      var baseUrl = new URL(base);
      var curHost = cur.hostname.replace(/^www\./i, '');
      var baseHost = baseUrl.hostname.replace(/^www\./i, '');
      if (curHost === baseHost && cur.protocol === baseUrl.protocol) {
        base = window.location.origin;
        baseOrigin = window.location.origin;
      }
    } catch (e) {}
  }

  function normalizeLang(value) {
    if (!value) return null;
    var v = String(value).trim().toLowerCase();
    if (!v) return null;
    if (v.length > 2 && v.indexOf('-') === 2) {
      v = v.slice(0, 2);
    }
    return v;
  }

  function detectLanguage(opts) {
    opts = opts || {};
    var skipDoc = opts.skipDoc;
    var attrLang = script && (script.getAttribute('data-language') || script.getAttribute('data-lang'));
    var normalized = normalizeLang(attrLang);
    if (normalized) return normalized;

    if (!skipDoc && document.documentElement) {
      var docLangAttr = document.documentElement.getAttribute('lang');
      var docLang = docLangAttr || (document.documentElement && document.documentElement.lang);
      normalized = normalizeLang(docLang);
      if (normalized) return normalized;
    }

    if (typeof window !== 'undefined' && window.__SPAXIO_LANG__ != null) {
      normalized = normalizeLang(String(window.__SPAXIO_LANG__));
      if (normalized) return normalized;
    }

    var pathname = typeof window !== 'undefined' && window.location && window.location.pathname ? window.location.pathname : '';
    var pathMatch = pathname.match(/\/(en|fr|es|de|pt|it|ja|zh|nl|ru|pl)(?:\/|$)/i);
    if (pathMatch) {
      normalized = pathMatch[1].toLowerCase().slice(0, 2);
      if (normalized) return normalized;
    }

    if (typeof navigator !== 'undefined' && navigator.language) {
      normalized = normalizeLang(navigator.language);
      if (normalized) return normalized;
    }

    return null;
  }

  var userConfig = (typeof window !== 'undefined' && window.SpaxioAssistantConfig) ? window.SpaxioAssistantConfig : {};
  if (userConfig.chatbotId) widgetId = String(userConfig.chatbotId).trim() || widgetId;
  var detected = detectLanguage();
  var pageLanguage = (userConfig.locale && normalizeLang(userConfig.locale)) || detected || 'en';

  function resolveWidgetId(done) {
    if (widgetId) {
      done(widgetId);
      return;
    }
    if (!agentId || !base) {
      done(null);
      return;
    }
    fetch(base + '/api/widget/by-agent?agentId=' + encodeURIComponent(agentId), { method: 'GET', mode: 'cors', credentials: 'omit' })
      .then(function(r) { return r.ok ? r.json() : Promise.reject(new Error('No widget')); })
      .then(function(data) { done(data && data.widgetId ? data.widgetId : null); })
      .catch(function() { done(null); });
  }

  function mount(initialConfig) {
    if (!document.body) return;
    if (document.querySelector('[data-spaxio="1"]')) return;
    var langCallbacks = [];
    function notifyLang(l) {
      if (!l) return;
      pageLanguage = l;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ type: 'spaxio-lang-change', language: l }, baseOrigin || '*');
        } catch (e) {}
      }
      langCallbacks.forEach(function(c) { try { c(l); } catch (e) {} });
    }

    var host = document.createElement('div');
    host.id = 'spaxio-widget-host';
    host.setAttribute('data-spaxio', '1');
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: 'closed' });
    var sheet = document.createElement('style');
    sheet.textContent = [
    ':host{all:initial;display:block;position:fixed;inset:0;pointer-events:none;z-index:2147483647}',
    '.spaxio-wrap{pointer-events:auto;position:fixed;z-index:2147483647;opacity:0;transform:scale(0.92);transition:opacity 0.35s ease,transform 0.35s ease}',
    '.spaxio-wrap.spaxio-wrap-ready{opacity:1;transform:scale(1)}',
    '.spaxio-bubble{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.12),0 8px 24px rgba(0,0,0,0.18),0 0 0 1px rgba(0,0,0,0.06);transition:transform 0.2s ease,box-shadow 0.25s ease;color:#fff;background:linear-gradient(165deg,#1e293b 0%,#0f172a 50%,#0c1322 100%);pointer-events:auto;overflow:hidden}',
    '.spaxio-bubble svg{width:24px;height:24px;stroke:currentColor;stroke-width:2.25;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.2))}',
    '.spaxio-bubble img{width:115%;height:115%;object-fit:cover;display:block;border-radius:50%}',
    '.spaxio-bubble:hover{transform:scale(1.05);box-shadow:0 4px 12px rgba(0,0,0,0.14),0 12px 32px rgba(0,0,0,0.22),0 0 0 1px rgba(0,0,0,0.08)}',
    '.spaxio-bubble:focus{outline:2px solid currentColor;outline-offset:2px}',
    '.spaxio-teaser{position:fixed;z-index:2147483647;width:min(280px,calc(100vw - 32px));padding:12px 14px;border-radius:18px;background:#ffffff;color:#0f172a;box-shadow:0 0 0 1px rgba(15,23,42,0.06),0 12px 32px rgba(15,23,42,0.16);font:500 14px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;opacity:0;visibility:hidden;transform-origin:bottom right;transform:scale(0.4) translateY(12px);pointer-events:none;transition:opacity 0.3s ease,transform 0.35s cubic-bezier(0.34,1.56,0.64,1),visibility 0s linear 0.35s;white-space:normal;overflow-wrap:anywhere;box-sizing:border-box}',
    '.spaxio-teaser.visible{opacity:1;visibility:visible;transform:scale(1) translateY(0);transition:opacity 0.3s ease,transform 0.35s cubic-bezier(0.34,1.56,0.64,1)}',
    '.spaxio-panel{position:absolute;right:0;bottom:72px;width:380px;max-width:min(380px,calc(100vw - 32px));height:480px;max-height:85vh;border:none;border-radius:24px 24px 0 24px;box-shadow:0 0 0 1px rgba(0,0,0,0.06),0 8px 24px rgba(0,0,0,0.1),0 24px 64px rgba(0,0,0,0.16);background:#fff;pointer-events:none;opacity:0;transform:translateY(12px) scale(0.98);transition:opacity 0.25s ease,transform 0.25s ease}',
    '.spaxio-panel.open{opacity:1;pointer-events:auto;transform:translateY(0) scale(1)}',
    '.spaxio-bubble.hidden{display:none !important}',
    '@media (max-width: 480px){.spaxio-wrap{left:0;right:0;bottom:0;top:auto;width:100%}.spaxio-panel{position:fixed;left:0;right:0;bottom:0;top:auto;width:100%;height:70vh;max-height:70vh;border-radius:24px 24px 0 0}.spaxio-bubble{position:fixed;width:56px;height:56px}.spaxio-teaser{position:fixed;max-width:min(280px,calc(100vw - 32px))}.spaxio-label{right:16px;bottom:88px}}'
    ].join('');
    shadow.appendChild(sheet);

    var iframe = document.createElement('iframe');
    iframe.className = 'spaxio-panel';
    iframe.id = 'spaxio-widget-iframe';
    iframe.title = 'Chat';
    var localeSegment = (pageLanguage && /^[a-z]{2}$/.test(pageLanguage)) ? pageLanguage : 'en';
    var effectiveWidgetId = initialConfig && initialConfig._widgetId ? initialConfig._widgetId : widgetId;
    var iframeSrc = base + '/' + localeSegment + '/widget?widgetId=' + encodeURIComponent(effectiveWidgetId) + '&lang=' + encodeURIComponent(localeSegment);
    iframeSrc += '&_=' + Date.now();
    iframe.src = iframeSrc;

    var wrap = document.createElement('div');
    wrap.className = 'spaxio-wrap';

    var bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.className = 'spaxio-bubble';
    bubble.setAttribute('aria-label', 'Open chat');
    bubble.setAttribute('data-spaxio-bubble', '1');
    bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

    var teaser = document.createElement('div');
    teaser.className = 'spaxio-teaser';
    teaser.setAttribute('aria-hidden', 'true');

    wrap.appendChild(iframe);
    wrap.appendChild(teaser);
    wrap.appendChild(bubble);
    shadow.appendChild(wrap);

    function resetPositionStyles() {
      wrap.style.top = '';
      wrap.style.bottom = '';
      wrap.style.left = '';
      wrap.style.right = '';
      wrap.style.transform = '';
    }

    function setPositionFromPreset(preset) {
      resetPositionStyles();
      var edgeOffset = 20;
      var presetValue = (preset || '').toLowerCase();
      switch (presetValue) {
        case 'top-left':
          wrap.style.top = edgeOffset + 'px';
          wrap.style.left = edgeOffset + 'px';
          wrap.style.right = 'auto';
          break;
        case 'top-center':
          wrap.style.top = edgeOffset + 'px';
          wrap.style.left = '50%';
          wrap.style.right = 'auto';
          wrap.style.transform = 'translateX(-50%)';
          break;
        case 'top-right':
          wrap.style.top = edgeOffset + 'px';
          wrap.style.left = 'auto';
          wrap.style.right = edgeOffset + 'px';
          break;
        case 'middle-left':
          wrap.style.top = '50%';
          wrap.style.left = edgeOffset + 'px';
          wrap.style.right = 'auto';
          wrap.style.transform = 'translateY(-50%)';
          break;
        case 'middle-right':
          wrap.style.top = '50%';
          wrap.style.left = 'auto';
          wrap.style.right = edgeOffset + 'px';
          wrap.style.transform = 'translateY(-50%)';
          break;
        case 'middle-center':
          wrap.style.top = '50%';
          wrap.style.left = '50%';
          wrap.style.right = 'auto';
          wrap.style.transform = 'translate(-50%, -50%)';
          break;
        case 'bottom-left':
          wrap.style.bottom = edgeOffset + 'px';
          wrap.style.left = edgeOffset + 'px';
          wrap.style.right = 'auto';
          break;
        case 'bottom-center':
          wrap.style.bottom = edgeOffset + 'px';
          wrap.style.left = '50%';
          wrap.style.right = 'auto';
          wrap.style.transform = 'translateX(-50%)';
          break;
        case 'bottom-right':
        default:
          wrap.style.bottom = edgeOffset + 'px';
          wrap.style.left = 'auto';
          wrap.style.right = edgeOffset + 'px';
          break;
      }
    }

    function resetTeaserStyles() {
      teaser.style.top = '';
      teaser.style.bottom = '';
      teaser.style.left = '';
      teaser.style.right = '';
      teaser.style.transform = '';
      teaser.style.transformOrigin = '';
    }

    function setTeaserFromPreset(preset) {
      resetTeaserStyles();
      var presetValue = (preset || '').toLowerCase();
      var isTopPreset = presetValue.indexOf('top-') === 0;
      var edgeOffset = 20;
      var bubbleOffset = 72;
      if (presetValue === 'top-left' || presetValue === 'middle-left' || presetValue === 'bottom-left') {
        teaser.style.left = edgeOffset + 'px';
        teaser.style.right = 'auto';
        teaser.style.transformOrigin = isTopPreset ? 'top left' : 'bottom left';
      } else if (presetValue === 'top-center' || presetValue === 'middle-center' || presetValue === 'bottom-center') {
        teaser.style.left = '50%';
        teaser.style.right = 'auto';
        teaser.style.transform = 'translateX(-50%)';
        teaser.style.transformOrigin = isTopPreset ? 'top center' : 'bottom center';
      } else {
        teaser.style.right = edgeOffset + 'px';
        teaser.style.left = 'auto';
        teaser.style.transformOrigin = isTopPreset ? 'top right' : 'bottom right';
      }
      if (isTopPreset) {
        teaser.style.top = bubbleOffset + 'px';
        teaser.style.bottom = 'auto';
      } else if (presetValue.indexOf('middle-') === 0) {
        teaser.style.top = '50%';
        teaser.style.bottom = 'auto';
        teaser.style.transform = (presetValue === 'middle-center' ? 'translate(-50%, -50%)' : 'translateY(-50%)');
      } else {
        teaser.style.bottom = bubbleOffset + 'px';
        teaser.style.top = 'auto';
      }
    }

    function setPanelFromPreset(preset) {
      iframe.style.left = '';
      iframe.style.right = '';
      iframe.style.transform = '';
      iframe.style.borderRadius = '20px 20px 0 20px';
      var presetValue = (preset || '').toLowerCase();
      switch (presetValue) {
        case 'top-left':
        case 'middle-left':
        case 'bottom-left':
          iframe.style.left = '0';
          iframe.style.right = 'auto';
          iframe.style.transform = '';
          iframe.style.borderRadius = '20px 20px 20px 0';
          break;
        case 'top-center':
        case 'middle-center':
        case 'bottom-center':
          iframe.style.left = '50%';
          iframe.style.right = 'auto';
          iframe.style.transform = 'translateX(-50%)';
          iframe.style.borderRadius = '20px 20px 0 0';
          break;
        default:
          iframe.style.left = 'auto';
          iframe.style.right = '0';
          break;
      }
    }

    var mobileEdgeOffset = 16;
    function setBubblePositionFromPreset(preset) {
      bubble.style.position = 'fixed';
      bubble.style.top = '';
      bubble.style.bottom = '';
      bubble.style.left = '';
      bubble.style.right = '';
      var presetValue = (preset || '').toLowerCase();
      switch (presetValue) {
        case 'top-left':
          bubble.style.top = mobileEdgeOffset + 'px';
          bubble.style.left = mobileEdgeOffset + 'px';
          bubble.style.right = 'auto';
          break;
        case 'top-center':
          bubble.style.top = mobileEdgeOffset + 'px';
          bubble.style.left = '50%';
          bubble.style.right = 'auto';
          bubble.style.transform = 'translateX(-50%)';
          break;
        case 'top-right':
          bubble.style.top = mobileEdgeOffset + 'px';
          bubble.style.left = 'auto';
          bubble.style.right = mobileEdgeOffset + 'px';
          break;
        case 'middle-left':
          bubble.style.top = '50%';
          bubble.style.left = mobileEdgeOffset + 'px';
          bubble.style.right = 'auto';
          bubble.style.transform = 'translateY(-50%)';
          break;
        case 'middle-right':
          bubble.style.top = '50%';
          bubble.style.left = 'auto';
          bubble.style.right = mobileEdgeOffset + 'px';
          bubble.style.transform = 'translateY(-50%)';
          break;
        case 'middle-center':
          bubble.style.top = '50%';
          bubble.style.left = '50%';
          bubble.style.right = 'auto';
          bubble.style.transform = 'translate(-50%, -50%)';
          break;
        case 'bottom-left':
          bubble.style.bottom = mobileEdgeOffset + 'px';
          bubble.style.left = mobileEdgeOffset + 'px';
          bubble.style.right = 'auto';
          break;
        case 'bottom-center':
          bubble.style.bottom = mobileEdgeOffset + 'px';
          bubble.style.left = '50%';
          bubble.style.right = 'auto';
          bubble.style.transform = 'translateX(-50%)';
          break;
        case 'bottom-right':
        default:
          bubble.style.bottom = mobileEdgeOffset + 'px';
          bubble.style.left = 'auto';
          bubble.style.right = mobileEdgeOffset + 'px';
          break;
      }
    }

    function clearBubblePosition() {
      bubble.style.position = '';
      bubble.style.top = '';
      bubble.style.bottom = '';
      bubble.style.left = '';
      bubble.style.right = '';
      bubble.style.transform = '';
    }

    function setBubbleColor(color) {
      function parseColorToRgb(c) {
        if (!c) return null;
        c = String(c).trim();
        if (c[0] === '#') {
          var hex = c.slice(1);
          if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
          }
          if (hex.length !== 6) return null;
          var r = parseInt(hex.slice(0, 2), 16);
          var g = parseInt(hex.slice(2, 4), 16);
          var b = parseInt(hex.slice(4, 6), 16);
          if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
          return { r: r, g: g, b: b };
        }
        var m = c.match(/^rgba?\(([^)]+)\)$/i);
        if (m) {
          var parts = m[1].split(',').map(function(v) { return parseFloat(v.trim()); });
          if (parts.length >= 3 && parts.every(function(v) { return !isNaN(v); })) {
            return { r: parts[0], g: parts[1], b: parts[2] };
          }
        }
        return null;
      }

      function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(function(x) {
          x = Math.round(Math.max(0, Math.min(255, x)));
          return (x < 16 ? '0' : '') + x.toString(16);
        }).join('');
      }

      function darken(hex, pct) {
        var rgb = parseColorToRgb(hex);
        if (!rgb) return hex;
        var f = 1 - (pct || 0.2);
        return rgbToHex(rgb.r * f, rgb.g * f, rgb.b * f);
      }

      function isLightColor(c) {
        var rgb = parseColorToRgb(c);
        if (!rgb) return false;
        var r = rgb.r / 255;
        var g = rgb.g / 255;
        var b = rgb.b / 255;
        var luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        return luminance > 0.7;
      }

      var applied = color || '#0f172a';
      var rgb = parseColorToRgb(applied);
      if (rgb) {
        var base = applied;
        var darker = isLightColor(applied)
          ? rgbToHex(rgb.r * 0.92, rgb.g * 0.92, rgb.b * 0.92)
          : darken(applied, 0.22);
        bubble.style.background = 'linear-gradient(165deg, ' + base + ' 0%, ' + base + ' 45%, ' + darker + ' 100%)';
      } else {
        bubble.style.background = applied;
      }
      bubble.style.backgroundColor = '';
      bubble.style.color = isLightColor(applied) ? '#1a1a1a' : '#ffffff';
    }

    var open = false;
    var teaserTimer = null;
    var teaserShown = false;
    var followUpScheduled = false;
    var WELCOME_TEASER_MS = 5000;
    var FOLLOWUP_TEASER_MS = 4000;
    var followUpByLang = { en: 'Ask me anything!', fr: 'Posez-moi une question !' };

    function hideTeaser(skipFollowUp) {
      teaser.classList.remove('visible');
      if (teaserTimer) {
        clearTimeout(teaserTimer);
        teaserTimer = null;
      }
      teaserShown = false;
      if (!skipFollowUp && !followUpScheduled) {
        followUpScheduled = true;
        teaserTimer = setTimeout(function() {
          teaserTimer = null;
          var followUp = followUpByLang[pageLanguage] || followUpByLang.en;
          showTeaser(followUp, FOLLOWUP_TEASER_MS);
        }, 400);
      }
    }

    function showTeaser(message, durationMs) {
      if (!message || open) return;
      if (teaserShown && durationMs !== FOLLOWUP_TEASER_MS) return;
      teaser.textContent = message;
      teaser.classList.add('visible');
      teaserShown = true;
      if (teaserTimer) clearTimeout(teaserTimer);
      var duration = durationMs || WELCOME_TEASER_MS;
      teaserTimer = setTimeout(function() {
        hideTeaser(duration === FOLLOWUP_TEASER_MS);
      }, duration);
    }

    function toggle() {
      open = !open;
      iframe.classList.toggle('open', open);
      bubble.classList.toggle('hidden', open);
      if (open) hideTeaser(true);
    }

    bubble.addEventListener('click', function() { toggle(); });

    var effectiveWidgetIdForPost = initialConfig && initialConfig._widgetId ? initialConfig._widgetId : widgetId;
    iframe.addEventListener('load', function() {
      try {
        iframe.contentWindow.postMessage({ type: 'spaxio-init', widgetId: effectiveWidgetIdForPost }, baseOrigin || '*');
      } catch (e) {}
    });

    if (typeof document.documentElement !== 'undefined' && window.MutationObserver) {
      var langObserver = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].attributeName === 'lang') {
            var newLang = document.documentElement.getAttribute('lang');
            var norm = normalizeLang(newLang);
            if (norm && norm !== pageLanguage) {
              pageLanguage = norm;
              notifyLang(norm);
            }
            break;
          }
        }
      });
      langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    window.addEventListener('message', function(e) {
      if (baseOrigin && e.origin !== baseOrigin) return;
      if (e.data && e.data.type === 'spaxio-close') toggle();
      if (e.data && e.data.type === 'spaxio-widget-height' && typeof e.data.height === 'number') {
        var h = Math.min(600, Math.max(200, e.data.height));
        iframe.style.height = h + 'px';
      }
    });

    var currentPositionPreset = 'bottom-right';
    function applyPositionForViewport() {
      var isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 480px)').matches;
      if (isMobile) {
        setBubblePositionFromPreset(currentPositionPreset);
      } else {
        clearBubblePosition();
      }
    }

    function applyConfig(config) {
      var c = config || {};
      if (c.autoDetectWebsiteLanguage === false && c.defaultLanguage) {
        var def = normalizeLang(c.defaultLanguage);
        if (def && def !== pageLanguage) {
          pageLanguage = def;
          notifyLang(def);
        }
      }
      var override = positionPresetOverride && String(positionPresetOverride).trim();
      currentPositionPreset = override || c.positionPreset || 'bottom-right';
      setBubbleColor(c.primaryBrandColor);
      if (c && c.widgetLogoUrl) {
        try {
          var img = document.createElement('img');
          img.src = c.widgetLogoUrl;
          img.alt = (c.businessName || '') + ' logo';
          while (bubble.firstChild) bubble.removeChild(bubble.firstChild);
          bubble.appendChild(img);
        } catch (e) {}
      }
      setPositionFromPreset(currentPositionPreset);
      setTeaserFromPreset(currentPositionPreset);
      setPanelFromPreset(currentPositionPreset);
      applyPositionForViewport();
      wrap.classList.add('spaxio-wrap-ready');
      showTeaser(c.welcomeMessage || 'Hi! How can I help you today?');
    }

    if (initialConfig) {
      applyConfig(initialConfig);
    } else {
      var initialPreset = (positionPresetOverride && String(positionPresetOverride).trim()) || 'bottom-right';
      setPositionFromPreset(initialPreset);
      setTeaserFromPreset(initialPreset);
      setPanelFromPreset(initialPreset);
      currentPositionPreset = initialPreset;
      applyPositionForViewport();
      loadConfig();
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      var mql = window.matchMedia && window.matchMedia('(max-width: 480px)');
      if (mql && mql.addEventListener) {
        mql.addEventListener('change', function() { applyPositionForViewport(); });
      }
    }

    function loadConfig(retriesLeft) {
      retriesLeft = typeof retriesLeft === 'number' ? retriesLeft : 2;
      var wid = initialConfig && initialConfig._widgetId ? initialConfig._widgetId : widgetId;
      if (!wid) { applyConfig(null); return; }
      fetch(base + '/api/widget/config?widgetId=' + encodeURIComponent(wid), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      })
        .then(function(r) {
          if (!r.ok) throw new Error('Config failed');
          return r.json();
        })
        .then(function(config) {
          if (config && wid) config._widgetId = wid;
          applyConfig(config);
        })
        .catch(function(err) {
          if (retriesLeft > 0) {
            setTimeout(function() { loadConfig(retriesLeft - 1); }, 1000);
          } else {
            applyConfig(null);
          }
        });
    }

    if (typeof window !== 'undefined') {
      try {
        window.spaxioSetLanguage = function(lang) {
          if (!lang || typeof lang !== 'string') return;
          var next = normalizeLang(lang);
          if (next) notifyLang(next);
        };
        window.SpaxioAssistant = window.SpaxioAssistant || {};
        window.SpaxioAssistant.setLanguage = window.spaxioSetLanguage;
        window.SpaxioAssistant.getLanguage = function() { return pageLanguage || 'en'; };
        window.SpaxioAssistant.onLanguageChange = function(cb) {
          if (typeof cb === 'function') langCallbacks.push(cb);
        };
      } catch (e) {}
    }
  }

  function tryMount() {
    function doMount(resolvedWidgetId) {
      if (!resolvedWidgetId) return;
      widgetId = resolvedWidgetId;
      fetch(base + '/api/widget/config?widgetId=' + encodeURIComponent(resolvedWidgetId), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      })
        .then(function(r) { return r.ok ? r.json() : Promise.reject(new Error('Config failed')); })
        .then(function(config) {
          if (config && config.enabled === false) return;
          if (config) config._widgetId = resolvedWidgetId;
          mount(config);
        })
        .catch(function() { mount({ _widgetId: resolvedWidgetId }); });
    }
    resolveWidgetId(doMount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryMount);
  } else {
    tryMount();
  }
})();
