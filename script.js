// script.js — Animations (vanilla JS, GSAP used locally for learn icons/cards)
(function () {
  'use strict';

  const prefersReducedMotion =
    !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  document.addEventListener('DOMContentLoaded', () => {
    try {
      setYearFooter();
      fixBackgroundNoParallax();
      initScrollReveal();            // 2. Section reveal
      initTypewriter();              // hero title typing
      initGlowingButtons();          // CTA hover/focus glow
      initScrollProgress();          // 4. Top progress bar
      initCounters();                // 3. Animated counters
      initImageRevealMask();         // 5. Optional image reveal mask (images only)

      // Load local GSAP and animate icons + frames in "Foundations you'll learn"
      loadGSAP().then((gsap) => {
        if (gsap && !prefersReducedMotion) {
          initGSAPLearnCardsAndIcons(gsap);
        }
      });
    } catch (_) {
      /* fail gracefully */
    }
  });

  // ---------- Utilities ----------
  function uniqElements(list) {
    const seen = new Set();
    return Array.from(list).filter(el => {
      if (!el || !(el instanceof Element)) return false;
      if (seen.has(el)) return false;
      seen.add(el);
      return true;
    });
  }

  function mergeTransitions(base, extra) {
    const flat = (base ? base + ',' : '') + extra;
    const pieces = flat.split(',').map(s => s.trim()).filter(Boolean);
    const map = new Map();
    pieces.forEach(p => {
      const prop = (p.split(/\s+/)[0] || '').toLowerCase();
      map.set(prop, p);
    });
    return Array.from(map.values()).join(', ');
  }

  function parseRGB(colorStr) {
    if (!colorStr) return null;
    const s = colorStr.trim();
    let m = s.match(/rgba?\(\s*([0-9]+)[,\s]+([0-9]+)[,\s]+([0-9]+)/i);
    if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
    m = s.match(/^#([0-9a-f]{6})$/i);
    if (m) return [
      parseInt(m[1].slice(0, 2), 16),
      parseInt(m[1].slice(2, 4), 16),
      parseInt(m[1].slice(4, 6), 16)
    ];
    m = s.match(/^#([0-9a-f]{3})$/i);
    if (m) return [
      parseInt(m[1][0] + m[1][0], 16),
      parseInt(m[1][1] + m[1][1], 16),
      parseInt(m[1][2] + m[1][2], 16)
    ];
    return null;
  }

  function getCSSVarRGB(varName, fallbackRGB) {
    const root = getComputedStyle(document.documentElement);
    const val = root.getPropertyValue(varName)?.trim();
    const rgb = parseRGB(val);
    return rgb || fallbackRGB;
  }

  function getAccentRGB() { return getCSSVarRGB('--accent', [34, 211, 238]); }
  function getAccent2RGB() { return getCSSVarRGB('--accent-2', [96, 165, 250]); }

  function setYearFooter() {
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  // 1) Fix background: remove parallax and ensure no transform so no gaps appear
  function fixBackgroundNoParallax() {
    const vid = document.querySelector('.bg-video video');
    if (!vid) return;
    vid.style.transform = 'none';
    vid.style.willChange = '';
    // Ensure visible
    vid.style.opacity = '1';
    vid.style.clipPath = '';
  }

  // 2) Section reveal: fade + slide-up when entering viewport
  function initScrollReveal() {
    if (prefersReducedMotion) return; // Respect user setting

    const selectors = [
      '.hero', '.section', '.learn-card', '.card', '.edit-card',
      '.learn-app-card', '.tips .tip', '.hub .card', 'main > section', 'article'
    ];

    const all = uniqElements(
      selectors.flatMap(s => Array.from(document.querySelectorAll(s)))
    );

    // Exclude GSAP-controlled items in Foundations section to avoid transform conflicts
    const found = all.filter(el => !el.closest('#overview .learn-card'));
    if (!found.length) return;

    found.forEach(el => {
      if (el.dataset._revealInit) return;
      el.dataset._revealInit = '1';
      el.dataset._origOpacity = el.style.opacity || '';
      el.dataset._origTransform = el.style.transform || '';
      el.dataset._origTransition = el.style.transition || '';

      el.style.opacity = '0';
      const cur = el.style.transform && el.style.transform !== 'none' ? el.style.transform + ' ' : '';
      el.style.transform = `${cur}translateY(18px)`;
      el.style.transition = mergeTransitions(el.dataset._origTransition || '', 'opacity 600ms ease-out, transform 600ms ease-out');
      el.style.willChange = 'opacity, transform';
    });

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(onIntersect, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      found.forEach(el => obs.observe(el));
      function onIntersect(entries) {
        entries.forEach(en => { if (en.isIntersecting) { reveal(en.target); obs.unobserve(en.target); } });
      }
    } else {
      const onScroll = () => { found.forEach(el => { if (!el.dataset._revealed && isInViewport(el, 0.12)) reveal(el); }); };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    }

    function reveal(el) {
      el.dataset._revealed = '1';
      const curT = el.style.transform || '';
      const cleaned = curT.replace(/translateY\(\s*18px\s*\)/, '').trim();
      el.style.transform = cleaned || 'none';
      el.style.opacity = '1';
      const cleanup = () => { el.style.willChange = ''; el.removeEventListener('transitionend', cleanup); };
      el.addEventListener('transitionend', cleanup);
    }

    function isInViewport(el, threshold = 0.12) {
      const r = el.getBoundingClientRect();
      const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      return r.top < vh * (1 - threshold) && r.bottom > vh * threshold * -1;
    }
  }

  // Hero typewriter intro (kept lightweight)
  function initTypewriter() {
    const h = document.querySelector('#hero-title') || document.querySelector('main h1') || document.querySelector('h1');
    if (!h) return;
    if (prefersReducedMotion) { fadeInElement(h, 250); return; }
    if (h.dataset._typeDone === '1') return;
    h.dataset._typeDone = '1';

    if (h.childElementCount > 0) { // avoid breaking nested markup
      fadeInElement(h, 350);
      return;
    }

    const text = (h.textContent || '').trim();
    if (!text) return;

    h.dataset._origTransition = h.style.transition || '';
    h.dataset._origOpacity = h.style.opacity || '';

    h.textContent = '';
    h.style.whiteSpace = 'pre-wrap';
    h.style.opacity = '0.98';

    const baseDelay = 38, spaceDelay = 12, punctDelay = 110;
    const punct = new Set([',', '.', '!', '?', ':', ';']);
    let i = 0;

    function tick() {
      if (i >= text.length) { h.style.opacity = '1'; return; }
      const ch = text[i++];
      h.appendChild(document.createTextNode(ch));
      let d = baseDelay;
      if (ch === ' ') d = spaceDelay;
      if (punct.has(ch)) d = punctDelay;
      setTimeout(tick, d);
    }
    setTimeout(() => { h.style.opacity = '1'; tick(); }, 60);
  }

  function fadeInElement(el, duration = 300) {
    const orig = el.style.transition || '';
    el.style.transition = (orig ? orig + ',' : '') + `opacity ${duration}ms ease-out`;
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      const cleanup = () => { el.style.transition = orig; el.removeEventListener('transitionend', cleanup); };
      el.addEventListener('transitionend', cleanup);
    });
  }

  // CTA/button glow pulse on hover/focus
  function initGlowingButtons() {
    const selectors = [
      '.shiny-cta', 'a.button', 'a.btn', 'a[class*="btn"]', '.button', '.btn', '.cta', '.cta-button', '.primary-btn',
      'button', 'input[type="button"]', 'input[type="submit"]', '[role="button"]'
    ];
    const nodes = uniqElements(selectors.flatMap(s => Array.from(document.querySelectorAll(s))));
    if (!nodes.length || prefersReducedMotion) return;

    const accent = getAccentRGB();

    nodes.forEach(el => {
      if (!(el instanceof Element) || el.dataset._glowInit) return;
      el.dataset._glowInit = '1';
      el.dataset._origBox = el.style.boxShadow || '';
      el.dataset._origTransform = el.style.transform || '';
      el.dataset._origTransition = el.style.transition || '';

      el.style.transition = mergeTransitions(el.style.transition || '', 'box-shadow 220ms ease-out, transform 160ms ease-out');

      let rafId = 0, t = 0; const speed = 0.02;
      function startPulse() {
        cancelPulse(); t = 0;
        const loop = () => {
          t += speed;
          const osc = (Math.sin(t) + 1) / 2; // 0..1
          const outer = 0.25 + osc * 0.45;
          const inner = 0.15 + (1 - osc) * 0.35;
          el.style.boxShadow = `0 0 8px rgba(${accent.join(',')}, ${inner}), 0 0 20px rgba(${accent.join(',')}, ${outer})`;
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        el.dataset._raf = String(rafId || 0);
      }
      function cancelPulse() { const id = el.dataset._raf ? parseInt(el.dataset._raf, 10) : 0; if (id) cancelAnimationFrame(id); el.dataset._raf = ''; }

      function onEnter() {
        const cur = el.style.transform && el.style.transform !== 'none' ? el.style.transform + ' ' : '';
        el.style.transform = `${cur}scale(1.03)`;
        el.style.boxShadow = `0 0 6px rgba(${accent.join(',')}, 0.28), 0 0 14px rgba(${accent.join(',')}, 0.2)`;
        startPulse();
      }
      function onLeave() { cancelPulse(); el.style.boxShadow = el.dataset._origBox || ''; el.style.transform = el.dataset._origTransform || ''; }

      el.addEventListener('mouseenter', onEnter, { passive: true });
      el.addEventListener('mouseleave', onLeave, { passive: true });
      el.addEventListener('focus', onEnter, { passive: true });
      el.addEventListener('blur', onLeave, { passive: true });
      if (el === document.activeElement) onEnter();
    });
  }

  // 4) Scroll progress bar (inline-styled)
  function initScrollProgress() {
    const id = 'scroll-progress';
    let bar = document.getElementById(id);
    if (!bar) { bar = document.createElement('div'); bar.id = id; document.body.appendChild(bar); }

    if (prefersReducedMotion) { bar.style.display = 'none'; return; }

    const [c1, c2] = [getAccent2RGB(), getAccentRGB()];
    const bg = `linear-gradient(90deg, rgba(${c1.join(',')},0.95), rgba(${c2.join(',')},0.95))`;
    Object.assign(bar.style, {
      position: 'fixed', left: '0', top: '0', width: '100%', height: '3px',
      transformOrigin: 'left center', transform: 'scaleX(0)',
      background: bg, zIndex: '9999', pointerEvents: 'none',
      boxShadow: '0 0 6px rgba(0,0,0,.25)'
    });

    const update = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const docH = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.documentElement.clientHeight
      );
      const vh = window.innerHeight || document.documentElement.clientHeight || 1;
      const max = Math.max(1, docH - vh);
      const p = Math.min(1, Math.max(0, scrollTop / max));
      bar.style.transform = `scaleX(${p})`;
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // 3) Animated counters on reveal
  function initCounters() {
    const selectors = ['[data-counter]', '[data-count-to]', '[data-target]', '.counter'];
    const nodes = uniqElements(selectors.flatMap(s => Array.from(document.querySelectorAll(s))));
    if (!nodes.length) return;

    const counters = nodes.map(el => buildCounterModel(el)).filter(Boolean);
    if (!counters.length) return;

    const startAnim = (model) => {
      if (model.started) return; model.started = true;
      if (prefersReducedMotion) { model.el.textContent = model.format(model.to); return; }
      const t0 = performance.now(); const dur = model.duration;
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const eased = easeOutCubic(k);
        const cur = model.from + (model.to - model.from) * eased;
        model.el.textContent = model.format(cur);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(en => { if (en.isIntersecting) { const model = counters.find(c => c.el === en.target); if (model) startAnim(model); obs.unobserve(en.target); } });
      }, { threshold: 0.25 });
      counters.forEach(c => obs.observe(c.el));
      // force start if already visible at load
      requestAnimationFrame(() => counters.forEach(c => { if (isInViewport(c.el, 0.01)) startAnim(c); }));
    } else {
      counters.forEach(startAnim);
    }

    function buildCounterModel(el) {
      // target value priority: data-count-to > data-target > data-counter > number in textContent
      let to = numOrNull(el.getAttribute('data-count-to'));
      if (to == null) to = numOrNull(el.getAttribute('data-target'));
      if (to == null) to = numOrNull(el.getAttribute('data-counter'));
      let prefix = '', suffix = '';

      if (to == null) {
        const raw = (el.textContent || '').trim();
        const m = raw.match(/^(\D*)([0-9]+(?:[.,][0-9]+)?)(\D*)$/);
        if (!m) return null;
        prefix = m[1] || ''; suffix = m[3] || '';
        to = parseFloat(m[2].replace(/,/g, '.'));
      }

      const decimals = decimalPlaces(to);
      const fromAttr = el.getAttribute('data-from');
      const from = fromAttr != null ? (parseFloat(fromAttr.replace(/,/g, '.')) || 0) : 0;
      const duration = clamp(parseInt(el.getAttribute('data-duration') || '1400', 10) || 1400, 400, 5000);

      const fmt = (v) => formatNumber(v, decimals, prefix, suffix);
      // set initial text
      el.textContent = fmt(from);
      return { el, from, to, duration, format: fmt, started: false };
    }

    function numOrNull(v) { if (v == null) return null; const n = parseFloat(String(v).replace(/,/g, '.')); return Number.isFinite(n) ? n : null; }
    function decimalPlaces(n) { const s = String(n); const i = s.indexOf('.'); return i >= 0 ? (s.length - i - 1) : 0; }
    function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function formatNumber(v, decimals, prefix, suffix) {
      const sign = v < 0 ? '-' : '';
      const abs = Math.abs(v);
      const fixed = abs.toFixed(decimals);
      // Add thousands separators if integer-like
      const parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const joined = parts.join(decimals > 0 ? '.' : '');
      return `${prefix}${sign}${joined}${suffix}`;
    }
  }

  // 5) Optional image reveal mask: uncover left -> right when entering viewport (IMAGES ONLY)
  function initImageRevealMask() {
    // Only apply to <img>. Avoid videos and wrappers to prevent hiding content.
    const supportsClip = (typeof CSS !== 'undefined' && CSS.supports && (CSS.supports('clip-path', 'inset(0 0 0 0)') || CSS.supports('clip-path', 'inset(0% 0% 0% 0%)')));
    const items = uniqElements([ ...document.querySelectorAll('img') ]).filter(el => !el.closest('.bg-video'));
    if (!items.length) return;

    items.forEach(el => {
      if (el.dataset._maskInit) return;
      el.dataset._maskInit = '1';
      el.dataset._origTransition = el.style.transition || '';
      el.dataset._origOpacity = el.style.opacity || '';
      el.dataset._origTransform = el.style.transform || '';

      if (supportsClip) {
        el.style.clipPath = 'inset(0 100% 0 0)';
        el.style.transition = mergeTransitions(el.style.transition || '', 'clip-path 800ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 400ms ease-out');
        el.style.opacity = '0.001';
      } else {
        el.style.opacity = '0';
        const cur = el.style.transform && el.style.transform !== 'none' ? el.style.transform + ' ' : '';
        el.style.transform = `${cur}translateX(14px)`;
        el.style.transition = mergeTransitions(el.style.transition || '', 'opacity 600ms ease-out, transform 600ms ease-out');
      }
      el.style.willChange = 'opacity, transform';
    });

    const reveal = (el) => {
      if (el.dataset._maskRevealed) return;
      el.dataset._maskRevealed = '1';
      if (prefersReducedMotion) {
        if (el.style.clipPath) el.style.clipPath = 'inset(0 0 0 0)';
        el.style.opacity = '1';
        el.style.transform = el.dataset._origTransform || '';
        return;
      }
      if (el.style.clipPath) { el.style.opacity = '1'; el.style.clipPath = 'inset(0 0 0 0)'; }
      else {
        el.style.opacity = '1';
        const cleaned = (el.style.transform || '').replace(/translateX\([^)]*\)/, '').trim();
        el.style.transform = cleaned || 'none';
      }
      const cleanup = () => { el.style.willChange = ''; el.removeEventListener('transitionend', cleanup); };
      el.addEventListener('transitionend', cleanup);
    };

    const observe = () => {
      if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach(en => { if (en.isIntersecting) { reveal(en.target); obs.unobserve(en.target); } });
        }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
        items.forEach(el => obs.observe(el));
        // reveal anything already visible at load
        requestAnimationFrame(() => items.forEach(el => { if (isInViewport(el, 0.01)) reveal(el); }));
      } else {
        items.forEach(reveal);
      }
    };
    observe();

    function isInViewport(el, threshold = 0.01) {
      const r = el.getBoundingClientRect();
      const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      return r.top < vh * (1 - threshold) && r.bottom > vh * threshold * -1;
    }
  }

  // -------------------
  // GSAP integration for "Foundations you'll learn" cards + icons
  // -------------------
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  function loadGSAP() {
    if (window.gsap) return Promise.resolve(window.gsap);
    // Load only the core UMD build from local folder
    return loadScript('gsap-public/umd/gsap.js')
      .then(() => window.gsap)
      .catch(() => null);
  }

  function initGSAPLearnCardsAndIcons(gsap) {
    const cards = Array.from(document.querySelectorAll('#overview .learn-card'));
    if (!cards.length) return;

    // Smooth, transform-only animations for best performance
    const enterCard = (card, i) => {
      if (card.dataset._gsapEntered) return;
      card.dataset._gsapEntered = '1';

      const icon = card.querySelector('.learn-icon');

      // Hint the browser for GPU acceleration
      gsap.set(card, { transformPerspective: 800, transformStyle: 'preserve-3d' });
      card.style.willChange = 'transform';
      if (icon) icon.style.willChange = 'transform';

      // Entrance: simple and fast
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' }, delay: i * 0.06 });
      tl.fromTo(card, { opacity: 0, y: 24, scale: 0.96, rotateX: -6 }, { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.6 });
      if (icon) {
        tl.fromTo(icon, { scale: 0.85, rotation: -8 }, { scale: 1, rotation: 0, duration: 0.38, ease: 'back.out(2)' }, '-=0.2');
      }

      // Persistent, lightweight idle motion (transform-only) — runs forever
      if (icon) {
        const idle = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
        idle.to(icon, { y: 3, rotation: 2, duration: 2.0 })
            .to(icon, { y: -3, rotation: -2, duration: 2.0 })
            .to(icon, { y: 0, rotation: 0, duration: 1.6 });
        gsap.to(icon, { scale: 1.02, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.6 });
      }

      // Hover tilt with gsap.quickTo for smooth updates
      const qx = gsap.quickTo(card, 'rotationX', { duration: 0.18, ease: 'power2.out' });
      const qy = gsap.quickTo(card, 'rotationY', { duration: 0.18, ease: 'power2.out' });
      const qScale = gsap.quickTo(card, 'scale', { duration: 0.18, ease: 'power2.out' });

      const onMove = (ev) => {
        const r = card.getBoundingClientRect();
        const mx = (ev.clientX - r.left) / r.width;  // 0..1
        const my = (ev.clientY - r.top) / r.height;  // 0..1
        const rx = (0.5 - my) * 8;  // reduce range for stability
        const ry = (mx - 0.5) * 10; // reduce range for stability
        qx(rx); qy(ry);
      };
      const onEnter = () => { qScale(1.02); };
      const onLeave = () => { qx(0); qy(0); qScale(1.0); };

      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseenter', onEnter, { passive: true });
      card.addEventListener('mouseleave', onLeave, { passive: true });
      card.addEventListener('focus', onEnter, { passive: true });
      card.addEventListener('blur', onLeave, { passive: true });
    };

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            const idx = cards.indexOf(en.target);
            enterCard(en.target, Math.max(0, idx));
            obs.unobserve(en.target);
          }
        });
      }, { threshold: 0.2 });
      cards.forEach(card => {
        if (card.dataset._gsapInit) return;
        card.dataset._gsapInit = '1';
        obs.observe(card);
      });
      // if already in view at load
      requestAnimationFrame(() => {
        cards.forEach((card, i) => {
          const r = card.getBoundingClientRect();
          const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
          if (r.top < vh * 0.9 && r.bottom > vh * 0.1) enterCard(card, i);
        });
      });
    } else {
      cards.forEach(enterCard);
    }
  }
})();
