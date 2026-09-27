/* 무무토리 레터 — Firebase 연결 공통. 설정이 없거나 SDK를 못 불러오면 미리보기 모드. */
(function(){
  var M = window.MMT = window.MMT || {};
  M.fb = null;
  try{
    if (window.FIREBASE_CONFIG && window.firebase && firebase.initializeApp){
      var app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(window.FIREBASE_CONFIG);
      M.fb = { db: firebase.database(), auth: firebase.auth ? firebase.auth() : null, ts: firebase.database.ServerValue.TIMESTAMP };
    }
  }catch(e){ console.warn('[MMT] Firebase 연결 실패, 미리보기 모드로 동작', e); M.fb = null; }
  M.live = !!M.fb;
  M.store = {
    get: function(k, d){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
    set: function(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  };

  /* 스펙(규격·봉투·설문) — 적용본(config/spec)을 읽어 고객 페이지에 반영 */
  function arr(x){ return Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.keys(x).sort(function(a,b){return a-b}).map(function(k){return x[k]}) : []); }
  M.normSpec = function(sp){
    sp = sp || {};
    sp.envelopes = arr(sp.envelopes); sp.relations = arr(sp.relations);
    sp.survey = arr(sp.survey).map(function(q){ q = q || {}; if (q.options) q.options = arr(q.options); q.req = !!q.req; return q; });
    ['lineChars','maxLines','memoMax'].forEach(function(k){ if (sp[k] != null) sp[k] = +sp[k]; });
    return sp;
  };
  M.specSource = 'default';
  M.loadSpec = function(cb){
    var done = false, fin = function(){ if (done) return; done = true; try{ cb(); }catch(e){ console.error(e); } };
    var base = window.LETTER_SPEC;
    function use(sp, src){ if (sp){ var d = JSON.parse(JSON.stringify(base || {})); var n = M.normSpec(JSON.parse(JSON.stringify(sp))); for (var k in n) d[k] = n[k]; window.LETTER_SPEC = d; M.specSource = src; } }
    try{
      if (/[?&]preview=draft/.test(location.search)){ use(M.store.get('mmt-spec-draft', null), 'draft'); fin(); return; }
    }catch(e){}
    if (!M.live){ use(M.store.get('mmt-spec-applied', null) && M.store.get('mmt-spec-applied', null).spec, 'applied'); fin(); return; }
    var t = setTimeout(fin, 3500);
    M.fb.db.ref('config/spec').once('value').then(function(snap){
      clearTimeout(t); var v = snap.val(); if (v && v.spec){ use(v.spec, 'applied'); M.specMeta = v.meta || null; } fin();
    }).catch(function(){ clearTimeout(t); fin(); });
  };
})();
