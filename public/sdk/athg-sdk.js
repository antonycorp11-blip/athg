/*!
 * ATHG Game SDK v1 — comunicação JOGO -> PORTAL ATHG via postMessage.
 *
 * Uso no jogo:
 *   <script src="https://SEU-DOMINIO-ATHG/sdk/athg-sdk.js"></script>
 *   ATHG.ready()                         // assim que o jogo carregar
 *   ATHG.gameStarted()                   // início de partida
 *   ATHG.updateScore(1500)               // pontuação (ranking)
 *   ATHG.gameOver(1500)                  // fim de partida
 *   ATHG.unlockAchievement('hemofarm-first-harvest')
 *   await ATHG.save({ ... })             // save (local hoje, nuvem no futuro)
 *   const data = await ATHG.load()
 *   const ad = await ATHG.showRewardedAd() // { status, rewarded }
 *   ATHG.on('pause', fn) / ATHG.on('resume', fn) / ATHG.on('init', fn)
 *
 * Fora do portal (jogo aberto direto), save/load usam localStorage e
 * anúncios retornam { status: 'unavailable' } — o jogo roda normalmente.
 */
;(function (global) {
  'use strict'
  var SOURCE = 'athg-game'
  var PORTAL = 'athg-portal'
  var VERSION = 1
  var TIMEOUT_MS = 8000

  var inPortal = global.parent && global.parent !== global
  var portalOrigin = null
  var initInfo = null
  var queue = []
  var pending = {}
  var listeners = {}
  var seq = 0

  function emit(name, data) {
    ;(listeners[name] || []).forEach(function (fn) {
      try { fn(data) } catch (e) { console.error('[ATHG SDK]', e) }
    })
  }

  function post(type, payload, requestId) {
    if (!inPortal) return
    var msg = { source: SOURCE, version: VERSION, type: type, payload: payload, requestId: requestId }
    // Antes do handshake só enviamos GAME_READY (sem dados sensíveis).
    if (!portalOrigin && type !== 'GAME_READY') { queue.push(msg); return }
    global.parent.postMessage(msg, portalOrigin || '*')
  }

  function request(type, payload, fallback) {
    if (!inPortal) return Promise.resolve(fallback())
    return new Promise(function (resolve) {
      var id = 'r' + (++seq) + '-' + Date.now()
      var timer = setTimeout(function () { delete pending[id]; resolve(fallback()) }, TIMEOUT_MS)
      pending[id] = function (result) { clearTimeout(timer); resolve(result) }
      post(type, payload, id)
    })
  }

  global.addEventListener('message', function (event) {
    var d = event.data
    if (!inPortal || event.source !== global.parent || !d || d.source !== PORTAL) return
    if (portalOrigin && event.origin !== portalOrigin) return
    if (d.type === 'PORTAL_INIT') {
      portalOrigin = event.origin
      initInfo = d.payload
      queue.splice(0).forEach(function (m) { global.parent.postMessage(m, portalOrigin) })
      emit('init', initInfo)
      return
    }
    if (d.type === 'PAUSE') return emit('pause')
    if (d.type === 'RESUME') return emit('resume')
    if (d.requestId && pending[d.requestId]) {
      var done = pending[d.requestId]
      delete pending[d.requestId]
      done(d.type === 'LOAD_RESULT' ? d.payload.data : d.payload)
    }
  })

  function localKey(slot) { return 'athg-sdk-save:' + location.pathname + ':' + (slot || 'default') }

  var ATHG = {
    version: VERSION,
    isInPortal: inPortal,
    get portal() { return initInfo },
    ready: function () { post('GAME_READY') },
    gameStarted: function () { post('GAME_STARTED') },
    gameOver: function (score) { post('GAME_OVER', { score: score }) },
    updateScore: function (score, leaderboard) { post('SCORE_UPDATED', { score: Number(score), leaderboard: leaderboard }) },
    unlockAchievement: function (id) { post('ACHIEVEMENT_UNLOCKED', { id: String(id) }) },
    save: function (data, slot) {
      return request('SAVE_GAME', { data: data, slot: slot }, function () {
        try { localStorage.setItem(localKey(slot), JSON.stringify(data)); return { ok: true } } catch (e) { return { ok: false } }
      })
    },
    load: function (slot) {
      return request('LOAD_GAME', { slot: slot }, function () {
        try { return JSON.parse(localStorage.getItem(localKey(slot)) || 'null') } catch (e) { return null }
      })
    },
    showRewardedAd: function () {
      return request('REQUEST_REWARDED_AD', undefined, function () { return { status: 'unavailable', rewarded: false } })
    },
    on: function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); if (name === 'init' && initInfo) fn(initInfo) },
    off: function (name, fn) { listeners[name] = (listeners[name] || []).filter(function (f) { return f !== fn }) },
  }

  global.ATHG = ATHG
})(window)
