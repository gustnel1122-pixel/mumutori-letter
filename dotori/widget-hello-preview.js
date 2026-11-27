/* 1711 preview only. Load AFTER the existing widget; do not replace widget.js.
 * No server calls, navigation changes, new artwork, or deployment hooks.
 */
(function () {
  'use strict';
  if (location.pathname !== '/' && location.pathname !== '/index.html') return;
  if (window.DotoriHelloPreview) return;

  var SEEN = 'mumutori:dotori:hello-seen:v1';
  // Existing assets only: 'sign' (T3-3), 'original' (widget's own wave), 'sparkle' (T3-1).
  var variant = window.DotoriHelloPreviewAsset;
  if (['sign', 'original', 'sparkle'].indexOf(variant) < 0) variant = 'sign';
  var HOLD = 2150, RETURN = 600, LIMIT = 2900;
  var root, character, message, source, observer, frame, deadline, waitTimer;
  var started = 0, finished = false, claimed = false, reduced = false;
  var phase = 'waiting', storage = 'document', big;
  var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var artwork, liveBody;
  if (variant !== 'original' && !(motion && motion.matches)) {
    artwork = new Image();
    artwork.src = new URL('hello-preview-assets/t3-' + variant + '.png',
      document.currentScript && document.currentScript.src || location.href).href;
  }

  function emit(reason) {
    document.dispatchEvent(new CustomEvent('dotorihello:state', { detail: {
      phase: phase, reason: reason || '', elapsed: started ? performance.now() - started : 0,
      reducedMotion: reduced, storage: storage, variant: variant
    } }));
  }
  function cleanup() {
    cancelAnimationFrame(frame);
    clearTimeout(deadline);
    clearTimeout(waitTimer);
    if (observer) observer.disconnect();
    document.removeEventListener('pointerdown', skip, true);
    document.removeEventListener('click', skip, true);
    document.removeEventListener('keydown', key, true);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', leave);
    window.removeEventListener('resize', leave);
    if (motion && motion.removeEventListener) motion.removeEventListener('change', leave);
    if (source) source.removeAttribute('data-dotori-hello-source');
    document.documentElement.removeAttribute('data-dotori-hello-active');
    if (root) root.remove();
  }
  function finish(reason) {
    if (finished) return;
    finished = true;
    phase = 'done';
    cleanup();
    emit(reason || 'complete');
  }
  function skip() { finish('skip'); }
  function key(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip(); }
  function visibility() { if (document.hidden) finish('page-hidden'); }
  function leave() { finish('viewport-or-page-change'); }
  function viewport() {
    var v = window.visualViewport;
    return { x: v ? v.offsetLeft : 0, y: v ? v.offsetTop : 0,
      width: v ? v.width : document.documentElement.clientWidth,
      height: v ? v.height : innerHeight };
  }
  function position(x, y, width) {
    character.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (width / big.baseWidth) + ')';
  }
  function draw(now) {
    if (finished) return;
    var age = now - started;
    if (!source.isConnected || source.hidden) { finish('widget-hidden'); return; }
    if (age >= HOLD + RETURN) { finish('complete'); return; }
    if (!reduced) {
      var p = Math.min(1, Math.max(0, (age - HOLD) / RETURN));
      // Gentle acceleration into the existing moving character, no overshoot.
      var e = p * p * (3 - 2 * p);
      var target = source.getBoundingClientRect();
      position(big.x + (target.left - big.x) * e, big.y + (target.top - big.y) * e,
        big.width + (target.width - big.width) * e);
      if (variant === 'original' && liveBody) {
        // Display the existing widget's running animation; no new pose equations.
        ['.dw-body', '.dw-rig', '.r-body', '.r-cap', '.r-hl', '.r-hr'].forEach(function (selector) {
          var original = source.querySelector(selector), copy = character.querySelector(selector);
          if (!original || !copy) return;
          copy.style.transform = original.style.transform;
          if (original.tagName === 'IMG' && copy.getAttribute('src') !== original.getAttribute('src')) copy.src = original.src;
        });
      }
      message.style.opacity = String(1 - Math.min(1, p * 2));
      if (p > 0 && phase !== 'returning') { phase = 'returning'; root.dataset.phase = phase; emit(); }
    }
    frame = requestAnimationFrame(draw);
  }
  function claim() {
    if (claimed) return false;
    claimed = true;
    try {
      if (localStorage.getItem(SEEN) === '1') { storage = 'local'; return false; }
      localStorage.setItem(SEEN, '1');
      storage = 'local';
    } catch (e) {
      // Storage may be blocked or full. The installed controller is the per-page flag.
      storage = 'document';
    }
    return true;
  }
  function show() {
    if (finished || !source.isConnected || source.hidden) { finish('widget-unavailable'); return; }
    if (!claim()) { finish('already-seen'); return; }
    reduced = !!(motion && motion.matches);
    var view = viewport(), rect = source.getBoundingClientRect();
    var baseWidth = source.offsetWidth, baseHeight = source.offsetHeight;
    if (artwork && !reduced) baseHeight = baseWidth * artwork.naturalHeight / artwork.naturalWidth;
    if (!baseWidth || !baseHeight || !rect.width) { finish('widget-unavailable'); return; }
    var width = Math.min(view.width * 0.6, 320, view.height * 0.5 * baseWidth / baseHeight);
    var height = width * baseHeight / baseWidth;
    big = { baseWidth: baseWidth, width: width,
      x: view.x + (view.width - width) / 2,
      y: view.y + Math.max(24, (view.height - height - 52) / 2) };

    root = document.createElement('div');
    root.className = 'dhello' + (reduced ? ' dhello-reduced' : '');
    root.dataset.variant = variant;
    root.dataset.phase = reduced ? 'text-only' : 'greeting';
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-atomic', 'true');
    root.setAttribute('role', 'status');
    message = document.createElement('div');
    message.className = 'dhello-message';
    var messageText = document.createElement('span');
    messageText.className = 'dhello-message-text';
    messageText.textContent = '안녕하세요 무무토리입니다';
    message.appendChild(messageText);
    message.style.left = (view.x + view.width / 2) + 'px';
    message.style.top = (reduced ? view.y + view.height * 0.42 : big.y + height + 16) + 'px';
    root.appendChild(message);
    if (!reduced) {
      character = document.createElement('div');
      character.className = 'dhello-character';
      character.setAttribute('aria-hidden', 'true');
      character.style.width = baseWidth + 'px';
      character.style.height = baseHeight + 'px';
      if (variant === 'original') {
        var body = source.querySelector('.dw-body');
        if (!body) { finish('artwork-unavailable'); return; }
        // The widget's own pointer-enter handler performs its approved greeting.
        source.dispatchEvent(new Event('pointerenter'));
        character.appendChild(body.cloneNode(true));
        liveBody = body;
      } else {
        var picture = artwork.cloneNode();
        picture.className = 'dhello-existing-image'; picture.alt = '';
        character.appendChild(picture);
        if (variant === 'sign') {
          character.removeAttribute('aria-hidden');
          message.classList.add('dhello-sign-label');
          message.style.left = '8%'; message.style.top = '13%';
          message.style.fontSize = (baseWidth * 0.072) + 'px';
          character.appendChild(message);
        }
      }
      root.appendChild(character);
      position(big.x, big.y, big.width);
      source.setAttribute('data-dotori-hello-source', '');
      document.documentElement.setAttribute('data-dotori-hello-active', '');
    }
    document.body.appendChild(root);
    started = performance.now();
    phase = reduced ? 'text-only' : 'greeting';
    document.addEventListener('pointerdown', skip, true);
    document.addEventListener('click', skip, true);
    document.addEventListener('keydown', key, true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', leave);
    window.addEventListener('resize', leave);
    if (motion && motion.addEventListener) motion.addEventListener('change', leave);
    deadline = setTimeout(function () { finish('deadline'); }, reduced ? 1800 : LIMIT);
    frame = requestAnimationFrame(draw);
    emit();
  }
  function find() {
    source = document.querySelector('.dw');
    if (!source) return false;
    if (observer) observer.disconnect();
    clearTimeout(waitTimer);
    // Let the widget lay out its initial position before measuring it.
    frame = requestAnimationFrame(function () {
      frame = requestAnimationFrame(function () {
        var images = Array.prototype.slice.call(source.querySelectorAll('.dw-body img'));
        if (artwork) images.push(artwork);
        if (!images.length || images.some(function (img) { return img.complete && !img.naturalWidth; })) {
          finish('artwork-unavailable'); return;
        }
        if (images.every(function (img) { return img.complete && img.naturalWidth; })) { show(); return; }
        var remaining = images.length;
        waitTimer = setTimeout(function () { finish('artwork-timeout'); }, 1500);
        images.forEach(function (img) {
          function loaded() { if (--remaining === 0) { clearTimeout(waitTimer); show(); } }
          if (img.complete) loaded();
          else { img.addEventListener('load', loaded, { once: true }); img.addEventListener('error', function () { finish('artwork-unavailable'); }, { once: true }); }
        });
      });
    });
    return true;
  }
  var style = document.createElement('style');
  style.textContent = '.dhello{position:fixed;inset:0;z-index:2147483003;pointer-events:none;background:none!important;border:0!important}' +
    '.dhello-character{position:fixed;left:0;top:0;transform-origin:0 0;pointer-events:none;will-change:transform}' +
    '.dhello-existing-image{display:block;width:100%;height:100%;object-fit:contain}' +
    '.dhello-message{position:fixed;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 32px);padding:0;border:0;background:none;box-shadow:none;color:#4A2410;font:22px/1.5 "Jua","Gowun Dodum",sans-serif;white-space:nowrap;text-shadow:0 1px 2px #FFFDF7,0 -1px 2px #FFFDF7}' +
    '.dhello-message-text{display:block;animation:dhello-text .4s ease-out both}' +
    '.dhello-sign-label{position:absolute;width:84%;max-width:none;transform:rotate(3deg);transform-origin:center;white-space:normal;word-break:keep-all;text-align:center;line-height:1.3;text-shadow:none}' +
    '.dhello-sign-label .dhello-message-text{animation:none}' +
    '@keyframes dhello-text{from{opacity:0;translate:0 5px}to{opacity:1;translate:0 0}}' +
    '[data-dotori-hello-source]{visibility:hidden!important}' +
    'html[data-dotori-hello-active] .dw-say{visibility:hidden!important}' +
    '@media(max-width:759px){.dhello-message{font-size:18px}}' +
    '.dhello-reduced .dhello-message-text{animation:none}' +
    '@media(prefers-reduced-motion:reduce){.dhello-message-text{animation:none}}';
  document.head.appendChild(style);
  window.DotoriHelloPreview = { dismiss: skip, snapshot: function () {
    return { phase: phase, variant: variant, reducedMotion: reduced, storage: storage, elapsed: started ? performance.now() - started : 0 };
  } };
  if (!find()) {
    observer = new MutationObserver(function () { find(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    waitTimer = setTimeout(function () { finish('widget-timeout'); }, 5000);
  }
})();
