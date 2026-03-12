(function() {
  'use strict';
  var script = document.currentScript || [].slice.call(document.querySelectorAll('script[data-widget-id]')).pop();
  var widgetId = script && script.getAttribute('data-widget-id');
  if (!widgetId) return;

  var base = (script && script.getAttribute('data-base-url')) || "__SPAXIO_BASE_URL__";
  var baseOrigin = (function() { try { return new URL(base).origin; } catch (e) { return ''; } })();

  function detectLanguage() {
    function normalizeLang(value) {
      if (!value) return null;
      var v = String(value).trim().toLowerCase();
      if (!v) return null;
      if (v.length > 2 && v.indexOf('-') === 2) {
        v = v.slice(0, 2);
      }
      return v;
    }

    var attrLang = script && (script.getAttribute('data-language') || script.getAttribute('data-lang'));
    var normalized = normalizeLang(attrLang);
    if (normalized) return normalized;

    if (document.documentElement) {
      var docLangAttr = document.documentElement.getAttribute('lang');
      var docLang = docLangAttr || (document.documentElement && document.documentElement.lang);
      normalized = normalizeLang(docLang);
      if (normalized) return normalized;
    }

    if (typeof navigator !== 'undefined' && navigator.language) {
      normalized = normalizeLang(navigator.language);
      if (normalized) return normalized;
    }

    return null;
  }

  var pageLanguage = detectLanguage();

  function mount() {
    if (!document.body) return;
    if (document.querySelector('[data-spaxio="1"]')) return;
    var host = document.createElement('div');
    host.id = 'spaxio-widget-host';
    host.setAttribute('data-spaxio', '1');
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: 'closed' });
    var sheet = document.createElement('style');
    sheet.textContent = [
    ':host{all:initial;display:block;position:fixed;inset:0;pointer-events:none;z-index:2147483647}',
    '.spaxio-wrap{pointer-events:auto;position:fixed;z-index:2147483647}',
    '.spaxio-bubble{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.12),0 8px 24px rgba(0,0,0,0.18),0 0 0 1px rgba(0,0,0,0.06);transition:transform 0.2s ease,box-shadow 0.25s ease;color:#fff;background:linear-gradient(165deg,#1e293b 0%,#0f172a 50%,#0c1322 100%);pointer-events:auto;overflow:hidden}',
    '.spaxio-bubble svg{width:24px;height:24px;stroke:currentColor;stroke-width:2.25;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.2))}',
    '.spaxio-bubble img{width:115%;height:115%;object-fit:cover;display:block;border-radius:50%}',
    '.spaxio-bubble:hover{transform:scale(1.05);box-shadow:0 4px 12px rgba(0,0,0,0.14),0 12px 32px rgba(0,0,0,0.22),0 0 0 1px rgba(0,0,0,0.08)}',
    '.spaxio-bubble:focus{outline:2px solid currentColor;outline-offset:2px}',
    '.spaxio-teaser{position:fixed;z-index:2147483647;width:min(280px,calc(100vw - 32px));padding:12px 14px;border-radius:18px;background:#ffffff;color:#0f172a;box-shadow:0 0 0 1px rgba(15,23,42,0.06),0 12px 32px rgba(15,23,42,0.16);font:500 14px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;opacity:0;visibility:hidden;transform-origin:bottom right;pointer-events:none;transition:opacity 0.22s ease,visibility 0s linear 0.22s;white-space:normal;overflow-wrap:anywhere;box-sizing:border-box}',
    '.spaxio-teaser.visible{opacity:1;visibility:visible;transition:opacity 0.22s ease}',
    '.spaxio-panel{position:absolute;right:0;bottom:72px;width:380px;max-width:min(380px,calc(100vw - 32px));height:320px;max-height:80vh;border:none;border-radius:24px 24px 0 24px;box-shadow:0 0 0 1px rgba(0,0,0,0.06),0 8px 24px rgba(0,0,0,0.1),0 24px 64px rgba(0,0,0,0.16);background:#fff;pointer-events:none;opacity:0;transform:translateY(12px) scale(0.98);transition:opacity 0.25s ease,transform 0.25s ease}',
    '.spaxio-panel.open{opacity:1;pointer-events:auto;transform:translateY(0) scale(1)}',
    '.spaxio-bubble.hidden{display:none !important}',
    '@media (max-width: 480px){.spaxio-wrap{left:0;right:0;bottom:0;top:auto;width:100%}.spaxio-panel{position:fixed;left:0;right:0;bottom:0;top:auto;width:100%;height:70vh;max-height:70vh;border-radius:24px 24px 0 0}.spaxio-bubble{position:fixed;bottom:16px;right:16px;width:56px;height:56px}.spaxio-teaser{position:fixed;right:16px;bottom:88px;max-width:min(280px,calc(100vw - 32px))}.spaxio-label{right:16px;bottom:88px}}'
    ].join('');
    shadow.appendChild(sheet);

    var iframe = document.createElement('iframe');
    iframe.className = 'spaxio-panel';
    iframe.id = 'spaxio-widget-iframe';
    iframe.title = 'Chat';
    var localeSegment = (pageLanguage && (pageLanguage === 'fr' || pageLanguage === 'en')) ? pageLanguage : 'en';
    var iframeSrc = base + '/' + localeSegment + '/widget?widgetId=' + encodeURIComponent(widgetId) + '&lang=' + encodeURIComponent(localeSegment);
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
          break;
        case 'top-center':
          wrap.style.top = edgeOffset + 'px';
          wrap.style.left = '50%';
          wrap.style.transform = 'translateX(-50%)';
          break;
        case 'top-right':
          wrap.style.top = edgeOffset + 'px';
          wrap.style.right = edgeOffset + 'px';
          break;
        case 'middle-left':
          wrap.style.top = '50%';
          wrap.style.left = edgeOffset + 'px';
          wrap.style.transform = 'translateY(-50%)';
          break;
        case 'middle-right':
          wrap.style.top = '50%';
          wrap.style.right = edgeOffset + 'px';
          wrap.style.transform = 'translateY(-50%)';
          break;
        case 'middle-center':
          wrap.style.top = '50%';
          wrap.style.left = '50%';
          wrap.style.transform = 'translate(-50%, -50%)';
          break;
        case 'bottom-left':
          wrap.style.bottom = edgeOffset + 'px';
          wrap.style.left = edgeOffset + 'px';
          break;
        case 'bottom-center':
          wrap.style.bottom = edgeOffset + 'px';
          wrap.style.left = '50%';
          wrap.style.transform = 'translateX(-50%)';
          break;
        case 'bottom-right':
        default:
          wrap.style.bottom = edgeOffset + 'px';
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
      iframe.style.right = '0';
      iframe.style.transform = '';
      iframe.style.borderRadius = '20px 20px 0 20px';
      var presetValue = (preset || '').toLowerCase();
      switch (presetValue) {
        case 'top-left':
        case 'middle-left':
        case 'bottom-left':
          iframe.style.left = '0';
          iframe.style.right = '';
          iframe.style.transform = '';
          iframe.style.borderRadius = '20px 20px 20px 0';
          break;
        case 'top-center':
        case 'middle-center':
        case 'bottom-center':
          iframe.style.left = '50%';
          iframe.style.right = '';
          iframe.style.transform = 'translateX(-50%)';
          iframe.style.borderRadius = '20px 20px 0 0';
          break;
        default:
          // keep default right-aligned styles
          break;
      }
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

    function hideTeaser() {
      teaser.classList.remove('visible');
      if (teaserTimer) {
        clearTimeout(teaserTimer);
        teaserTimer = null;
      }
    }

    function showTeaser(message) {
      if (!message || open || teaserShown) return;
      teaser.textContent = message;
      teaser.classList.add('visible');
      teaserShown = true;
      if (teaserTimer) clearTimeout(teaserTimer);
      teaserTimer = setTimeout(function() {
        hideTeaser();
      }, 3000);
    }

    function toggle() {
      open = !open;
      iframe.classList.toggle('open', open);
      bubble.classList.toggle('hidden', open);
      if (open) hideTeaser();
    }

    bubble.addEventListener('click', function() { toggle(); });

    iframe.addEventListener('load', function() {
      try {
        iframe.contentWindow.postMessage({ type: 'spaxio-init', widgetId: widgetId }, baseOrigin || '*');
      } catch (e) {}
    });

    window.addEventListener('message', function(e) {
      if (baseOrigin && e.origin !== baseOrigin) return;
      if (e.data && e.data.type === 'spaxio-close') toggle();
      if (e.data && e.data.type === 'spaxio-widget-height' && typeof e.data.height === 'number') {
        var h = Math.min(600, Math.max(200, e.data.height));
        iframe.style.height = h + 'px';
      }
    });

    function applyConfig(config) {
      var c = config || {};
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
      setPositionFromPreset(c.positionPreset || 'bottom-right');
      setTeaserFromPreset(c.positionPreset || 'bottom-right');
      setPanelFromPreset(c.positionPreset || 'bottom-right');
      showTeaser(c.welcomeMessage || 'Hi! How can I help you today?');
    }

    setPositionFromPreset('bottom-right');
    setTeaserFromPreset('bottom-right');
    setPanelFromPreset('bottom-right');

    function loadConfig(retriesLeft) {
      retriesLeft = typeof retriesLeft === 'number' ? retriesLeft : 2;
      fetch(base + '/api/widget/config?widgetId=' + encodeURIComponent(widgetId), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      })
        .then(function(r) {
          if (!r.ok) throw new Error('Config failed');
          return r.json();
        })
        .then(function(config) { applyConfig(config); })
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
          var next = String(lang).trim().toLowerCase();
          pageLanguage = next || null;
          if (iframe && iframe.contentWindow && pageLanguage) {
            try {
              iframe.contentWindow.postMessage({ type: 'spaxio-lang-change', language: pageLanguage }, baseOrigin || '*');
            } catch (e) {}
          }
        };
      } catch (e) {}
    }

    loadConfig();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
