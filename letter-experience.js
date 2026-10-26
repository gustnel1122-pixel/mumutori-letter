/* 무무토리 레터: 인사와 직접 만든 타자기 효과음. 외부 음원·추적·저장 없음. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var toggle = document.getElementById("sound-toggle");
  var status = document.getElementById("sound-status");
  var enabled = false, context = null, noise = null, lastClack = 0;
  var composing = new WeakSet(), compositionEnded = new WeakMap();
  var greetingTimers = [], greetingsFinished = false;

  function audioContext() {
    if (context) return context;
    var Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    context = new Audio();
    noise = context.createBuffer(1, Math.round(context.sampleRate * .06), context.sampleRate);
    var samples = noise.getChannelData(0);
    for (var i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
    return context;
  }
  function canPlay() { return enabled && context && context.state === "running" && !document.hidden; }
  function tone(frequency, start, length, volume, type) {
    var oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + .005);
    gain.gain.exponentialRampToValueAtTime(.0001, start + length);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(start); oscillator.stop(start + length + .015);
    oscillator.onended = function () { oscillator.disconnect(); gain.disconnect(); };
  }
  function clack() {
    if (!canPlay()) return;
    var now = context.currentTime;
    if (now - lastClack < .04) return;
    lastClack = now;
    var source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noise;
    filter.type = "bandpass"; filter.frequency.value = 1500 + Math.random() * 400; filter.Q.value = .7;
    gain.gain.setValueAtTime(.055, now); gain.gain.exponentialRampToValueAtTime(.0001, now + .045);
    source.connect(filter); filter.connect(gain); gain.connect(context.destination);
    source.start(now); source.stop(now + .05);
    source.onended = function () { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    tone(185 + Math.random() * 30, now, .035, .018, "triangle");
  }
  function ding() {
    if (!canPlay()) return;
    var now = context.currentTime;
    tone(1478, now, .34, .035); tone(2217, now, .22, .01);
  }
  function success() {
    if (!canPlay()) return;
    var now = context.currentTime;
    [659.25, 830.61, 987.77].forEach(function (frequency, i) { tone(frequency, now + i * .105, .28, .032); });
  }
  function updateSound() {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.setAttribute("aria-label", enabled ? "타자기 효과음 끄기" : "타자기 효과음 켜기");
    toggle.querySelector("[data-sound-label]").textContent = enabled ? "소리 끄기" : "소리 켜기";
  }
  if (toggle) toggle.addEventListener("click", function () {
    if (enabled) {
      enabled = false; updateSound();
      if (context && context.state === "running") context.suspend().catch(function () {});
      if (status) status.textContent = "타자기 효과음을 껐어요.";
      return;
    }
    try {
      var ctx = audioContext();
      if (!ctx) throw new Error("unavailable");
      ctx.resume().then(function () {
        enabled = ctx.state === "running"; updateSound();
        if (status) status.textContent = enabled ? "타자기 효과음을 켰어요. 글을 쓸 때 작은 소리가 나요." : "이 기기에서는 소리를 켤 수 없어요.";
        if (enabled) clack();
      }).catch(function () {
        enabled = false; updateSound();
        if (status) status.textContent = "소리를 켜지 못했어요. 편지는 그대로 작성할 수 있어요.";
      });
    } catch (_) {
      enabled = false; updateSound();
      if (status) status.textContent = "이 기기에서는 소리를 켤 수 없어요. 편지는 그대로 작성할 수 있어요.";
    }
  });

  function isWriting(el) {
    return el && (el.tagName === "TEXTAREA" || el.matches("#w-to,#w-from,#s-to,#s-from,input[data-q]"));
  }
  document.addEventListener("compositionstart", function (event) { if (isWriting(event.target)) composing.add(event.target); });
  document.addEventListener("compositionend", function (event) {
    if (!isWriting(event.target)) return;
    composing.delete(event.target); compositionEnded.set(event.target, performance.now());
    if (event.data) clack();
  });
  document.addEventListener("input", function (event) {
    var el = event.target;
    if (!isWriting(el) || event.isComposing || composing.has(el)) return;
    // Some keyboards send one more input event immediately after compositionend.
    if (performance.now() - (compositionEnded.get(el) || -1000) < 80) return;
    if (event.inputType === "insertLineBreak" || event.inputType === "insertParagraph") ding();
    else if (!event.inputType || event.inputType.indexOf("delete") !== 0) clack();
  });

  function finishGreetings() {
    greetingTimers.forEach(clearTimeout); greetingTimers = [];
    document.querySelectorAll("[data-greeting]").forEach(function (element) {
      element.querySelector(".typed-output").textContent = element.dataset.greeting;
      element.classList.add("is-finished");
    });
    greetingsFinished = true;
  }
  function greet() {
    if (reduce.matches || document.hidden) { finishGreetings(); return; }
    document.querySelectorAll("[data-greeting]").forEach(function (element) {
      var output = element.querySelector(".typed-output"), text = Array.from(element.dataset.greeting), i = 0;
      output.textContent = "";
      function tick() {
        if (reduce.matches || document.hidden) { finishGreetings(); return; }
        if (i >= text.length) { element.classList.add("is-finished"); greetingsFinished = true; return; }
        var letter = text[i++]; output.textContent += letter;
        if (letter === "\n") ding(); else if (letter.trim()) clack();
        greetingTimers.push(setTimeout(tick, letter === "\n" ? 180 : 47));
      }
      greetingTimers.push(setTimeout(tick, 180));
    });
  }
  if (reduce.addEventListener) reduce.addEventListener("change", function () { if (reduce.matches) finishGreetings(); });
  else if (reduce.addListener) reduce.addListener(function () { if (reduce.matches) finishGreetings(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && !greetingsFinished) finishGreetings(); });

  // Called only after a confirmed server receipt. Preview completion stays silent.
  window.MMTExperience = { success: success, ding: ding, finishGreeting: finishGreetings };
  updateSound(); greet();
})();
