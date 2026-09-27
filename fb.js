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
})();
